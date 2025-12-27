// Card Types
export type CardColor = 'amber' | 'crimson' | 'emerald' | 'violet' | 'cyan' | 'rose' | 'slate';
export type CardRarity = 'common' | 'rare' | 'epic';

// Art style options for cards
export type CardArtStyle = 'pattern' | 'ai' | 'local-ai' | 'icons';

// Perk Types
export interface PassivePerk {
  type: 'damageReduction' | 'damageBoost' | 'healPerTurn' | 'drawCard';
  value: number | boolean;
}

export interface TriggeredPerk {
  type: 'onPlay' | 'onDeath' | 'onFirstRound' | 'onLastRound' | 'onLowHP';
  effect: string;
  value?: number;
}

export interface ComboPerk {
  synergyWith?: string[]; // Card names that trigger combo
  requiresColor?: CardColor[]; // Colors that trigger combo
  comboEffect: string;
  value?: number;
}

export interface StatusEffect {
  type: string; // e.g., 'poison', 'shield', 'rage'
  value: number;
  duration?: number; // Rounds remaining
}

export interface CardPerks {
  passive?: PassivePerk[];
  triggered?: TriggeredPerk[];
  combo?: ComboPerk[];
  status?: StatusEffect[];
}

export interface Card {
  id: string;
  name: string;
  attack: number;
  defense: number;
  ability: string; // Human-readable description (kept for backward compatibility)
  flavorText: string;
  color: CardColor;
  // New stats
  manaCost: number; // Resource cost to play (1-5)
  speed: number; // Initiative/turn order (1-10, higher = faster)
  health?: number; // Optional: survives multiple rounds (if > 0)
  rarity: CardRarity; // Affects draft availability
  // Structured perks
  perks?: CardPerks;
  // Art generation fields
  imagePrompt?: string; // For AI-generated art
  iconKeyword?: string; // For icon mapping
}

// Player Types
export interface Player {
  id: string;
  name: string;
  theme: string;
  originalTheme: string; // Track original theme for swap
  cards: Card[];
  draftPool: Card[]; // Cards available during draft (9 cards)
  draftedCards: Card[]; // Cards selected during draft (5 cards)
  revealedCard: Card | null; // Card revealed in reveal phase
  isRevealReady: boolean; // Has selected card to reveal
  hp: number;
  mana: number; // Current mana pool
  maxMana: number; // Maximum mana (increases per turn)
  isReady: boolean;
  isDraftReady: boolean; // Has finished drafting
  matchWins: number; // Wins in current best-of-3
  // Active status effects
  statusEffects?: StatusEffect[];
}

// Game State
export type GamePhase =
  | 'lobby'
  | 'theme-select'
  | 'generating'
  | 'drafting'  // New phase for card selection
  | 'reveal'    // Card reveal phase before battle
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
  // Round modifier for current round
  roundModifier: string | null; // Name of active round modifier
  // Draft mode
  blindDraft: boolean; // If true, hide opponent's picks during draft
  // Match history
  gameHistory: {
    gameNumber: number;
    winner: string | null;
    player1HP: number;
    player2HP: number;
    player1Strategy?: string; // Track winning strategy
    player2Strategy?: string;
  }[];
  // Speed-based turn order for current round
  speedOrder?: string[]; // Player IDs ordered by card speed
}

// Message Types for PartyKit
export type ClientMessage =
  | { type: 'join'; playerName: string; isSpectator?: boolean; blindDraft?: boolean }
  | { type: 'set-theme'; theme: string }
  | { type: 'ready' }
  | { type: 'draft-select'; cardId: string } // Select a card during draft
  | { type: 'draft-discard'; cardId: string } // Discard a card during draft
  | { type: 'draft-confirm' } // Confirm draft selection
  | { type: 'reveal-card'; cardId: string } // Select card to reveal
  | { type: 'play-card'; cardId: string }
  | { type: 'continue-match' } // Continue to next game in best-of-3
  | { type: 'request-rematch' } // Request a rematch
  | { type: 'request-swap-rematch' } // Request rematch with swapped themes
  | { type: 'accept-rematch' } // Accept rematch request
  | { type: 'toggle-blind-draft' }; // Toggle blind draft mode (lobby only)

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
