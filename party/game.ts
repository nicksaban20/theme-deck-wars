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
  calculateDamage,
  getLastPlayedCard,
  checkGameEnd,
  checkMatchEnd,
  getNextTurn,
  resetPlayerForNewGame,
  resetStateForNewGame,
  resetStateForRematch,
  isDraftComplete,
  STARTING_HP,
  CARDS_PER_PLAYER,
  WINS_TO_WIN_MATCH,
} from "../lib/gameLogic";

export default class GameServer implements Party.Server {
  state: GameState;
  rematchRequests: Map<string, { swapThemes: boolean }> = new Map();

  constructor(readonly room: Party.Room) {
    this.state = createInitialState(room.id);
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
          this.handleJoin(sender, data.playerName, data.isSpectator);
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
        case "play-card":
          await this.handlePlayCard(sender, data.cardId);
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
      }

      await this.saveState();
      this.broadcastState();
    } catch (error) {
      console.error("Error handling message:", error);
      this.sendError(sender, "Invalid message format");
    }
  }

  handleJoin(conn: Party.Connection, playerName: string, isSpectator?: boolean) {
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

    const player = createPlayer(conn.id, playerName || `Player ${Object.keys(this.state.players).length + 1}`);
    this.state.players[conn.id] = player;
    this.state.playerOrder.push(conn.id);

    if (Object.keys(this.state.players).length === 1) {
      this.state.message = "Waiting for opponent...";
    } else if (Object.keys(this.state.players).length === 2) {
      this.state.phase = "theme-select";
      this.state.message = "Both players joined! Choose your themes.";
    }
  }

  handleSetTheme(conn: Party.Connection, theme: string) {
    if (this.state.phase !== "theme-select") {
      this.sendError(conn, "Cannot set theme in this phase");
      return;
    }

    const player = this.state.players[conn.id];
    if (!player) {
      this.sendError(conn, "Player not found");
      return;
    }

    player.theme = theme.trim();
    player.originalTheme = theme.trim();
    this.state.message = `${player.name} chose: "${player.theme}"`;
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
      this.state.phase = "battle";
      this.state.currentTurn = this.state.playerOrder[0];
      const firstPlayer = this.state.players[this.state.playerOrder[0]];
      this.state.message = `Battle begins! ${firstPlayer?.name}'s turn`;
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
    player.cards.splice(cardIndex, 1);

    const opponentId = this.state.playerOrder.find((id) => id !== conn.id);
    const defendingCard = getLastPlayedCard(this.state, conn.id);

    const { damage, abilityTriggered } = calculateDamage(
      card,
      defendingCard,
      this.state
    );

    if (opponentId && this.state.players[opponentId]) {
      this.state.players[opponentId].hp -= damage;
      this.state.lastDamage = damage;
    }

    const playedCard: PlayedCard = {
      card,
      playerId: conn.id,
      round: this.state.round,
      gameNumber: this.state.gameNumber,
    };
    this.state.playedCards.push(playedCard);

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
      this.state.round += 1;
      
      const roundEndCheck = checkGameEnd(this.state);
      if (roundEndCheck.ended) {
        await this.handleGameEnd(roundEndCheck.winner);
        return;
      }
    }

    this.state.currentTurn = nextPlayerId;
    
    if (nextPlayerId) {
      const nextPlayer = this.state.players[nextPlayerId];
      this.state.message = `${nextPlayer?.name}'s turn`;
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
      if (matchWinner) {
        const winnerPlayer = this.state.players[matchWinner];
        this.state.message = `${winnerPlayer?.name} wins the match ${winnerPlayer?.matchWins}-${WINS_TO_WIN_MATCH - winnerPlayer?.matchWins}!`;
      } else {
        this.state.message = "Match ended in a tie!";
      }
      
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
      
      // Auto-start next game after a delay (handled by client)
      this.state.gameNumber += 1;
    }
  }

  getScoreString(): string {
    const players = Object.values(this.state.players);
    if (players.length !== 2) return "0-0";
    return `${players[0].matchWins}-${players[1].matchWins}`;
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

        const player = this.state.players[body.playerId];
        if (player) {
          if (body.isDraft) {
            player.draftPool = body.cards;
            player.draftedCards = [];
          } else {
            player.cards = body.cards;
          }
        }

        // Check if both players have their cards/draft pool
        const allHaveCards = Object.values(this.state.players).every(
          (p) => (body.isDraft ? p.draftPool.length > 0 : p.cards.length > 0)
        );

        if (allHaveCards) {
          if (body.isDraft) {
            this.state.phase = "drafting";
            this.state.message = "Draft phase! Select 5 cards from your pool of 7.";
          } else {
            this.state.phase = "battle";
            this.state.currentTurn = this.state.playerOrder[0];
            const firstPlayer = this.state.players[this.state.playerOrder[0]];
            this.state.message = `Battle begins! ${firstPlayer?.name}'s turn`;
          }
          this.broadcastState();
        }

        await this.saveState();
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Invalid request" }), {
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
