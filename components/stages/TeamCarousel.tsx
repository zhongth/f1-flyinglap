"use client";

import { Mouse, MoveHorizontal } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export function TeamCarousel() {
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
  const [hasInteracted, setHasInteracted] = useState(false);
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

  // Click a card: first click previews car model, second click selects.
  const handleCardClick = useCallback(
    (index: number) => {
      if (isAnimating) return;
      const selectedTeam = sortedTeams[index];
      if (!selectedTeam) return;
      const teamId = selectedTeam.id;

      if (!hasInteracted) {
        setHasInteracted(true);
        setHoveredTeamId(teamId);
        return;
      }

      if (hoveredTeamId === teamId) {
        // Same team clicked again — select it
        handleTeamSelect(teamId);
      } else {
        // Highlight this team
        setHoveredTeamId(teamId);
      }
    },
    [
      isAnimating,
      hoveredTeamId,
      setHoveredTeamId,
      handleTeamSelect,
      hasInteracted,
      sortedTeams,
    ],
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
    if (!containerRef.current || isIntroComplete) return;

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
        "-=0.7",
      );
      tl.to(wheel, { opacity: 1, duration: 0.8, ease: "power2.out" }, "-=0.6");
      tl.to(
        hint,
        { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" },
        "-=0.3",
      );
    }, containerRef);

    return () => ctx.revert();
  }, [isIntroComplete, setIntroComplete]);

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
        <h1 className="font-f1-bold text-2xl md:text-3xl lg:text-[40px] tracking-wider text-white/90 uppercase leading-relaxed">
          {hasInteracted
            ? (activeTeam?.name ?? defaultTeam.name)
            : "Welcome to Flying Lap"}
        </h1>
      </div>

      {/* Horizontal team selector */}
      <div className="absolute inset-0 z-50">
        <div
          ref={hintRef}
          className={`pointer-events-none absolute left-1/2 top-[22%] z-[60] flex -translate-x-1/2 flex-col items-center ${showIntro ? "opacity-0" : ""}`}
        >
          <p className="font-f1 text-base md:text-lg lg:text-xl tracking-[0.2em] text-white/70 uppercase">
            Select your team
          </p>
          <p className="mt-2 font-f1 text-[10px] tracking-[0.2em] text-white/40 uppercase">
            Click to preview • Click again to confirm
          </p>
          <div className="mt-5 flex flex-col items-center gap-2">
            <Mouse className="h-5 w-5 text-white/25" strokeWidth={1.5} />
            <MoveHorizontal
              className="h-5 w-5 text-white/25"
              strokeWidth={1.5}
            />
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
              contentClassName="p-8"
              cardWidthPx={236}
              cardAspectRatio={110 / 140}
              initialIndex={ferrariInitialIndex}
              introSpin={!isIntroComplete}
              introSpinRounds={1}
              introSpinDurationMs={2900}
              onCardClick={handleCardClick}
              maxRotationDegrees={12}
              maxDepthPx={96}
              cardGap={28}
              dragSensitivity={1}
              frictionFactor={0.88}
              wheelSensitivity={0.35}
              gradientIntensity={0.55}
              gradientSize={0.5}
              backgroundBlur={22}
              showBackdrop={false}
              showLoadingOverlay={false}
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
