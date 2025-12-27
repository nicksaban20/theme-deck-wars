"use client";

import { useState, useEffect } from "react";
import { Card as CardType, CardColor, CardArtStyle } from "@/lib/types";

interface CardProps {
  card: CardType;
  onClick?: () => void;
  disabled?: boolean;
  isPlayable?: boolean;
  size?: "sm" | "md" | "lg";
  showAbility?: boolean;
  artStyle?: CardArtStyle;
}

const colorClasses: Record<CardColor, { gradient: string; glow: string; accent: string; hex: string }> = {
  amber: {
    gradient: "from-amber-500 to-orange-600",
    glow: "shadow-amber-500/40",
    accent: "text-amber-300",
    hex: "#f59e0b",
  },
  crimson: {
    gradient: "from-red-500 to-rose-700",
    glow: "shadow-red-500/40",
    accent: "text-red-300",
    hex: "#ef4444",
  },
  emerald: {
    gradient: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-500/40",
    accent: "text-emerald-300",
    hex: "#10b981",
  },
  violet: {
    gradient: "from-violet-500 to-purple-700",
    glow: "shadow-violet-500/40",
    accent: "text-violet-300",
    hex: "#8b5cf6",
  },
  cyan: {
    gradient: "from-cyan-500 to-blue-600",
    glow: "shadow-cyan-500/40",
    accent: "text-cyan-300",
    hex: "#06b6d4",
  },
  rose: {
    gradient: "from-rose-500 to-pink-600",
    glow: "shadow-rose-500/40",
    accent: "text-rose-300",
    hex: "#f43f5e",
  },
  slate: {
    gradient: "from-slate-500 to-gray-700",
    glow: "shadow-slate-500/40",
    accent: "text-slate-300",
    hex: "#64748b",
  },
};

const sizeClasses = {
  sm: "w-32 h-44",
  md: "w-44 h-60",
  lg: "w-56 h-76",
};

// Iconify CDN - much more reliable than game-icons.net directly
// Format: https://api.iconify.design/game-icons/{icon-name}.svg?color=white
const ICONIFY_BASE = "https://api.iconify.design/game-icons";

// Map icon keywords to iconify game-icons names
const iconNameMap: Record<string, string> = {
  sword: "crossed-swords",
  shield: "shield",
  skull: "skull",
  fire: "flame",
  lightning: "lightning-helix",
  heart: "heart-plus",
  star: "star-formation",
  crown: "crown",
  dragon: "dragon-head",
  wolf: "wolf-head",
  eagle: "eagle-head",
  snake: "snake",
  spider: "spider-face",
  castle: "castle",
  tower: "tower-flag",
  gem: "gem",
  potion: "potion-ball",
  scroll: "scroll-unfurled",
  book: "book-cover",
  wand: "fairy-wand",
  staff: "wizard-staff",
  bow: "high-shot",
  arrow: "arrow-cluster",
  axe: "battle-axe",
  hammer: "hammer-drop",
  dagger: "stiletto",
  claw: "wolverine-claws",
  fist: "fist",
  boot: "boot-stomp",
  helmet: "viking-helmet",
  armor: "breastplate",
  ring: "ring",
  eye: "eye-target",
  moon: "moon",
  sun: "sun",
  cloud: "cloud",
  leaf: "leaf",
  tree: "oak",
  mountain: "mountain-peak",
  wave: "wave-crest",
  bomb: "bomb",
  trap: "bear-trap",
  key: "key",
  lock: "padlock",
  chain: "chain",
  wing: "feathered-wing",
  horn: "horn-call",
};

