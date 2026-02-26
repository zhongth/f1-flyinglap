"use client";

import { cn } from "@/lib/utils";

interface GlowOrbProps {
  color: string;
  position: "left" | "right";
  className?: string;
}

export function GlowOrb({ color, position, className }: GlowOrbProps) {
  return (
    <div
      className={cn(
        "absolute top-1/2 -translate-y-1/2 w-[600px] h-[800px] pointer-events-none",
        position === "left" ? "-left-48" : "-right-48",
        className
      )}
    >
      {/* Main glow */}
      <div
        className="absolute inset-0 rounded-full blur-[120px] opacity-30 animate-pulse"
        style={{
          background: `radial-gradient(ellipse at center, ${color} 0%, transparent 70%)`,
          animationDuration: "4s",
        }}
      />

      {/* Secondary glow - more intense, smaller */}
      <div
        className="absolute inset-[20%] rounded-full blur-[80px] opacity-20"
        style={{
          background: `radial-gradient(ellipse at center, ${color} 0%, transparent 60%)`,
        }}
      />

      {/* Core highlight */}
      <div
        className="absolute inset-[35%] rounded-full blur-[40px] opacity-40"
        style={{
          background: `radial-gradient(ellipse at center, white 0%, ${color} 30%, transparent 70%)`,
        }}
      />
    </div>
  );
}
