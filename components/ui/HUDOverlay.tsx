"use client";

import { cn } from "@/lib/utils";

interface HUDOverlayProps {
  teamColor?: string;
  className?: string;
}

export function HUDOverlay({ teamColor = "#ffffff", className }: HUDOverlayProps) {
  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}>
      {/* Corner brackets */}
      <CornerBracket position="top-left" color={teamColor} />
      <CornerBracket position="top-right" color={teamColor} />
      <CornerBracket position="bottom-left" color={teamColor} />
      <CornerBracket position="bottom-right" color={teamColor} />

      {/* Center divider line */}
      <div className="absolute left-1/2 top-[15%] bottom-[15%] w-px -translate-x-1/2">
        <div
          className="h-full w-full opacity-20"
          style={{
            background: `linear-gradient(180deg, transparent 0%, ${teamColor} 20%, ${teamColor} 80%, transparent 100%)`,
          }}
        />
        {/* Animated pulse on line */}
        <div
          className="absolute top-0 left-0 w-full h-20 animate-scan-down"
          style={{
            background: `linear-gradient(180deg, transparent 0%, ${teamColor} 50%, transparent 100%)`,
          }}
        />
      </div>

      {/* Horizontal accent lines */}
      <div
        className="absolute top-[20%] left-8 right-8 h-px opacity-10"
        style={{ background: `linear-gradient(90deg, ${teamColor}, transparent 30%, transparent 70%, ${teamColor})` }}
      />
      <div
        className="absolute bottom-[20%] left-8 right-8 h-px opacity-10"
        style={{ background: `linear-gradient(90deg, ${teamColor}, transparent 30%, transparent 70%, ${teamColor})` }}
      />

      <style jsx>{`
        @keyframes scan-down {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(500%); opacity: 0; }
        }
        .animate-scan-down {
          animation: scan-down 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

interface CornerBracketProps {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  color: string;
}

function CornerBracket({ position, color }: CornerBracketProps) {
  const positionClasses = {
    "top-left": "top-6 left-6",
    "top-right": "top-6 right-6 rotate-90",
    "bottom-left": "bottom-6 left-6 -rotate-90",
    "bottom-right": "bottom-6 right-6 rotate-180",
  };

  return (
    <div className={cn("absolute w-16 h-16", positionClasses[position])}>
      <svg viewBox="0 0 64 64" className="w-full h-full" style={{ color }}>
        <path
          d="M0 24 L0 0 L24 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.4"
        />
        <path
          d="M0 16 L0 0 L16 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.6"
        />
        {/* Animated dot */}
        <circle cx="0" cy="0" r="2" fill="currentColor" opacity="0.8">
          <animate
            attributeName="opacity"
            values="0.8;0.3;0.8"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </div>
  );
}
