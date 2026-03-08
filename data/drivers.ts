import type { Driver } from "@/types";
import driversData from "@/data/generated/2025/drivers.json";

export const drivers: Driver[] = driversData as Driver[];

// Reference height for scaling (tallest driver)
export const MAX_DRIVER_HEIGHT = Math.max(...drivers.map((d) => d.heightCm));

export function getDriverById(id: string): Driver | undefined {
  return drivers.find((driver) => driver.id === id);
}

export function getDriversByTeamId(teamId: string): Driver[] {
  return drivers.filter((driver) => driver.teamId === teamId);
}

export function getTeammateOf(driverId: string): Driver | undefined {
  const driver = getDriverById(driverId);
  if (!driver) return undefined;

  return drivers.find(
    (d) => d.teamId === driver.teamId && d.id !== driverId
  );
}

// Calculate scale factor based on height (relative to max height)
export function getHeightScale(heightCm: number): number {
  return heightCm / MAX_DRIVER_HEIGHT;
}

export type PedigreeTier = "champion" | "winner" | "podium" | "none" | "rookie";

// Veterans with 0 podiums who should NOT show "ROOKIE"
const VETERAN_DRIVER_IDS = new Set(["yuki_tsunoda"]);

export function getDriverPedigree(driverId: string): { text: string; tier: PedigreeTier } {
  const driver = getDriverById(driverId);
  if (!driver) return { text: "ROOKIE", tier: "rookie" };

  const { championships, wins, podiums } = driver.careerStats;

  if (championships > 0) {
    return { text: `${championships}x WDC`, tier: "champion" };
  }
  if (wins > 0) {
    return { text: `${wins} ${wins === 1 ? "WIN" : "WINS"}`, tier: "winner" };
  }
  if (podiums > 0) {
    return { text: `${podiums} ${podiums === 1 ? "PODIUM" : "PODIUMS"}`, tier: "podium" };
  }
  if (VETERAN_DRIVER_IDS.has(driverId)) {
    return { text: "0 PODIUMS", tier: "none" };
  }
  return { text: "ROOKIE", tier: "rookie" };
}
