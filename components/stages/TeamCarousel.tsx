"use client";

import { Mouse, MousePointerClick, MoveHorizontal } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { GradientCarouselItem } from "@/components/ui/GradientCarousel";
import { hyperspeedPresets } from "@/components/ui/HyperspeedPresets";
import { ProgressiveBlur } from "@/components/ui/ProgressiveBlur";
import { teams } from "@/data";
import { getDriversByTeamId } from "@/data/drivers";
import { getTeamCarModelPath } from "@/data/teamCarModels";
import { getTeamById } from "@/data/teams";
import { gsap } from "@/lib/gsap";
import { useAppStore } from "@/store/useAppStore";

const GradientCarousel = dynamic(
  () => import("@/components/ui/GradientCarousel"),
  { ssr: false },
);
const HyperspeedBackground = dynamic(
  () => import("@/components/ui/HyperspeedBackground"),
  { ssr: false },
);

interface TeamCarouselProps {
  introReady?: boolean;
}

export function TeamCarousel({ introReady = true }: TeamCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const hyperspeedRef = useRef<HTMLDivElement>(null);
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
  const selectingRef = useRef(false);
  const activeCarModelPath = useMemo(
    () => getTeamCarModelPath(activeTeam?.id ?? defaultTeam.id),
    [activeTeam?.id, defaultTeam.id],
  );

  useEffect(() => {
    if (hoveredTeamId && getTeamById(hoveredTeamId)) return;
    setHoveredTeamId(defaultTeam.id);
  }, [defaultTeam.id, hoveredTeamId, setHoveredTeamId]);

  // Build team card array for GradientCarousel
  const teamCards: GradientCarouselItem[] = useMemo(
    () =>
      sortedTeams.map((team) => ({
        id: team.id,
        content: (
          <div className="relative flex flex-col items-center justify-center w-full h-full overflow-hidden">
            {/* Logo with team-colored glow aura */}
            <div className="relative z-10 flex items-center justify-center">
              <div
                className="absolute inset-[-12px] rounded-full blur-2xl opacity-20"
                style={{ background: team.primaryColor }}
              />
              <div className="relative h-[72px] w-[72px]">
                <Image
                  src={team.logoPath}
                  alt={team.name}
                  fill
                  sizes="72px"
                  className="object-contain drop-shadow-lg"
                  draggable={false}
                />
              </div>
            </div>

            {/* Team name + accent divider + position */}
            <div className="relative z-10 mt-6 flex flex-col items-center gap-3">
              <span className="text-lg font-f1-bold  text-white/80 uppercase text-center leading-tight">
                {team.shortName}
              </span>

              <span
                className="text-xs font-f1-bold uppercase"
                style={{ color: `${team.primaryColor}99` }}
              >
                {getDriversByTeamId(team.id)
                  .map((d) => d.abbreviation)
                  .join(" · ")}
              </span>
            </div>
          </div>
        ),
        background: `linear-gradient(165deg, ${team.primaryColor}18 0%, ${team.primaryColor}08 40%, rgba(0,0,0,0.3) 100%)`,
        activeBackground: `linear-gradient(165deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%), linear-gradient(165deg, ${team.primaryColor}A0 0%, ${team.primaryColor}60 100%)`,
        primaryColor: team.primaryColor,
        secondaryColor: team.secondaryColor,
      })),
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

        if (hyperspeedRef.current) {
          tl.to(
            hyperspeedRef.current,
            {
              opacity: 0,
              duration: 0.4,
              ease: "power2.in",
            },
            0.1,
          );
        }

        // Hint exits downward
        tl.to(
          hintRef.current,
          {
            y: 20,
            opacity: 0,
            duration: 0.2,
            ease: "power2.in",
          },
          0,
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
  const hyperspeedEffectOptions = useMemo(
    () => ({
      ...hyperspeedPresets.two,
      distortion: "xyDistortion" as const,
      speedUp: 1,
      fovSpeedUp: 102,
      lanesPerRoad: 3,
      lightPairsPerRoadWay: 22,
      totalSideLightSticks: 18,
      islandWidth: 12,
    }),
    [],
  );

  // Intro animation
  useEffect(() => {
    if (!introReady || !containerRef.current || isIntroComplete) return;

    const ctx = gsap.context(() => {
      const title = titleRef.current;
      const wheel = wheelRef.current;
      const hyperspeed = hyperspeedRef.current;
      const hint = hintRef.current;

      // Set initial states (CSS classes handle opacity:0, GSAP adds transforms)
      gsap.set(title, { y: -30 });
      gsap.set(wheel, { y: 0 });
      gsap.set(hint, { y: 20 });

      const tl = gsap.timeline({
        onComplete: () => setIntroComplete(),
      });

      tl.to(hyperspeed, { opacity: 1, duration: 1, ease: "power2.out" });
      tl.to(
        title,
        { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
        0.12,
      );
      tl.to(wheel, { opacity: 1, duration: 0.8, ease: "power2.out" }, 0);
      tl.to(hint, { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" }, 0.2);
    }, containerRef);

    return () => ctx.revert();
  }, [introReady, isIntroComplete, setIntroComplete]);

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden bg-black"
    >
      {/* Hyperspeed base background — always rendered */}
      <div
        ref={hyperspeedRef}
        className={`absolute inset-0 z-0 pointer-events-none ${showIntro ? "opacity-0" : ""}`}
      >
        <HyperspeedBackground
          effectOptions={hyperspeedEffectOptions}
          carModelPath={activeCarModelPath}
          className="h-full w-full"
        />
      </div>

      {/* Team name — prominent display at top */}
      <div
        ref={titleRef}
        className={`absolute top-[12%] left-0 right-0 z-40 text-center pointer-events-none ${showIntro ? "opacity-0" : ""}`}
      >
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-5 py-2 backdrop-blur-xl">
          <span className="h-1.5 w-1.5 rounded-full bg-[#E10600] shadow-[0_0_10px_rgba(225,6,0,0.8)]" />
          <p className="font-f1 text-[10px] md:text-xs tracking-[0.1em] text-white/65 uppercase">
            F1 Flying Lap 飞驰圈
          </p>
        </div>
        <h1 className="mt-5 font-f1-bold text-2xl md:text-4xl lg:text-[48px] tracking-[0.08em] text-white/95 uppercase leading-tight">
          Welcome to Flying Lap
        </h1>
        <p className="mt-3 font-f1 text-[11px] md:text-xs tracking-[0.18em] text-white/45 uppercase">
          Now previewing {activeTeam?.name ?? defaultTeam.name}
        </p>
      </div>

      {/* Horizontal team selector */}
      <div className="absolute inset-0 z-50">
        <div
          ref={hintRef}
          className={`pointer-events-none absolute left-1/2 top-[22%] z-[60] flex -translate-x-1/2 flex-col items-center ${showIntro ? "opacity-0" : ""}`}
        >
          <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-3 backdrop-blur-xl shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
            <p className="text-center font-f1 text-[11px] md:text-xs tracking-[0.18em] text-white/70 uppercase">
              Swipe or scroll to browse teams
            </p>
            <div className="mt-2 h-px w-full bg-white/10" />
            <div className="mt-2 flex items-center justify-center gap-2 text-white/50">
              <Mouse className="h-4 w-4" strokeWidth={1.5} />
              <MoveHorizontal className="h-4 w-4" strokeWidth={1.5} />
              <MousePointerClick className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <p className="mt-2 text-center font-f1 text-[10px] tracking-[0.17em] text-white/45 uppercase">
              Click any card to highlight and center, then click again to enter
              Versus mode
            </p>
          </div>
        </div>

        <div className="flex h-full items-center justify-center">
          <div
            ref={wheelRef}
            className={
              showIntro
                ? "relative mx-auto h-[40vh] w-full overflow-hidden opacity-0"
                : "relative mx-auto h-[40vh] w-full overflow-hidden"
            }
          >
            <GradientCarousel
              items={teamCards}
              className="h-full w-full bg-transparent"
              cardClassName="border-white/5 backdrop-blur-md bg-black/25"
              contentClassName=""
              cardWidthPx={236}
              cardAspectRatio={110 / 140}
              initialIndex={ferrariInitialIndex}
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
    </div>
  );
}
