"use client";

import { useRef, useEffect } from "react";
import { gsap } from "@/lib/gsap";
import { ChartContainer } from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  ReferenceLine,
  Tooltip,
} from "recharts";
import type { PerRaceGap } from "@/types";

interface QualifyingGapChartProps {
  data: PerRaceGap[];
  teamColor: string;
  driver1Abbreviation: string;
  driver2Abbreviation: string;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { circuit: string; gapFormatted: string; session: string } }>;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/10 bg-black/90 px-3 py-2 shadow-xl">
      <p className="font-f1-bold text-[12px] text-white">{d.circuit}</p>
      <p className="text-[11px] text-white/60">
        {d.gapFormatted}s &middot; {d.session}
      </p>
    </div>
  );
}

export function QualifyingGapChart({
  data,
  teamColor,
  driver1Abbreviation,
  driver2Abbreviation,
}: QualifyingGapChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    gsap.fromTo(
      chartRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", delay: 0.4 }
    );
  }, []);

  const chartData = data.map((d) => ({
    circuit: d.circuit,
    gap: d.gapMs / 1000,
    gapFormatted: d.gapFormatted,
    session: d.session,
  }));

  const chartConfig = {
    gap: {
      label: "Gap",
      color: teamColor,
    },
  };

  return (
    <div ref={chartRef} className="w-[368px] mt-2" style={{ opacity: 0 }}>
      <p className="text-[11px] font-f1 text-white/40 uppercase tracking-wider mb-2">
        Last {data.length} Races
      </p>

      <ChartContainer config={chartConfig} className="h-[100px] w-full !aspect-auto">
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <XAxis
            dataKey="circuit"
            tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: "var(--font-f1)" }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Line
            type="monotone"
            dataKey="gap"
            stroke={teamColor}
            strokeWidth={2}
            dot={{
              r: 4,
              fill: teamColor,
              stroke: "rgba(0,0,0,0.5)",
              strokeWidth: 1,
            }}
            activeDot={{
              r: 6,
              fill: teamColor,
              stroke: teamColor,
              strokeWidth: 2,
              style: { filter: `drop-shadow(0 0 6px ${teamColor}80)` },
            }}
          />
        </LineChart>
      </ChartContainer>

      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-white/30 font-f1">
          {driver1Abbreviation} faster
        </span>
        <span className="text-[10px] text-white/30 font-f1">
          {driver2Abbreviation} faster
        </span>
      </div>
    </div>
  );
}
