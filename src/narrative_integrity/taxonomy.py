"""Vocabulary of the integrity engine."""

from __future__ import annotations

from enum import Enum


class NarrativeLayer(str, Enum):
    """What is inspected."""

    CANON = "L0"
    STRUCTURE = "L1"
    SCENES = "L2"
    PROSE = "L3"
    STYLE = "S"


class ControlFamily(str, Enum):
    """How it is inspected."""

    DETERMINISTIC = "deterministic"
    STATISTICAL = "statistical"
    RELATIONAL = "relational"
    LLM_JUDGE = "llm_judge"


class Determinism(str, Enum):
    """Nature of the measurement behind a finding."""

    DETERMINISTIC = "deterministic"
    STATISTICAL = "statistical"
    PROBABILISTIC = "probabilistic"


class Severity(str, Enum):
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    BLOCKING = "blocking"


class Action(str, Enum):
    """Responses the immune system is allowed to produce."""

    OBSERVE = "observe"
    FLAG = "flag"
    SUGGEST = "suggest"
    PROPOSE = "propose"
    BLOCK_PROMOTION = "block_promotion"


SEVERITY_ORDER = (
    Severity.INFO,
    Severity.LOW,
    Severity.MEDIUM,
    Severity.HIGH,
    Severity.BLOCKING,
)

LAYER_ORDER = (
    NarrativeLayer.CANON,
    NarrativeLayer.STRUCTURE,
    NarrativeLayer.SCENES,
    NarrativeLayer.PROSE,
    NarrativeLayer.STYLE,
)


def severity_rank(severity: Severity) -> int:
    """Position of a severity in SEVERITY_ORDER."""

    return SEVERITY_ORDER.index(severity)


def max_severity(severities) -> Severity | None:
    """Highest severity of an iterable, or None when empty."""

    ranks = [severity_rank(s) for s in severities]
    if not ranks:
        return None
    return SEVERITY_ORDER[max(ranks)]
