"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/utils";

export interface GradientCarouselItem {
  id: string | number;
  content?: ReactNode;
  image?: string;
  alt?: string;
  cardClassName?: string;
}

export interface GradientCarouselProps {
  items?: GradientCarouselItem[];
  className?: string;
  cardClassName?: string;
  contentClassName?: string;
  minScale?: number;
  cardGap?: number;
  frictionFactor?: number;
  wheelSensitivity?: number;
  enableKeyboard?: boolean;
  onCardChange?: (index: number) => void;
  onCardClick?: (index: number) => void;
  cardWidthPx?: number;
  cardAspectRatio?: number;
  initialIndex?: number;
  introSpin?: boolean;
  introSpinRounds?: number;
  introSpinDurationMs?: number;
  onIntroComplete?: () => void;
}

interface CardRef {
  element: HTMLDivElement;
  position: number;
}

const GradientCarousel: React.FC<GradientCarouselProps> = ({
  items = [],
  className = "",
  cardClassName = "",
  contentClassName = "",
  minScale = 0.92,
  cardGap = 28,
  frictionFactor = 0.92,
  wheelSensitivity = 0.5,
  enableKeyboard = true,
  onCardChange,
  onCardClick,
  cardWidthPx,
  cardAspectRatio = 4 / 5,
  initialIndex = 0,
  introSpin = false,
  introSpinRounds = 1,
  introSpinDurationMs = 2600,
  onIntroComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<CardRef[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  const introSpinRef = useRef(introSpin);
  const introSpinRoundsRef = useRef(introSpinRounds);
  const introSpinDurationRef = useRef(introSpinDurationMs);
  const onIntroCompleteRef = useRef(onIntroComplete);
  const onCardChangeRef = useRef(onCardChange);

  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [measuredCardHeight, setMeasuredCardHeight] = useState(0);

  const velocityRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const lastTimeRef = useRef(0);
  const cardWidthRef = useRef(300);
  const cardHeightRef = useRef(400);
  const cardStepRef = useRef(328);
  const totalTrackLengthRef = useRef(0);
  const viewportHalfRef = useRef(0);
  const centeredCardIndexRef = useRef(-1);
  const snapTweenRef = useRef<ReturnType<typeof gsap.to> | null>(null);
  const introPlayedRef = useRef(false);
  const introAnimatingRef = useRef(false);

  // Sync callback refs
  useEffect(() => { introSpinRef.current = introSpin; }, [introSpin]);
  useEffect(() => { introSpinRoundsRef.current = introSpinRounds; }, [introSpinRounds]);
  useEffect(() => { introSpinDurationRef.current = introSpinDurationMs; }, [introSpinDurationMs]);
  useEffect(() => { onIntroCompleteRef.current = onIntroComplete; }, [onIntroComplete]);
  useEffect(() => { onCardChangeRef.current = onCardChange; }, [onCardChange]);

  const wrapValue = useCallback((value: number, max: number): number => {
    return ((value % max) + max) % max;
  }, []);

  // ── Apply transforms to all cards based on current scroll offset ──
  const updateAllCardTransforms = useCallback(() => {
    const cards = cardsRef.current;
    const totalLength = totalTrackLengthRef.current;
    const halfViewport = viewportHalfRef.current;
    if (cards.length === 0 || totalLength <= 0 || halfViewport <= 0) return;

    const halfTrack = totalLength / 2;
    const positions = new Float32Array(cards.length);
    let closestIndex = -1;
    let closestDistance = Infinity;

    // First pass: relative positions + find closest to center
    for (let i = 0; i < cards.length; i++) {
      let relPos = cards[i].position - scrollOffsetRef.current;
      if (relPos < -halfTrack) relPos += totalLength;
      if (relPos > halfTrack) relPos -= totalLength;
      positions[i] = relPos;
      const d = Math.abs(relPos);
      if (d < closestDistance) {
        closestDistance = d;
        closestIndex = i;
      }
    }

    const prevIdx = (closestIndex - 1 + cards.length) % cards.length;
    const nextIdx = (closestIndex + 1) % cards.length;

    // Second pass: apply 2D transforms + opacity + blur
    for (let i = 0; i < cards.length; i++) {
      const pos = positions[i];
      const norm = Math.max(-1, Math.min(1, pos / halfViewport));
      const absNorm = Math.abs(norm);
      // Smooth eased proximity: cubic falloff for buttery scale transition
      const proximity = 1 - absNorm * absNorm * (3 - 2 * absNorm);
      const scale = minScale + proximity * (1 - minScale);

      const el = cards[i].element;
      el.style.transform = `translate(-50%,-50%) translateX(${pos}px) scale(${scale})`;
      el.style.zIndex = String(1000 + Math.round(proximity * 100));
      el.style.setProperty("--card-norm", norm.toFixed(3));

      // Opacity: centered = 1, edges fade to 0.35
      el.style.opacity = (0.35 + proximity * 0.65).toFixed(3);

      const isCoreCard =
        i === closestIndex || i === prevIdx || i === nextIdx;
      el.style.filter = isCoreCard
        ? "none"
        : `blur(${(2 * absNorm ** 1.1).toFixed(2)}px)`;
    }

    if (closestIndex >= 0 && closestIndex !== centeredCardIndexRef.current) {
      centeredCardIndexRef.current = closestIndex;
      onCardChangeRef.current?.(closestIndex);
    }
  }, [minScale]);

  // ── Snap-animate to a specific card index ──
  const focusCardIndex = useCallback(
    (index: number) => {
      if (introAnimatingRef.current) return;
      const cardCount = cardsRef.current.length;
      const totalLength = totalTrackLengthRef.current;
      if (cardCount === 0 || totalLength <= 0) return;
      if (index < 0 || index >= cardCount) return;

      const targetOffset = index * cardStepRef.current;
      const currentOffset = scrollOffsetRef.current;
      const deltas = [
        targetOffset - currentOffset,
        targetOffset - currentOffset + totalLength,
        targetOffset - currentOffset - totalLength,
      ];
      const shortestDelta = deltas.reduce((best, delta) =>
        Math.abs(delta) < Math.abs(best) ? delta : best,
      );
      const stepDistance =
        cardStepRef.current > 0
          ? Math.abs(shortestDelta) / cardStepRef.current
          : 0;
      const duration = Math.min(
        0.8,
        Math.max(0.35, 0.25 + stepDistance * 0.1),
      );

      const tweenState = { offset: currentOffset };
      snapTweenRef.current?.kill();
      velocityRef.current = 0;

      snapTweenRef.current = gsap.to(tweenState, {
        offset: currentOffset + shortestDelta,
        duration,
        ease: "expo.out",
        onUpdate: () => {
          scrollOffsetRef.current = wrapValue(
            tweenState.offset,
            totalLength,
          );
          updateAllCardTransforms();
        },
        onComplete: () => {
          scrollOffsetRef.current = wrapValue(targetOffset, totalLength);
          updateAllCardTransforms();
        },
      });
    },
    [updateAllCardTransforms, wrapValue],
  );

  // ── Intro spin animation ──
  const runIntroSpin = useCallback(
    (targetIndex: number): boolean => {
      const cardCount = cardsRef.current.length;
      const totalLength = totalTrackLengthRef.current;
      if (cardCount === 0 || totalLength <= 0) return false;
      if (targetIndex < 0 || targetIndex >= cardCount) return false;

      const rounds = Math.max(0.25, introSpinRoundsRef.current);
      const durationSec = Math.max(
        0.4,
        introSpinDurationRef.current / 1000,
      );
      const targetOffset = targetIndex * cardStepRef.current;
      const startOffset = targetOffset - totalLength * rounds;
      const tweenState = { offset: startOffset };

      snapTweenRef.current?.kill();
      velocityRef.current = 0;
      introAnimatingRef.current = true;
      scrollOffsetRef.current = wrapValue(startOffset, totalLength);
      updateAllCardTransforms();

      snapTweenRef.current = gsap.to(tweenState, {
        offset: targetOffset,
        duration: durationSec,
        ease: "power4.out",
        onUpdate: () => {
          scrollOffsetRef.current = wrapValue(
            tweenState.offset,
            totalLength,
          );
          updateAllCardTransforms();
        },
        onComplete: () => {
          scrollOffsetRef.current = wrapValue(targetOffset, totalLength);
          introAnimatingRef.current = false;
          updateAllCardTransforms();
          setIsReady(true);
          onIntroCompleteRef.current?.();
        },
      });

      return true;
    },
    [updateAllCardTransforms, wrapValue],
  );

  // ── Main physics loop: friction decay ──
  const animationLoop = useCallback(
    (timestamp: number) => {
      if (totalTrackLengthRef.current <= 0) {
        animationFrameRef.current = requestAnimationFrame(animationLoop);
        return;
      }

      if (introAnimatingRef.current) {
        lastTimeRef.current = timestamp;
        animationFrameRef.current = requestAnimationFrame(animationLoop);
        return;
      }

      const deltaTime = lastTimeRef.current
        ? (timestamp - lastTimeRef.current) / 1000
        : 0;
      lastTimeRef.current = timestamp;

      scrollOffsetRef.current = wrapValue(
        scrollOffsetRef.current + velocityRef.current * deltaTime,
        totalTrackLengthRef.current,
      );
      const decayFactor = frictionFactor ** (deltaTime * 60);
      velocityRef.current *= decayFactor;
      if (Math.abs(velocityRef.current) < 0.02) velocityRef.current = 0;

      updateAllCardTransforms();
      animationFrameRef.current = requestAnimationFrame(animationLoop);
    },
    [wrapValue, frictionFactor, updateAllCardTransforms],
  );

  // ── Initialization ──
  useEffect(() => {
    if (
      !containerRef.current ||
      !cardsContainerRef.current ||
      items.length === 0
    ) {
      setIsLoading(false);
      setIsReady(false);
      return;
    }

    cardsRef.current = cardsRef.current.slice(0, items.length);

    const containerWidth =
      containerRef.current.clientWidth || window.innerWidth;
    const sampleCard = cardsRef.current[0]?.element;
    if (sampleCard) {
      const rect = sampleCard.getBoundingClientRect();
      cardWidthRef.current = rect.width || 300;
      cardHeightRef.current = rect.height || 400;
    } else {
      cardWidthRef.current = cardWidthPx ?? 300;
      cardHeightRef.current = cardWidthRef.current / cardAspectRatio;
    }
    cardStepRef.current = cardWidthRef.current + cardGap;
    totalTrackLengthRef.current =
      cardsRef.current.length * cardStepRef.current;
    cardsRef.current.forEach((card, i) => {
      card.position = i * cardStepRef.current;
    });
    setMeasuredCardHeight(cardHeightRef.current);
    viewportHalfRef.current = containerWidth * 0.5;

    const clampedInitialIndex = Math.max(
      0,
      Math.min(initialIndex, cardsRef.current.length - 1),
    );
    scrollOffsetRef.current = clampedInitialIndex * cardStepRef.current;
    centeredCardIndexRef.current = clampedInitialIndex;
    onCardChangeRef.current?.(clampedInitialIndex);
    updateAllCardTransforms();

    setIsLoading(false);
    lastTimeRef.current = 0;
    animationFrameRef.current = requestAnimationFrame(animationLoop);

    const shouldPlayIntro =
      introSpinRef.current && !introPlayedRef.current;
    if (shouldPlayIntro) {
      introPlayedRef.current = true;
      setIsReady(false);
      const started = runIntroSpin(clampedInitialIndex);
      if (!started) {
        introAnimatingRef.current = false;
        setIsReady(true);
      }
    } else {
      setIsReady(true);
    }

    return () => {
      introAnimatingRef.current = false;
      snapTweenRef.current?.kill();
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, [
    items,
    initialIndex,
    cardAspectRatio,
    cardGap,
    cardWidthPx,
    animationLoop,
    runIntroSpin,
    updateAllCardTransforms,
  ]);

  // ── Delayed intro trigger ──
  useEffect(() => {
    if (!introSpin || isLoading) return;
    if (introPlayedRef.current || introAnimatingRef.current) return;

    const cardCount = cardsRef.current.length;
    const totalLength = totalTrackLengthRef.current;
    const step = cardStepRef.current;
    if (cardCount === 0 || totalLength <= 0 || step <= 0) return;

    const normalizedOffset = wrapValue(
      scrollOffsetRef.current,
      totalLength,
    );
    const roundedIndex = Math.round(normalizedOffset / step);
    const targetIndex =
      ((roundedIndex % cardCount) + cardCount) % cardCount;

    introPlayedRef.current = true;
    setIsReady(false);
    const started = runIntroSpin(targetIndex);
    if (!started) {
      introAnimatingRef.current = false;
      setIsReady(true);
      onIntroCompleteRef.current?.();
    }
  }, [introSpin, isLoading, runIntroSpin, wrapValue]);

  // ── Resize handler ──
  useEffect(() => {
    const handleResize = () => {
      const prevStep = cardStepRef.current || 1;
      const ratio =
        scrollOffsetRef.current /
        (cardsRef.current.length * prevStep);
      const sampleCard = cardsRef.current[0]?.element;
      if (sampleCard) {
        const rect = sampleCard.getBoundingClientRect();
        cardWidthRef.current = rect.width || 300;
        cardHeightRef.current = rect.height || 400;
        cardStepRef.current = cardWidthRef.current + cardGap;
        totalTrackLengthRef.current =
          cardsRef.current.length * cardStepRef.current;
        cardsRef.current.forEach((card, i) => {
          card.position = i * cardStepRef.current;
        });
      }
      setMeasuredCardHeight(cardHeightRef.current);
      const containerWidth =
        containerRef.current?.clientWidth || window.innerWidth;
      viewportHalfRef.current = containerWidth * 0.5;
      scrollOffsetRef.current = wrapValue(
        ratio * totalTrackLengthRef.current,
        totalTrackLengthRef.current,
      );
      updateAllCardTransforms();
    };

    let resizeTimeout: ReturnType<typeof setTimeout>;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 80);
    };
    window.addEventListener("resize", debouncedResize);
    return () => window.removeEventListener("resize", debouncedResize);
  }, [cardGap, updateAllCardTransforms, wrapValue]);

  // ── Wheel handler ──
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (
        !isReady ||
        introAnimatingRef.current ||
        totalTrackLengthRef.current <= 0
      )
        return;
      e.preventDefault();
      snapTweenRef.current?.kill();
      const delta =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      velocityRef.current += delta * wheelSensitivity * 20;
    },
    [isReady, wheelSensitivity],
  );

  // ── Click handler (card click — no drag) ──
  const handleCardClick = useCallback(
    (index: number) => {
      if (!isReady || introAnimatingRef.current) return;
      // Always notify parent immediately
      onCardClick?.(index);
      // Snap to the card if it's not already centered
      if (index !== centeredCardIndexRef.current) {
        focusCardIndex(index);
      }
    },
    [isReady, onCardClick, focusCardIndex],
  );

  // ── Attach wheel listener ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const wheelHandler = handleWheel as unknown as EventListener;
    container.addEventListener("wheel", wheelHandler, {
      passive: false,
    });
    return () => {
      container.removeEventListener("wheel", wheelHandler);
    };
  }, [handleWheel]);

  // ── Keyboard navigation ──
  useEffect(() => {
    if (!enableKeyboard || !isReady) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (introAnimatingRef.current) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const direction = e.key === "ArrowLeft" ? -1 : 1;
        velocityRef.current += direction * cardStepRef.current * 5;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enableKeyboard, isReady]);

  // ── Pause/resume on visibility change ──
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animationFrameRef.current)
          cancelAnimationFrame(animationFrameRef.current);
      } else {
        lastTimeRef.current = 0;
        animationFrameRef.current =
          requestAnimationFrame(animationLoop);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
  }, [animationLoop]);

  // ── Render ──
  // Scale factor for container height: account for centered card being scaled up
  const scaledHeight =
    measuredCardHeight > 0
      ? Math.ceil(measuredCardHeight * 1.05)
      : undefined;

  return (
    <div
      ref={containerRef}
      data-cursor-interactive
      className={cn(
        "relative w-full overflow-x-clip overflow-y-visible bg-transparent",
        "select-none",
        className,
      )}
      style={{
        minHeight: scaledHeight ? `${scaledHeight}px` : undefined,
      }}
    >
      <div
        ref={cardsContainerRef}
        className="absolute inset-0 z-10"
      >
        {items.map((item, i) => (
          <div
            key={item.id}
            data-carousel-index={i}
            ref={(el) => {
              if (el) {
                if (!cardsRef.current[i]) {
                  cardsRef.current[i] = { element: el, position: 0 };
                } else {
                  cardsRef.current[i].element = el;
                }
              }
            }}
            onClick={() => handleCardClick(i)}
            className={cn(
              "absolute top-1/2 left-1/2 will-change-transform cursor-pointer",
              cardClassName,
              item.cardClassName,
            )}
            style={{
              width: cardWidthPx
                ? `${cardWidthPx}px`
                : "min(26vw, 360px)",
              aspectRatio: String(cardAspectRatio),
              transformOrigin: "center center",
            }}
          >
            {item.content ? (
              <div className={cn("w-full h-full", contentClassName)}>
                {item.content}
              </div>
            ) : item.image ? (
              <img
                src={item.image}
                alt={item.alt ?? `Carousel item ${i + 1}`}
                className="w-full h-full object-cover rounded-[28px]"
                draggable={false}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

GradientCarousel.displayName = "GradientCarousel";

export default GradientCarousel;
