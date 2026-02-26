"""Pre-compute all qualifying statistics.

Mirrors the frontend calculation logic, but runs once in the pipeline
so the frontend just does JSON lookups.
"""

from __future__ import annotations

import statistics

from .schema import (
    Driver,
    HeadToHeadResult,
    MedianGapResult,
    Q3RateResult,
    QualifyingResult,
    RaceWeekend,
    Team,
)


def _parse_time(time_str: str | None) -> float | None:
    """Parse 'M:SS.MMM' string to milliseconds."""
    if not time_str:
        return None
    try:
        parts = time_str.split(":")
        minutes = int(parts[0])
        sec_parts = parts[1].split(".")
        seconds = int(sec_parts[0])
        ms = int(sec_parts[1])
        return minutes * 60000 + seconds * 1000 + ms
    except (ValueError, IndexError):
        return None


def _format_gap(ms: float) -> str:
    """Format a gap in milliseconds to '+S.MMM' or '-S.MMM'."""
    sign = "+" if ms >= 0 else "-"
    abs_ms = abs(ms)
    seconds = int(abs_ms // 1000)
    milliseconds = int(abs_ms % 1000)
    return f"{sign}{seconds}.{milliseconds:03d}"


def compute_teammate_gaps(
    races: list[RaceWeekend],
    qualifying: list[QualifyingResult],
    teams: list[Team],
    scope: str,
) -> dict[str, MedianGapResult]:
    """Compute median qualifying gap for each team.

    Returns dict keyed by '{teamId}.{scope}'.
    """
    race_ids = [r.id for r in races]
    if scope == "last5":
        race_ids = race_ids[-5:]

    results: dict[str, MedianGapResult] = {}

    for team in teams:
        d1_id, d2_id = team.drivers

        # Get results for both drivers in scope
        d1_results = {r.raceId: r for r in qualifying if r.driverId == d1_id and r.raceId in race_ids}
        d2_results = {r.raceId: r for r in qualifying if r.driverId == d2_id and r.raceId in race_ids}

        gaps: list[float] = []
        for race_id in race_ids:
            r1 = d1_results.get(race_id)
            r2 = d2_results.get(race_id)
            if r1 and r2 and r1.bestTime and r2.bestTime:
                t1 = _parse_time(r1.bestTime)
                t2 = _parse_time(r2.bestTime)
                if t1 is not None and t2 is not None:
                    gaps.append(t1 - t2)  # Negative = driver1 faster

        median_gap = statistics.median(gaps) if gaps else 0.0

        key = f"{team.id}.{scope}"
        results[key] = MedianGapResult(
            teamId=team.id,
            driver1Id=d1_id,
            driver2Id=d2_id,
            medianGap=round(median_gap, 1),
            medianGapFormatted=_format_gap(median_gap),
            raceCount=len(gaps),
            scope=scope,
        )

    return results


def compute_head_to_head(
    races: list[RaceWeekend],
    qualifying: list[QualifyingResult],
    teams: list[Team],
    scope: str,
) -> dict[str, HeadToHeadResult]:
    """Compute head-to-head qualifying record for each team.

    Returns dict keyed by '{teamId}.{scope}'.
    """
    race_ids = [r.id for r in races]
    if scope == "last5":
        race_ids = race_ids[-5:]

    results: dict[str, HeadToHeadResult] = {}

    for team in teams:
        d1_id, d2_id = team.drivers

        d1_results = {r.raceId: r for r in qualifying if r.driverId == d1_id and r.raceId in race_ids}
        d2_results = {r.raceId: r for r in qualifying if r.driverId == d2_id and r.raceId in race_ids}

        d1_wins = 0
        d2_wins = 0

        for race_id in race_ids:
            r1 = d1_results.get(race_id)
            r2 = d2_results.get(race_id)
            if r1 and r2 and r1.bestTime and r2.bestTime:
                t1 = _parse_time(r1.bestTime)
                t2 = _parse_time(r2.bestTime)
                if t1 is not None and t2 is not None:
                    if t1 < t2:
                        d1_wins += 1
                    elif t2 < t1:
                        d2_wins += 1

        key = f"{team.id}.{scope}"
        results[key] = HeadToHeadResult(
            driver1Id=d1_id,
            driver2Id=d2_id,
            driver1Wins=d1_wins,
            driver2Wins=d2_wins,
            scope=scope,
        )

    return results


def compute_q3_rates(
    races: list[RaceWeekend],
    qualifying: list[QualifyingResult],
    drivers: list[Driver],
    scope: str,
) -> dict[str, Q3RateResult]:
    """Compute Q3 appearance rate for each driver.

    Returns dict keyed by '{driverId}.{scope}'.
    """
    race_ids = [r.id for r in races]
    if scope == "last5":
        race_ids = race_ids[-5:]

    results: dict[str, Q3RateResult] = {}

    for driver in drivers:
        driver_results = [r for r in qualifying if r.driverId == driver.id and r.raceId in race_ids]

        total_races = 0
        q3_appearances = 0

        for result in driver_results:
            if result.bestTime:  # Driver set a time (not DNS/mechanical)
                total_races += 1
                if result.q3Time:
                    q3_appearances += 1

        key = f"{driver.id}.{scope}"
        results[key] = Q3RateResult(
            driverId=driver.id,
            q3Appearances=q3_appearances,
            totalRaces=total_races,
            q3Rate=round(q3_appearances / total_races, 4) if total_races > 0 else 0.0,
            scope=scope,
        )

    return results


def compute_all_stats(
    races: list[RaceWeekend],
    qualifying: list[QualifyingResult],
    teams: list[Team],
    drivers: list[Driver],
) -> tuple[
    dict[str, MedianGapResult],
    dict[str, HeadToHeadResult],
    dict[str, Q3RateResult],
]:
    """Compute all stats for both scopes, returning merged dicts."""
    all_gaps: dict[str, MedianGapResult] = {}
    all_h2h: dict[str, HeadToHeadResult] = {}
    all_q3: dict[str, Q3RateResult] = {}

    for scope in ("season", "last5"):
        all_gaps.update(compute_teammate_gaps(races, qualifying, teams, scope))
        all_h2h.update(compute_head_to_head(races, qualifying, teams, scope))
        all_q3.update(compute_q3_rates(races, qualifying, drivers, scope))

    return all_gaps, all_h2h, all_q3
