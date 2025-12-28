"use client";

import { GameState, Card as CardType } from "@/lib/types";
import { Hand } from "./Hand";
import { CardWithArt } from "./CardWithArt";
import { canPlayCard } from "@/lib/gameLogic";

interface BattleArenaProps {
  gameState: GameState;
  currentPlayerId: string;
  onPlayCard: (cardId: string) => void;
  onSkipTurn: () => void;
  lastCardPlayed: { playerId: string; card: CardType; damage: number } | null;
  abilityTriggered: { cardName: string; abilityText: string } | null;
  spectatorCount: number;
  isSpectator?: boolean;
}

export function BattleArena({
  gameState,
  currentPlayerId,
  onPlayCard,
  onSkipTurn,
  lastCardPlayed,
  abilityTriggered,
  spectatorCount,
  isSpectator = false,
}: BattleArenaProps) {
  const currentPlayer = gameState.players[currentPlayerId];
  const opponent = Object.values(gameState.players).find(
    (p) => p.id !== currentPlayerId
  );

  const p1 = isSpectator ? Object.values(gameState.players)[0] : currentPlayer;
  const p2 = isSpectator ? Object.values(gameState.players)[1] : opponent;

  const isMyTurn = gameState.currentTurn === currentPlayerId && !isSpectator;

  const myLastPlayedCard = gameState.playedCards
    .filter((pc) => pc.playerId === (isSpectator ? p1?.id : currentPlayerId) && pc.gameNumber === gameState.gameNumber)
    .sort((a, b) => b.round - a.round)[0]?.card;

  const opponentLastPlayedCard = gameState.playedCards
    .filter((pc) => pc.playerId === (isSpectator ? p2?.id : opponent?.id) && pc.gameNumber === gameState.gameNumber)
    .sort((a, b) => b.round - a.round)[0]?.card;

  const getHpColor = (hp: number, max: number, isOpponent: boolean) => {
    const pct = (hp / max) * 100;
    if (pct <= 20) return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]";
    if (isOpponent) return "bg-rose-500";
    return "bg-emerald-400";
  };

  return (
    <div className="h-full w-full overflow-hidden arena-bg flex flex-col items-center relative">
      {/* Decorative Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-900/10 blur-[80px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-900/10 blur-[80px]" />
      </div>

      {/* TOP HUD - Fixed Height */}
      <div className="shrink-0 z-30 p-2 md:p-3 bg-gradient-to-b from-black/80 to-transparent w-full">
        <div className="w-full px-4 flex items-start justify-between gap-2">

          {/* LEFT: Player 1 */}
          <div className="flex-1 flex flex-col items-start gap-1 max-w-[280px]">
            <div className="flex items-center gap-2 w-full">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 shrink-0
                              ${isMyTurn ? 'border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)] bg-amber-500/10' : 'border-white/20 bg-black/40'}`}>
                <span className="text-lg">🧙‍♂️</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <h2 className="font-bold text-white text-xs md:text-sm uppercase tracking-wide truncate">{p1?.name || "Player 1"}</h2>
                  <span className="font-mono font-bold text-white text-sm">{p1?.hp}<span className="text-gray-500 text-xs">/{p1?.maxHp || 20}</span></span>
                </div>
                <div className="relative h-3 w-full bg-gray-900/80 rounded-full border border-white/10 overflow-hidden">
                  <div className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ${getHpColor(p1?.hp || 0, 20, false)}`}
                    style={{ width: `${((p1?.hp || 0) / (p1?.maxHp || 20)) * 100}%` }} />
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                </div>
                {/* Mana Pips */}
                <div className="flex gap-0.5 mt-1">
                  {Array.from({ length: p1?.maxMana || 5 }).map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-sm ${i < (p1?.mana || 0) ? 'bg-cyan-400' : 'bg-gray-800'}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CENTER: Round + Score */}
          <div className="shrink-0 flex flex-col items-center px-2">
            <div className="bg-slate-900/90 border border-slate-700/50 px-4 py-1 rounded-lg shadow-lg">
              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block text-center">Round</span>
              <span className="text-xl font-black text-white block text-center leading-none" style={{ fontFamily: "var(--font-display)" }}>
                {gameState.round}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-xs font-mono font-bold bg-black/50 px-2 py-0.5 rounded-full">
              <span className="text-emerald-400">{p1?.matchWins || 0}</span>
              <span className="text-gray-600">-</span>
              <span className="text-rose-400">{p2?.matchWins || 0}</span>
            </div>
          </div>

          {/* RIGHT: Player 2 */}
          <div className="flex-1 flex flex-col items-end gap-1 max-w-[280px]">
            <div className="flex items-center gap-2 w-full flex-row-reverse">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 shrink-0
                              ${gameState.currentTurn === p2?.id ? 'border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.5)] bg-rose-500/10' : 'border-white/20 bg-black/40'}`}>
                <span className="text-lg">👾</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5 flex-row-reverse">
                  <h2 className="font-bold text-white text-xs md:text-sm uppercase tracking-wide truncate">{p2?.name || "Opponent"}</h2>
                  <span className="font-mono font-bold text-white text-sm">{p2?.hp}<span className="text-gray-500 text-xs">/{p2?.maxHp || 20}</span></span>
                </div>
                <div className="relative h-3 w-full bg-gray-900/80 rounded-full border border-white/10 overflow-hidden">
                  <div className={`absolute top-0 bottom-0 right-0 transition-all duration-500 ${getHpColor(p2?.hp || 0, 20, true)}`}
                    style={{ width: `${((p2?.hp || 0) / (p2?.maxHp || 20)) * 100}%` }} />
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                </div>
                {/* Mana Pips */}
                <div className="flex gap-0.5 mt-1 flex-row-reverse">
                  {Array.from({ length: p2?.maxMana || 5 }).map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-sm ${i < (p2?.mana || 0) ? 'bg-purple-400' : 'bg-gray-800'}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN GAME AREA */}
      <div className="flex-1 flex flex-col items-center px-4 w-full min-h-0">

        {/* Opponent Hand - Compact */}
        <div className="flex justify-center py-1 shrink-0">
          {p2 && (
            <div className="flex items-center gap-1">
              {p2.cards.map((_, i) => (
                <div key={i} className="w-8 h-11 bg-gradient-to-br from-rose-900 to-black border border-rose-500/30 rounded shadow-sm" />
              ))}
              {p2.cards.length === 0 && <span className="text-gray-600 text-xs">Empty</span>}
            </div>
          )}
        </div>

        {/* Battle Zone */}
        <div className="flex-1 flex items-center justify-center relative min-h-0">

          {/* Revealed Cards Notification (at start of battle) */}
          {p1?.revealedCard && p2?.revealedCard && gameState.round === 1 && gameState.playedCards.filter(pc => pc.gameNumber === gameState.gameNumber).length === 0 && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50">
              <div className="bg-violet-900/90 border border-violet-500/50 text-violet-100 px-4 py-2 rounded-lg text-sm shadow-lg">
                <span className="font-bold">Revealed: </span>
                <span className="text-violet-300">{p1.name}</span> → {p1.revealedCard.name} |
                <span className="text-rose-300 ml-1">{p2.name}</span> → {p2.revealedCard.name}
              </div>
            </div>
          )}

          {/* Ability Notification */}
          {abilityTriggered && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50">
              <div className="bg-black/90 border border-amber-500/50 text-amber-100 px-4 py-2 rounded-full text-xs shadow-lg flex items-center gap-2">
                <span>⚡</span>
                <span className="font-bold text-amber-400">{abilityTriggered.cardName}</span>
              </div>
            </div>
          )}

          {/* Battle Slots with VS */}
          <div className="flex items-center justify-center gap-4 md:gap-8">

            {/* Opponent Slot */}
            <div className="flex flex-col items-center">
              {opponentLastPlayedCard ? (
                <div className="animate-slide-down">
                  <CardWithArt card={opponentLastPlayedCard} size="md" showAbility={false} />
                </div>
              ) : (
                <div className="w-32 h-44 md:w-40 md:h-56 rounded-xl border-2 border-dashed border-white/10 bg-white/5 flex items-center justify-center">
                  <span className="text-white/20 text-3xl">?</span>
                </div>
              )}
            </div>

            {/* VS Badge - Now between slots, not on round */}
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-rose-600 to-purple-700 rounded-full flex items-center justify-center shadow-lg border-2 border-white/30">
              <span className="text-[10px] md:text-xs font-black italic text-white">VS</span>
            </div>

            {/* Player Slot */}
            <div className="flex flex-col items-center">
              {myLastPlayedCard ? (
                <div className="animate-slide-up">
                  <CardWithArt card={myLastPlayedCard} size="md" showAbility={false} />
                </div>
              ) : (
                <div className="w-32 h-44 md:w-40 md:h-56 rounded-xl border-2 border-dashed border-white/20 bg-white/5 flex items-center justify-center">
                  <span className="text-sm text-gray-500 uppercase">You</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Player Hand - Compact */}
        {!isSpectator && p1 && (
          <div className="shrink-0 pb-1">
            <Hand
              cards={p1.cards}
              onPlayCard={onPlayCard}
              isCurrentTurn={isMyTurn}
              disabled={gameState.phase !== "battle"}
              player={p1}
              gameState={gameState}
            />
            {/* Skip Turn Button - shows when it's player's turn and they can't afford any card */}
            {isMyTurn && gameState.phase === "battle" && p1.cards.length > 0 && (
              <div className="flex justify-center mt-2">
                <button
                  onClick={onSkipTurn}
                  className="px-4 py-2 bg-gray-700/80 hover:bg-gray-600 border border-gray-500/50 
                             text-gray-200 text-sm font-medium rounded-lg transition-all
                             hover:border-gray-400/50 active:scale-95"
                >
                  ⏭️ Skip Turn
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
