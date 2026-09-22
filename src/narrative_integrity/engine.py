"""Orchestration of the two axes: layers by control families."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

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
from .retrieval import canon_context
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

    def _judge_findings(
        self, text: str, input_hash: str, canon_context_text: str = ""
    ) -> tuple:
        """Qualitative findings, only when a judge is actually available."""

        if not self.judge.available():
            return [], {"status": "unavailable", "name": getattr(self.judge, "name", "null")}
        payload = {"text": text}
        if canon_context_text.strip():
            # Retrieval on the canon rather than the whole text, so the judge reasons on
            # facts it can check instead of inventing contradictions.
            payload["canon_context"] = canon_context_text
        try:
            if hasattr(self.judge, "assess_detailed"):
                raw, metadata = self.judge.assess_detailed(payload)
            else:
                raw = self.judge.assess(payload)
                metadata = {
                    "status": "ran",
                    "name": getattr(self.judge, "name", "judge"),
                }
        except JudgeUnavailable as exc:
            return [], {"status": "unavailable", "reason": str(exc)}
        out: List[Finding] = []
        invalid = 0
        for item in raw if isinstance(raw, list) else []:
            if not isinstance(item, dict):
                invalid += 1
                continue
            try:
                out.append(
                    Finding(
                        layer=NarrativeLayer(str(item.get("layer", "L3"))),
                        control_family=ControlFamily.LLM_JUDGE,
                        detector_id="judge." + str(item.get("detector_id", "assessment")),
                        severity=Severity(str(item.get("severity", "low"))),
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
            except (ValueError, TypeError):
                invalid += 1
        if invalid:
            metadata = {**metadata, "invalid_items_dropped": invalid}
        return out, metadata

    def _canon_layer(
        self, integrity_input: IntegrityInput, input_hash: str
    ) -> Tuple[LayerReport, Dict[str, Any]]:
        """L0 -- canon. Skipped, never invented, when no canon was supplied."""

        if integrity_input.canon is None:
            return (
                LayerReport(
                    layer=NarrativeLayer.CANON,
                    status="skipped",
                    note="no canon supplied: the engine does not invent accepted facts",
                ),
                {"layer": "L0", "status": "skipped", "families": []},
            )
        canon_findings, canon_metrics = inspect_canon(
            integrity_input.canon,
            integrity_input.scenes,
            self.thresholds,
            input_hash,
        )
        return (
            LayerReport(
                layer=NarrativeLayer.CANON,
                findings=self._sort_findings(canon_findings),
                metrics=canon_metrics,
                determinism=Determinism.DETERMINISTIC,
                status="ran",
            ),
            {"layer": "L0", "status": "ran", "families": ["deterministic", "relational"]},
        )

    def _structure_layer(
        self, integrity_input: IntegrityInput, input_hash: str
    ) -> Tuple[LayerReport, Dict[str, Any]]:
        """L1 -- structure."""

        if not (integrity_input.acts or integrity_input.beats or integrity_input.scenes):
            return (
                LayerReport(
                    layer=NarrativeLayer.STRUCTURE,
                    status="skipped",
                    note="no acts, beats or scenes supplied",
                ),
                {"layer": "L1", "status": "skipped", "families": []},
            )
        structure_findings, structure_metrics = inspect_structure(
            integrity_input.acts,
            integrity_input.beats,
            integrity_input.scenes,
            self.thresholds,
            input_hash,
        )
        return (
            LayerReport(
                layer=NarrativeLayer.STRUCTURE,
                findings=self._sort_findings(structure_findings),
                metrics=structure_metrics,
                status="ran",
            ),
            {"layer": "L1", "status": "ran", "families": ["deterministic"]},
        )

    def _scenes_layer(
        self, integrity_input: IntegrityInput, input_hash: str
    ) -> Tuple[LayerReport, Dict[str, Any]]:
        """L2 -- scenes."""

        if not integrity_input.scenes:
            return (
                LayerReport(
                    layer=NarrativeLayer.SCENES,
                    status="skipped",
                    note="no scenes supplied",
                ),
                {"layer": "L2", "status": "skipped", "families": []},
            )
        scene_findings, scene_metrics = inspect_scenes(
            integrity_input.scenes, self.thresholds, input_hash
        )
        return (
            LayerReport(
                layer=NarrativeLayer.SCENES,
                findings=self._sort_findings(scene_findings),
                metrics=scene_metrics,
                status="ran",
            ),
            {"layer": "L2", "status": "ran", "families": ["deterministic"]},
        )

    def _prose_layer(
        self,
        integrity_input: IntegrityInput,
        scanned: str,
        hidden_settings: Dict[str, Any],
        input_hash: str,
    ) -> Tuple[LayerReport, Dict[str, Any]]:
        """L3 -- prose, over the truncated text the cap allows."""

        if not scanned.strip():
            return (
                LayerReport(
                    layer=NarrativeLayer.PROSE,
                    status="skipped",
                    note="no prose supplied",
                    metrics={"applicable": False, "note": "no prose supplied"},
                ),
                {"layer": "L3", "status": "skipped", "families": []},
            )
        hygiene, hygiene_metrics = inspect_text_hygiene(
            scanned, hidden_settings, input_hash
        )
        prose_only, prose_stats = inspect_prose(scanned, self.thresholds, input_hash)
        score = self.registry.score(scanned, self.thresholds)
        slop_findings = self.registry.findings(scanned, self.thresholds, input_hash)
        canon_context_text = (
            canon_context(integrity_input.canon, scanned)
            if integrity_input.canon is not None
            else ""
        )
        judge_findings, judge_state = self._judge_findings(
            scanned, input_hash, canon_context_text
        )
        metrics = self._prose_metrics(score, hygiene_metrics, prose_stats, judge_state)
        return (
            LayerReport(
                layer=NarrativeLayer.PROSE,
                findings=self._sort_findings(
                    hygiene + prose_only + slop_findings + judge_findings
                ),
                metrics=metrics,
                determinism=Determinism.STATISTICAL,
                status="ran",
            ),
            {
                "layer": "L3",
                "status": "ran",
                "families": [
                    "deterministic",
                    "statistical",
                    "llm_judge" if judge_state["status"] == "ran" else "llm_judge_unavailable",
                ],
            },
        )

    @staticmethod
    def _prose_metrics(
        score: Dict[str, Any],
        hygiene_metrics: Dict[str, Any],
        prose_stats: Dict[str, Any],
        judge_state: Dict[str, Any],
    ) -> Dict[str, Any]:
        return {
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

    def _style_layer(
        self, profile: Optional[Dict[str, Any]], scanned: str, input_hash: str
    ) -> Tuple[LayerReport, Dict[str, Any]]:
        """S -- style. Requires a locked reference profile; never measured against a guess."""

        if profile is None or not scanned.strip():
            return (
                LayerReport(
                    layer=NarrativeLayer.STYLE,
                    status="skipped",
                    note="no reference profile supplied: drift is not measured against a guess",
                ),
                {"layer": "S", "status": "skipped", "families": []},
            )
        style_findings, style_metrics = drift(
            profile, scanned, self.thresholds, input_hash
        )
        status = "ran" if style_metrics.get("applicable") else "partial"
        return (
            LayerReport(
                layer=NarrativeLayer.STYLE,
                findings=self._sort_findings(style_findings),
                metrics=style_metrics,
                determinism=Determinism.STATISTICAL,
                status=status,
                note=str(style_metrics.get("note", "")),
            ),
            {"layer": "S", "status": status, "families": ["statistical"]},
        )

    def run(
        self,
        integrity_input: IntegrityInput,
        now: Optional[str] = None,
        strict: bool = False,
        profile: Optional[Dict[str, Any]] = None,
        ledger: Any = None,
    ) -> IntegrityReport:
        """Run every layer that the supplied input can support, then assemble."""

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

        built = [
            self._canon_layer(integrity_input, input_hash),
            self._structure_layer(integrity_input, input_hash),
            self._scenes_layer(integrity_input, input_hash),
            self._prose_layer(integrity_input, scanned, hidden_settings, input_hash),
            self._style_layer(profile, scanned, input_hash),
        ]
        order = {layer: index for index, layer in enumerate(LAYER_ORDER)}
        layers = [layer for layer, _scope in built]
        layers.sort(key=lambda entry: order[entry.layer])
        prose_metrics = next(
            layer.metrics for layer in layers if layer.layer is NarrativeLayer.PROSE
        )
        return self._assemble_report(
            integrity_input=integrity_input,
            input_ref=input_ref,
            input_hash=input_hash,
            layers=layers,
            scope=[scope_entry for _layer, scope_entry in built],
            prose_metrics=prose_metrics,
            profile=profile,
            now=now,
            strict=strict,
            ledger=ledger,
        )

    def _assemble_report(
        self,
        integrity_input: IntegrityInput,
        input_ref: Dict[str, Any],
        input_hash: str,
        layers: List[LayerReport],
        scope: List[Dict[str, Any]],
        prose_metrics: Dict[str, Any],
        profile: Optional[Dict[str, Any]],
        now: Optional[str],
        strict: bool,
        ledger: Any,
    ) -> IntegrityReport:
        """Counts, arbitrations and the report identifier, over the executed layers."""

        everything = [f for layer in layers for f in layer.findings]
        if ledger is not None:
            _apply_ledger(everything, ledger)
        arbitrated = [finding for finding in everything if finding.arbitrated()]
        tally = _tally(everything)
        confidence, reason = _confidence(layers, prose_metrics)

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
                "by_layer": tally["by_layer"],
                "by_severity": tally["by_severity"],
                "by_control_family": tally["by_control_family"],
                "prose": {
                    "score": prose_metrics.get("slop_score"),
                    "band": prose_metrics.get("band"),
                    "guard_triggered": prose_metrics.get("guard_triggered"),
                    "strict_triggered": prose_metrics.get("strict_triggered"),
                    "patterns_above_tolerance": prose_metrics.get("above_tolerance_count"),
                    "calibrated": prose_metrics.get("calibrated"),
                },
                "blocked": any(f.severity is Severity.BLOCKING for f in everything),
                "arbitrated": {
                    "total": len(arbitrated),
                    "by_decision": tally["by_decision"],
                    "active_findings": len(everything) - len(arbitrated),
                    "ledger_entries": len(ledger) if ledger is not None else 0,
                },
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


def _apply_ledger(everything: List[Finding], ledger) -> None:
    """Attach the recorded human decision to each finding it covers, in place."""

    for finding in everything:
        entry = ledger.decision_for(finding.detector_id, finding.locus)
        if entry is not None:
            finding.arbitration = entry.to_dict()


def _tally(everything: List[Finding]) -> Dict[str, Dict[str, int]]:
    """Findings per layer, per severity, per control family, and per decision."""

    by_layer: Dict[str, int] = {}
    by_severity: Dict[str, int] = {}
    by_family: Dict[str, int] = {}
    by_decision: Dict[str, int] = {}
    for finding in everything:
        by_layer[finding.layer.value] = by_layer.get(finding.layer.value, 0) + 1
        by_severity[finding.severity.value] = (
            by_severity.get(finding.severity.value, 0) + 1
        )
        family = finding.control_family.value
        by_family[family] = by_family.get(family, 0) + 1
        if finding.arbitrated():
            decision = str((finding.arbitration or {}).get("decision", "unknown"))
            by_decision[decision] = by_decision.get(decision, 0) + 1
    return {
        "by_layer": by_layer,
        "by_severity": by_severity,
        "by_control_family": by_family,
        "by_decision": by_decision,
    }


def _confidence(
    layers: List[LayerReport], prose_metrics: Dict[str, Any]
) -> Tuple[str, str]:
    """The lowest confidence any executed layer reported, and its reason."""

    default = "all executed layers reported their own basis"
    confidences = [
        str(layer.metrics.get("confidence"))
        for layer in layers
        if layer.layer is NarrativeLayer.PROSE and layer.status == "ran"
    ]
    if not confidences:
        return "high", default
    confidence = min(confidences, key=lambda value: CONFIDENCE_RANK.get(value, 1))
    return confidence, str(prose_metrics.get("confidence_reason", default))
