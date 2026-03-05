const DEFAULT_CAR_MODEL_PATH = "/3d-model/2026_f1_car.glb";

const TEAM_CAR_MODEL_PATHS: Record<string, string> = {
  red_bull: "/3d-model/Red Bull 3D Model.glb",
  ferrari: "/3d-model/Ferrari-3d-compressed.glb",
  mclaren: "/3d-model/McLaren-3d-compressed.glb",
  mercedes: "/3d-model/Mercedas-3d-compressed.glb",
  aston_martin: "/3d-model/Aston-3d-compressed.glb",
  alpine: "/3d-model/Alpine-3d-compressed.glb",
  williams: "/3d-model/Williams-3d-compressed.glb",
  racing_bulls: "/3d-model/RacingBull-3d-compressed.glb",
  sauber: "/3d-model/Sauber-3d-compressed.glb",
  haas: "/3d-model/Haas-3d-compressed.glb",
};

export function getTeamCarModelPath(teamId: string | null | undefined): string {
  if (!teamId) return DEFAULT_CAR_MODEL_PATH;
  return TEAM_CAR_MODEL_PATHS[teamId] ?? DEFAULT_CAR_MODEL_PATH;
}

/** Every model path the app may need (default + all teams). */
export function getAllModelPaths(): string[] {
  return [DEFAULT_CAR_MODEL_PATH, ...Object.values(TEAM_CAR_MODEL_PATHS)];
}
