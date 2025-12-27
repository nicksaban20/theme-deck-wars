"use client";

import { GameState, Card as CardType } from "@/lib/types";
import { HealthBar } from "./HealthBar";
import { Hand } from "./Hand";
import { CardMini } from "./Card";
import { CardWithArt } from "./CardWithArt";

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
    <div className="min-h-screen arena-bg flex flex-col p-4 md:p-8">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col max-w-6xl mx-auto w-full">
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
        <div className="mb-6">
          {opponent && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              {/* Opponent HP */}
              <div className="md:col-span-1">
                <HealthBar
                  hp={opponent.hp}
                  playerName={opponent.name}
                  isCurrentTurn={gameState.currentTurn === opponent.id}
                  isOpponent={true}
                  lastDamage={lastCardPlayed?.playerId === currentPlayerId ? lastCardPlayed.damage : null}
                />
                <div className="mt-2 text-center text-sm text-gray-400">
                  Theme: <span className="text-amber-400">&quot;{opponent.theme}&quot;</span>
                  <span className="ml-2 text-violet-400">({opponent.matchWins} wins)</span>
                </div>
              </div>

              {/* Opponent cards remaining */}
              <div className="md:col-span-2 flex justify-center">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-sm text-gray-400 text-center mb-2">
                    Opponent&apos;s Hand
                  </p>
                  <div className="flex gap-2 justify-center">
                    {opponent.cards.map((_, i) => (
                      <div
                        key={i}
                        className="w-8 h-12 bg-gradient-to-br from-rose-600 to-red-800 rounded-lg 
                                   shadow-lg card-pattern-lines"
                      />
                    ))}
                    {opponent.cards.length === 0 && (
                      <span className="text-gray-500">No cards left</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Battle Zone */}
        <div className="flex-1 flex items-center justify-center my-4">
          <div className="relative w-full max-w-2xl">
            {/* Battle zone background */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/5 to-transparent rounded-3xl" />
            
            <div className="relative grid grid-cols-2 gap-8 p-8">
              {/* Opponent's last played card */}
              <div className="flex flex-col items-center">
                <span className="text-sm text-gray-400 mb-2">
                  {opponent?.name}&apos;s Card
                </span>
                {opponentLastPlayedCard ? (
                  <div className={lastCardPlayed?.playerId !== currentPlayerId ? "animate-slide-up" : ""}>
                    <CardWithArt card={opponentLastPlayedCard} size="md" />
                  </div>
                ) : (
                  <div className="w-44 h-60 rounded-xl border-2 border-dashed border-white/20 
                                  flex items-center justify-center text-gray-500">
                    Waiting...
                  </div>
                )}
              </div>

              {/* Your/Player 1's last played card */}
              <div className="flex flex-col items-center">
                <span className="text-sm text-gray-400 mb-2">
                  {isSpectator ? `${currentPlayer?.name}'s Card` : "Your Card"}
                </span>
                {myLastPlayedCard ? (
                  <div className={lastCardPlayed?.playerId === currentPlayerId ? "animate-slide-up" : ""}>
                    <CardWithArt card={myLastPlayedCard} size="md" />
                  </div>
                ) : (
                  <div className="w-44 h-60 rounded-xl border-2 border-dashed border-white/20 
                                  flex items-center justify-center text-gray-500">
                    {isSpectator ? "Waiting..." : "Play a card!"}
                  </div>
                )}
              </div>
            </div>

            {/* VS indicator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                            w-16 h-16 bg-gradient-to-br from-violet-600 to-fuchsia-600 
                            rounded-full flex items-center justify-center shadow-xl shadow-violet-500/30">
              <span className="font-bold text-white text-lg" style={{ fontFamily: "var(--font-display)" }}>
                VS
              </span>
            </div>
          </div>
        </div>

        {/* Battle Log */}
        <div className="mb-4">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10 max-h-24 overflow-y-auto">
            <p className="text-sm text-gray-400 mb-1">Battle Log</p>
            <div className="space-y-1">
              {gameState.playedCards
                .filter(pc => pc.gameNumber === gameState.gameNumber)
                .slice(-4)
                .reverse()
                .map((pc, i) => {
                  const player = gameState.players[pc.playerId];
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className={pc.playerId === currentPlayerId ? "text-violet-400" : "text-rose-400"}>
                        {player?.name}
                      </span>
                      <span className="text-gray-500">played</span>
                      <CardMini card={pc.card} />
                    </div>
                  );
                })}
              {gameState.playedCards.filter(pc => pc.gameNumber === gameState.gameNumber).length === 0 && (
                <span className="text-gray-500 text-sm">No cards played yet</span>
              )}
            </div>
          </div>
        </div>

        {/* Player Area */}
        {!isSpectator && (
          <div className="mt-auto">
            {/* Player HP */}
            <div className="mb-4 max-w-md mx-auto">
              {currentPlayer && (
                <>
                  <HealthBar
                    hp={currentPlayer.hp}
                    playerName={currentPlayer.name}
                    isCurrentTurn={isMyTurn}
                    lastDamage={lastCardPlayed?.playerId !== currentPlayerId ? lastCardPlayed?.damage : null}
                  />
                  <div className="mt-2 text-center text-sm text-gray-400">
                    Theme: <span className="text-amber-400">&quot;{currentPlayer.theme}&quot;</span>
                    <span className="ml-2 text-violet-400">({currentPlayer.matchWins} wins)</span>
                  </div>
                </>
              )}
            </div>

            {/* Player's Hand */}
            <div className="bg-gradient-to-t from-black/30 to-transparent rounded-t-3xl pt-6 pb-4 px-4">
              {currentPlayer && (
                <Hand
                  cards={currentPlayer.cards}
                  onPlayCard={onPlayCard}
                  isCurrentTurn={isMyTurn}
                  disabled={gameState.phase !== "battle"}
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
