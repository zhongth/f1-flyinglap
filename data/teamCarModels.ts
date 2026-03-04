const DEFAULT_CAR_MODEL_PATH = "/3d-model/2026_f1_car.glb";

const TEAM_CAR_MODEL_PATHS: Record<string, string> = {
  red_bull: "/3d-model/Red Bull 3D Model.glb",
  ferrari: "/3d-model/375c749c-a34a-4266-9d3c-5e248ea16709.glb",
  mclaren: "/3d-model/Mclaren 3D Model.glb",
  mercedes: "/3d-model/Mercedas Benz 3D Model.glb",
  aston_martin: "/3d-model/Aston Martin 3D Model.glb",
  alpine: "/3d-model/Alpine 3D Model.glb",
  williams: "/3d-model/Williams 3D Model.glb",
  racing_bulls: "/3d-model/Racing Bull 3D Model.glb",
  sauber: "/3d-model/Sauber 3D Model.glb",
  haas: "/3d-model/Haas 3D Model.glb",
};

export function getTeamCarModelPath(teamId: string | null | undefined): string {
  if (!teamId) return DEFAULT_CAR_MODEL_PATH;
  return TEAM_CAR_MODEL_PATHS[teamId] ?? DEFAULT_CAR_MODEL_PATH;
}

/** Every model path the app may need (default + all teams). */
export function getAllModelPaths(): string[] {
  return [DEFAULT_CAR_MODEL_PATH, ...Object.values(TEAM_CAR_MODEL_PATHS)];
}
