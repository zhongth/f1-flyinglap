"use client";

import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { Mouse, MoveHorizontal } from "lucide-react";
import { gsap } from "@/lib/gsap";
import { useAppStore } from "@/store/useAppStore";
import { CircleWheel } from "@/components/ui/CircleWheel";
import { TeamWallpaper } from "@/components/ui/TeamWallpaper";
import { teams } from "@/data";
import { getTeamById } from "@/data/teams";

export function TeamCarousel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const wallpaperRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  const {
    setHoveredTeamId,
    hoveredTeamId,
    selectTeam,
    setStage,
    setIsAnimating,
    isAnimating,
    isIntroComplete,
    setIntroComplete,
  } = useAppStore();

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.constructorOrder - b.constructorOrder),
    []
  );

  const activeTeam = hoveredTeamId ? getTeamById(hoveredTeamId) : sortedTeams[0];
  const [displayTeamName, setDisplayTeamName] = useState(sortedTeams[0].name);

  const handleActiveTeamChange = useCallback(
    (teamId: string) => {
      setHoveredTeamId(teamId);
      const team = getTeamById(teamId);
      if (team) setDisplayTeamName(team.name);
    },
    [setHoveredTeamId]
  );

  // Intro animation
  useEffect(() => {
    if (!containerRef.current || isIntroComplete) return;

    const ctx = gsap.context(() => {
      const title = titleRef.current;
      const wheel = wheelRef.current;
      const wallpaper = wallpaperRef.current;
      const hint = hintRef.current;

      // Set initial states
      gsap.set(title, { y: -30, opacity: 0 });
      gsap.set(wheel, { y: 200, opacity: 0 });
      gsap.set(wallpaper, { opacity: 0 });
      gsap.set(hint, { y: 20, opacity: 0 });

      const tl = gsap.timeline({
        onComplete: () => setIntroComplete(),
      });

      // Wallpaper fades in first
      tl.to(wallpaper, {
        opacity: 1,
        duration: 1,
        ease: "power2.out",
      });

      // Title fades in from top
      tl.to(
        title,
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power2.out",
        },
        "-=0.7"
      );

      // Wheel rises from below
      tl.to(
        wheel,
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
        },
        "-=0.6"
      );

      // Hint text fades in
      tl.to(
        hint,
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          ease: "power2.out",
        },
        "-=0.3"
      );
    }, containerRef);

    return () => ctx.revert();
  }, [isIntroComplete, setIntroComplete]);

  // Handle team selection with exit animation
  const handleTeamSelect = useCallback(
    (teamId: string) => {
      if (isAnimating || !containerRef.current) return;

      selectTeam(teamId);

      gsap.context(() => {
        const tl = gsap.timeline({
          onComplete: () => {
            setStage("VERSUS");
            setIsAnimating(false);
          },
        });

        // Title exits upward
        tl.to(
          titleRef.current,
          {
            y: -40,
            opacity: 0,
            duration: 0.3,
            ease: "power2.in",
          },
          0
        );

        // Wheel exits downward
        tl.to(
          wheelRef.current,
          {
            y: 200,
            opacity: 0,
            duration: 0.5,
            ease: "power2.in",
          },
          0.1
        );

        // Wallpaper fades out
        tl.to(
          wallpaperRef.current,
          {
            opacity: 0,
            duration: 0.4,
            ease: "power2.in",
          },
          0.1
        );

        // Hint exits downward
        tl.to(
          hintRef.current,
          {
            y: 20,
            opacity: 0,
            duration: 0.2,
            ease: "power2.in",
          },
          0
        );
      }, containerRef);
    },
    [isAnimating, selectTeam, setStage, setIsAnimating]
  );

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden bg-(--background)"
    >
      {/* Dynamic gradient wallpaper */}
      <div ref={wallpaperRef}>
        <TeamWallpaper team={activeTeam ?? null} />
      </div>

      {/* Team name — prominent display at top */}
      <div
        ref={titleRef}
        className="absolute top-[12%] left-0 right-0 z-20 text-center pointer-events-none"
      >
        <h1 className="font-f1-bold text-2xl md:text-3xl lg:text-[40px] tracking-wider text-white/90 uppercase leading-relaxed">
          {displayTeamName}
        </h1>
      </div>

      {/* Circle wheel */}
      <div ref={wheelRef} className="absolute inset-0 z-20">
        <CircleWheel
          teams={sortedTeams}
          onActiveTeamChange={handleActiveTeamChange}
          onTeamSelect={handleTeamSelect}
          isAnimating={isAnimating}
        />
      </div>

      {/* "Select your team" text + hint icons at bottom */}
      <div
        ref={hintRef}
        className="absolute bottom-[8%] left-0 right-0 flex flex-col items-center pointer-events-none z-30"
      >
        <p className="font-f1 text-base md:text-lg lg:text-xl tracking-[0.2em] text-white/70 uppercase">
          Select your team
        </p>
        <div className="flex flex-col items-center gap-2 mt-5">
          <Mouse className="w-5 h-5 text-white/25" strokeWidth={1.5} />
          <MoveHorizontal className="w-5 h-5 text-white/25" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}
