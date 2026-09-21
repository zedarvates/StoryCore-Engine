"""Reference profile and style drift.

The drift floor shipped here is deliberately not the unmeasured 0.80 figure that the
public presentation advertises. It is provisional, declared uncalibrated, and every
finding it produces is reported as an estimate.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

from .findings import Evidence, Finding
from .taxonomy import ControlFamily, Determinism, NarrativeLayer, Severity
from .text_scan import (
    adverb_rate,
    coefficient_of_variation,
    count_words,
    sentence_lengths,
    split_sentences,
    words,
)

FUNCTION_WORDS = (
    "de", "la", "le", "les", "des", "du", "un", "une", "et", "en", "a", "à",
    "au", "aux", "que", "qui", "ne", "pas", "pour", "dans", "sur", "avec", "il",
    "elle", "ils", "elles", "je", "tu", "on", "nous", "vous", "se", "ce", "cette",
    "ces", "son", "sa", "ses", "mais", "ou", "donc", "car", "si", "plus", "moins",
    "tout", "tous", "comme", "y", "dont", "ù", "par", "sans", "sous", "entre",
)

ELISION_RE = re.compile(r"\b(?:l|d|j|qu|n|s|c|m|t)['’]", re.IGNORECASE)


def _tokens(text: str) -> List[str]:
    return [w.lower() for w in words(text)]


def rates(tokens: Sequence[str], vocabulary: Sequence[str]) -> Dict[str, float]:
    total = max(len(tokens), 1)
    counts: Dict[str, int] = {}
    for token in tokens:
        if token in vocabulary:
            counts[token] = counts.get(token, 0) + 1
    return {word: round(counts.get(word, 0) / total * 1000, 4) for word in vocabulary}


def vector(tokens: Sequence[str], vocabulary: Sequence[str]) -> List[float]:
    return [rates(tokens, vocabulary)[word] for word in vocabulary]


def cosine(left: Sequence[float], right: Sequence[float]) -> float:
    if len(left) != len(right) or not left:
        return 0.0
    dot = sum(a * b for a, b in zip(left, right))
    na = math.sqrt(sum(a * a for a in left))
    nb = math.sqrt(sum(b * b for b in right))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def measure(text: str) -> Dict[str, Any]:
    tokens = _tokens(text)
    sentences = split_sentences(text)
    lengths = sentence_lengths(sentences)
    total = max(len(tokens), 1)
    return {
        "words": len(tokens),
        "mean_sentence_length": round(sum(lengths) / len(lengths), 4) if lengths else 0.0,
        "sentence_length_cv": coefficient_of_variation(lengths),
        "mean_word_length": round(sum(len(t) for t in tokens) / total, 4),
        "elision_rate_per_1000": round(len(ELISION_RE.findall(text)) / total * 1000, 4),
        "adverb_rate_per_1000": adverb_rate(text)["rate_per_1000"],
        "comma_rate_per_1000": round(text.count(",") / total * 1000, 4),
        "semicolon_rate_per_1000": round(text.count(";") / total * 1000, 4),
    }


def build_profile(
    texts: Sequence[str], thresholds, name: str = "reference", derived_from: Sequence[str] = ()
) -> Dict[str, Any]:
    joined = "\n\n".join(texts)
    metrics = measure(joined)
    metrics["function_word_rates"] = rates(_tokens(joined), FUNCTION_WORDS)
    payload = json.dumps(metrics, sort_keys=True, ensure_ascii=False)
    return {
        "profile_id": hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16],
        "name": name,
        "derived_from": list(derived_from),
        "metrics": metrics,
        "calibrated": False,
        "thresholds_ref": thresholds.ref().to_dict(),
        "note": "Provisional profile. Not validated on a francophone corpus.",
    }


def _windows(tokens: Sequence[str], window_words: int) -> List[List[str]]:
    if window_words <= 0:
        return []
    return [list(tokens[i:i + window_words]) for i in range(0, len(tokens), window_words)]


def drift(
    profile: Dict[str, Any],
    text: str,
    thresholds,
    input_hash: str,
) -> Tuple[List[Finding], Dict[str, Any]]:
    """Windowed cosine against the locked profile, reported as an estimate."""

    settings = thresholds.section("style")
    window_words = int(settings.get("window_words", 250))
    min_windows = int(settings.get("min_windows", 2))
    floor = float(settings.get("drift_min_cosine", 0.62))
    metrics: Dict[str, Any] = {
        "window_words": window_words,
        "min_cosine_floor": floor,
        "calibrated": bool(settings.get("calibrated", False)),
    }

    profile_rates = (profile.get("metrics") or {}).get("function_word_rates") or {}
    if not profile_rates:
        metrics["applicable"] = False
        metrics["note"] = "profile carries no function-word vector"
        return [], metrics

    tokens = _tokens(text)
    chunks = _windows(tokens, window_words)
    if len(chunks) < min_windows:
        metrics["applicable"] = False
        metrics["note"] = "too little material for a windowed comparison"
        metrics["windows"] = len(chunks)
        return [], metrics

    reference_vector = [float(profile_rates.get(word, 0.0)) for word in FUNCTION_WORDS]
    similarities: List[float] = []
    findings: List[Finding] = []
    for index, chunk in enumerate(chunks):
        value = cosine(vector(chunk, FUNCTION_WORDS), reference_vector)
        similarities.append(round(value, 4))
        if value < floor:
            findings.append(
                Finding(
                    layer=NarrativeLayer.STYLE,
                    control_family=ControlFamily.STATISTICAL,
                    detector_id="style.drift",
                    severity=Severity.MEDIUM,
                    locus="style:window:" + str(index),
                    determinism=Determinism.STATISTICAL,
                    confidence=0.5,
                    confidence_basis="Provisional floor, reported as an estimate; not calibrated",
                    evidence=[
                        Evidence(
                            excerpt=" ".join(chunk[:24]) + (" ..." if len(chunk) > 24 else ""),
                            locus="style:window:" + str(index),
                            detail="similarity "
                            + str(round(value, 4))
                            + " below floor "
                            + str(floor),
                        )
                    ],
                    remediation="Verifier si la rupture de registre est voulue.",
                    input_hash=input_hash,
                )
            )

    metrics["applicable"] = True
    metrics["windows"] = len(chunks)
    metrics["similarities"] = similarities
    metrics["min_similarity"] = min(similarities) if similarities else None
    return findings, metrics


def lock_profile(
    texts: Sequence[str],
    thresholds,
    name: str = "reference",
    sources: Optional[Sequence[str]] = None,
) -> Dict[str, Any]:
    """Build a profile and record exactly what it was derived from.

    A reference profile is a claim about a corpus. Recording each source, its content
    hash and its size keeps that claim checkable later. Only the measurements feed the
    identifier, so locking the same material twice yields the same profile_id.
    """

    records: List[Dict[str, Any]] = []
    labels: List[str] = []
    for index, text in enumerate(texts):
        source = sources[index] if sources and index < len(sources) else None
        labels.append(source or "")
        records.append(
            {
                "source": source,
                "sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
                "words": count_words(text),
            }
        )
    profile = build_profile(texts, thresholds, name=name, derived_from=labels)
    profile["derived_from_records"] = records
    profile["locked"] = True
    return profile


def save_profile(profile: Dict[str, Any], path) -> Path:
    """Write a profile to disk so it can be versioned and reviewed."""

    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(profile, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return target
