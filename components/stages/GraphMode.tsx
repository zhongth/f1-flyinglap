"use client";

import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { gsap } from "@/lib/gsap";
import { useAppStore } from "@/store/useAppStore";
import { Navbar } from "@/components/ui/Navbar";
import SimpleGraph from "@/components/ui/SimpleGraph";
import {
  getTeamById,
  getDriversByTeamId,
  calculateMedianQualifyingGap,
  calculateHeadToHead,
  calculateQ3Rate,
  getPerRaceQualifyingGaps,
} from "@/data";
import { cn } from "@/lib/utils";

const COUNTRY_ABBR: Record<string, string> = {
  Australia: "AUS",
  China: "CHN",
  Japan: "JPN",
  Bahrain: "BHR",
  "Saudi Arabia": "KSA",
  USA: "USA",
  Italy: "ITA",
  Monaco: "MON",
  Spain: "ESP",
  Canada: "CAN",
  Austria: "AUT",
  "Great Britain": "GBR",
  Belgium: "BEL",
  Hungary: "HUN",
  Netherlands: "NLD",
  Azerbaijan: "AZE",
  Singapore: "SGP",
  Mexico: "MEX",
  Brazil: "BRA",
  Qatar: "QAT",
  "Abu Dhabi": "ABU",
};

/* SimpleGraph viewBox constants — must match the component's internals */
const VB_W = 800;
const VB_H = 400;
const GRAPH_PADDING = { left: 56, bottom: 48, top: 36, right: 30 };
const GRAPH_HEIGHT = 380;

/* Compute the 5 grid-line Y-percentages within the container */
const plotTop = GRAPH_PADDING.top;
const plotBottom = VB_H - GRAPH_PADDING.bottom;
const graphH = plotBottom - plotTop;
const GRID_LINE_PCTS = Array.from(
  { length: 5 },
  (_, i) => ((plotTop + (i * graphH) / 4) / VB_H) * 100,
);
const Y_LABEL_RIGHT_PCT = ((GRAPH_PADDING.left - 8) / VB_W) * 100;

