"use client";

import { useState } from "react";
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

// Game-icons.net CDN URL pattern
const GAME_ICONS_CDN = "https://game-icons.net/icons/ffffff/000000";

// Map icon keywords to game-icons.net paths
const iconPathMap: Record<string, string> = {
  sword: "1x1/lorc/crossed-swords.svg",
  shield: "1x1/lorc/shield.svg",
  skull: "1x1/lorc/skull.svg",
  fire: "1x1/lorc/flame.svg",
  lightning: "1x1/lorc/lightning-helix.svg",
  heart: "1x1/lorc/heart-plus.svg",
  star: "1x1/lorc/star-formation.svg",
  crown: "1x1/lorc/crown.svg",
  dragon: "1x1/lorc/dragon-head.svg",
  wolf: "1x1/lorc/wolf-head.svg",
  eagle: "1x1/lorc/eagle-head.svg",
  snake: "1x1/lorc/snake.svg",
  spider: "1x1/lorc/spider-face.svg",
  castle: "1x1/lorc/castle.svg",
  tower: "1x1/lorc/tower-flag.svg",
  gem: "1x1/lorc/gem.svg",
  potion: "1x1/lorc/potion-ball.svg",
  scroll: "1x1/lorc/scroll-unfurled.svg",
  book: "1x1/lorc/book-cover.svg",
  wand: "1x1/lorc/magic-wand.svg",
  staff: "1x1/lorc/wizard-staff.svg",
  bow: "1x1/lorc/high-shot.svg",
  arrow: "1x1/lorc/arrow-cluster.svg",
  axe: "1x1/lorc/battle-axe.svg",
  hammer: "1x1/lorc/hammer-drop.svg",
  dagger: "1x1/lorc/stiletto.svg",
  claw: "1x1/lorc/wolverine-claws.svg",
  fist: "1x1/lorc/fist.svg",
  boot: "1x1/lorc/boot-stomp.svg",
  helmet: "1x1/lorc/viking-helmet.svg",
  armor: "1x1/lorc/breastplate.svg",
  ring: "1x1/lorc/ring.svg",
  eye: "1x1/lorc/eye-target.svg",
  moon: "1x1/lorc/moon.svg",
  sun: "1x1/lorc/sun.svg",
  cloud: "1x1/lorc/cloud.svg",
  leaf: "1x1/lorc/leaf.svg",
  tree: "1x1/lorc/oak.svg",
  mountain: "1x1/lorc/mountain-peak.svg",
  wave: "1x1/lorc/wave-crest.svg",
  bomb: "1x1/lorc/bomb.svg",
  trap: "1x1/lorc/bear-trap.svg",
  key: "1x1/lorc/key.svg",
  lock: "1x1/lorc/padlock.svg",
  chain: "1x1/lorc/chain.svg",
  wing: "1x1/lorc/feathered-wing.svg",
  horn: "1x1/lorc/horn-call.svg",
};

function getIconUrl(keyword: string): string {
  const path = iconPathMap[keyword.toLowerCase()] || iconPathMap.sword;
  return `${GAME_ICONS_CDN}/${path}`;
}

function getPollinationsUrl(prompt: string, width: number = 300, height: number = 400): string {
  const encodedPrompt = encodeURIComponent(prompt + ", trading card game art, fantasy style, high quality");
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true`;
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

  const artSizes = {
    sm: { width: 80, height: 60 },
    md: { width: 140, height: 100 },
    lg: { width: 180, height: 140 },
  };

  const renderArtArea = () => {
    // Pattern mode (default)
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

    // AI Art mode (Pollinations.ai)
    if (artStyle === "ai") {
      const imageUrl = card.imagePrompt 
        ? getPollinationsUrl(card.imagePrompt, artSizes[size].width * 2, artSizes[size].height * 2)
        : getPollinationsUrl(card.name);

      return (
        <div className="flex-1 bg-black/30 rounded-lg mb-2 overflow-hidden relative">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          {imageError ? (
            <div className="absolute inset-0 flex items-center justify-center card-pattern-dots opacity-50">
              <span className="text-3xl opacity-40">{getCardEmoji(card.color)}</span>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt={card.name}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          )}
        </div>
      );
    }

    // Icons mode (Game-icons.net)
    if (artStyle === "icons") {
      const iconUrl = getIconUrl(card.iconKeyword || "sword");

      return (
        <div 
          className="flex-1 rounded-lg mb-2 flex items-center justify-center overflow-hidden relative"
          style={{ backgroundColor: `${colors.hex}30` }}
        >
          <div className="absolute inset-0 card-pattern-dots opacity-20" />
          <div 
            className="w-16 h-16 md:w-20 md:h-20 relative z-10"
            style={{ 
              filter: `drop-shadow(0 0 10px ${colors.hex})`,
            }}
          >
            <img
              src={iconUrl}
              alt={card.iconKeyword || "icon"}
              className="w-full h-full"
              style={{ 
                filter: "invert(1)",
                opacity: 0.9,
              }}
              onError={(e) => {
                // Fallback to emoji if icon fails to load
                (e.target as HTMLImageElement).style.display = "none";
              }}
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
