"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Carousel } from "@/components/ui/apple-cards-carousel";
import { ProgressiveBlur } from "@/components/ui/ProgressiveBlur";
import { teams } from "@/data";
import { getDriversByTeamId } from "@/data/drivers";
import { getTeamById } from "@/data/teams";
import { getDriverPoints } from "@/data/qualifying";

import { gsap } from "@/lib/gsap";
import { useAppStore } from "@/store/useAppStore";

// Car image map — static, never changes
const CAR_IMAGE_MAP: Record<string, string> = {
  mclaren: "/f1-2025-cars/2025mclarencarright.webp",
  mercedes: "/f1-2025-cars/2025mercedescarright.webp",
  red_bull: "/f1-2025-cars/2025redbullracingcarright.webp",
  ferrari: "/f1-2025-cars/2025ferraricarright.webp",
  williams: "/f1-2025-cars/2025williamscarright.webp",
  racing_bulls: "/f1-2025-cars/2025racingbullscarright.webp",
  aston_martin: "/f1-2025-cars/2025astonmartincarright.webp",
  haas: "/f1-2025-cars/2025haasf1teamcarright.webp",
  sauber: "/f1-2025-cars/2025kicksaubercarright.webp",
  alpine: "/f1-2025-cars/2025alpinecarright.webp",
};

