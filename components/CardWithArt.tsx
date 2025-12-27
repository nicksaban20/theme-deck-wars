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
}

export function CardWithArt(props: CardWithArtProps) {
  const { artStyle } = useArtStyle();
  return <Card {...props} artStyle={artStyle} />;
}

