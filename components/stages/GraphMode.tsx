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

/* Compute the 5 grid-line Y-percentages within the container */
const plotTop = GRAPH_PADDING.top;
const plotBottom = VB_H - GRAPH_PADDING.bottom;
const graphH = plotBottom - plotTop;
const GRID_LINE_PCTS = Array.from(
  { length: 5 },
  (_, i) => ((plotTop + (i * graphH) / 4) / VB_H) * 100,
);
const Y_LABEL_RIGHT_PCT = ((GRAPH_PADDING.left - 8) / VB_W) * 100;

const CARD =
  "rounded-[24px] bg-black/60 backdrop-blur-sm border border-white/[0.06]";

/* Direction each card flies in from — Mac trackpad spread style.
   Vector points FROM where the card starts TO its final grid position. */
const FLY_IN = [
  { x: -800, y: -500, rotate: -15 }, // 0 header:  top-left
  { x: 0, y: -600, rotate: 0 }, // 1 gap:     top-center
  { x: 800, y: -500, rotate: 15 }, // 2 h2h:     top-right
  { x: -900, y: 300, rotate: -10 }, // 3 graph:   center-left
  { x: 900, y: 0, rotate: 10 }, // 4 q3:      right
  { x: 900, y: 500, rotate: 15 }, // 5 results: bottom-right
];

