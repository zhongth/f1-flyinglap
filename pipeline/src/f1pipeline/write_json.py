"""Validate and write JSON output files."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import fastf1

from .schema import (
    Driver,
    HeadToHeadResult,
    MedianGapResult,
    PipelineMetadata,
    Q3RateResult,
    QualifyingResult,
    RaceWeekend,
    Team,
)

PIPELINE_VERSION = "1.0.0"


def _write_json(path: Path, data: object) -> None:
    """Write JSON with consistent formatting."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"    Wrote {path.name} ({path.stat().st_size:,} bytes)")


def write_all(
    output_dir: Path,
    season: int,
    races: list[RaceWeekend],
    qualifying: list[QualifyingResult],
    teams: list[Team],
    drivers: list[Driver],
    teammate_gaps: dict[str, MedianGapResult],
    head_to_head: dict[str, HeadToHeadResult],
    q3_rates: dict[str, Q3RateResult],
) -> None:
    """Write all JSON files to the output directory."""
    season_dir = output_dir / str(season)
    computed_dir = season_dir / "computed"

    print(f"\nWriting JSON to {season_dir}/")

    # Core data files
    _write_json(
        season_dir / "races.json",
        [r.model_dump() for r in races],
    )

    _write_json(
        season_dir / "qualifying-results.json",
        [q.model_dump() for q in qualifying],
    )

    _write_json(
        season_dir / "teams.json",
        [t.model_dump() for t in teams],
    )

    _write_json(
        season_dir / "drivers.json",
        [d.model_dump() for d in drivers],
    )

    # Computed stats
    _write_json(
        computed_dir / "teammate-gaps.json",
        {k: v.model_dump() for k, v in teammate_gaps.items()},
    )

    _write_json(
        computed_dir / "head-to-head.json",
        {k: v.model_dump() for k, v in head_to_head.items()},
    )

    _write_json(
        computed_dir / "q3-rates.json",
        {k: v.model_dump() for k, v in q3_rates.items()},
    )

    # Metadata
    last_race = races[-1] if races else None
    metadata = PipelineMetadata(
        generatedAt=datetime.now(timezone.utc).isoformat(),
        season=season,
        lastRaceRound=last_race.round if last_race else 0,
        lastRaceName=last_race.name if last_race else "",
        fastf1Version=fastf1.__version__,
        pipelineVersion=PIPELINE_VERSION,
    )
    _write_json(season_dir / "metadata.json", metadata.model_dump())

    print(f"\n  All JSON written to {season_dir}/")
