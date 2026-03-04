"use client";

import { useCallback, useEffect, useState } from "react";
import { FiveLightsOut } from "@/components/ui/FiveLightsOut";
import Preloader from "@/components/ui/Preloader";
import { TeamCarousel } from "@/components/stages/TeamCarousel";
import { VersusMode } from "@/components/stages/VersusMode";
import { teams } from "@/data";
import { getAllModelPaths } from "@/data/teamCarModels";
import { preloadImages } from "@/lib/imagePreloader";
import { preloadAllModels } from "@/lib/modelPreloader";
import { useAppStore } from "@/store/useAppStore";

export default function Home() {
  const { stage } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isPreloaderRevealing, setIsPreloaderRevealing] = useState(!loading);

  useEffect(() => {
    let isActive = true;
    let modelProgress = 0;
    let imageProgress = 0;
    const modelWeight = 0.9;
    const imageWeight = 0.1;

    const emitProgress = () => {
      if (!isActive) return;
      const blendedProgress =
        modelProgress * modelWeight + imageProgress * imageWeight;
      setProgress(blendedProgress);
    };

    Promise.all([
      preloadAllModels(getAllModelPaths(), (p) => {
        modelProgress = p;
        emitProgress();
      }),
      preloadImages(
        teams.map((team) => team.logoPath),
        (p) => {
          imageProgress = p;
          emitProgress();
        },
      ),
    ]).then(() => {
      if (!isActive) return;
      setProgress(100);
    });

    return () => {
      isActive = false;
    };
  }, []);

  // FiveLightsOut calls this after its animation finishes → triggers stairs exit
  const handleLightsOutComplete = useCallback(() => setLoading(false), []);
  const handlePreloaderRevealStart = useCallback(
    () => setIsPreloaderRevealing(true),
    [],
  );

  useEffect(() => {
    if (loading) {
      setIsPreloaderRevealing(false);
    }
  }, [loading]);

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
        onRevealStart={handlePreloaderRevealStart}
        stairCount={10}
        stairsRevealFrom="center"
        stairsRevealDirection="up"
      >
        <main className="relative w-full min-h-screen overflow-hidden">
          {stage === "GRID" && (
            <TeamCarousel introReady={isPreloaderRevealing} />
          )}
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
