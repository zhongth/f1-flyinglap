"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { teams, type Team } from "@/lib/data";
import AssetPlaceholder from "./AssetPlaceholder";

interface TeamGridProps {
  onSelectTeam: (team: Team) => void;
}

export default function TeamGrid({ onSelectTeam }: TeamGridProps) {
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-screen w-full"
    >
      {teams.map((team) => {
        const isHovered = hoveredTeam === team.id;
        const isOtherHovered = hoveredTeam !== null && hoveredTeam !== team.id;

        return (
          <motion.div
            key={team.id}
            className="relative cursor-pointer overflow-hidden"
            style={{
              flex: isHovered ? 3 : 1,
            }}
            animate={{
              flex: isHovered ? 3 : isOtherHovered ? 1 : 1,
            }}
            transition={{
              duration: 0.75,
              ease: [0.65, 0.05, 0, 1], // Premium cubic-bezier easing
            }}
            onHoverStart={() => setHoveredTeam(team.id)}
            onHoverEnd={() => setHoveredTeam(null)}
            onClick={() => onSelectTeam(team)}
          >
            {/* Garage background placeholder */}
            <div className="absolute inset-0">
              <AssetPlaceholder type="garage" className="w-full h-full" />
            </div>

            {/* Gradient overlay */}
            <div
              className="absolute inset-0 opacity-60"
              style={{
                background: `linear-gradient(to bottom, transparent 0%, ${team.primaryColor}40 50%, ${team.primaryColor} 100%)`,
              }}
            />

            {/* Content */}
            <div className="relative h-full flex flex-col items-center justify-between py-12 px-4">
              {/* Team logo */}
              <motion.div
                layoutId={`logo-${team.id}`}
                className="w-16 h-16 flex items-center justify-center"
              >
                {team.logoUrl ? (
                  <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain" />
                ) : (
                  <AssetPlaceholder type="logo" className="w-full h-full" />
                )}
              </motion.div>

              {/* Team name */}
              <motion.div
                className="text-center"
                animate={{
                  opacity: isHovered ? 1 : 0.7,
                }}
              >
                <h2
                  className="font-f1-wide text-white uppercase text-xl md:text-2xl tracking-widest"
                  style={{
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                  }}
                >
                  {team.name}
                </h2>
              </motion.div>

              {/* Hover indicator */}
              <motion.div
                animate={{
                  opacity: isHovered ? 1 : 0,
                  y: isHovered ? 0 : 10,
                }}
                transition={{ duration: 0.2 }}
                className="text-white/60 font-f1-reg text-sm"
              >
                CLICK TO VIEW
              </motion.div>
            </div>

            {/* Hover glow effect */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={{
                opacity: isHovered ? 0.3 : 0,
              }}
              style={{
                background: `radial-gradient(circle at center, ${team.primaryColor} 0%, transparent 70%)`,
              }}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
