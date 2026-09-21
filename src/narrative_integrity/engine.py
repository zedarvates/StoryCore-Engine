"""Orchestration of the two axes: layers by control families."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from .canon import inspect_canon
from .detectors import (
    inspect_prose,
    inspect_scenes,
    inspect_structure,
    inspect_text_hygiene,
)
from .findings import Evidence, Finding, IntegrityReport, LayerReport, content_hash
from .immune import summarize
from .input_model import IntegrityInput
from .judge import JudgeUnavailable, NullJudge
from .slop import SlopRegistry
from .style_profile import drift
from .taxonomy import (
    ControlFamily,
    Determinism,
    LAYER_ORDER,
    NarrativeLayer,
    Severity,
    severity_rank,
)
from .text_scan import count_words
from .thresholds import Thresholds

CONFIDENCE_RANK = {"low": 0, "medium": 1, "high": 2}


class NarrativeIntegrityEngine:
    """Inspects a narrative project and returns findings, never edits."""

    def __init__(self, thresholds=None, registry=None, judge=None) -> None:
        self.thresholds = thresholds or Thresholds.default()
        self.registry = registry or SlopRegistry.default()
        self.judge = judge or NullJudge()

    def _sort_findings(self, findings: List[Finding]) -> List[Finding]:
        return sorted(
            findings,
            key=lambda f: (
                -severity_rank(f.severity),
                f.detector_id,
                f.locus,
                f.finding_id,
            ),
        )

    def _judge_findings(self, text: str, input_hash: str) -> tuple:
        """Qualitative findings, only when a judge is actually available."""

        if not self.judge.available():
            return [], {"status": "unavailable", "name": getattr(self.judge, "name", "null")}
        try:
            raw = self.judge.assess({"text": text})
        except JudgeUnavailable as exc:
            return [], {"status": "unavailable", "reason": str(exc)}
        out: List[Finding] = []
        for item in raw if isinstance(raw, list) else []:
            if not isinstance(item, dict):
                continue
            out.append(
                Finding(
                    layer=NarrativeLayer(item.get("layer", "L3")),
                    control_family=ControlFamily.LLM_JUDGE,
                    detector_id="judge." + str(item.get("detector_id", "assessment")),
                    severity=Severity(item.get("severity", "low")),
                    locus=str(item.get("locus", "judge")),
                    determinism=Determinism.PROBABILISTIC,
                    confidence=float(item.get("confidence", 0.5)),
                    confidence_basis="qualitative judge output, non deterministic",
                    evidence=[
                        Evidence(
                            excerpt=str(item.get("excerpt", ""))[:200],
                            locus=str(item.get("locus", "judge")),
                            detail=str(item.get("detail", "")),
                        )
                    ],
                    remediation=item.get("remediation"),
                    input_hash=input_hash,
                )
            )
        return out, {"status": "ran", "name": getattr(self.judge, "name", "judge")}

    def run(
        self,
        integrity_input: IntegrityInput,
        now: Optional[str] = None,
        strict: bool = False,
        profile: Optional[Dict[str, Any]] = None,
    ) -> IntegrityReport:
        hidden_settings = self.thresholds.section("hidden_channels")
        cap = int(self.thresholds.get("scan.cap_chars", 262144))
        input_hash = content_hash(integrity_input.hash_parts())
        text = integrity_input.scanned_text()
        scanned = text[:cap] if len(text) > cap else text

        input_ref = {
            "artifact": integrity_input.artifact,
            "content_sha256": input_hash,
            "chars": len(text),
            "scanned_chars": len(scanned),
            "words": count_words(scanned),
            "truncated": len(text) > cap,
        }

        layers: List[LayerReport] = []
        scope: List[Dict[str, Any]] = []

        # L0 -- canon
        if integrity_input.canon is not None:
            canon_findings, canon_metrics = inspect_canon(
                integrity_input.canon,
                integrity_input.scenes,
                self.thresholds,
                input_hash,
                integrity_input.canon_ref or "",
            )
            layers.append(
                LayerReport(
                    layer=NarrativeLayer.CANON,
                    findings=self._sort_findings(canon_findings),
                    metrics=canon_metrics,
                    determinism=Determinism.DETERMINISTIC,
                    status="ran",
                )
            )
            scope.append(
                {"layer": "L0", "status": "ran", "families": ["deterministic", "relational"]}
            )
        else:
            layers.append(
                LayerReport(
                    layer=NarrativeLayer.CANON,
                    status="skipped",
                    note="no canon supplied: the engine does not invent accepted facts",
                )
            )
            scope.append({"layer": "L0", "status": "skipped", "families": []})

        # L1 -- structure
        if integrity_input.acts or integrity_input.beats or integrity_input.scenes:
            structure_findings, structure_metrics = inspect_structure(
                integrity_input.acts,
                integrity_input.beats,
                integrity_input.scenes,
                self.thresholds,
                input_hash,
            )
            layers.append(
                LayerReport(
                    layer=NarrativeLayer.STRUCTURE,
                    findings=self._sort_findings(structure_findings),
                    metrics=structure_metrics,
                    status="ran",
                )
            )
            scope.append({"layer": "L1", "status": "ran", "families": ["deterministic"]})
        else:
            layers.append(
                LayerReport(
                    layer=NarrativeLayer.STRUCTURE,
                    status="skipped",
                    note="no acts, beats or scenes supplied",
                )
            )
            scope.append({"layer": "L1", "status": "skipped", "families": []})

        # L2 -- scenes
        if integrity_input.scenes:
            scene_findings, scene_metrics = inspect_scenes(
                integrity_input.scenes, self.thresholds, input_hash
            )
            layers.append(
                LayerReport(
                    layer=NarrativeLayer.SCENES,
                    findings=self._sort_findings(scene_findings),
                    metrics=scene_metrics,
                    status="ran",
                )
            )
            scope.append({"layer": "L2", "status": "ran", "families": ["deterministic"]})
        else:
            layers.append(
                LayerReport(
                    layer=NarrativeLayer.SCENES,
                    status="skipped",
                    note="no scenes supplied",
                )
            )
            scope.append({"layer": "L2", "status": "skipped", "families": []})

        # L3 -- prose
        prose_findings: List[Finding] = []
        prose_metrics: Dict[str, Any] = {}
        if scanned.strip():
            hygiene, hygiene_metrics = inspect_text_hygiene(
                scanned, hidden_settings, input_hash
            )
            prose_only, prose_stats = inspect_prose(scanned, self.thresholds, input_hash)
            score = self.registry.score(scanned, self.thresholds)
            slop_findings = self.registry.findings(scanned, self.thresholds, input_hash)
            judge_findings, judge_state = self._judge_findings(scanned, input_hash)
            prose_findings = hygiene + prose_only + slop_findings + judge_findings
            prose_metrics = {
                "slop_score": score["score"],
                "band": score["band"],
                "content_load": score["content_load"],
                "pattern_points": score["pattern_points"],
                "flagged_count": score["flagged_count"],
                "above_tolerance_count": score["above_tolerance_count"],
                "flagged": [
                    {
                        "signature_id": item["signature_id"],
                        "weight_class": item["weight_class"],
                       "count": item["count"],
                        "above_tolerance": item["above_tolerance"],
                    }
                    for item in score["flagged"]
                ],
                "guard_triggered": score["guard_triggered"],
                "strict_triggered": score["strict_triggered"],
                "calibrated": score["calibrated"],
                "confidence": score["confidence"],
                "confidence_reason": score["confidence_reason"],
                "truncated": score["truncated"],
                "words": score["words"],
                "hygiene": hygiene_metrics,
                "rhythm": prose_stats,
                "judge": judge_state,
            }
            layers.append(
                LayerReport(
                    layer=NarrativeLayer.PROSE,
                    findings=self._sort_findings(prose_findings),
                    metrics=prose_metrics,
                    determinism=Determinism.STATISTICAL,
                    status="ran",
                )
            )
            scope.append(
                {
                    "layer": "L3",
                    "status": "ran",
                    "families": ["deterministic", "statistical", judge_state["status"] == "ran" and "llm_judge" or "llm_judge_unavailable"],
                }
            )
        else:
            prose_metrics = {"applicable": False, "note": "no prose supplied"}
            layers.append(
                LayerReport(
                    layer=NarrativeLayer.PROSE,
                    status="skipped",
                    note="no prose supplied",
                    metrics=prose_metrics,
                )
            )
            scope.append({"layer": "L3", "status": "skipped", "families": []})

        # S -- style, requires a locked reference profile
        if profile is not None and scanned.strip():
            style_findings, style_metrics = drift(
                profile, scanned, self.thresholds, input_hash
            )
            layers.append(
                LayerReport(
                    layer=NarrativeLayer.STYLE,
                    findings=self._sort_findings(style_findings),
                    metrics=style_metrics,
                    determinism=Determinism.STATISTICAL,
                    status="ran" if style_metrics.get("applicable") else "partial",
                    note=str(style_metrics.get("note", "")),
                )
            )
            scope.append(
                {
                    "layer": "S",
                    "status": "ran" if style_metrics.get("applicable") else "partial",
                    "families": ["statistical"],
                }
            )
        else:
            layers.append(
                LayerReport(
                    layer=NarrativeLayer.STYLE,
                    status="skipped",
                    note="no reference profile supplied: drift is not measured against a guess",
                )
            )
            scope.append({"layer": "S", "status": "skipped", "families": []})

        order = {layer: index for index, layer in enumerate(LAYER_ORDER)}
        layers.sort(key=lambda entry: order[entry.layer])

        everything = [f for layer in layers for f in layer.findings]
        by_layer: Dict[str, int] = {}
        by_severity: Dict[str, int] = {}
        by_family: Dict[str, int] = {}
        for finding in everything:
            by_layer[finding.layer.value] = by_layer.get(finding.layer.value, 0) + 1
            by_severity[finding.severity.value] = by_severity.get(finding.severity.value, 0) + 1
            by_family[finding.control_family.value] = (
                by_family.get(finding.control_family.value, 0) + 1
            )

        confidences = [
            str(layer.metrics.get("confidence"))
            for layer in layers
            if layer.layer is NarrativeLayer.PROSE and layer.status == "ran"
        ]
        confidence = "high"
        reason = "all executed layers reported their own basis"
        if confidences:
            confidence = min(confidences, key=lambda value: CONFIDENCE_RANK.get(value, 1))
            reason = str(prose_metrics.get("confidence_reason", reason))

        report = IntegrityReport(
            project_id=integrity_input.project_id,
            canon_ref=integrity_input.canon_ref,
            profile_ref=(profile or {}).get("profile_id") or integrity_input.profile_ref,
            input_ref=input_ref,
            scope=scope,
            settings_ref={
                **self.thresholds.ref().to_dict(),
                "signatures_ref": self.registry.ref(),
            },
            layers=layers,
            aggregates={
                "findings_total": len(everything),
                "by_layer": by_layer,
                "by_severity": by_severity,
                "by_control_family": by_family,
                "prose": {
                    "score": prose_metrics.get("slop_score"),
                    "band": prose_metrics.get("band"),
                    "guard_triggered": prose_metrics.get("guard_triggered"),
                    "strict_triggered": prose_metrics.get("strict_triggered"),
                    "patterns_above_tolerance": prose_metrics.get("above_tolerance_count"),
                    "calibrated": prose_metrics.get("calibrated"),
                },
                "blocked": any(f.severity is Severity.BLOCKING for f in everything),
            },
            confidence=confidence,
            confidence_reason=reason,
            created_at=now or datetime.now().isoformat(timespec="seconds"),
        )
        report.aggregates["immune"] = summarize(report, self.thresholds)
        if strict:
            report.aggregates["strict_mode"] = True
        report.report_id = content_hash(
            [
                report.project_id,
                input_hash,
                report.settings_ref.get("sha256", ""),
                str(report.settings_ref.get("signatures_ref", {}).get("sha256", "")),
                report.profile_ref or "",
                ",".join(sorted(f.finding_id for f in everything)),
            ]
        )
        return report
