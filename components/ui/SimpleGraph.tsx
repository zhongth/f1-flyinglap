"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface DataPoint {
  value: number;
  label?: string;
  meta?: string;
  valueLabel?: string;
}

export interface SimpleGraphProps {
  data: DataPoint[];
  lineColor?: string;
  dotColor?: string;
  width?: string | number;
  height?: number;
  animationDuration?: number;
  showGrid?: boolean;
  gridStyle?: "solid" | "dashed" | "dotted";
  gridLines?: "vertical" | "horizontal" | "both";
  gridLineThickness?: number;
  showDots?: boolean;
  dotSize?: number;
  dotHoverGlow?: boolean;
  curved?: boolean;
  gradientFade?: boolean;
  graphLineThickness?: number;
  calculatePercentageDifference?: boolean;
  animateOnScroll?: boolean;
  animateOnce?: boolean;
  showZeroLine?: boolean;
  zeroLineColor?: string;
  zeroLineDashArray?: string;
  showXAxisLabels?: boolean;
  xLabelColor?: string;
  xLabelFontSize?: number;
  showYAxisLabels?: boolean;
  yAxisTopLabel?: string;
  yAxisBottomLabel?: string;
  yAxisLabelColor?: string;
  yAxisLabelFontSize?: number;
  valuePadding?: number;
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  className?: string;
}

const VIEWBOX_WIDTH = 800;
const VIEWBOX_HEIGHT = 400;

