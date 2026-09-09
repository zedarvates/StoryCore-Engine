"""Deterministic audit of the committed Botte rule contract.

The audit is deliberately data-only: references are resolved inside the
project root and checked as exact text anchors.  It never executes a probe or
imports project code.  This makes it safe to run in preflight, CI and an
independent review workspace.
"""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path, PurePosixPath
from typing import Mapping


RULES_SCHEMA = "botte.rules-manifest/v1"
AUDIT_SCHEMA = "botte.rules-audit/v1"
DEFAULT_MANIFEST = ".botte/rules.json"

_RULE_FIELDS = frozenset(
    {
        "id",
        "action",
        "effect",
        "scope",
        "statement",
        "source_ref",
        "owner_only",
        "enforced",
        "enforcement_refs",
        "probes",
        "supersedes",
        "last_verified",
    }
)
_PROBE_FIELDS = frozenset({"id", "polarity", "evidence_ref"})
_VERIFICATION_FIELDS = frozenset({"at", "content_sha256", "evidence_ref"})
_ID_RE = re.compile(r"^[a-z0-9][a-z0-9._-]{2,127}$")
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
_EFFECTS = frozenset({"ALLOW", "DENY", "REQUIRE"})
_POLARITIES = frozenset({"allow", "deny"})


@dataclass(frozen=True)
class RuleFinding:
    severity: str
    code: str
    rule_id: str
    reference: str
    message: str
    fix_hint: str

    def to_dict(self) -> dict:
        return asdict(self)


def _canonical_sha256(value: object) -> str:
    raw = json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def rule_semantic_sha256(rule: Mapping) -> str:
    """Fingerprint the rule semantics, excluding its verification receipt."""
    semantic = {key: value for key, value in rule.items() if key != "last_verified"}
    return _canonical_sha256(semantic)


def _text(value: object, *, maximum: int = 512) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = value.strip()
    if not cleaned or len(cleaned) > maximum:
        return None
    return cleaned


def _strings(value: object, *, maximum: int = 256, limit: int = 100) -> list[str] | None:
    if not isinstance(value, list) or not value or len(value) > limit:
        return None
    result: list[str] = []
    for item in value:
        cleaned = _text(item, maximum=maximum)
        if cleaned is None:
            return None
        result.append(cleaned)
    if len(set(result)) != len(result):
        return None
    return result


def _valid_ref_shape(reference: str) -> bool:
    path_text, separator, anchor = reference.partition("#")
    if not separator or not path_text or not anchor:
        return False
    path = PurePosixPath(path_text)
    return (
        not path.is_absolute()
        and ".." not in path.parts
        and "\\" not in path_text
        and not any(ord(character) < 32 for character in reference)
        and len(reference) <= 512
    )


