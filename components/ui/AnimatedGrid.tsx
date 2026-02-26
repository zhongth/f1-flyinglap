"use client";

import { cn } from "@/lib/utils";

interface AnimatedGridProps {
  className?: string;
  teamColor?: string;
}

export function AnimatedGrid({ className, teamColor = "#ffffff" }: AnimatedGridProps) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      {/* Base grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(${teamColor}20 1px, transparent 1px),
            linear-gradient(90deg, ${teamColor}20 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Animated scan line */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(180deg, transparent 0%, ${teamColor}08 50%, transparent 100%)`,
          backgroundSize: "100% 200%",
          backgroundRepeat: "no-repeat",
          animation: "scan 8s linear infinite",
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.8) 100%)",
        }}
      />

      {/* Top fade */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[var(--background)] to-transparent" />

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--background)] to-transparent" />

      <style jsx>{`
        @keyframes scan {
          0% { background-position: 0% 0%; }
          100% { background-position: 0% 200%; }
        }
      `}</style>
    </div>
  );
}
