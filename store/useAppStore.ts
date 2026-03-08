"use client";

import { create } from "zustand";

export type Stage = "GRID" | "VERSUS" | "GRAPH" | "DETAIL";
export type TimeScope = "season" | "last5";
export type CameraMode = "topDown" | "cinematic" | "sideProfile";
const DEFAULT_TEAM_ID = "ferrari";

interface AppState {
  // Stage management
  stage: Stage;
  previousStage: Stage | null;

  // Team selection
  selectedTeamId: string | null;
  hoveredTeamId: string | null;

  // Driver focus (for detail view)
  focusedDriverId: string | null;

  // Time scope for median gap calculation
  timeScope: TimeScope;

  // Animation states
  isAnimating: boolean;
  isCarAnimating: boolean;
  isIntroComplete: boolean;

  // 3D camera mode
  cameraMode: CameraMode;

  // Actions
  setStage: (stage: Stage) => void;
  setSelectedTeamId: (teamId: string | null) => void;
  setHoveredTeamId: (teamId: string | null) => void;
  setFocusedDriverId: (driverId: string | null) => void;
  setTimeScope: (scope: TimeScope) => void;
  setIsAnimating: (animating: boolean) => void;
  setIsCarAnimating: (animating: boolean) => void;
  setIntroComplete: () => void;
  setCameraMode: (mode: CameraMode) => void;

  // Complex actions
  selectTeam: (teamId: string) => void;
  selectDriver: (driverId: string) => void;
  goBack: () => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  stage: "GRID",
  previousStage: null,
  selectedTeamId: null,
  hoveredTeamId: DEFAULT_TEAM_ID,
  focusedDriverId: null,
  timeScope: "season",
  isAnimating: false,
  isCarAnimating: false,
  isIntroComplete: false,
  cameraMode: "topDown",

  // Simple setters
  setStage: (stage) =>
    set((state) => ({
      stage,
      previousStage: state.stage,
    })),

  setSelectedTeamId: (teamId) => set({ selectedTeamId: teamId }),
  setHoveredTeamId: (teamId) => set({ hoveredTeamId: teamId }),
  setFocusedDriverId: (driverId) => set({ focusedDriverId: driverId }),
  setTimeScope: (scope) => set({ timeScope: scope }),
  setIsAnimating: (animating) => set({ isAnimating: animating }),
  setIsCarAnimating: (animating) => set({ isCarAnimating: animating }),
  setIntroComplete: () => set({ isIntroComplete: true }),
  setCameraMode: (mode) => set({ cameraMode: mode }),

  // Select a team (GRID -> VERSUS transition)
  selectTeam: (teamId) => {
    const { isAnimating } = get();
    if (isAnimating) return;

    set({
      selectedTeamId: teamId,
      isAnimating: true,
      cameraMode: "cinematic",
    });
    // Animation component will call setStage("VERSUS") and setIsAnimating(false) when done
  },

  // Select a driver for detail view (VERSUS -> DETAIL transition)
  selectDriver: (driverId) => {
    const { isAnimating, stage } = get();
    if (isAnimating || stage !== "VERSUS") return;

    set({
      focusedDriverId: driverId,
      isAnimating: true,
    });
    // Animation component will call setStage("DETAIL") and setIsAnimating(false) when done
  },

  // Go back one stage
  goBack: () => {
    const { stage, isAnimating, selectedTeamId } = get();
    if (isAnimating) return;

    if (stage === "DETAIL") {
      set({
        stage: "VERSUS",
        previousStage: "DETAIL",
        focusedDriverId: null,
      });
    } else if (stage === "GRAPH") {
      set({
        stage: "VERSUS",
        previousStage: "GRAPH",
        cameraMode: "cinematic",
      });
    } else if (stage === "VERSUS") {
      set({
        stage: "GRID",
        previousStage: "VERSUS",
        selectedTeamId: null,
        hoveredTeamId: selectedTeamId || DEFAULT_TEAM_ID,
        focusedDriverId: null,
        cameraMode: "topDown",
      });
    }
  },

  // Reset to initial state
  reset: () =>
    set({
      stage: "GRID",
      previousStage: null,
      selectedTeamId: null,
      hoveredTeamId: DEFAULT_TEAM_ID,
      focusedDriverId: null,
      isAnimating: false,
      isCarAnimating: false,
      cameraMode: "topDown",
    }),
}));
