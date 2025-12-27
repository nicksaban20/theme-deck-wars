import { Card, GameState, Player } from './types';

export const STARTING_HP = 20;
export const CARDS_PER_PLAYER = 5;
export const DRAFT_POOL_SIZE = 7; // Generate 7 cards, pick 5
export const MAX_ROUNDS = 5;
export const WINS_TO_WIN_MATCH = 2; // Best of 3

/**
 * Generate a random 4-character room code
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create initial game state for a new room
 */
export function createInitialState(roomId: string): GameState {
  return {
    roomId,
    phase: 'lobby',
    players: {},
    spectators: [],
    playerOrder: [],
    currentTurn: null,
    round: 1,
    gameNumber: 1,
    playedCards: [],
    lastDamage: null,
    roundWinner: null,
    matchWinner: null,
    message: 'Waiting for players...',
    gameHistory: [],
  };
}

/**
 * Create a new player
 */
export function createPlayer(id: string, name: string): Player {
  return {
    id,
    name,
    theme: '',
    originalTheme: '',
    cards: [],
    draftPool: [],
    draftedCards: [],
    hp: STARTING_HP,
    isReady: false,
    isDraftReady: false,
    matchWins: 0,
  };
}

/**
 * Reset player for a new game in the match (keeps theme, resets HP/cards)
 */
export function resetPlayerForNewGame(player: Player): Player {
  return {
    ...player,
    cards: [],
    draftPool: [],
    draftedCards: [],
    hp: STARTING_HP,
    isReady: true, // Keep ready since they're in a match
    isDraftReady: false,
  };
}

/**
 * Reset game state for a new game in the match
 */
export function resetStateForNewGame(state: GameState): GameState {
  return {
    ...state,
    phase: 'generating', // Go back to generating cards
    round: 1,
    playedCards: state.playedCards, // Keep history
    lastDamage: null,
    roundWinner: null,
    currentTurn: null,
    message: 'Generating cards for next game...',
  };
}

/**
 * Reset state for a rematch (new match entirely)
 */
export function resetStateForRematch(state: GameState, swapThemes: boolean): GameState {
  const players = Object.values(state.players);
  const newPlayers: Record<string, Player> = {};
  
  for (const player of players) {
    const newTheme = swapThemes 
      ? (players.find(p => p.id !== player.id)?.originalTheme || player.theme)
      : player.originalTheme;
    
    newPlayers[player.id] = {
      ...createPlayer(player.id, player.name),
      theme: newTheme,
      originalTheme: newTheme,
      isReady: true,
    };
  }
  
  return {
    ...createInitialState(state.roomId),
    players: newPlayers,
    spectators: state.spectators,
    playerOrder: state.playerOrder,
    phase: 'generating',
    message: swapThemes ? 'Swapping themes and generating new cards!' : 'Rematch! Generating new cards...',
  };
}

/**
 * Calculate damage from an attacking card against a defending card
 */
export function calculateDamage(
  attackingCard: Card,
  defendingCard: Card | null,
  gameState: GameState
): { damage: number; bonusDamage: number; abilityTriggered: string | null } {
  let baseDamage = attackingCard.attack;
  let bonusDamage = 0;
  let abilityTriggered: string | null = null;

  // If there's a defending card, subtract its defense
  if (defendingCard) {
    baseDamage = Math.max(0, attackingCard.attack - defendingCard.defense);
  }

  // Check for ability triggers
  const ability = attackingCard.ability.toLowerCase();

  // Bonus damage if opponent's card starts with same letter
  if (defendingCard && ability.includes('starting with')) {
    const match = ability.match(/starting with ['"]?([a-z])['"]?/i);
    if (match && defendingCard.name.toLowerCase().startsWith(match[1].toLowerCase())) {
      bonusDamage = 2;
      abilityTriggered = attackingCard.ability;
    }
  }

  // Bonus damage if this is the first/last round
  if (ability.includes('first round') && gameState.round === 1) {
    bonusDamage = 2;
    abilityTriggered = attackingCard.ability;
  }
  if (ability.includes('final round') && gameState.round === MAX_ROUNDS) {
    bonusDamage = 3;
    abilityTriggered = attackingCard.ability;
  }

  // Bonus damage based on HP conditions
  if (ability.includes('low hp') || ability.includes('below half')) {
    const attacker = Object.values(gameState.players).find(p => 
      p.cards.some(c => c.id === attackingCard.id)
    );
    if (attacker && attacker.hp <= STARTING_HP / 2) {
      bonusDamage = 2;
      abilityTriggered = attackingCard.ability;
    }
  }

  // Double damage ability (rare)
  if (ability.includes('double damage') && Math.random() < 0.25) {
    bonusDamage = baseDamage;
    abilityTriggered = attackingCard.ability;
  }

  return {
    damage: baseDamage + bonusDamage,
    bonusDamage,
    abilityTriggered,
  };
}

/**
 * Get the opponent's last played card (for defense calculation)
 */
export function getLastPlayedCard(
  gameState: GameState,
  excludePlayerId: string
): Card | null {
  const opponentCards = gameState.playedCards
    .filter(pc => pc.playerId !== excludePlayerId && pc.gameNumber === gameState.gameNumber)
    .sort((a, b) => b.round - a.round);
  
  return opponentCards[0]?.card || null;
}

/**
 * Check if the current game should end
 */
export function checkGameEnd(gameState: GameState): { ended: boolean; winner: string | null } {
  // Check if any player has 0 or less HP
  for (const player of Object.values(gameState.players)) {
    if (player.hp <= 0) {
      const winner = Object.values(gameState.players).find(p => p.id !== player.id);
      return { ended: true, winner: winner?.id || null };
    }
  }

  // Check if we've reached max rounds
  if (gameState.round > MAX_ROUNDS) {
    const players = Object.values(gameState.players);
    if (players.length === 2) {
      if (players[0].hp > players[1].hp) {
        return { ended: true, winner: players[0].id };
      } else if (players[1].hp > players[0].hp) {
        return { ended: true, winner: players[1].id };
      } else {
        return { ended: true, winner: null }; // Tie
      }
    }
  }

  return { ended: false, winner: null };
}

/**
 * Check if the match (best of 3) should end
 */
export function checkMatchEnd(gameState: GameState): { ended: boolean; winner: string | null } {
  for (const player of Object.values(gameState.players)) {
    if (player.matchWins >= WINS_TO_WIN_MATCH) {
      return { ended: true, winner: player.id };
    }
  }
  return { ended: false, winner: null };
}

/**
 * Get the next player's turn
 */
export function getNextTurn(gameState: GameState): string | null {
  if (gameState.playerOrder.length < 2) return null;
  
  const currentIndex = gameState.playerOrder.indexOf(gameState.currentTurn || '');
  const nextIndex = (currentIndex + 1) % gameState.playerOrder.length;
  return gameState.playerOrder[nextIndex];
}

/**
 * Check if player has completed their draft
 */
export function isDraftComplete(player: Player): boolean {
  return player.draftedCards.length === CARDS_PER_PLAYER;
}
