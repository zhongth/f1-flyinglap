"""Fetch qualifying session data from FastF1."""

from __future__ import annotations

import math
from datetime import timedelta

import fastf1
import pandas as pd

from .config import DRIVER_ID_MAP, RACE_ID_MAP
from .schema import QualifyingResult, RaceWeekend


def _format_timedelta(td: object) -> str | None:
    """Convert a pandas Timedelta/timedelta to 'M:SS.MMM' string, or None."""
    if td is None or (isinstance(td, float) and math.isnan(td)):
        return None
    if isinstance(td, pd.Timedelta):
        if pd.isna(td):
            return None
        total_ms = td.total_seconds() * 1000
    elif isinstance(td, timedelta):
        total_ms = td.total_seconds() * 1000
    else:
        return None

    if total_ms <= 0:
        return None

    minutes = int(total_ms // 60000)
    seconds = int((total_ms % 60000) // 1000)
    ms = int(total_ms % 1000)
    return f"{minutes}:{seconds:02d}.{ms:03d}"


def _best_time(q1: str | None, q2: str | None, q3: str | None) -> str | None:
    """Return the fastest of the three qualifying times."""
    times = [t for t in (q3, q2, q1) if t is not None]
    return times[0] if times else None


def fetch_qualifying_for_round(
    season: int,
    round_num: int,
    race: RaceWeekend,
) -> list[QualifyingResult]:
    """Fetch qualifying results for a single round."""
    try:
        session = fastf1.get_session(season, round_num, "Q")
        session.load()
    except Exception as e:
        print(f"  [warn] Could not load qualifying for round {round_num} ({race.name}): {e}")
        return []

    results: list[QualifyingResult] = []
    race_id = race.id

    for _, row in session.results.iterrows():
        abbreviation = str(row.get("Abbreviation", ""))
        driver_id = DRIVER_ID_MAP.get(abbreviation)

        if not driver_id:
            print(f"  [warn] Unknown driver abbreviation: {abbreviation!r} in round {round_num}")
            continue

        q1 = _format_timedelta(row.get("Q1"))
        q2 = _format_timedelta(row.get("Q2"))
        q3 = _format_timedelta(row.get("Q3"))

        position = int(row.get("Position", 0)) if not pd.isna(row.get("Position", float("nan"))) else 0

        results.append(
            QualifyingResult(
                raceId=race_id,
                driverId=driver_id,
                position=position,
                q1Time=q1,
                q2Time=q2,
                q3Time=q3,
                bestTime=_best_time(q1, q2, q3),
            )
        )

    return results


def fetch_all_qualifying(
    season: int,
    races: list[RaceWeekend],
    up_to_round: int | None = None,
) -> list[QualifyingResult]:
    """Fetch qualifying data for all completed races in a season."""
    all_results: list[QualifyingResult] = []

    for race in races:
        if up_to_round is not None and race.round > up_to_round:
            break

        print(f"  Fetching qualifying: Round {race.round} — {race.name}")
        round_results = fetch_qualifying_for_round(season, race.round, race)
        all_results.extend(round_results)
        print(f"    → {len(round_results)} results")

    return all_results
