"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface VSBadgeProps {
  value: number;
  teamColor: string;
  driver1Name: string;
  driver2Name: string;
  driver1Abbreviation: string;
  driver2Abbreviation: string;
  driver1H2HWins: number;
  driver2H2HWins: number;
  raceCount: number;
  timeScope: "season" | "last5";
  onTimeScopeChange: () => void;
  className?: string;
}

export function VSBadge({
  value,
  teamColor,
  driver1Abbreviation,
  driver2Abbreviation,
  driver1H2HWins,
  driver2H2HWins,
  timeScope,
  onTimeScopeChange,
  className,
}: VSBadgeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayValue, setDisplayValue] = useState("0.000%");
  const previousValue = useRef(0);

  const formatValue = (ms: number): string => {
    const absMs = Math.abs(ms);
    const seconds = Math.floor(absMs / 1000);
    const milliseconds = Math.floor(absMs % 1000);
    return `${seconds}.${milliseconds.toString().padStart(3, "0")}%`;
  };

  useEffect(() => {
    const obj = { val: previousValue.current };

    gsap.to(obj, {
      val: value,
      duration: 1.5,
      ease: "power2.out",
      onUpdate: () => {
        setDisplayValue(formatValue(Math.round(obj.val)));
      },
      onComplete: () => {
        previousValue.current = value;
        setDisplayValue(formatValue(value));
      },
    });
  }, [value]);

  // Entry animation
  useEffect(() => {
    if (!containerRef.current) return;

    gsap.fromTo(
      containerRef.current,
      { scale: 0.9, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: 0.8,
        ease: "back.out(1.4)",
        delay: 0.2,
      }
    );
  }, []);

  const isFaster = value < 0; // driver1 is faster when value is negative

  // Slider: calculate thumb position (center=50%)
  const maxOffset = 42;
  const thumbPosition =
    50 +
    (value > 0
      ? Math.min(maxOffset, value / 24)
      : -Math.min(maxOffset, Math.abs(value) / 24));
  const fillWidth = Math.abs(thumbPosition - 50);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col items-center rounded-[36px] bg-black/50 shrink-0",
        className
      )}
      style={{
        width: 472,
        paddingTop: 56,
        paddingBottom: 72,
        paddingLeft: 52,
        paddingRight: 52,
        gap: 36,
      }}
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-6">
        <p className="font-f1-bold text-[24px] text-white uppercase text-center tracking-[0.1em]">
          medium Quali Gap
        </p>
        <button
          onClick={onTimeScopeChange}
          className="flex items-center gap-1.5 text-white hover:text-white/80 transition-colors"
        >
          <span className="text-[16px] font-semibold capitalize">
            {timeScope === "season" ? "2025 Season" : "Last 5 Races"}
          </span>
          <svg
            className="w-6 h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* Gap value + H2H + slider */}
      <div className="flex flex-col items-center gap-7">
        <p className="font-f1-bold text-[96px] text-white uppercase leading-[1.36] text-center">
          {displayValue}
        </p>

        {/* Head-to-head record */}
        <div className="flex items-center gap-3 text-white">
          <span
            className={cn(
              "font-f1-bold text-[18px]",
              isFaster ? "opacity-100" : "opacity-50"
            )}
          >
            {driver1Abbreviation}
          </span>
          <span
            className={cn(
              "font-f1-bold text-[28px] tabular-nums",
              isFaster ? "opacity-100" : "opacity-50"
            )}
          >
            {driver1H2HWins}
          </span>
          <span className="text-[20px] opacity-30 font-f1">—</span>
          <span
            className={cn(
              "font-f1-bold text-[28px] tabular-nums",
              value > 0 ? "opacity-100" : "opacity-50"
            )}
          >
            {driver2H2HWins}
          </span>
          <span
            className={cn(
              "font-f1-bold text-[18px]",
              value > 0 ? "opacity-100" : "opacity-50"
            )}
          >
            {driver2Abbreviation}
          </span>
        </div>

        {/* Slider area */}
        <div className="flex flex-col gap-3 w-[368px]">
          {/* Track */}
          <div
            className="relative h-2 rounded-full"
            style={{ backgroundColor: "rgba(110,110,110,0.3)" }}
          >
            {/* Active fill from center */}
            <div
              className="absolute top-0 bottom-0 rounded-full transition-all duration-700 ease-out"
              style={{
                backgroundColor: teamColor,
                left: isFaster ? `${thumbPosition}%` : "50%",
                width: `${fillWidth}%`,
              }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-6 rounded-full transition-all duration-700 ease-out"
              style={{
                left: `${thumbPosition}%`,
                backgroundColor: teamColor,
                boxShadow: `0 0 12px ${teamColor}80`,
              }}
            />
          </div>

          {/* Driver labels */}
          <div className="flex items-start justify-between text-white capitalize">
            <div className="flex flex-col gap-[3px]">
              <span
                className={cn(
                  "font-f1-bold text-[16px]",
                  isFaster ? "opacity-100" : "opacity-50"
                )}
              >
                {driver1Abbreviation}
              </span>
              <span
                className={cn(
                  "text-[14px]",
                  isFaster ? "opacity-100" : "opacity-50"
                )}
              >
                faster
              </span>
            </div>
            <div className="flex flex-col gap-[3px] items-end">
              <span
                className={cn(
                  "font-f1-bold text-[16px]",
                  value > 0 ? "opacity-100" : "opacity-50"
                )}
              >
                {driver2Abbreviation}
              </span>
              <span
                className={cn(
                  "text-[14px]",
                  value > 0 ? "opacity-100" : "opacity-50"
                )}
              >
                faster
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
