"""Slop signatures: a declarative, versioned, weighted catalogue.

Replaces hard-coded banned-word lists inside prompts. A signature is a family of
patterns with a tolerance, examples and counter-examples. Classes that measurement
could not justify are demoted to zero weight and stay reported: a demoted signature is
visible, it simply cannot move the score.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

from .findings import Evidence, Finding, content_hash
from .taxonomy import ControlFamily, Determinism, NarrativeLayer, Severity
from .text_scan import count_words, words

DATA_DIR = Path(__file__).resolve().parent / "data"
DEFAULT_CATALOGUE = DATA_DIR / "slop_signatures_fr_v1.json"

WEIGHT_CLASS_SEVERITY = {
    "decisive": Severity.HIGH,
    "strong": Severity.MEDIUM,
    "soft": Severity.LOW,
    "report_only": Severity.INFO,
    "style_only": Severity.INFO,
}

STATISTICAL_FAMILIES = {"rhythm"}


@dataclass(frozen=True)
class SlopSignature:
    signature_id: str
    family: str
    label: str
    pattern: str
    weight_class: str
    max_per_1000_words: float = 0.0
    languages: List[str] = field(default_factory=list)
    source: str = "original"
    note: str = ""
    examples: List[str] = field(default_factory=list)
    counter_examples: List[str] = field(default_factory=list)

    def compiled(self) -> "re.Pattern[str]":
        return re.compile(self.pattern, re.IGNORECASE | re.UNICODE)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "signature_id": self.signature_id,
            "family": self.family,
            "label": self.label,
            "pattern": self.pattern,
            "weight_class": self.weight_class,
            "max_per_1000_words": self.max_per_1000_words,
            "languages": list(self.languages),
            "source": self.source,
            "note": self.note,
            "examples": list(self.examples),
            "counter_examples": list(self.counter_examples),
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SlopSignature":
        return cls(
            signature_id=str(data["signature_id"]),
            family=str(data.get("family", "unknown")),
            label=str(data.get("label", "")),
            pattern=str(data["pattern"]),
            weight_class=str(data.get("weight_class", "report_only")),
            max_per_1000_words=float(data.get("max_per_1000_words", 0.0)),
            languages=list(data.get("languages", [])),
            source=str(data.get("source", "original")),
            note=str(data.get("note", "")),
            examples=list(data.get("examples", [])),
            counter_examples=list(data.get("counter_examples", [])),
        )


class SlopRegistry:
    """Loads a catalogue and matches prose against it."""

    def __init__(
        self,
        signatures: List[SlopSignature],
        path: Optional[Path] = None,
        digest: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.signatures = signatures
        self._path = path
        self._digest = digest
        self._metadata = metadata or {}

    @classmethod
    def from_file(cls, path: Path) -> "SlopRegistry":
        raw = Path(path).read_bytes()
        data = json.loads(raw.decode("utf-8"))
        signatures = [SlopSignature.from_dict(s) for s in data.get("signatures", [])]
        return cls(
            signatures,
            Path(path),
            hashlib.sha256(raw).hexdigest(),
            {k: v for k, v in data.items() if k != "signatures"},
        )

    @classmethod
    def default(cls) -> "SlopRegistry":
        return cls.from_file(DEFAULT_CATALOGUE)

    def ref(self) -> Dict[str, Any]:
        return {
            "name": str(self._metadata.get("name", "unknown")),
            "schema_version": str(self._metadata.get("schema_version", "0")),
            "language": str(self._metadata.get("language", "unknown")),
            "path": str(self._path) if self._path else "<memory>",
            "sha256": self._digest or "",
            "signatures": len(self.signatures),
            "calibrated": bool(
                (self._metadata.get("calibration") or {}).get("calibrated", False)
            ),
        }

    def has(self, signature_id: str) -> bool:
        return any(s.signature_id == signature_id for s in self.signatures)

    def match(self, text: str) -> List[Dict[str, Any]]:
        """Counts and exact excerpts per signature."""

        out: List[Dict[str, Any]] = []
        for signature in self.signatures:
            matches = list(signature.compiled().finditer(text))
            if not matches:
                continue
            samples = [
                {"excerpt": m.group(0)[:200], "start": m.start(), "end": m.end()}
                for m in matches[:3]
            ]
            out.append(
                {"signature": signature, "count": len(matches), "samples": samples}
            )
        return out

    def score(self, text: str, thresholds) -> Dict[str, Any]:
        """Prose score, with declared truncation, tolerance and confidence."""

        cap = int(thresholds.get("scan.cap_chars", 262144))
        min_words = int(thresholds.get("scan.min_words_for_score", 120))
        curve_k = float(thresholds.get("score_model.k", 12.0))
        score_cap = float(thresholds.get("score_model.cap", 100.0))

        truncated = len(text) > cap
        scanned = text[:cap] if truncated else text
        total_words = count_words(scanned)
        denominator = max(total_words, min_words)

        matches = self.match(scanned)
        content_load = 0.0
        pattern_points = 0.0
        flagged: List[Dict[str, Any]] = []
        for match in matches:
            signature: SlopSignature = match["signature"]
            classes = thresholds.weight_class(signature.weight_class)
            observed = match["count"] / denominator * 1000
            tolerance = float(signature.max_per_1000_words)
            effective = 0.0
            if observed > tolerance:
                effective = max(0.0, match["count"] - tolerance * denominator / 1000)
            content_load += classes["weight"] * effective
            pattern_points += classes["points"] * effective
            flagged.append(
                {
                    "signature_id": signature.signature_id,
                    "label": signature.label,
                    "family": signature.family,
                    "weight_class": signature.weight_class,
                    "count": match["count"],
                   "effective": round(effective, 3),
                    "above_tolerance": effective > 0,
                   "samples": match["samples"],
                }
            )

        rate = content_load / denominator * 1000
        score = min(score_cap, score_cap * (1.0 - math.exp(-rate / curve_k)))
        score = round(score, 2)
        band = thresholds.band_for(score)

        low_below = int(thresholds.get("confidence.low_below_words", 120))
        medium_below = int(thresholds.get("confidence.medium_below_words", 400))
        above_tolerance = sum(1 for f in flagged if f["above_tolerance"])
        if total_words < low_below:
            confidence = "low"
            reason = (
                str(total_words)
                + " words, below the "
                + str(low_below)
                + "-word floor, so a single phrase can move the band."
            )
            if above_tolerance == 0:
                reason = (
                    str(total_words)
                    + " words and no scored pattern: not enough independent evidence."
                )
        elif total_words < medium_below:
            confidence = "medium"
            reason = str(total_words) + " words: above the floor, below the comfortable range."
        else:
            confidence = "high"
            reason = str(total_words) + " words: enough material for a stable band."

        guard = thresholds.section("guard")
        return {
            "score": score,
            "band": band,
            "scanned_chars": len(scanned),
            "truncated": truncated,
            "words": total_words,
            "content_load": round(content_load, 4),
            "pattern_points": round(pattern_points, 4),
            "flagged": flagged,
           "flagged_count": len(flagged),
            "above_tolerance_count": above_tolerance,
            "confidence": confidence,
            "confidence_reason": reason,
            "guard_threshold": int(guard.get("default_threshold", 40)),
            "guard_triggered": score > int(guard.get("default_threshold", 40)),
            "strict_triggered": score > int(guard.get("strict_threshold", 20)),
            "calibrated": bool(self.ref().get("calibrated", False)),
        }

    def findings(self, text: str, thresholds, input_hash: str) -> List[Finding]:
        """One finding per signature that fired, with exact excerpts."""

        cap = int(thresholds.get("scan.cap_chars", 262144))
        scanned = text[:cap] if len(text) > cap else text
        out: List[Finding] = []
        for match in self.match(scanned):
            signature: SlopSignature = match["signature"]
            statistical = signature.family in STATISTICAL_FAMILIES
            evidence = [
                Evidence(
                    excerpt=sample["excerpt"],
                    locus="chars:" + str(sample["start"]) + "-" + str(sample["end"]),
                    detail="occurrence " + str(index + 1) + " of " + str(match["count"]),
                )
                for index, sample in enumerate(match["samples"])
            ]
            scored = thresholds.weight_class(signature.weight_class)["weight"] > 0
            out.append(
                Finding(
                    layer=NarrativeLayer.PROSE,
                    control_family=(
                        ControlFamily.STATISTICAL if statistical else ControlFamily.DETERMINISTIC
                    ),
                    detector_id="slop." + signature.signature_id,
                    severity=WEIGHT_CLASS_SEVERITY.get(signature.weight_class, Severity.INFO),
                    locus="signature:" + signature.signature_id,
                    determinism=(
                        Determinism.STATISTICAL if statistical else Determinism.DETERMINISTIC
                    ),
                    confidence=0.9 if scored else 0.5,
                    confidence_basis=(
                        "declarative signature, weight class " + signature.weight_class
                    ),
                    evidence=evidence,
                    remediation=(
                        "Revoir les occurrences signalees. Aucune reecriture automatique."
                    ),
                    input_hash=input_hash,
                )
            )
        return out
