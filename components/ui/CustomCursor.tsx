"use client";

/**
 * High-performance custom cursor.
 *
 * Key optimisations over the original React Bits version:
 * – Single spring layer (was double-sprung → added latency)
 * – Zero React state updates during interaction (all motion-values + refs)
 * – Event delegation instead of querySelectorAll + MutationObserver
 * – Passive event listeners throughout
 */

import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useSpring,
  useMotionValue,
  useVelocity,
  useTransform,
} from "motion/react";
import { cn } from "@/lib/utils";

export interface CustomCursorProps {
  circleSize?: number;
  circleColor?: string;
  circleStiffness?: number;
  circleDamping?: number;
  circleBorderWidth?: number;
  className?: string;
  circleClassName?: string;
  showOnTouch?: boolean;
  zIndex?: number;
  elastic?: boolean;
  targets?: string[];
  targetPadding?: number;
  mixBlendMode?: React.CSSProperties["mixBlendMode"];
  children?: React.ReactNode;
}

const CustomCursor: React.FC<CustomCursorProps> = ({
  circleSize = 40,
  circleColor = "rgba(255, 255, 255, 0.5)",
  circleStiffness = 450,
  circleDamping = 15,
  circleBorderWidth = 2,
  className,
  circleClassName,
  showOnTouch = false,
  zIndex = 9999,
  elastic = false,
  targets = [],
  targetPadding = -1,
  mixBlendMode,
  children,
}) => {
  // Only React state: touch detection (set once on mount)
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Everything else is refs — no re-renders during interaction
  const isOnTargetRef = useRef(false);
  const activeElRef = useRef<HTMLElement | null>(null);
  const visibleRef = useRef(false);

  // ── Motion values ─────────────────────────────────────────

  // Raw position (drives velocity calculation only)
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  // Rendered position — ONE spring layer (was two before)
  const posX = useSpring(0, {
    stiffness: circleStiffness,
    damping: circleDamping,
    mass: 0.3,
  });
  const posY = useSpring(0, {
    stiffness: circleStiffness,
    damping: circleDamping,
    mass: 0.3,
  });

  // Size & shape morph
  const morphCfg = { stiffness: 450, damping: 32, mass: 0.4 };
  const width = useSpring(circleSize, morphCfg);
  const height = useSpring(circleSize, morphCfg);
  const borderRadius = useSpring(circleSize / 2, morphCfg);

  // Visibility driven by motion value — no setState
  const opacity = useMotionValue(0);

  // Elastic velocity-based scaling
  const velX = useVelocity(rawX);
  const velY = useVelocity(rawY);
  const rawScaleX = useTransform(velX, [-1000, 0, 1000], [0.85, 1, 1.15]);
  const rawScaleY = useTransform(velY, [-1000, 0, 1000], [0.85, 1, 1.15]);

  // Reactive on-target flag (motion value, not React state)
  const onTargetMV = useMotionValue(0);
  const scaleX = useTransform(
    [rawScaleX, onTargetMV],
    (latest: number[]) => (elastic && !latest[1] ? latest[0] : 1),
  );
  const scaleY = useTransform(
    [rawScaleY, onTargetMV],
    (latest: number[]) => (elastic && !latest[1] ? latest[0] : 1),
  );

  // ── Mouse tracking ────────────────────────────────────────

  useEffect(() => {
    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouch);
    if (hasTouch && !showOnTouch) return;

    const onMove = (e: MouseEvent) => {
      rawX.set(e.clientX);
      rawY.set(e.clientY);
      if (!isOnTargetRef.current) {
        posX.set(e.clientX);
        posY.set(e.clientY);
      }
      if (!visibleRef.current) {
        visibleRef.current = true;
        opacity.set(1);
      }
    };

    const onEnter = () => {
      visibleRef.current = true;
      opacity.set(1);
    };
    const onLeave = () => {
      visibleRef.current = false;
      opacity.set(0);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseenter", onEnter);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseenter", onEnter);
      document.removeEventListener("mouseleave", onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOnTouch]);

  // ── Target hover via event delegation ─────────────────────

  useEffect(() => {
    if (!targets.length) return;
    const selector = targets.join(", ");

    const morphTo = (el: HTMLElement) => {
      activeElRef.current = el;
      isOnTargetRef.current = true;
      onTargetMV.set(1);

      const r = el.getBoundingClientRect();
      const br =
        parseFloat(window.getComputedStyle(el).borderRadius) || 16;
      const w = r.width + targetPadding * 2;
      const h = r.height + targetPadding * 2;
      const isCircle =
        Math.abs(r.width - r.height) < 1 && br >= r.width / 2 - 1;

      width.set(w);
      height.set(h);
      borderRadius.set(isCircle ? w / 2 : br + targetPadding);
      posX.set(r.left + r.width / 2);
      posY.set(r.top + r.height / 2);
    };

    const reset = () => {
      isOnTargetRef.current = false;
      activeElRef.current = null;
      onTargetMV.set(0);
      width.set(circleSize);
      height.set(circleSize);
      borderRadius.set(circleSize / 2);
      // Snap spring target to current mouse so it resumes smoothly
      posX.set(rawX.get());
      posY.set(rawY.get());
    };

    const onOver = (e: MouseEvent) => {
      const hit = (e.target as HTMLElement).closest?.(
        selector,
      ) as HTMLElement | null;
      if (hit && hit !== activeElRef.current) morphTo(hit);
    };

    const onOut = (e: MouseEvent) => {
      if (!activeElRef.current) return;
      const rel = (
        e.relatedTarget as HTMLElement | null
      )?.closest?.(selector) as HTMLElement | null;
      if (rel === activeElRef.current) return; // still inside same target
      // Moving to another target? Morph directly. Otherwise reset.
      rel ? morphTo(rel) : reset();
    };

    const onScroll = () => {
      const el = activeElRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      posX.set(r.left + r.width / 2);
      posY.set(r.top + r.height / 2);
    };

    document.addEventListener("mouseover", onOver, { passive: true });
    document.addEventListener("mouseout", onOut, { passive: true });
    window.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets, circleSize, targetPadding]);

  // ── Hide native cursor ────────────────────────────────────

  useEffect(() => {
    if (isTouchDevice && !showOnTouch) return;
    const s = document.createElement("style");
    s.setAttribute("data-custom-cursor", "");
    s.textContent = "*, *::before, *::after { cursor: none !important; }";
    document.head.appendChild(s);
    return () => {
      document.head.removeChild(s);
    };
  }, [isTouchDevice, showOnTouch]);

  if (isTouchDevice && !showOnTouch) return null;

  return (
    <div
      className={cn("pointer-events-none fixed inset-0", className)}
      style={{ zIndex }}
    >
      <motion.div
        className={cn(
          "absolute flex items-center justify-center",
          circleClassName,
        )}
        style={{
          width,
          height,
          borderRadius,
          left: posX,
          top: posY,
          x: "-50%",
          y: "-50%",
          border: `${circleBorderWidth}px solid ${circleColor}`,
          opacity,
          scaleX,
          scaleY,
          mixBlendMode,
          willChange: "transform, width, height, border-radius",
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default CustomCursor;