def _parse_rule(raw: object, index: int, findings: list[RuleFinding]) -> dict | None:
    fallback = f"index:{index}"
    if not isinstance(raw, dict):
        findings.append(RuleFinding(
            "error", "rule_not_object", fallback, DEFAULT_MANIFEST,
            "Rule entry must be an object.",
            "Replace the entry with a rules-manifest rule object.",
        ))
        return None

    candidate_id = _text(raw.get("id"), maximum=128)
    rule_id = (
        candidate_id
        if candidate_id is not None and _ID_RE.fullmatch(candidate_id)
        else fallback
    )
    valid = True
    unknown = sorted(set(raw) - _RULE_FIELDS)
    missing = sorted(_RULE_FIELDS - set(raw))
    if unknown or missing:
        valid = False
        details = []
        if missing:
            details.append("missing " + ", ".join(missing))
        if unknown:
            details.append("unknown " + ", ".join(unknown))
        findings.append(RuleFinding(
            "error", "rule_fields", rule_id, DEFAULT_MANIFEST,
            "Rule fields do not match the v1 contract: " + "; ".join(details) + ".",
            "Use only the fields declared by rules-manifest.schema.json.",
        ))

    if candidate_id is None or not _ID_RE.fullmatch(candidate_id):
        valid = False
        findings.append(RuleFinding(
            "error", "rule_id_invalid", rule_id, DEFAULT_MANIFEST,
            "Rule id must be a stable lowercase dotted identifier.",
            "Use 3-128 lowercase letters, digits, dots, underscores or hyphens.",
        ))

    action = _text(raw.get("action"), maximum=128)
    effect = _text(raw.get("effect"), maximum=16)
    scope = _strings(raw.get("scope"), maximum=128, limit=32)
    statement = _text(raw.get("statement"), maximum=1000)
    source_ref = _text(raw.get("source_ref"), maximum=512)
    supersedes = raw.get("supersedes")
    if not isinstance(supersedes, list) or len(supersedes) > 100:
        supersedes_list = None
    else:
        supersedes_list = []
        for item in supersedes:
            cleaned = _text(item, maximum=128)
            if cleaned is None or not _ID_RE.fullmatch(cleaned):
                supersedes_list = None
                break
            supersedes_list.append(cleaned)
        if supersedes_list is not None and len(set(supersedes_list)) != len(supersedes_list):
            supersedes_list = None

    scalar_checks = (
        (action is not None, "action_invalid", "action must be a non-empty string"),
        (effect in _EFFECTS, "effect_invalid", "effect must be ALLOW, DENY or REQUIRE"),
        (scope is not None, "scope_invalid", "scope must be a non-empty unique string list"),
        (statement is not None, "statement_invalid", "statement must be non-empty"),
        (source_ref is not None and _valid_ref_shape(source_ref),
         "source_ref_invalid", "source_ref must be a safe project-relative path#anchor"),
        (isinstance(raw.get("owner_only"), bool),
         "owner_only_invalid", "owner_only must be a boolean"),
        (isinstance(raw.get("enforced"), bool),
         "enforced_invalid", "enforced must be a boolean"),
        (supersedes_list is not None,
         "supersedes_invalid", "supersedes must be a unique rule-id list"),
    )
    for condition, code, message in scalar_checks:
        if condition:
            continue
        valid = False
        findings.append(RuleFinding(
            "error", code, rule_id, DEFAULT_MANIFEST, message + ".",
            "Correct this field in .botte/rules.json.",
        ))

    enforcement_raw = raw.get("enforcement_refs")
    if not isinstance(enforcement_raw, list) or len(enforcement_raw) > 100:
        enforcement_refs = None
    else:
        enforcement_refs = []
        for item in enforcement_raw:
            ref = _text(item, maximum=512)
            if ref is None or not _valid_ref_shape(ref):
                enforcement_refs = None
                break
            enforcement_refs.append(ref)
        if enforcement_refs is not None and len(set(enforcement_refs)) != len(enforcement_refs):
            enforcement_refs = None
    if enforcement_refs is None:
        valid = False
        findings.append(RuleFinding(
            "error", "enforcement_refs_invalid", rule_id, DEFAULT_MANIFEST,
            "enforcement_refs must be a unique list of safe path#anchor references.",
            "Point each enforced rule at its deterministic guard implementation.",
        ))

    probes_raw = raw.get("probes")
    probes: list[dict] | None = [] if isinstance(probes_raw, list) else None
    if probes is not None and len(probes_raw) > 100:
        probes = None
    if probes is not None:
        seen_probe_ids: set[str] = set()
        for probe in probes_raw:
            if not isinstance(probe, dict) or set(probe) != _PROBE_FIELDS:
                probes = None
                break
            probe_id = _text(probe.get("id"), maximum=128)
            polarity = _text(probe.get("polarity"), maximum=16)
            evidence_ref = _text(probe.get("evidence_ref"), maximum=512)
            if (
                probe_id is None
                or not _ID_RE.fullmatch(probe_id)
                or probe_id in seen_probe_ids
                or polarity not in _POLARITIES
                or evidence_ref is None
                or not _valid_ref_shape(evidence_ref)
            ):
                probes = None
                break
            seen_probe_ids.add(probe_id)
            probes.append({
                "id": probe_id,
                "polarity": polarity,
                "evidence_ref": evidence_ref,
            })
    if probes is None:
        valid = False
        findings.append(RuleFinding(
            "error", "probes_invalid", rule_id, DEFAULT_MANIFEST,
            "probes must contain unique typed allow/deny evidence references.",
            "Add deterministic positive and negative test anchors.",
        ))

    verified_raw = raw.get("last_verified")
    verified: dict | None = None
    if isinstance(verified_raw, dict) and set(verified_raw) == _VERIFICATION_FIELDS:
        at = _text(verified_raw.get("at"), maximum=64)
        digest = _text(verified_raw.get("content_sha256"), maximum=64)
        evidence_ref = _text(verified_raw.get("evidence_ref"), maximum=512)
        try:
            if at is None:
                raise ValueError
            parsed_at = datetime.fromisoformat(at.replace("Z", "+00:00"))
            timestamp_valid = "T" in at and parsed_at.tzinfo is not None
        except ValueError:
            timestamp_valid = False
        if (
            timestamp_valid
            and digest is not None
            and _SHA256_RE.fullmatch(digest)
            and evidence_ref is not None
            and _valid_ref_shape(evidence_ref)
        ):
            verified = {
                "at": at,
                "content_sha256": digest,
                "evidence_ref": evidence_ref,
            }
    if verified is None:
        valid = False
        findings.append(RuleFinding(
            "error", "last_verified_invalid", rule_id, DEFAULT_MANIFEST,
            "last_verified must bind an ISO timestamp, semantic SHA-256 and evidence ref.",
            "Re-audit the rule and record its semantic fingerprint and evidence anchor.",
        ))

    if not valid:
        return None
    return {
        "id": rule_id,
        "action": action,
        "effect": effect,
        "scope": scope,
        "statement": statement,
        "source_ref": source_ref,
        "owner_only": raw["owner_only"],
        "enforced": raw["enforced"],
        "enforcement_refs": enforcement_refs,
        "probes": probes,
        "supersedes": supersedes_list,
        "last_verified": verified,
    }