// Inline SVG icons as fallback (guaranteed to work)
const fallbackIcons: Record<string, string> = {
  sword: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.92 5L5 6.92l4.06 4.06L5 15.04 6.92 17l4.06-4.06 4.05 4.05 1.92-1.92-4.05-4.05 8.05-8.05L19.03 1.05 11 9.08 6.92 5z"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>`,
  skull: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 3.69 2.47 6.86 6 8.25V22h8v-1.75c3.53-1.39 6-4.56 6-8.25 0-5.52-4.48-10-10-10zm-2 15c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm4 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>`,
  fire: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 23c-3.87 0-7-3.13-7-7 0-2.38 1.19-4.47 3-5.74V3c0-.55.45-1 1-1h6c.55 0 1 .45 1 1v7.26c1.81 1.27 3 3.36 3 5.74 0 3.87-3.13 7-7 7z"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
  crown: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>`,
  lightning: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>`,
};

function getIconUrl(keyword: string, color: string = "ffffff"): string {
  const iconName = iconNameMap[keyword?.toLowerCase()] || "crossed-swords";
  return `${ICONIFY_BASE}/${iconName}.svg?color=%23${color}`;
}

function getPollinationsUrl(prompt: string, width: number = 300, height: number = 400): string {
  const encodedPrompt = encodeURIComponent(prompt + ", trading card game art, fantasy style, high quality, detailed illustration");
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${prompt.length}`;
}

