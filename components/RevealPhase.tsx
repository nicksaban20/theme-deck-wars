"use client";

import { Player } from "@/lib/types";
import { CardWithArt } from "./CardWithArt";

interface RevealPhaseProps {
  currentPlayer: Player;
  opponent: Player | null;
  onRevealCard: (cardId: string) => void;
  blindDraft?: boolean;
}

export function RevealPhase({
  currentPlayer,
  opponent,
  onRevealCard,
  blindDraft = false,
}: RevealPhaseProps) {
  const isReady = currentPlayer.isRevealReady;
  const opponentReady = opponent?.isRevealReady || false;

  return (
    <div className="min-h-screen arena-bg flex flex-col items-center justify-center p-4 md:p-8">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Card Reveal Phase
          </h1>
          <p className="text-gray-300 text-lg">
            Select one card from your hand to reveal to your opponent
          </p>
          <p className="text-violet-400 text-sm mt-2">
            This adds a psychological element - reveal your best card or bluff?
          </p>
        </div>

        {/* Opponent Status */}
        {opponent && (
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
              <span className="text-gray-400">
                {opponent.name}: {opponentReady ? "✓ Ready" : "Selecting..."}
              </span>
            </div>
          </div>
        )}

        {/* Your Cards */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 text-center">
            Your Hand ({currentPlayer.cards.length} cards)
          </h2>
          
          {isReady && currentPlayer.revealedCard && (
            <div className="mb-4 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/20 rounded-full border border-violet-500/40">
                <span className="text-violet-300">✓ You revealed: {currentPlayer.revealedCard.name}</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4 justify-center">
            {currentPlayer.cards.map((card) => {
              const isRevealed = currentPlayer.revealedCard?.id === card.id;
              const canSelect = !isReady;

              return (
                <div
                  key={card.id}
                  className={`relative transition-all duration-200 ${
                    canSelect
                      ? "cursor-pointer hover:scale-105 hover:-translate-y-2"
                      : "opacity-60"
                  } ${isRevealed ? "ring-4 ring-violet-500" : ""}`}
                  onClick={() => {
                    if (canSelect) {
                      onRevealCard(card.id);
                    }
                  }}
                >
                  <CardWithArt
                    card={card}
                    size="md"
                    showAbility={true}
                    disabled={!canSelect}
                  />
                  {isRevealed && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-violet-500 rounded-full flex items-center justify-center text-white font-bold">
                      ✓
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Revealed Cards (when both ready) */}
        {isReady && opponentReady && (
          <div className="bg-gradient-to-br from-violet-900/20 to-purple-900/20 rounded-2xl p-6 border border-violet-500/30">
            <h2 className="text-xl font-bold text-white mb-4 text-center">
              Revealed Cards
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center">
                <p className="text-gray-400 mb-2">{currentPlayer.name}</p>
                {currentPlayer.revealedCard && (
                  <div className="mx-auto">
                    <CardWithArt
                      card={currentPlayer.revealedCard}
                      size="md"
                      showAbility={true}
                    />
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-gray-400 mb-2">{opponent?.name}</p>
                {opponent?.revealedCard && (
                  <div className="mx-auto">
                    <CardWithArt
                      card={opponent.revealedCard}
                      size="md"
                      showAbility={true}
                    />
                  </div>
                )}
              </div>
            </div>
            <p className="text-center text-violet-300 mt-4 animate-pulse">
              Battle will begin shortly...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