def _reference_error(root: Path, reference: str, cache: dict[str, str]) -> tuple[str, str] | None:
    if not _valid_ref_shape(reference):
        return "reference_invalid", "Reference must be a project-relative path#anchor."
    path_text, _, anchor = reference.partition("#")
    try:
        candidate = (root / path_text).resolve()
    except (OSError, RuntimeError):
        return "reference_unresolvable", "Referenced path cannot be resolved safely."
    try:
        candidate.relative_to(root)
    except ValueError:
        return "reference_escapes_root", "Reference resolves outside the project root."
    if not candidate.is_file():
        return "reference_missing", "Referenced file does not exist."
    if path_text not in cache:
        try:
            cache[path_text] = candidate.read_text(encoding="utf-8", errors="replace")
        except OSError:
            return "reference_unreadable", "Referenced file cannot be read."
    if anchor not in cache[path_text]:
        return "anchor_missing", "Exact evidence anchor is absent from the referenced file."
    return None


def _scope_overlap(left: list[str], right: list[str]) -> bool:
    return "*" in left or "*" in right or bool(set(left) & set(right))


def _cycle_nodes(graph: dict[str, list[str]]) -> set[str]:
    visiting: set[str] = set()
    visited: set[str] = set()
    cycles: set[str] = set()

    def visit(node: str, stack: list[str]) -> None:
        if node in visiting:
            start = stack.index(node)
            cycles.update(stack[start:])
            return
        if node in visited:
            return
        visiting.add(node)
        stack.append(node)
        for target in graph.get(node, []):
            if target in graph:
                visit(target, stack)
        stack.pop()
        visiting.remove(node)
        visited.add(node)

    for node in sorted(graph):
        visit(node, [])
    return cycles


def _report(*, root: Path, manifest_ref: str, present: bool,
            rules: list[dict], findings: list[RuleFinding]) -> dict:
    order = {"error": 0, "warning": 1, "info": 2}
    sorted_findings = sorted(
        findings,
        key=lambda item: (
            order.get(item.severity, 9), item.rule_id, item.code, item.reference
        ),
    )
    errors = sum(item.severity == "error" for item in sorted_findings)
    warnings = sum(item.severity == "warning" for item in sorted_findings)
    conflicts = sum(item.code == "rule_conflict" for item in sorted_findings)
    unenforced = sum(item.code.startswith("unenforced") for item in sorted_findings)
    stale = sum(item.code == "verification_stale" for item in sorted_findings)
    payload = {
        "schema": AUDIT_SCHEMA,
        "project_ref": root.name or ".",
        "manifest_ref": manifest_ref,
        "manifest_present": present,
        "score": max(0, 100 - errors * 15 - warnings * 5),
        "summary": {
            "rules": len(rules),
            "errors": errors,
            "warnings": warnings,
            "conflicts": conflicts,
            "unenforced": unenforced,
            "stale": stale,
        },
        "findings": [item.to_dict() for item in sorted_findings],
    }
    fingerprint_payload = {
        key: value for key, value in payload.items() if key != "project_ref"
    }
    payload["fingerprint"] = _canonical_sha256({
        "report": fingerprint_payload,
        "rules": sorted(rules, key=lambda rule: rule["id"]),
    })
    return payload


