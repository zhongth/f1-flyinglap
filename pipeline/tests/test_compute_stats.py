"""Unit tests for f1pipeline.compute_stats.

Each test class covers one function.  All fixtures are defined in conftest.py.
No FastF1, no network, no disk — every test uses synthetic Pydantic instances.
"""

from __future__ import annotations

from typing import Any

from f1pipeline import compute_stats as cs
from f1pipeline.schema import QualifyingResult


# ===========================================================================
# _parse_time
# ===========================================================================


class TestParseTime:
    """Tests for _parse_time('M:SS.MMM') → float | None."""

    def test_valid_time_returns_ms(self):
        # 1 min * 60000 + 23 sec * 1000 + 456 ms
        assert getattr(cs, "_parse_time")("1:23.456") == 83_456

    def test_zero_minutes(self):
        assert getattr(cs, "_parse_time")("0:58.123") == 58_123

    def test_none_input_returns_none(self):
        assert getattr(cs, "_parse_time")(None) is None

    def test_empty_string_returns_none(self):
        assert getattr(cs, "_parse_time")("") is None

    def test_malformed_no_colon_returns_none(self):
        # split(":") gives one element; parts[1] raises IndexError
        assert getattr(cs, "_parse_time")("83456") is None

    def test_malformed_no_dot_returns_none(self):
        # split(".") gives one element; sec_parts[1] raises IndexError
        assert getattr(cs, "_parse_time")("1:23456") is None

    def test_malformed_alpha_returns_none(self):
        # int("AB") raises ValueError
        assert getattr(cs, "_parse_time")("1:AB.CDE") is None

    def test_two_minute_lap(self):
        # 2 * 60000 + 0 * 1000 + 0 = 120000
        assert getattr(cs, "_parse_time")("2:00.000") == 120_000


# ===========================================================================
# _format_gap
# ===========================================================================


class TestFormatGap:
    """Tests for _format_gap(ms: float) → str."""

    def test_positive_gap(self):
        assert getattr(cs, "_format_gap")(1500.0) == "+1.500"

    def test_negative_gap(self):
        assert getattr(cs, "_format_gap")(-750.0) == "-0.750"

    def test_zero_is_positive(self):
        # sign = "+" if ms >= 0 else "-"  →  zero is positive by design
        assert getattr(cs, "_format_gap")(0.0) == "+0.000"

    def test_large_gap_padding(self):
        # seconds=2, ms=5 → must zero-pad ms to three digits: "005"
        assert getattr(cs, "_format_gap")(2005.0) == "+2.005"

    def test_sub_second_zero_seconds(self):
        # seconds=0, ms=50 → "0.050"
        assert getattr(cs, "_format_gap")(50.0) == "+0.050"

    def test_exactly_one_second(self):
        assert getattr(cs, "_format_gap")(1000.0) == "+1.000"

    def test_negative_sub_second(self):
        assert getattr(cs, "_format_gap")(-42.0) == "-0.042"


# ===========================================================================
# _highest_common_session
# ===========================================================================


