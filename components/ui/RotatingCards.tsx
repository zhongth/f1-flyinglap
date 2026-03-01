"use client";

import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { cn } from "@/lib/utils";

export interface Card {
  /** Unique identifier for the card */
  id: string | number;
  /** Card content - can be any React node */
  content: React.ReactNode;
  /** Optional background color for the card */
  background?: string;
  /** Optional image URL for preloading */
  image?: string;
}

export interface RotatingCardsProps {
  /** Array of cards to display in the rotating circle */
  cards: Card[];
  /** Radius of the circle in pixels */
  radius?: number;
  /** Duration of one full rotation in seconds */
  duration?: number;
  /** Card width in pixels */
  cardWidth?: number;
  /** Card height in pixels */
  cardHeight?: number;
  /** Pause rotation on hover */
  pauseOnHover?: boolean;
  /** Reverse rotation direction */
  reverse?: boolean;
  /** Enable drag to rotate */
  draggable?: boolean;
  /** Drag sensitivity multiplier for manual rotation */
  dragSensitivity?: number;
  /** Auto-play rotation animation */
  autoPlay?: boolean;
  /** Callback when a card is clicked */
  onCardClick?: (card: Card, index: number) => void;
  /** Enable mouse wheel to control rotation */
  mouseWheel?: boolean;
  /** Additional CSS classes for the container */
  className?: string;
  /** Additional CSS classes for individual cards */
  cardClassName?: string;
  /** Initial rotation offset in degrees */
  initialRotation?: number;
  /** Play a one-time spin intro on mount (spins then decelerates to rest) */
  introSpin?: boolean;
  /** Number of full revolutions for the intro spin */
  introSpinRevolutions?: number;
  /** Duration of the intro spin in milliseconds */
  introSpinDuration?: number;
  /** Callback when the intro spin animation completes */
  onIntroComplete?: () => void;
}

