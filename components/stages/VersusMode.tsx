"use client";

import { useRef, useMemo } from "react";
import { gsap } from "@/lib/gsap";
import { useAppStore } from "@/store/useAppStore";
import { Navbar } from "@/components/ui/Navbar";
import { AnimatedGrid } from "@/components/ui/AnimatedGrid";
import { GlowOrb } from "@/components/ui/GlowOrb";
import { HUDOverlay } from "@/components/ui/HUDOverlay";
import { VSBadge } from "@/components/ui/VSBadge";
import { DriverShowcase } from "@/components/ui/DriverShowcase";
import {
  getTeamById,
  getDriversByTeamId,
  calculateMedianQualifyingGap,
} from "@/data";

export function VersusMode() {
  const containerRef = useRef<HTMLDivElement>(null);
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

  const team = selectedTeamId ? getTeamById(selectedTeamId) : null;
  const drivers = selectedTeamId ? getDriversByTeamId(selectedTeamId) : [];

  const medianGap = useMemo(() => {
    if (drivers.length !== 2) return null;
    return calculateMedianQualifyingGap(drivers[0].id, drivers[1].id, timeScope);
  }, [drivers, timeScope]);

  const handleTeamSelect = (teamId: string) => {
    if (teamId === selectedTeamId) return;

    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          setSelectedTeamId(teamId);
          gsap.to(containerRef.current, {
            opacity: 1,
            duration: 0.4,
            ease: "power2.out",
          });
        },
      });
    } else {
      setSelectedTeamId(teamId);
    }
  };

  const handleDriverClick = (driverId: string) => {
    selectDriver(driverId);
    setTimeout(() => {
      setStage("DETAIL");
      setIsAnimating(false);
    }, 400);
  };

  if (!team || drivers.length !== 2) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-white/50">No team selected</p>
        <button onClick={goBack} className="ml-4 px-4 py-2 bg-white/10 rounded text-white">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#050505]">
      {/* Animated background grid */}
      <AnimatedGrid teamColor={team.primaryColor} />

      {/* Ambient glow orbs */}
      <GlowOrb color={team.primaryColor} position="left" />
      <GlowOrb color={team.primaryColor} position="right" />

      {/* Large centered team logo watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <img
          src={team.logoPath}
          alt=""
          className="w-[50vw] h-[50vw] max-w-[800px] max-h-[800px] object-contain opacity-[0.2] blur-sm brightness-75 mix-blend-screen -translate-y-64"
        />
      </div>

      {/* Navbar */}
      <Navbar onTeamSelect={handleTeamSelect} onBack={goBack} />

      {/* Main content */}
      <div
        ref={containerRef}
        className="relative h-full"
      >
        {/* Three column layout */}
        <div className="h-full flex px-10">
          {/* Left driver */}
          <div className="flex-1 relative">
            <DriverShowcase
              driver={drivers[0]}
              team={team}
              position="left"
              onClick={() => handleDriverClick(drivers[0].id)}
            />
          </div>

          {/* Center - VS Badge */}
          <div className="w-80 lg:w-96 flex flex-col items-center justify-center relative z-10">
            
            <VSBadge
              value={medianGap?.medianGap ?? 0}
              teamColor={team.primaryColor}
              driver1Name={drivers[0].lastName}
              driver2Name={drivers[1].lastName}
              raceCount={medianGap?.raceCount ?? 0}
            />

            {/* Time scope selector */}
            <div className="mt-12 flex flex-col gap-2">
              <span className="text-white/30 text-xs uppercase tracking-widest text-center mb-2">
                Time Period
              </span>
              <div className="flex gap-2 bg-white/5 p-1 rounded-full">
                <TimeScopeButton
                  label="Season"
                  isActive={timeScope === "season"}
                  onClick={() => setTimeScope("season")}
                  teamColor={team.primaryColor}
                />
                <TimeScopeButton
                  label="Last 5"
                  isActive={timeScope === "last5"}
                  onClick={() => setTimeScope("last5")}
                  teamColor={team.primaryColor}
                />
              </div>
            </div>

            {/* Team badge */}
            <div className="mt-8">
              <div className="px-5 py-3 bg-white/5 backdrop-blur-sm rounded-full">
                <span
                  className="font-f1-bold text-sm uppercase tracking-wider"
                  style={{ color: team.primaryColor }}
                >
                  {team.name}
                </span>
              </div>
            </div>
          </div>

          {/* Right driver */}
          <div className="flex-1 relative">
            <DriverShowcase
              driver={drivers[1]}
              team={team}
              position="right"
              onClick={() => handleDriverClick(drivers[1].id)}
            />
          </div>
        </div>
      </div>

    </div>
  );
}

interface TimeScopeButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  teamColor: string;
}

function TimeScopeButton({ label, isActive, onClick, teamColor }: TimeScopeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-5 py-2 text-xs font-f1 uppercase tracking-wider rounded-full transition-all duration-200
        ${isActive ? "text-white" : "text-white/40 hover:text-white/70"}
      `}
      style={{
        backgroundColor: isActive ? teamColor : "transparent",
      }}
    >
      {label}
    </button>
  );
}
