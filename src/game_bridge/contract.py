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
import os
import re
from pathlib import Path
from typing import Any, Mapping, Sequence

CONTRACT_VERSION = "0.1"
COMPILER_ID = "storycore-game-bridge/0.1"

_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_-]*$")
_LOCALE_PATTERN = re.compile(r"^[a-z]{2}(?:-[A-Z]{2})?$")
_GODOT_VERSION_PATTERN = re.compile(r"^4\.\d+(?:\.\d+)?$")
_CLI_RELATIVE_PATH_PATTERN = re.compile(r"^[A-Za-z0-9._/-]+$")
_ACTORS_PATH = "spec.actors"
_ITEMS_PATH = "spec.items"
_OBJECTIVES_PATH = "spec.quest.objectives"
_ENTRY_SCENE_PATH = "spec.runtime.entry_scene"


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


def _normalize_locales(value: Any) -> list[str]:
    path = "spec.locales"
    raw_locales = _require_sequence(value, path)
    if not raw_locales:
        _fail(path, "must contain at least one locale")
    locales: list[str] = []
    for index, raw_locale in enumerate(raw_locales):
        entry_path = f"{path}[{index}]"
        if not isinstance(raw_locale, str) or not _LOCALE_PATTERN.fullmatch(raw_locale):
            _fail(entry_path, "must be a supported locale code")
        if raw_locale in locales:
            _fail(entry_path, f"duplicate locale: {raw_locale}")
        locales.append(raw_locale)
    return locales


def _normalize_project(value: Any, locales: list[str]) -> dict[str, Any]:
    path = "spec.project"
    project = _require_mapping(value, path)
    _require_exact_keys(project, {"id", "title", "summary", "license"}, path)
    if project["license"] != "MIT":
        _fail(f"{path}.license", "public StoryCore fixtures must use MIT")
    return {
        "id": _require_id(project["id"], f"{path}.id"),
        "title": _localized_text(project["title"], locales, f"{path}.title"),
        "summary": _localized_text(project["summary"], locales, f"{path}.summary"),
        "license": "MIT",
    }


def _normalize_world(value: Any, locales: list[str]) -> dict[str, Any]:
    path = "spec.world"
    world = _require_mapping(value, path)
    _require_exact_keys(world, {"id", "title", "biome"}, path)
    return {
        "id": _require_id(world["id"], f"{path}.id"),
        "title": _localized_text(world["title"], locales, f"{path}.title"),
        "biome": _require_id(world["biome"], f"{path}.biome"),
    }


def _normalize_actor(value: Any, index: int, locales: list[str]) -> dict[str, Any]:
    path = f"{_ACTORS_PATH}[{index}]"
    actor = _require_mapping(value, path)
    _require_exact_keys(actor, {"id", "name", "role", "dialogue"}, path)
    return {
        "id": _require_id(actor["id"], f"{path}.id"),
        "name": _localized_text(actor["name"], locales, f"{path}.name"),
        "role": _require_id(actor["role"], f"{path}.role"),
        "dialogue": _localized_dialogue(
            actor["dialogue"], locales, f"{path}.dialogue"
        ),
    }


def _normalize_actors(value: Any, locales: list[str]) -> list[dict[str, Any]]:
    raw_actors = _require_sequence(value, _ACTORS_PATH)
    if not raw_actors:
        _fail(_ACTORS_PATH, "must contain at least one actor")
    actors = [
        _normalize_actor(raw_actor, index, locales)
        for index, raw_actor in enumerate(raw_actors)
    ]
    _unique_ids(actors, _ACTORS_PATH)
    return actors


def _normalize_item(value: Any, index: int, locales: list[str]) -> dict[str, Any]:
    path = f"{_ITEMS_PATH}[{index}]"
    item = _require_mapping(value, path)
    _require_exact_keys(item, {"id", "name", "score"}, path)
    return {
        "id": _require_id(item["id"], f"{path}.id"),
        "name": _localized_text(item["name"], locales, f"{path}.name"),
        "score": _require_non_negative_int(item["score"], f"{path}.score"),
    }


def _normalize_items(
    value: Any, locales: list[str]
) -> tuple[list[dict[str, Any]], set[str]]:
    raw_items = _require_sequence(value, _ITEMS_PATH)
    if not raw_items:
        _fail(_ITEMS_PATH, "must contain at least one item")
    items = [
        _normalize_item(raw_item, index, locales)
        for index, raw_item in enumerate(raw_items)
    ]
    return items, _unique_ids(items, _ITEMS_PATH)


def _normalize_objective(
    value: Any, index: int, item_ids: set[str]
) -> dict[str, Any]:
    path = f"{_OBJECTIVES_PATH}[{index}]"
    objective = _require_mapping(value, path)
    _require_exact_keys(
        objective, {"id", "kind", "target_id", "required_count"}, path
    )
    if objective["kind"] != "collect":
        _fail(f"{path}.kind", "v0.1 supports only the collect objective")
    target_id = _require_id(objective["target_id"], f"{path}.target_id")
    if target_id not in item_ids:
        _fail(f"{path}.target_id", f"unresolved item reference: {target_id}")
    return {
        "id": _require_id(objective["id"], f"{path}.id"),
        "kind": "collect",
        "target_id": target_id,
        "required_count": _require_positive_int(
            objective["required_count"], f"{path}.required_count"
        ),
    }