class TestHighestCommonSession:
    """Tests for _highest_common_session(r1, r2) → tuple[float, float] | None."""

    def _make(
        self,
        race_id: str = "race_1",
        driver_id: str = "d1",
        **times: str | None,
    ) -> QualifyingResult:
        return QualifyingResult(
            raceId=race_id,
            driverId=driver_id,
            position=1,
            **times,
        )

    def test_both_have_q3_uses_q3(self):
        r1 = self._make(driver_id="lec", q3Time="1:20.000", q2Time="1:21.000", q1Time="1:22.000")
        r2 = self._make(driver_id="ham", q3Time="1:20.500", q2Time="1:21.500", q1Time="1:22.500")
        res = getattr(cs, "_highest_common_session")(r1, r2)
        assert res is not None
        t1, t2 = res
        assert t1 == 80_000   # 1:20.000
        assert t2 == 80_500   # 1:20.500

    def test_falls_back_to_q2_when_one_has_no_q3(self):
        r1 = self._make(driver_id="lec", q3Time="1:20.000", q2Time="1:21.000")
        r2 = self._make(driver_id="ham", q2Time="1:21.500")   # knocked out in Q2
        res = getattr(cs, "_highest_common_session")(r1, r2)
        assert res is not None
        t1, t2 = res
        assert t1 == 81_000   # 1:21.000 (Q2 time of LEC)
        assert t2 == 81_500   # 1:21.500 (Q2 time of HAM)

    def test_falls_back_to_q1_when_only_q1_shared(self):
        r1 = self._make(driver_id="lec", q1Time="1:22.000")
        r2 = self._make(driver_id="ham", q1Time="1:22.800")
        res = getattr(cs, "_highest_common_session")(r1, r2)
        assert res is not None
        t1, t2 = res
        assert t1 == 82_000
        assert t2 == 82_800

    def test_no_shared_session_returns_none(self):
        # r1 has only Q3 (top qualifier), r2 has only Q1 (knocked out early)
        r1 = self._make(driver_id="lec", q3Time="1:20.000")
        r2 = self._make(driver_id="ham", q1Time="1:24.000")
        assert getattr(cs, "_highest_common_session")(r1, r2) is None

    def test_one_driver_all_none_returns_none(self):
        r1 = self._make(driver_id="lec", q3Time="1:20.000", q2Time="1:21.000", q1Time="1:22.000")
        r2 = self._make(driver_id="ham")   # all times None
        assert getattr(cs, "_highest_common_session")(r1, r2) is None

    def test_malformed_q3_falls_back_to_q2(self):
        # Both have q3Time set, but one is malformed → _parse_time returns None
        # The function should NOT use Q3 and instead fall through to Q2.
        r1 = self._make(driver_id="lec", q3Time="INVALID", q2Time="1:21.000")
        r2 = self._make(driver_id="ham", q3Time="1:20.500", q2Time="1:21.500")
        res = getattr(cs, "_highest_common_session")(r1, r2)
        assert res is not None
        t1, t2 = res
        assert t1 == 81_000   # fell back to Q2
        assert t2 == 81_500


# ===========================================================================
# compute_teammate_gaps
# ===========================================================================


