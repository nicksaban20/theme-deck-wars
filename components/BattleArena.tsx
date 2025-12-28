"use client";

import { GameState, Card as CardType } from "@/lib/types";
import { Hand } from "./Hand";
import { CardWithArt } from "./CardWithArt";
import { ManaDisplay } from "./ManaDisplay";

interface BattleArenaProps {
  gameState: GameState;
  currentPlayerId: string;
  onPlayCard: (cardId: string) => void;
  lastCardPlayed: { playerId: string; card: CardType; damage: number } | null;
  abilityTriggered: { cardName: string; abilityText: string } | null;
  spectatorCount: number;
  isSpectator?: boolean;
}

export function BattleArena({
  gameState,
  currentPlayerId,
  onPlayCard,
  lastCardPlayed,
  abilityTriggered,
  spectatorCount,
  isSpectator = false,
}: BattleArenaProps) {
  const currentPlayer = gameState.players[currentPlayerId];
  const opponent = Object.values(gameState.players).find(
    (p) => p.id !== currentPlayerId
  );

  // For spectators, just pick first/second player
  const p1 = isSpectator ? Object.values(gameState.players)[0] : currentPlayer;
  const p2 = isSpectator ? Object.values(gameState.players)[1] : opponent;

  const isMyTurn = gameState.currentTurn === currentPlayerId && !isSpectator;

  // Get last played cards for display in the battle zone (current game only)
  const myLastPlayedCard = gameState.playedCards
    .filter((pc) => pc.playerId === (isSpectator ? p1?.id : currentPlayerId) && pc.gameNumber === gameState.gameNumber)
    .sort((a, b) => b.round - a.round)[0]?.card;

  const opponentLastPlayedCard = gameState.playedCards
    .filter((pc) => pc.playerId === (isSpectator ? p2?.id : opponent?.id) && pc.gameNumber === gameState.gameNumber)
    .sort((a, b) => b.round - a.round)[0]?.card;

  // Function to calculate bar color
  const getHpColor = (hp: number, max: number, isOpponent: boolean) => {
    const pct = (hp / max) * 100;
    if (pct <= 20) return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]";
    if (isOpponent) return "bg-rose-500";
    return "bg-emerald-400";
  };

  return (
    <div className="h-full w-full overflow-hidden arena-bg flex flex-col relative">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-900/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-900/10 blur-[100px]" />
      </div>

      {/* ------------------------------------------------------------------
          TOP HUD (Fighting Game Style)
          Absolute positioned at top to overlay everything cleanly
         ------------------------------------------------------------------ */}
      <div className="absolute top-0 inset-x-0 z-30 p-2 md:p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">

          {/* LEFT: Player Stats (P1) */}
          <div className="flex-1 flex flex-col items-start gap-1">
            <div className="flex items-center gap-3 w-full max-w-sm">
              {/* Avatar / Icon */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 
                              ${isMyTurn ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]' : 'border-white/20 bg-black/40'}`}>
                <span className="text-xl">🧙‍♂️</span>
              </div>

              {/* Health Bar Container */}
              <div className="flex-1">
                <div className="flex justify-between items-end mb-1">
                  <h2 className="font-bold text-white tracking-widest text-shadow-sm uppercase text-sm md:text-base">
                    {p1?.name || "Player 1"}
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-blue-300 font-bold uppercase tracking-wider">Mana</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: p1?.maxMana || 5 }).map((_, i) => (
                          <div key={i} className={`w-2 h-3 rounded-sm ${i < (p1?.mana || 0) ? 'bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)]' : 'bg-gray-800'}`} />
                        ))}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-white text-lg">{p1?.hp}<span className="text-gray-500 text-xs">/{p1?.maxHp || 20}</span></span>
                  </div>
                </div>
                {/* The Bar */}
                <div className="relative h-4 w-full bg-gray-900/80 rounded skew-x-[-10deg] border border-white/10 overflow-hidden">
                  <div
                    className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ${getHpColor(p1?.hp || 0, 20, false)}`}
                    style={{ width: `${((p1?.hp || 0) / (p1?.maxHp || 20)) * 100}%` }}
                  />
                  {/* Shine */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                </div>
              </div>
            </div>

            {/* Status Effects Row */}
            {p1?.statusEffects && p1.statusEffects.length > 0 && (
              <div className="flex gap-1 ml-14">
                {p1.statusEffects.map((e, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 bg-violet-900/60 border border-violet-500/30 rounded text-violet-200">
                    {e.type}
                  </span>
                ))}
              </div>
            )}
          </div>


          {/* CENTER: Round Timer / Info */}
          <div className="shrink-0 flex flex-col items-center mx-2">
            <div className="relative">
              {/* Round Badge */}
              <div className="bg-slate-900/90 border-2 border-slate-700/50 px-4 py-1 rounded-lg transform skew-x-[-10deg] shadow-lg">
                <span className="block text-xs text-gray-400 font-bold uppercase text-center transform skew-x-[10deg] tracking-widest">Round</span>
                <span className="block text-2xl font-black text-white text-center transform skew-x-[10deg] leading-none" style={{ fontFamily: "var(--font-display)" }}>
                  {gameState.round}
                </span>
              </div>
              {/* VS Badge */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-rose-600 w-8 h-8 flex items-center justify-center rounded-full border-2 border-white shadow-lg z-10">
                <span className="text-[10px] font-black italic text-white">VS</span>
              </div>
            </div>

            {/* Match Score */}
            <div className="mt-5 flex gap-2 text-xs font-mono font-bold text-gray-400 bg-black/40 px-2 py-0.5 rounded-full">
              <span className="text-emerald-400">{p1?.matchWins || 0}</span>
              <span>-</span>
              <span className="text-rose-400">{p2?.matchWins || 0}</span>
            </div>
          </div>


          {/* RIGHT: Opponent Stats (P2) */}
          <div className="flex-1 flex flex-col items-end gap-1">
            <div className="flex items-center gap-3 w-full max-w-sm flex-row-reverse">
              {/* Avatar / Icon */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 
                                ${gameState.currentTurn === p2?.id ? 'border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.5)]' : 'border-white/20 bg-black/40'}`}>
                <span className="text-xl">👾</span>
              </div>

              {/* Health Bar Container */}
              <div className="flex-1">
                <div className="flex justify-between items-end mb-1 flex-row-reverse">
                  <h2 className="font-bold text-white tracking-widest text-shadow-sm uppercase text-sm md:text-base">
                    {p2?.name || "Opponent"}
                  </h2>
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <div className="flex items-center gap-1 flex-row-reverse">
                      <span className="text-xs text-purple-300 font-bold uppercase tracking-wider">Mana</span>
                      <div className="flex gap-0.5 flex-row-reverse">
                        {Array.from({ length: p2?.maxMana || 5 }).map((_, i) => (
                          <div key={i} className={`w-2 h-3 rounded-sm ${i < (p2?.mana || 0) ? 'bg-purple-400 shadow-[0_0_5px_rgba(168,85,247,0.8)]' : 'bg-gray-800'}`} />
                        ))}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-white text-lg">{p2?.hp}<span className="text-gray-500 text-xs">/{p2?.maxHp || 20}</span></span>
                  </div>
                </div>
                {/* The Bar - Reversed Fill */}
                <div className="relative h-4 w-full bg-gray-900/80 rounded skew-x-[10deg] border border-white/10 overflow-hidden">
                  <div
                    className={`absolute top-0 bottom-0 right-0 transition-all duration-500 ${getHpColor(p2?.hp || 0, 20, true)}`}
                    style={{ width: `${((p2?.hp || 0) / (p2?.maxHp || 20)) * 100}%` }}
                  />
                  {/* Shine */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                </div>
              </div>
            </div>

            {/* Status Effects Row */}
            {p2?.statusEffects && p2.statusEffects.length > 0 && (
              <div className="flex gap-1 mr-14 flex-row-reverse">
                {p2.statusEffects.map((e, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 bg-rose-900/60 border border-rose-500/30 rounded text-rose-200">
                    {e.type}
                  </span>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ------------------------------------------------------------------
          MAIN GAME AREA
          Flex column to distribute space
         ------------------------------------------------------------------ */}
      <div className="flex-1 flex flex-col pt-24 pb-4 px-4 w-full max-w-7xl mx-auto min-h-0">

        {/* TOP SECTION: Opponent Hand */}
        <div className="flex justify-center mb-4 transition-all duration-500 min-h-[60px]">
          {p2 && (
            <div className="flex items-center gap-2">
              {/* Compact Hand Backs */}
              {p2.cards.map((_, i) => (
                <div key={i} className="w-10 h-14 md:w-12 md:h-16 bg-gradient-to-br from-rose-900 to-black border border-rose-500/30 rounded shadow-md transform hover:-translate-y-2 transition-transform duration-300" />
              ))}
              {p2.cards.length === 0 && <span className="text-gray-600 text-xs uppercase tracking-widest">Empty Hand</span>}
            </div>
          )}
        </div>


        {/* CENTER SECTION: Battle Zone */}
        <div className="flex-1 flex items-center justify-center relative my-2">

          {/* Ability Trigger Notification (Floating) */}
          {abilityTriggered && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
              <div className="bg-black/90 border border-amber-500/50 text-amber-100 px-6 py-3 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <div className="font-bold text-sm uppercase tracking-wider text-amber-500">{abilityTriggered.cardName}</div>
                  <div className="text-xs">{abilityTriggered.abilityText}</div>
                </div>
              </div>
            </div>
          )}

          {/* Battle Slots */}
          <div className="grid grid-cols-2 gap-16 md:gap-32 w-full max-w-3xl items-center justify-items-center">

            {/* OPPONENT SLOT */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                {opponentLastPlayedCard ? (
                  <div className="animate-slide-down transform scale-110 shadow-2xl shadow-rose-900/50 rounded-xl">
                    <CardWithArt card={opponentLastPlayedCard} size="md" />
                  </div>
                ) : (
                  <div className="w-[180px] h-[250px] rounded-xl border-2 border-dashed border-white/5 bg-white/5 flex items-center justify-center">
                    <span className="text-white/10 text-4xl font-black opacity-50">?</span>
                  </div>
                )}

                {/* Damage Number Popups would go here */}
              </div>
            </div>

            {/* PLAYER SLOT */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                {myLastPlayedCard ? (
                  <div className="animate-slide-up transform scale-110 shadow-2xl shadow-cyan-900/50 rounded-xl">
                    <CardWithArt card={myLastPlayedCard} size="md" />
                  </div>
                ) : (
                  <div className="w-[180px] h-[250px] rounded-xl border-2 border-dashed border-white/10 bg-white/5 flex items-center justify-center group-hover:border-cyan-500/30 transition-colors">
                    <span className="text-xs text-gray-500 uppercase tracking-widest">Your Card</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>


        {/* BOTTOM SECTION: Player Hand */}
        {!isSpectator && p1 && (
          <div className="mt-auto pt-2">
            <div className="relative z-20">
              <Hand
                cards={p1.cards}
                onPlayCard={onPlayCard}
                isCurrentTurn={isMyTurn}
                disabled={gameState.phase !== "battle"}
                player={p1}
                gameState={gameState}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
