"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface KineticNumberProps {
  value: number; // in milliseconds
  duration?: number;
  className?: string;
}

export function KineticNumber({
  value,
  duration = 1,
  className,
}: KineticNumberProps) {
  const numberRef = useRef<HTMLSpanElement>(null);
  const [displayValue, setDisplayValue] = useState("0.000");
  const previousValue = useRef(0);

  // Determine if driver 1 is faster (negative value)
  const isFaster = value < 0;

  // Format milliseconds to display string (e.g., -154 -> "-0.154")
  const formatValue = (ms: number): string => {
    const sign = ms >= 0 ? "+" : "-";
    const absMs = Math.abs(ms);
    const seconds = Math.floor(absMs / 1000);
    const milliseconds = Math.floor(absMs % 1000);
    return `${sign}${seconds}.${milliseconds.toString().padStart(3, "0")}`;
  };

  useEffect(() => {
    if (!numberRef.current) return;

    const obj = { val: previousValue.current };

    gsap.to(obj, {
      val: value,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        setDisplayValue(formatValue(Math.round(obj.val)));
      },
      onComplete: () => {
        previousValue.current = value;
        setDisplayValue(formatValue(value));
      },
    });
  }, [value, duration]);

  return (
    <div className={cn("text-center", className)}>
      {/* Label */}
      <p className="text-xs text-white/50 uppercase tracking-widest mb-2">
        Median Qualifying Gap
      </p>

      {/* Main number */}
      <span
        ref={numberRef}
        className="font-f1-bold text-7xl md:text-8xl lg:text-9xl tracking-tight text-white text-glow-subtle"
      >
        {displayValue}
      </span>

      {/* Unit label */}
      <p className="text-lg text-white/40 mt-1">seconds</p>

      {/* Faster/Slower indicator */}
      <div
        className={cn(
          "mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm",
          isFaster
            ? "bg-[var(--gap-faster)]/10 text-[var(--gap-faster)]"
            : value > 0
            ? "bg-[var(--gap-slower)]/10 text-[var(--gap-slower)]"
            : "bg-white/10 text-white/50"
        )}
      >
        <span className="w-2 h-2 rounded-full bg-current" />
        <span className="font-f1 uppercase tracking-wider">
          {isFaster ? "Driver 1 Faster" : value > 0 ? "Driver 2 Faster" : "Equal"}
        </span>
      </div>
    </div>
  );
}

// Simpler version for smaller displays
interface GapBadgeProps {
  value: number;
  className?: string;
}

export function GapBadge({ value, className }: GapBadgeProps) {
  const isFaster = value < 0;
  const colorClass = isFaster ? "gap-faster" : value > 0 ? "gap-slower" : "gap-neutral";

  const formatValue = (ms: number): string => {
    const sign = ms >= 0 ? "+" : "-";
    const absMs = Math.abs(ms);
    const seconds = Math.floor(absMs / 1000);
    const milliseconds = Math.floor(absMs % 1000);
    return `${sign}${seconds}.${milliseconds.toString().padStart(3, "0")}s`;
  };

  return (
    <span
      className={cn(
        "font-f1-bold text-lg tracking-tight",
        colorClass,
        className
      )}
    >
      {formatValue(value)}
    </span>
  );
}