/** Isolated card component — reads hoveredTeamId from store so the parent memo stays stable */
function TeamCardContent({ team, drivers }: { team: { id: string; name: string; shortName: string; primaryColor: string; logoPath: string; constructorOrder: number; constructorPoints: number }; drivers: { id: string; abbreviation: string }[] }) {
  const hoveredTeamId = useAppStore((s) => s.hoveredTeamId);
  const isSelected = team.id === hoveredTeamId;
  const position = `P${team.constructorOrder}`;
  const carImage = CAR_IMAGE_MAP[team.id];

  return (
    <div
      className={`relative w-full h-full overflow-hidden rounded-[20px] border backdrop-blur-xl shadow-[0_14px_50px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors duration-300 ${isSelected ? 'bg-white/15' : 'bg-white/5 hover:bg-white/10'}`}
      style={{
        borderColor: isSelected ? `${team.primaryColor}66` : 'rgba(255,255,255,0.04)',
      }}
    >
      {/* Atmospheric overlay */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_34%)]" />
      </div>

      {/* Team color accent */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[20px]"
        style={{
          background: `radial-gradient(ellipse 130% 100% at 70% 65%, ${team.primaryColor}18, ${team.primaryColor}08 50%, transparent 85%)`,
        }}
      />

      {/* Content */}
      <div className="relative flex flex-col h-full p-5">
        {/* Top row: logo + position/points */}
        <div className="flex items-start justify-between">
          <div className="relative h-[48px] w-[48px]">
            <Image
              src={team.logoPath}
              alt={team.name}
              fill
              sizes="48px"
              className="object-contain"
              draggable={false}
            />
          </div>
          <div className="text-right">
            <p
              className="text-[28px] font-f1-bold leading-none tracking-[-0.04em]"
              style={{ color: team.primaryColor }}
            >
              {position}
            </p>
            <p className="mt-1 text-[13px] font-f1-bold text-white/50">
              {team.constructorPoints} pts
            </p>
          </div>
        </div>

        {/* Team name + accent line + drivers */}
        <div className="mt-3">
          <p className="text-[22px] font-f1-bold leading-none tracking-[-0.02em] text-white">
            {team.shortName}
          </p>
          {/* Team color accent line */}
          <div
            className="mt-2 mb-2 h-px w-20"
            style={{
              background: `linear-gradient(to right, ${team.primaryColor}cc, ${team.primaryColor}33, transparent)`,
            }}
          />
          <div className="flex items-center gap-1.5">
            {drivers.map((d, i) => (
              <span
                key={d.id}
                className="text-[11px] tracking-[0.08em] text-white/50 uppercase font-f1-bold"
              >
                {d.abbreviation}
                {i < drivers.length - 1 && (
                  <span className="ml-1.5 text-white/20">·</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Car image — bottom right, flipped & rear wing clipped */}
      {carImage && (
        <div className="pointer-events-none absolute bottom-[6%] -right-[22%] w-[85%] h-[85%] -scale-x-100">
          <Image
            src={carImage}
            alt={`${team.shortName} car`}
            fill
            sizes="360px"
            className="object-contain object-right-bottom"
            draggable={false}
          />
        </div>
      )}
    </div>
  );
}

interface TeamCarouselProps {
  introReady?: boolean;
}

export function TeamCarousel({ introReady = true }: TeamCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const titleLeftRef = useRef<HTMLDivElement>(null);
  const titleRightRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const podcastRef = useRef<HTMLAnchorElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const windFlyoutTlRef = useRef<gsap.core.Timeline | null>(null);
  const [uiHidden, setUiHidden] = useState(false);

  const {
    setHoveredTeamId,
    hoveredTeamId,
    selectTeam,
    setStage,
    setIsAnimating,
    isAnimating,
    isCarAnimating,
    isIntroComplete,
    setIntroComplete,
    isWindTunnelActive,
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
  const [d1, d2] = activeDrivers;
  const d1Points = d1 ? getDriverPoints(d1.id) : 0;
  const d2Points = d2 ? getDriverPoints(d2.id) : 0;

  // Freeze initialIndex at mount time
  const initialIndexRef = useRef<number | null>(null);
  if (initialIndexRef.current === null) {
    if (hoveredTeamId) {
      const idx = sortedTeams.findIndex((t) => t.id === hoveredTeamId);
      initialIndexRef.current = idx >= 0 ? idx : sortedTeams.findIndex((t) => t.id === "ferrari");
    } else {
      initialIndexRef.current = Math.max(0, sortedTeams.findIndex((t) => t.id === "ferrari"));
    }
  }
  const initialIndex = initialIndexRef.current;

  const selectingRef = useRef(false);

  useEffect(() => {
    if (hoveredTeamId && getTeamById(hoveredTeamId)) return;
    setHoveredTeamId(defaultTeam.id);
  }, [defaultTeam.id, hoveredTeamId, setHoveredTeamId]);

  // Build team card nodes — stable reference
  const teamCardNodes = useMemo(
    () =>
      sortedTeams.map((team) => {
        const drivers = getDriversByTeamId(team.id);
        return <TeamCardContent key={team.id} team={team} drivers={drivers} />;
      }),
    [sortedTeams],
  );

  // Handle team selection with exit animation
  const handleTeamSelect = useCallback(
    (teamId: string) => {
      if (selectingRef.current || isAnimating || isCarAnimating || !containerRef.current) return;
      selectingRef.current = true;

      selectTeam(teamId);

      gsap.context(() => {
        const tl = gsap.timeline({
          onComplete: () => {
            selectingRef.current = false;
            setStage("VERSUS");
            setIsAnimating(false);
          },
        });

        tl.to(
          titleRef.current,
          { y: -40, opacity: 0, duration: 0.3, ease: "power2.in" },
          0,
        );
        tl.to(
          wheelRef.current,
          { y: 200, opacity: 0, duration: 0.5, ease: "power2.in" },
          0.1,
        );
      }, containerRef);
    },
    [isAnimating, isCarAnimating, selectTeam, setStage, setIsAnimating],
  );

  // Click a card: switch team; if already selected → enter Versus
  const handleCardClick = useCallback(
    (index: number) => {
      if (isAnimating || isCarAnimating) return;
      const team = sortedTeams[index];
      if (!team) return;

      if (team.id === hoveredTeamId) {
        handleTeamSelect(team.id);
      } else {
        setHoveredTeamId(team.id);
      }
    },
    [isAnimating, isCarAnimating, hoveredTeamId, handleTeamSelect, setHoveredTeamId, sortedTeams],
  );

  const showIntro = !isIntroComplete;

  // Intro animation
  useEffect(() => {
    if (!introReady || !containerRef.current || isIntroComplete) return;

    const ctx = gsap.context(() => {
      const title = titleRef.current;
      const wheel = wheelRef.current;
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

  // Wind tunnel flyout: scatter UI sections when wind tunnel is active
  useEffect(() => {
    if (isWindTunnelActive) {
      windFlyoutTlRef.current?.kill();
      const tl = gsap.timeline();
      tl.to(titleLeftRef.current, { x: -250, opacity: 0, duration: 0.45, ease: "power2.in" }, 0);
      tl.to(titleRightRef.current, { x: 250, opacity: 0, duration: 0.45, ease: "power2.in" }, 0);
      tl.to(podcastRef.current, { x: 80, opacity: 0, duration: 0.3, ease: "power2.in" }, 0);
      tl.to(wheelRef.current, { y: 120, opacity: 0, duration: 0.45, ease: "power2.in" }, 0.03);
      tl.to(toggleBtnRef.current, { y: 40, opacity: 0, duration: 0.3, ease: "power2.in" }, 0.03);
      windFlyoutTlRef.current = tl;
    } else if (windFlyoutTlRef.current) {
      windFlyoutTlRef.current.kill();
      const tl = gsap.timeline();
      tl.to(titleLeftRef.current, { x: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, 0);
      tl.to(titleRightRef.current, { x: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, 0);
      tl.to(podcastRef.current, { x: 0, opacity: 1, duration: 0.35, ease: "power3.out" }, 0);
      tl.to(wheelRef.current, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, 0.03);
      tl.to(toggleBtnRef.current, { y: 0, opacity: 1, duration: 0.35, ease: "power3.out" }, 0.03);
      windFlyoutTlRef.current = null;
    }
  }, [isWindTunnelActive]);

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
            <div ref={titleLeftRef} className="max-w-[28rem]">
              <Image src="/f1-logo-white.png" alt="F1 Logo" width={120} height={30} className="mb-4" />
              <div className="inline-flex items-center ">
                <p className="text-sm font-f1-bold tracking-[0.16em] text-white/42 uppercase">
                  2025 Season
                </p>
              </div>

              <h1 className="mt-6 text-[42px] md:text-[52px] font-f1-bold leading-none tracking-[-0.04em] text-white">
                Who is Faster ?
              </h1>

              <p className="mt-5 max-w-[24rem] text-[17px] leading-[1.45] tracking-[-0.01em] text-white/56">
                 “117 的客观评价。”   &nbsp;  — 村长托马斯
              </p>
            </div>

            <div ref={titleRightRef} className="relative w-full max-w-[24rem] self-start justify-self-start overflow-hidden rounded-[28px] border border-white/8 bg-white/15 px-7 py-7 text-left backdrop-blur-xl shadow-[0_14px_50px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.05)] xl:justify-self-end">
              {/* Atmospheric overlay */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_34%)]" />
              </div>

              <div className="relative">
                {/* Team header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                      Constructor
                    </p>
                    <p className="text-xl font-f1-bold tracking-[-0.04em] text-white leading-tight">
                      {activeTeam?.name}
                    </p>
                  </div>
                  <p
                    className="text-[32px] font-f1-bold leading-none tracking-[-0.04em] shrink-0"
                    style={{ color: activeTeam?.primaryColor }}
                  >
                    P{activeTeam?.constructorOrder}
                  </p>
                </div>

                <div
                  className="mt-5 h-px w-16"
                  style={{
                    background: `linear-gradient(to right, ${activeTeam?.primaryColor}cc, ${activeTeam?.primaryColor}33, transparent)`,
                  }}
                />

                {/* Points */}
                <div className="mt-5">
                  <p className="text-xs uppercase tracking-[0.08em] text-white/50">
                    Total Points
                  </p>
                  <p className="mt-2.5 text-[22px] font-f1-bold leading-none text-white">
                    {activeTeam?.constructorPoints}
                  </p>
                </div>

                <div className="mt-6 h-px bg-white/8" />

                {/* Qualifying H2H */}
                {d1 && d2 && (() => {
                  const total = Math.max(d1Points + d2Points, 1);
                  const d1Pct = Math.round((d1Points / total) * 100);
                  const d2Pct = 100 - d1Pct;
                  return (
                    <div className="mt-6">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/50">
                        Points Split
                      </p>
                      <div className="mt-4 flex items-center gap-3">
                        <span className={`text-[12px] font-f1-bold uppercase ${d1Points >= d2Points ? "text-white" : "text-white/40"}`}>
                          {d1.abbreviation}
                        </span>
                        <div className="flex-1 flex h-[5px] rounded-full overflow-hidden bg-white/6">
                          <div
                            className="h-full rounded-l-full"
                            style={{
                              width: `${d1Pct}%`,
                              backgroundColor: d1Points >= d2Points ? activeTeam?.primaryColor : `${activeTeam?.primaryColor}55`,
                            }}
                          />
                          <div
                            className="h-full rounded-r-full"
                            style={{
                              width: `${d2Pct}%`,
                              backgroundColor: d2Points > d1Points ? activeTeam?.primaryColor : `${activeTeam?.primaryColor}55`,
                            }}
                          />
                        </div>
                        <span className={`text-[12px] font-f1-bold uppercase ${d2Points > d1Points ? "text-white" : "text-white/40"}`}>
                          {d2.abbreviation}
                        </span>
                      </div>
                      <div className="mt-1.5 flex justify-between">
                        <span className="text-[16px] font-f1-bold text-white">{d1Pct}%</span>
                        <span className="text-[16px] font-f1-bold text-white">{d2Pct}%</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Driver lineup */}
                <div className="mt-9 space-y-3">
                  {activeDrivers.map((driver) => {
                    const points = getDriverPoints(driver.id);
                    return (
                      <div key={driver.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="text-[14px] font-f1-bold tabular-nums w-8"
                            style={{ color: activeTeam?.primaryColor }}
                          >
                            {driver.number}
                          </span>
                          <p className="text-[13px] font-f1-bold text-white leading-none">
                            {driver.firstName} {driver.lastName}
                          </p>
                        </div>
                        <span className="text-[13px] font-f1-bold tabular-nums text-white/50">
                          {points} <span className="text-[10px] tracking-[0.08em] font-f1-regular text-white/30">PTS</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clean-view toggle */}
      <button
        ref={toggleBtnRef}
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

      {/* Horizontal team selector — anchored to bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-50 pb-10">
        <div
          ref={wheelRef}
          className={
            showIntro
              ? "relative mx-auto w-full opacity-0"
              : "relative mx-auto w-full"
          }
        >
          <Carousel
            items={teamCardNodes}
            initialIndex={initialIndex}
            cardWidth={340}
            cardAspectRatio={17 / 10}
            gap={24}
            onCardClick={handleCardClick}
            disabled={isAnimating || isCarAnimating}
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
