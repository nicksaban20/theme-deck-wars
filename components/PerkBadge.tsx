"use client";

import { CardPerks } from "@/lib/types";

interface PerkBadgeProps {
  perks: CardPerks;
  size?: "sm" | "md";
}

export function PerkBadge({ perks, size = "md" }: PerkBadgeProps) {
  const hasPerks = 
    (perks.passive && perks.passive.length > 0) ||
    (perks.triggered && perks.triggered.length > 0) ||
    (perks.combo && perks.combo.length > 0) ||
    (perks.status && perks.status.length > 0);

  if (!hasPerks) return null;

  const sizeClasses = size === "sm" ? "text-[8px] px-1 py-0.5" : "text-[10px] px-1.5 py-0.5";
  const iconSize = size === "sm" ? "w-2 h-2" : "w-3 h-3";

  const perkCount = 
    (perks.passive?.length || 0) +
    (perks.triggered?.length || 0) +
    (perks.combo?.length || 0) +
    (perks.status?.length || 0);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {perks.passive && perks.passive.length > 0 && (
        <span 
          className={`${sizeClasses} bg-blue-500/20 text-blue-200 rounded border border-blue-400/30 flex items-center gap-1`}
          title="Passive ability"
        >
          <span className={iconSize}>⚡</span>
          <span>{perks.passive.length}</span>
        </span>
      )}
      {perks.triggered && perks.triggered.length > 0 && (
        <span 
          className={`${sizeClasses} bg-purple-500/20 text-purple-200 rounded border border-purple-400/30 flex items-center gap-1`}
          title="Triggered ability"
        >
          <span className={iconSize}>✨</span>
          <span>{perks.triggered.length}</span>
        </span>
      )}
      {perks.combo && perks.combo.length > 0 && (
        <span 
          className={`${sizeClasses} bg-yellow-500/20 text-yellow-200 rounded border border-yellow-400/30 flex items-center gap-1`}
          title="Combo ability"
        >
          <span className={iconSize}>🔗</span>
          <span>{perks.combo.length}</span>
        </span>
      )}
      {perks.status && perks.status.length > 0 && (
        <span 
          className={`${sizeClasses} bg-green-500/20 text-green-200 rounded border border-green-400/30 flex items-center gap-1`}
          title="Status effect"
        >
          <span className={iconSize}>💫</span>
          <span>{perks.status.length}</span>
        </span>
      )}
    </div>
  );
}

