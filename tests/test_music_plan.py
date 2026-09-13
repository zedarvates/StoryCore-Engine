from __future__ import annotations

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
