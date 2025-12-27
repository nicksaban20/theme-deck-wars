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
      <div className="min-h-screen arena-bg flex items-center justify-center">
        <p className="text-gray-400">Loading draft...</p>
      </div>
    );
  }

  const selectedCount = currentPlayer.draftedCards.length;
  const canConfirm = selectedCount === CARDS_PER_PLAYER;
  const poolCount = currentPlayer.draftPool.length;

  return (
    <div className="min-h-screen arena-bg flex flex-col p-4 md:p-8">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 
            className="text-3xl md:text-4xl font-bold text-white mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Draft Your Deck
          </h1>
          <p className="text-gray-400 mb-4">
            Select {CARDS_PER_PLAYER} cards from your pool of {DRAFT_POOL_SIZE}. 
            {!blindDraft && " Watch for cards with ⚡ - they synergize with your deck!"}
          </p>
          
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className={`px-4 py-2 rounded-lg ${
              canConfirm 
                ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400" 
                : "bg-violet-500/20 border border-violet-500/40 text-violet-400"
            }`}>
              <span className="font-bold">{selectedCount}</span> / {CARDS_PER_PLAYER} selected
            </div>
            {opponent && (
              <div className={`px-4 py-2 rounded-lg ${
                opponent.isDraftReady 
                  ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400" 
                  : "bg-white/5 border border-white/10 text-gray-400"
              }`}>
                {blindDraft ? (
                  <>
                    {opponent.name}: {opponent.isDraftReady ? "Ready ✓" : "Drafting..."}
                    <span className="text-violet-400 ml-2">(Blind)</span>
                  </>
                ) : (
                  <>
                    {opponent.name}: {opponent.draftedCards.length}/{CARDS_PER_PLAYER} selected
                    {opponent.isDraftReady && " ✓ Ready"}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Theme reminder */}
          <p className="text-sm text-gray-500">
            Your theme: <span className="text-amber-400">&quot;{currentPlayer.theme}&quot;</span>
          </p>
        </div>

        {/* Selected Cards */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">
              Your Deck ({selectedCount}/{CARDS_PER_PLAYER})
            </h2>
            {canConfirm && !currentPlayer.isDraftReady && (
              <button
                onClick={onConfirmDraft}
                className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 
                           rounded-lg font-semibold text-white
                           hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-300
                           hover:scale-105 active:scale-95"
              >
                Confirm Deck ✓
              </button>
            )}
          </div>
          
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 min-h-[200px]">
            {currentPlayer.draftedCards.length > 0 ? (
              <div className="flex flex-wrap gap-4 justify-center">
                {currentPlayer.draftedCards.map((card) => (
                  <div key={card.id} className="relative group">
                    <CardWithArt card={card} size="sm" isDraftPhase />
                    {!currentPlayer.isDraftReady && (
                      <button
                        onClick={() => onDiscardCard(card.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full 
                                   text-white text-sm font-bold opacity-0 group-hover:opacity-100
                                   transition-opacity hover:bg-red-600 flex items-center justify-center"
                        title="Remove from deck"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-500">
                Click cards below to add them to your deck
              </div>
            )}
          </div>
          
          {currentPlayer.isDraftReady && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-400">
                <span>✓</span>
                <span>Deck confirmed! Waiting for opponent...</span>
              </div>
            </div>
          )}
        </div>

        {/* Available Pool */}
        {!currentPlayer.isDraftReady && poolCount > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">
              Available Cards ({poolCount} remaining)
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Click a card to add it to your deck. You must discard {poolCount - (CARDS_PER_PLAYER - selectedCount)} cards.
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center">
              {currentPlayer.draftPool.map((card) => {
                const { synergies } = getCardSynergies(card, currentPlayer);
                const hasSynergy = synergies.length > 0;
                
                return (
                  <div 
                    key={card.id} 
                    className={`relative cursor-pointer transform transition-all duration-200 
                               hover:scale-105 hover:-translate-y-2 ${
                                 hasSynergy ? "ring-2 ring-yellow-400/50" : ""
                               }`}
                    onClick={() => {
                      if (selectedCount < CARDS_PER_PLAYER) {
                        onSelectCard(card.id);
                      }
                    }}
                    title={hasSynergy ? `Synergies: ${synergies.join(", ")}` : undefined}
                  >
                    <CardWithArt 
                      card={card} 
                      size="md"
                      isPlayable={selectedCount < CARDS_PER_PLAYER}
                      disabled={selectedCount >= CARDS_PER_PLAYER}
                    />
                    {hasSynergy && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-black text-xs font-bold">
                        ⚡
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            💡 Tip: Balance your deck with high-attack cards for offense and high-defense cards for protection.
          </p>
        </div>
      </div>
    </div>
  );
}

