"""Shared pytest fixtures for the f1pipeline test suite.

All fixtures use plain Pydantic model instances — no FastF1, no network,
no disk access.  Tests run in milliseconds.
"""

from __future__ import annotations

import pytest

from f1pipeline.schema import (
    Driver,
    DriverStats,
    QualifyingResult,
    RaceWeekend,
    Team,
)


# ---------------------------------------------------------------------------
# RaceWeekend fixtures
# ---------------------------------------------------------------------------


def _make_race(round_num: int) -> RaceWeekend:
    return RaceWeekend(
        id=f"race_{round_num}",
        name=f"Round {round_num} Grand Prix",
        circuit=f"Circuit {round_num}",
        date=f"2025-0{round_num}-01" if round_num < 10 else f"2025-{round_num}-01",
        round=round_num,
    )


@pytest.fixture
def three_races() -> list[RaceWeekend]:
    """Three race weekends (rounds 1–3)."""
    return [_make_race(i) for i in range(1, 4)]


@pytest.fixture
def five_races() -> list[RaceWeekend]:
    """Five race weekends (rounds 1–5)."""
    return [_make_race(i) for i in range(1, 6)]


@pytest.fixture
def six_races() -> list[RaceWeekend]:
    """Six race weekends (rounds 1–6).

    Used with scope='last5' to verify round 1 is correctly excluded.
    """
    return [_make_race(i) for i in range(1, 7)]


# ---------------------------------------------------------------------------
# QualifyingResult factory
# ---------------------------------------------------------------------------


@pytest.fixture
def make_qual():
    """Factory fixture: returns a callable that creates a QualifyingResult.

    Usage::

        q = make_qual(race_id="race_1", driver_id="charles_leclerc",
                      q3Time="1:20.000", bestTime="1:20.000")
    """

    def _factory(
        race_id: str,
        driver_id: str,
        position: int = 1,
        q1Time: str | None = None,
        q2Time: str | None = None,
        q3Time: str | None = None,
        bestTime: str | None = None,
    ) -> QualifyingResult:
        return QualifyingResult(
            raceId=race_id,
            driverId=driver_id,
            position=position,
            q1Time=q1Time,
            q2Time=q2Time,
            q3Time=q3Time,
            bestTime=bestTime,
        )

    return _factory


# ---------------------------------------------------------------------------
# Team fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def ferrari_team() -> Team:
    """Ferrari team with LEC as driver1, HAM as driver2."""
    return Team(
        id="ferrari",
        name="Ferrari",
        shortName="FER",
        primaryColor="#E8002D",
        secondaryColor="#FFFFFF",
        logoPath="/logos/ferrari.svg",
        bgImagePath=None,
        drivers=("charles_leclerc", "lewis_hamilton"),
        constructorOrder=1,
        constructorPoints=300,
    )


@pytest.fixture
def red_bull_team() -> Team:
    """Red Bull team with VER as driver1, LAW as driver2."""
    return Team(
        id="red_bull",
        name="Red Bull Racing",
        shortName="RBR",
        primaryColor="#3671C6",
        secondaryColor="#CC1E4A",
        logoPath="/logos/red_bull.svg",
        bgImagePath=None,
        drivers=("max_verstappen", "liam_lawson"),
        constructorOrder=2,
        constructorPoints=250,
    )


# ---------------------------------------------------------------------------
# Driver fixtures
# ---------------------------------------------------------------------------


def _zero_stats() -> DriverStats:
    return DriverStats(
        polePositions=0,
        wins=0,
        podiums=0,
        fastestLaps=0,
        championships=0,
    )


@pytest.fixture
def leclerc_driver() -> Driver:
    return Driver(
        id="charles_leclerc",
        firstName="Charles",
        lastName="Leclerc",
        abbreviation="LEC",
        number=16,
        teamId="ferrari",
        nationality="Monégasque",
        portraitPath="/drivers/leclerc.png",
        heightCm=180,
        careerStats=_zero_stats(),
    )


@pytest.fixture
def hamilton_driver() -> Driver:
    return Driver(
        id="lewis_hamilton",
        firstName="Lewis",
        lastName="Hamilton",
        abbreviation="HAM",
        number=44,
        teamId="ferrari",
        nationality="British",
        portraitPath="/drivers/hamilton.png",
        heightCm=174,
        careerStats=_zero_stats(),
    )


@pytest.fixture
def verstappen_driver() -> Driver:
    return Driver(
        id="max_verstappen",
        firstName="Max",
        lastName="Verstappen",
        abbreviation="VER",
        number=1,
        teamId="red_bull",
        nationality="Dutch",
        portraitPath="/drivers/verstappen.png",
        heightCm=181,
        careerStats=_zero_stats(),
    )


@pytest.fixture
def lawson_driver() -> Driver:
    return Driver(
        id="liam_lawson",
        firstName="Liam",
        lastName="Lawson",
        abbreviation="LAW",
        number=30,
        teamId="red_bull",
        nationality="New Zealander",
        portraitPath="/drivers/lawson.png",
        heightCm=170,
        careerStats=_zero_stats(),
    )