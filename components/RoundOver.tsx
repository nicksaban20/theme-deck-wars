"use client";

import { useEffect, useState, useRef } from "react";
import { GameState } from "@/lib/types";

interface RoundOverProps {
  gameState: GameState;
  currentPlayerId: string;
  roundEnded: { winner: string | null; gameNumber: number } | null;
  onContinue: () => void;
}

export function RoundOver({ gameState, currentPlayerId, roundEnded, onContinue }: RoundOverProps) {
  const [countdown, setCountdown] = useState(5);
  const hasContinuedRef = useRef(false);

  const roundWinner = roundEnded?.winner ? gameState.players[roundEnded.winner] : null;
  const isWinner = roundEnded?.winner === currentPlayerId;
  const isTie = roundEnded?.winner === null;
  const players = Object.values(gameState.players);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Trigger continue when countdown reaches 0 (any player can trigger this)
  useEffect(() => {
    if (countdown === 0 && !hasContinuedRef.current) {
      hasContinuedRef.current = true;
      console.log('[RoundOver] Countdown reached 0, calling onContinue');
      onContinue();
    }
  }, [countdown, onContinue]);

  return (
    <div className="h-full arena-bg flex flex-col items-center justify-center p-8">
      {/* Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {isWinner && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
        )}
        {!isWinner && !isTie && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-3xl" />
        )}
      </div>

      <div className="relative z-10 text-center max-w-lg">
        {/* Game number */}
        <div className="mb-4 text-lg text-gray-400">
          Game {roundEnded?.gameNumber || gameState.gameNumber - 1} Complete
        </div>

        {/* Result */}
        <div className="mb-8">
          {isTie ? (
            <>
              <div className="text-5xl mb-4">🤝</div>
              <h1
                className="text-4xl font-bold mb-2 text-gray-300"
                style={{ fontFamily: "var(--font-display)" }}
              >
                It&apos;s a Tie!
              </h1>
            </>
          ) : isWinner ? (
            <>
              <div className="text-5xl mb-4">🎉</div>
              <h1
                className="text-4xl font-bold mb-2 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent"
                style={{ fontFamily: "var(--font-display)" }}
              >
                You Win This Round!
              </h1>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">😤</div>
              <h1
                className="text-4xl font-bold mb-2 text-gray-400"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {roundWinner?.name} Wins This Round
              </h1>
            </>
          )}
        </div>

        {/* Current Score */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-400 mb-4">Match Score</h2>
          <div className="flex items-center justify-center gap-8">
            {players.map((player) => (
              <div key={player.id} className="text-center">
                <p className={`font-semibold ${player.id === currentPlayerId ? "text-violet-400" : "text-rose-400"
                  }`}>
                  {player.name}
                </p>
                <p className="text-5xl font-bold text-white">{player.matchWins}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-gray-500">First to 2 wins the match!</p>
        </div>

        {/* Next game countdown */}
        <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
          {countdown > 0 ? (
            <>
              <p className="text-gray-300 mb-2">Next game starting in...</p>
              <div className="text-6xl font-bold text-violet-400">
                {countdown}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                New cards will be generated!
              </p>
            </>
          ) : (
            <>
              <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-gray-300">Starting next game...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
