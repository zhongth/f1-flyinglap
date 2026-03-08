"""Pydantic models mirroring the frontend TypeScript interfaces exactly."""

from __future__ import annotations

from pydantic import BaseModel


# --- Core entities ---


class DriverStats(BaseModel):
    polePositions: int
    wins: int
    podiums: int
    fastestLaps: int
    championships: int


class Driver(BaseModel):
    id: str
    firstName: str
    lastName: str
    abbreviation: str
    number: int
    teamId: str
    nationality: str
    portraitPath: str
    heightCm: int
    careerStats: DriverStats


class Team(BaseModel):
    id: str
    name: str
    shortName: str
    primaryColor: str
    secondaryColor: str
    logoPath: str
    bgImagePath: str | None = None
    drivers: tuple[str, str]
    constructorOrder: int
    constructorPoints: int


class RaceWeekend(BaseModel):
    id: str
    name: str
    circuit: str
    date: str
    round: int


class QualifyingResult(BaseModel):
    raceId: str
    driverId: str
    position: int
    q1Time: str | None = None
    q2Time: str | None = None
    q3Time: str | None = None
    bestTime: str | None = None


# --- Computed stats ---


class MedianGapResult(BaseModel):
    teamId: str
    driver1Id: str
    driver2Id: str
    medianGap: float  # percentage gap × 1000 (e.g. 36 = 0.036%)
    medianGapFormatted: str
    raceCount: int
    scope: str  # "season" | "last5"


class HeadToHeadResult(BaseModel):
    driver1Id: str
    driver2Id: str
    driver1Wins: int
    driver2Wins: int
    scope: str


class Q3RateResult(BaseModel):
    driverId: str
    q3Appearances: int
    totalRaces: int
    q3Rate: float  # 0–1
    scope: str


class DriverStanding(BaseModel):
    driverId: str
    points: int


class PipelineMetadata(BaseModel):
    generatedAt: str
    season: int
    lastRaceRound: int
    lastRaceName: str
    fastf1Version: str
    pipelineVersion: str
