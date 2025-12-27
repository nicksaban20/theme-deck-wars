"use client";

interface ManaDisplayProps {
  current: number;
  max: number;
  size?: "sm" | "md" | "lg";
}

export function ManaDisplay({ current, max, size = "md" }: ManaDisplayProps) {
  const sizeClasses = {
    sm: "text-xs w-8 h-8",
    md: "text-sm w-10 h-10",
    lg: "text-base w-12 h-12",
  };

  const canAfford = (cost: number) => current >= cost;

  return (
    <div className="flex items-center gap-1">
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 
                      flex items-center justify-center font-bold text-white shadow-lg
                      border-2 border-white/20`}>
        {current}
      </div>
      <span className="text-white/60 text-xs">/ {max}</span>
    </div>
  );
}

export function ManaCostBadge({ cost, available, size = "md" }: { cost: number; available: number; size?: "sm" | "md" | "lg" }) {
  const canAfford = available >= cost;
  const sizeClasses = {
    sm: "text-[10px] w-5 h-5",
    md: "text-xs w-6 h-6",
    lg: "text-sm w-7 h-7",
  };

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold
                  ${canAfford 
                    ? 'bg-gradient-to-br from-blue-400 to-purple-500 text-white shadow-md' 
                    : 'bg-gray-600 text-gray-300 opacity-50'
                  } border border-white/20`}
      title={`Mana cost: ${cost}`}
    >
      {cost}
    </div>
  );
}

