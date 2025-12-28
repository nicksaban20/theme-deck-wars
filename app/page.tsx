"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArtStyleToggle } from "@/components/ArtStyleToggle";

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [mode, setMode] = useState<"initial" | "create" | "join">("initial");

  const handleCreate = () => {
    const roomId = generateRoomCode();
    const name = playerName.trim() || "Player 1";
    router.push(`/game/${roomId}?name=${encodeURIComponent(name)}`);
  };

  const handleJoin = () => {
    if (joinCode.length !== 4) return;
    const name = playerName.trim() || "Player 2";
    router.push(`/game/${joinCode.toUpperCase()}?name=${encodeURIComponent(name)}`);
  };

  return (
    <main className="min-h-screen arena-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bg-purple-600/20 w-[500px] h-[500px] rounded-full blur-[120px] top-[-100px] left-[-100px] animate-pulse-slow" />
        <div className="absolute bg-blue-600/20 w-[500px] h-[500px] rounded-full blur-[120px] bottom-[-100px] right-[-100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 w-full max-w-lg mb-8">
        {/* Title Section */}
        <div className="text-center mb-10 relative group cursor-default">
          <div className="absolute inset-0 bg-violet-500/20 blur-3xl -z-10 rounded-full opacity-50 group-hover:opacity-75 transition-opacity" />
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-white to-cyan-300 drop-shadow-[0_0_25px_rgba(139,92,246,0.6)] mb-2 tracking-tighter"
            style={{ fontFamily: 'var(--font-display)' }}>
            THEME<br />WARS
          </h1>
          <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-cyan-400 to-transparent mb-4 opacity-75" />
          <p className="text-cyan-200/80 tracking-[0.3em] uppercase text-xs md:text-sm font-bold animate-pulse">
            Deck Building • AI Art • Strategy
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Top Line Gradient */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500 to-transparent" />

          {/* Name Input - Always visible first */}
          <div className="mb-8 pt-2">
            <label className="block text-xs font-bold text-violet-300 uppercase tracking-wider mb-2 ml-1">
              Identify Yourself
            </label>
            <div className="relative group">
              <input
                type="text"
                placeholder="Enter Username..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-4 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-600 text-lg font-bold tracking-wide
                           focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all
                           group-hover:border-white/20"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl animate-pulse">
                👾
              </div>
            </div>
          </div>

          {mode === "initial" && (
            <div className="grid gap-4 animate-fade-in">
              <button
                onClick={() => setMode("create")}
                disabled={!playerName.trim()}
                className="group relative w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl font-bold text-lg text-white overflow-hidden
                           shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-all hover:scale-[1.02] active:scale-[0.98]
                           disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
              >
                <div className="relative z-10 flex items-center justify-center gap-2">
                  <span>Create New Loop</span>
                  <span className="text-xl">⚔️</span>
                </div>
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>

              <button
                onClick={() => setMode("join")}
                disabled={!playerName.trim()}
                className="w-full py-4 bg-white/5 border border-white/10 rounded-xl font-bold text-lg text-gray-300
                           hover:bg-white/10 hover:text-white transition-all hover:border-white/30 active:scale-[0.98]
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join Existing Loop
              </button>
            </div>
          )}

          {mode === "create" && (
            <div className="space-y-6 animate-slide-up">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                <p className="text-emerald-200 text-sm">
                  Ready to start a new universe?
                </p>
              </div>
              <button
                onClick={handleCreate}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl font-bold text-lg text-white
                           shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Launch Game →
              </button>
              <button
                onClick={() => setMode("initial")}
                className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {mode === "join" && (
            <div className="space-y-6 animate-slide-up">
              <div>
                <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider mb-2 ml-1">
                  Access Code
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="ABCD"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-6 py-4 bg-black/50 border border-amber-500/30 rounded-xl 
                             text-white text-center text-3xl font-mono tracking-[0.5em] uppercase
                             focus:outline-none focus:border-amber-500 focus:shadow-[0_0_20px_rgba(245,158,11,0.2)]
                             transition-all duration-200"
                  autoFocus
                />
              </div>
              <button
                onClick={handleJoin}
                disabled={joinCode.length !== 4}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-bold text-lg text-white
                           shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all hover:scale-[1.02] active:scale-[0.98]
                           disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
              >
                Connect to Match
              </button>
              <button
                onClick={() => setMode("initial")}
                className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex flex-col items-center gap-4 z-10 w-full max-w-lg">
        <ArtStyleToggle />

        {/* Accordion-style How To Play */}
        <details className="w-full group bg-white/5 border border-white/10 rounded-xl overflow-hidden cursor-pointer open:bg-black/80 transition-colors">
          <summary className="p-4 text-center font-bold text-violet-300 hover:text-white transition-colors select-none list-none flex items-center justify-center gap-2">
            <span>How To Play</span>
            <span className="text-xs opacity-50 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="p-6 pt-0 border-t border-white/5 text-sm text-gray-400 space-y-3">
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <p>Create a game & share the code.</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <p>Pick a theme ("Cyberpunk" vs "Tacos").</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <p>Draft 5 AI-generated cards.</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">4</span>
              <p>Battle! First to 2 wins.</p>
            </div>
          </div>
        </details>
      </div>

    </main>
  );
}
