"use client";

import { useAppStore } from "@/store/useAppStore";
import { TeamCarousel } from "@/components/stages/TeamCarousel";
import { VersusMode } from "@/components/stages/VersusMode";
export default function Home() {
  const { stage } = useAppStore();

  return (
    <main className="relative w-full min-h-screen overflow-hidden">
      {stage === "GRID" && <TeamCarousel />}
      {stage === "VERSUS" && <VersusMode />}
    </main>
  );
}
