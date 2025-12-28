import { Card, GameState, Player, CardPerks, PassivePerk, TriggeredPerk, ComboPerk, StatusEffect, CardColor } from './types';

export const STARTING_HP = 20;
export const CARDS_PER_PLAYER = 5;
export const DRAFT_POOL_SIZE = 9; // Generate 9 cards, pick 5 (enhanced variety)
export const MAX_ROUNDS = 5;
export const WINS_TO_WIN_MATCH = 2; // Best of 3

// Mana system constants
export const STARTING_MANA = 3;
export const MAX_MANA = 5;
export const MANA_PER_TURN = 1;
export const MANA_PER_ROUND = 1; // Mana increases each round

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
    roundModifier: null,
    blindDraft: false,
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
    revealedCard: null,
    isRevealReady: false,
    hp: STARTING_HP,
    maxHp: STARTING_HP,
    mana: STARTING_MANA,
    maxMana: STARTING_MANA,
    isReady: false,
    isDraftReady: false,
    matchWins: 0,
    statusEffects: [],
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
    revealedCard: null,
    isRevealReady: false,
    hp: STARTING_HP,
    maxHp: STARTING_HP,
    mana: STARTING_MANA,
    maxMana: STARTING_MANA,
    isReady: true, // Keep ready since they're in a match
    isDraftReady: false,
    statusEffects: [],
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
    roundModifier: null, // Reset round modifier
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

  // Check if both players have no cards left - end game
  const players = Object.values(gameState.players);
  if (players.length === 2) {
    const bothEmpty = players.every(p => p.cards.length === 0);
    if (bothEmpty) {
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

/**
 * Get default values for cards missing new stats (backward compatibility)
 * This ensures old cached cards work with new features
 */
export function getCardDefaults(card: Card): Card {
  // Ensure all required fields exist with safe defaults
  return {
    ...card,
    manaCost: typeof card.manaCost === 'number' ? card.manaCost : 1,
    speed: typeof card.speed === 'number' ? card.speed : 5,
    rarity: card.rarity || 'common',
    perks: card.perks || {},
    // Ensure optional art fields exist
    imagePrompt: card.imagePrompt || `${card.name}, fantasy trading card art style`,
    iconKeyword: card.iconKeyword || 'sword',
  };
}

/**
 * Check if player has enough mana to play a card (with round modifiers)
 */
export function canPlayCard(player: Player, card: Card, gameState: GameState): boolean {
  const cardWithDefaults = getCardDefaults(card);
  const effectiveCost = getEffectiveManaCost(card, gameState);
  const playerMana = player.mana ?? STARTING_MANA;
  return playerMana >= effectiveCost;
}

/**
 * Get effective mana cost of a card (with round modifiers applied)
 */
export function getEffectiveManaCost(card: Card, gameState: GameState): number {
  const cardWithDefaults = getCardDefaults(card);
  let effectiveCost = cardWithDefaults.manaCost;

  // Apply round modifier (Mana Surge: -1 mana cost)
  const roundModifier = getRoundModifier(gameState.round);
  if (roundModifier && roundModifier.name === "Mana Surge") {
    effectiveCost = Math.max(1, effectiveCost - 1);
  }

  return effectiveCost;
}

/**
 * Calculate turn order based on card speed (higher speed plays first)
 * Round 1 modifier doubles speed difference
 */
export function calculateSpeedOrder(
  gameState: GameState,
  player1Card: Card | null,
  player2Card: Card | null
): string[] {
  const players = Object.values(gameState.players);
  if (players.length !== 2) return gameState.playerOrder;

  const player1 = players[0];
  const player2 = players[1];

  let speed1 = player1Card ? getCardDefaults(player1Card).speed : 0;
  let speed2 = player2Card ? getCardDefaults(player2Card).speed : 0;

  // Round 1 modifier: First Strike - speed matters more
  const modifier = getRoundModifier(gameState.round);
  if (modifier && modifier.round === 1) {
    // Double the speed difference for tie-breaking
    const speedDiff = Math.abs(speed1 - speed2);
    if (speed1 > speed2) {
      speed1 += speedDiff;
    } else if (speed2 > speed1) {
      speed2 += speedDiff;
    }
  }

  // Higher speed plays first, if tie, use original order
  if (speed1 > speed2) {
    return [player1.id, player2.id];
  } else if (speed2 > speed1) {
    return [player2.id, player1.id];
  } else {
    return gameState.playerOrder; // Tie, keep original order
  }
}

/**
 * Check if a card has synergy with other cards in a player's deck
 */
export function getCardSynergies(card: Card, player: Player): {
  synergies: string[];
  synergyCards: Card[];
} {
  const synergies: string[] = [];
  const synergyCards: Card[] = [];

  const allPlayerCards = [...player.draftedCards, ...player.cards];
  const cardWithDefaults = getCardDefaults(card);

  // Check combo perks
  const comboPerks = cardWithDefaults.perks?.combo || [];
  for (const perk of comboPerks) {
    if (Array.isArray(perk.synergyWith)) {
      for (const synergyName of perk.synergyWith) {
        const hasSynergy = allPlayerCards.some(c =>
          c.name.toLowerCase() === synergyName.toLowerCase()
        );
        if (hasSynergy) {
          synergies.push(`Synergizes with ${synergyName}`);
          const synergyCard = allPlayerCards.find(c =>
            c.name.toLowerCase() === synergyName.toLowerCase()
          );
          if (synergyCard) synergyCards.push(synergyCard);
        }
      }
    }

    if (Array.isArray(perk.requiresColor)) {
      const hasColor = allPlayerCards.some(c =>
        perk.requiresColor?.includes(c.color)
      );
      if (hasColor) {
        synergies.push(`Color combo: ${perk.requiresColor.join(' + ')}`);
      }
    }
  }

  return { synergies, synergyCards };
}

/**
 * Evaluate passive perks for a card
 */
export function evaluatePassivePerks(
  card: Card,
  player: Player,
  gameState: GameState
): { damageBoost: number; damageReduction: number; healPerTurn: number; drawCard: boolean } {
  const perks = card.perks?.passive || [];
  let damageBoost = 0;
  let damageReduction = 0;
  let healPerTurn = 0;
  let drawCard = false;

  if (!Array.isArray(perks)) {
    console.warn(`[Perks] Invalid passive perks array for card ${card.name}`);
    return { damageBoost, damageReduction, healPerTurn, drawCard };
  }

  for (const perk of perks) {
    if (!perk || typeof perk !== 'object' || !('type' in perk)) {
      console.warn(`[Perks] Invalid perk object for card ${card.name}`);
      continue;
    }

    switch (perk.type) {
      case 'damageBoost':
        damageBoost += typeof perk.value === 'number' ? Math.max(0, perk.value) : 0;
        break;
      case 'damageReduction':
        damageReduction += typeof perk.value === 'number' ? Math.max(0, perk.value) : 0;
        break;
      case 'healPerTurn':
        healPerTurn += typeof perk.value === 'number' ? Math.max(0, perk.value) : 0;
        break;
      case 'drawCard':
        drawCard = perk.value === true;
        break;
      default:
        console.warn(`[Perks] Unknown passive perk type: ${perk.type}`);
    }
  }

  return { damageBoost, damageReduction, healPerTurn, drawCard };
}

/**
 * Evaluate triggered perks for a card
 */
export function evaluateTriggeredPerks(
  card: Card,
  trigger: 'onPlay' | 'onDeath' | 'onFirstRound' | 'onLastRound' | 'onLowHP',
  player: Player,
  gameState: GameState
): { effect: string; value: number } | null {
  const perks = card.perks?.triggered || [];

  if (!Array.isArray(perks)) {
    return null;
  }

  for (const perk of perks) {
    if (!perk || typeof perk !== 'object' || !('type' in perk) || perk.type !== trigger) {
      continue;
    }

    // Check conditions
    if (trigger === 'onFirstRound' && gameState.round !== 1) continue;
    if (trigger === 'onLastRound' && gameState.round !== MAX_ROUNDS) continue;
    if (trigger === 'onLowHP' && (player.hp ?? STARTING_HP) > STARTING_HP / 2) continue;

    return {
      effect: typeof perk.effect === 'string' ? perk.effect : '',
      value: typeof perk.value === 'number' ? perk.value : 0,
    };
  }

  return null;
}

/**
 * Evaluate combo perks for a card
 */
export function evaluateComboPerks(
  card: Card,
  player: Player,
  gameState: GameState
): { effect: string; value: number } | null {
  const perks = card.perks?.combo || [];

  if (!Array.isArray(perks)) {
    return null;
  }

  for (const perk of perks) {
    if (!perk || typeof perk !== 'object' || !('comboEffect' in perk)) {
      continue;
    }

    let comboTriggered = false;

    // Check synergy with card names
    if (Array.isArray(perk.synergyWith) && perk.synergyWith.length > 0) {
      const playedCardNames = gameState.playedCards
        .filter(pc => pc.playerId === player.id && pc.gameNumber === gameState.gameNumber)
        .map(pc => pc.card.name.toLowerCase());

      const synergyCount = perk.synergyWith.filter((name: unknown) =>
        typeof name === 'string' && playedCardNames.includes(name.toLowerCase())
      ).length;

      comboTriggered = synergyCount >= perk.synergyWith.length;
    }

    // Check color requirements
    if (Array.isArray(perk.requiresColor) && perk.requiresColor.length > 0) {
      const playedCardColors = gameState.playedCards
        .filter(pc => pc.playerId === player.id && pc.gameNumber === gameState.gameNumber)
        .map(pc => pc.card.color);

      const colorMatch = perk.requiresColor.some((color: unknown) =>
        typeof color === 'string' && playedCardColors.includes(color as CardColor)
      );

      comboTriggered = comboTriggered || colorMatch;
    }

    if (comboTriggered) {
      return {
        effect: typeof perk.comboEffect === 'string' ? perk.comboEffect : '',
        value: typeof perk.value === 'number' ? perk.value : 0,
      };
    }
  }

  return null;
}

/**
 * Apply status effects from a card
 */
export function applyStatusEffects(card: Card, target: Player): StatusEffect[] {
  const newEffects: StatusEffect[] = [];
  const statusPerks = card.perks?.status || [];

  if (!Array.isArray(statusPerks)) {
    return target.statusEffects || [];
  }

  for (const effect of statusPerks) {
    if (!effect || typeof effect !== 'object' || !('type' in effect) || !('value' in effect)) {
      console.warn(`[Status] Invalid status effect for card ${card.name}`);
      continue;
    }

    newEffects.push({
      type: typeof effect.type === 'string' ? effect.type : 'unknown',
      value: typeof effect.value === 'number' ? effect.value : 0,
      duration: typeof effect.duration === 'number' ? Math.max(1, effect.duration) : 1,
    });
  }

  return [...(target.statusEffects || []), ...newEffects];
}

/**
 * Process status effects at end of turn
 */
export function processStatusEffects(player: Player): { hpChange: number; effectsRemaining: StatusEffect[] } {
  let hpChange = 0;
  const effectsRemaining: StatusEffect[] = [];

  for (const effect of player.statusEffects || []) {
    // Apply effect
    switch (effect.type.toLowerCase()) {
      case 'poison':
        hpChange -= effect.value;
        break;
      case 'heal':
        hpChange += effect.value;
        break;
      case 'shield':
        // Shield reduces damage, handled in damage calculation
        break;
    }

    // Decrease duration
    const newDuration = (effect.duration || 1) - 1;
    if (newDuration > 0) {
      effectsRemaining.push({ ...effect, duration: newDuration });
    }
  }

  return { hpChange, effectsRemaining };
}

/**
 * Gain mana at start of turn
 */
export function gainManaPerTurn(player: Player): Player {
  const currentMaxMana = player.maxMana || STARTING_MANA;
  const newMaxMana = Math.min(currentMaxMana + MANA_PER_TURN, MAX_MANA);
  return {
    ...player,
    mana: newMaxMana, // Refill to max
    maxMana: newMaxMana,
  };
}

/**
 * Calculate mana for a round (round-based scaling)
 * Round 1: 3 mana, Round 2: 4 mana, Round 3: 5 mana, etc.
 */
export function getRoundMana(round: number): number {
  return Math.min(STARTING_MANA + (round - 1) * MANA_PER_ROUND, MAX_MANA);
}

/**
 * Round modifiers/bonuses
 */
export interface RoundModifier {
  round: number;
  name: string;
  description: string;
  effect: (gameState: GameState) => void;
}

export const ROUND_MODIFIERS: RoundModifier[] = [
  {
    round: 1,
    name: "First Strike",
    description: "Speed bonuses doubled this round",
    effect: (gameState) => {
      // Speed bonuses are handled in calculateSpeedOrder
      gameState.message = "Round 1: First Strike - Speed matters more!";
    },
  },
  {
    round: 2,
    name: "Mana Surge",
    description: "All cards cost -1 mana (minimum 1)",
    effect: (gameState) => {
      gameState.message = "Round 2: Mana Surge - Cards cost 1 less mana!";
    },
  },
  {
    round: 3,
    name: "Power Play",
    description: "+1 attack to all cards",
    effect: (gameState) => {
      gameState.message = "Round 3: Power Play - All cards gain +1 attack!";
    },
  },
  {
    round: 4,
    name: "Defensive Stance",
    description: "+1 defense to all cards",
    effect: (gameState) => {
      gameState.message = "Round 4: Defensive Stance - All cards gain +1 defense!";
    },
  },
  {
    round: 5,
    name: "Final Stand",
    description: "+2 attack to all cards",
    effect: (gameState) => {
      gameState.message = "Round 5: Final Stand - All cards gain +2 attack!";
    },
  },
];

/**
 * Get the modifier for the current round
 */
export function getRoundModifier(round: number): RoundModifier | null {
  return ROUND_MODIFIERS.find(m => m.round === round) || null;
}

/**
 * Updated damage calculation with perks
 */
export function calculateDamageWithPerks(
  attackingCard: Card,
  defendingCard: Card | null,
  attacker: Player,
  defender: Player,
  gameState: GameState
): { damage: number; bonusDamage: number; abilityTriggered: string | null } {
  const card = getCardDefaults(attackingCard);
  let baseDamage = card.attack;
  let bonusDamage = 0;
  let abilityTriggered: string | null = null;

  // Get round modifier for applying stat bonuses
  const roundModifier = getRoundModifier(gameState.round);

  // Apply round modifiers to base attack
  if (roundModifier) {
    if (roundModifier.name === "Power Play") baseDamage += 1;
    if (roundModifier.name === "Final Stand") baseDamage += 2;
  }

  // Apply passive damage boost
  const passivePerks = evaluatePassivePerks(card, attacker, gameState);
  baseDamage += passivePerks.damageBoost;

  // If there's a defending card, subtract its defense
  if (defendingCard) {
    const defendingCardDefaults = getCardDefaults(defendingCard);
    let effectiveDefense = defendingCardDefaults.defense;

    // Apply round modifiers to defense
    if (roundModifier && roundModifier.name === "Defensive Stance") {
      // Defensive Stance: +1 defense
      effectiveDefense += 1;
    }

    const defendingPassive = evaluatePassivePerks(defendingCardDefaults, defender, gameState);
    effectiveDefense += defendingPassive.damageReduction;
    baseDamage = Math.max(0, baseDamage - effectiveDefense);
  }

  // Check triggered perks
  const onPlayPerk = evaluateTriggeredPerks(card, 'onPlay', attacker, gameState);
  if (onPlayPerk) {
    if (onPlayPerk.effect.toLowerCase().includes('damage')) {
      bonusDamage += onPlayPerk.value;
    }
    abilityTriggered = onPlayPerk.effect;
  }

  // Check combo perks
  const comboPerk = evaluateComboPerks(card, attacker, gameState);
  if (comboPerk) {
    if (comboPerk.effect.toLowerCase().includes('damage')) {
      bonusDamage += comboPerk.value;
    }
    abilityTriggered = comboPerk.effect;
  }

  // Legacy ability text parsing (backward compatibility)
  const ability = card.ability.toLowerCase();
  if (ability.includes('first round') && gameState.round === 1) {
    bonusDamage = Math.max(bonusDamage, 2);
    abilityTriggered = card.ability;
  }
  if (ability.includes('final round') && gameState.round === MAX_ROUNDS) {
    bonusDamage = Math.max(bonusDamage, 3);
    abilityTriggered = card.ability;
  }
  if (ability.includes('low hp') || ability.includes('below half')) {
    if (attacker.hp <= STARTING_HP / 2) {
      bonusDamage = Math.max(bonusDamage, 2);
      abilityTriggered = card.ability;
    }
  }

  // Apply status effects (shield reduces damage)
  const shieldEffect = defender.statusEffects?.find(e => e.type.toLowerCase() === 'shield');
  if (shieldEffect) {
    baseDamage = Math.max(0, baseDamage - shieldEffect.value);
  }

  return {
    damage: baseDamage + bonusDamage,
    bonusDamage,
    abilityTriggered,
  };
}