const RotatingCards: React.FC<RotatingCardsProps> = ({
  cards,
  radius = 360,
  duration = 20,
  cardWidth = 160,
  cardHeight = 190,
  pauseOnHover = true,
  reverse = false,
  draggable = false,
  dragSensitivity = 1.6,
  autoPlay = true,
  onCardClick,
  mouseWheel = false,
  className = "",
  cardClassName = "",
  initialRotation = 0,
  introSpin = false,
  introSpinRevolutions = 1,
  introSpinDuration = 2800,
  onIntroComplete,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loaded, setLoaded] = useState(
    () => !cards.some((card) => card.image),
  );
  const [cardsKey, setCardsKey] = useState(() =>
    JSON.stringify(cards.map((c) => c.id)),
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(initialRotation);
  const lastTimeRef = useRef<number | null>(null);
  const lastDragAngleRef = useRef<number | null>(null);

  const rotation = useMotionValue(initialRotation);
  const smoothRotation = useSpring(rotation, {
    damping: 30,
    stiffness: 200,
    mass: 0.5,
  });

  const cardPositions = useMemo(() => {
    const totalCards = cards.length;
    const angleStep = (2 * Math.PI) / totalCards;

    return cards.map((_, index) => {
      const angle = angleStep * index;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      return {
        x,
        y,
        angle: (angle * 180) / Math.PI,
      };
    });
  }, [cards, radius]);

  const currentCardsKey = JSON.stringify(cards.map((c) => c.id));
  if (currentCardsKey !== cardsKey) {
    setCardsKey(currentCardsKey);
    setLoaded(!cards.some((card) => card.image));
  }

  useEffect(() => {
    let cancelled = false;

    const preloadImages = async () => {
      const imagePromises = cards
        .filter((card) => card.image)
        .map((card) => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = card.image!;
            img.onload = resolve;
            img.onerror = reject;
          });
        });

      try {
        await Promise.all(imagePromises);
        if (!cancelled) setLoaded(true);
      } catch (error) {
        console.error("Failed to load images", error);
        if (!cancelled) setLoaded(true);
      }
    };

    if (cards.some((card) => card.image)) {
      preloadImages();
    }

    return () => {
      cancelled = true;
    };
  }, [cards]);

  useEffect(() => {
    let animationFrameId: number;
    lastTimeRef.current = null;

    const animate = (time: number) => {
      if (
        lastTimeRef.current !== null &&
        !isHovered &&
        !isDragging &&
        autoPlay &&
        loaded
      ) {
        const deltaTime = (time - lastTimeRef.current) / 1000;
        const degreesPerSecond = 360 / duration;
        const rotationDelta =
          degreesPerSecond * deltaTime * (reverse ? -1 : 1);
        rotationRef.current += rotationDelta;
        rotation.set(rotationRef.current);
      }
      lastTimeRef.current = time;
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [duration, reverse, isHovered, isDragging, autoPlay, rotation, loaded]);

  // Intro spin: one-time spin animation that decelerates to rest
  const introCompleteRef = useRef(false);
  const onIntroCompleteRef = useRef(onIntroComplete);

  useEffect(() => {
    onIntroCompleteRef.current = onIntroComplete;
  }, [onIntroComplete]);

  useEffect(() => {
    if (!introSpin || !loaded || introCompleteRef.current) return;

    const endRotation = initialRotation;
    const totalDegrees = introSpinRevolutions * 360;
    const startRotation = endRotation - totalDegrees;
    rotationRef.current = startRotation;
    rotation.set(startRotation);

    let startTime: number | null = null;
    let frameId: number;

    const animate = (time: number) => {
      if (startTime === null) startTime = time;
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / introSpinDuration, 1);

      // Power4 ease-out: fast start, long dramatic deceleration
      const eased = 1 - Math.pow(1 - progress, 4);

      const current = startRotation + (endRotation - startRotation) * eased;
      rotationRef.current = current;
      rotation.set(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        rotationRef.current = endRotation;
        rotation.set(endRotation);
        introCompleteRef.current = true;
        onIntroCompleteRef.current?.();
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [
    introSpin,
    loaded,
    introSpinRevolutions,
    introSpinDuration,
    initialRotation,
    rotation,
  ]);

  const getAngleFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const angle = Math.atan2(clientY - centerY, clientX - centerX);
      return (angle * 180) / Math.PI;
    },
    [],
  );

  const handleDragStart = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent) => {
      setIsDragging(true);
      const clientX =
        "clientX" in event
          ? event.clientX
          : (event as TouchEvent).touches[0].clientX;
      const clientY =
        "clientY" in event
          ? event.clientY
          : (event as TouchEvent).touches[0].clientY;
      lastDragAngleRef.current = getAngleFromPointer(clientX, clientY);
    },
    [getAngleFromPointer],
  );

  const handleDrag = useCallback(
    (
      _event: MouseEvent | TouchEvent | PointerEvent,
      info: { point: { x: number; y: number } },
    ) => {
      if (!isDragging) return;
      const currentAngle = getAngleFromPointer(info.point.x, info.point.y);
      const previousAngle = lastDragAngleRef.current;

      if (previousAngle === null) {
        lastDragAngleRef.current = currentAngle;
        return;
      }

      // Normalize crossing through -180/180 so drag stays continuous.
      let angleDelta = currentAngle - previousAngle;
      if (angleDelta > 180) angleDelta -= 360;
      if (angleDelta < -180) angleDelta += 360;

      const radiusNormalization = radius / 360;
      const adjustedDelta = angleDelta * dragSensitivity * radiusNormalization;
      const newRotation = rotationRef.current + adjustedDelta;
      rotationRef.current = newRotation;
      rotation.set(newRotation);
      lastDragAngleRef.current = currentAngle;
    },
    [isDragging, getAngleFromPointer, rotation, dragSensitivity, radius],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    lastDragAngleRef.current = null;
  }, []);

  useEffect(() => {
    if (!mouseWheel || !containerRef.current) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * 0.5;
      rotationRef.current += delta * (reverse ? -1 : 1);
      rotation.set(rotationRef.current);
    };

    const container = containerRef.current;
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [mouseWheel, reverse, rotation]);

  const handleCardClick = useCallback(
    (card: Card, index: number) => {
      if (onCardClick) {
        onCardClick(card, index);
      }
    },
    [onCardClick],
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative flex items-center justify-center", className)}
      style={{
        width: `${radius * 2 + cardWidth}px`,
        height: `${radius * 2 + cardHeight}px`,
      }}
    >
      <motion.div
        key={cards.length}
        className="relative w-full h-full"
        style={{
          rotate: smoothRotation,
          willChange: "transform",
        }}
        drag={draggable}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
      >
        {cards.map((card, index) => {
          const position = cardPositions[index];
          return (
            <motion.div
              key={`${card.id}-${cards.length}`}
              className={cn(
                "absolute rounded-xl shadow-lg backdrop-blur-sm overflow-hidden cursor-pointer",
                "border border-white/10",
                cardClassName,
              )}
              style={{
                width: `${cardWidth}px`,
                height: `${cardHeight}px`,
                left: "50%",
                top: "50%",
                x: position.x,
                y: position.y,
                marginLeft: `-${cardWidth / 2}px`,
                marginTop: `-${cardHeight / 2}px`,
                background:
                  card.background ||
                  (card.image
                    ? `url(${card.image}) center/cover`
                    : undefined) ||
                  "rgba(255, 255, 255, 0.1)",
                willChange: "transform",
                rotate: position.angle + 90,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: loaded ? 1 : 0,
                scale: loaded ? 1 : 0,
              }}
              transition={{
                duration: 0.5,
                delay: index * 0.05,
                ease: "easeOut",
              }}
              onMouseEnter={() => pauseOnHover && setIsHovered(true)}
              onMouseLeave={() => pauseOnHover && setIsHovered(false)}
              onClick={() => handleCardClick(card, index)}
              whileHover={
                pauseOnHover
                  ? {
                      scale: 1.05,
                      transition: { duration: 0.2 },
                    }
                  : undefined
              }
            >
              <div className="w-full h-full flex items-center justify-center p-6">
                {card.content}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

RotatingCards.displayName = "RotatingCards";

export default RotatingCards;
