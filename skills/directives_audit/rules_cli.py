"""CLI for the deterministic committed-rule audit.

    botte rules audit [project] [--json]
"""

from __future__ import annotations

import argparse
import json
import sys

from skills.console_utf8 import force_utf8
from skills.directives_audit.rules import DEFAULT_MANIFEST, audit_rules


_ICONS = {"error": "ERROR", "warning": "WARN", "info": "INFO"}


def main(argv=None) -> int:
    force_utf8()
    parser = argparse.ArgumentParser(prog="botte rules", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    audit_parser = sub.add_parser(
        "audit", help="verify rule sources, guards, probes and contradictions"
    )
    audit_parser.add_argument("project", nargs="?", default=".")
    audit_parser.add_argument(
        "--manifest", default=DEFAULT_MANIFEST,
        help="project-relative rule manifest path",
    )
    audit_parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)

    report = audit_rules(args.project, args.manifest)
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        summary = report["summary"]
        print(f"Rules audit — {report['project_ref']}")
        if not report["manifest_present"]:
            print(f"  No committed manifest at {report['manifest_ref']}")
        else:
            print(
                f"  Score {report['score']}/100 · {summary['rules']} rules · "
                f"{summary['errors']} errors · {summary['warnings']} warnings"
            )
        for finding in report["findings"]:
            print(
                f"  [{_ICONS.get(finding['severity'], finding['severity'].upper())}] "
                f"{finding['rule_id']} {finding['code']}: {finding['message']}"
            )
            print(f"    {finding['fix_hint']}")

    if not report["manifest_present"]:
        return 2
    return 1 if report["summary"]["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
