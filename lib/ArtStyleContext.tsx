"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { CardArtStyle } from "./types";

interface ArtStyleContextType {
  artStyle: CardArtStyle;
  setArtStyle: (style: CardArtStyle) => void;
}

const ArtStyleContext = createContext<ArtStyleContextType | null>(null);

export function ArtStyleProvider({ children }: { children: ReactNode }) {
  const [artStyle, setArtStyle] = useState<CardArtStyle>("pattern");

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("cardArtStyle");
    if (saved && ["pattern", "ai", "local-ai", "icons"].includes(saved)) {
      setArtStyle(saved as CardArtStyle);
    }
  }, []);

  // Listen for changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "cardArtStyle" && e.newValue) {
        if (["pattern", "ai", "local-ai", "icons"].includes(e.newValue)) {
          setArtStyle(e.newValue as CardArtStyle);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Save to localStorage on change
  const handleSetArtStyle = (style: CardArtStyle) => {
    setArtStyle(style);
    localStorage.setItem("cardArtStyle", style);
  };

  return (
    <ArtStyleContext.Provider value={{ artStyle, setArtStyle: handleSetArtStyle }}>
      {children}
    </ArtStyleContext.Provider>
  );
}

export function useArtStyle() {
  const context = useContext(ArtStyleContext);
  if (!context) {
    throw new Error("useArtStyle must be used within ArtStyleProvider");
  }
  return context;
}

