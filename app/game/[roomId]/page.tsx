"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { usePartySocket } from "@/lib/usePartySocket";
import { Lobby } from "@/components/Lobby";
import { ThemePicker } from "@/components/ThemePicker";
import { GeneratingCards } from "@/components/GeneratingCards";
import { DraftPhase } from "@/components/DraftPhase";
import { BattleArena } from "@/components/BattleArena";
import { RoundOver } from "@/components/RoundOver";
import { GameOver } from "@/components/GameOver";
import { DRAFT_POOL_SIZE } from "@/lib/gameLogic";

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999";

export default function GamePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const playerName = searchParams.get("name") || "Player";
  const isSpectatorMode = searchParams.get("spectate") === "true";

  const [hasJoined, setHasJoined] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);

  const {
    gameState,
    connected,
    error,
    spectatorCount,
    lastCardPlayed,
    abilityTriggered,
    roundEnded,
    matchEnded,
    rematchRequested,
    join,
    setTheme,
    ready,
    draftSelect,
    draftDiscard,
    draftConfirm,
    playCard,
    continueMatch,
    requestRematch,
    requestSwapRematch,
    acceptRematch,
  } = usePartySocket(roomId, isSpectatorMode);

  // Join the game when connected
  useEffect(() => {
    if (connected && !hasJoined) {
      join(playerName);
      setHasJoined(true);
    }
  }, [connected, hasJoined, join, playerName]);

  // Store connection ID when we receive game state
  useEffect(() => {
    if (gameState && connected) {
      const playerIds = Object.keys(gameState.players);
      if (playerIds.length > 0 && !connectionId) {
        const ourPlayer = Object.values(gameState.players).find(
          p => p.name === playerName
        );
        if (ourPlayer) {
          setConnectionId(ourPlayer.id);
        } else if (isSpectatorMode && playerIds.length > 0) {
          // For spectators, use the first player as reference
          setConnectionId(playerIds[0]);
        }
      }
    }
  }, [gameState, connected, playerName, connectionId, isSpectatorMode]);

  // Trigger card generation when entering generating phase
  useEffect(() => {
    if (gameState?.phase === "generating" && !isGenerating && connectionId && !isSpectatorMode) {
      setIsGenerating(true);
      generateCards();
    }
  }, [gameState?.phase, isGenerating, connectionId, isSpectatorMode]);

  // Reset generating flag when phase changes away from generating
  useEffect(() => {
    if (gameState?.phase !== "generating") {
      setIsGenerating(false);
    }
  }, [gameState?.phase]);

  const generateCards = useCallback(async () => {
    if (!gameState || !connectionId) return;

    const currentPlayer = gameState.players[connectionId];
    if (!currentPlayer?.theme) return;

    // Only the first player generates cards for both
    const isFirstPlayer = gameState.playerOrder[0] === connectionId;
    
    if (isFirstPlayer) {
      for (const playerId of gameState.playerOrder) {
        const player = gameState.players[playerId];
        if (!player?.theme) continue;

        try {
          await fetch("/api/generate-cards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              theme: player.theme,
              playerId: playerId,
              roomId: roomId,
              partyHost: PARTYKIT_HOST,
              count: DRAFT_POOL_SIZE, // Generate 7 for draft
            }),
          });
        } catch (error) {
          console.error("Failed to generate cards:", error);
        }
      }
    }
  }, [gameState, connectionId, roomId]);

  // Loading state
  if (!connected) {
    return (
      <div className="min-h-screen arena-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Connecting to game server...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen arena-bg flex items-center justify-center p-8">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <p className="text-red-400 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  // Waiting for game state
  if (!gameState) {
    return (
      <div className="min-h-screen arena-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading game...</p>
        </div>
      </div>
    );
  }

  // Get current player and opponent
  const currentPlayer = connectionId ? gameState.players[connectionId] : null;
  const opponent = Object.values(gameState.players).find(
    p => p.id !== connectionId
  );

  // Check if user is actually a spectator (not in players list)
  const isActualSpectator = isSpectatorMode || Boolean(connectionId && !gameState.players[connectionId]);

  // Render based on game phase
  switch (gameState.phase) {
    case "lobby":
      return (
        <Lobby
          roomId={roomId}
          gameState={gameState}
          onJoin={join}
          hasJoined={hasJoined}
        />
      );

    case "theme-select":
      if (isActualSpectator) {
        return (
          <div className="min-h-screen arena-bg flex items-center justify-center p-8">
            <div className="text-center">
              <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-violet-500/20 border border-violet-500/40 rounded-full text-violet-400">
                👁️ Spectating
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Players are choosing themes...</h2>
              <p className="text-gray-400">The battle will begin soon!</p>
            </div>
          </div>
        );
      }
      return (
        <ThemePicker
          currentPlayer={currentPlayer}
          opponent={opponent || null}
          onSetTheme={setTheme}
          onReady={ready}
        />
      );

    case "generating":
      const themes = {
        player1: Object.values(gameState.players)[0]?.theme || "",
        player2: Object.values(gameState.players)[1]?.theme || "",
      };
      return <GeneratingCards themes={themes} />;

    case "drafting":
      if (isActualSpectator) {
        return (
          <div className="min-h-screen arena-bg flex items-center justify-center p-8">
            <div className="text-center">
              <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-violet-500/20 border border-violet-500/40 rounded-full text-violet-400">
                👁️ Spectating
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Players are drafting their decks...</h2>
              <p className="text-gray-400">Each player is selecting 5 cards from their pool of 7.</p>
            </div>
          </div>
        );
      }
      return (
        <DraftPhase
          currentPlayer={currentPlayer}
          opponent={opponent || null}
          onSelectCard={draftSelect}
          onDiscardCard={draftDiscard}
          onConfirmDraft={draftConfirm}
        />
      );

    case "battle":
      if (!connectionId) {
        return (
          <div className="min-h-screen arena-bg flex items-center justify-center">
            <p className="text-gray-400">Joining battle...</p>
          </div>
        );
      }
      return (
        <BattleArena
          gameState={gameState}
          currentPlayerId={connectionId}
          onPlayCard={playCard}
          lastCardPlayed={lastCardPlayed}
          abilityTriggered={abilityTriggered}
          spectatorCount={spectatorCount}
          isSpectator={isActualSpectator}
        />
      );

    case "round-ended":
      if (!connectionId) {
        return (
          <div className="min-h-screen arena-bg flex items-center justify-center">
            <p className="text-gray-400">Loading...</p>
          </div>
        );
      }
      return (
        <RoundOver
          gameState={gameState}
          currentPlayerId={connectionId}
          roundEnded={roundEnded}
          onContinue={continueMatch}
        />
      );

    case "match-ended":
      if (!connectionId) {
        return (
          <div className="min-h-screen arena-bg flex items-center justify-center">
            <p className="text-gray-400">Loading results...</p>
          </div>
        );
      }
      return (
        <GameOver
          gameState={gameState}
          currentPlayerId={connectionId}
          spectatorCount={spectatorCount}
          rematchRequested={rematchRequested}
          onRequestRematch={requestRematch}
          onRequestSwapRematch={requestSwapRematch}
          onAcceptRematch={acceptRematch}
        />
      );

    default:
      return (
        <div className="min-h-screen arena-bg flex items-center justify-center">
          <p className="text-gray-400">Unknown game state</p>
        </div>
      );
  }
}
