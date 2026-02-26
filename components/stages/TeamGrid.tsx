"use client";

import { useRef, useEffect, useMemo } from "react";
import { gsap, Flip } from "@/lib/gsap";
import { useAppStore } from "@/store/useAppStore";
import { TeamColumn } from "@/components/ui/TeamColumn";
import { teams, getTeamById } from "@/data";

export function TeamGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const {
    hoveredTeamId,
    setHoveredTeamId,
    selectTeam,
    setStage,
    setIsAnimating,
    isIntroComplete,
    setIntroComplete,
  } = useAppStore();

  // Intro animation
  useEffect(() => {
    if (!containerRef.current || isIntroComplete) return;

    const ctx = gsap.context(() => {
      const columns = containerRef.current!.querySelectorAll(".team-column");
      const title = titleRef.current;

      // Set initial states
      gsap.set(columns, { y: "100vh", opacity: 0 });
      gsap.set(title, { y: 30, opacity: 0 });

      // Create intro timeline
      const tl = gsap.timeline({
        onComplete: () => setIntroComplete(),
      });

      // Columns slide up with stagger
      tl.to(columns, {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.08,
        ease: "power3.out",
      });

      // Title fades in
      tl.to(
        title,
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power2.out",
        },
        "-=0.4"
      );
    }, containerRef);

    return () => ctx.revert();
  }, [isIntroComplete, setIntroComplete]);

  // Handle team selection with GSAP Flip
  const handleTeamSelect = (teamId: string) => {
    if (!containerRef.current) return;

    // Get the logo element that will flip to navbar
    const logoElement = document.getElementById(`team-logo-${teamId}`);
    if (!logoElement) {
      // Fallback: just transition without flip
      selectTeam(teamId);
      setTimeout(() => {
        setStage("VERSUS");
        setIsAnimating(false);
      }, 600);
      return;
    }

    // Capture logo state before animation
    const state = Flip.getState(logoElement);

    // Start selection animation
    selectTeam(teamId);

    const ctx = gsap.context(() => {
      const columns = containerRef.current!.querySelectorAll(".team-column");
      const selectedColumn = containerRef.current!.querySelector(
        `[data-team="${teamId}"]`
      );
      const selectedIndex = Array.from(columns).indexOf(selectedColumn!);

      // Create exit timeline
      const tl = gsap.timeline({
        onComplete: () => {
          setStage("VERSUS");
          setIsAnimating(false);
        },
      });

      // Non-selected columns exit left/right
      columns.forEach((col, i) => {
        if (col === selectedColumn) return;

        const direction = i < selectedIndex ? -1 : 1;
        tl.to(
          col,
          {
            x: `${direction * 100}vw`,
            opacity: 0,
            duration: 0.5,
            ease: "power2.in",
          },
          0
        );
      });

      // Selected column fades
      tl.to(
        selectedColumn,
        {
          opacity: 0,
          duration: 0.4,
          ease: "power2.out",
        },
        0.2
      );

      // Title exits
      tl.to(
        titleRef.current,
        {
          y: -30,
          opacity: 0,
          duration: 0.3,
          ease: "power2.in",
        },
        0
      );
    }, containerRef);
  };

  // Sort teams by constructor order
  const sortedTeams = [...teams].sort(
    (a, b) => a.constructorOrder - b.constructorOrder
  );

  const hoveredTeam = hoveredTeamId ? getTeamById(hoveredTeamId) : null;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[var(--background)]">
      {/* Team background images — all preloaded, only hovered one visible */}
      <div className="absolute inset-0 pointer-events-none">
        {teams.map((t) =>
          t.bgImagePath ? (
            <img
              key={t.id}
              src={t.bgImagePath}
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-out"
              style={{ opacity: hoveredTeamId === t.id ? 0.5 : 0 }}
            />
          ) : null
        )}
        {/* Vignette overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.85) 100%)",
          }}
        />
      </div>

      {/* Title */}
      <div
        ref={titleRef}
        className="absolute top-8 left-0 right-0 z-20 text-center pointer-events-none"
      >
        <h1 className="font-f1-wide text-2xl md:text-3xl lg:text-4xl tracking-wider text-white/90">
          SELECT YOUR TEAM
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Compare teammate qualifying performance
        </p>
      </div>

      {/* Team columns container */}
      <div ref={containerRef} className="flex h-full w-full">
        {sortedTeams.map((team, index) => (
          <TeamColumn
            key={team.id}
            team={team}
            index={index}
            isHovered={hoveredTeamId === team.id}
            isAnyHovered={hoveredTeamId !== null}
            onHover={setHoveredTeamId}
            onClick={handleTeamSelect}
          />
        ))}
      </div>

      {/* Hint text */}
      <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
        <p className="text-xs text-white/30 tracking-wide">
          Hover to preview • Click to select
        </p>
      </div>
    </div>
  );
}
