"use client";

import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { gsap } from "@/lib/gsap";
import { useAppStore } from "@/store/useAppStore";
import { Navbar } from "@/components/ui/Navbar";
import { VSBadge } from "@/components/ui/VSBadge";
import { DriverShowcase } from "@/components/ui/DriverShowcase";
import { DriverDetailModal } from "@/components/ui/DriverDetailModal";
import { TiltedCard } from "@/components/ui/TiltedCard";
import {
  getTeamById,
  getDriversByTeamId,
  calculateMedianQualifyingGap,
  calculateHeadToHead,
  calculateQ3Rate,
  getDriverPedigree,
} from "@/data";

const layoutSpring = {
  type: "spring" as const,
  stiffness: 180,
  damping: 24,
};

export function VersusMode() {
  const leftCardRef = useRef<HTMLDivElement>(null);
  const rightCardRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const backBtnRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const patternRef = useRef<HTMLDivElement>(null);
  const transitionRef = useRef<gsap.core.Timeline | null>(null);
  const exitTlRef = useRef<gsap.core.Timeline | null>(null);
  const isExitingRef = useRef(false);

  const {
    selectedTeamId,
    timeScope,
    setTimeScope,
    goBack,
    setSelectedTeamId,
    setCameraMode,
    setHoveredTeamId,
    setStage,
  } = useAppStore();

  // Display state: cards update mid-animation, center panel updates immediately
  const [displayTeamId, setDisplayTeamId] = useState(selectedTeamId);

  // Modal state: which driver card is expanded (0 = left, 1 = right, null = none)
  const [selectedDriverIndex, setSelectedDriverIndex] = useState<number | null>(null);

  // Center panel uses selectedTeamId (updates immediately)
  const team = selectedTeamId ? getTeamById(selectedTeamId) : null;
  const drivers = selectedTeamId ? getDriversByTeamId(selectedTeamId) : [];

  // Cards use displayTeamId (updates mid-animation)
  const displayTeam = displayTeamId ? getTeamById(displayTeamId) : null;
  const displayDrivers = displayTeamId ? getDriversByTeamId(displayTeamId) : [];

  const medianGap = useMemo(() => {
    if (drivers.length !== 2) return null;
    return calculateMedianQualifyingGap(
      drivers[0].id,
      drivers[1].id,
      timeScope
    );
  }, [drivers, timeScope]);

  const headToHead = useMemo(() => {
    if (drivers.length !== 2) return null;
    return calculateHeadToHead(drivers[0].id, drivers[1].id, timeScope);
  }, [drivers, timeScope]);

  // Q3 rates use displayDrivers so they update with the cards mid-animation
  const q3Rates = useMemo(() => {
    if (displayDrivers.length !== 2) return null;
    return {
      driver1: calculateQ3Rate(displayDrivers[0].id, timeScope),
      driver2: calculateQ3Rate(displayDrivers[1].id, timeScope),
    };
  }, [displayDrivers, timeScope]);


  // Pedigree is a career stat — doesn't change with timeScope
  const pedigrees = useMemo(() => {
    if (displayDrivers.length !== 2) return null;
    return {
      driver1: getDriverPedigree(displayDrivers[0].id),
      driver2: getDriverPedigree(displayDrivers[1].id),
    };
  }, [displayDrivers]);

  // Responsive scaling for the fixed-size content
  const [contentScale, setContentScale] = useState(1);

  useEffect(() => {
    const update = () => {
      const vwScale = window.innerWidth / 1920;
      const vhScale = window.innerHeight / 1080;
      setContentScale(Math.min(1, vwScale, vhScale));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Initial card entry animation (on wrapper divs, not on the motion.div with layoutId)
  useEffect(() => {
    if (!leftCardRef.current || !rightCardRef.current) return;

    gsap.fromTo(
      leftCardRef.current,
      { x: -80, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 0.1 }
    );
    gsap.fromTo(
      rightCardRef.current,
      { x: 80, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 0.1 }
    );
  }, []);

  const handleTeamSelect = useCallback(
    (teamId: string) => {
      if (teamId === selectedTeamId) return;

      // Kill any in-progress transition
      transitionRef.current?.kill();

      // Update center panel immediately (VSBadge numbers, slider, abbreviations)
      setSelectedTeamId(teamId);

      const tl = gsap.timeline();
      transitionRef.current = tl;

      // Cards slide out fast
      tl.to(
        leftCardRef.current,
        { x: -60, opacity: 0, scale: 0.92, duration: 0.18, ease: "power2.in" },
        0
      );

      tl.to(
        rightCardRef.current,
        { x: 60, opacity: 0, scale: 0.92, duration: 0.18, ease: "power2.in" },
        0
      );

      // Swap card data when cards are fully hidden
      tl.call(() => setDisplayTeamId(teamId), [], 0.18);

      // Cards slide back in with new data
      tl.fromTo(
        leftCardRef.current,
        { x: -40, opacity: 0, scale: 0.95 },
        { x: 0, opacity: 1, scale: 1, duration: 0.35, ease: "power3.out" },
        0.34
      );

      tl.fromTo(
        rightCardRef.current,
        { x: 40, opacity: 0, scale: 0.95 },
        { x: 0, opacity: 1, scale: 1, duration: 0.35, ease: "power3.out" },
        0.34
      );
    },
    [selectedTeamId, setSelectedTeamId]
  );

  const handleTimeScopeToggle = useCallback(() => {
    setTimeScope(timeScope === "season" ? "last5" : "season");
  }, [timeScope, setTimeScope]);

  // Navigate to GRAPH stage: animate out and switch camera + stage
  const handleGraphView = useCallback(() => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;

    setCameraMode("sideProfile");

    const tl = gsap.timeline({
      onComplete: () => {
        setStage("GRAPH");
        isExitingRef.current = false;
      },
    });

    tl.to(
      leftCardRef.current,
      { x: -100, opacity: 0, duration: 0.4, ease: "power2.in" },
      0,
    );
    tl.to(
      rightCardRef.current,
      { x: 100, opacity: 0, duration: 0.4, ease: "power2.in" },
      0,
    );
    tl.to(
      centerRef.current,
      { opacity: 0, scale: 0.85, duration: 0.35, ease: "power2.in" },
      0.05,
    );
    tl.to(
      navRef.current,
      { opacity: 0, y: 40, duration: 0.3, ease: "power2.in" },
      0.05,
    );
    tl.to(
      backBtnRef.current,
      { opacity: 0, duration: 0.25, ease: "power2.in" },
      0,
    );
    tl.to(
      overlayRef.current,
      { opacity: 0, duration: 0.5, ease: "power2.inOut" },
      0.1,
    );
    tl.to(
      patternRef.current,
      { opacity: 0, duration: 0.3, ease: "power2.in" },
      0,
    );
  }, [setCameraMode, setStage]);

  // Animated back transition: exit content, start camera return, then switch stage
  const handleBack = useCallback(() => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;

    // Start camera returning to top-down immediately
    setCameraMode("topDown");

    exitTlRef.current?.kill();
    const tl = gsap.timeline({
      onComplete: () => {
        // Manually transition to GRID (bypass goBack's isAnimating check)
        setHoveredTeamId(selectedTeamId || "ferrari");
        setSelectedTeamId(null);
        setStage("GRID");
        isExitingRef.current = false;
      },
    });
    exitTlRef.current = tl;

    // Cards slide out to sides
    tl.to(
      leftCardRef.current,
      { x: -100, opacity: 0, duration: 0.4, ease: "power2.in" },
      0,
    );
    tl.to(
      rightCardRef.current,
      { x: 100, opacity: 0, duration: 0.4, ease: "power2.in" },
      0,
    );

    // Center badge fades up
    tl.to(
      centerRef.current,
      { opacity: 0, y: -30, duration: 0.35, ease: "power2.in" },
      0.05,
    );

    // Navbar slides down
    tl.to(
      navRef.current,
      { opacity: 0, y: 40, duration: 0.3, ease: "power2.in" },
      0.05,
    );

    // Back button fades
    tl.to(
      backBtnRef.current,
      { opacity: 0, duration: 0.25, ease: "power2.in" },
      0,
    );

    // Overlay and pattern fade
    tl.to(
      overlayRef.current,
      { opacity: 0, duration: 0.5, ease: "power2.inOut" },
      0.1,
    );
    tl.to(
      patternRef.current,
      { opacity: 0, duration: 0.3, ease: "power2.in" },
      0,
    );
  }, [selectedTeamId, setCameraMode, setHoveredTeamId, setSelectedTeamId, setStage]);

  if (!team || drivers.length !== 2) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-white/50">No team selected</p>
        <button
          onClick={goBack}
          className="ml-4 px-4 py-2 bg-white/10 rounded text-white"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Atmospheric overlay — ensures content readability over 3D car background */}
      <div
        ref={overlayRef}
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background:
            "radial-gradient(ellipse 90% 80% at 50% 50%, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      {/* Vertical racing stripe decoration at top center */}
      <div ref={patternRef} className="absolute left-1/2 -translate-x-1/2 top-0 pointer-events-none z-10">
        <img
          src="/assets/pattern/f1-official-pattern-1.png"
          alt=""
          className="h-[200px] w-auto"
        />
      </div>

      {/* Back button (top-left, subtle) */}
      <button
        ref={backBtnRef}
        onClick={handleBack}
        className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 text-white/30 hover:text-white/70 transition-colors rounded-full hover:bg-white/5"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span className="uppercase tracking-wider text-xs font-f1">Back</span>
      </button>

      {/* Bottom Navbar - team logos */}
      <div ref={navRef}>
        <Navbar onTeamSelect={handleTeamSelect} />
      </div>

      {/* Main content — relative z-20 so it paints above background/vignette layers */}
      <div className="relative z-20 h-full flex items-center justify-center pb-20">
        <div
          className="flex items-center"
          style={{
            gap: 118,
            transform: `scale(${contentScale})`,
            transformOrigin: "center center",
          }}
        >
          {/* Left driver — GSAP wrapper (slide out/in) → motion.div (layoutId) → TiltedCard → DriverShowcase */}
          <div ref={leftCardRef} className="will-change-transform">
            {displayDrivers[0] && displayTeam && (
              <motion.div
                key={displayDrivers[0].id}
                layoutId={`driver-card-${displayDrivers[0].id}`}
                transition={layoutSpring}
              >
                <TiltedCard rotateAmplitude={5} scaleOnHover={1}>
                  <DriverShowcase
                    driver={displayDrivers[0]}
                    team={displayTeam}
                    position="left"
                    q3Rate={q3Rates?.driver1.q3Rate}
                    pedigreeLabel={pedigrees?.driver1.text}
                    pedigreeTier={pedigrees?.driver1.tier}
                    onClick={() => setSelectedDriverIndex(0)}
                  />
                </TiltedCard>
              </motion.div>
            )}
          </div>

          {/* Center panel — uses selectedTeamId data (updates immediately) */}
          <div ref={centerRef} onClick={handleGraphView} className="cursor-pointer">
            <VSBadge
              value={medianGap?.medianGap ?? 0}
              teamColor={team.primaryColor}
              driver1Name={drivers[0].lastName}
              driver2Name={drivers[1].lastName}
              driver1Abbreviation={drivers[0].abbreviation}
              driver2Abbreviation={drivers[1].abbreviation}
              driver1H2HWins={headToHead?.driver1Wins ?? 0}
              driver2H2HWins={headToHead?.driver2Wins ?? 0}
              raceCount={medianGap?.raceCount ?? 0}
              timeScope={timeScope}
              onTimeScopeChange={handleTimeScopeToggle}
            />
          </div>

          {/* Right driver — GSAP wrapper (slide out/in) → motion.div (layoutId) → TiltedCard → DriverShowcase */}
          <div ref={rightCardRef} className="will-change-transform">
            {displayDrivers[1] && displayTeam && (
              <motion.div
                key={displayDrivers[1].id}
                layoutId={`driver-card-${displayDrivers[1].id}`}
                transition={layoutSpring}
              >
                <TiltedCard rotateAmplitude={5} scaleOnHover={1}>
                  <DriverShowcase
                    driver={displayDrivers[1]}
                    team={displayTeam}
                    position="right"
                    q3Rate={q3Rates?.driver2.q3Rate}
                    pedigreeLabel={pedigrees?.driver2.text}
                    pedigreeTier={pedigrees?.driver2.tier}
                    onClick={() => setSelectedDriverIndex(1)}
                  />
                </TiltedCard>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Driver detail modal */}
      <DriverDetailModal
        driver={
          selectedDriverIndex !== null
            ? displayDrivers[selectedDriverIndex] ?? null
            : null
        }
        team={displayTeam ?? null}
        q3Rate={
          selectedDriverIndex === 0
            ? q3Rates?.driver1.q3Rate
            : selectedDriverIndex === 1
              ? q3Rates?.driver2.q3Rate
              : undefined
        }
        pedigreeLabel={
          selectedDriverIndex === 0
            ? pedigrees?.driver1.text
            : selectedDriverIndex === 1
              ? pedigrees?.driver2.text
              : undefined
        }
        pedigreeTier={
          selectedDriverIndex === 0
            ? pedigrees?.driver1.tier
            : selectedDriverIndex === 1
              ? pedigrees?.driver2.tier
              : undefined
        }
        timeScope={timeScope}
        onClose={() => setSelectedDriverIndex(null)}
      />
    </div>
  );
}
