"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const podcastRef = useRef<HTMLAnchorElement>(null);
  const [uiHidden, setUiHidden] = useState(false);

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
  const activeDrivers = activeTeam ? getDriversByTeamId(activeTeam.id) : [];
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
            <div className="relative flex flex-col w-full h-full overflow-hidden p-5">
              {/* Atmospheric overlay */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_34%)]" />
              </div>

              {/* Eyebrow + position */}
              <div className="relative space-y-1.5">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/38">
                  Constructor
                </p>
                <p
                  className="text-[32px] font-f1-bold leading-none tracking-[-0.04em]"
                  style={{ color: team.primaryColor }}
                >
                  {position}
                </p>
                <div
                  className="h-px w-12 rounded-full"
                  style={{
                    background: `linear-gradient(to right, ${team.primaryColor}cc, ${team.primaryColor}33, transparent)`,
                  }}
                />
              </div>

              {/* Center: team logo */}
              <div className="relative flex-1 flex items-center justify-center">
                <div className="relative">
                  <div
                    className="absolute inset-0 blur-3xl opacity-10 scale-[2]"
                    style={{ backgroundColor: team.primaryColor }}
                  />
                  <div className="relative h-[52px] w-[52px]">
                    <Image
                      src={team.logoPath}
                      alt={team.name}
                      fill
                      sizes="52px"
                      className="object-contain"
                      draggable={false}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom: team name + drivers */}
              <div className="relative space-y-2.5">
                <div className="h-px bg-white/8" />
                <p className="text-[14px] font-f1-bold tracking-[-0.02em] text-white">
                  {team.shortName}
                </p>
                <div className="flex items-center gap-1.5">
                  {drivers.map((d) => (
                    <span
                      key={d.id}
                      className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-0.5 text-[9px] tracking-[0.1em] text-white/60 uppercase font-f1-bold"
                    >
                      {d.abbreviation}
                    </span>
                  ))}
                </div>
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

  const toggleUI = useCallback(() => {
    if (isAnimating || !isIntroComplete) return;
    const hiding = !uiHidden;
    setUiHidden(hiding);

    gsap.to(titleRef.current, {
      y: hiding ? -60 : 0,
      opacity: hiding ? 0 : 1,
      duration: 0.5,
      ease: hiding ? "power2.in" : "power2.out",
    });
    gsap.to(wheelRef.current, {
      y: hiding ? 120 : 0,
      opacity: hiding ? 0 : 1,
      duration: 0.5,
      ease: hiding ? "power2.in" : "power2.out",
      delay: hiding ? 0.05 : 0,
    });
    gsap.to(podcastRef.current, {
      opacity: hiding ? 0 : 1,
      duration: 0.3,
    });
  }, [uiHidden, isAnimating, isIntroComplete]);

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden"
    >
      {/* Podcast link — top right */}
      <a
        ref={podcastRef}
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
        className={`absolute top-[8%] left-0 right-0 z-40 pointer-events-none ${showIntro ? "opacity-0" : ""}`}
      >
        <div className="w-full px-5 sm:px-8 lg:px-12 xl:px-16 2xl:px-20">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] xl:items-start xl:gap-x-10">
            <div className="max-w-[28rem]">
              <div className="inline-flex items-center gap-2.5 rounded-full border border-white/8 bg-white/[0.04] px-4 py-2 backdrop-blur-xl">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: activeTeam?.primaryColor }}
                />
                <p className="text-xs font-semibold tracking-[0.16em] text-white/42 uppercase">
                  2025 Season
                </p>
              </div>

              <h1 className="mt-6 text-[42px] md:text-[52px] font-f1-bold leading-none tracking-[-0.04em] text-white">
                Who is Faster
              </h1>

              <p className="mt-5 max-w-[24rem] text-[14px] leading-[1.45] tracking-[-0.01em] text-white/56">
                来自 117 的客观评价。 by 村长托马斯
              </p>
            </div>

            <div className="relative w-full max-w-[24rem] self-start justify-self-start overflow-hidden rounded-[28px] border border-white/8 bg-white/15 p-6 text-left backdrop-blur-xl shadow-[0_14px_50px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.05)] xl:justify-self-end">
              {/* Atmospheric overlay */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_34%)]" />
              </div>

              <div className="relative space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">
                      Constructor
                    </p>
                    <p className="text-2xl font-f1-bold tracking-[-0.04em] text-white">
                      {activeTeam?.shortName}
                    </p>
                  </div>
                </div>

                <div
                  className="h-px w-20"
                  style={{
                    background: `linear-gradient(to right, ${activeTeam?.primaryColor}cc, ${activeTeam?.primaryColor}33, transparent)`,
                  }}
                />

                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <div className="rounded-[20px] border border-white/6 bg-white/[0.03] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-white/38">
                      Constructor
                    </p>
                    <p className="mt-2 text-[28px] font-f1-bold leading-none text-white">
                      P{activeTeam?.constructorOrder}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-white/6 bg-white/[0.03] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-white/38">
                      Points
                    </p>
                    <p className="mt-2 text-[28px] font-f1-bold leading-none text-white">
                      {activeTeam?.constructorPoints}
                    </p>
                  </div>
                </div>

                <div className="h-px bg-white/8" />

                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/38">
                    Driver pair
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeDrivers.map((driver) => (
                      <span
                        key={driver.id}
                        className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-[11px] font-f1-bold text-white/72 uppercase"
                      >
                        {driver.abbreviation}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clean-view toggle */}
      <button
        type="button"
        onClick={toggleUI}
        className="absolute bottom-6 left-6 z-[60] flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] backdrop-blur-xl transition-all duration-300 hover:border-white/25 hover:bg-white/10"
        aria-label={uiHidden ? "Show UI" : "Hide UI"}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="text-white/70 transition-transform duration-300"
          style={{ transform: uiHidden ? "rotate(45deg)" : "rotate(0deg)" }}
        >
          <rect x="2" y="4" width="12" height="1.5" rx="0.75" fill="currentColor" />
          <rect x="2" y="10.5" width="12" height="1.5" rx="0.75" fill="currentColor" />
        </svg>
      </button>

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
            cardClassName=""
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