export function GraphMode() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const backBtnRef = useRef<HTMLButtonElement>(null);
  const isExitingRef = useRef(false);

  const [showGraph, setShowGraph] = useState(false);
  const [cardExpanded, setCardExpanded] = useState(false);

  const {
    selectedTeamId,
    timeScope,
    setTimeScope,
    setSelectedTeamId,
    setCameraMode,
    setStage,
  } = useAppStore();

  const team = selectedTeamId ? getTeamById(selectedTeamId) : null;
  const drivers = selectedTeamId ? getDriversByTeamId(selectedTeamId) : [];

  const medianGap = useMemo(() => {
    if (drivers.length !== 2) return null;
    return calculateMedianQualifyingGap(
      drivers[0].id,
      drivers[1].id,
      timeScope,
    );
  }, [drivers, timeScope]);

  const headToHead = useMemo(() => {
    if (drivers.length !== 2) return null;
    return calculateHeadToHead(drivers[0].id, drivers[1].id, timeScope);
  }, [drivers, timeScope]);

  const q3Rates = useMemo(() => {
    if (drivers.length !== 2) return null;
    return {
      driver1: calculateQ3Rate(drivers[0].id, timeScope),
      driver2: calculateQ3Rate(drivers[1].id, timeScope),
    };
  }, [drivers, timeScope]);

  // Full season qualifying gaps
  const perRaceGaps = useMemo(() => {
    if (drivers.length !== 2) return [];
    return getPerRaceQualifyingGaps(drivers[0].id, drivers[1].id, 24);
  }, [drivers]);

  // SimpleGraph data with abbreviations + formatted value labels
  const graphData = useMemo(() => {
    return perRaceGaps.map((gap) => ({
      value: Math.abs(gap.gapMs),
      label:
        COUNTRY_ABBR[gap.country] ||
        gap.country.slice(0, 3).toUpperCase(),
      meta: gap.country,
      valueLabel: `${Math.abs(gap.gapMs)}ms`,
    }));
  }, [perRaceGaps]);

  // Compute Y-axis tick values (must replicate SimpleGraph's padding logic)
  const yTicks = useMemo(() => {
    if (graphData.length === 0) return [];
    const values = graphData.map((d) => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    const pMin = minVal - range * 0.1;
    const pMax = maxVal + range * 0.1;

    return Array.from({ length: 5 }, (_, i) => ({
      value: pMax - (i / 4) * (pMax - pMin),
      pct: GRID_LINE_PCTS[i],
    }));
  }, [graphData]);

  const formatGapDisplay = (ms: number): string => {
    const absMs = Math.abs(ms);
    const seconds = Math.floor(absMs / 1000);
    const milliseconds = Math.floor(absMs % 1000);
    return `${seconds}.${milliseconds.toString().padStart(3, "0")}%`;
  };

  const isFaster = (medianGap?.medianGap ?? 0) < 0;

  // Card expand animation on mount
  useEffect(() => {
    if (!cardRef.current) return;

    gsap.fromTo(
      cardRef.current,
      { scale: 0.6, opacity: 0, y: 30 },
      {
        scale: 1,
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "back.out(1.2)",
        delay: 0.3,
        onComplete: () => {
          setCardExpanded(true);
          setTimeout(() => setShowGraph(true), 200);
        },
      },
    );
  }, []);

  // Back to VERSUS
  const handleBack = useCallback(() => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;

    setCameraMode("cinematic");

    const tl = gsap.timeline({
      onComplete: () => {
        setStage("VERSUS");
        isExitingRef.current = false;
      },
    });

    tl.to(
      cardRef.current,
      { scale: 0.8, opacity: 0, y: 20, duration: 0.35, ease: "power2.in" },
      0,
    );
    tl.to(
      backBtnRef.current,
      { opacity: 0, duration: 0.25, ease: "power2.in" },
      0,
    );
    tl.to(
      navRef.current,
      { opacity: 0, y: 40, duration: 0.3, ease: "power2.in" },
      0.05,
    );
    tl.to(
      overlayRef.current,
      { opacity: 0, duration: 0.5, ease: "power2.inOut" },
      0.1,
    );
  }, [setCameraMode, setStage]);

  const handleTeamSelect = useCallback(
    (teamId: string) => {
      if (teamId === selectedTeamId) return;
      setSelectedTeamId(teamId);
      setShowGraph(false);
      setCardExpanded(false);

      if (cardRef.current) {
        gsap.fromTo(
          cardRef.current,
          { scale: 0.85, opacity: 0.3 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.5,
            ease: "power3.out",
            onComplete: () => {
              setCardExpanded(true);
              setTimeout(() => setShowGraph(true), 200);
            },
          },
        );
      }
    },
    [selectedTeamId, setSelectedTeamId],
  );

  if (!team || drivers.length !== 2) return null;

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Atmospheric overlay — heavier at top for card readability, lighter at bottom for car */}
      <div
        ref={overlayRef}
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.15) 100%)",
        }}
      />

      {/* Back button */}
      <button
        ref={backBtnRef}
        onClick={handleBack}
        className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 text-white/30 hover:text-white/70 transition-colors rounded-full hover:bg-white/5"
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
        <span className="uppercase tracking-wider text-xs font-f1">Back</span>
      </button>

      {/* Navbar */}
      <div ref={navRef}>
        <Navbar onTeamSelect={handleTeamSelect} />
      </div>

      {/* Data card — pinned to top, leaving bottom for the car above dock */}
      <div className="relative z-20 flex justify-center pt-12 px-8">
        <div
          ref={cardRef}
          className="rounded-[36px] bg-black/60 backdrop-blur-sm border border-white/[0.06]"
          style={{ width: 1340, opacity: 0, padding: "40px 56px 48px" }}
        >
          {/* ── Header ── */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <div
                  className="w-1 h-7 rounded-full"
                  style={{ backgroundColor: team.primaryColor }}
                />
                <span className="font-f1-bold text-[13px] text-white/50 uppercase tracking-[0.15em]">
                  {team.name}
                </span>
              </div>
              <h1 className="font-f1-bold text-[18px] text-white uppercase tracking-[0.12em]">
                Qualifying Analysis
              </h1>
            </div>

            <button
              onClick={() =>
                setTimeScope(timeScope === "season" ? "last5" : "season")
              }
              className="flex items-center gap-1.5 text-white/60 hover:text-white/90 transition-colors"
            >
              <span className="text-[13px] font-semibold capitalize">
                {timeScope === "season" ? "2025 Season" : "Last 5 Races"}
              </span>
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* ── Content grid ── */}
          <div className="grid grid-cols-[1fr_300px] gap-12">
            {/* ===== Left column: gap number + graph ===== */}
            <div className="flex flex-col gap-5">
              {/* Median gap big number */}
              <div className="flex flex-col gap-1.5">
                <p className="font-f1-bold text-[12px] text-white/35 uppercase tracking-[0.15em]">
                  Median Quali Gap
                </p>
                <p className="font-f1-bold text-[68px] text-white leading-none">
                  {formatGapDisplay(medianGap?.medianGap ?? 0)}
                </p>
                <p className="text-[12px] text-white/35 mt-1">
                  across {medianGap?.raceCount ?? 0} qualifying sessions
                </p>
              </div>

              {/* Graph with axis labels */}
              <div className="flex flex-col gap-1">
                <p className="font-f1-bold text-[10px] text-white/25 uppercase tracking-[0.15em]">
                  Season Qualifying Delta
                </p>

                <div className="relative">
                  {showGraph && graphData.length > 0 && (
                    <>
                      <SimpleGraph
                        data={graphData}
                        lineColor={team.primaryColor}
                        dotColor={team.primaryColor}
                        height={GRAPH_HEIGHT}
                        dotSize={5}
                        dotHoverGlow
                        graphLineThickness={2.5}
                        animationDuration={2}
                        showGrid
                        gridStyle="dashed"
                        gridLines="horizontal"
                        gridLineThickness={0.5}
                        curved
                        gradientFade
                        showDots
                        showXAxisLabels
                        xLabelColor="rgba(255,255,255,0.3)"
                        xLabelFontSize={9}
                        padding={GRAPH_PADDING}
                        className="w-full"
                      />

                      {/* Y-axis tick values — aligned with the 5 horizontal grid lines */}
                      {yTicks.map((tick, i) => (
                        <div
                          key={i}
                          className="absolute pointer-events-none text-[10px] text-white/30 font-f1 text-right pr-1.5 leading-none"
                          style={{
                            top: `${tick.pct}%`,
                            left: 0,
                            width: `${Y_LABEL_RIGHT_PCT}%`,
                            transform: "translateY(-50%)",
                          }}
                        >
                          {Math.round(tick.value)}
                        </div>
                      ))}

                      {/* Y-axis unit label */}
                      <div
                        className="absolute pointer-events-none text-[9px] text-white/20 font-f1 uppercase tracking-wider"
                        style={{
                          left: 0,
                          top: `${(GRAPH_PADDING.top / VB_H) * 100}%`,
                          transform: "translateY(-180%)",
                        }}
                      >
                        ms
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ===== Right column: H2H + Q3 + recent results ===== */}
            <div className="flex flex-col gap-7 pt-1">
              {/* Head to Head */}
              <div className="flex flex-col gap-4">
                <p className="font-f1-bold text-[11px] text-white/30 uppercase tracking-[0.15em]">
                  Head to Head
                </p>
                <div className="flex items-center justify-between px-4">
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={cn(
                        "font-f1-bold text-[14px]",
                        isFaster ? "text-white" : "text-white/40",
                      )}
                    >
                      {drivers[0].abbreviation}
                    </span>
                    <span
                      className={cn(
                        "font-f1-bold text-[40px] leading-none",
                        isFaster ? "text-white" : "text-white/40",
                      )}
                    >
                      {headToHead?.driver1Wins ?? 0}
                    </span>
                  </div>
                  <span className="text-[22px] text-white/15 font-f1">—</span>
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={cn(
                        "font-f1-bold text-[14px]",
                        !isFaster ? "text-white" : "text-white/40",
                      )}
                    >
                      {drivers[1].abbreviation}
                    </span>
                    <span
                      className={cn(
                        "font-f1-bold text-[40px] leading-none",
                        !isFaster ? "text-white" : "text-white/40",
                      )}
                    >
                      {headToHead?.driver2Wins ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-white/[0.06]" />

              {/* Q3 Rate */}
              <div className="flex flex-col gap-4">
                <p className="font-f1-bold text-[11px] text-white/30 uppercase tracking-[0.15em]">
                  Q3 Rate
                </p>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-f1-bold text-[13px] text-white/70">
                        {drivers[0].abbreviation}
                      </span>
                      <span className="font-f1-bold text-[13px] text-white">
                        {Math.round(
                          (q3Rates?.driver1.q3Rate ?? 0) * 100,
                        )}
                        %
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: team.primaryColor }}
                        initial={{ width: 0 }}
                        animate={{
                          width: cardExpanded
                            ? `${(q3Rates?.driver1.q3Rate ?? 0) * 100}%`
                            : 0,
                        }}
                        transition={{
                          duration: 1,
                          delay: 0.3,
                          ease: "easeOut",
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-f1-bold text-[13px] text-white/70">
                        {drivers[1].abbreviation}
                      </span>
                      <span className="font-f1-bold text-[13px] text-white">
                        {Math.round(
                          (q3Rates?.driver2.q3Rate ?? 0) * 100,
                        )}
                        %
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: team.primaryColor,
                          opacity: 0.6,
                        }}
                        initial={{ width: 0 }}
                        animate={{
                          width: cardExpanded
                            ? `${(q3Rates?.driver2.q3Rate ?? 0) * 100}%`
                            : 0,
                        }}
                        transition={{
                          duration: 1,
                          delay: 0.5,
                          ease: "easeOut",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-white/[0.06]" />

              {/* Recent Results */}
              <div className="flex flex-col gap-3">
                <p className="font-f1-bold text-[11px] text-white/30 uppercase tracking-[0.15em]">
                  Recent Results
                </p>
                <div className="flex flex-col gap-2">
                  {perRaceGaps.slice(-5).map((gap) => (
                    <div
                      key={gap.raceId}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-1 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              gap.gapMs > 0
                                ? team.primaryColor
                                : "rgba(255,255,255,0.15)",
                          }}
                        />
                        <span className="text-[11px] text-white/50 font-f1">
                          {gap.country}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-white/25 font-f1">
                          {gap.session}
                        </span>
                        <span
                          className={cn(
                            "text-[11px] font-f1-bold tabular-nums",
                            gap.gapMs > 0
                              ? "text-white/80"
                              : "text-white/45",
                          )}
                        >
                          {gap.gapFormatted}s
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
