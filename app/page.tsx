"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import TeamGrid from "@/components/TeamGrid";
import VersusView from "@/components/VersusView";
import DetailView from "@/components/DetailView";
import type { Team, Driver } from "@/lib/data";

type Stage = "GRID" | "VERSUS" | "DETAIL";

export default function Home() {
  const [currentStage, setCurrentStage] = useState<Stage>("GRID");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Stage transition handlers
  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
    setCurrentStage("VERSUS");
  };

  const handleDriverSelect = (driver: Driver) => {
    setSelectedDriver(driver);
    setCurrentStage("DETAIL");
  };

  const handleBackToVersus = () => {
    setSelectedDriver(null);
    setCurrentStage("VERSUS");
  };

  const handleBackToGrid = () => {
    setSelectedTeam(null);
    setSelectedDriver(null);
    setCurrentStage("GRID");
  };

  return (
    <main className="relative w-full min-h-screen bg-background overflow-hidden">
      <AnimatePresence mode="wait">
        {currentStage === "GRID" && <TeamGrid key="grid" onSelectTeam={handleTeamSelect} />}

        {currentStage === "VERSUS" && selectedTeam && (
          <VersusView
            key="versus"
            team={selectedTeam}
            onSelectDriver={handleDriverSelect}
            onSelectTeam={handleTeamSelect}
            onBack={handleBackToGrid}
          />
        )}

        {currentStage === "DETAIL" && selectedDriver && (
          <DetailView key="detail" driver={selectedDriver} onBack={handleBackToVersus} />
        )}
      </AnimatePresence>
    </main>
  );
}
