"""Turn the signature catalogue into prompt guidance.

Guidance is derived from the catalogue, so changing a weight in data changes the
instruction. Patterns that carry no score weight are never presented as bans: they
describe register or typography, not machine authorship.
"""

from __future__ import annotations

from typing import List, Optional

from .slop import SlopRegistry

BANNED_CLASSES = ("decisive", "strong")
REPORTED_CLASSES = ("report_only", "style_only")


def _matches_language(signature, language: Optional[str]) -> bool:
    if not language:
        return True
    return not signature.languages or language in signature.languages


def banned_examples(registry=None, language: str = "fr", limit: int = 10) -> List[str]:
    """One example per scored signature. Zero-weight classes are excluded."""

    reg = registry or SlopRegistry.default()
    out: List[str] = []
    for signature in reg.signatures:
        if signature.weight_class not in BANNED_CLASSES:
            continue
        if not _matches_language(signature, language) or not signature.examples:
            continue
        out.append(signature.examples[0])
        if len(out) >= limit:
            break
    return out


def reported_only_labels(registry=None, language: str = "fr") -> List[str]:
    """Labels of the demoted classes, which are reported and never forbidden."""

    reg = registry or SlopRegistry.default()
    out: List[str] = []
    for signature in reg.signatures:
        if signature.weight_class not in REPORTED_CLASSES:
            continue
        if not _matches_language(signature, language):
            continue
        out.append(signature.label + " (" + signature.weight_class + ")")
    return out


def render_guidance(registry=None, language: str = "fr", limit: int = 10) -> str:
    """A compact instruction block derived from the catalogue."""

    reg = registry or SlopRegistry.default()
    ref = reg.ref()
    lines = [
        "ANTI-SLOP - catalogue "
        + str(ref["name"])
        + " ("
        + str(ref["signatures"])
        + " signatures, calibrated: "
        + str(ref["calibrated"]).lower()
        + ").",
        "Avoid these patterns:",
    ]
    lines.extend("- " + example for example in banned_examples(reg, language, limit))
    reported = reported_only_labels(reg, language)
    if reported:
        lines.append(
            "Reported, never forbidden, because these mark register or typography "
            "rather than machine authorship:"
        )
        lines.extend("- " + label for label in reported)
    lines.append("Do not explain a scene after showing it.")
    return "\n".join(lines)
