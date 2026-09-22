"""L0: compare declared narrative material against the accepted canon.

Only declared, structured facts are compared. Ordinary capitalised words are never
treated as entities, which is what keeps this layer's false-positive rate low.
"""

from __future__ import annotations

from typing import Any, Dict, List, Sequence, Tuple

from .findings import Evidence, Finding
from .input_model import CanonInput, SceneInput
from .taxonomy import ControlFamily, Determinism, NarrativeLayer, Severity


def _known_names(canon: CanonInput) -> set:
    return {name.lower() for name in canon.entity_names()}


def inspect_canon(
    canon: CanonInput,
    scenes: Sequence[SceneInput],
    thresholds,
    input_hash: str,
) -> Tuple[List[Finding], Dict[str, Any]]:
    findings: List[Finding] = []
    settings = thresholds.section("canon")
    metrics: Dict[str, Any] = {
        "entities": len(canon.entities),
        "relations": len(canon.relations),
        "timeline_entries": len(canon.timeline),
    }

    known = _known_names(canon)
    declared: Dict[str, List[int]] = {}
    for scene in scenes:
        for name in scene.characters:
            declared.setdefault(name.lower(), []).append(scene.index)
    metrics["declared_characters"] = len(declared)

    if settings.get("require_entity_known", True) and known:
        unknown = sorted(name for name in declared if name not in known)
        metrics["unknown_entities"] = len(unknown)
        if unknown:
            findings.append(
                Finding(
                   layer=NarrativeLayer.CANON,
                   control_family=ControlFamily.RELATIONAL,
                   detector_id="canon.unknown_entity",
                    severity=Severity.MEDIUM,
                    locus="canon:entities",
                    determinism=Determinism.DETERMINISTIC,
                    confidence=0.75,
                    confidence_basis="Scene-declared names compared against canon names and aliases",
                    evidence=[
                        Evidence(
                            excerpt=name,
                            locus="scenes:" + ",".join(str(i) for i in declared[name][:3]),
                            detail="declared in scenes but absent from the canon",
                        )
                        for name in unknown[:5]
                    ],
                    canon_conflict="entity missing from canon",
                    remediation="Ajouter l'entite au canon ou corriger la scene.",
                    input_hash=input_hash,
                )
            )

    if canon.relations:
        by_pair: Dict[Tuple[str, str], set] = {}
        for subject, predicate, obj in canon.relation_triples():
            key = (subject.lower(), predicate.lower())
            by_pair.setdefault(key, set()).add(obj.lower())
        conflicting = {
            key: values for key, values in by_pair.items() if len(values) > 1
        }
        metrics["conflicting_relation_pairs"] = len(conflicting)
        if conflicting:
            findings.append(
                Finding(
                   layer=NarrativeLayer.CANON,
                   control_family=ControlFamily.RELATIONAL,
                   detector_id="canon.relation_self_contradiction",
                    severity=Severity.HIGH,
                    locus="canon:relations",
                    determinism=Determinism.DETERMINISTIC,
                    confidence=0.85,
                    confidence_basis="Same subject and predicate carrying different objects",
                    evidence=[
                        Evidence(
                            excerpt=subject + " " + predicate + " -> " + ", ".join(sorted(values)),
                            locus="canon:relation",
                            detail="the canon states two different objects for one predicate",
                        )
                        for (subject, predicate), values in sorted(conflicting.items())[:5]
                    ],
                    canon_conflict="contradictory accepted relation",
                    remediation="Arbitrer entre les deux relations avant promotion.",
                    input_hash=input_hash,
                )
            )

    if canon.timeline:
        orders = [entry.get("order") for entry in canon.timeline if entry.get("order") is not None]
        numeric = [int(order) for order in orders if isinstance(order, (int, float))]
        metrics["timeline_orders"] = len(numeric)
        if len(numeric) != len(set(numeric)):
            findings.append(
                Finding(
                   layer=NarrativeLayer.CANON,
                   control_family=ControlFamily.RELATIONAL,
                   detector_id="canon.timeline_collision",
                    severity=Severity.HIGH,
                    locus="canon:timeline",
                    determinism=Determinism.DETERMINISTIC,
                    confidence=0.85,
                    confidence_basis="Declared timeline order values compared for duplicates",
                    evidence=[
                        Evidence(
                            excerpt=", ".join(str(o) for o in sorted(set(numeric))),
                            locus="canon:timeline",
                            detail="two entries share the same order value",
                        )
                    ],
                    canon_conflict="ambiguous chronology",
                    remediation="Rendre la chronologie canonique non ambigue.",
                    input_hash=input_hash,
                )
            )

    return findings, metrics
