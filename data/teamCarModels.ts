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

const FALLBACK_MODEL_PATH = TEAM_CAR_MODEL_PATHS.ferrari;

export function getTeamCarModelPath(teamId: string | null | undefined): string {
  if (!teamId) return FALLBACK_MODEL_PATH;
  return TEAM_CAR_MODEL_PATHS[teamId] ?? FALLBACK_MODEL_PATH;
}

/** Every model path the app may need (all teams). */
export function getAllModelPaths(): string[] {
  return Object.values(TEAM_CAR_MODEL_PATHS);
}
