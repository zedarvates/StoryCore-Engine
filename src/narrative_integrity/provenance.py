"""Explicit provenance, in metadata only.

This engine has no hidden lexical marking. A marker smuggled into word patterns is a
covert channel: it breaks under paraphrase, the author cannot see it, and it invites a
surveillance reading. Provenance is therefore visible and verifiable, and the prose is
never touched.
"""

from __future__ import annotations

import json
from typing import Any, Dict, Optional

from .findings import IntegrityReport
from .input_model import IntegrityInput
from .text_scan import hidden_channel_scan

SCHEMA_VERSION = "1.0"


class ProvenanceWouldHideChannel(RuntimeError):
    """Raised when a provenance record would itself carry hidden characters."""


def build_provenance(
    integrity_input: IntegrityInput,
    report: IntegrityReport,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    record: Dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "project_id": integrity_input.project_id,
        "artifact": integrity_input.artifact,
        "content_sha256": report.input_ref.get("content_sha256", ""),
        "integrity_report_id": report.report_id,
        "canon_ref": report.canon_ref,
        "profile_ref": report.profile_ref,
        "generator": integrity_input.generator,
        "model": integrity_input.model,
        "editorial_status": integrity_input.editorial_status,
        "created_at": report.created_at,
        "hidden_lexical_marking": False,
        "note": "Provenance travels in metadata. The prose is never marked.",
    }
    if extra:
        record.update(extra)

    serialized = json.dumps(record, sort_keys=True, ensure_ascii=False)
    scan = hidden_channel_scan(serialized, {})
    if scan.get("tag_block") or scan.get("zero_width") or scan.get("bom_mid_text"):
        raise ProvenanceWouldHideChannel(
            "provenance record carries hidden characters: " + str(scan)
        )
    return record


def assert_prose_untouched(before: str, after: str) -> None:
    """Guard used by tests and callers: provenance must not alter prose."""

    if before != after:
        raise ProvenanceWouldHideChannel("prose was altered by the provenance step")
