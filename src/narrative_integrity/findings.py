"""Findings, evidence and reports.

A finding is never a verdict on authorship and never an applied correction. It carries
an exact excerpt, a stable identity, the nature of its measurement, and a proposal.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence

from .taxonomy import (
    ControlFamily,
    Determinism,
    NarrativeLayer,
    Severity,
)

SCHEMA_VERSION = "1.0"


def _sha256_16(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]


@dataclass(frozen=True)
class Evidence:
    """An exact excerpt supporting a finding. Never a paraphrase."""

    excerpt: str
    locus: str
    detail: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {"excerpt": self.excerpt, "locus": self.locus, "detail": self.detail}


@dataclass
class Finding:
    """A single observation, with its own measurement nature."""

    layer: NarrativeLayer
    control_family: ControlFamily
    detector_id: str
    severity: Severity
    locus: str
    determinism: Determinism
    confidence: float = 1.0
    confidence_basis: str = ""
    evidence: List[Evidence] = field(default_factory=list)
    canon_conflict: Optional[str] = None
    remediation: Optional[str] = None
    input_hash: str = ""
    applied: bool = False
    finding_id: str = ""

    def __post_init__(self) -> None:
        if self.applied:
            raise ValueError(
                "a finding can never be applied: corrections are proposals only"
            )
        if not self.finding_id:
            self.finding_id = self._derive_id()

    def _derive_id(self) -> str:
        """Stable identity: same detector, same input, same locus, same excerpt."""

        parts = [self.detector_id, self.input_hash, self.locus]
        parts.extend(sorted(e.excerpt for e in self.evidence))
        return _sha256_16("|".join(parts))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "finding_id": self.finding_id,
            "layer": self.layer.value,
            "control_family": self.control_family.value,
            "detector_id": self.detector_id,
            "severity": self.severity.value,
            "determinism": self.determinism.value,
            "confidence": round(self.confidence, 4),
            "confidence_basis": self.confidence_basis,
            "locus": self.locus,
            "evidence": [e.to_dict() for e in self.evidence],
            "canon_conflict": self.canon_conflict,
            "remediation": self.remediation,
            "applied": False,
        }


@dataclass
class LayerReport:
    """Findings and metrics for one layer."""

    layer: NarrativeLayer
    findings: List[Finding] = field(default_factory=list)
    metrics: Dict[str, Any] = field(default_factory=dict)
    determinism: Determinism = Determinism.DETERMINISTIC
    status: str = "ran"
    note: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "layer": self.layer.value,
            "status": self.status,
            "note": self.note,
            "determinism": self.determinism.value,
            "metrics": self.metrics,
            "findings": [f.to_dict() for f in self.findings],
        }


@dataclass
class IntegrityReport:
    """The persisted unit of work."""

    project_id: str
    input_ref: Dict[str, Any]
    scope: List[Dict[str, str]]
    settings_ref: Dict[str, Any]
    layers: List[LayerReport] = field(default_factory=list)
    canon_ref: Optional[str] = None
    profile_ref: Optional[str] = None
    aggregates: Dict[str, Any] = field(default_factory=dict)
    confidence: str = "high"
    confidence_reason: str = ""
    created_at: str = ""
    schema_version: str = SCHEMA_VERSION
    report_id: str = ""

    @property
    def findings(self) -> List[Finding]:
        out: List[Finding] = []
        for layer in self.layers:
            out.extend(layer.findings)
        return out

    def findings_by_layer(self, layer: NarrativeLayer) -> List[Finding]:
        for entry in self.layers:
            if entry.layer is layer:
                return entry.findings
        return []

    def highest_severity(self) -> Optional[Severity]:
        from .taxonomy import max_severity

        return max_severity([f.severity for f in self.findings])

    def blocked(self) -> bool:
        """True when a blocking finding forbids promotion to canon."""

        return any(f.severity is Severity.BLOCKING for f in self.findings)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "schema_version": self.schema_version,
            "report_id": self.report_id,
            "project_id": self.project_id,
            "canon_ref": self.canon_ref,
            "profile_ref": self.profile_ref,
            "input_ref": self.input_ref,
            "scope": self.scope,
            "settings_ref": self.settings_ref,
            "aggregates": self.aggregates,
            "confidence": self.confidence,
            "confidence_reason": self.confidence_reason,
            "created_at": self.created_at,
            "layers": [l.to_dict() for l in self.layers],
        }


def content_hash(parts: Sequence[str]) -> str:
    """Hash of the inspected material, stable across runs."""

    return _sha256_16("\u0000".join(parts))
