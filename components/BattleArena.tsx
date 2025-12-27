"use client";

import { GameState, Card as CardType } from "@/lib/types";
import { HealthBar } from "./HealthBar";
import { Hand } from "./Hand";
import { CardMini } from "./Card";
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
  const players = Object.values(gameState.players);

  const isMyTurn = gameState.currentTurn === currentPlayerId && !isSpectator;

  // Get last played cards for display in the battle zone (current game only)
  const myLastPlayedCard = gameState.playedCards
    .filter((pc) => pc.playerId === currentPlayerId && pc.gameNumber === gameState.gameNumber)
    .sort((a, b) => b.round - a.round)[0]?.card;

  const opponentLastPlayedCard = opponent
    ? gameState.playedCards
      .filter((pc) => pc.playerId === opponent.id && pc.gameNumber === gameState.gameNumber)
      .sort((a, b) => b.round - a.round)[0]?.card
    : null;

  return (
    <div className="h-full w-full overflow-hidden arena-bg flex flex-col p-4 md:p-8">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col max-w-6xl mx-auto w-full min-h-0">
        {/* Header with match info */}
        <div className="text-center mb-4">
          {/* Match Score */}
          <div className="flex items-center justify-center gap-4 mb-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
              <span className="text-sm text-gray-400">Game {gameState.gameNumber}</span>
              <span className="text-white font-bold">
                {players[0]?.matchWins || 0} - {players[1]?.matchWins || 0}
              </span>
              <span className="text-sm text-gray-400">Best of 3</span>
            </div>

            {spectatorCount > 0 && (
              <div className="flex items-center gap-1 px-3 py-1 bg-violet-500/10 rounded-lg border border-violet-500/20 text-violet-400 text-sm">
                👁️ {spectatorCount}
              </div>
            )}

            {isSpectator && (
              <div className="px-3 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-400 text-sm">
                Spectating
              </div>
            )}
          </div>

          <h1
            className="text-2xl md:text-3xl font-bold text-white mb-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Round {gameState.round}
          </h1>
          {gameState.roundModifier && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-full border border-violet-400/40 mb-2">
              <span className="text-violet-300 text-sm font-semibold">
                {gameState.roundModifier}
              </span>
            </div>
          )}
          <p className="text-gray-400">{gameState.message}</p>
        </div>

        {/* Ability Triggered Notification */}
        {abilityTriggered && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 
                          bg-violet-900/95 border border-violet-500/50 rounded-2xl p-6 
                          shadow-2xl shadow-violet-500/30 animate-slide-up">
            <div className="text-center">
              <span className="text-3xl mb-2 block">✨</span>
              <h3 className="text-xl font-bold text-violet-300 mb-2">
                {abilityTriggered.cardName}
              </h3>
              <p className="text-amber-400">{abilityTriggered.abilityText}</p>
            </div>
          </div>
        )}

        {/* Opponent Area */}
        {/* Opponent Area - CENTERED */}
        <div className="mb-2 flex flex-col items-center">
          {opponent && (
            <div className="w-full max-w-4xl flex flex-col items-center">
              {/* Opponent Hand (Top) */}
              <div className="mb-2">
                <div className="bg-white/5 rounded-xl px-4 py-2 border border-white/10 inline-flex items-center gap-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Opponent</span>
                  <div className="flex gap-1">
                    {opponent.cards.map((_, i) => (
                      <div
                        key={i}
                        className="w-6 h-8 bg-gradient-to-br from-rose-600 to-red-800 rounded shadow-sm border border-white/10"
                      />
                    ))}
                    {opponent.cards.length === 0 && (
                      <span className="text-gray-500 text-xs">Empty Hand</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Opponent Stats (Health + Mana) */}
              <div className="flex items-center justify-center gap-4 w-full md:w-2/3 lg:w-1/2">
                <div className="flex-1">
                  <HealthBar
                    hp={opponent.hp}
                    playerName={opponent.name}
                    isCurrentTurn={gameState.currentTurn === opponent.id}
                    isOpponent={true}
                    lastDamage={lastCardPlayed?.playerId === currentPlayerId ? lastCardPlayed.damage : null}
                  />
                </div>
                <ManaDisplay
                  current={opponent.mana ?? 3}
                  max={opponent.maxMana ?? 5}
                  size="sm"
                />
              </div>

              {/* Opponent Status Effects & Info */}
              <div className="mt-1 flex gap-2 text-xs text-gray-400">
                <span>Theme: <span className="text-amber-400">{opponent.theme}</span></span>
                {opponent.statusEffects && opponent.statusEffects.length > 0 && (
                  <div className="flex gap-1 ml-2">
                    {opponent.statusEffects.map((effect, i) => (
                      <span key={i} className="px-1 bg-purple-500/20 text-purple-200 rounded border border-purple-400/30">
                        {effect.type[0].toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Battle Zone - CENTERED */}
        <div className="flex-1 flex items-center justify-center my-2 min-h-0 relative">

          {/* Battle Log - Floating Left or Integrated */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-48 hidden md:block">
            <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3 border border-white/5 max-h-40 overflow-y-auto">
              <p className="text-[10px] text-gray-500 uppercase mb-1 font-bold">Battle Log</p>
              <div className="space-y-1">
                {gameState.playedCards
                  .filter(pc => pc.gameNumber === gameState.gameNumber)
                  .slice(-3)
                  .reverse()
                  .map((pc, i) => (
                    <div key={i} className="text-xs flex items-center gap-1">
                      <span className={pc.playerId === currentPlayerId ? "text-violet-400" : "text-rose-400"}>
                        {gameState.players[pc.playerId]?.name}
                      </span>
                      <span className="text-gray-600 border border-gray-700 px-1 rounded text-[10px]">{pc.card.name}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="relative w-full max-w-xl">
            {/* Battle zone background */}
            <div className="absolute inset-x-0 top-10 bottom-10 bg-gradient-to-b from-violet-500/5 to-cyan-500/5 rounded-full blur-3xl" />

            <div className="relative grid grid-cols-2 gap-12 md:gap-20 p-4 justify-items-center items-center">
              {/* Opponent's Card Slot */}
              <div className="flex flex-col items-center transition-all duration-500">
                {opponentLastPlayedCard ? (
                  <div className={`${lastCardPlayed?.playerId !== currentPlayerId ? "animate-slide-up" : ""} scale-90 md:scale-100`}>
                    <CardWithArt card={opponentLastPlayedCard} size="md" />
                  </div>
                ) : (
                  <div className="w-32 h-44 md:w-40 md:h-56 rounded-xl border-2 border-dashed border-white/10 
                                  flex items-center justify-center text-gray-600 bg-white/5">
                    <span className="text-xs">Waiting...</span>
                  </div>
                )}
              </div>

              {/* Player's Card Slot */}
              <div className="flex flex-col items-center transition-all duration-500">
                {myLastPlayedCard ? (
                  <div className={`${lastCardPlayed?.playerId === currentPlayerId ? "animate-slide-up" : ""} scale-90 md:scale-100`}>
                    <CardWithArt card={myLastPlayedCard} size="md" />
                  </div>
                ) : (
                  <div className="w-32 h-44 md:w-40 md:h-56 rounded-xl border-2 border-dashed border-white/20 
                                  flex items-center justify-center text-gray-400 bg-white/5 hover:border-violet-500/50 transition-colors">
                    <span className="text-xs">{isSpectator ? "Waiting..." : "Your Slot"}</span>
                  </div>
                )}
              </div>
            </div>

            {/* VS indicator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-violet-600 to-fuchsia-600 
                              rounded-full flex items-center justify-center shadow-lg shadow-violet-500/40 ring-4 ring-black/50">
                <span className="font-bold text-white text-sm md:text-lg italic" style={{ fontFamily: "var(--font-display)" }}>
                  VS
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Player Area - BOTTOM */}
        {!isSpectator && (
          <div className="mt-auto w-full max-w-4xl mx-auto">
            {/* Player Stats (Health + Mana) */}
            <div className="flex items-end justify-center gap-4 mb-2 px-4 w-full md:w-2/3 lg:w-1/2 mx-auto">
              <div className="flex-1">
                {currentPlayer && (
                  <HealthBar
                    hp={currentPlayer.hp}
                    playerName={currentPlayer.name}
                    isCurrentTurn={isMyTurn}
                    lastDamage={lastCardPlayed?.playerId !== currentPlayerId ? lastCardPlayed?.damage : null}
                  />
                )}
              </div>
              {currentPlayer && (
                <ManaDisplay
                  current={currentPlayer.mana ?? 3}
                  max={currentPlayer.maxMana ?? 5}
                  size="md"
                />
              )}
            </div>

            {/* Player's Hand */}
            <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-4 pb-2 px-4 -mx-4 md:mx-0 md:rounded-t-3xl">
              {currentPlayer && (
                <Hand
                  cards={currentPlayer.cards}
                  onPlayCard={onPlayCard}
                  isCurrentTurn={isMyTurn}
                  disabled={gameState.phase !== "battle"}
                  player={currentPlayer}
                  gameState={gameState}
                />
              )}
            </div>
          </div>
        )}

        {/* Spectator view - show both hands */}
        {isSpectator && (
          <div className="mt-auto text-center py-4">
            <p className="text-gray-500">
              You are spectating this match. Cards are hidden to prevent unfair advantages.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
