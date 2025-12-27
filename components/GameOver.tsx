"use client";

import { useRouter } from "next/navigation";
import { GameState, Player } from "@/lib/types";
import { CardWithArt } from "./CardWithArt";

interface GameOverProps {
  gameState: GameState;
  currentPlayerId: string;
  spectatorCount: number;
  rematchRequested: { byPlayerId: string; swapThemes: boolean } | null;
  onRequestRematch: () => void;
  onRequestSwapRematch: () => void;
  onAcceptRematch: () => void;
}

export function GameOver({ 
  gameState, 
  currentPlayerId,
  spectatorCount,
  rematchRequested,
  onRequestRematch,
  onRequestSwapRematch,
  onAcceptRematch,
}: GameOverProps) {
  const router = useRouter();
  
  const matchWinner = gameState.matchWinner ? gameState.players[gameState.matchWinner] : null;
  const isWinner = gameState.matchWinner === currentPlayerId;
  const isTie = gameState.matchWinner === null && gameState.phase === "match-ended";
  const isSpectator = !gameState.players[currentPlayerId];

  const currentPlayer = gameState.players[currentPlayerId];
  const opponent = Object.values(gameState.players).find(p => p.id !== currentPlayerId);
  const players = Object.values(gameState.players);

  // Check if opponent requested rematch
  const opponentRequestedRematch = rematchRequested && rematchRequested.byPlayerId !== currentPlayerId;
  const iRequestedRematch = rematchRequested && rematchRequested.byPlayerId === currentPlayerId;

  // Get all played cards for the summary
  const myPlayedCards = gameState.playedCards
    .filter(pc => pc.playerId === currentPlayerId)
    .map(pc => pc.card);
  const opponentPlayedCards = gameState.playedCards
    .filter(pc => pc.playerId !== currentPlayerId)
    .map(pc => pc.card);

  return (
    <div className="h-full arena-bg flex flex-col items-center justify-center p-4 md:p-8">
      {/* Victory/Defeat effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {isWinner && !isSpectator && (
          <>
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/30 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-violet-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "0.3s" }} />
            <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-emerald-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "0.6s" }} />
          </>
        )}
        {!isWinner && !isTie && !isSpectator && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-3xl" />
        )}
      </div>

      <div className="relative z-10 text-center max-w-4xl w-full">
        {/* Spectator badge */}
        {isSpectator && (
          <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-violet-500/20 border border-violet-500/40 rounded-full text-violet-400 text-sm">
            👁️ Spectating
          </div>
        )}

        {/* Spectator count */}
        {spectatorCount > 0 && (
          <div className="mb-4 text-sm text-gray-500">
            👁️ {spectatorCount} spectator{spectatorCount !== 1 ? "s" : ""} watching
          </div>
        )}

        {/* Result announcement */}
        <div className="mb-8">
          {isSpectator ? (
            <>
              <div className="text-6xl mb-4">🏆</div>
              <h1 
                className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-400 bg-clip-text text-transparent"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Match Complete!
              </h1>
              {matchWinner && (
                <p className="text-xl text-gray-300">
                  <span className="text-amber-400">{matchWinner.name}</span> wins the match!
                </p>
              )}
            </>
          ) : isWinner ? (
            <>
              <div className="text-6xl mb-4">🏆</div>
              <h1 
                className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Victory!
              </h1>
              <p className="text-xl text-gray-300">
                Your <span className="text-amber-400">&quot;{currentPlayer?.theme}&quot;</span> deck triumphs!
              </p>
            </>
          ) : isTie ? (
            <>
              <div className="text-6xl mb-4">🤝</div>
              <h1 
                className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-gray-400 via-gray-300 to-gray-400 bg-clip-text text-transparent"
                style={{ fontFamily: "var(--font-display)" }}
              >
                It&apos;s a Tie!
              </h1>
              <p className="text-xl text-gray-300">
                Both decks proved equally matched!
              </p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">💀</div>
              <h1 
                className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-gray-500 via-gray-400 to-gray-500 bg-clip-text text-transparent"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Defeat
              </h1>
              <p className="text-xl text-gray-300">
                <span className="text-rose-400">&quot;{opponent?.theme}&quot;</span> proved too strong!
              </p>
            </>
          )}
        </div>

        {/* Match Score */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-400 mb-4">Match Score</h2>
          <div className="flex items-center justify-center gap-8">
            {players.map((player, index) => (
              <div key={player.id} className="text-center">
                <p className={`font-semibold ${player.id === gameState.matchWinner ? "text-amber-400" : "text-white"}`}>
                  {player.name}
                </p>
                <p className="text-4xl font-bold text-white">{player.matchWins}</p>
                {index === 0 && players.length === 2 && (
                  <span className="absolute left-1/2 -translate-x-1/2 text-2xl text-gray-500">-</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Game History */}
        {gameState.gameHistory.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-400 mb-3">Game History</h2>
            <div className="flex gap-4 justify-center">
              {gameState.gameHistory.map((game, index) => {
                const winnerPlayer = game.winner ? gameState.players[game.winner] : null;
                return (
                  <div 
                    key={index}
                    className={`px-4 py-3 rounded-xl border ${
                      game.winner === currentPlayerId 
                        ? "bg-emerald-500/10 border-emerald-500/30" 
                        : game.winner === null 
                          ? "bg-gray-500/10 border-gray-500/30"
                          : "bg-rose-500/10 border-rose-500/30"
                    }`}
                  >
                    <p className="text-sm text-gray-400">Game {game.gameNumber}</p>
                    <p className="font-semibold text-white">
                      {winnerPlayer?.name || "Tie"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {game.player1HP} - {game.player2HP} HP
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cards played summary */}
        {!isSpectator && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-400 mb-4">Cards Played</h3>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm text-gray-400 mb-3">Your Cards</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {myPlayedCards.slice(-5).map((card, i) => (
                    <CardWithArt key={i} card={card} size="sm" />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-3">Opponent&apos;s Cards</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {opponentPlayedCards.slice(-5).map((card, i) => (
                    <CardWithArt key={i} card={card} size="sm" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rematch Options */}
        {!isSpectator && (
          <div className="space-y-4">
            {/* Opponent requested rematch */}
            {opponentRequestedRematch && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-4">
                <p className="text-amber-400 font-semibold mb-3">
                  {opponent?.name} wants a {rematchRequested.swapThemes ? "swap themes " : ""}rematch!
                </p>
                <button
                  onClick={onAcceptRematch}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 
                             rounded-xl font-semibold text-white
                             hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-300
                             hover:scale-105 active:scale-95"
                >
                  Accept Rematch ✓
                </button>
              </div>
            )}

            {/* I requested rematch - waiting */}
            {iRequestedRematch && (
              <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
                <p className="text-violet-400">
                  Waiting for {opponent?.name} to accept your {rematchRequested.swapThemes ? "swap " : ""}rematch...
                </p>
              </div>
            )}

            {/* Action buttons */}
            {!rematchRequested && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={onRequestRematch}
                  className="px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 
                             rounded-xl font-semibold text-lg text-white
                             hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-300
                             hover:scale-105 active:scale-95"
                >
                  Rematch 🔄
                </button>
                
                <button
                  onClick={onRequestSwapRematch}
                  className="px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 
                             rounded-xl font-semibold text-lg text-white
                             hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-300
                             hover:scale-105 active:scale-95"
                >
                  Swap Themes & Rematch 🔀
                </button>
              </div>
            )}

            <button
              onClick={() => router.push("/")}
              className="px-8 py-4 bg-white/5 border border-white/20 rounded-xl 
                         font-semibold text-lg text-white
                         hover:bg-white/10 transition-all duration-300
                         hover:scale-105 active:scale-95"
            >
              New Game 🏠
            </button>
          </div>
        )}

        {/* Spectator actions */}
        {isSpectator && (
          <button
            onClick={() => router.push("/")}
            className="px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 
                       rounded-xl font-semibold text-lg text-white
                       hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-300
                       hover:scale-105 active:scale-95"
          >
            Play Your Own Game 🎮
          </button>
        )}
      </div>
    </div>
  );
}