const SimpleGraph = ({
  data,
  lineColor = "#5227FF",
  dotColor = "#5227FF",
  width = "100%",
  height = 300,
  animationDuration = 2,
  showGrid = true,
  gridStyle = "solid",
  gridLines = "both",
  gridLineThickness = 1,
  showDots = true,
  dotSize = 6,
  dotHoverGlow = false,
  curved = true,
  gradientFade = false,
  graphLineThickness = 3,
  calculatePercentageDifference = false,
  animateOnScroll = false,
  animateOnce = true,
  showZeroLine = false,
  zeroLineColor = "currentColor",
  zeroLineDashArray = "4 4",
  showXAxisLabels = false,
  xLabelColor = "currentColor",
  xLabelFontSize = 10,
  showYAxisLabels = false,
  yAxisTopLabel,
  yAxisBottomLabel,
  yAxisLabelColor = "currentColor",
  yAxisLabelFontSize = 10,
  valuePadding = 0.1,
  padding = {},
  className,
}: SimpleGraphProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipRotation, setTooltipRotation] = useState(0);
  const [tooltipOffsetX, setTooltipOffsetX] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: animateOnce, amount: 0.3 });
  const gradientId = useId().replace(/:/g, "");
  const plotTop = padding.top ?? 40;
  const plotRight = VIEWBOX_WIDTH - (padding.right ?? 40);
  const plotBottom = VIEWBOX_HEIGHT - (padding.bottom ?? 40);
  const plotLeft = padding.left ?? 40;
  const yAxisLabelX = plotLeft - 6;
  const yAxisLabelLeftPercent = (yAxisLabelX / VIEWBOX_WIDTH) * 100;
  const yAxisTopPercent = (plotTop / VIEWBOX_HEIGHT) * 100;
  const yAxisBottomPercent =
    ((VIEWBOX_HEIGHT - plotBottom) / VIEWBOX_HEIGHT) * 100;
  const xAxisLabelTopPercent = ((plotBottom + 12) / VIEWBOX_HEIGHT) * 100;

  const shouldAnimate = animateOnScroll ? isInView : true;

  const { points, pathD, zeroLineY } = useMemo(() => {
    if (!data || data.length === 0) {
      return { points: [], pathD: "", zeroLineY: null as number | null };
    }

    const values = data.map((d) => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const rangeVal = maxVal - minVal || 1;
    const paddedMin = minVal - rangeVal * valuePadding;
    const paddedMax = maxVal + rangeVal * valuePadding;
    const paddedRange = paddedMax - paddedMin;

    const graphWidth = plotRight - plotLeft;
    const graphHeight = plotBottom - plotTop;

    const calculatedPoints = data.map((d, i) => {
      const x = plotLeft + (i / (data.length - 1 || 1)) * graphWidth;
      const y =
        plotTop +
        graphHeight -
        ((d.value - paddedMin) / paddedRange) * graphHeight;

      return {
        x,
        y,
        value: d.value,
        label: d.label,
      };
    });

    let path = "";
    if (calculatedPoints.length > 0) {
      if (curved && calculatedPoints.length > 1) {
        path = `M ${calculatedPoints[0].x},${calculatedPoints[0].y}`;

        for (let i = 0; i < calculatedPoints.length - 1; i++) {
          const current = calculatedPoints[i];
          const next = calculatedPoints[i + 1];
          const controlX = current.x + (next.x - current.x) * 0.5;

          path += ` C ${controlX},${current.y} ${controlX},${next.y} ${next.x},${next.y}`;
        }
      } else {
        path = calculatedPoints
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`)
          .join(" ");
      }
    }

    const candidateZeroLineY =
      plotTop + graphHeight - ((0 - paddedMin) / paddedRange) * graphHeight;
    const zeroLineWithinBounds =
      candidateZeroLineY >= plotTop && candidateZeroLineY <= plotBottom;

    return {
      points: calculatedPoints,
      pathD: path,
      zeroLineY: zeroLineWithinBounds ? candidateZeroLineY : null,
    };
  }, [data, curved, plotBottom, plotLeft, plotRight, plotTop, valuePadding]);

  const gradientFillPath = useMemo(() => {
    if (!gradientFade || points.length === 0) return "";

    let path = `M ${points[0].x},${plotBottom} L ${points[0].x},${points[0].y}`;

    if (curved && points.length > 1) {
      for (let i = 0; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];
        const controlX = current.x + (next.x - current.x) * 0.5;

        path += ` C ${controlX},${current.y} ${controlX},${next.y} ${next.x},${next.y}`;
      }
    } else {
      for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x},${points[i].y}`;
      }
    }

    path += ` L ${points[points.length - 1].x},${plotBottom} Z`;
    return path;
  }, [curved, gradientFade, plotBottom, points]);

  const widthStyle = typeof width === "number" ? `${width}px` : width;

  const handleMouseMove = (
    event: React.MouseEvent<SVGElement>,
    index: number,
  ) => {
    if (!svgRef.current) return;

    const point = svgRef.current.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;

    const svgPoint = point.matrixTransform(
      svgRef.current.getScreenCTM()?.inverse(),
    );
    const deltaX = svgPoint.x - points[index].x;

    const maxRotation = 15;
    const rotation = Math.max(
      -maxRotation,
      Math.min(maxRotation, deltaX * 0.2),
    );
    const maxOffset = 20;
    const offsetX = Math.max(-maxOffset, Math.min(maxOffset, deltaX * 0.15));

    setTooltipRotation(rotation);
    setTooltipOffsetX(offsetX);
  };

  const getPercentageDifference = (
    index: number,
  ): { percentage: number; isIncrease: boolean } | null => {
    if (!calculatePercentageDifference || index === 0 || !data[index - 1]) {
      return null;
    }

    const currentValue = data[index].value;
    const previousValue = data[index - 1].value;
    if (previousValue === 0) return null;

    const difference = currentValue - previousValue;
    const percentage = (difference / Math.abs(previousValue)) * 100;

    return {
      percentage: Math.abs(percentage),
      isIncrease: difference >= 0,
    };
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative text-white", className)}
      style={{ width: widthStyle, height: `${height}px` }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className="h-full w-full text-white/30"
        style={{ overflow: "visible" }}
        role="img"
        aria-label="Simple trend graph"
      >
        <title>Simple trend graph</title>
        <defs>
          <linearGradient
            id={gradientId}
            x1="0"
            y1={plotTop}
            x2="0"
            y2={plotBottom}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {showGrid && (
          <g opacity="0.45">
            {(gridLines === "horizontal" || gridLines === "both") &&
              [0, 1, 2, 3, 4].map((i) => (
                <line
                  key={`h-${i}`}
                  x1={plotLeft}
                  y1={plotTop + (i * (plotBottom - plotTop)) / 4}
                  x2={plotRight}
                  y2={plotTop + (i * (plotBottom - plotTop)) / 4}
                  stroke="currentColor"
                  strokeWidth={gridLineThickness}
                  strokeDasharray={
                    gridStyle === "dashed"
                      ? "5,5"
                      : gridStyle === "dotted"
                        ? "1,3"
                        : undefined
                  }
                />
              ))}

            {(gridLines === "vertical" || gridLines === "both") &&
              points.map((point) => (
                <line
                  key={`v-${point.x}`}
                  x1={point.x}
                  y1={plotTop}
                  x2={point.x}
                  y2={plotBottom}
                  stroke="currentColor"
                  strokeWidth={gridLineThickness}
                  strokeDasharray={
                    gridStyle === "dashed"
                      ? "5,5"
                      : gridStyle === "dotted"
                        ? "1,3"
                        : undefined
                  }
                />
              ))}
          </g>
        )}

        {showZeroLine && zeroLineY !== null && (
          <line
            x1={plotLeft}
            y1={zeroLineY}
            x2={plotRight}
            y2={zeroLineY}
            stroke={zeroLineColor}
            strokeOpacity={0.55}
            strokeWidth={1}
            strokeDasharray={zeroLineDashArray}
          />
        )}

        {gradientFade && (
          <motion.path
            d={gradientFillPath}
            fill={`url(#${gradientId})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: shouldAnimate ? 1 : 0 }}
            transition={{
              duration: 0.6,
              delay: animationDuration,
              ease: "easeInOut",
            }}
          />
        )}

        <motion.path
          d={pathD}
          fill="none"
          stroke={lineColor}
          strokeWidth={graphLineThickness}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: shouldAnimate ? 1 : 0 }}
          transition={{ duration: animationDuration, ease: "easeInOut" }}
        />

        {showDots &&
          points.map((point, index) => (
            /* biome-ignore lint/a11y/useSemanticElements: SVG groups are required here for grouped pointer/focus interactions. */
            <g
              key={`${point.x}-${point.y}`}
              role="button"
              tabIndex={0}
              aria-label={
                data[index].label
                  ? `${data[index].label}: ${data[index].valueLabel ?? data[index].value.toFixed(3)}`
                  : `Point ${index + 1}: ${data[index].valueLabel ?? data[index].value.toFixed(3)}`
              }
              onMouseEnter={() => {
                setHoveredIndex(index);
                setTooltipRotation(0);
                setTooltipOffsetX(0);
              }}
              onMouseLeave={() => setHoveredIndex(null)}
              onMouseMove={(event) => handleMouseMove(event, index)}
              onFocus={() => {
                setHoveredIndex(index);
                setTooltipRotation(0);
                setTooltipOffsetX(0);
              }}
              onBlur={() => setHoveredIndex(null)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setHoveredIndex(null);
                }
              }}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={point.x}
                cy={point.y}
                r="52"
                fill="transparent"
                style={{ pointerEvents: "all" }}
              />

              {dotHoverGlow && hoveredIndex === index && (
                <motion.circle
                  cx={point.x}
                  cy={point.y}
                  r={dotSize * 2}
                  fill={dotColor}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.3 }}
                  transition={{ duration: 0.2 }}
                  style={{ filter: "blur(8px)", pointerEvents: "none" }}
                />
              )}

              <motion.circle
                cx={point.x}
                cy={point.y}
                r={dotSize}
                fill={dotColor}
                stroke="rgba(0,0,0,0.45)"
                strokeWidth="1.5"
                style={{ pointerEvents: "none" }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: hoveredIndex === index ? 1.45 : 1,
                  opacity: shouldAnimate ? 1 : 0,
                }}
                transition={{
                  scale: { type: "spring", stiffness: 400, damping: 25 },
                  opacity: {
                    duration: 0.3,
                    delay:
                      (index / (points.length - 1 || 1)) * animationDuration,
                  },
                }}
              />
            </g>
          ))}

        <AnimatePresence>
          {hoveredIndex !== null &&
            points[hoveredIndex] &&
            !(calculatePercentageDifference && hoveredIndex === 0) &&
            (() => {
              const hoveredPoint = data[hoveredIndex];
              return (
                <foreignObject
                  key={hoveredIndex}
                  x={points[hoveredIndex].x - 82}
                  y={points[hoveredIndex].y - 92}
                  width="164"
                  height="92"
                  style={{ overflow: "visible", pointerEvents: "none" }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.82, x: 0 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      x: tooltipOffsetX,
                      rotate: tooltipRotation,
                    }}
                    exit={{ opacity: 0, scale: 0.82 }}
                    transition={{
                      duration: 0.16,
                      x: { type: "spring", stiffness: 300, damping: 30 },
                      rotate: { type: "spring", stiffness: 300, damping: 30 },
                    }}
                    className="flex items-center justify-center"
                    style={{ pointerEvents: "none" }}
                  >
                    <div className="relative">
                      <div className="whitespace-nowrap rounded-lg border border-white/10 bg-black/85 px-3 py-2 text-white shadow-xl backdrop-blur-xs">
                        {calculatePercentageDifference && hoveredIndex > 0 ? (
                          (() => {
                            const diff = getPercentageDifference(hoveredIndex);
                            if (!diff) {
                              return (
                                <div className="text-sm font-semibold">
                                  {hoveredPoint.valueLabel ??
                                    `${points[hoveredIndex].value.toFixed(3)}`}
                                </div>
                              );
                            }

                            return (
                              <div className="flex items-center gap-1.5">
                                {diff.isIncrease ? (
                                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-red-400" />
                                )}
                                <span
                                  className={cn(
                                    "text-sm font-semibold",
                                    diff.isIncrease
                                      ? "text-emerald-400"
                                      : "text-red-400",
                                  )}
                                >
                                  {diff.isIncrease ? "+" : "-"}
                                  {diff.percentage.toFixed(1)}%
                                </span>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="text-sm font-semibold">
                            {hoveredPoint.valueLabel ??
                              `${points[hoveredIndex].value.toFixed(3)}`}
                          </div>
                        )}

                        {hoveredPoint.label && (
                          <div className="mt-1 text-[11px] text-white/70">
                            {hoveredPoint.label}
                          </div>
                        )}
                        {hoveredPoint.meta && (
                          <div className="text-[11px] text-white/45">
                            {hoveredPoint.meta}
                          </div>
                        )}
                      </div>
                      <div
                        className="absolute left-1/2 h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-black/85"
                        style={{
                          bottom: "-4px",
                          transform: "translateX(-50%)",
                        }}
                      />
                    </div>
                  </motion.div>
                </foreignObject>
              );
            })()}
        </AnimatePresence>
      </svg>

      {showXAxisLabels &&
        points.map((point, index) => {
          const xLabelLeftPercent = (point.x / VIEWBOX_WIDTH) * 100;
          return (
            <div
              key={`x-label-${point.x}`}
              className="pointer-events-none absolute font-f1 text-center"
              style={{
                left: `${xLabelLeftPercent}%`,
                top: `${xAxisLabelTopPercent}%`,
                transform: "translateX(-50%)",
                color: xLabelColor,
                fontSize: `${xLabelFontSize}px`,
                lineHeight: 1,
                width: "84px",
                whiteSpace: "normal",
                opacity: 0.95,
              }}
            >
              {data[index].label}
            </div>
          );
        })}

      {showYAxisLabels && yAxisTopLabel && (
        <div
          className="pointer-events-none absolute whitespace-nowrap font-f1"
          style={{
            left: `${yAxisLabelLeftPercent}%`,
            top: `${yAxisTopPercent}%`,
            transform: "translate(-100%, -8%)",
            color: yAxisLabelColor,
            fontSize: `${yAxisLabelFontSize}px`,
            lineHeight: 1,
            opacity: 0.95,
          }}
        >
          {yAxisTopLabel}
        </div>
      )}

      {showYAxisLabels && yAxisBottomLabel && (
        <div
          className="pointer-events-none absolute whitespace-nowrap font-f1"
          style={{
            left: `${yAxisLabelLeftPercent}%`,
            bottom: `${yAxisBottomPercent}%`,
            transform: "translate(-100%, 8%)",
            color: yAxisLabelColor,
            fontSize: `${yAxisLabelFontSize}px`,
            lineHeight: 1,
            opacity: 0.95,
          }}
        >
          {yAxisBottomLabel}
        </div>
      )}
    </div>
  );
};

SimpleGraph.displayName = "SimpleGraph";

export default SimpleGraph;
