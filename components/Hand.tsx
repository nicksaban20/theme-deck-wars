"use client";

import { Card as CardType } from "@/lib/types";
import { CardWithArt } from "./CardWithArt";

interface HandProps {
  cards: CardType[];
  onPlayCard?: (cardId: string) => void;
  isCurrentTurn: boolean;
  disabled?: boolean;
}

export function Hand({ cards, onPlayCard, isCurrentTurn, disabled = false }: HandProps) {
  if (cards.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No cards remaining
      </div>
    );
  }

  // Calculate overlap based on number of cards - less overlap for fewer cards
  const getOverlap = () => {
    if (cards.length <= 3) return 20; // Minimal overlap
    if (cards.length <= 5) return 40; // Medium overlap
    return 60; // More overlap for many cards
  };

  const overlap = getOverlap();

  return (
    <div className="relative pb-4">
      {/* Hand label */}
      <div className="text-center mb-4">
        <span className="text-sm text-gray-400">
          Your Hand ({cards.length} cards)
        </span>
        {isCurrentTurn && !disabled && (
          <span className="ml-2 text-violet-400 animate-pulse">
            ← Click a card to play!
          </span>
        )}
      </div>

      {/* Cards - horizontal scroll on mobile, centered on desktop */}
      <div className="flex justify-center items-end overflow-x-auto pb-4 px-4">
        <div className="flex items-end" style={{ gap: `-${overlap}px` }}>
          {cards.map((card, index) => {
            // Subtle fan effect - less rotation for readability
            const rotation = cards.length > 1 
              ? (index - (cards.length - 1) / 2) * 3 
              : 0;
            const yOffset = Math.abs(index - (cards.length - 1) / 2) * 5;
            
            return (
              <div
                key={card.id}
                className="transition-all duration-300 hover:!translate-y-[-30px] hover:!rotate-0 flex-shrink-0"
                style={{
                  transform: `rotate(${rotation}deg) translateY(${yOffset}px)`,
                  zIndex: index,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.zIndex = '50';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.zIndex = String(index);
                }}
              >
                <CardWithArt
                  card={card}
                  onClick={onPlayCard ? () => onPlayCard(card.id) : undefined}
                  isPlayable={isCurrentTurn && !disabled}
                  disabled={disabled || !isCurrentTurn}
                  size="md"
                  showAbility={true}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
