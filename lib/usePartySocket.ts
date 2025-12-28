"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import PartySocket from "partysocket";
import { GameState, ClientMessage, ServerMessage, Card } from "./types";

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999";

export function usePartySocket(roomId: string | null, isSpectator: boolean = false) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [lastCardPlayed, setLastCardPlayed] = useState<{
    playerId: string;
    card: Card;
    damage: number;
  } | null>(null);
  const [abilityTriggered, setAbilityTriggered] = useState<{
    cardName: string;
    abilityText: string;
  } | null>(null);
  const [roundEnded, setRoundEnded] = useState<{
    winner: string | null;
    gameNumber: number;
  } | null>(null);
  const [matchEnded, setMatchEnded] = useState<{
    winner: string | null;
  } | null>(null);
  const [rematchRequested, setRematchRequested] = useState<{
    byPlayerId: string;
    swapThemes: boolean;
  } | null>(null);

  const socketRef = useRef<PartySocket | null>(null);
  const connectionIdRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 2000; // 2 seconds

  const connect = useCallback(() => {
    if (!roomId) return;

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomId,
    });

    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setConnected(true);
      connectionIdRef.current = socket.id;
      setError(null);
      reconnectAttemptsRef.current = 0; // Reset on successful connection
    });

    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;

        switch (message.type) {
          case "state":
            setGameState(message.state);
            break;
          case "error":
            setError(message.message);
            setTimeout(() => setError(null), 3000);
            break;
          case "card-played":
            setLastCardPlayed({
              playerId: message.playerId,
              card: message.card,
              damage: message.damage,
            });
            setTimeout(() => setLastCardPlayed(null), 2000);
            break;
          case "ability-triggered":
            setAbilityTriggered({
              cardName: message.cardName,
              abilityText: message.abilityText,
            });
            setTimeout(() => setAbilityTriggered(null), 3000);
            break;
          case "spectator-count":
            setSpectatorCount(message.count);
            break;
          case "round-ended":
            setRoundEnded({
              winner: message.winner,
              gameNumber: message.gameNumber,
            });
            setTimeout(() => setRoundEnded(null), 5000);
            break;
          case "match-ended":
            setMatchEnded({
              winner: message.winner,
            });
            break;
          case "rematch-requested":
            setRematchRequested({
              byPlayerId: message.byPlayerId,
              swapThemes: message.swapThemes,
            });
            break;
        }
      } catch (e) {
        console.error("[Socket] Failed to parse message:", e);
      }
    });

    socket.addEventListener("close", () => {
      setConnected(false);

      // Attempt to reconnect if we haven't exceeded max attempts
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`[Socket] Reconnecting... (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
          connect();
        }, RECONNECT_DELAY);
      } else {
        setError("Connection lost. Please refresh the page.");
      }
    });

    socket.addEventListener("error", (error) => {
      console.error("[Socket] Connection error:", error);
      setError("Connection error");
      setConnected(false);
    });
  }, [roomId]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: ClientMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  const join = useCallback(
    (playerName: string) => {
      sendMessage({ type: "join", playerName, isSpectator });
    },
    [sendMessage, isSpectator]
  );

  const setTheme = useCallback(
    (theme: string) => {
      sendMessage({ type: "set-theme", theme });
    },
    [sendMessage]
  );

  const ready = useCallback(() => {
    sendMessage({ type: "ready" });
  }, [sendMessage]);

  const draftSelect = useCallback(
    (cardId: string) => {
      sendMessage({ type: "draft-select", cardId });
    },
    [sendMessage]
  );

  const draftDiscard = useCallback(
    (cardId: string) => {
      sendMessage({ type: "draft-discard", cardId });
    },
    [sendMessage]
  );

  const draftConfirm = useCallback(() => {
    sendMessage({ type: "draft-confirm" });
  }, [sendMessage]);

  const revealCard = useCallback(
    (cardId: string) => {
      sendMessage({ type: "reveal-card", cardId });
    },
    [sendMessage]
  );

  const toggleBlindDraft = useCallback(() => {
    sendMessage({ type: "toggle-blind-draft" });
  }, [sendMessage]);

  const playCard = useCallback(
    (cardId: string) => {
      sendMessage({ type: "play-card", cardId });
    },
    [sendMessage]
  );

  const skipTurn = useCallback(() => {
    sendMessage({ type: "skip-turn" });
  }, [sendMessage]);

  const requestRematch = useCallback(() => {
    sendMessage({ type: "request-rematch" });
    setRematchRequested(null);
  }, [sendMessage]);

  const requestSwapRematch = useCallback(() => {
    sendMessage({ type: "request-swap-rematch" });
    setRematchRequested(null);
  }, [sendMessage]);

  const acceptRematch = useCallback(() => {
    sendMessage({ type: "accept-rematch" });
    setRematchRequested(null);
    setMatchEnded(null);
  }, [sendMessage]);

  const continueMatch = useCallback(() => {
    console.log('[usePartySocket] continueMatch called, sending continue-match message');
    sendMessage({ type: "continue-match" });
    setRoundEnded(null);
  }, [sendMessage]);

  return {
    gameState,
    connected,
    error,
    connectionId: connectionIdRef.current,
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
    skipTurn,
    continueMatch,
    requestRematch,
    requestSwapRematch,
    acceptRematch,
  };
}
