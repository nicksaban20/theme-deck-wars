"use client";

import { useState } from "react";
import { GameState } from "@/lib/types";

interface LobbyProps {
  roomId: string;
  gameState: GameState;
  onJoin: (playerName: string) => void;
  hasJoined: boolean;
  onToggleBlindDraft?: () => void;
  isRoomCreator?: boolean;
}

export function Lobby({ roomId, gameState, onJoin, hasJoined, onToggleBlindDraft, isRoomCreator }: LobbyProps) {
  const [copied, setCopied] = useState(false);
  const [copiedSpectate, setCopiedSpectate] = useState(false);
  
  const playerCount = Object.keys(gameState.players).length;
  const players = Object.values(gameState.players);
  const spectatorCount = gameState.spectators?.length || 0;

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  };

  const copySpectateLink = async () => {
    try {
      const url = `${window.location.origin}/game/${roomId}?spectate=true`;
      await navigator.clipboard.writeText(url);
      setCopiedSpectate(true);
      setTimeout(() => setCopiedSpectate(false), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  };

  return (
    <div className="min-h-screen arena-bg flex flex-col items-center justify-center p-8">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 text-center max-w-lg w-full">
        <h2 
          className="text-4xl font-bold text-white mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Game Lobby
        </h2>
        <p className="text-gray-400 mb-8">
          Share the room code with your friend to start!
        </p>

        {/* Room Code */}
        <div className="mb-6">
          <p className="text-sm text-gray-400 mb-2">Room Code</p>
          <button
            onClick={copyRoomCode}
            className="group relative px-8 py-4 bg-white/5 border border-white/20 rounded-2xl
                       hover:bg-white/10 transition-all duration-300"
          >
            <span 
              className="text-4xl font-mono font-bold tracking-[0.3em] text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {roomId}
            </span>
            <span className="block text-sm text-gray-400 mt-2 group-hover:text-violet-400 transition-colors">
              {copied ? "Copied! ✓" : "Click to copy"}
            </span>
          </button>
        </div>

        {/* Spectate Link */}
        <div className="mb-8">
          <button
            onClick={copySpectateLink}
            className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            {copiedSpectate ? "✓ Spectate link copied!" : "📺 Copy spectate link for viewers"}
          </button>
        </div>

        {/* Players */}
        <div className="space-y-4 mb-8">
          <p className="text-sm text-gray-400">Players ({playerCount}/2)</p>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Player 1 slot */}
            <div className={`p-4 rounded-xl border transition-all duration-300 ${
              players[0] 
                ? "bg-violet-500/10 border-violet-500/30" 
                : "bg-white/5 border-white/10 border-dashed"
            }`}>
              {players[0] ? (
                <div>
                  <span className="text-lg font-semibold text-white">
                    {players[0].name}
                  </span>
                  <span className="block text-sm text-emerald-400 mt-1">
                    ✓ Connected
                  </span>
                </div>
              ) : (
                <div className="text-gray-500">
                  Waiting...
                </div>
              )}
            </div>

            {/* Player 2 slot */}
            <div className={`p-4 rounded-xl border transition-all duration-300 ${
              players[1] 
                ? "bg-rose-500/10 border-rose-500/30" 
                : "bg-white/5 border-white/10 border-dashed"
            }`}>
              {players[1] ? (
                <div>
                  <span className="text-lg font-semibold text-white">
                    {players[1].name}
                  </span>
                  <span className="block text-sm text-emerald-400 mt-1">
                    ✓ Connected
                  </span>
                </div>
              ) : (
                <div className="text-gray-500 animate-pulse">
                  Waiting for opponent...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Spectators */}
        {spectatorCount > 0 && (
          <div className="mb-6 text-sm text-violet-400">
            👁️ {spectatorCount} spectator{spectatorCount !== 1 ? "s" : ""} watching
          </div>
        )}

        {/* Status message */}
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <p className="text-gray-300">
            {gameState.message}
          </p>
        </div>

        {/* Connection status indicator */}
        {hasJoined && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-emerald-400">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Connected to game server
          </div>
        )}

        {/* Game features */}
        <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10 text-left">
          <h3 className="font-semibold text-white mb-2">This match features:</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>📦 <span className="text-amber-400">Draft System</span> - Pick 5 cards from a pool of 7</li>
            <li>🏆 <span className="text-violet-400">Best of 3</span> - First to win 2 games wins the match</li>
            <li>🔀 <span className="text-cyan-400">Swap Themes</span> - Rematch option with swapped decks</li>
            <li>👁️ <span className="text-rose-400">Spectator Mode</span> - Friends can watch live</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
