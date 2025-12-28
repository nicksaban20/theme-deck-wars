import type * as Party from "partykit/server";
import {
  GameState,
  Player,
  ClientMessage,
  ServerMessage,
  Card,
  PlayedCard,
} from "../lib/types";
import {
  createInitialState,
  createPlayer,
  calculateDamageWithPerks,
  getLastPlayedCard,
  checkGameEnd,
  checkMatchEnd,
  getNextTurn,
  resetPlayerForNewGame,
  resetStateForNewGame,
  resetStateForRematch,
  isDraftComplete,
  canPlayCard,
  getCardDefaults,
  evaluateTriggeredPerks,
  applyStatusEffects,
  processStatusEffects,
  gainManaPerTurn,
  calculateSpeedOrder,
  getRoundMana,
  getRoundModifier,
  getEffectiveManaCost,
  STARTING_HP,
  CARDS_PER_PLAYER,
  DRAFT_POOL_SIZE,
  WINS_TO_WIN_MATCH,
} from "../lib/gameLogic";

// Get the Next.js app URL for API calls
const NEXT_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default class GameServer implements Party.Server {
  state: GameState;
  rematchRequests: Map<string, { swapThemes: boolean }> = new Map();
  gameHistoryRecorded: boolean = false;

  constructor(readonly room: Party.Room) {
    this.state = createInitialState(room.id);
  }

  // Record game history via API
  async recordGameHistory(action: "start" | "end", data: Record<string, unknown>) {
    try {
      await fetch(`${NEXT_APP_URL}/api/game-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...data }),
      });
    } catch (error) {
      console.error("Failed to record game history:", error);
    }
  }

  async onStart() {
    const stored = await this.room.storage.get<GameState>("state");
    if (stored) {
      this.state = stored;
    }
  }

  async saveState() {
    await this.room.storage.put("state", this.state);
  }

  broadcastState() {
    const message: ServerMessage = { type: "state", state: this.state };
    this.room.broadcast(JSON.stringify(message));
  }

  broadcastSpectatorCount() {
    const message: ServerMessage = {
      type: "spectator-count",
      count: this.state.spectators.length
    };
    this.room.broadcast(JSON.stringify(message));
  }

  sendError(conn: Party.Connection, message: string) {
    const error: ServerMessage = { type: "error", message };
    conn.send(JSON.stringify(error));
  }

  sendToPlayer(playerId: string, message: ServerMessage) {
    const connections = Array.from(this.room.getConnections());
    for (const conn of connections) {
      if (conn.id === playerId) {
        conn.send(JSON.stringify(message));
        break;
      }
    }
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const message: ServerMessage = { type: "state", state: this.state };
    conn.send(JSON.stringify(message));

    // Send spectator count
    const spectatorMsg: ServerMessage = {
      type: "spectator-count",
      count: this.state.spectators.length
    };
    conn.send(JSON.stringify(spectatorMsg));
  }

  onClose(conn: Party.Connection) {
    // Remove from spectators if they were spectating
    const spectatorIndex = this.state.spectators.indexOf(conn.id);
    if (spectatorIndex !== -1) {
      this.state.spectators.splice(spectatorIndex, 1);
      this.broadcastSpectatorCount();
      this.saveState();
    }
  }

  async onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message) as ClientMessage;

      switch (data.type) {
        case "join":
          this.handleJoin(sender, data.playerName, data.isSpectator, data.blindDraft);
          break;
        case "set-theme":
          this.handleSetTheme(sender, data.theme);
          break;
        case "ready":
          this.handleReady(sender);
          break;
        case "draft-select":
          this.handleDraftSelect(sender, data.cardId);
          break;
        case "draft-discard":
          this.handleDraftDiscard(sender, data.cardId);
          break;
        case "draft-confirm":
          this.handleDraftConfirm(sender);
          break;
        case "reveal-card":
          this.handleRevealCard(sender, data.cardId);
          break;
        case "play-card":
          await this.handlePlayCard(sender, data.cardId);
          break;
        case "toggle-blind-draft":
          this.handleToggleBlindDraft(sender);
          break;
        case "skip-turn":
          await this.handleSkipTurn(sender);
          break;
        case "continue-match":
          this.handleContinueMatch(sender);
          break;
        case "request-rematch":
          this.handleRematchRequest(sender, false);
          break;
        case "request-swap-rematch":
          this.handleRematchRequest(sender, true);
          break;
        case "accept-rematch":
          this.handleAcceptRematch(sender);
          break;
        default:
          const unknownData = data as { type?: string };
          console.warn(`[Game] Unknown message type: ${unknownData.type || 'unknown'}`);
          this.sendError(sender, "Unknown message type");
          return;
      }

      await this.saveState();
      this.broadcastState();
    } catch (error) {
      console.error("[Game] Error handling message:", error);
      if (error instanceof Error) {
        console.error("[Game] Error details:", error.message, error.stack);
      }
      this.sendError(sender, error instanceof Error ? error.message : "Invalid message format");
    }
  }

  handleJoin(conn: Party.Connection, playerName: string, isSpectator?: boolean, blindDraft?: boolean) {
    try {
      // Validate player name
      const sanitizedName = (playerName || `Player ${Object.keys(this.state.players).length + 1}`)
        .trim()
        .slice(0, 50); // Limit length

      if (!sanitizedName) {
        this.sendError(conn, "Player name cannot be empty");
        return;
      }

      // Handle spectator join
      if (isSpectator) {
        if (!this.state.spectators.includes(conn.id)) {
          this.state.spectators.push(conn.id);
          this.broadcastSpectatorCount();
        }
        return;
      }

      // Check if room is full for players
      if (Object.keys(this.state.players).length >= 2) {
        // Auto-join as spectator if room is full
        if (!this.state.spectators.includes(conn.id)) {
          this.state.spectators.push(conn.id);
          this.broadcastSpectatorCount();
        }
        this.sendError(conn, "Room is full - you're now spectating!");
        return;
      }

      if (this.state.players[conn.id]) {
        return; // Already joined
      }

      const player = createPlayer(conn.id, sanitizedName);
      this.state.players[conn.id] = player;
      this.state.playerOrder.push(conn.id);

      // Set blind draft mode if requested by the first player
      if (Object.keys(this.state.players).length === 1 && blindDraft !== undefined) {
        this.state.blindDraft = blindDraft;
      }

      if (Object.keys(this.state.players).length === 1) {
        this.state.message = "Waiting for opponent...";
      } else if (Object.keys(this.state.players).length === 2) {
        this.state.phase = "theme-select";
        this.state.message = "Both players joined! Choose your themes.";
      }
    } catch (error) {
      console.error("[Game] Error in handleJoin:", error);
      this.sendError(conn, "Failed to join game");
    }
  }

  handleSetTheme(conn: Party.Connection, theme: string) {
    try {
      if (this.state.phase !== "theme-select") {
        this.sendError(conn, "Cannot set theme in this phase");
        return;
      }

      const player = this.state.players[conn.id];
      if (!player) {
        this.sendError(conn, "Player not found");
        return;
      }

      // Validate and sanitize theme
      const sanitizedTheme = theme?.trim().slice(0, 100) || ""; // Limit length
      if (!sanitizedTheme) {
        this.sendError(conn, "Theme cannot be empty");
        return;
      }

      player.theme = sanitizedTheme;
      player.originalTheme = sanitizedTheme;
      this.state.message = `${player.name} chose: "${player.theme}"`;
    } catch (error) {
      console.error("[Game] Error in handleSetTheme:", error);
      this.sendError(conn, "Failed to set theme");
    }
  }

  handleReady(conn: Party.Connection) {
    if (this.state.phase !== "theme-select") {
      this.sendError(conn, "Cannot ready in this phase");
      return;
    }

    const player = this.state.players[conn.id];
    if (!player) {
      this.sendError(conn, "Player not found");
      return;
    }

    if (!player.theme) {
      this.sendError(conn, "Please choose a theme first");
      return;
    }

    player.isReady = true;

    const allReady = Object.values(this.state.players).every((p) => p.isReady);
    if (allReady && Object.keys(this.state.players).length === 2) {
      this.state.phase = "generating";
      this.state.message = "Generating cards... This may take a moment.";
    }
  }

  handleDraftSelect(conn: Party.Connection, cardId: string) {
    if (this.state.phase !== "drafting") {
      this.sendError(conn, "Cannot draft in this phase");
      return;
    }

    const player = this.state.players[conn.id];
    if (!player) {
      this.sendError(conn, "Player not found");
      return;
    }

    if (player.draftedCards.length >= CARDS_PER_PLAYER) {
      this.sendError(conn, "You've already selected 5 cards");
      return;
    }

    const cardIndex = player.draftPool.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      this.sendError(conn, "Card not in your draft pool");
      return;
    }

    // Move card from pool to drafted
    const [card] = player.draftPool.splice(cardIndex, 1);
    player.draftedCards.push(card);

    this.state.message = `${player.name} drafted a card (${player.draftedCards.length}/${CARDS_PER_PLAYER})`;
  }

  handleDraftDiscard(conn: Party.Connection, cardId: string) {
    if (this.state.phase !== "drafting") {
      this.sendError(conn, "Cannot draft in this phase");
      return;
    }

    const player = this.state.players[conn.id];
    if (!player) {
      this.sendError(conn, "Player not found");
      return;
    }

    // Move card back from drafted to pool
    const cardIndex = player.draftedCards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      this.sendError(conn, "Card not in your drafted cards");
      return;
    }

    const [card] = player.draftedCards.splice(cardIndex, 1);
    player.draftPool.push(card);

    this.state.message = `${player.name} returned a card to the pool`;
  }

  handleDraftConfirm(conn: Party.Connection) {
    if (this.state.phase !== "drafting") {
      this.sendError(conn, "Cannot confirm draft in this phase");
      return;
    }

    const player = this.state.players[conn.id];
    if (!player) {
      this.sendError(conn, "Player not found");
      return;
    }

    if (player.draftedCards.length !== CARDS_PER_PLAYER) {
      this.sendError(conn, `You must select exactly ${CARDS_PER_PLAYER} cards`);
      return;
    }

    player.isDraftReady = true;
    player.cards = [...player.draftedCards];
    player.draftPool = []; // Clear the pool

    // Check if both players are ready
    const allDraftReady = Object.values(this.state.players).every(p => p.isDraftReady);
    if (allDraftReady) {
      // Transition to reveal phase
      this.state.phase = "reveal";
      this.state.message = "Select a card to reveal to your opponent...";

      // Reset reveal state
      for (const playerId of Object.keys(this.state.players)) {
        const player = this.state.players[playerId];
        player.revealedCard = null;
        player.isRevealReady = false;
      }
    } else {
      this.state.message = `${player.name} is ready! Waiting for opponent to finish drafting...`;
    }
  }

  handleRevealCard(conn: Party.Connection, cardId: string) {
    if (this.state.phase !== "reveal") {
      this.sendError(conn, "Cannot reveal cards in this phase");
      return;
    }

    const player = this.state.players[conn.id];
    if (!player) {
      this.sendError(conn, "Player not found");
      return;
    }

    if (player.isRevealReady) {
      this.sendError(conn, "You've already selected a card to reveal");
      return;
    }

    const cardIndex = player.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      this.sendError(conn, "Card not in your hand");
      return;
    }

    player.revealedCard = player.cards[cardIndex];
    player.isRevealReady = true;
    this.state.message = `${player.name} selected a card to reveal...`;

    // Check if both players are ready
    const allRevealReady = Object.values(this.state.players).every(p => p.isRevealReady);
    if (allRevealReady) {
      // Both revealed, show reveals and start battle
      const players = Object.values(this.state.players);
      const revealMessage = players.map(p =>
        `${p.name} revealed: ${p.revealedCard?.name || 'Unknown'}`
      ).join(' | ');

      this.state.phase = "battle";
      // Initialize mana for battle start (round-based scaling)
      const roundMana = getRoundMana(this.state.round);
      for (const playerId of Object.keys(this.state.players)) {
        const player = this.state.players[playerId];
        player.mana = roundMana;
        player.maxMana = roundMana;
      }

      // Apply round modifier
      const modifier = getRoundModifier(this.state.round);
      if (modifier) {
        modifier.effect(this.state);
        this.state.roundModifier = modifier.name;
      }

      this.state.currentTurn = this.state.playerOrder[0];
      const firstPlayer = this.state.players[this.state.playerOrder[0]];
      this.state.message = `${revealMessage}. Battle begins! ${firstPlayer?.name}'s turn`;

      // Record game start in history (only for first game of match)
      if (this.state.gameNumber === 1 && !this.gameHistoryRecorded) {
        this.gameHistoryRecorded = true;
        const players = Object.values(this.state.players);
        if (players.length >= 2) {
          this.recordGameHistory("start", {
            roomId: this.state.roomId,
            player1Name: players[0].name,
            player1Theme: players[0].theme,
            player2Name: players[1].name,
            player2Theme: players[1].theme,
          });
        }
      }
    } else {
      this.state.message = `${player.name} is ready! Waiting for opponent to finish drafting...`;
    }
  }

  async handlePlayCard(conn: Party.Connection, cardId: string) {
    if (this.state.phase !== "battle") {
      this.sendError(conn, "Cannot play cards in this phase");
      return;
    }

    if (this.state.currentTurn !== conn.id) {
      this.sendError(conn, "Not your turn!");
      return;
    }

    const player = this.state.players[conn.id];
    if (!player) {
      this.sendError(conn, "Player not found");
      return;
    }

    const cardIndex = player.cards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
      this.sendError(conn, "Card not found in hand");
      return;
    }

    const card = player.cards[cardIndex];
    const cardWithDefaults = getCardDefaults(card);

    // Check mana cost (with round modifiers)
    const effectiveCost = getEffectiveManaCost(card, this.state);
    if (!canPlayCard(player, card, this.state)) {
      this.sendError(conn, `Not enough mana! Need ${effectiveCost}, have ${player.mana}`);
      return;
    }

    // Deduct mana (using effective cost)
    player.mana -= effectiveCost;
    player.cards.splice(cardIndex, 1);

    const opponentId = this.state.playerOrder.find((id) => id !== conn.id);
    const defender = opponentId ? this.state.players[opponentId] : null;
    const defendingCard = getLastPlayedCard(this.state, conn.id);

    // Calculate damage with perks
    const { damage, abilityTriggered } = calculateDamageWithPerks(
      card,
      defendingCard,
      player,
      defender || player,
      this.state
    );

    if (opponentId && defender) {
      defender.hp -= damage;
      this.state.lastDamage = damage;
    }

    // Apply status effects
    if (defender) {
      const newStatusEffects = applyStatusEffects(card, defender);
      defender.statusEffects = newStatusEffects;
    }

    // Apply triggered perks
    const onPlayPerk = evaluateTriggeredPerks(card, 'onPlay', player, this.state);
    if (onPlayPerk) {
      // Handle draw card perk
      if (onPlayPerk.effect.toLowerCase().includes('draw')) {
        // Could add card drawing logic here if needed
      }
      // Handle heal perk
      if (onPlayPerk.effect.toLowerCase().includes('heal')) {
        player.hp = Math.min(player.hp + onPlayPerk.value, STARTING_HP);
      }
    }

    const playedCard: PlayedCard = {
      card,
      playerId: conn.id,
      round: this.state.round,
      gameNumber: this.state.gameNumber,
    };
    this.state.playedCards.push(playedCard);

    // Update speed order for next round
    if (defender) {
      const player1Card = this.state.playedCards
        .filter(pc => pc.playerId === conn.id && pc.round === this.state.round)
        .map(pc => pc.card)[0] || null;
      const player2Card = this.state.playedCards
        .filter(pc => pc.playerId === opponentId && pc.round === this.state.round)
        .map(pc => pc.card)[0] || null;

      this.state.speedOrder = calculateSpeedOrder(this.state, player1Card, player2Card);
    }

    if (abilityTriggered) {
      const abilityMessage: ServerMessage = {
        type: "ability-triggered",
        cardName: card.name,
        abilityText: abilityTriggered,
      };
      this.room.broadcast(JSON.stringify(abilityMessage));
    }

    const cardPlayedMessage: ServerMessage = {
      type: "card-played",
      playerId: conn.id,
      card,
      damage,
    };
    this.room.broadcast(JSON.stringify(cardPlayedMessage));

    this.state.message = `${player.name} played ${card.name} for ${damage} damage!`;

    // Check if game should end
    const { ended: gameEnded, winner: gameWinner } = checkGameEnd(this.state);
    if (gameEnded) {
      await this.handleGameEnd(gameWinner);
      return;
    }

    // Move to next turn
    const nextPlayerId = getNextTurn(this.state);

    const cardsThisRound = this.state.playedCards.filter(
      (pc) => pc.round === this.state.round && pc.gameNumber === this.state.gameNumber
    ).length;

    if (cardsThisRound >= 2) {
      // Both players played, process end of round
      // Process status effects for all players
      for (const playerId of Object.keys(this.state.players)) {
        const player = this.state.players[playerId];
        const { hpChange, effectsRemaining } = processStatusEffects(player);
        player.hp += hpChange;
        player.hp = Math.max(0, player.hp); // Don't go below 0
        player.statusEffects = effectsRemaining;
      }

      this.state.round += 1;

      // Update mana for new round (round-based scaling)
      const roundMana = getRoundMana(this.state.round);
      for (const playerId of Object.keys(this.state.players)) {
        const player = this.state.players[playerId];
        player.maxMana = roundMana;
        player.mana = roundMana; // Refill to round max
      }

      // Apply round modifier for new round
      const modifier = getRoundModifier(this.state.round);
      if (modifier) {
        modifier.effect(this.state);
        this.state.roundModifier = modifier.name;
      }

      const roundEndCheck = checkGameEnd(this.state);
      if (roundEndCheck.ended) {
        await this.handleGameEnd(roundEndCheck.winner);
        return;
      }
    }

    // Set next turn
    if (nextPlayerId) {
      const nextPlayer = this.state.players[nextPlayerId];

      // Use speed order if available, otherwise use normal turn order
      if (this.state.speedOrder && this.state.speedOrder.length === 2) {
        this.state.currentTurn = this.state.speedOrder[0];
        const speedCard = this.state.playedCards.find(pc =>
          pc.playerId === this.state.speedOrder?.[0] &&
          pc.round === this.state.round
        )?.card;
        const speed = speedCard ? getCardDefaults(speedCard).speed : 0;
        this.state.message = `${this.state.players[this.state.speedOrder[0]]?.name}'s turn (speed: ${speed})`;
      } else {
        this.state.currentTurn = nextPlayerId;
        this.state.message = `${nextPlayer?.name}'s turn`;
      }
    }
  }

  async handleGameEnd(winner: string | null) {
    this.state.roundWinner = winner;

    // Record game in history
    const players = Object.values(this.state.players);
    this.state.gameHistory.push({
      gameNumber: this.state.gameNumber,
      winner,
      player1HP: players[0]?.hp || 0,
      player2HP: players[1]?.hp || 0,
    });

    // Update match wins
    if (winner && this.state.players[winner]) {
      this.state.players[winner].matchWins += 1;
    }

    // Check if match is over
    const { ended: matchEnded, winner: matchWinner } = checkMatchEnd(this.state);

    if (matchEnded) {
      this.state.phase = "match-ended";
      this.state.matchWinner = matchWinner;

      let winnerName: string | null = null;
      if (matchWinner) {
        const winnerPlayer = this.state.players[matchWinner];
        winnerName = winnerPlayer?.name || null;
        this.state.message = `${winnerPlayer?.name} wins the match ${winnerPlayer?.matchWins}-${WINS_TO_WIN_MATCH - winnerPlayer?.matchWins}!`;
      } else {
        this.state.message = "Match ended in a tie!";
      }

      // Record match end in history
      this.recordGameHistory("end", {
        roomId: this.state.roomId,
        winnerName,
        matchScore: this.getScoreString(),
      });

      const matchEndedMsg: ServerMessage = { type: "match-ended", winner: matchWinner };
      this.room.broadcast(JSON.stringify(matchEndedMsg));
    } else {
      // More games to play
      this.state.phase = "round-ended";
      const winnerPlayer = winner ? this.state.players[winner] : null;
      this.state.message = winnerPlayer
        ? `${winnerPlayer.name} wins Game ${this.state.gameNumber}! Score: ${this.getScoreString()}`
        : `Game ${this.state.gameNumber} is a tie! Score: ${this.getScoreString()}`;

      const roundEndedMsg: ServerMessage = {
        type: "round-ended",
        winner,
        gameNumber: this.state.gameNumber
      };
      this.room.broadcast(JSON.stringify(roundEndedMsg));

      // Note: gameNumber is incremented in handleContinueMatch when players are ready to continue
    }
  }

  getScoreString(): string {
    const players = Object.values(this.state.players);
    if (players.length !== 2) return "0-0";
    return `${players[0].matchWins}-${players[1].matchWins}`;
  }

  handleToggleBlindDraft(conn: Party.Connection) {
    const player = this.state.players[conn.id];
    if (!player) {
      this.sendError(conn, "Player not found");
      return;
    }

    // Only the room creator (first player) can toggle this
    if (this.state.playerOrder[0] !== conn.id) {
      this.sendError(conn, "Only the room creator can toggle blind draft.");
      return;
    }

    if (this.state.phase !== "lobby" && this.state.phase !== "theme-select") {
      this.sendError(conn, "Blind draft can only be toggled in lobby or theme selection phase.");
      return;
    }

    this.state.blindDraft = !this.state.blindDraft;
    this.state.message = `Blind Draft Mode: ${this.state.blindDraft ? "ON" : "OFF"}`;
    console.log(`[Game] Blind Draft Toggled: ${this.state.blindDraft}`);
  }

  async handleSkipTurn(conn: Party.Connection) {
    if (this.state.phase !== "battle") {
      this.sendError(conn, "Cannot skip turn outside of battle phase");
      return;
    }

    if (this.state.currentTurn !== conn.id) {
      this.sendError(conn, "Not your turn!");
      return;
    }

    const player = this.state.players[conn.id];
    if (!player) {
      this.sendError(conn, "Player not found");
      return;
    }

    this.state.message = `${player.name} skipped their turn!`;

    // Check if game should end
    const { ended: gameEnded, winner: gameWinner } = checkGameEnd(this.state);
    if (gameEnded) {
      await this.handleGameEnd(gameWinner);
      return;
    }

    // Move to next turn
    const nextPlayerId = getNextTurn(this.state);

    const cardsThisRound = this.state.playedCards.filter(
      (pc) => pc.round === this.state.round && pc.gameNumber === this.state.gameNumber
    ).length;

    // If both players have had their turn (or skipped), advance round
    // Note: we track this by checking if we're back to the first player
    if (nextPlayerId === this.state.playerOrder[0] && cardsThisRound > 0) {
      // Process status effects for all players
      for (const playerId of Object.keys(this.state.players)) {
        const player = this.state.players[playerId];
        const { hpChange, effectsRemaining } = processStatusEffects(player);
        player.hp += hpChange;
        player.hp = Math.max(0, player.hp);
        player.statusEffects = effectsRemaining;
      }

      this.state.round += 1;

      // Update mana for new round
      const roundMana = getRoundMana(this.state.round);
      for (const playerId of Object.keys(this.state.players)) {
        const player = this.state.players[playerId];
        player.maxMana = roundMana;
        player.mana = roundMana;
      }

      // Apply round modifier for new round
      const modifier = getRoundModifier(this.state.round);
      if (modifier) {
        modifier.effect(this.state);
        this.state.roundModifier = modifier.name;
      }

      const roundEndCheck = checkGameEnd(this.state);
      if (roundEndCheck.ended) {
        await this.handleGameEnd(roundEndCheck.winner);
        return;
      }
    }

    // Set next turn
    if (nextPlayerId) {
      const nextPlayer = this.state.players[nextPlayerId];
      this.state.currentTurn = nextPlayerId;
      this.state.message = `${player.name} skipped. ${nextPlayer?.name}'s turn!`;
    }
  }

  handleContinueMatch(conn: Party.Connection) {
    if (this.state.phase !== "round-ended") {
      this.sendError(conn, "Cannot continue match now");
      return;
    }

    // Analyze previous game strategy for adaptive generation
    const players = Object.values(this.state.players);
    const lastGame = this.state.gameHistory[this.state.gameHistory.length - 1];

    // Determine strategies based on cards played
    const strategies: Record<string, string> = {};
    for (const player of players) {
      const playedCards = this.state.playedCards.filter(
        pc => pc.playerId === player.id && pc.gameNumber === this.state.gameNumber
      );

      if (playedCards.length > 0) {
        const avgAttack = playedCards.reduce((sum, pc) => sum + pc.card.attack, 0) / playedCards.length;
        const avgDefense = playedCards.reduce((sum, pc) => sum + pc.card.defense, 0) / playedCards.length;
        const avgMana = playedCards.reduce((sum, pc) => sum + getCardDefaults(pc.card).manaCost, 0) / playedCards.length;

        if (avgAttack > avgDefense + 1) {
          strategies[player.id] = "aggressive high-attack";
        } else if (avgDefense > avgAttack + 1) {
          strategies[player.id] = "defensive high-defense";
        } else if (avgMana > 3) {
          strategies[player.id] = "high-cost powerful cards";
        } else {
          strategies[player.id] = "balanced versatile";
        }
      }
    }

    // Store strategies for adaptive generation BEFORE incrementing game number
    if (lastGame) {
      this.state.gameHistory.push({
        gameNumber: this.state.gameNumber,
        winner: lastGame.winner || null,
        player1HP: players[0]?.hp || 0,
        player2HP: players[1]?.hp || 0,
        player1Strategy: strategies[players[0]?.id || ''],
        player2Strategy: strategies[players[1]?.id || ''],
      });
    }

    // Reset players for the new game
    for (const playerId of this.state.playerOrder) {
      const player = this.state.players[playerId];
      if (player) {
        player.hp = STARTING_HP;
        player.cards = [];
        player.draftPool = [];
        player.draftedCards = [];
        player.revealedCard = null;
        player.isRevealReady = false;
        player.isReady = true; // Keep ready
        player.isDraftReady = false;
        player.mana = getRoundMana(1); // Reset mana for round 1
        player.maxMana = getRoundMana(1);
        player.statusEffects = []; // Clear status effects
      }
    }

    // Increment game number and reset game state for new game
    this.state.gameNumber += 1;
    this.state.phase = "generating";
    this.state.round = 1;
    this.state.lastDamage = null;
    this.state.roundWinner = null;
    this.state.currentTurn = null;
    this.state.roundModifier = null;
    this.state.message = `Game ${this.state.gameNumber} - Generating new cards...`;

    console.log(`[Game] Continuing to game ${this.state.gameNumber}, phase: ${this.state.phase}`);
  }

  handleRematchRequest(conn: Party.Connection, swapThemes: boolean) {
    if (this.state.phase !== "match-ended") {
      this.sendError(conn, "Cannot request rematch now");
      return;
    }

    const player = this.state.players[conn.id];
    if (!player) {
      this.sendError(conn, "Player not found");
      return;
    }

    this.rematchRequests.set(conn.id, { swapThemes });

    // Notify other player
    const rematchMsg: ServerMessage = {
      type: "rematch-requested",
      byPlayerId: conn.id,
      swapThemes,
    };
    this.room.broadcast(JSON.stringify(rematchMsg));

    this.state.message = `${player.name} wants a ${swapThemes ? "swap themes " : ""}rematch!`;

    // Check if both players requested (any type of rematch)
    if (this.rematchRequests.size >= 2) {
      this.startRematch();
    }
  }

  handleAcceptRematch(conn: Party.Connection) {
    if (this.state.phase !== "match-ended") {
      this.sendError(conn, "Cannot accept rematch now");
      return;
    }

    // Find the other player's rematch request
    const otherPlayerId = this.state.playerOrder.find(id => id !== conn.id);
    if (!otherPlayerId || !this.rematchRequests.has(otherPlayerId)) {
      this.sendError(conn, "No rematch request to accept");
      return;
    }

    const request = this.rematchRequests.get(otherPlayerId)!;
    this.rematchRequests.set(conn.id, request); // Accept with same settings
    this.startRematch();
  }

  startRematch() {
    // Determine if swapping themes
    const swapThemes = Array.from(this.rematchRequests.values()).some(r => r.swapThemes);

    this.state = resetStateForRematch(this.state, swapThemes);
    this.gameHistoryRecorded = false; // Reset for new match
    this.rematchRequests.clear();

    this.broadcastState();
  }

  // HTTP endpoint for card generation
  async onRequest(req: Party.Request) {
    if (req.method === "POST") {
      try {
        const body = await req.json() as {
          playerId: string;
          cards: Card[];
          isDraft?: boolean;
        };

        console.log(`[onRequest] Received cards for player ${body.playerId}, isDraft: ${body.isDraft}, card count: ${body.cards.length}`);

        const player = this.state.players[body.playerId];
        if (!player) {
          console.error(`[onRequest] Player ${body.playerId} not found in game state`);
          return new Response(JSON.stringify({ error: "Player not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (body.isDraft) {
          player.draftPool = body.cards;
          player.draftedCards = [];
          console.log(`[onRequest] Set draftPool for ${player.name}: ${player.draftPool.length} cards`);
        } else {
          player.cards = body.cards;
          console.log(`[onRequest] Set cards for ${player.name}: ${player.cards.length} cards`);
        }

        // Check if both players have their cards/draft pool
        const allHaveCards = Object.values(this.state.players).every(
          (p) => (body.isDraft ? p.draftPool.length > 0 : p.cards.length > 0)
        );

        console.log(`[onRequest] All players have cards: ${allHaveCards}, players:`, Object.values(this.state.players).map(p => ({
          name: p.name,
          draftPool: p.draftPool.length,
          cards: p.cards.length
        })));

        if (allHaveCards) {
          if (body.isDraft) {
            this.state.phase = "drafting";
            this.state.message = `Draft phase! Select ${CARDS_PER_PLAYER} cards from your pool of ${DRAFT_POOL_SIZE}.`;
            console.log(`[onRequest] Transitioning to drafting phase`);
          } else {
            this.state.phase = "battle";
            this.state.currentTurn = this.state.playerOrder[0];
            const firstPlayer = this.state.players[this.state.playerOrder[0]];
            this.state.message = `Battle begins! ${firstPlayer?.name}'s turn`;
            console.log(`[onRequest] Transitioning to battle phase`);
          }
          this.broadcastState();
        } else {
          console.log(`[onRequest] Waiting for other player's cards...`);
        }

        await this.saveState();

        return new Response(JSON.stringify({ success: true, allHaveCards }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error(`[onRequest] Error processing card request:`, error);
        return new Response(JSON.stringify({ error: "Invalid request", details: error instanceof Error ? error.message : String(error) }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify(this.state), {
      headers: { "Content-Type": "application/json" },
    });
  }
}
