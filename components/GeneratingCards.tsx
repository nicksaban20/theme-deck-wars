"use client";

import { useEffect, useState } from "react";

interface GeneratingCardsProps {
  themes: { player1: string; player2: string };
}

export function GeneratingCards({ themes }: GeneratingCardsProps) {
  const [dots, setDots] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // Track elapsed time for user feedback
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full arena-bg flex flex-col items-center justify-center p-8">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "0.5s" }} />
      </div>

      <div className="relative z-10 text-center max-w-lg">
        {/* Spinning cards animation */}
        <div className="relative w-48 h-48 mx-auto mb-8">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 w-16 h-24 -mt-12 -ml-8 
                         bg-gradient-to-br from-violet-500 to-fuchsia-600 
                         rounded-lg shadow-xl shadow-violet-500/30
                         card-pattern-dots"
              style={{
                animation: `spin ${3 + i * 0.2}s linear infinite`,
                animationDelay: `${i * 0.15}s`,
                transformOrigin: "50% 150%",
              }}
            />
          ))}
        </div>

        <h2
          className="text-3xl font-bold text-white mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Generating Cards{dots}
        </h2>

        <p className="text-gray-400 mb-8">
          The AI is crafting your unique battle decks!
        </p>

        {/* Theme previews */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
            <p className="text-sm text-gray-400 mb-1">Player 1</p>
            <p className="text-amber-400 font-semibold">&quot;{themes.player1}&quot;</p>
          </div>
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl">
            <p className="text-sm text-gray-400 mb-1">Player 2</p>
            <p className="text-amber-400 font-semibold">&quot;{themes.player2}&quot;</p>
          </div>
        </div>

        {/* Loading time feedback */}
        <div className="mt-8 text-sm">
          {elapsedSeconds < 10 ? (
            <p className="text-gray-500">
              This may take up to 15 seconds...
            </p>
          ) : elapsedSeconds < 20 ? (
            <p className="text-amber-400">
              ⏳ Taking longer than expected ({elapsedSeconds}s)...
            </p>
          ) : (
            <p className="text-amber-400">
              ⏳ Almost there... generating fallback cards ({elapsedSeconds}s)
            </p>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg) translateY(-20px);
          }
          to {
            transform: rotate(360deg) translateY(-20px);
          }
        }
      `}</style>
    </div>
  );
}

