"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface FiveLightsOutProps {
  /** Real loading progress 0–100 from the model preloader. */
  progress: number;
  /** Called after the lights-out sequence finishes — dismiss the overlay. */
  onComplete: () => void;
}

/**
 * F1-style starting-lights loading screen.
 *
 * Lights turn on one-by-one on a fixed timer (like real F1).
 * Once all five are lit they stay on until loading finishes,
 * then all go dark simultaneously — "LIGHTS OUT".
 */
export function FiveLightsOut({ progress, onComplete }: FiveLightsOutProps) {
  const [litCount, setLitCount] = useState(0);
  const [lightsOut, setLightsOut] = useState(false);
  const [visible, setVisible] = useState(true);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // ── Light-up: fixed 1 s interval, starts immediately ──────────────
  useEffect(() => {
    if (lightsOut || litCount >= 5) return;

    const delay = litCount === 0 ? 600 : 1000;
    const id = setTimeout(() => setLitCount((c) => c + 1), delay);
    return () => clearTimeout(id);
  }, [litCount, lightsOut]);

  // ── Track when all five lights are on ─────────────────────────────
  const allLitAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (litCount >= 5 && allLitAtRef.current === null) {
      allLitAtRef.current = Date.now();
    }
  }, [litCount]);

  // ── Lights-out: all five on AND loading done → go dark ────────────
  // Guarantee at least 1 s with all five lit before going dark.
  useEffect(() => {
    if (litCount < 5 || lightsOut || progress < 100) return;

    const elapsed = Date.now() - (allLitAtRef.current ?? Date.now());
    const remaining = Math.max(1000 - elapsed, 0);

    const id = setTimeout(() => setLightsOut(true), remaining);
    return () => clearTimeout(id);
  }, [litCount, lightsOut, progress]);

  // ── Dismiss after lights-out animation ────────────────────────────
  useEffect(() => {
    if (!lightsOut) return;

    const id = setTimeout(() => {
      setVisible(false);
      onCompleteRef.current();
    }, 1200);
    return () => clearTimeout(id);
  }, [lightsOut]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#1a1a1a]">
      {/* Kraft paper grain + scratch texture overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <filter id="kraft-grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="4"
              stitchTiles="stitch"
              seed="2"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <filter id="kraft-scratches">
            <feTurbulence
              type="turbulence"
              baseFrequency="0.01 0.3"
              numOctaves="2"
              stitchTiles="stitch"
              seed="5"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <pattern
            id="light-dots"
            x="0"
            y="0"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="3" cy="3" r="1" fill="rgba(0,0,0,0.18)" />
          </pattern>
        </defs>
        {/* Fine grain layer */}
        <rect width="100%" height="100%" filter="url(#kraft-grain)" opacity="0.06" />
        {/* Directional scratch layer */}
        <rect width="100%" height="100%" filter="url(#kraft-scratches)" opacity="0.04" />
      </svg>

      {/* Five lights with bezels */}
      <div className="flex items-center gap-[2vw] md:gap-[2.5vw]">
        {Array.from({ length: 5 }).map((_, i) => {
          const isLit = !lightsOut && i < litCount;
          return (
            <div
              key={i}
              className="relative flex items-center justify-center"
            >
              {/* Outer bezel ring */}
              <div
                className="rounded-full border transition-colors"
                style={{
                  width: "clamp(60px, 12vw, 160px)",
                  height: "clamp(60px, 12vw, 160px)",
                  borderColor: "rgba(255,255,255,0.08)",
                  backgroundColor: "#0a0a0a",
                  transitionDuration: "300ms",
                }}
              />
              {/* Inner red light */}
              <div
                className="absolute rounded-full transition-all"
                style={{
                  width: "clamp(50px, 10.5vw, 140px)",
                  height: "clamp(50px, 10.5vw, 140px)",
                  backgroundColor: isLit ? "#c0392b" : "#151515",
                  boxShadow: isLit
                    ? "0 0 40px 8px rgba(192,57,43,0.35), inset 0 -4px 12px rgba(0,0,0,0.3)"
                    : "inset 0 2px 8px rgba(0,0,0,0.5)",
                  transitionDuration: lightsOut ? "150ms" : "400ms",
                }}
              />
              {/* Dot texture overlay (only when lit) */}
              {isLit && (
                <svg
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: "clamp(50px, 10.5vw, 140px)",
                    height: "clamp(50px, 10.5vw, 140px)",
                  }}
                >
                  <rect
                    width="100%"
                    height="100%"
                    fill="url(#light-dots)"
                    rx="9999"
                    ry="9999"
                  />
                </svg>
              )}
            </div>
          );
        })}
      </div>

      {/* Text */}
      <div className="mt-10 h-8 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {!lightsOut ? (
            <motion.p
              key="preparing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="font-f1-bold text-xs md:text-sm tracking-[0.3em] text-white uppercase"
            >
              Preparing the grid
            </motion.p>
          ) : (
            <motion.p
              key="lightsout"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="font-f1-bold text-sm md:text-base tracking-[0.2em] text-white uppercase"
            >
              Lights out
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