export function GraphMode() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const backBtnRef = useRef<HTMLButtonElement>(null);
  const isExitingRef = useRef(false);
  const windFlyoutTlRef = useRef<gsap.core.Timeline | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const graphContainerRef = useRef<HTMLDivElement>(null);

  const [showGraph, setShowGraph] = useState(false);
  const [cardExpanded, setCardExpanded] = useState(false);
  const [graphHeight, setGraphHeight] = useState(220);
  const analysisScope = "season" as const;

  const { selectedTeamId, isWindTunnelActive, setSelectedTeamId, setCameraMode, setStage } =
    useAppStore();

  const team = selectedTeamId ? getTeamById(selectedTeamId) : null;
  const drivers = selectedTeamId ? getDriversByTeamId(selectedTeamId) : [];

  const medianGap = useMemo(() => {
    if (drivers.length !== 2) return null;
    return calculateMedianQualifyingGap(
      drivers[0].id,
      drivers[1].id,
      analysisScope,
    );
  }, [analysisScope, drivers]);

  const headToHead = useMemo(() => {
    if (drivers.length !== 2) return null;
    return calculateHeadToHead(drivers[0].id, drivers[1].id, analysisScope);
  }, [analysisScope, drivers]);

  const q3Rates = useMemo(() => {
    if (drivers.length !== 2) return null;
    return {
      driver1: calculateQ3Rate(drivers[0].id, analysisScope),
      driver2: calculateQ3Rate(drivers[1].id, analysisScope),
    };
  }, [analysisScope, drivers]);

  const perRaceGaps = useMemo(() => {
    if (drivers.length !== 2) return [];
    return getPerRaceQualifyingGaps(drivers[0].id, drivers[1].id, 24);
  }, [drivers]);

  const graphData = useMemo(() => {
    return perRaceGaps.map((gap) => ({
      value: gap.gapMs / 1000,
      label:
        COUNTRY_ABBR[gap.country] || gap.country.slice(0, 3).toUpperCase(),
      meta: gap.country,
      valueLabel: `${gap.gapFormatted}s`,
    }));
  }, [perRaceGaps]);

  const yAxisScale = useMemo(() => {
    if (graphData.length === 0) return null;
    const values = graphData.map((d) => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    const paddedMin = minVal - range * 0.1;
    const paddedMax = maxVal + range * 0.1;
    return {
      min: paddedMin,
      max: paddedMax,
      range: paddedMax - paddedMin || 1,
    };
  }, [graphData]);

  const yTicks = useMemo(() => {
    if (!yAxisScale) return [];
    return Array.from({ length: 5 }, (_, i) => {
      const value =
        yAxisScale.max - (i / 4) * (yAxisScale.max - yAxisScale.min);
      return {
        value,
        pct: GRID_LINE_PCTS[i],
        isZero: Math.abs(value) < 0.0005,
      };
    });
  }, [yAxisScale]);

  const zeroLinePct = useMemo(() => {
    if (!yAxisScale) return null;
    const zeroRatio = (0 - yAxisScale.min) / yAxisScale.range;
    if (zeroRatio < 0 || zeroRatio > 1) return null;
    const zeroY = plotTop + graphH - zeroRatio * graphH;
    return (zeroY / VB_H) * 100;
  }, [yAxisScale]);

  const hasZeroTick = useMemo(
    () => yTicks.some((tick) => tick.isZero),
    [yTicks],
  );

  const formatSecondsTick = useCallback((seconds: number): string => {
    if (Math.abs(seconds) < 0.0005) return "0.000";
    const sign = seconds > 0 ? "+" : "-";
    return `${sign}${Math.abs(seconds).toFixed(3)}`;
  }, []);

  const formatGapDisplay = (ms: number): string => {
    const absMs = Math.abs(ms);
    const seconds = Math.floor(absMs / 1000);
    const milliseconds = Math.floor(absMs % 1000);
    return `${seconds}.${milliseconds.toString().padStart(3, "0")}%`;
  };

  const isFaster = (medianGap?.medianGap ?? 0) < 0;

  /* ── Measure graph container for responsive height ── */
  useEffect(() => {
    const el = graphContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const h = Math.floor(entry.contentRect.height);
      if (h > 100) setGraphHeight(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── Card fly-in animation on mount ── */
  useEffect(() => {
    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    if (cards.length === 0) return;

    // Set scattered starting positions
    cards.forEach((card, i) => {
      const f = FLY_IN[i] ?? FLY_IN[0];
      gsap.set(card, {
        x: f.x,
        y: f.y,
        rotation: f.rotate,
        scale: 0.4,
        opacity: 0,
      });
    });

    // Converge to grid positions
    const tl = gsap.timeline({
      delay: 0.3,
      onComplete: () => {
        setCardExpanded(true);
        setTimeout(() => setShowGraph(true), 200);
      },
    });

    cards.forEach((card, i) => {
      tl.to(
        card,
        {
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          opacity: 1,
          duration: 1.1,
          ease: "power3.out",
        },
        i * 0.06,
      );
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Wind tunnel flyout: scatter cards when wind tunnel is active
  useEffect(() => {
    if (isExitingRef.current) return;

    if (isWindTunnelActive) {
      windFlyoutTlRef.current?.kill();
      const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
      const tl = gsap.timeline();

      cards.forEach((card, i) => {
        const f = FLY_IN[i] ?? FLY_IN[0];
        tl.to(card, {
          x: f.x * 0.5,
          y: f.y * 0.5,
          rotation: f.rotate * 0.4,
          scale: 0.6,
          opacity: 0,
          duration: 0.45,
          ease: "power2.in",
        }, i * 0.03);
      });

      tl.to(backBtnRef.current, { opacity: 0, duration: 0.25, ease: "power2.in" }, 0);
      tl.to(navRef.current, { opacity: 0, y: 50, duration: 0.3, ease: "power2.in" }, 0.04);
      tl.to(overlayRef.current, { opacity: 0, duration: 0.5, ease: "power2.inOut" }, 0.08);

      windFlyoutTlRef.current = tl;
    } else if (windFlyoutTlRef.current) {
      windFlyoutTlRef.current.reverse();
    }
  }, [isWindTunnelActive]);

  /* ── Back to VERSUS ── */
  const handleBack = useCallback(() => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    windFlyoutTlRef.current?.kill();
    setCameraMode("cinematic");

    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    const tl = gsap.timeline({
      onComplete: () => {
        setStage("VERSUS");
        isExitingRef.current = false;
      },
    });

    // Cards fly back out to their origin directions
    cards.forEach((card, i) => {
      const f = FLY_IN[i] ?? FLY_IN[0];
      tl.to(
        card,
        {
          x: f.x * 0.6,
          y: f.y * 0.6,
          rotation: f.rotate * 0.5,
          scale: 0.5,
          opacity: 0,
          duration: 0.45,
          ease: "power2.in",
        },
        i * 0.03,
      );
    });

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

  /* ── Team switch ── */
  const handleTeamSelect = useCallback(
    (teamId: string) => {
      if (teamId === selectedTeamId) return;

      const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
      setShowGraph(false);
      setCardExpanded(false);

      // Quick scatter out
      cards.forEach((card, i) => {
        const f = FLY_IN[i] ?? FLY_IN[0];
        gsap.to(card, {
          x: f.x * 0.2,
          y: f.y * 0.2,
          rotation: f.rotate * 0.2,
          scale: 0.8,
          opacity: 0,
          duration: 0.3,
          ease: "power2.in",
          delay: i * 0.02,
        });
      });

      // After scatter, update data and fly back
      setTimeout(() => {
        setSelectedTeamId(teamId);

        requestAnimationFrame(() => {
          cards.forEach((card, i) => {
            const f = FLY_IN[i] ?? FLY_IN[0];
            gsap.fromTo(
              card,
              {
                x: f.x * 0.2,
                y: f.y * 0.2,
                rotation: f.rotate * 0.2,
                scale: 0.8,
                opacity: 0,
              },
              {
                x: 0,
                y: 0,
                rotation: 0,
                scale: 1,
                opacity: 1,
                duration: 0.65,
                ease: "power3.out",
                delay: i * 0.04,
              },
            );
          });

          setTimeout(() => {
            setCardExpanded(true);
            setTimeout(() => setShowGraph(true), 200);
          }, 450);
        });
      }, 350);
    },
    [selectedTeamId, setSelectedTeamId],
  );

  if (!team || drivers.length !== 2) return null;

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Atmospheric overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)",
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

      {/* ── Cards grid ── */}
      <div className="relative z-20 flex justify-center pt-16 px-8">
        <div
          className="grid gap-3"
          style={{
            gridTemplateAreas: `
              "header  gap     h2h"
              "graph   graph   q3"
              "graph   graph   results"
            `,
            gridTemplateColumns: "1fr 1fr 260px",
            gridTemplateRows: "auto auto 1fr",
            width: 1460,
            maxWidth: "calc(100vw - 64px)",
            height: "calc(100vh - 450px)",
          }}
        >
          {/* ── Card 0: Header ── */}
          <div
            ref={(el) => {
              cardRefs.current[0] = el;
            }}
            className={cn(CARD, "px-5 py-4 flex flex-col justify-center")}
            style={{ gridArea: "header", opacity: 0 }}
          >
            <div className="flex items-center gap-2.5 mb-1.5">
              <div
                className="w-1 h-5 rounded-full"
                style={{ backgroundColor: team.primaryColor }}
              />
              <span className="font-f1-bold text-[11px] text-white/50 uppercase tracking-[0.15em]">
                {team.name}
              </span>
            </div>
            <h1 className="font-f1-bold text-[15px] text-white uppercase tracking-[0.12em]">
              Qualifying Analysis
            </h1>
            <p className="text-[11px] font-semibold text-white/40 mt-0.5">
              2025 Season
            </p>
          </div>

          {/* ── Card 1: Median Gap ── */}
          <div
            ref={(el) => {
              cardRefs.current[1] = el;
            }}
            className={cn(CARD, "px-5 py-4 flex flex-col justify-center")}
            style={{ gridArea: "gap", opacity: 0 }}
          >
            <p className="font-f1-bold text-[10px] text-white/35 uppercase tracking-[0.15em] mb-1">
              Median Quali Gap
            </p>
            <p className="font-f1-bold text-[40px] text-white leading-none">
              {formatGapDisplay(medianGap?.medianGap ?? 0)}
            </p>
            <p className="text-[10px] text-white/35 mt-1.5">
              across {medianGap?.raceCount ?? 0} sessions
            </p>
          </div>

          {/* ── Card 2: Head to Head ── */}
          <div
            ref={(el) => {
              cardRefs.current[2] = el;
            }}
            className={cn(CARD, "px-5 py-4")}
            style={{ gridArea: "h2h", opacity: 0 }}
          >
            <p className="font-f1-bold text-[10px] text-white/30 uppercase tracking-[0.15em] mb-3">
              Head to Head
            </p>
            <div className="flex items-center justify-between px-2">
              <div className="flex flex-col items-center gap-0.5">
                <span
                  className={cn(
                    "font-f1-bold text-[11px]",
                    isFaster ? "text-white" : "text-white/40",
                  )}
                >
                  {drivers[0].abbreviation}
                </span>
                <span
                  className={cn(
                    "font-f1-bold text-[30px] leading-none",
                    isFaster ? "text-white" : "text-white/40",
                  )}
                >
                  {headToHead?.driver1Wins ?? 0}
                </span>
              </div>
              <span className="text-[18px] text-white/15 font-f1">—</span>
              <div className="flex flex-col items-center gap-0.5">
                <span
                  className={cn(
                    "font-f1-bold text-[11px]",
                    !isFaster ? "text-white" : "text-white/40",
                  )}
                >
                  {drivers[1].abbreviation}
                </span>
                <span
                  className={cn(
                    "font-f1-bold text-[30px] leading-none",
                    !isFaster ? "text-white" : "text-white/40",
                  )}
                >
                  {headToHead?.driver2Wins ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* ── Card 3: Graph ── */}
          <div
            ref={(el) => {
              cardRefs.current[3] = el;
            }}
            className={cn(CARD, "px-5 py-4 flex flex-col min-h-0")}
            style={{ gridArea: "graph", opacity: 0 }}
          >
            <p className="font-f1-bold text-[10px] text-white/25 uppercase tracking-[0.15em] mb-1 shrink-0">
              Season Qualifying Delta
            </p>

            <div ref={graphContainerRef} className="relative flex-1 min-h-0">
              {showGraph && graphData.length > 0 && (
                <>
                  <SimpleGraph
                    data={graphData}
                    lineColor={team.primaryColor}
                    dotColor={team.primaryColor}
                    height={graphHeight}
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
                    showZeroLine
                    zeroLineColor="rgba(255,255,255,0.45)"
                    zeroLineDashArray="0"
                    showXAxisLabels
                    xLabelColor="rgba(255,255,255,0.3)"
                    xLabelFontSize={8}
                    padding={GRAPH_PADDING}
                    preserveAspectRatio="none"
                    className="w-full"
                  />

                  {/* Y-axis tick values */}
                  {yTicks.map((tick) => (
                    <div
                      key={tick.pct}
                      className={cn(
                        "absolute pointer-events-none text-[10px] font-f1 text-right pr-1.5 leading-none tabular-nums",
                        tick.isZero
                          ? "text-white/65 font-f1-bold"
                          : "text-white/30",
                      )}
                      style={{
                        top: `${tick.pct}%`,
                        left: 0,
                        width: `${Y_LABEL_RIGHT_PCT}%`,
                        transform: "translateY(-50%)",
                      }}
                    >
                      {formatSecondsTick(tick.value)}
                    </div>
                  ))}

                  {zeroLinePct !== null && !hasZeroTick && (
                    <div
                      className="absolute pointer-events-none text-[9px] text-white/75 font-f1-bold text-right pr-1.5 leading-none tabular-nums"
                      style={{
                        top: `${zeroLinePct}%`,
                        left: 0,
                        width: `${Y_LABEL_RIGHT_PCT}%`,
                        transform: "translateY(-50%)",
                      }}
                    >
                      0.000
                    </div>
                  )}

                  {/* Y-axis unit label */}
                  <div
                    className="absolute pointer-events-none text-[9px] text-white/20 font-f1 uppercase tracking-wider"
                    style={{
                      left: 0,
                      top: `${(GRAPH_PADDING.top / VB_H) * 100}%`,
                      transform: "translateY(-180%)",
                    }}
                  >
                    s
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Card 4: Q3 Rate ── */}
          <div
            ref={(el) => {
              cardRefs.current[4] = el;
            }}
            className={cn(CARD, "px-5 py-4")}
            style={{ gridArea: "q3", opacity: 0 }}
          >
            <p className="font-f1-bold text-[10px] text-white/30 uppercase tracking-[0.15em] mb-3">
              Q3 Rate
            </p>

            <div className="flex flex-col gap-2.5">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-f1-bold text-[11px] text-white/70">
                    {drivers[0].abbreviation}
                  </span>
                  <span className="font-f1-bold text-[11px] text-white">
                    {Math.round((q3Rates?.driver1.q3Rate ?? 0) * 100)}%
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

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-f1-bold text-[11px] text-white/70">
                    {drivers[1].abbreviation}
                  </span>
                  <span className="font-f1-bold text-[11px] text-white">
                    {Math.round((q3Rates?.driver2.q3Rate ?? 0) * 100)}%
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

          {/* ── Card 5: Results ── */}
          <div
            ref={(el) => {
              cardRefs.current[5] = el;
            }}
            className={cn(CARD, "px-5 py-4 flex flex-col min-h-0")}
            style={{ gridArea: "results", opacity: 0 }}
          >
            <div className="flex items-center justify-between mb-2 shrink-0">
              <p className="font-f1-bold text-[10px] text-white/30 uppercase tracking-[0.15em]">
                Results
              </p>
              <p className="text-[11px] text-white/25 tracking-[0.15em]">
                baseline {drivers[0].abbreviation}
              </p>
            </div>
            <div className="flex flex-col gap-1.5 overflow-y-auto no-scrollbar min-h-0">
              {[...perRaceGaps].reverse().map((gap) => (
                <div
                  key={gap.raceId}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-1 h-3 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          gap.gapMs > 0
                            ? team.primaryColor
                            : "rgba(255,255,255,0.15)",
                      }}
                    />
                    <span className="text-[13px] text-white/50 font-f1">
                      {gap.country}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/25 font-f1">
                      {gap.session}
                    </span>
                    <span
                      className={cn(
                        "text-[12px] font-f1-bold tabular-nums",
                        gap.gapMs > 0 ? "text-white/80" : "text-white/45",
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
  );
}
