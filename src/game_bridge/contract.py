"""Deterministic StoryCore-to-game manifest compiler.

This module intentionally contains no Ultimate Odycer server implementation,
private reasoning logic, model credentials, or provider-specific code.  It is a
small public interchange contract that a Godot fixture or an external
authoritative backend can consume.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any, Mapping, Sequence

CONTRACT_VERSION = "0.1"
COMPILER_ID = "storycore-game-bridge/0.1"

_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_-]*$")
_LOCALE_PATTERN = re.compile(r"^[a-z]{2}(?:-[A-Z]{2})?$")
_GODOT_VERSION_PATTERN = re.compile(r"^4\.\d+(?:\.\d+)?$")


class ContractError(ValueError):
    """Raised when a StoryCore game specification fails closed."""


def _fail(path: str, message: str) -> None:
    raise ContractError(f"{path}: {message}")


def _require_mapping(value: Any, path: str) -> dict[str, Any]:
    if not isinstance(value, Mapping):
        _fail(path, "must be an object")
    return dict(value)


def _require_sequence(value: Any, path: str) -> list[Any]:
    if not isinstance(value, Sequence) or isinstance(value, (str, bytes, bytearray)):
        _fail(path, "must be an array")
    return list(value)


def _require_exact_keys(
    value: Mapping[str, Any], required: set[str], path: str
) -> None:
    keys = set(value)
    missing = sorted(required - keys)
    unknown = sorted(keys - required)
    if missing:
        _fail(path, f"missing required fields: {', '.join(missing)}")
    if unknown:
        _fail(path, f"unknown fields: {', '.join(unknown)}")


def _require_id(value: Any, path: str) -> str:
    if not isinstance(value, str) or not _ID_PATTERN.fullmatch(value):
        _fail(path, "must match ^[a-z0-9][a-z0-9_-]*$")
    return value


def _require_non_empty_string(value: Any, path: str) -> str:
    if not isinstance(value, str) or not value.strip():
        _fail(path, "must be a non-empty string")
    return value.strip()


def _require_positive_int(value: Any, path: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        _fail(path, "must be a positive integer")
    return value


def _require_non_negative_int(value: Any, path: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        _fail(path, "must be a non-negative integer")
    return value


def _localized_text(value: Any, locales: list[str], path: str) -> dict[str, str]:
    data = _require_mapping(value, path)
    expected = set(locales)
    actual = set(data)
    if actual != expected:
        missing = sorted(expected - actual)
        unknown = sorted(actual - expected)
        details: list[str] = []
        if missing:
            details.append(f"missing locales: {', '.join(missing)}")
        if unknown:
            details.append(f"unknown locales: {', '.join(unknown)}")
        _fail(path, "; ".join(details))
    return {
        locale: _require_non_empty_string(data[locale], f"{path}.{locale}")
        for locale in locales
    }


def _localized_dialogue(
    value: Any, locales: list[str], path: str
) -> dict[str, list[str]]:
    data = _require_mapping(value, path)
    expected = set(locales)
    actual = set(data)
    if actual != expected:
        _fail(path, "must contain exactly the declared locales")

    normalized: dict[str, list[str]] = {}
    for locale in locales:
        lines = _require_sequence(data[locale], f"{path}.{locale}")
        if not lines:
            _fail(f"{path}.{locale}", "must contain at least one line")
        normalized[locale] = [
            _require_non_empty_string(line, f"{path}.{locale}[{index}]")
            for index, line in enumerate(lines)
        ]
    return normalized


def _unique_ids(entries: list[dict[str, Any]], path: str) -> set[str]:
    seen: set[str] = set()
    for index, entry in enumerate(entries):
        entry_id = entry["id"]
        if entry_id in seen:
            _fail(f"{path}[{index}].id", f"duplicate id: {entry_id}")
        seen.add(entry_id)
    return seen


def _canonical_bytes(value: Any) -> bytes:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def _sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def validate_and_normalize(spec: Mapping[str, Any]) -> dict[str, Any]:
    """Validate an interchange specification and return normalized data.

    Validation is deliberately strict. Unknown fields, unresolved references,
    partial localizations, and attempts to include private components are
    rejected rather than guessed or silently discarded.
    """

    root = _require_mapping(spec, "spec")
    top_level = {
        "schema_version",
        "project",
        "locales",
        "world",
        "actors",
        "items",
        "quest",
        "gameplay",
        "runtime",
        "boundary",
    }
    _require_exact_keys(root, top_level, "spec")

    if root["schema_version"] != CONTRACT_VERSION:
        _fail(
            "spec.schema_version",
            f"expected {CONTRACT_VERSION!r}, got {root['schema_version']!r}",
        )

    raw_locales = _require_sequence(root["locales"], "spec.locales")
    if not raw_locales:
        _fail("spec.locales", "must contain at least one locale")
    locales: list[str] = []
    for index, raw_locale in enumerate(raw_locales):
        if not isinstance(raw_locale, str) or not _LOCALE_PATTERN.fullmatch(raw_locale):
            _fail(f"spec.locales[{index}]", "must be a supported locale code")
        if raw_locale in locales:
            _fail(f"spec.locales[{index}]", f"duplicate locale: {raw_locale}")
        locales.append(raw_locale)

    project = _require_mapping(root["project"], "spec.project")
    _require_exact_keys(project, {"id", "title", "summary", "license"}, "spec.project")
    if project["license"] != "MIT":
        _fail("spec.project.license", "public StoryCore fixtures must use MIT")
    normalized_project = {
        "id": _require_id(project["id"], "spec.project.id"),
        "title": _localized_text(project["title"], locales, "spec.project.title"),
        "summary": _localized_text(
            project["summary"], locales, "spec.project.summary"
        ),
        "license": "MIT",
    }

    world = _require_mapping(root["world"], "spec.world")
    _require_exact_keys(world, {"id", "title", "biome"}, "spec.world")
    normalized_world = {
        "id": _require_id(world["id"], "spec.world.id"),
        "title": _localized_text(world["title"], locales, "spec.world.title"),
        "biome": _require_id(world["biome"], "spec.world.biome"),
    }

    raw_actors = _require_sequence(root["actors"], "spec.actors")
    if not raw_actors:
        _fail("spec.actors", "must contain at least one actor")
    actors: list[dict[str, Any]] = []
    for index, raw_actor in enumerate(raw_actors):
        path = f"spec.actors[{index}]"
        actor = _require_mapping(raw_actor, path)
        _require_exact_keys(actor, {"id", "name", "role", "dialogue"}, path)
        actors.append(
            {
                "id": _require_id(actor["id"], f"{path}.id"),
                "name": _localized_text(actor["name"], locales, f"{path}.name"),
                "role": _require_id(actor["role"], f"{path}.role"),
                "dialogue": _localized_dialogue(
                    actor["dialogue"], locales, f"{path}.dialogue"
                ),
            }
        )
    _unique_ids(actors, "spec.actors")

    raw_items = _require_sequence(root["items"], "spec.items")
    if not raw_items:
        _fail("spec.items", "must contain at least one item")
    items: list[dict[str, Any]] = []
    for index, raw_item in enumerate(raw_items):
        path = f"spec.items[{index}]"
        item = _require_mapping(raw_item, path)
        _require_exact_keys(item, {"id", "name", "score"}, path)
        items.append(
            {
                "id": _require_id(item["id"], f"{path}.id"),
                "name": _localized_text(item["name"], locales, f"{path}.name"),
                "score": _require_non_negative_int(item["score"], f"{path}.score"),
            }
        )
    item_ids = _unique_ids(items, "spec.items")

    quest = _require_mapping(root["quest"], "spec.quest")
    _require_exact_keys(quest, {"id", "title", "objectives", "rewards"}, "spec.quest")
    raw_objectives = _require_sequence(quest["objectives"], "spec.quest.objectives")
    if not raw_objectives:
        _fail("spec.quest.objectives", "must contain at least one objective")
    objectives: list[dict[str, Any]] = []
    for index, raw_objective in enumerate(raw_objectives):
        path = f"spec.quest.objectives[{index}]"
        objective = _require_mapping(raw_objective, path)
        _require_exact_keys(
            objective, {"id", "kind", "target_id", "required_count"}, path
        )
        if objective["kind"] != "collect":
            _fail(f"{path}.kind", "v0.1 supports only the collect objective")
        target_id = _require_id(objective["target_id"], f"{path}.target_id")
        if target_id not in item_ids:
            _fail(f"{path}.target_id", f"unresolved item reference: {target_id}")
        objectives.append(
            {
                "id": _require_id(objective["id"], f"{path}.id"),
                "kind": "collect",
                "target_id": target_id,
                "required_count": _require_positive_int(
                    objective["required_count"], f"{path}.required_count"
                ),
            }
        )
    _unique_ids(objectives, "spec.quest.objectives")

    raw_rewards = _require_sequence(quest["rewards"], "spec.quest.rewards")
    rewards: list[dict[str, Any]] = []
    for index, raw_reward in enumerate(raw_rewards):
        path = f"spec.quest.rewards[{index}]"
        reward = _require_mapping(raw_reward, path)
        _require_exact_keys(reward, {"item_id", "count"}, path)
        item_id = _require_id(reward["item_id"], f"{path}.item_id")
        if item_id not in item_ids:
            _fail(f"{path}.item_id", f"unresolved item reference: {item_id}")
        rewards.append(
            {
                "item_id": item_id,
                "count": _require_positive_int(reward["count"], f"{path}.count"),
            }
        )
    normalized_quest = {
        "id": _require_id(quest["id"], "spec.quest.id"),
        "title": _localized_text(quest["title"], locales, "spec.quest.title"),
        "objectives": objectives,
        "rewards": rewards,
    }

    gameplay = _require_mapping(root["gameplay"], "spec.gameplay")
    _require_exact_keys(
        gameplay,
        {"drop_limit", "score_target", "board_seed", "score_bins"},
        "spec.gameplay",
    )
    raw_bins = _require_sequence(gameplay["score_bins"], "spec.gameplay.score_bins")
    if len(raw_bins) < 3:
        _fail("spec.gameplay.score_bins", "must contain at least three bins")
    score_bins = [
        _require_positive_int(value, f"spec.gameplay.score_bins[{index}]")
        for index, value in enumerate(raw_bins)
    ]
    normalized_gameplay = {
        "drop_limit": _require_positive_int(
            gameplay["drop_limit"], "spec.gameplay.drop_limit"
        ),
        "score_target": _require_positive_int(
            gameplay["score_target"], "spec.gameplay.score_target"
        ),
        "board_seed": _require_non_negative_int(
            gameplay["board_seed"], "spec.gameplay.board_seed"
        ),
        "score_bins": score_bins,
    }

    runtime = _require_mapping(root["runtime"], "spec.runtime")
    _require_exact_keys(
        runtime, {"engine", "minimum_version", "entry_scene", "authority"}, "spec.runtime"
    )
    if runtime["engine"] != "godot":
        _fail("spec.runtime.engine", "v0.1 supports only godot")
    if runtime["authority"] not in {"local-fixture", "external-contract"}:
        _fail(
            "spec.runtime.authority",
            "must be local-fixture or external-contract",
        )
    entry_scene = _require_non_empty_string(
        runtime["entry_scene"], "spec.runtime.entry_scene"
    )
    if not entry_scene.startswith("res://"):
        _fail("spec.runtime.entry_scene", "must be a res:// path")
    if ".." in Path(entry_scene.removeprefix("res://")).parts:
        _fail("spec.runtime.entry_scene", "must not traverse outside res://")
    if not entry_scene.endswith(".tscn"):
        _fail("spec.runtime.entry_scene", "must reference a .tscn scene")
    minimum_version = _require_non_empty_string(
        runtime["minimum_version"], "spec.runtime.minimum_version"
    )
    if not _GODOT_VERSION_PATTERN.fullmatch(minimum_version):
        _fail(
            "spec.runtime.minimum_version",
            "must be a Godot 4 version such as 4.2 or 4.2.1",
        )
    normalized_runtime = {
        "engine": "godot",
        "minimum_version": minimum_version,
        "entry_scene": entry_scene,
        "authority": runtime["authority"],
    }

    boundary = _require_mapping(root["boundary"], "spec.boundary")
    _require_exact_keys(
        boundary,
        {
            "public_contract_only",
            "private_components_included",
            "authoritative_backend",
        },
        "spec.boundary",
    )
    if boundary["public_contract_only"] is not True:
        _fail("spec.boundary.public_contract_only", "must be true")
    if boundary["private_components_included"] is not False:
        _fail("spec.boundary.private_components_included", "must be false")
    if boundary["authoritative_backend"] not in {"none-fixture", "external"}:
        _fail(
            "spec.boundary.authoritative_backend",
            "must be none-fixture or external",
        )
    normalized_boundary = {
        "public_contract_only": True,
        "private_components_included": False,
        "authoritative_backend": boundary["authoritative_backend"],
    }
    authority_pair = (
        normalized_runtime["authority"],
        normalized_boundary["authoritative_backend"],
    )
    if authority_pair not in {
        ("local-fixture", "none-fixture"),
        ("external-contract", "external"),
    }:
        _fail(
            "spec.boundary.authoritative_backend",
            "must match runtime authority (local-fixture/none-fixture or "
            "external-contract/external)",
        )

    return {
        "schema_version": CONTRACT_VERSION,
        "project": normalized_project,
        "locales": locales,
        "world": normalized_world,
        "actors": actors,
        "items": items,
        "quest": normalized_quest,
        "gameplay": normalized_gameplay,
        "runtime": normalized_runtime,
        "boundary": normalized_boundary,
    }


def compile_spec(spec: Mapping[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    """Compile a validated spec into a manifest and reproducible evidence."""

    normalized = validate_and_normalize(spec)
    input_sha256 = _sha256(_canonical_bytes(normalized))
    manifest_core = {
        "contract_version": CONTRACT_VERSION,
        "compiled_by": COMPILER_ID,
        **normalized,
    }
    content_sha256 = _sha256(_canonical_bytes(manifest_core))
    manifest = {**manifest_core, "content_sha256": content_sha256}
    manifest_bytes = (
        json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    ).encode("utf-8")
    evidence = {
        "contract_version": CONTRACT_VERSION,
        "status": "pass",
        "input_sha256": input_sha256,
        "content_sha256": content_sha256,
        "manifest_sha256": _sha256(manifest_bytes),
        "checks": [
            "strict-schema",
            "localized-text-complete",
            "unique-identifiers",
            "references-resolved",
            "public-private-boundary",
            "deterministic-content-hash",
        ],
    }
    return manifest, evidence


def verify_manifest(manifest: Mapping[str, Any]) -> bool:
    """Return whether a manifest's embedded content hash is valid."""

    candidate = _require_mapping(manifest, "manifest")
    embedded = candidate.pop("content_sha256", None)
    return isinstance(embedded, str) and embedded == _sha256(_canonical_bytes(candidate))


def _load_json(path: Path) -> dict[str, Any]:
    try:
        loaded = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ContractError(f"unable to read {path}: {exc}") from exc
    return _require_mapping(loaded, str(path))


def _write_json(path: Path, value: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Compile a public StoryCore game specification"
    )
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args(argv)

    try:
        manifest, evidence = compile_spec(_load_json(args.input))
    except ContractError as exc:
        parser.error(str(exc))

    manifest_path = args.output_dir / "storycore_game_manifest.json"
    evidence_path = args.output_dir / "storycore_game_evidence.json"
    _write_json(manifest_path, manifest)
    _write_json(evidence_path, evidence)
    print(f"manifest={manifest_path}")
    print(f"evidence={evidence_path}")
    print(f"content_sha256={manifest['content_sha256']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
