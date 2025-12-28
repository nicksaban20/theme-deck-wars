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
    <div className="h-full arena-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bg-purple-600/20 w-[400px] h-[400px] rounded-full blur-[100px] top-[-50px] left-[-50px] animate-pulse-slow" />
        <div className="absolute bg-blue-600/20 w-[400px] h-[400px] rounded-full blur-[100px] bottom-[-50px] right-[-50px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Title */}
        <div className="text-center mb-8 relative">
          <div className="absolute inset-0 bg-violet-500/20 blur-3xl -z-10 rounded-full opacity-50" />
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-white to-cyan-300 drop-shadow-[0_0_15px_rgba(139,92,246,0.5)] mb-2"
            style={{ fontFamily: 'var(--font-display)' }}>
            GAME LOBBY
          </h1>
          <p className="text-gray-400 text-sm">Share the code with your opponent</p>
        </div>

        {/* Room Code Card */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6 text-center relative overflow-hidden group">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500 to-transparent" />

          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Room Code</p>
          <button
            onClick={copyRoomCode}
            className="relative px-8 py-4 bg-black/50 border border-white/10 rounded-xl hover:border-violet-500/50 transition-all group-hover:shadow-[0_0_20px_rgba(124,58,237,0.2)]"
          >
            <span className="text-5xl font-black tracking-[0.4em] text-white font-mono" style={{ fontFamily: 'var(--font-display)' }}>
              {roomId}
            </span>
            <span className="block text-xs text-gray-500 mt-2 group-hover:text-violet-400 transition-colors">
              {copied ? "✓ Copied!" : "Click to copy"}
            </span>
          </button>

          <button
            onClick={copySpectateLink}
            className="mt-4 block mx-auto text-xs text-gray-500 hover:text-violet-400 transition-colors"
          >
            {copiedSpectate ? "✓ Spectate link copied!" : "📺 Copy spectate link"}
          </button>
        </div>

        {/* Players Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Player 1 */}
          <div className={`p-4 rounded-xl border transition-all ${players[0]
              ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
              : "bg-white/5 border-white/10 border-dashed"
            }`}>
            {players[0] ? (
              <div className="text-center">
                <span className="text-2xl mb-2 block">🧙‍♂️</span>
                <span className="font-bold text-white block truncate">{players[0].name}</span>
                <span className="text-xs text-emerald-400">● Connected</span>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-2">
                <span className="text-2xl opacity-30 block">?</span>
                <span className="text-xs">Waiting...</span>
              </div>
            )}
          </div>

          {/* Player 2 */}
          <div className={`p-4 rounded-xl border transition-all ${players[1]
              ? "bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]"
              : "bg-white/5 border-white/10 border-dashed"
            }`}>
            {players[1] ? (
              <div className="text-center">
                <span className="text-2xl mb-2 block">👾</span>
                <span className="font-bold text-white block truncate">{players[1].name}</span>
                <span className="text-xs text-emerald-400">● Connected</span>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-2 animate-pulse">
                <span className="text-2xl opacity-30 block">?</span>
                <span className="text-xs">Waiting for opponent...</span>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/5 text-center mb-4">
          <p className="text-gray-300 text-sm">{gameState.message}</p>
        </div>

        {/* Connection Indicator */}
        {hasJoined && (
          <div className="flex items-center justify-center gap-2 text-xs text-emerald-400">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Connected to server
          </div>
        )}

        {/* Spectators */}
        {spectatorCount > 0 && (
          <div className="text-center text-xs text-violet-400 mt-4">
            👁️ {spectatorCount} spectator{spectatorCount !== 1 ? "s" : ""} watching
          </div>
        )}
      </div>
    </div>
  );
}
