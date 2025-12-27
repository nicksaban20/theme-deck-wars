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

  return (
    <div className="relative">
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

      {/* Cards */}
      <div className="flex justify-center items-end gap-[-20px] flex-wrap">
        {cards.map((card, index) => {
          // Fan effect - rotate cards slightly
          const rotation = cards.length > 1 
            ? (index - (cards.length - 1) / 2) * 5 
            : 0;
          const yOffset = Math.abs(index - (cards.length - 1) / 2) * 8;
          
          return (
            <div
              key={card.id}
              className="transition-all duration-300 hover:z-10"
              style={{
                transform: `rotate(${rotation}deg) translateY(${yOffset}px)`,
                marginLeft: index > 0 ? "-20px" : "0",
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
  );
}