def audit_rules(project_root: str | Path = ".",
                manifest_ref: str = DEFAULT_MANIFEST) -> dict:
    """Audit the committed rule manifest without executing project code."""
    root = Path(project_root).resolve()
    findings: list[RuleFinding] = []
    if not _valid_ref_shape(manifest_ref + "#manifest"):
        findings.append(RuleFinding(
            "error", "manifest_ref_invalid", "manifest", manifest_ref,
            "Manifest path must be project-relative and remain inside the project.",
            "Use .botte/rules.json or another safe project-relative path.",
        ))
        return _report(
            root=root, manifest_ref=manifest_ref, present=False, rules=[], findings=findings
        )

    try:
        manifest_path = (root / manifest_ref).resolve()
    except (OSError, RuntimeError):
        findings.append(RuleFinding(
            "error", "manifest_unresolvable", "manifest", manifest_ref,
            "Manifest path cannot be resolved safely.",
            "Replace symlink loops or invalid path components with a regular project file.",
        ))
        return _report(
            root=root, manifest_ref=manifest_ref, present=False, rules=[], findings=findings
        )
    try:
        manifest_path.relative_to(root)
    except ValueError:
        findings.append(RuleFinding(
            "error", "manifest_escapes_root", "manifest", manifest_ref,
            "Manifest resolves outside the project root.",
            "Move it inside the project.",
        ))
        return _report(
            root=root, manifest_ref=manifest_ref, present=False, rules=[], findings=findings
        )
    if not manifest_path.is_file():
        return _report(
            root=root, manifest_ref=manifest_ref, present=False, rules=[], findings=[]
        )

    try:
        raw = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        findings.append(RuleFinding(
            "error", "manifest_invalid_json", "manifest", manifest_ref,
            f"Rule manifest is unreadable or invalid JSON: {type(exc).__name__}.",
            "Repair the JSON; do not infer or silently drop malformed rules.",
        ))
        return _report(
            root=root, manifest_ref=manifest_ref, present=True, rules=[], findings=findings
        )

    if not isinstance(raw, dict):
        findings.append(RuleFinding(
            "error", "manifest_not_object", "manifest", manifest_ref,
            "Rule manifest must be a JSON object.",
            "Use the rules-manifest/v1 top-level object.",
        ))
        return _report(
            root=root, manifest_ref=manifest_ref, present=True, rules=[], findings=findings
        )
    if set(raw) != {"schema", "rules"}:
        findings.append(RuleFinding(
            "error", "manifest_fields", "manifest", manifest_ref,
            "Top-level fields must be exactly schema and rules.",
            "Remove unknown fields and restore missing fields.",
        ))
    if raw.get("schema") != RULES_SCHEMA:
        findings.append(RuleFinding(
            "error", "manifest_schema", "manifest", manifest_ref,
            f"Unsupported rule schema; expected {RULES_SCHEMA}.",
            "Migrate the manifest explicitly before auditing it.",
        ))
    raw_rules = raw.get("rules")
    if not isinstance(raw_rules, list) or not raw_rules or len(raw_rules) > 1000:
        findings.append(RuleFinding(
            "error", "rules_invalid", "manifest", manifest_ref,
            "rules must contain 1-1000 rule objects.",
            "Add at least one bounded rule entry.",
        ))
        return _report(
            root=root, manifest_ref=manifest_ref, present=True, rules=[], findings=findings
        )

    rules = []
    for index, raw_rule in enumerate(raw_rules):
        parsed = _parse_rule(raw_rule, index, findings)
        if parsed is not None:
            rules.append(parsed)

    by_id: dict[str, dict] = {}
    for rule in rules:
        if rule["id"] in by_id:
            findings.append(RuleFinding(
                "error", "rule_id_duplicate", rule["id"], manifest_ref,
                "Rule id is duplicated.",
                "Keep one canonical rule or supersede it with a new unique id.",
            ))
        else:
            by_id[rule["id"]] = rule

    graph = {rule_id: list(rule["supersedes"]) for rule_id, rule in by_id.items()}
    for rule_id, targets in sorted(graph.items()):
        for target in targets:
            if target == rule_id:
                findings.append(RuleFinding(
                    "error", "supersedes_self", rule_id, manifest_ref,
                    "A rule cannot supersede itself.",
                    "Remove the self-reference.",
                ))
            elif target not in by_id:
                findings.append(RuleFinding(
                    "error", "supersedes_missing", rule_id, manifest_ref,
                    f"Superseded rule does not exist: {target}.",
                    "Restore the historical rule entry or remove this relation.",
                ))
    cycles = _cycle_nodes(graph)
    if cycles:
        joined = ", ".join(sorted(cycles))
        findings.append(RuleFinding(
            "error", "supersedes_cycle", joined, manifest_ref,
            f"Supersession graph contains a cycle: {joined}.",
            "Make supersession acyclic and point only from newer to older rules.",
        ))

    cache: dict[str, str] = {}
    for rule in rules:
        rule_id = rule["id"]
        references = [("source", rule["source_ref"])]
        references.extend(("enforcement", ref) for ref in rule["enforcement_refs"])
        references.extend(("probe", probe["evidence_ref"]) for probe in rule["probes"])
        references.append(("verification", rule["last_verified"]["evidence_ref"]))
        for kind, reference in references:
            problem = _reference_error(root, reference, cache)
            if problem is None:
                continue
            code, message = problem
            findings.append(RuleFinding(
                "error", f"{kind}_{code}", rule_id, reference,
                message,
                "Restore the exact anchor or update this reference and re-verify the rule.",
            ))

        source_path, _, _ = rule["source_ref"].partition("#")
        if source_path in cache and rule["statement"] not in cache[source_path]:
            findings.append(RuleFinding(
                "error", "semantic_statement_drift", rule_id, rule["source_ref"],
                "Canonical rule statement no longer appears verbatim in its source.",
                "Reconcile policy and manifest, then update the smallest changed statement.",
            ))

        if not rule["enforced"]:
            findings.append(RuleFinding(
                "warning", "unenforced_rule", rule_id, rule["source_ref"],
                "Rule is documentary only and has no declared deterministic guard.",
                "Add a guard plus positive and negative probes before relying on it.",
            ))
        else:
            if not rule["enforcement_refs"]:
                findings.append(RuleFinding(
                    "error", "unenforced_missing_guard", rule_id, manifest_ref,
                    "Enforced rule declares no guard reference.",
                    "Add at least one exact enforcement path#anchor.",
                ))
            polarities = {probe["polarity"] for probe in rule["probes"]}
            missing_polarities = sorted(_POLARITIES - polarities)
            if missing_polarities:
                findings.append(RuleFinding(
                    "error", "unenforced_missing_probe", rule_id, manifest_ref,
                    "Enforced rule lacks probe polarity: " + ", ".join(missing_polarities) + ".",
                    "Add one allow and one deny deterministic test anchor.",
                ))

        expected = rule_semantic_sha256(rule)
        if rule["last_verified"]["content_sha256"] != expected:
            findings.append(RuleFinding(
                "error", "verification_stale", rule_id,
                rule["last_verified"]["evidence_ref"],
                "Rule semantics changed after the last verification receipt.",
                f"Re-run review and replace content_sha256 with {expected}.",
            ))

    superseded = {target for targets in graph.values() for target in targets}
    active = [rule for rule in rules if rule["id"] not in superseded]
    for index, left in enumerate(active):
        for right in active[index + 1:]:
            if (
                left["action"] == right["action"]
                and left["effect"] != right["effect"]
                and _scope_overlap(left["scope"], right["scope"])
            ):
                pair = f"{left['id']}|{right['id']}"
                findings.append(RuleFinding(
                    "error", "rule_conflict", pair, manifest_ref,
                    "Active rules assign contradictory effects to overlapping action scope.",
                    "Narrow one scope or explicitly supersede the obsolete rule.",
                ))

    return _report(
        root=root,
        manifest_ref=manifest_ref,
        present=True,
        rules=rules,
        findings=findings,
    )


__all__ = [
    "AUDIT_SCHEMA",
    "DEFAULT_MANIFEST",
    "RULES_SCHEMA",
    "RuleFinding",
    "audit_rules",
    "rule_semantic_sha256",
]