class TestComputeTeammateGaps:
    """Tests for compute_teammate_gaps(races, qualifying, teams, scope)."""

    def test_basic_season_gap(self, three_races: list[Any], ferrari_team: Any, make_qual: Any):
        # LEC (driver1) = 1:20.000 = 80_000 ms
        # HAM (driver2) = 1:20.100 = 80_100 ms
        # gap formula: (t1 - t2) / ref * 100 * 1000
        #            = (80_000 - 80_100) / 80_000 * 100 * 1000
        #            = -100 / 80_000 * 100_000 = -125.0
        # LEC is faster → medianGap is negative (driver1 faster = negative by design)
        qual: list[QualifyingResult] = []
        for race in three_races:
            qual.append(make_qual(race.id, "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"))
            qual.append(make_qual(race.id, "lewis_hamilton", q3Time="1:20.100", bestTime="1:20.100"))

        result = cs.compute_teammate_gaps(three_races, qual, [ferrari_team], "season")

        assert "ferrari.season" in result
        r = result["ferrari.season"]
        assert r.raceCount == 3
        assert r.scope == "season"
        assert r.teamId == "ferrari"
        assert r.driver1Id == "charles_leclerc"
        assert r.driver2Id == "lewis_hamilton"
        assert abs(r.medianGap + 125.0) < 1e-3

    def test_negative_gap_means_driver1_faster(self, three_races: list[Any], ferrari_team: Any, make_qual: Any):
        # LEC (driver1) faster → (t1 - t2) negative → medianGap < 0
        qual: list[QualifyingResult] = []
        for race in three_races:
            qual.append(make_qual(race.id, "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"))
            qual.append(make_qual(race.id, "lewis_hamilton", q3Time="1:20.200", bestTime="1:20.200"))

        result = cs.compute_teammate_gaps(three_races, qual, [ferrari_team], "season")
        assert result["ferrari.season"].medianGap < 0

    def test_positive_gap_means_driver2_faster(self, three_races: list[Any], ferrari_team: Any, make_qual: Any):
        # HAM (driver2) faster → (t1 - t2) positive → medianGap > 0
        qual: list[QualifyingResult] = []
        for race in three_races:
            qual.append(make_qual(race.id, "charles_leclerc", q3Time="1:20.200", bestTime="1:20.200"))
            qual.append(make_qual(race.id, "lewis_hamilton", q3Time="1:20.000", bestTime="1:20.000"))

        result = cs.compute_teammate_gaps(three_races, qual, [ferrari_team], "season")
        assert result["ferrari.season"].medianGap > 0

    def test_last5_scope_excludes_earliest_race(self, six_races: list[Any], ferrari_team: Any, make_qual: Any):
        # Race 1: LEC dominant (huge negative gap contribution)
        # Races 2–6: HAM slightly faster
        # With last5, race 1 is excluded → medianGap should be > 0 (HAM faster overall)
        qual: list[QualifyingResult] = []
        
        # Race 1 — LEC much faster (should be excluded from last5)
        qual.append(make_qual("race_1", "charles_leclerc", q3Time="1:18.000", bestTime="1:18.000"))
        qual.append(make_qual("race_1", "lewis_hamilton",  q3Time="1:22.000", bestTime="1:22.000"))
        # Races 2–6 — HAM slightly faster
        for i in range(2, 7):
            qual.append(make_qual(f"race_{i}", "charles_leclerc", q3Time="1:20.200", bestTime="1:20.200"))
            qual.append(make_qual(f"race_{i}", "lewis_hamilton",  q3Time="1:20.000", bestTime="1:20.000"))

        result = cs.compute_teammate_gaps(six_races, qual, [ferrari_team], "last5")
        r = result["ferrari.last5"]
        assert r.raceCount == 5        # races 2–6 only
        assert r.medianGap > 0        # HAM faster in all 5 counted races

    def test_last5_key_is_scoped(self, three_races: list[Any], ferrari_team: Any, make_qual: Any):
        qual: list[QualifyingResult] = []
        for race in three_races:
            qual.append(make_qual(race.id, "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"))
            qual.append(make_qual(race.id, "lewis_hamilton",  q3Time="1:20.100", bestTime="1:20.100"))

        result = cs.compute_teammate_gaps(three_races, qual, [ferrari_team], "last5")
        assert "ferrari.last5" in result

    def test_missing_teammate_result_reduces_race_count(self, three_races: list[Any], ferrari_team: Any, make_qual: Any):
        # HAM has no result for race_2 → raceCount should be 2, not 3
        qual: list[QualifyingResult] = []
        for race in three_races:
            qual.append(make_qual(race.id, "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"))
        # HAM only in races 1 and 3
        qual.append(make_qual("race_1", "lewis_hamilton", q3Time="1:20.100", bestTime="1:20.100"))
        qual.append(make_qual("race_3", "lewis_hamilton", q3Time="1:20.100", bestTime="1:20.100"))

        result = cs.compute_teammate_gaps(three_races, qual, [ferrari_team], "season")
        assert result["ferrari.season"].raceCount == 2

    def test_no_shared_session_race_excluded(self, three_races: list[Any], ferrari_team: Any, make_qual: Any):
        # Race 2: LEC only has Q3, HAM only has Q1 → no shared session → excluded
        qual: list[QualifyingResult] = []
        for race in three_races:
            qual.append(make_qual(race.id, "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"))
            qual.append(make_qual(race.id, "lewis_hamilton",  q3Time="1:20.100", bestTime="1:20.100"))
        # Override race_2 for HAM: only Q1 time (knocked out early)
        qual = [q for q in qual if not (q.raceId == "race_2" and q.driverId == "lewis_hamilton")]
        qual.append(make_qual("race_2", "lewis_hamilton", q1Time="1:24.000", bestTime="1:24.000"))
        # Override race_2 for LEC: only Q3 time (nothing to share with HAM's Q1)
        qual = [q for q in qual if not (q.raceId == "race_2" and q.driverId == "charles_leclerc")]
        qual.append(make_qual("race_2", "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"))

        result = cs.compute_teammate_gaps(three_races, qual, [ferrari_team], "season")
        assert result["ferrari.season"].raceCount == 2

    def test_zero_qualifying_results_returns_zero_gap(self, three_races: list[Any], ferrari_team: Any):
        # Empty qualifying list → gaps=[] → medianGap must be 0.0, not a StatisticsError
        result = cs.compute_teammate_gaps(three_races, [], [ferrari_team], "season")
        r = result["ferrari.season"]
        assert r.medianGap == 0.0
        assert r.raceCount == 0

    def test_multiple_teams_keyed_independently(
        self, three_races: list[Any], ferrari_team: Any, red_bull_team: Any, make_qual: Any
    ):
        qual: list[QualifyingResult] = []
        for race in three_races:
            qual.append(make_qual(race.id, "charles_leclerc",  q3Time="1:20.000", bestTime="1:20.000"))
            qual.append(make_qual(race.id, "lewis_hamilton",   q3Time="1:20.100", bestTime="1:20.100"))
            qual.append(make_qual(race.id, "max_verstappen",   q3Time="1:19.500", bestTime="1:19.500"))
            qual.append(make_qual(race.id, "liam_lawson",      q3Time="1:20.000", bestTime="1:20.000"))

        result = cs.compute_teammate_gaps(three_races, qual, [ferrari_team, red_bull_team], "season")

        assert "ferrari.season" in result
        assert "red_bull.season" in result
        assert result["ferrari.season"].teamId == "ferrari"
        assert result["red_bull.season"].teamId == "red_bull"

    def test_compute_all_stats_produces_both_scopes(
        self, three_races: list[Any], ferrari_team: Any, leclerc_driver: Any, hamilton_driver: Any, make_qual: Any
    ):
        qual: list[QualifyingResult] = []
        for race in three_races:
            qual.append(make_qual(race.id, "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"))
            qual.append(make_qual(race.id, "lewis_hamilton",  q3Time="1:20.100", bestTime="1:20.100"))

        gaps, _, _ = cs.compute_all_stats(
            three_races, qual, [ferrari_team], [leclerc_driver, hamilton_driver]
        )

        assert "ferrari.season" in gaps
        assert "ferrari.last5" in gaps

    def test_gap_consistency_is_none_for_single_race(self, three_races: list[Any], ferrari_team: Any, make_qual: Any):
        # Only 1 race → MAD undefined → gapConsistency must be None, not 0.0
        qual = [
            make_qual("race_1", "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"),
            make_qual("race_1", "lewis_hamilton",  q3Time="1:20.100", bestTime="1:20.100"),
        ]
        result = cs.compute_teammate_gaps(three_races, qual, [ferrari_team], "season")
        assert result["ferrari.season"].gapConsistency is None

    def test_gap_consistency_zero_for_identical_gaps(
        self, three_races: list[Any], ferrari_team: Any, make_qual: Any
    ):
        # Same gap every race → MAD = 0.0 (perfectly consistent)
        qual: list[Any] = []
        for race in three_races:
            qual.append(make_qual(race.id, "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"))
            qual.append(make_qual(race.id, "lewis_hamilton",  q3Time="1:20.100", bestTime="1:20.100"))
        result = cs.compute_teammate_gaps(three_races, qual, [ferrari_team], "season")
        assert result["ferrari.season"].gapConsistency is not None
        assert abs(result["ferrari.season"].gapConsistency - 0.0) <= 0.1

    def test_gap_consistency_nonzero_for_varying_gaps(
        self, three_races: list[Any], ferrari_team: Any, make_qual: Any
    ):
        # Varying gaps across races → MAD > 0
        qual = [
            make_qual("race_1", "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"),
            make_qual("race_1", "lewis_hamilton",  q3Time="1:20.500", bestTime="1:20.500"),
            make_qual("race_2", "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"),
            make_qual("race_2", "lewis_hamilton",  q3Time="1:20.050", bestTime="1:20.050"),
            make_qual("race_3", "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"),
            make_qual("race_3", "lewis_hamilton",  q3Time="1:21.000", bestTime="1:21.000"),
        ]
        result = cs.compute_teammate_gaps(three_races, qual, [ferrari_team], "season")
        assert result["ferrari.season"].gapConsistency is not None
        assert result["ferrari.season"].gapConsistency > 0

    def test_gap_consistency_none_for_zero_races(
        self, three_races: list[Any], ferrari_team: Any
    ):
        # No qualifying data → gapConsistency must be None
        result = cs.compute_teammate_gaps(three_races, [], [ferrari_team], "season")
        assert result["ferrari.season"].gapConsistency is None


