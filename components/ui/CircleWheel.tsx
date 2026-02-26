"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import type { Team } from "@/types";

const ANGLE_PER_TEAM = 360 / 10; // 36 degrees
const DRAG_SENSITIVITY = 0.2; // degrees per pixel
const DRAG_SENSITIVITY_MOBILE = 0.3;
const MOMENTUM_FACTOR = 0.4;
const WHEEL_COOLDOWN_MS = 400;

interface CircleWheelProps {
  teams: Team[];
  onActiveTeamChange: (teamId: string) => void;
  onTeamSelect: (teamId: string) => void;
  isAnimating: boolean;
}

function getResponsiveValues() {
  if (typeof window === "undefined") {
    return { radius: 500, logoSize: 65, centerYOffset: 0.28, sensitivity: DRAG_SENSITIVITY };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw < 640) {
    return { radius: Math.max(vh * 0.42, 280), logoSize: 44, centerYOffset: 0.15, sensitivity: DRAG_SENSITIVITY_MOBILE };
  }
  if (vw < 1024) {
    return { radius: Math.max(vh * 0.48, 380), logoSize: 55, centerYOffset: 0.22, sensitivity: DRAG_SENSITIVITY };
  }
  return { radius: Math.max(vh * 0.5, 500), logoSize: 65, centerYOffset: 0.28, sensitivity: DRAG_SENSITIVITY };
}

function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

function angleDeltaFromTop(angle: number): number {
  const norm = normalizeAngle(angle);
  return Math.min(norm, 360 - norm);
}

