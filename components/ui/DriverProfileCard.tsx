"use client";

/**
 * Adapted from React Bits ProfileCard (https://reactbits.dev/components/profile-card)
 * Customised for F1 driver cards with team-coloured holographic effects.
 */

import { useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { cn, getTeamDarkColors } from "@/lib/utils";
import type { Driver, Team } from "@/types";
import type { PedigreeTier } from "@/data/drivers";
import "./DriverProfileCard.css";

interface DriverProfileCardProps {
  driver: Driver;
  team: Team;
  position: "left" | "right";
  q3Rate?: number; // 0–1
  pedigreeLabel?: string;
  pedigreeTier?: PedigreeTier;
  onClick?: () => void;
}

/* ── Helpers ── */
const clamp = (v: number, min = 0, max = 100) => Math.min(Math.max(v, min), max);
const round = (v: number, p = 3) => parseFloat(v.toFixed(p));
const adjust = (v: number, fMin: number, fMax: number, tMin: number, tMax: number) =>
  round(tMin + ((tMax - tMin) * (v - fMin)) / (fMax - fMin));

const ENTER_TRANSITION_MS = 180;
const INITIAL_DURATION = 1200;
const INITIAL_X_OFFSET = 70;
const INITIAL_Y_OFFSET = 60;

export function DriverProfileCard({
  driver,
  team,
  position,
  q3Rate,
  pedigreeLabel,
  pedigreeTier,
  onClick,
}: DriverProfileCardProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const enterTimerRef = useRef<number | null>(null);
  const leaveRafRef = useRef<number | null>(null);

  const isLeft = position === "left";
  const darkColors = useMemo(
    () => getTeamDarkColors(team.primaryColor),
    [team.primaryColor]
  );

  /* ── Tilt engine ── */
  const tiltEngine = useMemo(() => {
    let rafId: number | null = null;
    let running = false;
    let lastTs = 0;
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    const DEFAULT_TAU = 0.14;
    const INITIAL_TAU = 0.6;
    let initialUntil = 0;

    const setVarsFromXY = (x: number, y: number) => {
      const shell = shellRef.current;
      const wrap = wrapRef.current;
      if (!shell || !wrap) return;

      const width = shell.clientWidth || 1;
      const height = shell.clientHeight || 1;

      const percentX = clamp((100 / width) * x);
      const percentY = clamp((100 / height) * y);
      const centerX = percentX - 50;
      const centerY = percentY - 50;

      const props: Record<string, string> = {
        "--pointer-x": `${percentX}%`,
        "--pointer-y": `${percentY}%`,
        "--background-x": `${adjust(percentX, 0, 100, 35, 65)}%`,
        "--background-y": `${adjust(percentY, 0, 100, 35, 65)}%`,
        "--pointer-from-center": `${clamp(Math.hypot(percentY - 50, percentX - 50) / 50, 0, 1)}`,
        "--pointer-from-top": `${percentY / 100}`,
        "--pointer-from-left": `${percentX / 100}`,
        "--rotate-x": `${round(-(centerX / 5))}deg`,
        "--rotate-y": `${round(centerY / 4)}deg`,
      };

      for (const [k, v] of Object.entries(props)) wrap.style.setProperty(k, v);
    };

    const step = (ts: number) => {
      if (!running) return;
      if (lastTs === 0) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      const tau = ts < initialUntil ? INITIAL_TAU : DEFAULT_TAU;
      const k = 1 - Math.exp(-dt / tau);

      currentX += (targetX - currentX) * k;
      currentY += (targetY - currentY) * k;
      setVarsFromXY(currentX, currentY);

      const stillFar =
        Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05;

      if (stillFar || document.hasFocus()) {
        rafId = requestAnimationFrame(step);
      } else {
        running = false;
        lastTs = 0;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
    };

    const start = () => {
      if (running) return;
      running = true;
      lastTs = 0;
      rafId = requestAnimationFrame(step);
    };

    return {
      setImmediate(x: number, y: number) {
        currentX = x;
        currentY = y;
        setVarsFromXY(currentX, currentY);
      },
      setTarget(x: number, y: number) {
        targetX = x;
        targetY = y;
        start();
      },
      toCenter() {
        const shell = shellRef.current;
        if (!shell) return;
        this.setTarget(shell.clientWidth / 2, shell.clientHeight / 2);
      },
      beginInitial(durationMs: number) {
        initialUntil = performance.now() + durationMs;
        start();
      },
      getCurrent() {
        return { x: currentX, y: currentY, tx: targetX, ty: targetY };
      },
      cancel() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        running = false;
        lastTs = 0;
      },
    };
  }, []);

  /* ── Pointer handlers ── */
  const getOffsets = (evt: PointerEvent, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  };

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const shell = shellRef.current;
      if (!shell) return;
      const { x, y } = getOffsets(event, shell);
      tiltEngine.setTarget(x, y);
    },
    [tiltEngine]
  );

  const handlePointerEnter = useCallback(
    (event: PointerEvent) => {
      const shell = shellRef.current;
      if (!shell) return;

      shell.classList.add("active");
      shell.classList.add("entering");
      if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = window.setTimeout(() => {
        shell.classList.remove("entering");
      }, ENTER_TRANSITION_MS);

      const { x, y } = getOffsets(event, shell);
      tiltEngine.setTarget(x, y);
    },
    [tiltEngine]
  );

  const handlePointerLeave = useCallback(() => {
    const shell = shellRef.current;
    if (!shell) return;

    tiltEngine.toCenter();

    const checkSettle = () => {
      const { x, y, tx, ty } = tiltEngine.getCurrent();
      if (Math.hypot(tx - x, ty - y) < 0.6) {
        shell.classList.remove("active");
        leaveRafRef.current = null;
      } else {
        leaveRafRef.current = requestAnimationFrame(checkSettle);
      }
    };
    if (leaveRafRef.current) cancelAnimationFrame(leaveRafRef.current);
    leaveRafRef.current = requestAnimationFrame(checkSettle);
  }, [tiltEngine]);

  /* ── Mount / unmount ── */
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    shell.addEventListener("pointerenter", handlePointerEnter);
    shell.addEventListener("pointermove", handlePointerMove);
    shell.addEventListener("pointerleave", handlePointerLeave);

    const initialX = (shell.clientWidth || 0) - INITIAL_X_OFFSET;
    const initialY = INITIAL_Y_OFFSET;
    tiltEngine.setImmediate(initialX, initialY);
    tiltEngine.toCenter();
    tiltEngine.beginInitial(INITIAL_DURATION);

    return () => {
      shell.removeEventListener("pointerenter", handlePointerEnter);
      shell.removeEventListener("pointermove", handlePointerMove);
      shell.removeEventListener("pointerleave", handlePointerLeave);
      if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);
      if (leaveRafRef.current) cancelAnimationFrame(leaveRafRef.current);
      tiltEngine.cancel();
      shell.classList.remove("entering");
    };
  }, [tiltEngine, handlePointerMove, handlePointerEnter, handlePointerLeave]);

  /* ── Card CSS variables ── */
  const cardStyle = useMemo(
    () =>
      ({
        "--inner-gradient": `linear-gradient(145deg, ${darkColors.cardBg}cc 0%, ${team.primaryColor}22 100%)`,
        "--behind-glow-color": `${team.primaryColor}aa`,
        "--behind-glow-size": "50%",
      }) as React.CSSProperties,
    [team.logoPath, team.primaryColor, darkColors.cardBg]
  );

  return (
    <div ref={wrapRef} className="pc-card-wrapper" style={cardStyle}>
      <div className="pc-behind" />
      <div ref={shellRef} className="pc-card-shell" onClick={onClick}>
        <section className="pc-card">
          <div className="pc-inside">
            {/* Glare overlay */}
            <div className="pc-glare" />

            {/* Driver name & details — parallax layer */}
            <div className="pc-content">
              <div
                className={cn(
                  "absolute z-10 leading-[1.36]",
                  isLeft
                    ? "left-[40px] bottom-[44px] text-left"
                    : "right-[18px] bottom-[44px] text-right"
                )}
                style={{ display: "block", borderRadius: 0, pointerEvents: "none" }}
              >
                <p className="font-northwell text-white text-[64px]">
                  {driver.firstName}
                </p>
                <p className="font-f1-bold text-white text-[40px] uppercase">
                  {driver.lastName}
                </p>
                {pedigreeLabel && (
                  <span
                    className={cn(
                      "inline-block mt-2 px-3 py-0.5 rounded-full text-[11px] font-f1-bold uppercase tracking-wider",
                      pedigreeTier === "champion"
                        ? "bg-amber-500/20 text-amber-400"
                        : pedigreeTier === "winner"
                          ? "bg-white/15 text-white/80"
                          : pedigreeTier === "podium"
                            ? "bg-white/10 text-white/60"
                            : "bg-white/8 text-white/40"
                    )}
                  >
                    {pedigreeLabel}
                  </span>
                )}
              </div>

              {/* Driver number watermark */}
              <p
                className={cn(
                  "absolute font-f1-bold leading-[1.36] z-0",
                  isLeft ? "left-[40px] top-[26px]" : "right-[21px] top-[8px]"
                )}
                style={{
                  color: darkColors.cardBorder,
                  fontSize: 128,
                  display: "block",
                  borderRadius: 0,
                  pointerEvents: "none",
                }}
              >
                {driver.number}
              </p>
            </div>
          </div>
        </section>

        {/* Driver portrait — outside .pc-card so it's not clipped */}
        <div className="pc-avatar-content">
          <div
            className={cn(
              "pc-portrait",
              isLeft ? "pc-pos-left" : "pc-pos-right"
            )}
          >
            <Image
              src={driver.portraitPath}
              alt={`${driver.firstName} ${driver.lastName}`}
              fill
              sizes="250px"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
