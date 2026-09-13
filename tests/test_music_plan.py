from __future__ import annotations

import json
from pathlib import Path

from src.music_plan import execution_delta, validate_music_plan

FIXTURES = Path(__file__).parent / "fixtures" / "music_plan"


def _load(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def test_three_reference_modes_validate_without_model() -> None:
    for name in ("full.json", "guided.json", "free.json"):
        result = validate_music_plan(_load(name))
        assert result.valid, (name, result.errors)


def test_overlapping_sections_fail_closed() -> None:
    plan = _load("guided.json")
    plan["sections"][1]["start_seconds"] = 7
    result = validate_music_plan(plan)
    assert not result.valid
    assert any("overlaps" in error for error in result.errors)


def test_unresolved_motif_reference_fails_closed() -> None:
    plan = _load("full.json")
    plan["sections"][0]["motif_refs"] = ["missing-motif"]
    result = validate_music_plan(plan)
    assert not result.valid
    assert any("unresolved motif_refs" in error for error in result.errors)


def test_commercial_target_blocks_noncommercial_model_weights() -> None:
    plan = _load("full.json")
    plan["provenance"]["dependencies"].append({
        "name": "example-nc-weights",
        "kind": "model-weights",
        "license": "CC BY-NC 4.0",
    })
    result = validate_music_plan(plan)
    assert not result.valid
    assert any("non-commercial model weights" in error for error in result.errors)


def test_noncommercial_research_fixture_can_remain_noncommercial() -> None:
    plan = _load("free.json")
    plan["provenance"]["dependencies"].append({
        "name": "example-nc-weights",
        "kind": "model-weights",
        "license": "CC BY-NC 4.0",
    })
    result = validate_music_plan(plan)
    assert result.valid


def test_provider_degradation_is_explicit() -> None:
    requested = _load("full.json")
    executed = dict(requested)
    executed["mode"] = "free"
    executed.pop("motifs")
    delta = execution_delta(requested, executed)
    assert "mode:full->free" in delta
    assert "dropped:motifs" in delta
