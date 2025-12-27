"use client";

import { useState } from "react";
import { Player } from "@/lib/types";

interface ThemePickerProps {
  currentPlayer: Player | null;
  opponent: Player | null;
  onSetTheme: (theme: string) => void;
  onReady: () => void;
}

const THEME_SUGGESTIONS = [
  "The Office (US)",
  "Medieval Weapons",
  "90s Cartoons",
  "Famous Scientists",
  "Greek Mythology",
  "Fast Food Chains",
  "Horror Movies",
  "Video Game Bosses",
  "Kitchen Appliances",
  "World Capitals",
  "Dinosaurs",
  "Space Exploration",
];

export function ThemePicker({
  currentPlayer,
  opponent,
  onSetTheme,
  onReady,
}: ThemePickerProps) {
  const [theme, setTheme] = useState(currentPlayer?.theme || "");
  const [hasSubmitted, setHasSubmitted] = useState(!!currentPlayer?.theme);

  const handleSubmit = () => {
    if (theme.trim()) {
      onSetTheme(theme.trim());
      setHasSubmitted(true);
    }
  };

  const handleReady = () => {
    if (hasSubmitted) {
      onReady();
    }
  };

  const randomTheme = () => {
    const random = THEME_SUGGESTIONS[Math.floor(Math.random() * THEME_SUGGESTIONS.length)];
    setTheme(random);
  };

  return (
    <div className="h-full arena-bg flex flex-col items-center justify-center p-8">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center max-w-2xl w-full">
        <h2 
          className="text-4xl font-bold mb-2 text-white"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Choose Your Theme
        </h2>
        <p className="text-gray-400 mb-8">
          Pick any topic and AI will generate a unique deck of cards for you!
        </p>

        {/* Player Status Cards */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Current Player */}
          <div className={`p-6 rounded-2xl border transition-all duration-300 ${
            currentPlayer?.isReady 
              ? "bg-emerald-500/10 border-emerald-500/30" 
              : hasSubmitted 
                ? "bg-violet-500/10 border-violet-500/30"
                : "bg-white/5 border-white/10"
          }`}>
            <div className="text-sm text-gray-400 mb-1">You</div>
            <div className="font-semibold text-lg text-white mb-2">
              {currentPlayer?.name || "Player"}
            </div>
            {currentPlayer?.theme ? (
              <div className="text-amber-400 font-medium">
                &quot;{currentPlayer.theme}&quot;
              </div>
            ) : (
              <div className="text-gray-500">Choosing theme...</div>
            )}
            {currentPlayer?.isReady && (
              <div className="mt-2 text-emerald-400 text-sm font-medium">
                ✓ Ready
              </div>
            )}
          </div>

          {/* Opponent */}
          <div className={`p-6 rounded-2xl border transition-all duration-300 ${
            opponent?.isReady 
              ? "bg-emerald-500/10 border-emerald-500/30" 
              : opponent?.theme 
                ? "bg-rose-500/10 border-rose-500/30"
                : "bg-white/5 border-white/10"
          }`}>
            <div className="text-sm text-gray-400 mb-1">Opponent</div>
            <div className="font-semibold text-lg text-white mb-2">
              {opponent?.name || "Waiting..."}
            </div>
            {opponent?.theme ? (
              <div className="text-amber-400 font-medium">
                &quot;{opponent.theme}&quot;
              </div>
            ) : opponent ? (
              <div className="text-gray-500">Choosing theme...</div>
            ) : (
              <div className="text-gray-500">Not connected</div>
            )}
            {opponent?.isReady && (
              <div className="mt-2 text-emerald-400 text-sm font-medium">
                ✓ Ready
              </div>
            )}
          </div>
        </div>

        {/* Theme Input */}
        {!hasSubmitted ? (
          <div className="space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter any theme (e.g., 'Famous Pirates')"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-xl 
                           text-white placeholder-gray-500 text-lg
                           focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20
                           transition-all duration-200"
              />
              <button
                onClick={randomTheme}
                className="px-4 py-4 bg-white/5 border border-white/10 rounded-xl
                           text-white hover:bg-white/10 transition-all duration-200"
                title="Random theme"
              >
                🎲
              </button>
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={!theme.trim()}
              className="w-full px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 
                         rounded-xl font-semibold text-lg text-white
                         hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-300
                         hover:scale-[1.02] active:scale-[0.98]
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Set Theme
            </button>

            {/* Suggestions */}
            <div className="pt-4">
              <p className="text-sm text-gray-500 mb-3">Need inspiration?</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {THEME_SUGGESTIONS.slice(0, 6).map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setTheme(suggestion)}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full
                               text-sm text-gray-300 hover:bg-white/10 hover:text-white
                               transition-all duration-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : !currentPlayer?.isReady ? (
          <div className="space-y-4">
            <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
              <p className="text-gray-300">
                Your theme: <span className="text-amber-400 font-semibold">&quot;{theme}&quot;</span>
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setHasSubmitted(false);
                  onSetTheme("");
                }}
                className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-xl
                           text-white hover:bg-white/10 transition-all duration-200"
              >
                Change Theme
              </button>
              <button
                onClick={handleReady}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 
                           rounded-xl font-semibold text-lg text-white
                           hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-300
                           hover:scale-[1.02] active:scale-[0.98]"
              >
                Ready to Battle! ⚔️
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <p className="text-emerald-400 font-semibold text-lg">
                ✓ You&apos;re ready!
              </p>
              <p className="text-gray-400 mt-2">
                {opponent?.isReady 
                  ? "Both players ready! Generating cards..." 
                  : "Waiting for opponent to be ready..."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

