"use client";

import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { gsap } from "@/lib/gsap";
import { useAppStore } from "@/store/useAppStore";
import { Navbar } from "@/components/ui/Navbar";
import { VSBadge } from "@/components/ui/VSBadge";
import { DriverShowcase } from "@/components/ui/DriverShowcase";
import {
  getTeamById,
  getDriversByTeamId,
  calculateMedianQualifyingGap,
  calculateHeadToHead,
  calculateQ3Rate,
  getDriverPedigree,
} from "@/data";

export function VersusMode() {
  const leftCardRef = useRef<HTMLDivElement>(null);
  const rightCardRef = useRef<HTMLDivElement>(null);
  const transitionRef = useRef<gsap.core.Timeline | null>(null);

  // Two background layers for crossfade (always in DOM)
  const bgLayerARef = useRef<HTMLImageElement>(null);
  const bgLayerBRef = useRef<HTMLImageElement>(null);
  const activeBgLayer = useRef<"A" | "B">("A");

  const {
    selectedTeamId,
    timeScope,
    setTimeScope,
    selectDriver,
    goBack,
    setSelectedTeamId,
    setStage,
    setIsAnimating,
  } = useAppStore();

  // Display state: cards update mid-animation, center panel updates immediately
  const [displayTeamId, setDisplayTeamId] = useState(selectedTeamId);

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

  const handleTeamSelect = useCallback(
    (teamId: string) => {
      if (teamId === selectedTeamId) return;

      // Kill any in-progress transition
      transitionRef.current?.kill();

      // Update center panel immediately (VSBadge numbers, slider, abbreviations)
      setSelectedTeamId(teamId);

      // Determine which bg layer to crossfade to
      const newTeam = getTeamById(teamId);
      const incomingLayer = activeBgLayer.current === "A" ? bgLayerBRef : bgLayerARef;
      const outgoingLayer = activeBgLayer.current === "A" ? bgLayerARef : bgLayerBRef;
      activeBgLayer.current = activeBgLayer.current === "A" ? "B" : "A";

      // Set new image on incoming layer (direct DOM — no React render needed)
      if (incomingLayer.current) {
        if (newTeam?.bgImagePath) {
          incomingLayer.current.src = newTeam.bgImagePath;
          incomingLayer.current.style.display = "";
        } else {
          incomingLayer.current.removeAttribute("src");
          incomingLayer.current.style.display = "none";
        }
      }

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

      // Crossfade background: incoming fades in ON TOP, outgoing stays visible underneath
      // Use 0.4 to match the opacity-40 class (GSAP inline styles override CSS classes)
      gsap.set(incomingLayer.current, { opacity: 0, zIndex: 2 });
      gsap.set(outgoingLayer.current, { zIndex: 1 });

      tl.to(
        incomingLayer.current,
        { opacity: 0.4, duration: 0.5, ease: "power2.inOut" },
        0
      );

      // Fade out old layer only after new one is mostly visible
      tl.to(
        outgoingLayer.current,
        { opacity: 0, duration: 0.3, ease: "power2.out" },
        0.3
      );

      // Swap card data when cards are fully hidden
      tl.call(() => setDisplayTeamId(teamId), [], 0.18);

      // Cards slide back in with new data
      // Start at 0.34s (160ms after state change) so React has time to flush the re-render
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

  const handleDriverClick = useCallback(
    (driverId: string) => {
      selectDriver(driverId);
      setTimeout(() => {
        setStage("DETAIL");
        setIsAnimating(false);
      }, 400);
    },
    [selectDriver, setStage, setIsAnimating]
  );

  const handleTimeScopeToggle = useCallback(() => {
    setTimeScope(timeScope === "season" ? "last5" : "season");
  }, [timeScope, setTimeScope]);

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
    <div className="relative h-screen w-full overflow-hidden bg-black">
      {/* Background image crossfade layers — both always in DOM */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          ref={bgLayerARef}
          src={displayTeam?.bgImagePath || undefined}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          style={{ display: displayTeam?.bgImagePath ? "" : "none", zIndex: 1 }}
        />
        <img
          ref={bgLayerBRef}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          style={{ display: "none", opacity: 0, zIndex: 0 }}
        />
      </div>

      {/* Subtle edge darkening — keep behind content (z-0) */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      {/* Vertical racing stripe decoration at top center */}
      <div className="absolute left-1/2 -translate-x-1/2 top-0 pointer-events-none z-10">
        <img
          src="/assets/pattern/f1-official-pattern-1.png"
          alt=""
          className="h-[200px] w-auto"
        />
      </div>

      {/* Back button (top-left, subtle) */}
      <button
        onClick={goBack}
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
      <Navbar onTeamSelect={handleTeamSelect} />

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
          {/* Left driver — uses displayTeam/displayDrivers (swaps mid-animation) */}
          <div ref={leftCardRef} className="will-change-transform">
            {displayDrivers[0] && displayTeam && (
              <DriverShowcase
                driver={displayDrivers[0]}
                team={displayTeam}
                position="left"
                q3Rate={q3Rates?.driver1.q3Rate}
                pedigreeLabel={pedigrees?.driver1.text}
                pedigreeTier={pedigrees?.driver1.tier}
                onClick={() => handleDriverClick(displayDrivers[0].id)}
              />
            )}
          </div>

          {/* Center panel — uses selectedTeamId data (updates immediately) */}
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

          {/* Right driver — uses displayTeam/displayDrivers (swaps mid-animation) */}
          <div ref={rightCardRef} className="will-change-transform">
            {displayDrivers[1] && displayTeam && (
              <DriverShowcase
                driver={displayDrivers[1]}
                team={displayTeam}
                position="right"
                q3Rate={q3Rates?.driver2.q3Rate}
                pedigreeLabel={pedigrees?.driver2.text}
                pedigreeTier={pedigrees?.driver2.tier}
                onClick={() => handleDriverClick(displayDrivers[1].id)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
