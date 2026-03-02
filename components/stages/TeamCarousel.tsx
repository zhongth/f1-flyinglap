"use client";

import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Mouse, MoveHorizontal } from "lucide-react";
import { gsap } from "@/lib/gsap";
import { useAppStore } from "@/store/useAppStore";
import type { Card } from "@/components/ui/RotatingCards";
import { TeamWallpaper } from "@/components/ui/TeamWallpaper";

const RotatingCards = dynamic(
  () => import("@/components/ui/RotatingCards"),
  { ssr: false }
);
const HyperspeedBackground = dynamic(
  () => import("@/components/ui/HyperspeedBackground"),
  { ssr: false }
);
import { teams } from "@/data";
import { getTeamById } from "@/data/teams";
import { hyperspeedPresets } from "@/components/ui/HyperspeedPresets";

export function TeamCarousel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const hyperspeedRef = useRef<HTMLDivElement>(null);
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

  const defaultTeam = useMemo(
    () => sortedTeams.find((team) => team.id === "ferrari") ?? sortedTeams[0],
    [sortedTeams]
  );
  const activeTeam = hoveredTeamId ? getTeamById(hoveredTeamId) : defaultTeam;
  const ferrariStopRotation = useMemo(() => {
    const ferrariIndex = sortedTeams.findIndex((team) => team.id === "ferrari");
    if (ferrariIndex < 0 || sortedTeams.length === 0) return 0;

    const angleStep = 360 / sortedTeams.length;
    const topCenterAngle = -90;
    return topCenterAngle - ferrariIndex * angleStep;
  }, [sortedTeams]);
  const [spinIntro, setSpinIntro] = useState(!isIntroComplete);
  const [hasActivatedWallpaper, setHasActivatedWallpaper] = useState(false);
  const handleIntroSpinComplete = useCallback(() => {
    setSpinIntro(false);
  }, []);

  useEffect(() => {
    if (hoveredTeamId && getTeamById(hoveredTeamId)) return;
    setHoveredTeamId(defaultTeam.id);
  }, [defaultTeam.id, hoveredTeamId, setHoveredTeamId]);

  // Build RotatingCards card array from teams
  const teamCards: Card[] = useMemo(
    () =>
      sortedTeams.map((team) => ({
        id: team.id,
        content: (
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="relative w-14 h-14">
              <Image
                src={team.logoPath}
                alt={team.name}
                fill
                sizes="56px"
                className="object-contain"
                draggable={false}
              />
            </div>
            <span className="text-[10px] font-f1 tracking-wider text-white/70 uppercase text-center leading-tight">
              {team.shortName}
            </span>
          </div>
        ),
        background: `linear-gradient(135deg, ${team.primaryColor}30 0%, ${team.primaryColor}10 100%)`,
      })),
    [sortedTeams]
  );

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
        const bgLayers = [hyperspeedRef.current, wallpaperRef.current].filter(
          Boolean
        );
        if (bgLayers.length > 0) {
          tl.to(
            bgLayers,
            {
              opacity: 0,
              duration: 0.4,
              ease: "power2.in",
            },
            0.1
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
          0
        );
      }, containerRef);
    },
    [isAnimating, selectTeam, setStage, setIsAnimating]
  );

  // Click a card: first click highlights, second click selects
  const handleCardClick = useCallback(
    (card: Card) => {
      if (isAnimating) return;
      const teamId = card.id as string;

      if (!hasActivatedWallpaper) {
        setHasActivatedWallpaper(true);
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
      hasActivatedWallpaper,
    ]
  );

  // Whether we're still in the intro phase (used for CSS initial states)
  const showIntro = !isIntroComplete;

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
      gsap.set(wheel, { y: 200 });
      gsap.set(hint, { y: 20 });

      const tl = gsap.timeline({
        onComplete: () => setIntroComplete(),
      });

      tl.to(hyperspeed, { opacity: 1, duration: 1, ease: "power2.out" });
      tl.to(title, { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" }, "-=0.7");
      tl.to(wheel, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, "-=0.6");
      tl.to(hint, { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" }, "-=0.3");
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
          effectOptions={{
            ...hyperspeedPresets.two,
            distortion: "xyDistortion",
            speedUp: 1,
            fovSpeedUp: 102,
            lanesPerRoad: 3,
            lightPairsPerRoadWay: 22,
            totalSideLightSticks: 18,
            islandWidth: 12,
          }}
          className="h-full w-full"
        />
      </div>

      {/* Team wallpaper overlay — appears after first click */}
      <div
        ref={wallpaperRef}
        className={`absolute inset-0 z-10 transition-opacity duration-700 ${hasActivatedWallpaper && !showIntro ? "opacity-100" : "opacity-0"}`}
      >
        <TeamWallpaper team={hasActivatedWallpaper ? activeTeam ?? null : null} />
      </div>

      {/* Team name — prominent display at top */}
      <div
        ref={titleRef}
        className={`absolute top-[12%] left-0 right-0 z-40 text-center pointer-events-none ${showIntro ? "opacity-0" : ""}`}
      >
        <h1 className="font-f1-bold text-2xl md:text-3xl lg:text-[40px] tracking-wider text-white/90 uppercase leading-relaxed">
          {hasActivatedWallpaper
            ? activeTeam?.name ?? defaultTeam.name
            : "Welcome to Flying Lap"}
        </h1>
      </div>

      {/* Rotating cards carousel — positioned at bottom, half visible */}
      <div className="absolute bottom-0 left-0 right-0 z-50 flex h-[50vh] translate-y-[40%] items-center justify-center">
        <div ref={wheelRef} className={showIntro ? "opacity-0" : undefined}>
          <RotatingCards
            cards={teamCards}
            autoPlay={false}
            draggable
            pauseOnHover={false}
            radius={360}
            dragSensitivity={1.8}
            cardWidth={110}
            cardHeight={140}
            duration={25}
            initialRotation={ferrariStopRotation}
            onCardClick={handleCardClick}
            cardClassName="border-white/5 backdrop-blur-md"
            introSpin={spinIntro}
            introSpinRevolutions={1}
            introSpinDuration={2800}
            onIntroComplete={handleIntroSpinComplete}
          />
        </div>
      </div>

      {/* "Select your team" text + hint icons at bottom */}
      <div
        ref={hintRef}
        className={`absolute bottom-[4%] left-0 right-0 flex flex-col items-center pointer-events-none z-[60] ${showIntro ? "opacity-0" : ""}`}
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