def _normalize_reward(value: Any, index: int, item_ids: set[str]) -> dict[str, Any]:
    path = f"spec.quest.rewards[{index}]"
    reward = _require_mapping(value, path)
    _require_exact_keys(reward, {"item_id", "count"}, path)
    item_id = _require_id(reward["item_id"], f"{path}.item_id")
    if item_id not in item_ids:
        _fail(f"{path}.item_id", f"unresolved item reference: {item_id}")
    return {
        "item_id": item_id,
        "count": _require_positive_int(reward["count"], f"{path}.count"),
    }


def _normalize_quest(
    value: Any, locales: list[str], item_ids: set[str]
) -> dict[str, Any]:
    path = "spec.quest"
    quest = _require_mapping(value, path)
    _require_exact_keys(quest, {"id", "title", "objectives", "rewards"}, path)
    raw_objectives = _require_sequence(quest["objectives"], _OBJECTIVES_PATH)
    if not raw_objectives:
        _fail(_OBJECTIVES_PATH, "must contain at least one objective")
    objectives = [
        _normalize_objective(raw_objective, index, item_ids)
        for index, raw_objective in enumerate(raw_objectives)
    ]
    _unique_ids(objectives, _OBJECTIVES_PATH)
    raw_rewards = _require_sequence(quest["rewards"], f"{path}.rewards")
    rewards = [
        _normalize_reward(raw_reward, index, item_ids)
        for index, raw_reward in enumerate(raw_rewards)
    ]
    return {
        "id": _require_id(quest["id"], f"{path}.id"),
        "title": _localized_text(quest["title"], locales, f"{path}.title"),
        "objectives": objectives,
        "rewards": rewards,
    }


def _normalize_gameplay(value: Any) -> dict[str, Any]:
    path = "spec.gameplay"
    bins_path = f"{path}.score_bins"
    gameplay = _require_mapping(value, path)
    _require_exact_keys(
        gameplay, {"drop_limit", "score_target", "board_seed", "score_bins"}, path
    )
    raw_bins = _require_sequence(gameplay["score_bins"], bins_path)
    if len(raw_bins) < 3:
        _fail(bins_path, "must contain at least three bins")
    score_bins = [
        _require_positive_int(bin_score, f"{bins_path}[{index}]")
        for index, bin_score in enumerate(raw_bins)
    ]
    return {
        "drop_limit": _require_positive_int(
            gameplay["drop_limit"], f"{path}.drop_limit"
        ),
        "score_target": _require_positive_int(
            gameplay["score_target"], f"{path}.score_target"
        ),
        "board_seed": _require_non_negative_int(
            gameplay["board_seed"], f"{path}.board_seed"
        ),
        "score_bins": score_bins,
    }


def _normalize_runtime(value: Any) -> dict[str, Any]:
    path = "spec.runtime"
    runtime = _require_mapping(value, path)
    _require_exact_keys(
        runtime, {"engine", "minimum_version", "entry_scene", "authority"}, path
    )
    if runtime["engine"] != "godot":
        _fail(f"{path}.engine", "v0.1 supports only godot")
    if runtime["authority"] not in {"local-fixture", "external-contract"}:
        _fail(f"{path}.authority", "must be local-fixture or external-contract")
    entry_scene = _require_non_empty_string(runtime["entry_scene"], _ENTRY_SCENE_PATH)
    if not entry_scene.startswith("res://"):
        _fail(_ENTRY_SCENE_PATH, "must be a res:// path")
    if ".." in Path(entry_scene.removeprefix("res://")).parts:
        _fail(_ENTRY_SCENE_PATH, "must not traverse outside res://")
    if not entry_scene.endswith(".tscn"):
        _fail(_ENTRY_SCENE_PATH, "must reference a .tscn scene")
    version_path = f"{path}.minimum_version"
    minimum_version = _require_non_empty_string(
        runtime["minimum_version"], version_path
    )
    if not _GODOT_VERSION_PATTERN.fullmatch(minimum_version):
        _fail(version_path, "must be a Godot 4 version such as 4.2 or 4.2.1")
    return {
        "engine": "godot",
        "minimum_version": minimum_version,
        "entry_scene": entry_scene,
        "authority": runtime["authority"],
    }


def _normalize_boundary(value: Any, runtime_authority: str) -> dict[str, Any]:
    path = "spec.boundary"
    backend_path = f"{path}.authoritative_backend"
    boundary = _require_mapping(value, path)
    _require_exact_keys(
        boundary,
        {
            "public_contract_only",
            "private_components_included",
            "authoritative_backend",
        },
        path,
    )
    if boundary["public_contract_only"] is not True:
        _fail(f"{path}.public_contract_only", "must be true")
    if boundary["private_components_included"] is not False:
        _fail(f"{path}.private_components_included", "must be false")
    backend = boundary["authoritative_backend"]
    if backend not in {"none-fixture", "external"}:
        _fail(backend_path, "must be none-fixture or external")
    if (runtime_authority, backend) not in {
        ("local-fixture", "none-fixture"),
        ("external-contract", "external"),
    }:
        _fail(
            backend_path,
            "must match runtime authority (local-fixture/none-fixture or "
            "external-contract/external)",
        )
    return {
        "public_contract_only": True,
        "private_components_included": False,
        "authoritative_backend": backend,
    }


