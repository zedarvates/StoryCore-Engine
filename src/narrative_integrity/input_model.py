"""What the engine inspects.

The engine accepts a narrative project at whatever resolution is available. Missing
structure produces a declared partial scope, never an invented conclusion.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional, Sequence


@dataclass
class SceneInput:
    index: int
    scene_id: str = ""
    pov: Optional[str] = None
    location: Optional[str] = None
    time_label: Optional[str] = None
    characters: List[str] = field(default_factory=list)
    summary: str = ""
    function: Optional[str] = None
    text: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class BeatInput:
    beat_id: str
    kind: str
    ref: str = ""
    act_index: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ActInput:
    index: int
    name: str = ""
    tension: Optional[float] = None
    scene_indexes: List[int] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class CanonInput:
    """Accepted facts. This is the reference the L0 layer compares against."""

    entities: List[Dict[str, Any]] = field(default_factory=list)
    relations: List[Dict[str, Any]] = field(default_factory=list)
    timeline: List[Dict[str, Any]] = field(default_factory=list)
    version: Optional[str] = None

    def entity_names(self) -> List[str]:
        names: List[str] = []
        for entity in self.entities:
            name = str(entity.get("name", "")).strip()
            if name:
                names.append(name)
            for alias in entity.get("aliases", []) or []:
                alias = str(alias).strip()
                if alias:
                    names.append(alias)
        return names

    def relation_triples(self) -> List[Sequence[str]]:
        triples: List[Sequence[str]] = []
        for relation in self.relations:
            subject = relation.get("subject")
            predicate = relation.get("predicate") or relation.get("relation")
            obj = relation.get("object")
            if subject and predicate and obj:
                triples.append((str(subject), str(predicate), str(obj)))
        return triples

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class IntegrityInput:
    """One inspection request."""

    project_id: str = "unknown"
    artifact: str = ""
    text: str = ""
    scenes: List[SceneInput] = field(default_factory=list)
    acts: List[ActInput] = field(default_factory=list)
    beats: List[BeatInput] = field(default_factory=list)
    canon: Optional[CanonInput] = None
    canon_ref: Optional[str] = None
    editorial_status: str = "proposed"
    generator: Optional[str] = None
    model: Optional[str] = None
    profile_ref: Optional[str] = None

    def scanned_text(self) -> str:
        """Prose the prose layers inspect: scene texts then the top-level text."""

        parts = [s.text for s in self.scenes if s.text]
        if self.text:
            parts.append(self.text)
        return "\n\n".join(parts)

    def hash_parts(self) -> List[str]:
        """Stable material for the input hash."""

        parts = [
            self.project_id,
            self.artifact,
            self.text,
            json.dumps(
                [s.to_dict() for s in self.scenes], sort_keys=True, ensure_ascii=False
            ),
            json.dumps(
                [a.to_dict() for a in self.acts], sort_keys=True, ensure_ascii=False
            ),
            json.dumps(
                [b.to_dict() for b in self.beats], sort_keys=True, ensure_ascii=False
            ),
            json.dumps(
                self.canon.to_dict() if self.canon else {},
                sort_keys=True,
                ensure_ascii=False,
            ),
        ]
        return parts

    @classmethod
    def from_project_dict(cls, data: Dict[str, Any]) -> "IntegrityInput":
        """Best-effort adaptation of an existing project payload.

        Unrecognised shapes are left empty rather than guessed.
        """

        scenes: List[SceneInput] = []
        raw_scenes = data.get("scenes") or data.get("scene_breakdown") or []
        if isinstance(raw_scenes, dict):
            raw_scenes = raw_scenes.get("scenes", [])
        for position, raw in enumerate(raw_scenes if isinstance(raw_scenes, list) else []):
            if not isinstance(raw, dict):
                continue
            scenes.append(
                SceneInput(
                    index=int(raw.get("index", position)),
                    scene_id=str(raw.get("id") or raw.get("scene_id") or ""),
                    pov=raw.get("pov") or raw.get("point_of_view"),
                    location=raw.get("location"),
                    time_label=raw.get("time") or raw.get("time_label"),
                    characters=list(raw.get("characters") or []),
                    summary=str(
                        raw.get("summary")
                        or raw.get("description")
                        or raw.get("action")
                        or ""
                    ),
                    function=raw.get("function") or raw.get("purpose"),
                    text=str(raw.get("text") or raw.get("prose") or ""),
                )
            )

        canon_payload = data.get("canon") or {}
        if not isinstance(canon_payload, dict):
            canon_payload = {}
        entities = canon_payload.get("entities")
        if entities is None:
            entities = data.get("characters") or []
        canon = CanonInput(
            entities=[e for e in entities if isinstance(e, dict)] if isinstance(entities, list) else [],
            relations=[r for r in canon_payload.get("relations", []) if isinstance(r, dict)],
            timeline=[t for t in canon_payload.get("timeline", []) if isinstance(t, dict)],
            version=canon_payload.get("version"),
        )

        text = str(data.get("text") or data.get("prose") or "")
        return cls(
            project_id=str(data.get("project_id") or data.get("id") or "unknown"),
            artifact=str(data.get("artifact") or ""),
            text=text,
            scenes=scenes,
            canon=canon,
            canon_ref=canon_payload.get("version") or data.get("canonical_version_id"),
            editorial_status=str(data.get("editorial_status") or "proposed"),
            generator=data.get("generator"),
            model=data.get("model"),
            profile_ref=data.get("profile_ref"),
        )
