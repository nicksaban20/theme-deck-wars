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
    </main >
  );
}
