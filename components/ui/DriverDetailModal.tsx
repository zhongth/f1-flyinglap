"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { cn, getTeamDarkColors } from "@/lib/utils";
import type { Driver, Team } from "@/types";
import type { PedigreeTier } from "@/data/drivers";
import type { TimeScope } from "@/store/useAppStore";
import { NATIONALITY_TO_CODE } from "@/components/ui/DriverProfileCard";

interface DriverDetailModalProps {
  driver: Driver | null;
  team: Team | null;
  q3Rate?: number;
  pedigreeLabel?: string;
  pedigreeTier?: PedigreeTier;
  timeScope: TimeScope;
  onClose: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

const springTransition = {
  type: "spring" as const,
  stiffness: 180,
  damping: 24,
};

export function DriverDetailModal({
  driver,
  team,
  q3Rate,
  pedigreeLabel,
  pedigreeTier,
  timeScope,
  onClose,
  isMuted,
  onToggleMute,
}: DriverDetailModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (driver) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [driver]);

  useEffect(() => {
    if (!driver) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [driver, onClose]);

  if (!mounted) return null;

  const darkColors = team ? getTeamDarkColors(team.primaryColor) : null;

  const stats = driver
    ? [
        { label: "Poles", value: driver.careerStats.polePositions },
        { label: "Wins", value: driver.careerStats.wins },
        { label: "Podiums", value: driver.careerStats.podiums },
        { label: "Fastest Laps", value: driver.careerStats.fastestLaps },
      ]
    : [];

  return createPortal(
    <AnimatePresence>
      {driver && team && darkColors && (
        <>
          {/* Dark backdrop with opacity */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            onClick={onClose}
            className="fixed inset-0 z-[9999] cursor-default bg-black/70"
          />

          {/* Modal content */}
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-8 pointer-events-none">
            <motion.div
              layoutId={`driver-card-${driver.id}`}
              className="pointer-events-auto relative overflow-hidden"
              style={{
                width: 560,
                borderRadius: 32,
                backgroundColor: darkColors.cardBg,
                border: `2px solid ${darkColors.cardBorder}`,
              }}
              onClick={(e) => e.stopPropagation()}
              transition={springTransition}
            >
              {/* Header with portrait and driver info */}
              <div
                className="relative overflow-hidden"
                style={{ height: 340 }}
              >
                {/* Gradient overlay on portrait */}
                <div
                  className="absolute inset-0 z-10"
                  style={{
                    background: `linear-gradient(to top, ${darkColors.cardBg} 0%, transparent 60%)`,
                  }}
                />

                {/* Team color accent glow */}
                <div
                  className="absolute inset-0 z-0 opacity-20"
                  style={{
                    background: `radial-gradient(ellipse at 50% 20%, ${team.primaryColor}, transparent 70%)`,
                  }}
                />

                {/* Driver portrait — upper body crop */}
                <div
                  className="absolute z-[5]"
                  style={{ top: 20, left: "50%", transform: "translateX(-50%)", width: 360, height: 460 }}
                >
                  <Image
                    src={driver.portraitPath}
                    alt={`${driver.firstName} ${driver.lastName}`}
                    fill
                    sizes="420px"
                    className="object-cover object-top"
                    priority
                  />
                </div>

                {/* Driver number watermark */}
                <p
                  className="absolute top-4 right-6 font-f1-bold text-[120px] leading-none z-[1] select-none"
                  style={{ color: `${darkColors.cardBorder}40` }}
                >
                  {driver.number}
                </p>

                {/* Close button */}
                <motion.button
                  onClick={onClose}
                  className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M12 4L4 12M4 4L12 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </motion.button>

                {/* Mute toggle (Max Verstappen only) */}
                {onToggleMute && (
                  <motion.button
                    onClick={onToggleMute}
                    className="absolute top-4 left-16 z-20 w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {isMuted ? (
                        <>
                          <path d="M11 5L6 9H2v6h4l5 4V5z" />
                          <line x1="23" y1="9" x2="17" y2="15" />
                          <line x1="17" y1="9" x2="23" y2="15" />
                        </>
                      ) : (
                        <>
                          <path d="M11 5L6 9H2v6h4l5 4V5z" />
                          <path d="M19.07 4.93a10 10 0 010 14.14" />
                          <path d="M15.54 8.46a5 5 0 010 7.07" />
                        </>
                      )}
                    </svg>
                  </motion.button>
                )}

                {/* Team logo */}
                <div className="absolute top-5 right-5 z-20 w-9 h-9 opacity-80">
                  <Image
                    src={team.logoPath}
                    alt={team.shortName}
                    fill
                    sizes="28px"
                    className="object-contain"
                  />
                </div>
              </div>

              {/* Driver info section */}
              <motion.div
                className="relative z-10 px-8 -mt-6"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.15, duration: 0.4, ease: "easeOut" }}
              >
                {/* Name */}
                <p className="font-northwell text-white text-[52px] leading-[1.1]">
                  {driver.firstName}
                </p>
                <p className="font-f1-bold text-white text-[32px] uppercase leading-[1.2] -mt-1">
                  {driver.lastName}
                </p>

                {/* Pedigree + Nationality row */}
                <div className="flex items-center gap-3 mt-3">
                  {pedigreeLabel && (
                    <span
                      className={cn(
                        "inline-block px-4 py-1.5 rounded-full text-[11px] font-f1-bold uppercase",
                        pedigreeTier === "champion"
                          ? "bg-amber-500/20 text-amber-400"
                          : pedigreeTier === "winner"
                            ? "bg-white/15 text-white/80"
                            : pedigreeTier === "podium"
                              ? "bg-white/10 text-white/60"
                              : "bg-white/8 text-white/40"
                      )}
                    >
                      {pedigreeLabel}
                    </span>
                  )}
                  {NATIONALITY_TO_CODE[driver.nationality] && (
                    <div
                      className="overflow-hidden border-white/60 border-[1.5px] flex-shrink-0"
                      style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://flagcdn.com/w80/${NATIONALITY_TO_CODE[driver.nationality]}.png`}
                        alt={driver.nationality}
                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 0 }}
                      />
                    </div>
                  )}
                </div>

                {/* Team name */}
                <p
                  className="text-[13px] font-f1 uppercase tracking-wider mt-3"
                  style={{ color: team.primaryColor }}
                >
                  {team.name}
                </p>
              </motion.div>

              {/* Stats grid */}
              <motion.div
                className="px-8 pt-8 pb-10"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.25, duration: 0.4, ease: "easeOut" }}
              >
                {/* Divider */}
                <div
                  className="h-px w-full mb-6 opacity-30"
                  style={{ backgroundColor: darkColors.cardBorder }}
                />

                {/* Q3 Rate highlight */}
                {q3Rate !== undefined && (
                  <div className="mb-10">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[12px] font-f1 text-white/40 uppercase tracking-wider">
                        Q3 Rate{" "}
                        <span className="text-white/25">
                          {timeScope === "season" ? "· 2025 Season" : "· Last 5 Races"}
                        </span>
                      </span>
                      <span className="text-[28px] font-f1-bold text-white tabular-nums">
                        {Math.round(q3Rate * 100)}
                        <span className="text-[16px] text-white/50">%</span>
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-1 w-full rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: team.primaryColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${q3Rate * 100}%` }}
                        transition={{
                          delay: 0.4,
                          duration: 0.8,
                          ease: [0.32, 0.72, 0, 1],
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Career stats grid */}
                <div className="grid grid-cols-4 gap-6">
                  {stats.map((stat) => (
                    <div key={stat.label} className="text-center">
                      <p className="text-[24px] font-f1-bold text-white tabular-nums">
                        {stat.value}
                      </p>
                      <p className="text-[10px] font-f1 text-white/40 uppercase tracking-wider mt-1">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Championships row (if any) */}
                {driver.careerStats.championships > 0 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <div className="flex gap-1">
                      {Array.from({
                        length: driver.careerStats.championships,
                      }).map((_, i) => (
                        <svg
                          key={i}
                          className="w-4 h-4 text-amber-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-[11px] font-f1-bold text-amber-400 uppercase tracking-wider">
                      World Champion
                    </span>
                  </div>
                )}
              </motion.div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
