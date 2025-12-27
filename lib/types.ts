// Card Types
export type CardColor = 'amber' | 'crimson' | 'emerald' | 'violet' | 'cyan' | 'rose' | 'slate';

// Art style options for cards
export type CardArtStyle = 'pattern' | 'ai' | 'icons';

export interface Card {
  id: string;
  name: string;
  attack: number;
  defense: number;
  ability: string;
  flavorText: string;
  color: CardColor;
  // Art generation fields
  imagePrompt?: string; // For Pollinations.ai AI-generated art
  iconKeyword?: string; // For Game-icons.net icon mapping
}

// Player Types
export interface Player {
  id: string;
  name: string;
  theme: string;
  originalTheme: string; // Track original theme for swap
  cards: Card[];
  draftPool: Card[]; // Cards available during draft (7 cards)
  draftedCards: Card[]; // Cards selected during draft (5 cards)
  hp: number;
  isReady: boolean;
  isDraftReady: boolean; // Has finished drafting
  matchWins: number; // Wins in current best-of-3
}

// Game State
export type GamePhase = 
  | 'lobby' 
  | 'theme-select' 
  | 'generating' 
  | 'drafting'  // New phase for card selection
  | 'battle' 
  | 'round-ended' // Single round ended, match continues
  | 'match-ended'; // Best-of-3 complete

export interface PlayedCard {
  card: Card;
  playerId: string;
  round: number;
  gameNumber: number; // Which game in best-of-3
}

export interface GameState {
  roomId: string;
  phase: GamePhase;
  players: Record<string, Player>;
  spectators: string[]; // Connection IDs of spectators
  playerOrder: string[]; // Array of player IDs in turn order
  currentTurn: string | null; // Player ID whose turn it is
  round: number;
  gameNumber: number; // Current game in best-of-3 (1, 2, or 3)
  playedCards: PlayedCard[];
  lastDamage: number | null;
  roundWinner: string | null; // Winner of current round/game
  matchWinner: string | null; // Winner of best-of-3
  message: string;
  // Match history
  gameHistory: {
    gameNumber: number;
    winner: string | null;
    player1HP: number;
    player2HP: number;
  }[];
}

// Message Types for PartyKit
export type ClientMessage =
  | { type: 'join'; playerName: string; isSpectator?: boolean }
  | { type: 'set-theme'; theme: string }
  | { type: 'ready' }
  | { type: 'draft-select'; cardId: string } // Select a card during draft
  | { type: 'draft-discard'; cardId: string } // Discard a card during draft
  | { type: 'draft-confirm' } // Confirm draft selection
  | { type: 'play-card'; cardId: string }
  | { type: 'continue-match' } // Continue to next game in best-of-3
  | { type: 'request-rematch' } // Request a rematch
  | { type: 'request-swap-rematch' } // Request rematch with swapped themes
  | { type: 'accept-rematch' }; // Accept rematch request

export type ServerMessage =
  | { type: 'state'; state: GameState }
  | { type: 'error'; message: string }
  | { type: 'card-played'; playerId: string; card: Card; damage: number }
  | { type: 'ability-triggered'; cardName: string; abilityText: string }
  | { type: 'round-ended'; winner: string | null; gameNumber: number }
  | { type: 'match-ended'; winner: string | null }
  | { type: 'rematch-requested'; byPlayerId: string; swapThemes: boolean }
  | { type: 'spectator-count'; count: number };

// API Types
export interface GenerateCardsRequest {
  theme: string;
  count?: number; // Default 5, can request 7 for draft
}

export interface GenerateCardsResponse {
  cards: Card[];
}
