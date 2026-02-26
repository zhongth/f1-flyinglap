"use client";

import { gsap } from "gsap";
import { Flip } from "gsap/Flip";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(Flip);
}

// Default animation settings
export const defaultEase = "power2.out";
export const defaultDuration = 0.6;

// Common animation presets
export const animationPresets = {
  fadeIn: {
    opacity: 0,
    duration: 0.4,
    ease: "power2.out",
  },
  fadeOut: {
    opacity: 0,
    duration: 0.3,
    ease: "power2.in",
  },
  slideUp: {
    y: 50,
    opacity: 0,
    duration: 0.5,
    ease: "power3.out",
  },
  slideDown: {
    y: -50,
    opacity: 0,
    duration: 0.5,
    ease: "power3.out",
  },
  slideLeft: {
    x: 100,
    opacity: 0,
    duration: 0.5,
    ease: "power3.out",
  },
  slideRight: {
    x: -100,
    opacity: 0,
    duration: 0.5,
    ease: "power3.out",
  },
  scaleIn: {
    scale: 0.8,
    opacity: 0,
    duration: 0.4,
    ease: "back.out(1.7)",
  },
  scaleOut: {
    scale: 1.1,
    opacity: 0,
    duration: 0.3,
    ease: "power2.in",
  },
} as const;

// Stagger presets
export const staggerPresets = {
  fast: 0.05,
  normal: 0.1,
  slow: 0.15,
} as const;

// Ease presets for specific use cases
export const easePresets = {
  // For UI elements entering
  enter: "power3.out",
  // For UI elements exiting
  exit: "power2.in",
  // For smooth transitions
  smooth: "power2.inOut",
  // For bouncy effects
  bounce: "back.out(1.7)",
  // For dramatic reveals
  dramatic: "power4.out",
  // For number counting
  count: "power2.out",
} as const;

export { gsap, Flip };
