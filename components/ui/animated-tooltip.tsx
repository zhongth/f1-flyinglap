"use client";

import Image from "next/image";
import { useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";

type TooltipItem = {
  id: number;
  name: string;
  designation: string;
  image: string;
  link?: string;
};

export function AnimatedTooltip({ items }: { items: TooltipItem[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const springConfig = { stiffness: 100, damping: 5 };
  const x = useMotionValue(0);
  const rotate = useSpring(
    useTransform(x, [-100, 100], [-45, 45]),
    springConfig,
  );
  const translateX = useSpring(
    useTransform(x, [-100, 100], [-50, 50]),
    springConfig,
  );

  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    const halfWidth = (event.target as HTMLElement).offsetWidth / 2;
    x.set(event.nativeEvent.offsetX - halfWidth);
  };

  return (
    <>
      {items.map((item) => (
        <div
          className="group relative -mr-4"
          key={item.id}
          onMouseEnter={() => setHoveredIndex(item.id)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence mode="popLayout">
            {hoveredIndex === item.id && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.6 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 260,
                    damping: 10,
                  },
                }}
                exit={{ opacity: 0, y: -20, scale: 0.6 }}
                style={{
                  translateX: translateX,
                  rotate: rotate,
                  whiteSpace: "nowrap",
                }}
                className="absolute top-12 right-0 z-50 flex flex-col items-center justify-center rounded-md border border-white/10 bg-black/80 px-4 py-2 shadow-xl backdrop-blur-md"
              >
                <div className="absolute inset-x-10 -top-px z-30 h-px w-[20%] bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
                <div className="absolute -top-px left-10 z-30 h-px w-[40%] bg-gradient-to-r from-transparent via-sky-500 to-transparent" />
                <p className="relative z-30 text-base font-bold text-white">
                  {item.name}
                </p>
                <p className="text-xs text-white/60">{item.designation}</p>
              </motion.div>
            )}
          </AnimatePresence>
          {item.link ? (
            <a href={item.link} target="_blank" rel="noopener noreferrer" onMouseMove={handleMouseMove}>
              <Image
                src={item.image}
                alt={item.name}
                width={40}
                height={40}
                className="relative !m-0 h-10 w-10 rounded-full border-2 border-white/10 object-cover object-top !p-0 transition duration-500 group-hover:z-30 group-hover:scale-105 group-hover:border-white/30"
              />
            </a>
          ) : (
            <div onMouseMove={handleMouseMove}>
              <Image
                src={item.image}
                alt={item.name}
                width={40}
                height={40}
                className="relative !m-0 h-10 w-10 rounded-full border-2 border-white/10 object-cover object-top !p-0 transition duration-500 group-hover:z-30 group-hover:scale-105 group-hover:border-white/30"
              />
            </div>
          )}
        </div>
      ))}
    </>
  );
}
