"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { Navbar } from "@/components/ui/Navbar";
import { getDriverById, getTeamById, getTeammateOf } from "@/data";

export function DriverDetail() {
  const containerRef = useRef<HTMLDivElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const carRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  const { focusedDriverId, goBack, setSelectedTeamId, setStage } = useAppStore();

  const driver = focusedDriverId ? getDriverById(focusedDriverId) : null;
  const team = driver ? getTeamById(driver.teamId) : null;
  const teammate = driver ? getTeammateOf(driver.id) : null;

  // Entrance animation
  useEffect(() => {
    if (!containerRef.current || !driver) return;

    const ctx = gsap.context(() => {
      // Portrait scales up and moves
      gsap.fromTo(
        portraitRef.current,
        { scale: 0.8, x: 100, opacity: 0 },
        { scale: 1, x: 0, opacity: 1, duration: 0.7, ease: "power3.out" }
      );

      // Car slides in from right
      gsap.fromTo(
        carRef.current,
        { x: 300, opacity: 0, filter: "blur(10px)" },
        {
          x: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.8,
          ease: "power2.out",
          delay: 0.3,
        }
      );

      // Stats cascade in
      const statItems = statsRef.current?.querySelectorAll(".stat-item");
      if (statItems) {
        gsap.fromTo(
          statItems,
          { x: -30, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.4,
            stagger: 0.1,
            ease: "power2.out",
            delay: 0.5,
          }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, [driver]);

  // Handle team change from navbar
  const handleTeamSelect = (teamId: string) => {
    setSelectedTeamId(teamId);
    setStage("VERSUS");
  };

  if (!driver || !team) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-white/50">No driver selected</p>
        <button
          onClick={goBack}
          className="ml-4 px-4 py-2 bg-white/10 rounded text-white"
        >
          Back
        </button>
      </div>
    );
  }

  const stats = [
    { label: "Championships", value: driver.careerStats.championships },
    { label: "Race Wins", value: driver.careerStats.wins },
    { label: "Pole Positions", value: driver.careerStats.polePositions },
    { label: "Podiums", value: driver.careerStats.podiums },
    { label: "Fastest Laps", value: driver.careerStats.fastestLaps },
  ];

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden bg-[var(--background)]"
    >
      {/* Navbar */}
      <Navbar onTeamSelect={handleTeamSelect} />

      {/* Background gradient */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(ellipse at 30% 50%, ${team.primaryColor}40 0%, transparent 60%)`,
        }}
      />

      {/* Main content */}
      <div className="h-full pt-[var(--navbar-height)] flex">
        {/* Left side - Driver portrait */}
        <div className="flex-1 relative flex items-end justify-center">
          <div
            ref={portraitRef}
            className="relative w-full h-[80vh] max-w-2xl will-animate"
          >
            <Image
              src={driver.portraitPath}
              alt={`${driver.firstName} ${driver.lastName}`}
              fill
              className="object-contain object-bottom"
              priority
            />

            {/* Gradient overlay */}
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[var(--background)] to-transparent" />
          </div>

          {/* Driver name overlay */}
          <div className="absolute bottom-16 left-8">
            <div
              className="font-f1-bold text-[10rem] leading-none opacity-10"
              style={{ color: team.primaryColor }}
            >
              {driver.number}
            </div>
            <div className="-mt-24 relative z-10">
              <p className="font-f1 text-xl text-white/60 uppercase tracking-wider">
                {driver.firstName}
              </p>
              <p
                className="font-f1-wide text-5xl md:text-6xl uppercase tracking-wide"
                style={{ color: team.primaryColor }}
              >
                {driver.lastName}
              </p>
              <p className="mt-2 text-sm text-white/40">{team.name}</p>
            </div>
          </div>
        </div>

        {/* Right side - Car and Stats */}
        <div className="flex-1 relative flex flex-col justify-center pr-8">
          {/* Car placeholder */}
          <div
            ref={carRef}
            className="relative w-full h-48 mb-12 will-animate"
          >
            {/* Stylized car silhouette placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-full max-w-lg h-32 rounded-lg opacity-20"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${team.primaryColor} 20%, ${team.primaryColor} 80%, transparent 100%)`,
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  viewBox="0 0 200 60"
                  className="w-full max-w-lg h-24 opacity-30"
                  style={{ fill: team.primaryColor }}
                >
                  {/* Simplified F1 car silhouette */}
                  <path d="M10,40 L30,35 L50,30 L90,28 L110,25 L150,25 L170,28 L185,35 L190,40 L180,45 L170,42 L160,45 L150,42 L140,45 L100,45 L60,45 L40,42 L20,45 Z" />
                  {/* Wheels */}
                  <ellipse cx="45" cy="43" rx="12" ry="8" />
                  <ellipse cx="155" cy="43" rx="12" ry="8" />
                </svg>
              </div>
            </div>
          </div>

          {/* Stats HUD */}
          <div ref={statsRef} className="space-y-4">
            <h3 className="font-f1-wide text-sm text-white/40 uppercase tracking-widest mb-6">
              Career Statistics
            </h3>
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="stat-item flex items-center justify-between py-3 border-b border-white/10"
              >
                <span className="font-f1 text-sm text-white/60 uppercase tracking-wider">
                  {stat.label}
                </span>
                <span
                  className="font-f1-bold text-2xl"
                  style={{ color: team.primaryColor }}
                >
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          {/* Compare with teammate */}
          {teammate && (
            <div className="mt-8 p-4 bg-white/5 rounded-lg">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">
                Teammate
              </p>
              <p className="font-f1 text-white/80">
                {teammate.firstName} {teammate.lastName}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Back button */}
      <button
        onClick={goBack}
        className="absolute bottom-8 left-8 flex items-center gap-2 px-4 py-2 text-sm text-white/50 hover:text-white transition-colors z-20"
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
        Back to Comparison
      </button>
    </div>
  );
}