# ===========================================================================
# compute_head_to_head
# ===========================================================================


class TestComputeHeadToHead:
    """Tests for compute_head_to_head(races, qualifying, teams, scope)."""

    def test_driver1_wins_all(self, three_races: list[Any], ferrari_team: Any, make_qual: Any):
        # LEC (driver1) always faster
        qual: list[QualifyingResult] = []
        for race in three_races:
            qual.append(make_qual(race.id, "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"))
            qual.append(make_qual(race.id, "lewis_hamilton",  q3Time="1:20.500", bestTime="1:20.500"))

        result = cs.compute_head_to_head(three_races, qual, [ferrari_team], "season")
        r = result["ferrari.season"]
        assert r.driver1Wins == 3
        assert r.driver2Wins == 0

    def test_driver2_wins_all(self, three_races: list[Any], ferrari_team: Any, make_qual: Any):
        qual: list[QualifyingResult] = []
        for race in three_races:
            qual.append(make_qual(race.id, "charles_leclerc", q3Time="1:20.500", bestTime="1:20.500"))
            qual.append(make_qual(race.id, "lewis_hamilton",  q3Time="1:20.000", bestTime="1:20.000"))

        result = cs.compute_head_to_head(three_races, qual, [ferrari_team], "season")
        r = result["ferrari.season"]
        assert r.driver1Wins == 0
        assert r.driver2Wins == 3

    def test_split_record(self, three_races: list[Any], ferrari_team: Any, make_qual: Any):
        # LEC wins races 1 and 3, HAM wins race 2
        lec_times = {"race_1": "1:20.000", "race_2": "1:20.500", "race_3": "1:20.000"}
        ham_times = {"race_1": "1:20.500", "race_2": "1:20.000", "race_3": "1:20.500"}
        qual: list[QualifyingResult] = []
        for race in three_races:
            qual.append(make_qual(race.id, "charles_leclerc", q3Time=lec_times[race.id], bestTime=lec_times[race.id]))
            qual.append(make_qual(race.id, "lewis_hamilton",  q3Time=ham_times[race.id], bestTime=ham_times[race.id]))

        result = cs.compute_head_to_head(three_races, qual, [ferrari_team], "season")
        r = result["ferrari.season"]
        assert r.driver1Wins == 2
        assert r.driver2Wins == 1

    def test_exact_tie_not_counted_for_either(self, three_races: list[Any], ferrari_team: Any, make_qual: Any):
        # Race 1: identical times → tie → neither driver wins
        # Races 2–3: LEC wins
        qual: list[QualifyingResult] = []
        qual.append(make_qual("race_1", "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"))
        qual.append(make_qual("race_1", "lewis_hamilton",  q3Time="1:20.000", bestTime="1:20.000"))
        qual.append(make_qual("race_2", "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"))
        qual.append(make_qual("race_2", "lewis_hamilton",  q3Time="1:20.500", bestTime="1:20.500"))
        qual.append(make_qual("race_3", "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"))
        qual.append(make_qual("race_3", "lewis_hamilton",  q3Time="1:20.500", bestTime="1:20.500"))

        result = cs.compute_head_to_head(three_races, qual, [ferrari_team], "season")
        r = result["ferrari.season"]
        # Race 1 tie → not counted for either; LEC wins races 2 and 3
        assert r.driver1Wins == 2
        assert r.driver2Wins == 0

    def test_missing_driver_result_not_counted(self, three_races: list[Any], ferrari_team: Any, make_qual: Any):
        # HAM has no result for race_2 → that race is skipped entirely
        qual: list[QualifyingResult] = []
        for race in three_races:
            qual.append(make_qual(race.id, "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"))
        qual.append(make_qual("race_1", "lewis_hamilton", q3Time="1:20.500", bestTime="1:20.500"))
        qual.append(make_qual("race_3", "lewis_hamilton", q3Time="1:20.500", bestTime="1:20.500"))

        result = cs.compute_head_to_head(three_races, qual, [ferrari_team], "season")
        r = result["ferrari.season"]
        # Only races 1 and 3 counted; LEC wins both
        assert r.driver1Wins == 2
        assert r.driver2Wins == 0

    def test_scope_stored_on_result(self, three_races: list[Any], ferrari_team: Any, make_qual: Any):
        qual: list[Any] = []
        for race in three_races:
            qual.append(make_qual(race.id, "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"))
            qual.append(make_qual(race.id, "lewis_hamilton",  q3Time="1:20.100", bestTime="1:20.100"))

        result = cs.compute_head_to_head(three_races, qual, [ferrari_team], "last5")
        assert result["ferrari.last5"].scope == "last5"


