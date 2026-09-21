#!/usr/bin/env python3
"""JSON-stdin evaluator for private MusicPlan holdouts.

This file contains no holdout cases. It is designed to be invoked by Botte
Secrete's private holdout runner. The private payload supplies a MusicPlan and a
hidden expected-validity bit; stdout returns only {"passed": bool}.
"""

from __future__ import annotations

import json
import sys
from typing import Any

from src.music_plan import validate_music_plan
from src.music_provider import MockMusicProvider, MusicProviderContractError


def evaluate(payload: dict[str, Any]) -> bool:
    wrapper = payload.get("input")
    if not isinstance(wrapper, dict):
        return False
    plan = wrapper.get("plan")
    expected_valid = wrapper.get("expected_valid")
    if not isinstance(plan, dict) or not isinstance(expected_valid, bool):
        return False

    validation = validate_music_plan(plan)
    validator_valid = validation.valid

    provider_valid = True
    try:
        MockMusicProvider().prepare(plan)
    except MusicProviderContractError:
        provider_valid = False
    except Exception:
        return False

    observed_valid = validator_valid and provider_valid
    return observed_valid is expected_valid


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read())
    except json.JSONDecodeError:
        print(json.dumps({"passed": False}))
        return 0
    if not isinstance(payload, dict):
        print(json.dumps({"passed": False}))
        return 0
    print(json.dumps({"passed": evaluate(payload)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
