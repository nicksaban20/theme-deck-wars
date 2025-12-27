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

  useEffect(() => {
    if (!roomId) return;

    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomId,
    });

    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setConnected(true);
      connectionIdRef.current = socket.id;
      setError(null);
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
        console.error("Failed to parse message:", e);
      }
    });

    socket.addEventListener("close", () => {
      setConnected(false);
    });

    socket.addEventListener("error", () => {
      setError("Connection error");
      setConnected(false);
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [roomId]);

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

  const playCard = useCallback(
    (cardId: string) => {
      sendMessage({ type: "play-card", cardId });
    },
    [sendMessage]
  );

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
    playCard,
    continueMatch,
    requestRematch,
    requestSwapRematch,
    acceptRematch,
  };
}
