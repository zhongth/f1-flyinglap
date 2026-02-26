"""CLI entry point for the F1 data pipeline.

Usage:
    cd pipeline
    uv run python -m f1pipeline.main --season 2025
    uv run python -m f1pipeline.main --season 2025 --output-dir ../data/generated
    uv run python -m f1pipeline.main --season 2025 --up-to-round 5
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import fastf1


def main() -> None:
    parser = argparse.ArgumentParser(description="F1 Flying Lap data pipeline")
    parser.add_argument("--season", type=int, default=2025, help="F1 season year (default: 2025)")
    parser.add_argument(
        "--output-dir",
        type=str,
        default=str(Path(__file__).resolve().parents[3] / "data" / "generated"),
        help="Output directory for JSON files (default: ../data/generated/)",
    )
    parser.add_argument(
        "--up-to-round",
        type=int,
        default=None,
        help="Only fetch data up to this round number (default: all completed)",
    )
    parser.add_argument(
        "--cache-dir",
        type=str,
        default=str(Path(__file__).resolve().parents[2] / "cache"),
        help="FastF1 cache directory (default: pipeline/cache/)",
    )
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    cache_dir = Path(args.cache_dir)

    # Set up FastF1 cache
    cache_dir.mkdir(parents=True, exist_ok=True)
    fastf1.Cache.enable_cache(str(cache_dir))

    print(f"F1 Flying Lap Pipeline v1.0.0")
    print(f"  Season: {args.season}")
    print(f"  Output: {output_dir}")
    print(f"  Cache:  {cache_dir}")
    if args.up_to_round:
        print(f"  Up to round: {args.up_to_round}")
    print()

    # Import here to avoid circular imports and allow --help without deps
    from .compute_stats import compute_all_stats
    from .fetch_calendar import fetch_calendar
    from .fetch_drivers import fetch_drivers
    from .fetch_qualifying import fetch_all_qualifying
    from .fetch_teams import build_teams
    from .write_json import write_all

    # Step 1: Fetch race calendar
    print("Step 1: Fetching race calendar...")
    races = fetch_calendar(args.season)
    if args.up_to_round:
        races = [r for r in races if r.round <= args.up_to_round]
    print(f"  → {len(races)} races\n")

    if not races:
        print("No races found. Exiting.")
        sys.exit(1)

    # Step 2: Fetch qualifying data
    print("Step 2: Fetching qualifying data...")
    qualifying = fetch_all_qualifying(args.season, races, args.up_to_round)
    print(f"  → {len(qualifying)} total qualifying results\n")

    # Step 3: Fetch driver data
    print("Step 3: Fetching driver data...")
    drivers = fetch_drivers(args.season)
    print()

    # Step 4: Build teams
    print("Step 4: Building teams from driver data + branding...")
    teams = build_teams(drivers)
    print()

    # Step 5: Compute stats
    print("Step 5: Computing statistics...")
    teammate_gaps, head_to_head, q3_rates = compute_all_stats(
        races, qualifying, teams, drivers
    )
    print(f"  → {len(teammate_gaps)} teammate gap entries")
    print(f"  → {len(head_to_head)} head-to-head entries")
    print(f"  → {len(q3_rates)} Q3 rate entries\n")

    # Step 6: Write JSON
    print("Step 6: Writing JSON files...")
    write_all(
        output_dir=output_dir,
        season=args.season,
        races=races,
        qualifying=qualifying,
        teams=teams,
        drivers=drivers,
        teammate_gaps=teammate_gaps,
        head_to_head=head_to_head,
        q3_rates=q3_rates,
    )

    print("\nDone!")


if __name__ == "__main__":
    main()
