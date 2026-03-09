import hongheibangData from "@/data/generated/2025/podcast-hongheibang.json";

export interface HongheibangStats {
  red: number;
  black: number;
}

const driverStats = hongheibangData.drivers as Record<string, HongheibangStats>;

export function getHongheibang(driverId: string): HongheibangStats {
  return driverStats[driverId] ?? { red: 0, black: 0 };
}
