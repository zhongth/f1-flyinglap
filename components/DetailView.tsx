"use client";

import { motion } from "framer-motion";
import { getTeamById, type Driver } from "@/lib/data";
import AssetPlaceholder from "./AssetPlaceholder";
import { ArrowLeft } from "lucide-react";

interface DetailViewProps {
  driver: Driver;
  onBack: () => void;
}

export default function DetailView({ driver, onBack }: DetailViewProps) {
  const team = getTeamById(driver.teamId);

  if (!team) return null;

  // Create gradient background matching team
  const gradientBg = `radial-gradient(ellipse at center top, ${team.gradientStops[0]} 0%, ${team.gradientStops[1]} 40%, ${team.gradientStops[2]} 100%)`;

  // Animation variants
  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.4,
        staggerChildren: 0.1,
      },
    },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  };

  const statItemVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
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
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="fixed top-8 left-8 z-30 flex items-center gap-2 text-white/80 hover:text-white transition-colors font-f1-reg text-sm tracking-wide group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        BACK TO COMPARISON
      </motion.button>

      {/* Main content layout */}
      <div className="h-screen grid grid-cols-1 lg:grid-cols-5 gap-8 p-8 lg:p-16">
        {/* Left side - Driver (40%) */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-2 flex flex-col items-center justify-center"
        >
          {/* Driver photo */}
          <div className="relative w-full max-w-lg h-[60vh] mb-8">
            {driver.photoUrl ? (
              <img
                src={driver.photoUrl}
                alt={driver.name}
                className="w-full h-full object-contain object-bottom"
              />
            ) : (
              <AssetPlaceholder
                type="driver"
                aspectRatio="9/16"
                className="w-full h-full"
                label={`#${driver.number} DRIVER PNG`}
              />
            )}
          </div>

          {/* Driver info */}
          <div className="text-center">
            <div className="font-f1-bold text-white/60 text-4xl mb-2">#{driver.number}</div>
            <h1 className="font-f1-wide text-white text-5xl lg:text-6xl uppercase tracking-wider">
              {driver.name.split(" ")[0]}
            </h1>
            <h1 className="font-f1-wide text-white text-6xl lg:text-7xl uppercase tracking-wider">
              {driver.name.split(" ")[1]}
            </h1>
            <div className="font-f1-reg text-white/60 text-xl mt-4 tracking-wide">{team.name}</div>
          </div>
        </motion.div>

        {/* Right side - Car and Stats (60%) */}
        <div className="lg:col-span-3 flex flex-col justify-center gap-12">
          {/* Car photo */}
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative w-full h-64 lg:h-80">
              {driver.carPhotoUrl ? (
                <img
                  src={driver.carPhotoUrl}
                  alt={`${driver.name} car`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <AssetPlaceholder
                  type="car"
                  aspectRatio="16/9"
                  className="w-full h-full"
                  label={`#${driver.number} CAR PNG`}
                />
              )}
            </div>
          </motion.div>

          {/* Stats panel */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="grid grid-cols-2 gap-6"
          >
            {/* Career Wins */}
            <motion.div
              variants={statItemVariants}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:bg-white/10 transition-colors"
            >
              <div className="font-f1-reg text-white/60 text-sm tracking-wider uppercase mb-2">
                Career Wins
              </div>
              <div className="font-f1-bold text-white text-5xl">{driver.stats.wins}</div>
            </motion.div>

            {/* Pole Positions */}
            <motion.div
              variants={statItemVariants}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:bg-white/10 transition-colors"
            >
              <div className="font-f1-reg text-white/60 text-sm tracking-wider uppercase mb-2">
                Pole Positions
              </div>
              <div className="font-f1-bold text-white text-5xl">{driver.stats.poles}</div>
            </motion.div>

            {/* DNFs */}
            <motion.div
              variants={statItemVariants}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:bg-white/10 transition-colors"
            >
              <div className="font-f1-reg text-white/60 text-sm tracking-wider uppercase mb-2">
                DNFs
              </div>
              <div className="font-f1-bold text-white text-5xl">{driver.stats.dnfs}</div>
            </motion.div>

            {/* Best Qualifying */}
            <motion.div
              variants={statItemVariants}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:bg-white/10 transition-colors"
            >
              <div className="font-f1-reg text-white/60 text-sm tracking-wider uppercase mb-2">
                Best Qualifying
              </div>
              <div className="font-f1-bold text-white text-4xl">
                {driver.stats.bestQualifyingTime}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