export function Card({
  card,
  onClick,
  disabled = false,
  isPlayable = false,
  size = "md",
  showAbility = true,
  artStyle = "pattern",
}: CardProps) {
  const colors = colorClasses[card.color] || colorClasses.slate;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [iconLoaded, setIconLoaded] = useState(false);
  const [iconError, setIconError] = useState(false);

  // Reset loading states when card or artStyle changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setIconLoaded(false);
    setIconError(false);
  }, [card.id, artStyle]);

  const artSizes = {
    sm: { width: 100, height: 80 },
    md: { width: 160, height: 120 },
    lg: { width: 200, height: 160 },
  };

  const renderFallbackIcon = () => {
    const keyword = card.iconKeyword?.toLowerCase() || "sword";
    const svgContent = fallbackIcons[keyword] || fallbackIcons.sword;
    
    return (
      <div 
        className="w-12 h-12 md:w-16 md:h-16 text-white/80"
        style={{ filter: `drop-shadow(0 0 8px ${colors.hex})` }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    );
  };

  const renderArtArea = () => {
    // Pattern mode (default) - always works, no loading needed
    if (artStyle === "pattern") {
      return (
        <div className="flex-1 bg-black/20 rounded-lg mb-2 flex items-center justify-center overflow-hidden relative">
          <div className="absolute inset-0 card-pattern-grid opacity-50" />
          <div className="absolute text-4xl opacity-30">
            {getCardEmoji(card.color)}
          </div>
        </div>
      );
    }

    // AI Art mode (Pollinations.ai) - takes time to generate
    if (artStyle === "ai") {
      const imageUrl = card.imagePrompt 
        ? getPollinationsUrl(card.imagePrompt, artSizes[size].width * 2, artSizes[size].height * 2)
        : getPollinationsUrl(card.name);

      return (
        <div className="flex-1 bg-black/30 rounded-lg mb-2 overflow-hidden relative">
          {/* Always show pattern background */}
          <div className="absolute inset-0 card-pattern-grid opacity-30" />
          
          {/* Loading state with helpful text */}
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mb-1" />
              <span className="text-[10px] text-white/50">Generating...</span>
            </div>
          )}
          
          {/* Error fallback */}
          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <span className="text-3xl opacity-60">{getCardEmoji(card.color)}</span>
            </div>
          )}
          
          {/* The actual image - loads in background */}
          <img
            src={imageUrl}
            alt={card.name}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        </div>
      );
    }

    // Icons mode - use Iconify CDN with inline SVG fallback
    if (artStyle === "icons") {
      const iconUrl = getIconUrl(card.iconKeyword || "sword");

      return (
        <div 
          className="flex-1 rounded-lg mb-2 flex items-center justify-center overflow-hidden relative"
          style={{ backgroundColor: `${colors.hex}20` }}
        >
          <div className="absolute inset-0 card-pattern-dots opacity-15" />
          
          {/* Show fallback icon immediately, then swap to loaded one */}
          <div 
            className="relative z-10 flex items-center justify-center"
            style={{ filter: `drop-shadow(0 0 10px ${colors.hex})` }}
          >
            {/* Fallback inline SVG - shows immediately */}
            {!iconLoaded && !iconError && renderFallbackIcon()}
            
            {/* CDN icon - loads in background */}
            <img
              src={iconUrl}
              alt={card.iconKeyword || "icon"}
              className={`w-14 h-14 md:w-18 md:h-18 transition-opacity duration-300 ${
                iconLoaded ? "opacity-100" : "absolute opacity-0"
              }`}
              onLoad={() => setIconLoaded(true)}
              onError={() => setIconError(true)}
            />
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      onClick={!disabled && onClick ? onClick : undefined}
      className={`
        relative ${sizeClasses[size]} rounded-xl overflow-hidden
        bg-gradient-to-br ${colors.gradient}
        transition-all duration-300 ease-out
        ${!disabled && onClick ? "cursor-pointer" : ""}
        ${!disabled && isPlayable ? `hover:scale-105 hover:-translate-y-2 hover:shadow-xl hover:${colors.glow}` : ""}
        ${disabled ? "opacity-60 grayscale" : ""}
        ${isPlayable ? `ring-2 ring-white/30 animate-pulse` : ""}
      `}
    >
      {/* Card border frame */}
      <div className="absolute inset-0 border border-white/10 rounded-xl pointer-events-none" />
      
      {/* Card content */}
      <div className="relative h-full flex flex-col p-3">
        {/* Header - Name */}
        <div className="bg-black/40 rounded-lg px-2 py-1 mb-2 backdrop-blur-sm">
          <h3 
            className="font-bold text-white text-center truncate"
            style={{ 
              fontFamily: "var(--font-display)",
              fontSize: size === "sm" ? "0.7rem" : size === "md" ? "0.85rem" : "1rem"
            }}
          >
            {card.name}
          </h3>
        </div>

        {/* Art area */}
        {renderArtArea()}

        {/* Stats */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-1 bg-red-900/70 px-2 py-1 rounded-lg backdrop-blur-sm">
            <span className="text-red-300 text-xs">⚔️</span>
            <span className="font-bold text-white" style={{ fontSize: size === "sm" ? "0.8rem" : "1rem" }}>
              {card.attack}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-blue-900/70 px-2 py-1 rounded-lg backdrop-blur-sm">
            <span className="text-blue-300 text-xs">🛡️</span>
            <span className="font-bold text-white" style={{ fontSize: size === "sm" ? "0.8rem" : "1rem" }}>
              {card.defense}
            </span>
          </div>
        </div>

        {/* Ability */}
        {showAbility && size !== "sm" && (
          <div className="bg-black/50 rounded-lg px-2 py-1 backdrop-blur-sm">
            <p 
              className={`${colors.accent} text-center leading-tight`}
              style={{ fontSize: size === "md" ? "0.6rem" : "0.7rem" }}
            >
              {card.ability}
            </p>
          </div>
        )}

        {/* Flavor text - only on large cards */}
        {size === "lg" && (
          <div className="mt-1">
            <p className="text-white/60 italic text-center text-xs">
              &quot;{card.flavorText}&quot;
            </p>
          </div>
        )}
      </div>

      {/* Playable indicator */}
      {isPlayable && !disabled && (
        <div className="absolute inset-0 border-2 border-white/50 rounded-xl pointer-events-none" />
      )}
    </div>
  );
}

function getCardEmoji(color: CardColor): string {
  const emojis: Record<CardColor, string> = {
    amber: "🔥",
    crimson: "💀",
    emerald: "🌿",
    violet: "✨",
    cyan: "❄️",
    rose: "💗",
    slate: "⚙️",
  };
  return emojis[color] || "⭐";
}

// Compact card for displaying in battle history
export function CardMini({ card }: { card: CardType }) {
  const colors = colorClasses[card.color] || colorClasses.slate;
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r ${colors.gradient}`}>
      <span className="font-semibold text-white text-sm" style={{ fontFamily: "var(--font-display)" }}>
        {card.name}
      </span>
      <span className="text-white/80 text-xs">
        ⚔️{card.attack} 🛡️{card.defense}
      </span>
    </div>
  );
}
