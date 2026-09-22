"""The immune response: observe and propose, never write.

The matrix lives in the settings file, so a policy change is a data change. No code
path in this package writes to a canonical artifact.
"""

from __future__ import annotations

from typing import Any, Dict, List

from .findings import Finding, IntegrityReport
from .taxonomy import Action, Severity, severity_rank

SILENT_WRITE_FORBIDDEN = True


def response_for(finding: Finding, thresholds) -> Dict[str, Any]:
    policy = thresholds.section("immune_policy").get(finding.severity.value, {})
    action = str(policy.get("action", "observe"))
    arbitrated = finding.arbitrated()
    requires = bool(policy.get("requires_confirmation", False)) and not arbitrated
    proposes = action in ("propose", "block_promotion")
    return {
        "finding_id": finding.finding_id,
        "layer": finding.layer.value,
        "severity": finding.severity.value,
        "action": action,
        "requires_confirmation": requires,
        "applied": False,
        "proposal": finding.remediation if proposes and not arbitrated else None,
        "arbitrated": arbitrated,
        "arbitration": finding.arbitration,
        "note": (
            "Already decided by a human: not raised again."
            if arbitrated
            else "Proposal only. Promotion to canon stays a human decision."
        ),
    }


def remediations(report: IntegrityReport, thresholds) -> List[Dict[str, Any]]:
    ordered = sorted(
        report.findings,
        key=lambda f: (-severity_rank(f.severity), f.detector_id, f.locus, f.finding_id),
    )
    return [response_for(finding, thresholds) for finding in ordered]


def summarize(report: IntegrityReport, thresholds) -> Dict[str, Any]:
    responses = remediations(report, thresholds)
    by_action: Dict[str, int] = {}
    by_severity: Dict[str, int] = {}
    by_decision: Dict[str, int] = {}
    for response in responses:
        by_action[response["action"]] = by_action.get(response["action"], 0) + 1
        by_severity[response["severity"]] = by_severity.get(response["severity"], 0) + 1
        if response["arbitrated"]:
            decision = str((response["arbitration"] or {}).get("decision", "unknown"))
            by_decision[decision] = by_decision.get(decision, 0) + 1
    pending = [r["finding_id"] for r in responses if r["requires_confirmation"]]
    return {
        "findings": len(responses),
        "by_action": by_action,
        "by_severity": by_severity,
        "arbitrated": sum(by_decision.values()),
        "arbitrated_by_decision": by_decision,
        "active": len(responses) - sum(by_decision.values()),
        "promotion_blocked": any(
            r["action"] == Action.BLOCK_PROMOTION.value for r in responses
        ),
        "awaiting_confirmation": pending,
        "silent_write_forbidden": SILENT_WRITE_FORBIDDEN,
    }
