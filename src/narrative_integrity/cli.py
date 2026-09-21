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

from .engine import NarrativeIntegrityEngine
from .input_model import IntegrityInput
from .ledger import Decision, FindingsLedger
from .provenance import build_provenance
from .style_profile import lock_profile, save_profile


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


def main(argv=None) -> int:
    args = _build_parser().parse_args(argv)
    path = Path(args.path)
    if not path.exists():
        print("not found: " + str(path), file=sys.stderr)
        return 2

    integrity_input = load_input(path, args.project_id)
    engine = NarrativeIntegrityEngine()
    profile = None
    if args.profile:
        profile = json.loads(Path(args.profile).read_text(encoding="utf-8"))
    elif args.reference:
        reference_texts = []
        reference_sources = []
        for candidate in args.reference:
            reference_path = Path(candidate)
            if not reference_path.exists():
                print("reference not found: " + str(reference_path), file=sys.stderr)
                return 2
            reference_texts.append(
                reference_path.read_text(encoding="utf-8", errors="replace")
            )
            reference_sources.append(str(reference_path))
        profile = lock_profile(
            reference_texts, engine.thresholds, sources=reference_sources
        )
    else:
        print(
            "note: no reference supplied, so style drift is not measured. "
            "Pass --reference FILE or --profile FILE to enable layer S.",
            file=sys.stderr,
        )

    if args.lock_profile and profile is not None:
        written = save_profile(profile, args.lock_profile)
        print("profile written: " + str(written), file=sys.stderr)

    ledger = None
    if args.ledger:
        ledger = FindingsLedger.from_file(args.ledger)
    if args.decide:
        if ledger is None:
            print(
                "--decide needs --ledger, so the decision has somewhere to live",
                file=sys.stderr,
            )
            return 2
        for item in args.decide:
            if "=" not in item:
                print("expected KEY=DECISION, got: " + item, file=sys.stderr)
                return 2
            key, _, raw_decision = item.partition("=")
            try:
                decision = Decision(raw_decision.strip().lower())
            except ValueError:
                print("unknown decision: " + raw_decision, file=sys.stderr)
                return 2
            ledger.record_key(key.strip(), decision, decided_by=args.decided_by)
        written = ledger.save()
        print("ledger written: " + str(written), file=sys.stderr)

    report = engine.run(
        integrity_input, strict=args.strict, profile=profile, ledger=ledger
    )
    document = report.to_dict()
    if args.with_provenance:
        document["provenance"] = build_provenance(integrity_input, report)
    print(json.dumps(document, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
