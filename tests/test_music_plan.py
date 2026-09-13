from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest

from src.music_plan import execution_delta, validate_music_plan
from src.music_provider import MockMusicProvider, MusicProviderContractError

FIXTURES = Path(__file__).parent / "fixtures" / "music_plan"


def _load(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def test_three_reference_modes_validate_without_model() -> None:
    for name in ("full.json", "guided.json", "free.json"):
        result = validate_music_plan(_load(name))
        assert result.valid, (name, result.errors)


def test_required_plan_id_is_enforced_by_schema() -> None:
    plan = _load("full.json")
    plan.pop("plan_id")
    result = validate_music_plan(plan)
    assert not result.valid
    assert any("schema:$" in error and "plan_id" in error for error in result.errors)


def test_energy_range_is_enforced_by_schema() -> None:
    plan = _load("full.json")
    plan["sections"][0]["energy"] = 2
    result = validate_music_plan(plan)
    assert not result.valid
    assert any("energy" in error and "greater than the maximum" in error for error in result.errors)


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


def test_commercial_target_blocks_unknown_model_weight_licence() -> None:
    plan = _load("full.json")
    plan["provenance"]["dependencies"].append({
        "name": "unqualified-weights",
        "kind": "model-weights",
        "license": "unknown",
    })
    result = validate_music_plan(plan)
    assert not result.valid
    assert any("unknown licence" in error for error in result.errors)


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
    executed = copy.deepcopy(requested)
    executed["mode"] = "free"
    executed.pop("motifs")
    delta = execution_delta(requested, executed)
    assert "mode:full->free" in delta
    assert "dropped:motifs" in delta


def test_duration_shortening_is_reported() -> None:
    requested = _load("full.json")
    executed = copy.deepcopy(requested)
    executed["duration_seconds"] = requested["duration_seconds"] / 2
    for section in executed["sections"]:
        section["start_seconds"] /= 2
        section["end_seconds"] /= 2
    for cue in executed["sync_cues"]:
        cue["time_seconds"] /= 2
    assert validate_music_plan(executed).valid
    delta = execution_delta(requested, executed)
    assert "changed:duration_seconds" in delta
    assert "changed:sections[0].end_seconds" in delta
    assert any(item.startswith("changed:sync_cues[0].time_seconds") for item in delta)


def test_emptied_sync_cues_are_reported() -> None:
    requested = _load("full.json")
    executed = copy.deepcopy(requested)
    executed["sync_cues"] = []
    assert validate_music_plan(executed).valid
    delta = execution_delta(requested, executed)
    assert "changed:sync_cues.length" in delta


def test_nested_cue_change_is_reported() -> None:
    requested = _load("full.json")
    executed = copy.deepcopy(requested)
    executed["sync_cues"][0]["time_seconds"] += 1
    assert validate_music_plan(executed).valid
    delta = execution_delta(requested, executed)
    assert "changed:sync_cues[0].time_seconds" in delta


def test_full_capability_mock_keeps_requested_state() -> None:
    result = MockMusicProvider().prepare(_load("full.json"))
    assert result.requested_mode == "full"
    assert result.executed_mode == "full"
    assert result.deltas == ()
    assert result.unsupported_fields == ()
    assert result.acknowledged is False
    assert result.reason == ""
    assert result.artifact_status == "candidate"
    assert result.activation_allowed is False
    assert result.promoted is False
    assert result.executed_external_model is False


def test_limited_mock_reports_mode_and_field_degradation() -> None:
    provider = MockMusicProvider(
        provider_id="mock-limited",
        supported_modes=("guided", "free"),
        fallback_mode="guided",
        unsupported_fields=("motifs",),
        degradation_reason="mock provider lacks full symbolic motif control",
    )
    result = provider.prepare(_load("full.json"))
    assert result.executed_mode == "guided"
    assert "mode:full->guided" in result.deltas
    assert "dropped:motifs" in result.deltas
    assert result.unsupported_fields == ("motifs",)
    assert result.acknowledged is True
    assert result.reason
    assert result.artifact_status == "candidate"
    assert result.activation_allowed is False
    assert result.promoted is False
    assert result.executed_external_model is False


def test_silent_provider_degradation_is_rejected() -> None:
    provider = MockMusicProvider(
        provider_id="mock-bad",
        supported_modes=("guided",),
        fallback_mode="guided",
    )
    with pytest.raises(MusicProviderContractError, match="explicit degradation reason"):
        provider.prepare(_load("full.json"))


def test_provider_without_valid_fallback_fails_closed() -> None:
    provider = MockMusicProvider(
        provider_id="mock-no-fallback",
        supported_modes=("guided",),
    )
    with pytest.raises(MusicProviderContractError, match="no valid fallback"):
        provider.prepare(_load("full.json"))
