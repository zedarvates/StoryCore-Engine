"""Narrative Integrity Engine.

Generic, offline, deterministic-first integrity control for narrative projects.

Design baseline: docs/superpowers/specs/2026-09-21-narrative-integrity-engine-design.md

Two orthogonal axes:

* NarrativeLayer  -- what is inspected (canon, structure, scenes, prose, style).
* ControlFamily   -- how it is inspected (deterministic, statistical, relational, llm_judge).

The engine observes and proposes. It never rewrites canonical artifacts, and it never
inserts hidden markers into prose. Provenance travels in metadata.
"""

from .engine import NarrativeIntegrityEngine
from .input_model import (
    ActInput,
    BeatInput,
    CanonInput,
    IntegrityInput,
    SceneInput,
)
from .findings import Evidence, Finding, IntegrityReport, LayerReport
from .taxonomy import (
    Action,
    ControlFamily,
    Determinism,
    NarrativeLayer,
    Severity,
)

__all__ = [
    "NarrativeIntegrityEngine",
    "IntegrityInput",
    "SceneInput",
    "ActInput",
    "BeatInput",
    "CanonInput",
    "Finding",
    "Evidence",
    "LayerReport",
    "IntegrityReport",
    "NarrativeLayer",
    "ControlFamily",
    "Severity",
    "Determinism",
    "Action",
]

__version__ = "0.1.0"
