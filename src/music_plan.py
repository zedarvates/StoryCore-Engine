"""Provider-neutral MusicPlan v1 validation helpers.

Validation is model-free but uses the repository's existing ``jsonschema``
dependency for Draft 2020-12 structural checks, then applies StoryCore-specific
cross-field and commercial-use invariants.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

NON_COMMERCIAL_MARKERS = ("CC BY-NC", "BY-NC", "NON-COMMERCIAL", "NONCOMMERCIAL")
UNKNOWN_LICENSE_MARKERS = frozenset({"unknown", "unspecified", "unqualified", "tbd", "n/a", "none"})
DEFAULT_SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schemas" / "music-plan-v1.schema.json"


@dataclass(frozen=True)
class MusicPlanValidation:
    valid: bool
    errors: tuple[str, ...]
    warnings: tuple[str, ...] = ()


def _is_non_commercial(license_name: str) -> bool:
    upper = license_name.upper().replace("_", "-")
    return any(marker in upper for marker in NON_COMMERCIAL_MARKERS)


def _is_unknown_license(license_name: str) -> bool:
    return license_name.strip().lower() in UNKNOWN_LICENSE_MARKERS


def _schema_errors(plan: dict[str, Any], schema_path: Path = DEFAULT_SCHEMA_PATH) -> list[str]:
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema)
    errors: list[str] = []
    for issue in sorted(validator.iter_errors(plan), key=lambda item: list(item.absolute_path)):
        path = ".".join(str(part) for part in issue.absolute_path) or "$"
        errors.append(f"schema:{path}: {issue.message}")
    return errors


def validate_music_plan(plan: dict[str, Any]) -> MusicPlanValidation:
    """Validate MusicPlan structure and deterministic invariants without a model."""
    errors: list[str] = _schema_errors(plan)
    warnings: list[str] = []

    if plan.get("schema_version") != 1:
        errors.append("schema_version must be 1")
    if plan.get("mode") not in {"full", "guided", "free"}:
        errors.append("mode must be full, guided, or free")

    duration = plan.get("duration_seconds")
    if not isinstance(duration, (int, float)) or isinstance(duration, bool) or duration <= 0:
        errors.append("duration_seconds must be a positive number")
        duration = None

    sections = plan.get("sections")
    if not isinstance(sections, list) or not sections:
        errors.append("sections must be a non-empty list")
        sections = []

    section_ids: set[str] = set()
    motif_refs: set[str] = set()
    previous_end = 0.0
    for index, section in enumerate(sections):
        if not isinstance(section, dict):
            errors.append(f"sections[{index}] must be an object")
            continue
        sid = section.get("id")
        if not isinstance(sid, str) or not sid:
            errors.append(f"sections[{index}].id must be non-empty")
        elif sid in section_ids:
            errors.append(f"duplicate section id: {sid}")
        else:
            section_ids.add(sid)
        start = section.get("start_seconds")
        end = section.get("end_seconds")
        if not isinstance(start, (int, float)) or isinstance(start, bool):
            errors.append(f"sections[{index}].start_seconds must be numeric")
            continue
        if not isinstance(end, (int, float)) or isinstance(end, bool):
            errors.append(f"sections[{index}].end_seconds must be numeric")
            continue
        if start < 0 or end <= start:
            errors.append(f"sections[{index}] has invalid time bounds")
        if start < previous_end:
            errors.append(f"sections[{index}] overlaps the preceding section")
        previous_end = max(previous_end, float(end))
        if duration is not None and end > duration:
            errors.append(f"sections[{index}] exceeds duration_seconds")
        refs = section.get("motif_refs", [])
        if isinstance(refs, list):
            motif_refs.update(ref for ref in refs if isinstance(ref, str))

    motifs = plan.get("motifs", [])
    motif_ids: set[str] = set()
    if isinstance(motifs, list):
        for index, motif in enumerate(motifs):
            if not isinstance(motif, dict):
                errors.append(f"motifs[{index}] must be an object")
                continue
            mid = motif.get("id")
            if not isinstance(mid, str) or not mid:
                errors.append(f"motifs[{index}].id must be non-empty")
            elif mid in motif_ids:
                errors.append(f"duplicate motif id: {mid}")
            else:
                motif_ids.add(mid)
    unresolved = sorted(motif_refs - motif_ids)
    if unresolved:
        errors.append("unresolved motif_refs: " + ", ".join(unresolved))

    cues = plan.get("sync_cues")
    if not isinstance(cues, list):
        errors.append("sync_cues must be a list")
        cues = []
    cue_ids: set[str] = set()
    for index, cue in enumerate(cues):
        if not isinstance(cue, dict):
            errors.append(f"sync_cues[{index}] must be an object")
            continue
        cid = cue.get("id")
        if not isinstance(cid, str) or not cid:
            errors.append(f"sync_cues[{index}].id must be non-empty")
        elif cid in cue_ids:
            errors.append(f"duplicate sync cue id: {cid}")
        else:
            cue_ids.add(cid)
        time_seconds = cue.get("time_seconds")
        if not isinstance(time_seconds, (int, float)) or isinstance(time_seconds, bool) or time_seconds < 0:
            errors.append(f"sync_cues[{index}].time_seconds must be non-negative")
        elif duration is not None and time_seconds > duration:
            errors.append(f"sync_cues[{index}] exceeds duration_seconds")

    provenance = plan.get("provenance")
    if not isinstance(provenance, dict):
        errors.append("provenance must be an object")
    else:
        commercial = provenance.get("commercial_target")
        if not isinstance(commercial, bool):
            errors.append("provenance.commercial_target must be boolean")
        dependencies = provenance.get("dependencies")
        if not isinstance(dependencies, list):
            errors.append("provenance.dependencies must be a list")
        else:
            for index, dep in enumerate(dependencies):
                if not isinstance(dep, dict):
                    errors.append(f"provenance.dependencies[{index}] must be an object")
                    continue
                license_name = dep.get("license")
                if not isinstance(license_name, str) or not license_name.strip():
                    errors.append(f"provenance.dependencies[{index}].license is required")
                    continue
                if commercial and dep.get("kind") == "model-weights":
                    name = dep.get("name", index)
                    if _is_unknown_license(license_name):
                        errors.append(
                            f"commercial target cannot use model weights with unknown licence: {name}"
                        )
                    elif _is_non_commercial(license_name):
                        errors.append(
                            f"commercial target cannot use non-commercial model weights: {name}"
                        )

    mode = plan.get("mode")
    if mode == "full" and not motifs:
        warnings.append("full mode has no symbolic motifs")
    if mode == "free" and motifs:
        warnings.append("free mode carries motifs that a provider may intentionally ignore")

    return MusicPlanValidation(not errors, tuple(errors), tuple(warnings))


def _diff_values(requested: Any, executed: Any, path: str, deltas: list[str]) -> None:
    if isinstance(requested, dict) and isinstance(executed, dict):
        requested_keys = set(requested)
        executed_keys = set(executed)
        for key in sorted(requested_keys - executed_keys):
            child = f"{path}.{key}" if path else key
            if child not in {"schema_version", "plan_id", "provenance"}:
                deltas.append(f"dropped:{child}")
        for key in sorted(executed_keys - requested_keys):
            child = f"{path}.{key}" if path else key
            deltas.append(f"added:{child}")
        for key in sorted(requested_keys & executed_keys):
            child = f"{path}.{key}" if path else key
            if child == "mode":
                continue
            _diff_values(requested[key], executed[key], child, deltas)
        return

    if isinstance(requested, list) and isinstance(executed, list):
        if len(requested) != len(executed):
            deltas.append(f"changed:{path}.length")
        for index, (left, right) in enumerate(zip(requested, executed)):
            _diff_values(left, right, f"{path}[{index}]", deltas)
        return

    if requested != executed:
        deltas.append(f"changed:{path}")


def execution_delta(requested: dict[str, Any], executed: dict[str, Any]) -> tuple[str, ...]:
    """Return material provider changes, including nested and value-level deltas."""
    deltas: list[str] = []
    if requested.get("mode") != executed.get("mode"):
        deltas.append(f"mode:{requested.get('mode')}->{executed.get('mode')}")
    _diff_values(requested, executed, "", deltas)
    return tuple(dict.fromkeys(deltas))
