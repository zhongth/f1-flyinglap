"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { gsap } from "@/lib/gsap";
import type { PerRaceGap } from "@/types";

interface QualifyingGapChartProps {
  data: PerRaceGap[];
  teamColor: string;
  driver1Abbreviation: string;
  driver2Abbreviation: string;
}

const VIEWBOX_W = 600;
const VIEWBOX_H = 280;
const PADDING = { top: 32, right: 24, bottom: 32, left: 60 };

export function QualifyingGapChart({
  data,
  teamColor,
  driver1Abbreviation,
  driver2Abbreviation,
}: QualifyingGapChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const gradientId = useId().replace(/:/g, "");

  useEffect(() => {
    if (!chartRef.current) return;
    gsap.fromTo(
      chartRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", delay: 0.4 },
    );
  }, []);

  const plotLeft = PADDING.left;
  const plotRight = VIEWBOX_W - PADDING.right;
  const plotTop = PADDING.top;
  const plotBottom = VIEWBOX_H - PADDING.bottom;
  const graphW = plotRight - plotLeft;
  const graphH = plotBottom - plotTop;
  const zeroY = plotTop + graphH / 2; // center line

  const { points, pathD } = useMemo(() => {
    if (!data || data.length === 0)
      return { points: [] as { x: number; y: number; gap: number }[], pathD: "" };

    const gaps = data.map((d) => d.gapMs / 1000); // seconds
    const absMax = Math.max(...gaps.map(Math.abs), 0.05); // min 50ms range
    const padded = absMax * 1.25; // 25% padding so dots don't sit on edges

    const pts = data.map((d, i) => {
      const x = plotLeft + (i / (data.length - 1 || 1)) * graphW;
      const gap = d.gapMs / 1000;
      // positive gap = driver1 faster → goes UP
      const y = zeroY - (gap / padded) * (graphH / 2);
      return { x, y, gap };
    });

    // Build smooth curved path
    let path = "";
    if (pts.length > 1) {
      path = `M ${pts[0].x},${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const curr = pts[i];
        const next = pts[i + 1];
        const cx = curr.x + (next.x - curr.x) * 0.5;
        path += ` C ${cx},${curr.y} ${cx},${next.y} ${next.x},${next.y}`;
      }
    } else if (pts.length === 1) {
      path = `M ${pts[0].x},${pts[0].y} L ${pts[0].x},${pts[0].y}`;
    }

    return { points: pts, pathD: path };
  }, [data, plotLeft, graphW, graphH, zeroY]);

  // Gradient fill path (from line to zero)
  const gradientPath = useMemo(() => {
    if (points.length === 0) return "";
    let p = `M ${points[0].x},${zeroY} L ${points[0].x},${points[0].y}`;
    if (points.length > 1) {
      for (let i = 0; i < points.length - 1; i++) {
        const curr = points[i];
        const next = points[i + 1];
        const cx = curr.x + (next.x - curr.x) * 0.5;
        p += ` C ${cx},${curr.y} ${cx},${next.y} ${next.x},${next.y}`;
      }
    }
    p += ` L ${points[points.length - 1].x},${zeroY} Z`;
    return p;
  }, [points, zeroY]);

  return (
    <div ref={chartRef} className="w-[368px] mt-2" style={{ opacity: 0 }}>
      <p className="text-[11px] font-f1 text-white/40 uppercase tracking-wider mb-2">
        Last {data.length} Races
      </p>

      <div ref={containerRef} className="relative w-full" style={{ height: "180px" }}>
        <svg
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          className="h-full w-full"
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1={plotTop} x2="0" y2={plotBottom} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={teamColor} stopOpacity="0.22" />
              <stop offset="50%" stopColor={teamColor} stopOpacity="0" />
              <stop offset="100%" stopColor={teamColor} stopOpacity="0.22" />
            </linearGradient>
          </defs>

          {/* Y-axis line */}
          <line
            x1={plotLeft}
            y1={plotTop}
            x2={plotLeft}
            y2={plotBottom}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={1}
          />

          {/* Zero / center line — segments that skip around country labels */}
          {points.length > 0 && (() => {
            const gap = 6; // px padding between line end and label edge
            const segments: { x1: number; x2: number }[] = [];

            // Collect label extents
            const labelExtents = points.map((pt, i) => {
              const label = data[i].country;
              const halfW = (label.length * 8 + 12) / 2 + gap;
              return { left: pt.x - halfW, right: pt.x + halfW };
            });

            // Leading segment: plotLeft → first label
            if (labelExtents[0].left > plotLeft) {
              segments.push({ x1: plotLeft, x2: labelExtents[0].left });
            }

            // Segments between consecutive labels
            for (let i = 0; i < labelExtents.length - 1; i++) {
              segments.push({ x1: labelExtents[i].right, x2: labelExtents[i + 1].left });
            }

            // Trailing segment: last label → plotRight
            if (labelExtents[labelExtents.length - 1].right < plotRight) {
              segments.push({ x1: labelExtents[labelExtents.length - 1].right, x2: plotRight });
            }

            return segments.map((seg, i) => (
              <line
                key={`zero-seg-${i}`}
                x1={seg.x1}
                y1={zeroY}
                x2={seg.x2}
                y2={zeroY}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={1}
              />
            ));
          })()}

          {/* Gradient fill */}
          {gradientPath && (
            <motion.path
              d={gradientPath}
              fill={`url(#${gradientId})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: isInView ? 1 : 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
            />
          )}

          {/* Line */}
          <motion.path
            d={pathD}
            fill="none"
            stroke={teamColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: isInView ? 1 : 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />

          {/* Dots */}
          {points.map((pt, i) => (
            <g
              key={data[i].raceId}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Hit area */}
              <circle cx={pt.x} cy={pt.y} r={20} fill="transparent" />

              {/* Glow on hover */}
              {hoveredIndex === i && (
                <motion.circle
                  cx={pt.x}
                  cy={pt.y}
                  r={8}
                  fill={teamColor}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.3 }}
                  style={{ filter: "blur(6px)", pointerEvents: "none" }}
                />
              )}

              {/* Dot */}
              <motion.circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIndex === i ? 5 : 3.5}
                fill={teamColor}
                stroke="rgba(0,0,0,0.5)"
                strokeWidth={1}
                style={{ pointerEvents: "none" }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: isInView ? 1 : 0 }}
                transition={{
                  scale: { type: "spring", stiffness: 400, damping: 25 },
                  opacity: { duration: 0.3, delay: (i / (points.length - 1 || 1)) * 1.2 },
                }}
              />
            </g>
          ))}

          {/* X-axis labels (country names at zero line) */}
          {points.map((pt, i) => (
            <text
              key={`label-${data[i].raceId}`}
              x={pt.x}
              y={zeroY}
              dy={5}
              textAnchor="middle"
              fill="rgba(255,255,255,0.75)"
              fontSize={14}
              fontFamily="inherit"
              className="font-f1"
            >
              {data[i].country}
            </text>
          ))}

          {/* Tooltip */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <g style={{ pointerEvents: "none" }}>
              {/* Vertical guide line */}
              <line
                x1={points[hoveredIndex].x}
                y1={plotTop}
                x2={points[hoveredIndex].x}
                y2={plotBottom}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />

              <foreignObject
                x={points[hoveredIndex].x - 60}
                y={points[hoveredIndex].y < zeroY ? points[hoveredIndex].y - 44 : points[hoveredIndex].y + 8}
                width={120}
                height={40}
                style={{ overflow: "visible", pointerEvents: "none" }}
              >
                <div className="flex items-center justify-center">
                  <div className="whitespace-nowrap rounded-md border border-white/10 bg-black/85 px-2.5 py-1 text-white shadow-lg backdrop-blur-sm">
                    <span className="text-xs font-semibold">{data[hoveredIndex].gapFormatted}s</span>
                    <span className="text-[10px] text-white/50 ml-1.5">{data[hoveredIndex].session}</span>
                  </div>
                </div>
              </foreignObject>
            </g>
          )}
        </svg>

        {/* Y-axis polar labels */}
        <div
          className="pointer-events-none absolute font-f1 text-[11px] leading-tight text-white/60"
          style={{
            left: 0,
            top: `${(plotTop / VIEWBOX_H) * 100}%`,
            transform: "translateY(-50%)",
            width: `${(PADDING.left - 8) / VIEWBOX_W * 100}%`,
            textAlign: "right",
          }}
        >
          <span className="uppercase">{driver1Abbreviation}</span>
          <br />
          <span className="text-white/40 text-[10px]">Faster</span>
        </div>

        <div
          className="pointer-events-none absolute font-f1 text-[11px] leading-tight text-white/60"
          style={{
            left: 0,
            bottom: `${(PADDING.bottom / VIEWBOX_H) * 100}%`,
            transform: "translateY(50%)",
            width: `${(PADDING.left - 8) / VIEWBOX_W * 100}%`,
            textAlign: "right",
          }}
        >
          <span className="uppercase">{driver2Abbreviation}</span>
          <br />
          <span className="text-white/40 text-[10px]">Faster</span>
        </div>
      </div>
    </div>
  );
}
