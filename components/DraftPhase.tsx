"use client";

import { Player, Card as CardType } from "@/lib/types";
import { CardWithArt } from "./CardWithArt";
import { CARDS_PER_PLAYER, getCardSynergies, DRAFT_POOL_SIZE } from "@/lib/gameLogic";

interface DraftPhaseProps {
  currentPlayer: Player | null;
  opponent: Player | null;
  onSelectCard: (cardId: string) => void;
  onDiscardCard: (cardId: string) => void;
  onConfirmDraft: () => void;
  blindDraft?: boolean;
}

export function DraftPhase({
  currentPlayer,
  opponent,
  onSelectCard,
  onDiscardCard,
  onConfirmDraft,
  blindDraft = false,
}: DraftPhaseProps) {
  if (!currentPlayer) {
    return (
      <div className="h-full arena-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading draft...</p>
        </div>
      </div>
    );
  }

  const selectedCount = currentPlayer.draftedCards.length;
  const canConfirm = selectedCount === CARDS_PER_PLAYER;
  const poolCount = currentPlayer.draftPool.length;

  return (
    <div className="h-full arena-bg flex flex-col overflow-hidden relative">
      {/* Decorative Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bg-amber-600/10 w-[400px] h-[400px] rounded-full blur-[100px] top-[-100px] left-[-100px]" />
        <div className="absolute bg-violet-600/10 w-[400px] h-[400px] rounded-full blur-[100px] bottom-[-100px] right-[-100px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-start max-w-5xl mx-auto w-full p-4 min-h-0">
        {/* Header - Compact */}
        <div className="text-center mb-4 shrink-0">
          <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-white to-violet-300"
            style={{ fontFamily: "var(--font-display)" }}>
            DRAFT YOUR DECK
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Select {CARDS_PER_PLAYER} cards • Theme: <span className="text-amber-400 font-bold">"{currentPlayer.theme}"</span>
          </p>

          {/* Progress Row */}
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className={`px-4 py-1.5 rounded-full text-sm font-bold ${canConfirm ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400" : "bg-violet-500/20 border border-violet-500/40 text-violet-400"
              }`}>
              {selectedCount}/{CARDS_PER_PLAYER} Selected
            </div>
            {opponent && (
              <div className={`px-4 py-1.5 rounded-full text-sm ${opponent.isDraftReady ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-gray-500"
                }`}>
                {opponent.name}: {opponent.isDraftReady ? "Ready ✓" : `${opponent.draftedCards.length}/${CARDS_PER_PLAYER}`}
              </div>
            )}
          </div>
        </div>

        {/* Selected Deck - Compact */}
        <div className="mb-4 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Your Deck</h2>
            {canConfirm && !currentPlayer.isDraftReady && (
              <button
                onClick={onConfirmDraft}
                className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full font-bold text-sm text-white
                           shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all hover:scale-105"
              >
                Confirm Deck ✓
              </button>
            )}
          </div>

          <div className="bg-black/30 backdrop-blur-sm rounded-xl p-3 border border-white/5 min-h-[120px]">
            {currentPlayer.draftedCards.length > 0 ? (
              <div className="flex flex-wrap gap-2 justify-center">
                {currentPlayer.draftedCards.map((card) => (
                  <div key={card.id} className="relative group">
                    <CardWithArt card={card} size="sm" />
                    {!currentPlayer.isDraftReady && (
                      <button
                        onClick={() => onDiscardCard(card.id)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs font-bold
                                   opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 flex items-center justify-center"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 text-gray-600 text-sm">
                Click cards below to add them
              </div>
            )}
          </div>

          {currentPlayer.isDraftReady && (
            <div className="mt-2 text-center">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-sm">
                ✓ Deck confirmed! Waiting...
              </span>
            </div>
          )}
        </div>

        {/* Available Pool - Scrollable */}
        {!currentPlayer.isDraftReady && poolCount > 0 && (
          <div className="flex-1 min-h-0 flex flex-col">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2 shrink-0">
              Available ({poolCount})
            </h2>

            <div className="flex-1 overflow-y-auto overflow-x-hidden pb-2">
              <div className="flex flex-wrap gap-3 justify-center">
                {currentPlayer.draftPool.map((card) => {
                  const { synergies } = getCardSynergies(card, currentPlayer);
                  const hasSynergy = synergies.length > 0;

                  return (
                    <div
                      key={card.id}
                      className={`relative cursor-pointer transform transition-all duration-200 
                                 hover:scale-105 hover:-translate-y-1 ${hasSynergy ? "ring-2 ring-yellow-400/50 rounded-xl" : ""}`}
                      onClick={() => {
                        if (selectedCount < CARDS_PER_PLAYER) {
                          onSelectCard(card.id);
                        }
                      }}
                      title={hasSynergy ? `Synergies: ${synergies.join(", ")}` : undefined}
                    >
                      <CardWithArt
                        card={card}
                        size="sm"
                        isPlayable={selectedCount < CARDS_PER_PLAYER}
                        disabled={selectedCount >= CARDS_PER_PLAYER}
                      />
                      {hasSynergy && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-black text-xs font-bold">
                          ⚡
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
