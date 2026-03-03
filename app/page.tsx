"use client";

import { useCallback, useEffect, useState } from "react";
import { FiveLightsOut } from "@/components/ui/FiveLightsOut";
import Preloader from "@/components/ui/Preloader";
import { TeamCarousel } from "@/components/stages/TeamCarousel";
import { VersusMode } from "@/components/stages/VersusMode";
import { getAllModelPaths } from "@/data/teamCarModels";
import { preloadAllModels } from "@/lib/modelPreloader";
import { useAppStore } from "@/store/useAppStore";

export default function Home() {
  const { stage } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    preloadAllModels(getAllModelPaths(), setProgress).then(() =>
      setProgress(100),
    );
  }, []);

  // FiveLightsOut calls this after its animation finishes → triggers stairs exit
  const handleLightsOutComplete = useCallback(() => setLoading(false), []);

  return (
    <>
      <Preloader
        loading={loading}
        variant="stairs"
        position="fixed"
        duration={120000}
        loadingText=" "
        bgColor="#000000"
        zIndex={100}
        stairCount={10}
        stairsRevealFrom="center"
        stairsRevealDirection="up"
      >
        <main className="relative w-full min-h-screen overflow-hidden">
          {stage === "GRID" && <TeamCarousel />}
          {stage === "VERSUS" && <VersusMode />}
        </main>
      </Preloader>

      {/* F1 starting-lights overlay — sits above the Preloader stairs */}
      {loading && (
        <FiveLightsOut
          progress={progress}
          onComplete={handleLightsOutComplete}
        />
      )}
    </>
  );
}
