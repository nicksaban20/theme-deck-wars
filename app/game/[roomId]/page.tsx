"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { usePartySocket } from "@/lib/usePartySocket";
import { Lobby } from "@/components/Lobby";
import { ThemePicker } from "@/components/ThemePicker";
import { GeneratingCards } from "@/components/GeneratingCards";
import { DraftPhase } from "@/components/DraftPhase";
import { RevealPhase } from "@/components/RevealPhase";
import { BattleArena } from "@/components/BattleArena";
import { RoundOver } from "@/components/RoundOver";
import { GameOver } from "@/components/GameOver";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
    revealCard,
    toggleBlindDraft,
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

  // Reset generating flag when phase changes away from generating
  useEffect(() => {
    if (gameState?.phase !== "generating") {
      setIsGenerating(false);
    }
  }, [gameState?.phase]);

  const generateCards = useCallback(async () => {
    if (!gameState || !connectionId) {
      console.log('[generateCards] Missing gameState or connectionId', { gameState: !!gameState, connectionId });
      return;
    }

    const currentPlayer = gameState.players[connectionId];
    if (!currentPlayer?.theme) {
      console.log('[generateCards] Missing player or theme', { currentPlayer: !!currentPlayer, theme: currentPlayer?.theme });
      return;
    }

    // Only the first player generates cards for both
    const isFirstPlayer = gameState.playerOrder[0] === connectionId;

    console.log('[generateCards] Card generation check', {
      isFirstPlayer,
      connectionId,
      playerOrder: gameState.playerOrder,
      firstPlayerId: gameState.playerOrder[0],
      allPlayers: Object.keys(gameState.players).map(id => ({
        id,
        name: gameState.players[id]?.name,
        theme: gameState.players[id]?.theme,
        hasDraftPool: gameState.players[id]?.draftPool?.length > 0
      }))
    });

    if (isFirstPlayer) {
      console.log('[generateCards] First player generating cards for both players in parallel');

      // Generate cards for both players in parallel (instead of sequential)
      const generationPromises = gameState.playerOrder.map(async (playerId) => {
        const player = gameState.players[playerId];
        if (!player?.theme) {
          console.log(`[generateCards] Skipping player ${playerId} - no theme`);
          return;
        }

        // Check if this player already has cards
        if (player.draftPool && player.draftPool.length > 0) {
          console.log(`[generateCards] Player ${player.name} already has ${player.draftPool.length} cards, skipping`);
          return;
        }

        try {
          // Get strategy info from previous games for adaptive generation
          const lastGame = gameState.gameHistory && gameState.gameHistory.length > 0
            ? gameState.gameHistory[gameState.gameHistory.length - 1]
            : null;
          const isPlayer1 = gameState.playerOrder[0] === playerId;
          const previousStrategy = lastGame ? (isPlayer1 ? lastGame.player1Strategy : lastGame.player2Strategy) : undefined;
          const opponentStrategy = lastGame ? (isPlayer1 ? lastGame.player2Strategy : lastGame.player1Strategy) : undefined;

          console.log(`[generateCards] Generating cards for ${player.name} with strategy:`, previousStrategy || 'balanced');

          const response = await fetch("/api/generate-cards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              theme: player.theme,
              playerId: playerId,
              roomId: roomId,
              partyHost: PARTYKIT_HOST,
              count: DRAFT_POOL_SIZE, // Generate 9 for draft
              gameNumber: gameState.gameNumber,
              previousStrategy,
              opponentStrategy,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }

          const responseData = await response.json().catch(() => ({}));
          console.log(`[generateCards] Successfully generated cards for ${player.name}`, responseData);
        } catch (error) {
          console.error(`[generateCards] Failed to generate cards for ${player.name}:`, error);
          // Don't throw - let other player's generation continue
        }
      });

      // Wait for all generation to complete in parallel
      await Promise.all(generationPromises);
      console.log('[generateCards] All card generation completed');
    } else {
      console.log('[generateCards] Not first player, waiting for cards to be generated', {
        myConnectionId: connectionId,
        firstPlayerId: gameState.playerOrder[0],
        myPlayer: currentPlayer?.name,
        myDraftPool: currentPlayer?.draftPool?.length || 0
      });
    }
  }, [gameState, connectionId, roomId]);

  // Trigger card generation when entering generating phase
  useEffect(() => {
    if (gameState?.phase === "generating" && !isGenerating && connectionId && !isSpectatorMode) {
      // Small delay to ensure state is fully updated
      const timeoutId = setTimeout(() => {
        setIsGenerating(true);
        generateCards();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [gameState?.phase, isGenerating, connectionId, isSpectatorMode, generateCards]);

  // Loading state
  if (!connected) {
    return (
      <div className="h-screen w-screen overflow-hidden arena-bg flex items-center justify-center">
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
      <div className="h-screen w-screen overflow-hidden arena-bg flex items-center justify-center p-8">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <p className="text-red-400 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  // Waiting for game state
  if (!gameState) {
    return (
      <div className="h-screen w-screen overflow-hidden arena-bg flex items-center justify-center">
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

  // Wrap all game phases in error boundary
  const renderGameContent = () => {
    // Render based on game phase
    switch (gameState.phase) {
      case "lobby":
        const isRoomCreator = gameState.playerOrder[0] === connectionId;
        return (
          <Lobby
            roomId={roomId}
            gameState={gameState}
            onJoin={join}
            hasJoined={hasJoined}
            onToggleBlindDraft={toggleBlindDraft}
            isRoomCreator={isRoomCreator}
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
            blindDraft={gameState.blindDraft || false}
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
            <div className="h-screen w-screen overflow-hidden arena-bg flex items-center justify-center">
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
          <div className="h-screen w-screen overflow-hidden arena-bg flex items-center justify-center">
            <p className="text-gray-400">Unknown game state</p>
          </div>
        );
    }
  };

  return (
    <ErrorBoundary>
      {renderGameContent()}
    </ErrorBoundary>
  );
}
