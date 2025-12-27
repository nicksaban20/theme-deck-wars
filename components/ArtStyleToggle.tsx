"use client";

import { useArtStyle } from "@/lib/ArtStyleContext";
import { CardArtStyle } from "@/lib/types";

interface ArtStyleToggleProps {
  compact?: boolean;
}

const artStyles: { value: CardArtStyle; label: string; icon: string; description: string }[] = [
  {
    value: "pattern",
    label: "Patterns",
    icon: "🎨",
    description: "Classic gradient patterns (fastest)"
  },
  {
    value: "local-ai",
    label: "Local AI",
    icon: "💻",
    description: "Fast local AI (requires server)"
  },
  {
    value: "ai",
    label: "Cloud AI",
    icon: "☁️",
    description: "Cloud AI images (may be slow)"
  },
  {
    value: "icons",
    label: "Icons",
    icon: "⚔️",
    description: "Game icons (consistent style)"
  },
];

export function ArtStyleToggle({ compact = false }: ArtStyleToggleProps) {
  const { artStyle, setArtStyle } = useArtStyle();

  if (compact) {
    return (
      <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
        {artStyles.map((style) => (
          <button
            key={style.value}
            onClick={() => setArtStyle(style.value)}
            className={`px-3 py-1.5 rounded-md text-sm transition-all ${artStyle === style.value
                ? "bg-violet-500 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            title={style.description}
          >
            {style.icon}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">Card Art Style</h3>
      <div className="grid grid-cols-3 gap-2">
        {artStyles.map((style) => (
          <button
            key={style.value}
            onClick={() => setArtStyle(style.value)}
            className={`p-3 rounded-xl border transition-all ${artStyle === style.value
                ? "bg-violet-500/20 border-violet-500/50 text-white"
                : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30 hover:text-white"
              }`}
          >
            <span className="text-2xl block mb-1">{style.icon}</span>
            <span className="text-sm font-medium">{style.label}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3 text-center">
        {artStyles.find(s => s.value === artStyle)?.description}
      </p>
    </div>
  );
}

