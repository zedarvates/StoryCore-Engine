#!/usr/bin/env python3
"""Negative-control probe for the MusicPlan contract.

This is deliberately separate from the ordinary unit suite. It starts from the
known-good full fixture, injects bounded invalid mutations, and succeeds only if
the public validation/provider boundary rejects every mutant.
"""

from __future__ import annotations

import copy
import json
from pathlib import Path

from src.music_plan import validate_music_plan
from src.music_provider import MockMusicProvider, MusicProviderContractError

FIXTURE = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "music_plan" / "full.json"


def _base() -> dict:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def _mutants() -> list[tuple[str, dict]]:
    cases: list[tuple[str, dict]] = []

    missing_id = copy.deepcopy(_base())
    missing_id.pop("plan_id", None)
    cases.append(("missing-plan-id", missing_id))

    invalid_energy = copy.deepcopy(_base())
    invalid_energy["sections"][0]["energy"] = 2
    cases.append(("energy-out-of-range", invalid_energy))

    unknown_license = copy.deepcopy(_base())
    unknown_license["provenance"]["dependencies"].append({
        "name": "mutation-unknown-weights",
        "kind": "model-weights",
        "license": "unknown",
    })
    cases.append(("unknown-commercial-model-license", unknown_license))

    unresolved_motif = copy.deepcopy(_base())
    unresolved_motif["sections"][0]["motif_refs"] = ["mutation-missing-motif"]
    cases.append(("unresolved-motif", unresolved_motif))

    overlapping = copy.deepcopy(_base())
    overlapping["sections"][1]["start_seconds"] = overlapping["sections"][0]["start_seconds"]
    cases.append(("overlapping-sections", overlapping))

    return cases


def main() -> int:
    failures: list[str] = []
    provider = MockMusicProvider()

    base_validation = validate_music_plan(_base())
    if not base_validation.valid:
        print("FAIL positive control: reference fixture no longer validates")
        return 1
    print("PASS positive control: reference fixture validates")

    for name, mutant in _mutants():
        validation = validate_music_plan(mutant)
        validator_rejected = not validation.valid
        provider_rejected = False
        try:
            provider.prepare(mutant)
        except MusicProviderContractError:
            provider_rejected = True
        except Exception as exc:  # fail closed, but distinguish contract leakage
            failures.append(f"{name}: leaked {type(exc).__name__} instead of MusicProviderContractError")
            print(f"FAIL {name}: unexpected exception {type(exc).__name__}")
            continue

        if validator_rejected and provider_rejected:
            print(f"PASS mutation rejected: {name}")
        else:
            failures.append(
                f"{name}: validator_rejected={validator_rejected}, provider_rejected={provider_rejected}"
            )
            print(f"FAIL mutation survived: {name}")

    if failures:
        print("\nNEGATIVE CONTROL FAILED")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("\nNEGATIVE CONTROL PASSED: every controlled mutant was rejected")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