def validate_and_normalize(spec: Mapping[str, Any]) -> dict[str, Any]:
    """Validate an interchange specification and return normalized data.

    Validation is deliberately strict. Unknown fields, unresolved references,
    partial localizations, and attempts to include private components are
    rejected rather than guessed or silently discarded.
    """

    root = _require_mapping(spec, "spec")
    _require_exact_keys(
        root,
        {
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
        },
        "spec",
    )
    if root["schema_version"] != CONTRACT_VERSION:
        _fail(
            "spec.schema_version",
            f"expected {CONTRACT_VERSION!r}, got {root['schema_version']!r}",
        )

    locales = _normalize_locales(root["locales"])
    items, item_ids = _normalize_items(root["items"], locales)
    runtime = _normalize_runtime(root["runtime"])
    return {
        "schema_version": CONTRACT_VERSION,
        "project": _normalize_project(root["project"], locales),
        "locales": locales,
        "world": _normalize_world(root["world"], locales),
        "actors": _normalize_actors(root["actors"], locales),
        "items": items,
        "quest": _normalize_quest(root["quest"], locales, item_ids),
        "gameplay": _normalize_gameplay(root["gameplay"]),
        "runtime": runtime,
        "boundary": _normalize_boundary(root["boundary"], runtime["authority"]),
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
    return isinstance(embedded, str) and embedded == _sha256(
        _canonical_bytes(candidate)
    )


def _require_relative_cli_path(value: str, label: str) -> Path:
    """Accept only an allowlisted workspace-relative CLI path."""

    if not value or not _CLI_RELATIVE_PATH_PATTERN.fullmatch(value):
        _fail(label, "must be an allowlisted workspace-relative path")
    candidate = Path(value)
    if candidate.is_absolute() or ".." in candidate.parts:
        _fail(label, "must be an allowlisted workspace-relative path")
    return candidate


def _resolve_workspace_path(
    candidate: Path,
    workspace_root: Path,
    label: str,
    *,
    must_be_file: bool = False,
    must_be_dir: bool = False,
) -> Path:
    """Resolve a validated relative path without allowing symlink escape."""

    try:
        root = workspace_root.resolve(strict=True)
        resolved = (root / candidate).resolve(strict=True)
        relative = resolved.relative_to(root)
    except (OSError, RuntimeError, ValueError) as exc:
        raise ContractError(
            f"{label}: must stay within workspace root {workspace_root}"
        ) from exc
    if not root.is_dir():
        _fail("workspace", "root must be a directory")
    if must_be_file and not resolved.is_file():
        _fail(label, "must reference an existing regular file")
    if must_be_dir and not resolved.is_dir():
        _fail(label, "must reference an existing directory")
    return root.joinpath(relative)


def _load_json(path: Path) -> dict[str, Any]:
    try:
        loaded = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ContractError(f"unable to read {path}: {exc}") from exc
    return _require_mapping(loaded, str(path))


def _write_json(path: Path, value: Mapping[str, Any]) -> None:
    """Write a fixed-name output without following a final-component symlink."""

    if path.is_symlink():
        _fail(str(path), "refuses to replace a symbolic link")
    flags = os.O_WRONLY | os.O_CREAT | os.O_TRUNC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    descriptor: int | None = None
    try:
        descriptor = os.open(path, flags, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            descriptor = None
            handle.write(
                json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2)
                + "\n"
            )
    except OSError as exc:
        raise ContractError(f"unable to write {path}: {exc}") from exc
    finally:
        if descriptor is not None:
            os.close(descriptor)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Compile a public StoryCore game specification"
    )
    parser.add_argument("--input", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args(argv)

    try:
        workspace_root = Path.cwd().resolve(strict=True)
        input_relative = _require_relative_cli_path(args.input, "--input")
        output_relative = _require_relative_cli_path(
            args.output_dir, "--output-dir"
        )
        input_path = _resolve_workspace_path(
            input_relative, workspace_root, "--input", must_be_file=True
        )
        output_dir = _resolve_workspace_path(
            output_relative,
            workspace_root,
            "--output-dir",
            must_be_dir=True,
        )
        # Output filenames are constants, never user-controlled components.
        manifest_path = output_dir / "storycore_game_manifest.json"
        evidence_path = output_dir / "storycore_game_evidence.json"
        manifest, evidence = compile_spec(_load_json(input_path))
        _write_json(manifest_path, manifest)
        _write_json(evidence_path, evidence)
    except ContractError as exc:
        parser.error(str(exc))

    print(f"manifest={manifest_path}")
    print(f"evidence={evidence_path}")
    print(f"content_sha256={manifest['content_sha256']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
