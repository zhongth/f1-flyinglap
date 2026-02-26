"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface VSBadgeProps {
  value: number;
  teamColor: string;
  driver1Name: string;
  driver2Name: string;
  raceCount: number;
  className?: string;
}

export function VSBadge({
  value,
  teamColor,
  driver1Name,
  driver2Name,
  raceCount,
  className,
}: VSBadgeProps) {
  const numberRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [displayValue, setDisplayValue] = useState("0.000");
  const previousValue = useRef(0);

  const formatValue = (ms: number): string => {
    const sign = ms >= 0 ? "+" : "-";
    const absMs = Math.abs(ms);
    const seconds = Math.floor(absMs / 1000);
    const milliseconds = Math.floor(absMs % 1000);
    return `${sign}${seconds}.${milliseconds.toString().padStart(3, "0")}`;
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
    if (!numberRef.current) return;

    gsap.fromTo(
      numberRef.current,
      { scale: 0.5, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.8, ease: "back.out(1.7)", delay: 0.3 }
    );
  }, []);

  const isFaster = value < 0;

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      {/* VS Text */}
      <div className="relative mb-6">
        <span
          className="font-f1-bold text-xl tracking-[0.2em] opacity-30"
          style={{ color: teamColor }}
        >
          MEDIUM QUALIFICATION GAP
        </span>
      </div>

      {/* Main number container */}
      <div ref={numberRef} className="relative">


        {/* The number */}
        <div className="relative">
          <span className="font-f1-bold text-7xl md:text-8xl lg:text-[10rem] tracking-tight text-white leading-none">
            {displayValue}
          </span>
        </div>

        {/* Unit */}
        <div className="text-center mt-2">
          <span className="text-white/40 text-sm uppercase tracking-widest">
            seconds
          </span>
        </div>
      </div>

      {/* Animated Slider Indicator */}
      <div className="mt-10 w-72">
        {/* Slider container */}
        <div className="relative">
          {/* Track background */}
          <div className="h-2 bg-white/5 rounded-full" />

          {/* Gradient fill from center */}
          <div
            className="absolute top-0 h-2 rounded-full transition-all duration-700 ease-out"
            style={{
              background: `linear-gradient(${isFaster ? "to left" : "to right"}, ${teamColor}, ${teamColor}00)`,
              left: isFaster ? `${50 - Math.min(48, Math.abs(value) / 20)}%` : "50%",
              right: value > 0 ? `${50 - Math.min(48, Math.abs(value) / 20)}%` : "50%",
            }}
          />

          {/* Sliding indicator thumb */}
          <div
            ref={sliderRef}
            className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-out"
            style={{
              left: `${50 + (value > 0 ? Math.min(42, value / 24) : -Math.min(42, Math.abs(value) / 24))}%`,
            }}
          >
            {/* Glow */}
            <div
              className="absolute inset-0 w-5 h-5 -translate-x-1/2 rounded-full blur-md opacity-60"
              style={{ backgroundColor: teamColor }}
            />
            {/* Thumb */}
            <div
              className="relative w-5 h-5 -translate-x-1/2 rounded-full border-2"
              style={{
                borderColor: teamColor,
                backgroundColor: "#0a0a0a",
                boxShadow: `0 0 20px ${teamColor}50`,
              }}
            >
              {/* Inner dot */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: teamColor }}
              />
            </div>
          </div>
        </div>

        {/* Driver labels */}
        <div className="flex justify-between mt-4">
          <div className="flex flex-col items-start">
            <span
              className={cn(
                "text-[10px] font-f1-bold uppercase tracking-wider transition-all duration-500",
                isFaster ? "opacity-100 scale-105" : "opacity-30"
              )}
              style={{ color: isFaster ? teamColor : "white" }}
            >
              {driver1Name}
            </span>
            {isFaster && (
              <span
                className="text-[9px] uppercase tracking-widest mt-0.5 animate-pulse"
                style={{ color: teamColor }}
              >
                Faster
              </span>
            )}
          </div>

          <div className="flex flex-col items-end">
            <span
              className={cn(
                "text-[10px] font-f1-bold uppercase tracking-wider transition-all duration-500",
                value > 0 ? "opacity-100 scale-105" : "opacity-30"
              )}
              style={{ color: value > 0 ? teamColor : "white" }}
            >
              {driver2Name}
            </span>
            {value > 0 && (
              <span
                className="text-[9px] uppercase tracking-widest mt-0.5 animate-pulse"
                style={{ color: teamColor }}
              >
                Faster
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Race count */}
      <div className="mt-4 px-4 py-2 bg-white/5 rounded-full">
        <span className="text-white/40 text-xs uppercase tracking-wider">
          {raceCount} qualifying sessions
        </span>
      </div>
    </div>
  );
}
