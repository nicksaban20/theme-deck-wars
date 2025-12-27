"use client";

import { useState, useEffect, useMemo } from "react";
import { Card as CardType, CardColor, CardArtStyle } from "@/lib/types";
import { getCardDefaults } from "@/lib/gameLogic";
import { PerkBadge } from "./PerkBadge";
import { ManaCostBadge } from "./ManaDisplay";

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

// Inline SVG icons as fallback (guaranteed to work)
const fallbackIcons: Record<string, string> = {
  sword: `<svg viewBox="0 0 512 512" fill="currentColor"><path d="M507.31 72.57L439.43 4.69c-6.25-6.25-16.38-6.25-22.63 0l-22.63 22.63c-6.25 6.25-6.25 16.38 0 22.63l5.66 5.66L292.69 162.75l-34.34-34.34c-6.25-6.25-16.38-6.25-22.63 0l-11.31 11.31c-6.25 6.25-6.25 16.38 0 22.63l34.34 34.34-192 192c-6.25 6.25-6.25 16.38 0 22.63l22.63 22.63c6.25 6.25 16.38 6.25 22.63 0l192-192 34.34 34.34c6.25 6.25 16.38 6.25 22.63 0l11.31-11.31c6.25-6.25 6.25-16.38 0-22.63l-34.34-34.34L445.17 101.5l5.66 5.66c6.25 6.25 16.38 6.25 22.63 0l22.63-22.63c6.25-6.25 6.25-16.38 0-22.63l11.22-11.31z"/></svg>`,
  shield: `<svg viewBox="0 0 512 512" fill="currentColor"><path d="M466.5 83.7l-192-80a48.15 48.15 0 00-36.9 0l-192 80C27.7 91.1 16 108.6 16 128c0 198.5 114.5 335.7 221.5 380.3 11.8 4.9 25.1 4.9 36.9 0C360.1 472.6 496 349.3 496 128c0-19.4-11.7-36.9-29.5-44.3z"/></svg>`,
  skull: `<svg viewBox="0 0 512 512" fill="currentColor"><path d="M256 0C114.6 0 0 100.3 0 224c0 70.1 36.9 132.6 94.5 173.7 9.6 6.9 15.2 18.1 13.5 29.9l-9.4 66.2c-1.4 9.9 6 18.6 16.1 18.6H256h141.3c10.1 0 17.5-8.7 16.1-18.6l-9.4-66.2c-1.7-11.7 3.8-23 13.5-29.9C475.1 356.6 512 294.1 512 224 512 100.3 397.4 0 256 0zm-96 320c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48zm192 0c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48z"/></svg>`,
  fire: `<svg viewBox="0 0 384 512" fill="currentColor"><path d="M216 23.86c0-23.8-30.65-32.77-44.15-13.04C48 191.85 224 200 224 288c0 35.63-29.11 64.46-64.85 63.99-35.17-.45-63.15-29.77-63.15-64.94v-85.51c0-21.7-26.47-32.23-41.43-16.5C27.8 213.16 0 261.33 0 320c0 105.87 86.13 192 192 192s192-86.13 192-192c0-170.29-168-193-168-296.14z"/></svg>`,
  star: `<svg viewBox="0 0 576 512" fill="currentColor"><path d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z"/></svg>`,
  heart: `<svg viewBox="0 0 512 512" fill="currentColor"><path d="M462.3 62.6C407.5 15.9 326 24.3 275.7 76.2L256 96.5l-19.7-20.3C186.1 24.3 104.5 15.9 49.7 62.6c-62.8 53.6-66.1 149.8-9.9 207.9l193.5 199.8c12.5 12.9 32.8 12.9 45.3 0l193.5-199.8c56.3-58.1 53-154.3-9.8-207.9z"/></svg>`,
  crown: `<svg viewBox="0 0 640 512" fill="currentColor"><path d="M528 448H112c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h416c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16zm64-320c-26.5 0-48 21.5-48 48 0 7.1 1.6 13.7 4.4 19.8L476 239.2c-15.4 9.2-35.3 4-44.2-11.6L350.3 85C361 76.2 368 63 368 48c0-26.5-21.5-48-48-48s-48 21.5-48 48c0 15 7 28.2 17.7 37l-81.5 142.6c-8.9 15.6-28.9 20.8-44.2 11.6l-72.3-43.4c2.7-6 4.4-12.7 4.4-19.8 0-26.5-21.5-48-48-48S0 149.5 0 176s21.5 48 48 48c2.6 0 5.2-.4 7.7-.8L128 416h384l72.3-192.8c2.5.4 5.1.8 7.7.8 26.5 0 48-21.5 48-48s-21.5-48-48-48z"/></svg>`,
  lightning: `<svg viewBox="0 0 320 512" fill="currentColor"><path d="M296 160H180.6l42.6-129.8C227.2 15 215.7 0 200 0H56C44 0 33.8 8.9 32.2 20.8l-32 240C-1.7 275.2 9.5 288 24 288h118.7L96.6 482.5c-3.6 15.2 8 29.5 23.3 29.5 8.4 0 16.4-4.4 20.8-12l176-304c9.3-15.9-2.2-36-20.7-36z"/></svg>`,
  leaf: `<svg viewBox="0 0 576 512" fill="currentColor"><path d="M546.2 9.7c-5.6-12.5-21.6-13-28.3-1.2C486.9 62.4 431.4 96 368 96h-80C182 96 96 182 96 288c0 7 .8 13.7 1.5 20.5C161.3 262.8 253.4 224 384 224c8.8 0 16 7.2 16 16s-7.2 16-16 16C132.6 256 26 410.1 2.4 468c-6.6 16.3 1.2 34.9 17.5 41.6 16.4 6.8 35-1.1 41.8-17.3 1.5-3.6 20.9-47.9 71.9-90.6 32.4 43.9 94 85.8 174.9 77.2C465.5 467.5 576 326.7 576 154.3c0-50.2-10.8-102.2-29.8-144.6z"/></svg>`,
  gem: `<svg viewBox="0 0 576 512" fill="currentColor"><path d="M485.5 0L576 160H0L90.5 0h395zm-129 192L288 448 19.9 192h336.6zm148.6 0L288 448 505.1 192h0z"/></svg>`,
  potion: `<svg viewBox="0 0 448 512" fill="currentColor"><path d="M446.6 222.7c-1.8-8-6.8-15.4-12.5-22.1L336 89.3V32h-16V0H128v32h-16v57.3L13.8 200.6C8.1 207.3 3.2 214.7 1.4 222.7c-4.2 19.4 2.4 39.1 17.4 51.9L160 384v96c0 17.7 14.3 32 32 32h64c17.7 0 32-14.3 32-32v-96l141.2-109.4c15-12.8 21.6-32.5 17.4-51.9z"/></svg>`,
};

