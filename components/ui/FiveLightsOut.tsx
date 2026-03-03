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
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black">
      {/* Five red dots */}
      <div className="flex items-center gap-4 md:gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-4 w-4 md:h-5 md:w-5 rounded-full transition-all"
            style={{
              backgroundColor: !lightsOut && i < litCount ? "#e10600" : "#1a1a1a",
              boxShadow:
                !lightsOut && i < litCount
                  ? "0 0 12px 2px rgba(225,6,0,.6)"
                  : "none",
              transitionDuration: lightsOut ? "150ms" : "200ms",
            }}
          />
        ))}
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
