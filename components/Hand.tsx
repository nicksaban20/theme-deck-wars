"use client";

import { Card as CardType, GameState } from "@/lib/types";
import { CardWithArt } from "./CardWithArt";
import { canPlayCard, getCardDefaults, getEffectiveManaCost } from "@/lib/gameLogic";
import { Player } from "@/lib/types";

interface HandProps {
  cards: CardType[];
  onPlayCard?: (cardId: string) => void;
  isCurrentTurn: boolean;
  disabled?: boolean;
  player?: Player; // For mana checking
  gameState?: GameState; // For round modifiers
}

export function Hand({ cards, onPlayCard, isCurrentTurn, disabled = false, player, gameState }: HandProps) {
  if (cards.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No cards remaining
      </div>
    );
  }

  // Calculate overlap based on number of cards - less overlap for fewer cards
  // Use positive gaps (no overlap) to ensure cards are visible
  const getGap = () => {
    if (cards.length <= 3) return 16; // 16px gap
    if (cards.length <= 5) return 8;  // 8px gap
    return 4; // Minimal gap for many cards
  };

  const gap = getGap();

  return (
    <div className="relative w-full">
      {/* Hand label */}
      <div className="text-center mb-1">
        <span className="text-xs text-gray-500">
          Your Hand ({cards.length})
        </span>
        {isCurrentTurn && !disabled && (
          <span className="ml-2 text-violet-400 animate-pulse text-xs">
            ← Play a card!
          </span>
        )}
      </div>

      {/* Cards - no scroll, centered */}
      <div className="flex justify-center items-end pb-2 px-4">
        <div className="flex items-end justify-center" style={{ gap: `${gap}px` }}>
          {cards.map((card, index) => {
            // Subtle fan effect - less rotation for readability
            const rotation = cards.length > 1
              ? (index - (cards.length - 1) / 2) * 2
              : 0;
            const yOffset = Math.abs(index - (cards.length - 1) / 2) * 3;

            const canPlay = player && gameState ? canPlayCard(player, card, gameState) : true;
            const disableReason = !isCurrentTurn
              ? "Not your turn"
              : !canPlay && gameState
                ? `Not enough Mana (Cost: ${getEffectiveManaCost(card, gameState)})`
                : "";

            return (
              <div
                key={card.id}
                className="transition-all duration-300 hover:!translate-y-[-20px] hover:!rotate-0 hover:z-50"
                style={{
                  transform: `rotate(${rotation}deg) translateY(${yOffset}px)`,
                  zIndex: index,
                }}
                title={disableReason}
              >
                <CardWithArt
                  card={card}
                  onClick={onPlayCard ? () => onPlayCard(card.id) : undefined}
                  isPlayable={isCurrentTurn && !disabled && canPlay}
                  disabled={disabled || !isCurrentTurn || !canPlay}
                  size="sm"
                  showAbility={false}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