# ===========================================================================
# compute_q3_rates
# ===========================================================================


class TestComputeQ3Rates:
    """Tests for compute_q3_rates(races, qualifying, drivers, scope)."""

    def test_perfect_q3_rate(
        self,
        three_races: list[Any],
        leclerc_driver: Any,
        make_qual: Any,
    ):
        qual: list[Any] = []
        for race in three_races:
            qual.append(make_qual(race.id, "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"))

        result = cs.compute_q3_rates(three_races, qual, [leclerc_driver], "season")
        r = result["charles_leclerc.season"]
        assert r.q3Appearances == 3
        assert r.totalRaces == 3
        assert r.q3Rate == 1.0

    def test_zero_q3_rate(
        self,
        three_races: list[Any],
        leclerc_driver: Any,
        make_qual: Any,
    ):
        # Has bestTime (set a lap) but never reached Q3
        qual: list[QualifyingResult] = []
        for race in three_races:
            qual.append(make_qual(race.id, "charles_leclerc", q1Time="1:22.000", bestTime="1:22.000"))

        result = cs.compute_q3_rates(three_races, qual, [leclerc_driver], "season")
        r = result["charles_leclerc.season"]
        assert r.q3Appearances == 0
        assert r.totalRaces == 3
        assert r.q3Rate == 0.0

    def test_partial_q3_rate(
        self,
        three_races: list[Any],
        leclerc_driver: Any,
        make_qual: Any,
    ):
        # Reaches Q3 in 2 of 3 races
        qual = [
            make_qual("race_1", "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"),
            make_qual("race_2", "charles_leclerc", q1Time="1:22.000", bestTime="1:22.000"),
            make_qual("race_3", "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"),
        ]

        result = cs.compute_q3_rates(three_races, qual, [leclerc_driver], "season")
        r = result["charles_leclerc.season"]
        assert r.q3Appearances == 2
        assert r.totalRaces == 3
        assert abs(r.q3Rate - 0.6667) < 1e-4

    def test_dns_excluded_from_total_races(self, three_races: list[Any], leclerc_driver: Any, make_qual: Any):
        # Race 2: bestTime=None (DNS / no time set) → excluded from totalRaces
        qual = [
            make_qual("race_1", "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"),
            make_qual("race_2", "charles_leclerc"),   # bestTime=None → DNS
            make_qual("race_3", "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"),
        ]

        result = cs.compute_q3_rates(three_races, qual, [leclerc_driver], "season")
        r = result["charles_leclerc.season"]
        assert r.totalRaces == 2          # race_2 not counted
        assert r.q3Appearances == 2
        assert r.q3Rate == 1.0

    def test_no_results_returns_zero_rate(self, three_races: list[Any], leclerc_driver: Any):
        # Completely empty qualifying list → no division by zero
        result = cs.compute_q3_rates(three_races, [], [leclerc_driver], "season")
        r = result["charles_leclerc.season"]
        assert r.totalRaces == 0
        assert r.q3Appearances == 0
        assert r.q3Rate == 0.0

    def test_last5_scope_excludes_earliest_race(
        self, six_races: list[Any], leclerc_driver: Any, make_qual: Any
    ):
        # Race 1: LEC did NOT reach Q3
        # Races 2–6: LEC reaches Q3 every time
        # With scope=last5, race 1 is excluded → q3Rate should be 1.0
        qual = [make_qual("race_1", "charles_leclerc", q1Time="1:22.000", bestTime="1:22.000")]
        for i in range(2, 7):
            qual.append(make_qual(f"race_{i}", "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"))

        result = cs.compute_q3_rates(six_races, qual, [leclerc_driver], "last5")
        r = result["charles_leclerc.last5"]
        assert r.totalRaces == 5
        assert r.q3Appearances == 5
        assert r.q3Rate == 1.0

    def test_scope_stored_on_result(self, three_races: list[Any], leclerc_driver: Any, make_qual: Any):
        qual = [make_qual("race_1", "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000")]
        result = cs.compute_q3_rates(three_races, qual, [leclerc_driver], "last5")
        assert result["charles_leclerc.last5"].scope == "last5"

    def test_multiple_drivers_keyed_independently(
        self, three_races: list[Any], leclerc_driver: Any, hamilton_driver: Any, make_qual: Any
    ):
        qual: list[QualifyingResult] = []
        for race in three_races:
            qual.append(make_qual(race.id, "charles_leclerc", q3Time="1:20.000", bestTime="1:20.000"))
            qual.append(make_qual(race.id, "lewis_hamilton",  q1Time="1:22.000", bestTime="1:22.000"))

        result = cs.compute_q3_rates(three_races, qual, [leclerc_driver, hamilton_driver], "season")

        assert "charles_leclerc.season" in result
        assert "lewis_hamilton.season" in result
        assert result["charles_leclerc.season"].q3Rate == 1.0
        assert result["lewis_hamilton.season"].q3Rate == 0.0