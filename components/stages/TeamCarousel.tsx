"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { GradientCarouselItem } from "@/components/ui/GradientCarousel";
import { ProgressiveBlur } from "@/components/ui/ProgressiveBlur";
import { teams } from "@/data";
import { getDriversByTeamId } from "@/data/drivers";
import { getTeamById } from "@/data/teams";

import { gsap } from "@/lib/gsap";
import { useAppStore } from "@/store/useAppStore";

const GradientCarousel = dynamic(
  () => import("@/components/ui/GradientCarousel"),
  { ssr: false },
);

interface TeamCarouselProps {
  introReady?: boolean;
}

export function TeamCarousel({ introReady = true }: TeamCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

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
    [],
  );

  const defaultTeam = useMemo(
    () => sortedTeams.find((team) => team.id === "ferrari") ?? sortedTeams[0],
    [sortedTeams],
  );
  const activeTeam = hoveredTeamId ? getTeamById(hoveredTeamId) : defaultTeam;
  const ferrariInitialIndex = useMemo(() => {
    const ferrariIndex = sortedTeams.findIndex((team) => team.id === "ferrari");
    return ferrariIndex < 0 ? 0 : ferrariIndex;
  }, [sortedTeams]);

  // When returning from VERSUS, start on the team we were viewing
  const initialIndex = useMemo(() => {
    if (hoveredTeamId) {
      const idx = sortedTeams.findIndex((t) => t.id === hoveredTeamId);
      if (idx >= 0) return idx;
    }
    return ferrariInitialIndex;
  }, [sortedTeams, hoveredTeamId, ferrariInitialIndex]);
  const selectingRef = useRef(false);

  useEffect(() => {
    if (hoveredTeamId && getTeamById(hoveredTeamId)) return;
    setHoveredTeamId(defaultTeam.id);
  }, [defaultTeam.id, hoveredTeamId, setHoveredTeamId]);

  // Build team card array for GradientCarousel
  const teamCards: GradientCarouselItem[] = useMemo(
    () =>
      sortedTeams.map((team) => {
        const drivers = getDriversByTeamId(team.id);
        const position = `P${team.constructorOrder}`;

        return {
          id: team.id,
          content: (
            <div className="relative flex flex-col w-full h-full overflow-hidden p-4">
              {/* Top row: position + points */}
              <div className="flex items-start justify-between">
                <span
                  className="font-f1-bold text-[28px] leading-none tracking-tight"
                  style={{ color: team.primaryColor }}
                >
                  {position}
                </span>
                <span className="font-f1 text-[10px] tracking-[0.08em] text-white/35 uppercase mt-1">
                  {team.constructorPoints} pts
                </span>
              </div>

              {/* Center: team logo with subtle glow */}
              <div className="flex-1 flex items-center justify-center">
                <div className="relative">
                  <div
                    className="absolute inset-0 blur-2xl opacity-20 scale-150"
                    style={{ backgroundColor: team.primaryColor }}
                  />
                  <div className="relative h-[56px] w-[56px]">
                    <Image
                      src={team.logoPath}
                      alt={team.name}
                      fill
                      sizes="56px"
                      className="object-contain drop-shadow-sm"
                      draggable={false}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom section: team name + drivers */}
              <div className="flex flex-col gap-1">
                <span className="font-f1-bold text-[13px] text-white/90 uppercase tracking-[0.06em] leading-tight">
                  {team.shortName}
                </span>
                <span
                  className="font-f1 text-[10px] uppercase tracking-[0.12em]"
                  style={{ color: `${team.primaryColor}AA` }}
                >
                  {drivers.map((d) => d.abbreviation).join(" · ")}
                </span>
              </div>
            </div>
          ),
          primaryColor: team.primaryColor,
          secondaryColor: team.secondaryColor,
        };
      }),
    [sortedTeams],
  );

  // Handle team selection with exit animation
  const handleTeamSelect = useCallback(
    (teamId: string) => {
      if (selectingRef.current || isAnimating || !containerRef.current) return;
      selectingRef.current = true;

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
          0,
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
          0.1,
        );

      }, containerRef);
    },
    [isAnimating, selectTeam, setStage, setIsAnimating],
  );

  const handleCardChange = useCallback(
    (index: number) => {
      const selectedTeam = sortedTeams[index];
      if (!selectedTeam) return;
      setHoveredTeamId(selectedTeam.id);
    },
    [setHoveredTeamId, sortedTeams],
  );

  // Click highlighted + centered card to enter Versus mode.
  const handleCardClick = useCallback(
    (index: number) => {
      if (isAnimating) return;
      const selectedTeam = sortedTeams[index];
      if (!selectedTeam) return;
      handleTeamSelect(selectedTeam.id);
    },
    [isAnimating, handleTeamSelect, sortedTeams],
  );

  // Whether we're still in the intro phase (used for CSS initial states)
  const showIntro = !isIntroComplete;

  // Intro animation
  useEffect(() => {
    if (!introReady || !containerRef.current || isIntroComplete) return;

    const ctx = gsap.context(() => {
      const title = titleRef.current;
      const wheel = wheelRef.current;
      // Set initial states (CSS classes handle opacity:0, GSAP adds transforms)
      gsap.set(title, { y: -30 });
      gsap.set(wheel, { y: 0 });

      const tl = gsap.timeline({
        onComplete: () => setIntroComplete(),
      });

      tl.to(
        title,
        { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
        0.12,
      );
      tl.to(wheel, { opacity: 1, duration: 0.8, ease: "power2.out" }, 0);
    }, containerRef);

    return () => ctx.revert();
  }, [introReady, isIntroComplete, setIntroComplete]);

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden"
    >
      {/* Podcast link — top right */}
      <a
        href="https://www.youtube.com/playlist?list=PL3g6oz4W-l1k0YrzaNaaGoI3MXwx96PoC"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-6 right-6 z-50 group"
      >
        <Image
          src="/assets/feichiquan-podcast.jpg"
          alt="飞驰圈 Podcast"
          width={40}
          height={40}
          className="rounded-full border border-white/10 group-hover:border-white/30 transition-all duration-300 group-hover:scale-110"
        />
      </a>

      {/* Team name — prominent display at top */}
      <div
        ref={titleRef}
        className={`absolute top-[12%] left-0 right-0 z-40 text-center pointer-events-none ${showIntro ? "opacity-0" : ""}`}
      >
        {/* <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-5 py-2 backdrop-blur-xl">
          <span className="h-1.5 w-1.5 rounded-full bg-[#E10600] shadow-[0_0_10px_rgba(225,6,0,0.8)]" />
          <p className="font-f1 text-[10px] md:text-xs tracking-[0.1em] text-white/65 uppercase">
            F1 Flying Lap 飞驰圈
          </p>
        </div> */}
        <h1 className="mt-5 font-f1-bold text-3xl md:text-5xl lg:text-6xl tracking-[0.08em] text-white/95 uppercase leading-tight">
          Who is faster?
        </h1>
        <p className="mt-3 font-f1 text-xs md:text-xs tracking-[0.18em] text-white/65 uppercase">
          2025 Season
        </p>
      </div>

      {/* Horizontal team selector — anchored to bottom, sizes to content */}
      <div className="absolute bottom-0 left-0 right-0 z-50 pb-10">
          <div
            ref={wheelRef}
            className={
              showIntro
                ? "relative mx-auto w-full overflow-x-clip overflow-y-visible opacity-0"
                : "relative mx-auto w-full overflow-x-clip overflow-y-visible"
            }
          >
            <GradientCarousel
              items={teamCards}
              className="w-full bg-transparent"
              cardClassName="bg-black/15"
              contentClassName=""
              cardWidthPx={236}
              cardAspectRatio={110 / 140}
              initialIndex={initialIndex}
              introSpin={introReady && !isIntroComplete}
              introSpinRounds={1}
              introSpinDurationMs={2900}
              onCardChange={handleCardChange}
              onCardClick={handleCardClick}
              maxRotationDegrees={28}
              maxDepthPx={96}
              cardGap={32}
              dragSensitivity={0.8}
              frictionFactor={0.88}
              wheelSensitivity={0.25}
              gradientIntensity={0.55}
              gradientSize={0.5}
              backgroundBlur={22}
              showBackdrop={false}
              showLoadingOverlay={true}
            />
            <ProgressiveBlur
              position="left"
              size="14%"
              blurLevels={[0.5, 1, 2, 4, 8, 16, 24, 32]}
            />
            <ProgressiveBlur
              position="right"
              size="14%"
              blurLevels={[0.5, 1, 2, 4, 8, 16, 24, 32]}
            />
          </div>
      </div>
    </div>
  );
}