export function CircleWheel({
  teams,
  onActiveTeamChange,
  onTeamSelect,
  isAnimating,
}: CircleWheelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const logosRef = useRef<(HTMLDivElement | null)[]>([]);
  const rotationRef = useRef(0);
  const isDraggingRef = useRef(false);
  const didDragRef = useRef(false);
  const startXRef = useRef(0);
  const startRotationRef = useRef(0);
  const velocityHistoryRef = useRef<{ x: number; t: number }[]>([]);
  const snapTweenRef = useRef<gsap.core.Tween | null>(null);
  const wheelCooldownRef = useRef(false);
  const dimensionsRef = useRef({ radius: 500, logoSize: 65, centerYOffset: 0.28, sensitivity: DRAG_SENSITIVITY });
  const [activeIndex, setActiveIndex] = useState(0);
  const [logoSize, setLogoSize] = useState(65);

  // Store props in refs to avoid re-render loops in callbacks
  const onActiveTeamChangeRef = useRef(onActiveTeamChange);
  onActiveTeamChangeRef.current = onActiveTeamChange;
  const onTeamSelectRef = useRef(onTeamSelect);
  onTeamSelectRef.current = onTeamSelect;
  const teamsRef = useRef(teams);
  teamsRef.current = teams;

  // Compute and apply positions for all logos
  const positionLogos = useCallback(() => {
    const { radius, centerYOffset } = dimensionsRef.current;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height + radius * centerYOffset;

    logosRef.current.forEach((el, i) => {
      if (!el) return;

      const angle = i * ANGLE_PER_TEAM + rotationRef.current;
      const delta = angleDeltaFromTop(angle);

      // Position on circle
      const rad = ((angle - 90) * Math.PI) / 180;
      const x = centerX + radius * Math.cos(rad);
      const y = centerY + radius * Math.sin(rad);

      // Scale: 1.5 at top, shrink away
      const scale = delta < 5 ? 1.5 : 1.1 - (delta / 180) * 0.5;

      // Opacity: 1.0 at top, fade out past 90 degrees
      const opacity = delta > 100 ? 0 : delta > 70 ? 0.15 : 1.0 - (delta / 100) * 0.7;

      const size = dimensionsRef.current.logoSize;

      gsap.set(el, {
        x: x - size / 2,
        y: y - size / 2,
        scale,
        opacity,
        zIndex: delta < 5 ? 10 : Math.floor(10 - delta / 18),
      });
    });
  }, []);

  // Get the active team index from current rotation
  const getActiveTeamIndex = useCallback(() => {
    const norm = normalizeAngle(-rotationRef.current);
    return Math.round(norm / ANGLE_PER_TEAM) % teams.length;
  }, [teams.length]);

  // Update active team in parent
  const updateActiveTeam = useCallback(() => {
    const idx = getActiveTeamIndex();
    setActiveIndex(idx);
    onActiveTeamChangeRef.current(teamsRef.current[idx].id);
  }, [getActiveTeamIndex]);

  // Snap to nearest team
  const snapToNearest = useCallback(
    (targetRotation: number) => {
      // Kill any existing snap tween
      snapTweenRef.current?.kill();

      const snapTarget =
        Math.round(targetRotation / ANGLE_PER_TEAM) * ANGLE_PER_TEAM;

      const proxy = { value: rotationRef.current };
      snapTweenRef.current = gsap.to(proxy, {
        value: snapTarget,
        duration: 0.6,
        ease: "power3.out",
        onUpdate: () => {
          rotationRef.current = proxy.value;
          positionLogos();
        },
        onComplete: () => {
          rotationRef.current = snapTarget;
          positionLogos();
          updateActiveTeam();
        },
      });
    },
    [positionLogos, updateActiveTeam]
  );

  // Rotate to a specific team index
  const rotateToTeam = useCallback(
    (teamIndex: number) => {
      const targetRotation = -teamIndex * ANGLE_PER_TEAM;

      // Find shortest path
      const current = rotationRef.current;
      const diff = targetRotation - current;
      const normalizedDiff =
        ((diff % 360) + 540) % 360 - 180; // shortest path in [-180, 180]
      const finalTarget = current + normalizedDiff;

      snapToNearest(finalTarget);
    },
    [snapToNearest]
  );

  // Pointer event handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isAnimating) return;

      // Kill any running snap animation
      snapTweenRef.current?.kill();

      isDraggingRef.current = true;
      didDragRef.current = false;
      startXRef.current = e.clientX;
      startRotationRef.current = rotationRef.current;
      velocityHistoryRef.current = [{ x: e.clientX, t: Date.now() }];

      containerRef.current?.classList.add("dragging");
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isAnimating]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;

      const dx = e.clientX - startXRef.current;
      if (Math.abs(dx) > 3) didDragRef.current = true;

      const { sensitivity } = dimensionsRef.current;
      rotationRef.current = startRotationRef.current + dx * sensitivity;
      positionLogos();

      // Track velocity
      const history = velocityHistoryRef.current;
      history.push({ x: e.clientX, t: Date.now() });
      if (history.length > 5) history.shift();
    },
    [positionLogos]
  );

  const handlePointerUp = useCallback(
    (_e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      containerRef.current?.classList.remove("dragging");

      // Calculate velocity
      const history = velocityHistoryRef.current;
      let velocityDegPerSec = 0;
      if (history.length >= 2) {
        const last = history[history.length - 1];
        const prev = history[Math.max(0, history.length - 3)];
        const dt = (last.t - prev.t) / 1000;
        if (dt > 0) {
          const dxPixels = last.x - prev.x;
          const { sensitivity } = dimensionsRef.current;
          velocityDegPerSec = (dxPixels / dt) * sensitivity;
        }
      }

      // Momentum
      const throwDistance = velocityDegPerSec * MOMENTUM_FACTOR;
      const momentumTarget = rotationRef.current + throwDistance;

      snapToNearest(momentumTarget);
    },
    [snapToNearest]
  );

  // Handle logo click
  const handleLogoClick = useCallback(
    (teamIndex: number) => {
      if (isAnimating || didDragRef.current) return;

      const currentActive = getActiveTeamIndex();
      if (teamIndex === currentActive) {
        // Active team clicked — select it
        onTeamSelectRef.current(teams[teamIndex].id);
      } else {
        // Rotate to bring this team to center
        rotateToTeam(teamIndex);
      }
    },
    [isAnimating, getActiveTeamIndex, teams, rotateToTeam]
  );

  // Mouse wheel handler — advance one team per scroll tick
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (isAnimating || wheelCooldownRef.current) return;
      e.preventDefault();

      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 5) return;

      wheelCooldownRef.current = true;
      setTimeout(() => {
        wheelCooldownRef.current = false;
      }, WHEEL_COOLDOWN_MS);

      const direction = delta > 0 ? -1 : 1;
      const currentSnap =
        Math.round(rotationRef.current / ANGLE_PER_TEAM) * ANGLE_PER_TEAM;
      const target = currentSnap + direction * ANGLE_PER_TEAM;
      snapToNearest(target);
    },
    [isAnimating, snapToNearest]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Initial positioning + resize handler
  useEffect(() => {
    const update = () => {
      dimensionsRef.current = getResponsiveValues();
      setLogoSize(dimensionsRef.current.logoSize);
      positionLogos();
    };

    update();

    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(update, 100);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
    };
  }, [positionLogos]);

  // Update active team on mount
  useEffect(() => {
    updateActiveTeam();
  }, [updateActiveTeam]);

  return (
    <div
      ref={containerRef}
      className="carousel-container"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {teams.map((team, i) => {
        const isActive = i === activeIndex;
        return (
          <div
            key={team.id}
            ref={(el) => { logosRef.current[i] = el; }}
            className={cn("carousel-logo", isActive && "active")}
            style={{
              width: logoSize,
              height: logoSize,
              "--glow-color": team.primaryColor,
            } as React.CSSProperties}
            onClick={() => handleLogoClick(i)}
          >
            <Image
              src={team.logoPath}
              alt={team.name}
              fill
              sizes="60px"
              className="object-contain pointer-events-none"
              draggable={false}
              priority={i < 5}
            />
          </div>
        );
      })}
    </div>
  );
}
