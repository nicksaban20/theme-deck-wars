"use client";

import { STARTING_HP } from "@/lib/gameLogic";

interface HealthBarProps {
  hp: number;
  maxHp?: number;
  playerName: string;
  isCurrentTurn?: boolean;
  isOpponent?: boolean;
  lastDamage?: number | null;
}

export function HealthBar({
  hp,
  maxHp = STARTING_HP,
  playerName,
  isCurrentTurn = false,
  isOpponent = false,
  lastDamage = null,
}: HealthBarProps) {
  const percentage = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  
  const getBarColor = () => {
    if (percentage > 60) return "from-emerald-500 to-green-400";
    if (percentage > 30) return "from-amber-500 to-yellow-400";
    return "from-red-600 to-rose-500";
  };

  return (
    <div className={`
      relative p-4 rounded-2xl border transition-all duration-300
      ${isCurrentTurn 
        ? "bg-violet-500/10 border-violet-500/40 shadow-lg shadow-violet-500/20" 
        : "bg-white/5 border-white/10"
      }
      ${isOpponent ? "" : ""}
    `}>
      {/* Turn indicator */}
      {isCurrentTurn && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-violet-500 rounded-full text-xs font-semibold text-white">
          {isOpponent ? "Their Turn" : "Your Turn"}
        </div>
      )}
      
      {/* Player name */}
      <div className="flex items-center justify-between mb-2">
        <span 
          className="font-semibold text-white"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {playerName}
        </span>
        <div className="flex items-center gap-2">
          {lastDamage !== null && lastDamage > 0 && (
            <span className="text-red-400 font-bold animate-bounce">
              -{lastDamage}
            </span>
          )}
          <span className={`font-bold text-lg ${hp <= 5 ? "text-red-400" : "text-white"}`}>
            {hp}/{maxHp}
          </span>
        </div>
      </div>

      {/* Health bar */}
      <div className="relative h-4 bg-black/40 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getBarColor()} transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
        </div>
        
        {/* Segments */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: maxHp / 5 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 border-r border-black/30 last:border-r-0"
            />
          ))}
        </div>
      </div>

      {/* HP pips for visual clarity */}
      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <span>0</span>
        <span>{maxHp / 2}</span>
        <span>{maxHp}</span>
      </div>
    </div>
  );
}