export function Card({
  card,
  onClick,
  disabled = false,
  isPlayable = false,
  size = "md",
  showAbility = true,
  artStyle = "pattern",
}: CardProps) {
  // Memoize card defaults to avoid recalculating on every render
  const cardWithDefaults = useMemo(() => getCardDefaults(card), [card]);
  const colors = useMemo(() => colorClasses[card.color] || colorClasses.slate, [card.color]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const rarityColors = useMemo(() => ({
    common: "text-gray-300",
    rare: "text-blue-300",
    epic: "text-purple-300",
  }), []);

  const rarityIcons = useMemo(() => ({
    common: "⚪",
    rare: "🔵",
    epic: "🟣",
  }), []);

  // Fetch AI image when in AI mode (cloud or local)
  useEffect(() => {
    if (artStyle !== "ai" && artStyle !== "local-ai") {
      setImageUrl(null);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    // Create a delay based on card ID to stagger requests
    const hash = card.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const delay = (hash % 5) * 400; // 0-1600ms stagger

    const timeoutId = setTimeout(() => {
      fetchImage();
    }, delay);

    return () => clearTimeout(timeoutId);

    async function fetchImage() {
      setIsLoading(true);
      setHasError(false);

      try {
        const prompt = card.imagePrompt || `${card.name}, fantasy trading card art`;

        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, cardId: card.id, artStyle }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}: Failed to generate image`);
        }

        const data = await response.json();
        if (data.image) {
          setImageUrl(data.image);
        } else {
          throw new Error("No image in response");
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn(`[Card] Image request timeout for ${card.name}`);
        } else {
          console.error(`[Card] Error fetching AI image for ${card.name}:`, error);
        }
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }
  }, [artStyle, card.id, card.imagePrompt, card.name]);

  const renderFallbackIcon = () => {
    const keyword = card.iconKeyword?.toLowerCase() || "sword";
    const svgContent = fallbackIcons[keyword] || fallbackIcons.sword;

    const iconSize = size === "sm" ? "w-10 h-10" : size === "md" ? "w-14 h-14" : "w-18 h-18";

    return (
      <div
        className={`${iconSize} text-white`}
        style={{
          filter: `drop-shadow(0 0 12px ${colors.hex}) drop-shadow(0 0 4px ${colors.hex})`,
        }}
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

    // AI Art mode (Cloud or Local)
    if (artStyle === "ai" || artStyle === "local-ai") {
      // Error fallback - show icon
      if (hasError) {
        return (
          <div
            className="flex-1 rounded-lg mb-2 flex items-center justify-center overflow-hidden relative"
            style={{ backgroundColor: `${colors.hex}15` }}
          >
            <div className="absolute inset-0 card-pattern-grid opacity-20" />
            <div className="relative z-10 flex flex-col items-center justify-center">
              {renderFallbackIcon()}
              <span className="text-[8px] text-white/40 mt-1">Art unavailable</span>
            </div>
          </div>
        );
      }

      return (
        <div className="flex-1 bg-black/30 rounded-lg mb-2 overflow-hidden relative">
          {/* Pattern background while loading */}
          <div className="absolute inset-0 card-pattern-grid opacity-30" />

          {/* Loading state */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mb-1" />
              <span className="text-[9px] text-white/50">
                {artStyle === "local-ai" ? "Local AI..." : "Generating..."}
              </span>
            </div>
          )}

          {/* The actual image - works with both base64 and R2 URLs */}
          {imageUrl && (
            <img
              src={imageUrl}
              alt={card.name}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
              onError={() => setHasError(true)}
            />
          )}
        </div>
      );
    }

    // Icons mode - use inline SVG icons (instant, no loading needed)
    if (artStyle === "icons") {
      return (
        <div
          className="flex-1 rounded-lg mb-2 flex items-center justify-center overflow-hidden relative"
          style={{ backgroundColor: `${colors.hex}15` }}
        >
          {/* Subtle pattern background */}
          <div className="absolute inset-0 card-pattern-dots opacity-10" />

          {/* Icon - renders instantly with inline SVG */}
          <div className="relative z-10 flex items-center justify-center">
            {renderFallbackIcon()}
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
        {/* Header - Name, Mana Cost, Rarity */}
        <div className="bg-black/40 rounded-lg px-2 py-1 mb-2 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-1">
            <ManaCostBadge
              cost={cardWithDefaults.manaCost}
              available={999}
              size={size === "sm" ? "sm" : "md"}
            />
            <h3
              className="font-bold text-white text-center truncate flex-1"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: size === "sm" ? "0.7rem" : size === "md" ? "0.85rem" : "1rem"
              }}
            >
              {card.name}
            </h3>
            <div className={`${rarityColors[cardWithDefaults.rarity]} text-xs`} title={`${cardWithDefaults.rarity} card`}>
              {rarityIcons[cardWithDefaults.rarity]}
            </div>
          </div>
          {cardWithDefaults.perks && Object.keys(cardWithDefaults.perks).length > 0 && (
            <div className="mt-1 flex justify-center">
              <PerkBadge perks={cardWithDefaults.perks} size={size === "sm" ? "sm" : "md"} />
            </div>
          )}
        </div>

        {/* Art area */}
        {renderArtArea()}

        {/* Stats Row 1: Attack, Defense, Speed */}
        <div className="flex justify-between items-center mb-1 gap-1">
          <div className="flex items-center gap-1 bg-red-900/70 px-2 py-1 rounded-lg backdrop-blur-sm flex-1">
            <span className="text-red-300 text-xs">⚔️</span>
            <span className="font-bold text-white" style={{ fontSize: size === "sm" ? "0.75rem" : "0.9rem" }}>
              {cardWithDefaults.attack}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-blue-900/70 px-2 py-1 rounded-lg backdrop-blur-sm flex-1">
            <span className="text-blue-300 text-xs">🛡️</span>
            <span className="font-bold text-white" style={{ fontSize: size === "sm" ? "0.75rem" : "0.9rem" }}>
              {cardWithDefaults.defense}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-purple-900/70 px-2 py-1 rounded-lg backdrop-blur-sm" title={`Speed: ${cardWithDefaults.speed}`}>
            <span className="text-purple-300 text-xs">⚡</span>
            <span className="font-bold text-white" style={{ fontSize: size === "sm" ? "0.7rem" : "0.8rem" }}>
              {cardWithDefaults.speed}
            </span>
          </div>
        </div>

        {/* Stats Row 2: Health (if present) */}
        {cardWithDefaults.health !== undefined && cardWithDefaults.health > 0 && (
          <div className="flex justify-center items-center mb-1">
            <div className="flex items-center gap-1 bg-green-900/70 px-2 py-0.5 rounded-lg backdrop-blur-sm">
              <span className="text-green-300 text-xs">❤️</span>
              <span className="font-bold text-white text-xs">
                {cardWithDefaults.health} HP
              </span>
            </div>
          </div>
        )}

        {/* Perks/Abilities - Show structured perks if available, otherwise fallback to ability text */}
        {showAbility && size !== "sm" && (
          <div className="bg-black/50 rounded-lg px-2 py-1 backdrop-blur-sm">
            {cardWithDefaults.perks && Object.keys(cardWithDefaults.perks).length > 0 ? (
              <div className="space-y-0.5">
                {/* Passive Perks */}
                {cardWithDefaults.perks.passive && cardWithDefaults.perks.passive.length > 0 && (
                  <div className="text-center">
                    {cardWithDefaults.perks.passive.map((perk, i) => (
                      <p key={i} className={`${colors.accent} text-xs leading-tight`}>
                        {perk.type === 'damageReduction' && `🛡️ -${perk.value} damage taken`}
                        {perk.type === 'damageBoost' && `⚔️ +${perk.value} attack`}
                        {perk.type === 'healPerTurn' && `💚 +${perk.value} HP/turn`}
                        {perk.type === 'drawCard' && `📖 Draw card`}
                      </p>
                    ))}
                  </div>
                )}
                {/* Triggered Perks */}
                {cardWithDefaults.perks.triggered && cardWithDefaults.perks.triggered.length > 0 && (
                  <div className="text-center">
                    {cardWithDefaults.perks.triggered.map((perk, i) => (
                      <p key={i} className={`${colors.accent} text-xs leading-tight`}>
                        ✨ {perk.effect}
                      </p>
                    ))}
                  </div>
                )}
                {/* Combo Perks */}
                {cardWithDefaults.perks.combo && cardWithDefaults.perks.combo.length > 0 && (
                  <div className="text-center">
                    {cardWithDefaults.perks.combo.map((perk, i) => (
                      <p key={i} className={`${colors.accent} text-xs leading-tight`}>
                        🔗 {perk.comboEffect}
                      </p>
                    ))}
                  </div>
                )}
                {/* Status Effects */}
                {cardWithDefaults.perks.status && cardWithDefaults.perks.status.length > 0 && (
                  <div className="text-center">
                    {cardWithDefaults.perks.status.map((effect, i) => (
                      <p key={i} className={`${colors.accent} text-xs leading-tight`}>
                        {effect.type}: {effect.value} {effect.duration ? `(${effect.duration} turns)` : ''}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ) : cardWithDefaults.ability ? (
              <p
                className={`${colors.accent} text-center leading-tight`}
                style={{ fontSize: size === "md" ? "0.6rem" : "0.7rem" }}
              >
                {cardWithDefaults.ability}
              </p>
            ) : null}
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
  const cardWithDefaults = getCardDefaults(card);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r ${colors.gradient}`}>
      <span className="font-semibold text-white text-sm" style={{ fontFamily: "var(--font-display)" }}>
        {card.name}
      </span>
      <span className="text-white/80 text-xs">
        ⚔️{cardWithDefaults.attack} 🛡️{cardWithDefaults.defense} 💎{cardWithDefaults.manaCost} ⚡{cardWithDefaults.speed}
        {cardWithDefaults.health !== undefined && cardWithDefaults.health > 0 && ` ❤️${cardWithDefaults.health}`}
      </span>
    </div>
  );
}
