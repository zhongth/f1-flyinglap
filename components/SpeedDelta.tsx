"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

interface SpeedDeltaProps {
  gap: string; // e.g., "-0.124s" or "+0.087s"
  percentage: string; // e.g., "0.025%"
  animate?: boolean;
  className?: string;
}

export default function SpeedDelta({
  gap,
  percentage,
  animate = true,
  className = "",
}: SpeedDeltaProps) {
  // Determine if faster (negative/green) or slower (positive/red)
  const isFaster = gap.startsWith("-");
  const colorClass = isFaster ? "text-green-400" : "text-red-400";

  // Extract numeric value from percentage for animation
  const numericValue = parseFloat(percentage.replace("%", ""));

  // Spring animation for counting up
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (value) => `${value.toFixed(3)}%`);

  useEffect(() => {
    if (animate) {
      spring.set(numericValue);
    } else {
      spring.set(numericValue);
    }
  }, [numericValue, animate, spring]);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Main percentage display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="relative"
      >
        {animate ? (
          <motion.span className={`font-f1-bold text-white text-8xl md:text-9xl tracking-tight`}>
            {display}
          </motion.span>
        ) : (
          <span className={`font-f1-bold text-white text-8xl md:text-9xl tracking-tight`}>
            {percentage}
          </span>
        )}
      </motion.div>

      {/* Label */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="mt-4 flex items-center gap-2 text-white/80"
      >
        <span className="font-f1-reg text-xl tracking-wide">Medium Quali Gap</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="opacity-60"
        >
          <path
            d="M6 3L11 8L6 13"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>

      {/* Time gap display (smaller, below) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className={`mt-2 font-f1-bold text-2xl ${colorClass}`}
      >
        {gap}
      </motion.div>
    </div>
  );
}
