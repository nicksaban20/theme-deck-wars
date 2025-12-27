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
    <main className="min-h-screen arena-bg flex flex-col items-center justify-center p-8">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center max-w-lg w-full">
        {/* Title */}
        <h1 
          className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-400 bg-clip-text text-transparent"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Theme Deck Wars
        </h1>
        <p className="text-xl text-gray-400 mb-12">
          AI-generated cards. Infinite possibilities.
        </p>

        {/* Name Input */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Enter your name..."
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full max-w-xs px-6 py-3 bg-white/5 border border-white/10 rounded-xl 
                       text-white placeholder-gray-500 text-center text-lg
                       focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20
                       transition-all duration-200"
          />
        </div>

        {mode === "initial" && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setMode("create")}
              className="group relative px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 
                         rounded-xl font-semibold text-lg text-white overflow-hidden
                         hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-300
                         hover:scale-105 active:scale-95"
            >
              <span className="relative z-10">Create Game</span>
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            
            <button
              onClick={() => setMode("join")}
              className="group relative px-8 py-4 bg-white/5 border border-white/20
                         rounded-xl font-semibold text-lg text-white overflow-hidden
                         hover:bg-white/10 hover:border-white/30 transition-all duration-300
                         hover:scale-105 active:scale-95"
            >
              Join Game
            </button>
          </div>
        )}

        {mode === "create" && (
          <div className="space-y-6 animate-fade-in">
            <p className="text-gray-300">
              Create a new game and share the code with your friend!
            </p>
            <button
              onClick={handleCreate}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 
                         rounded-xl font-semibold text-lg text-white
                         hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-300
                         hover:scale-105 active:scale-95"
            >
              Start Game →
            </button>
            <button
              onClick={() => setMode("initial")}
              className="block mx-auto text-gray-400 hover:text-white transition-colors"
            >
              ← Back
            </button>
          </div>
        )}

        {mode === "join" && (
          <div className="space-y-6 animate-fade-in">
            <p className="text-gray-300">Enter the 4-letter game code:</p>
            <input
              type="text"
              maxLength={4}
              placeholder="ABCD"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-32 px-6 py-4 bg-white/5 border border-white/10 rounded-xl 
                         text-white text-center text-2xl font-mono tracking-widest
                         focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20
                         transition-all duration-200 uppercase"
            />
            <div>
              <button
                onClick={handleJoin}
                disabled={joinCode.length !== 4}
                className="px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 
                           rounded-xl font-semibold text-lg text-white
                           hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-300
                           hover:scale-105 active:scale-95
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Join Game →
              </button>
            </div>
            <button
              onClick={() => setMode("initial")}
              className="block mx-auto text-gray-400 hover:text-white transition-colors"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Art Style Toggle */}
        <div className="mt-8">
          <ArtStyleToggle />
        </div>

        {/* How to Play */}
        <div className="mt-8 text-left bg-white/5 rounded-2xl p-6 border border-white/10">
          <h2 className="text-xl font-bold mb-4 text-violet-400" style={{ fontFamily: "var(--font-display)" }}>
            How to Play
          </h2>
          <ol className="space-y-3 text-gray-300">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-sm font-bold">1</span>
              <span>Create a game and share the code with a friend</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center text-sm font-bold">2</span>
              <span>Each player picks a weird theme (e.g., &quot;90s Cartoons&quot; vs &quot;Medieval Weapons&quot;)</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm font-bold">3</span>
              <span>Draft 5 cards from your AI-generated pool of 7</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold">4</span>
              <span>Battle in a Best of 3! First to win 2 games takes the match</span>
            </li>
          </ol>
        </div>
      </div>
    </main>
  );
}
