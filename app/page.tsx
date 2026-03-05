"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { TeamCarousel } from "@/components/stages/TeamCarousel";
import { VersusMode } from "@/components/stages/VersusMode";
import CustomCursor from "@/components/ui/CustomCursor";
import { FiveLightsOut } from "@/components/ui/FiveLightsOut";
import Preloader from "@/components/ui/Preloader";
import { teams } from "@/data";
import { getAllModelPaths } from "@/data/teamCarModels";
import { preloadImages } from "@/lib/imagePreloader";
import { preloadAllModels } from "@/lib/modelPreloader";
import { gsap } from "@/lib/gsap";
import { useAppStore } from "@/store/useAppStore";

const TopDownCarShowcase = dynamic(
  () => import("@/components/ui/TopDownCarShowcase"),
  { ssr: false },
);

export default function Home() {
  const { stage, hoveredTeamId, selectedTeamId, cameraMode } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isPreloaderRevealing, setIsPreloaderRevealing] = useState(!loading);

  // Persistent 3D car layer
  const carContainerRef = useRef<HTMLDivElement>(null);
  const carTeamId = selectedTeamId || hoveredTeamId || "ferrari";

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

  // Fade in the 3D car layer when preloader reveals
  useEffect(() => {
    if (isPreloaderRevealing && carContainerRef.current) {
      gsap.to(carContainerRef.current, {
        opacity: 1,
        duration: 1,
        ease: "power2.out",
      });
    }
  }, [isPreloaderRevealing]);

  // FiveLightsOut calls this after its animation finishes
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
      <CustomCursor
        circleSize={26}
        circleColor="rgba(107, 114, 128, 0.45)"
        targets={["[data-carousel-index]", "[data-driver-card]"]}
      />

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
          {/* Persistent 3D car layer — stays across GRID and VERSUS stages */}
          <div
            ref={carContainerRef}
            className="absolute inset-0 z-0 opacity-0"
          >
            <TopDownCarShowcase
              teamId={carTeamId}
              cameraMode={cameraMode}
              className="h-full w-full"
            />
          </div>

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
