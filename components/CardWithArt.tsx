"use client";

import { Card as CardType } from "@/lib/types";
import { Card } from "./Card";
import { useArtStyle } from "@/lib/ArtStyleContext";

interface CardWithArtProps {
  card: CardType;
  onClick?: () => void;
  disabled?: boolean;
  isPlayable?: boolean;
  size?: "sm" | "md" | "lg";
  showAbility?: boolean;
  isDraftPhase?: boolean; // If true, don't generate AI art (use icons instead)
}

export function CardWithArt({ isDraftPhase = false, ...props }: CardWithArtProps) {
  const { artStyle } = useArtStyle();

  // During draft phase, use icons instead of AI art to save resources
  // AI art will only generate for the final selected cards in battle
  const effectiveArtStyle = isDraftPhase && (artStyle === "ai" || artStyle === "local-ai") ? "icons" : artStyle;

  return <Card {...props} artStyle={effectiveArtStyle} />;
}

