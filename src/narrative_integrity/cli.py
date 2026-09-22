"""Command line entry point: inspect a file or a project payload, print JSON.

Style drift is only measured against an explicit reference. The subject is never used
as its own reference: that would be a self-referential measurement presented as a
style lock.

A findings ledger can be supplied so that observations a human already rejected or
acknowledged are not raised again as if they were new.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from .engine import NarrativeIntegrityEngine
from .input_model import IntegrityInput
from .llm_judge import DEFAULT_BASE_URL, DEFAULT_MODEL, LLMJudge, OllamaTransport
from .ledger import Decision, FindingsLedger
from .paths import PathRefused, resolve_read
from .provenance import build_provenance
from .style_profile import lock_profile, save_profile


class UsageError(ValueError):
    """The command line asks for something the engine will not guess at."""


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="narrative-integrity")
    parser.add_argument("path", help="prose file or JSON project payload")
    parser.add_argument("--strict", action="store_true", help="lower the guard threshold")
    parser.add_argument("--fold-homoglyphs", action="store_true", help="report folding only")
    parser.add_argument("--with-provenance", action="store_true")
    parser.add_argument("--profile", help="path to a JSON reference profile")
    parser.add_argument(
        "--reference",
        action="append",
        help="file used to build the reference profile; repeatable",
    )
    parser.add_argument(
        "--lock-profile", help="write the built reference profile to this path"
    )
    parser.add_argument("--project-id", default="unknown")
    parser.add_argument(
        "--judge",
        action="store_true",
        help="enable the qualitative judge against the local model",
    )
    parser.add_argument("--judge-model", default=DEFAULT_MODEL)
    parser.add_argument("--judge-base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--ledger", help="findings ledger to load and honour")
    parser.add_argument(
        "--decide",
        action="append",
        metavar="KEY=DECISION",
        help="record a decision for an arbitration key; repeatable",
    )
    parser.add_argument(
        "--decided-by", default="human", help="author of the --decide entries"
    )
    parser.add_argument(
        "--root",
        help=(
            "directory an operator-supplied path may live in "
            "(default: the working directory)"
        ),
    )
    return parser


def load_input(path: Path, project_id: str = "unknown") -> IntegrityInput:
    raw = path.read_text(encoding="utf-8", errors="replace")
    if path.suffix.lower() == ".json":
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            data = None
        if isinstance(data, dict):
            payload = IntegrityInput.from_project_dict(data)
            if not payload.project_id or payload.project_id == "unknown":
                payload.project_id = project_id
            payload.artifact = payload.artifact or str(path)
            return payload
    return IntegrityInput(project_id=project_id, artifact=str(path), text=raw)


def _judge(args) -> Optional[LLMJudge]:
    """The advisory judge, if the operator asked for one."""

    if not args.judge:
        return None
    judge = LLMJudge(
        OllamaTransport(model=args.judge_model, base_url=args.judge_base_url)
    )
    print(
        "note: the judge sends the inspected prose to "
        + args.judge_base_url
        + " with "
        + args.judge_model
        + "; nothing leaves this machine while that endpoint is local.",
        file=sys.stderr,
    )
    return judge


def _reference_profile(args, engine) -> Optional[Dict[str, Any]]:
    """An explicit profile wins; otherwise one is built from the --reference files."""

    if args.profile:
        profile_path = resolve_read(args.profile, root=args.root, label="profile")
        return json.loads(profile_path.read_text(encoding="utf-8"))
    if not args.reference:
        print(
            "note: no reference supplied, so style drift is not measured. "
            "Pass --reference FILE or --profile FILE to enable layer S.",
            file=sys.stderr,
        )
        return None

    reference_texts: List[str] = []
    reference_sources: List[str] = []
    for candidate in args.reference:
        reference_path = resolve_read(candidate, root=args.root, label="reference")
        reference_texts.append(
            reference_path.read_text(encoding="utf-8", errors="replace")
        )
        reference_sources.append(str(reference_path))
    return lock_profile(reference_texts, engine.thresholds, sources=reference_sources)


def _ledger(args) -> Optional[FindingsLedger]:
    """Load the ledger, apply the --decide entries, and write the result back."""

    if not args.ledger:
        if args.decide:
            raise UsageError(
                "--decide needs --ledger, so the decision has somewhere to live"
            )
        return None

    ledger = FindingsLedger.from_file(args.ledger, root=args.root)
    if not args.decide:
        return ledger
    for item in args.decide:
        decision = _parse_decision(item)
        key, _, _raw = item.partition("=")
        ledger.record_key(key.strip(), decision, decided_by=args.decided_by)
    written = ledger.save(root=args.root)
    print("ledger written: " + str(written), file=sys.stderr)
    return ledger


def _parse_decision(item: str) -> Decision:
    if "=" not in item:
        raise UsageError("expected KEY=DECISION, got: " + item)
    _key, _, raw_decision = item.partition("=")
    try:
        return Decision(raw_decision.strip().lower())
    except ValueError as error:
        raise UsageError("unknown decision: " + raw_decision) from error


def _inspect(args) -> int:
    """Run one inspection. Paths are confined before anything is read or written."""

    path = resolve_read(args.path, root=args.root, label="input")
    integrity_input = load_input(path, args.project_id)

    engine = NarrativeIntegrityEngine(judge=_judge(args))
    profile = _reference_profile(args, engine)
    if args.lock_profile and profile is not None:
        written = save_profile(profile, args.lock_profile, root=args.root)
        print("profile written: " + str(written), file=sys.stderr)

    report = engine.run(
        integrity_input,
        strict=args.strict,
        profile=profile,
        ledger=_ledger(args),
    )
    document = report.to_dict()
    if args.with_provenance:
        document["provenance"] = build_provenance(integrity_input, report)
    print(json.dumps(document, ensure_ascii=False, indent=2))
    return 0


def main(argv=None) -> int:
    args = _build_parser().parse_args(argv)
    try:
        return _inspect(args)
    except (PathRefused, UsageError) as refusal:
        print("refused: " + str(refusal), file=sys.stderr)
        return 2


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
