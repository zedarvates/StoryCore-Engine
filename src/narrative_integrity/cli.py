"""Command line entry point: inspect a file or a project payload, print JSON."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .engine import NarrativeIntegrityEngine
from .input_model import IntegrityInput
from .provenance import build_provenance
from .style_profile import build_profile


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="narrative-integrity")
    parser.add_argument("path", help="prose file or JSON project payload")
    parser.add_argument("--strict", action="store_true", help="lower the guard threshold")
    parser.add_argument("--fold-homoglyphs", action="store_true", help="report folding only")
    parser.add_argument("--with-provenance", action="store_true")
    parser.add_argument("--profile", help="path to a JSON reference profile")
    parser.add_argument("--project-id", default="unknown")
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
    elif integrity_input.text:
        profile = build_profile([integrity_input.text], engine.thresholds)

    report = engine.run(integrity_input, strict=args.strict, profile=profile)
    document = report.to_dict()
    if args.with_provenance:
        document["provenance"] = build_provenance(integrity_input, report)
    print(json.dumps(document, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
