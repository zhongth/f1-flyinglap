"use client";

import { motion } from "framer-motion";
import {
  teams,
  getDriversByTeam,
  getMedianGap,
  getMedianGapPercentage,
  type Team,
  type Driver,
} from "@/lib/data";
import AssetPlaceholder from "./AssetPlaceholder";
import SpeedDelta from "./SpeedDelta";

interface VersusViewProps {
  team: Team;
  onSelectDriver: (driver: Driver) => void;
  onBack: () => void;
}

export default function VersusView({ team, onSelectDriver, onBack }: VersusViewProps) {
  const teamDrivers = getDriversByTeam(team.id);
  const [driverA, driverB] = teamDrivers;

  // Calculate gaps
  const gap = getMedianGap(driverA, driverB);
  const percentage = getMedianGapPercentage(driverA, driverB);

  // Create gradient background
  const gradientBg = `radial-gradient(ellipse at center top, ${team.gradientStops[0]} 0%, ${team.gradientStops[1]} 40%, ${team.gradientStops[2]} 100%)`;

  // Animation variants
  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1,
      },
    },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  };

  const driverVariants = {
    initial: (direction: number) => ({
      opacity: 0,
      x: direction * 100,
    }),
    animate: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 80,
        damping: 20,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="relative min-h-screen w-full overflow-hidden"
      style={{ background: gradientBg }}
    >
      {/* Team logos navigation bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-center gap-6 py-6 px-8 bg-black/20 backdrop-blur-sm">
        {teams.map((t) => {
          const isSelected = t.id === team.id;
          return (
            <motion.div
              key={t.id}
              layoutId={isSelected ? `logo-${t.id}` : undefined}
              className={`relative h-10 w-10 flex items-center justify-center transition-all ${
                isSelected ? "opacity-100 scale-110" : "opacity-40 grayscale hover:opacity-60"
              }`}
            >
              {t.logoUrl ? (
                <img src={t.logoUrl} alt={t.name} className="w-full h-full object-contain" />
              ) : (
                <AssetPlaceholder type="logo" className="w-full h-full" />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Season and filter controls */}
      <div className="absolute top-24 left-0 right-0 z-10 flex flex-col items-center gap-3">
        <button className="font-f1-reg text-white/90 text-sm tracking-wide flex items-center gap-2 hover:text-white transition-colors">
          2025 Season
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 3L11 8L6 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button className="font-f1-reg text-white/80 text-sm tracking-wide flex items-center gap-2 hover:text-white transition-colors">
          Whole Year
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 3L11 8L6 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 z-30 text-white/60 hover:text-white transition-colors font-f1-reg text-sm tracking-wide"
      >
        ← BACK TO TEAMS
      </button>

      {/* Main content - Two drivers */}
      <div className="relative h-screen grid grid-cols-2">
        {/* Driver A (Left) */}
        <motion.div
          custom={-1}
          variants={driverVariants}
          className="relative flex flex-col items-center justify-end pb-16 cursor-pointer group"
          onClick={() => onSelectDriver(driverA)}
        >
          {/* Driver photo placeholder */}
          <div className="relative w-full max-w-md h-[70vh] mb-8">
            {driverA.photoUrl ? (
              <img
                src={driverA.photoUrl}
                alt={driverA.name}
                className="w-full h-full object-contain object-bottom"
              />
            ) : (
              <AssetPlaceholder
                type="driver"
                aspectRatio="9/16"
                className="w-full h-full"
                label={`#${driverA.number} DRIVER PNG`}
              />
            )}
          </div>

          {/* Driver name */}
          <motion.h2
            className="font-f1-wide text-white text-5xl md:text-7xl uppercase tracking-wider text-center group-hover:scale-105 transition-transform"
            style={{ textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}
          >
            {driverA.name.split(" ")[0]}
            <br />
            <span className="text-6xl md:text-8xl">{driverA.name.split(" ")[1]}</span>
          </motion.h2>

          {/* Hover indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute bottom-4 text-white/40 font-f1-reg text-xs tracking-wider"
          >
            CLICK FOR DETAILS
          </motion.div>
        </motion.div>

        {/* Driver B (Right) */}
        <motion.div
          custom={1}
          variants={driverVariants}
          className="relative flex flex-col items-center justify-end pb-16 cursor-pointer group"
          onClick={() => onSelectDriver(driverB)}
        >
          {/* Driver photo placeholder */}
          <div className="relative w-full max-w-md h-[70vh] mb-8">
            {driverB.photoUrl ? (
              <img
                src={driverB.photoUrl}
                alt={driverB.name}
                className="w-full h-full object-contain object-bottom"
              />
            ) : (
              <AssetPlaceholder
                type="driver"
                aspectRatio="9/16"
                className="w-full h-full"
                label={`#${driverB.number} DRIVER PNG`}
              />
            )}
          </div>

          {/* Driver name */}
          <motion.h2
            className="font-f1-wide text-white text-5xl md:text-7xl uppercase tracking-wider text-center group-hover:scale-105 transition-transform"
            style={{ textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}
          >
            {driverB.name.split(" ")[0]}
            <br />
            <span className="text-6xl md:text-8xl">{driverB.name.split(" ")[1]}</span>
          </motion.h2>

          {/* Hover indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute bottom-4 text-white/40 font-f1-reg text-xs tracking-wider"
          >
            CLICK FOR DETAILS
          </motion.div>
        </motion.div>
      </div>

      {/* Center divider line (subtle) */}
      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10 transform -translate-x-1/2 z-5" />

      {/* Speed Delta - Absolutely centered */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
        <SpeedDelta gap={gap} percentage={percentage} animate={true} />
      </div>
    </motion.div>
  );
}
