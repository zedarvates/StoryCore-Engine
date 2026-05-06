"""
StoryCore Knowledge Graph — GraphRAG Engine.

A lightweight, in-process Knowledge Graph that tracks narrative entities
(characters, locations, objects, events) and their semantic relationships.

This allows the RLM Reflection Loop to validate continuity and detect
plot holes without any external database dependency.

Architecture:
  - GraphNode  : A named entity with typed attributes and a vector fingerprint
  - GraphEdge  : A directed, labelled relationship between two nodes
  - StoryGraph : The in-process graph store, persisted as JSON on disk
  - GraphRAG   : High-level query API consumed by the RLM engine
"""

from __future__ import annotations

import json
import math
import re
import uuid
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------


@dataclass
class GraphNode:
    """A narrative entity in the knowledge graph."""

    id: str
    name: str
    entity_type: str  # "character" | "location" | "object" | "event"
    attributes: Dict[str, Any] = field(default_factory=dict)
    # Lightweight vector: character-frequency over a fixed 26-dim alphabet.
    # Replaced by a real embedding model when available.
    vector: List[float] = field(default_factory=list)

    def __post_init__(self):
        if not self.vector:
            self.vector = _text_vector(self.name + " " + self.entity_type)


@dataclass
class GraphEdge:
    """A directed, labelled relationship between two nodes."""

    id: str
    source_id: str
    target_id: str
    relation: str  # e.g. "ally_of", "enemy_of", "owns", "located_in"
    attributes: Dict[str, Any] = field(default_factory=dict)
    scene_context: Optional[str] = None  # Scene ID where this was established
    timestamp: Optional[int] = (
        None  # Logical ordering (scene number or sequential insert)
    )


# ---------------------------------------------------------------------------
# Tiny vector helpers (no ML dependency)
# ---------------------------------------------------------------------------


def _text_vector(text: str, dim: int = 26) -> List[float]:
    """
    Produces a normalised character-frequency vector.
    Fast, dependency-free, and good enough for fuzzy entity matching.
    For production, swap with a real sentence-embedding model.
    """
    text = text.lower()
    counts = [0.0] * dim
    for ch in text:
        if ch.isalpha():
            counts[ord(ch) - ord("a")] += 1.0
    norm = math.sqrt(sum(v * v for v in counts)) or 1.0
    return [v / norm for v in counts]


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(y * y for y in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


# ---------------------------------------------------------------------------
# Core graph store
# ---------------------------------------------------------------------------


class StoryGraph:
    """
    In-process Knowledge Graph, optionally persisted as JSON.

    All mutation methods return self for chaining.
    """

    def __init__(self, persistence_path: Optional[Path] = None):
        self._nodes: Dict[str, GraphNode] = {}
        self._edges: Dict[str, GraphEdge] = {}
        self._persistence_path = persistence_path
        if persistence_path and persistence_path.exists():
            self._load()

    # ------------------------------------------------------------------
    # Mutation
    # ------------------------------------------------------------------

    def add_node(
        self,
        name: str,
        entity_type: str,
        attributes: Optional[Dict[str, Any]] = None,
        node_id: Optional[str] = None,
    ) -> GraphNode:
        """Add or update a node by name (case-insensitive)."""
        existing = self._find_node_by_name(name)
        if existing:
            if attributes:
                existing.attributes.update(attributes)
            return existing

        node = GraphNode(
            id=node_id or str(uuid.uuid4()),
            name=name,
            entity_type=entity_type,
            attributes=attributes or {},
        )
        self._nodes[node.id] = node
        return node

    def add_edge(
        self,
        source_name: str,
        relation: str,
        target_name: str,
        source_type: str = "character",
        target_type: str = "character",
        attributes: Optional[Dict[str, Any]] = None,
        scene_context: Optional[str] = None,
    ) -> GraphEdge:
        """Add a directed relationship, creating nodes if they don't exist."""
        source = self.add_node(source_name, source_type)
        target = self.add_node(target_name, target_type)

        # Deduplicate: same source-relation-target
        for edge in self._edges.values():
            if (
                edge.source_id == source.id
                and edge.relation == relation
                and edge.target_id == target.id
            ):
                return edge

        edge = GraphEdge(
            id=str(uuid.uuid4()),
            source_id=source.id,
            target_id=target.id,
            relation=relation,
            attributes=attributes or {},
            scene_context=scene_context,
        )
        self._edges[edge.id] = edge
        return edge

    def remove_edge_by_relation(
        self, source_name: str, relation: str, target_name: str
    ):
        """Remove a specific relationship (e.g., when lore changes)."""
        src = self._find_node_by_name(source_name)
        tgt = self._find_node_by_name(target_name)
        if not src or not tgt:
            return
        to_delete = [
            eid
            for eid, e in self._edges.items()
            if e.source_id == src.id
            and e.relation == relation
            and e.target_id == tgt.id
        ]
        for eid in to_delete:
            del self._edges[eid]

    # ------------------------------------------------------------------
    # Graph traversal
    # ------------------------------------------------------------------

    def get_subgraph(
        self, entity_names: List[str], max_depth: int = 1
    ) -> Dict[str, Any]:
        """
        BFS from the named entities up to max_depth hops.

        Returns a dict with:
          nodes  : list of (name, type, attributes)
          edges  : list of (source_name, relation, target_name, scene_context)
        """
        seed_ids = set()
        for name in entity_names:
            node = self._find_node_by_name(name)
            if node:
                seed_ids.add(node.id)

        visited_ids: set = set()
        frontier: set = seed_ids.copy()

        for _ in range(max_depth):
            next_frontier: set = set()
            for nid in frontier:
                if nid in visited_ids:
                    continue
                visited_ids.add(nid)
                # Expand outgoing and incoming edges
                for edge in self._edges.values():
                    if edge.source_id == nid:
                        next_frontier.add(edge.target_id)
                    if edge.target_id == nid:
                        next_frontier.add(edge.source_id)
            frontier = next_frontier - visited_ids

        visited_ids |= frontier

        result_nodes = []
        for nid in visited_ids:
            node = self._nodes.get(nid)
            if node:
                result_nodes.append(
                    {
                        "name": node.name,
                        "type": node.entity_type,
                        "attributes": node.attributes,
                    }
                )

        result_edges = []
        for edge in self._edges.values():
            if edge.source_id in visited_ids and edge.target_id in visited_ids:
                src = self._nodes.get(edge.source_id)
                tgt = self._nodes.get(edge.target_id)
                if src and tgt:
                    result_edges.append(
                        {
                            "source": src.name,
                            "relation": edge.relation,
                            "target": tgt.name,
                            "scene_context": edge.scene_context,
                        }
                    )

        return {"nodes": result_nodes, "edges": result_edges}

    # ------------------------------------------------------------------
    # Semantic (vector) fuzzy search
    # ------------------------------------------------------------------

    def find_similar_entities(
        self, query: str, top_k: int = 5
    ) -> List[Tuple[str, float]]:
        """
        Return the top-k nodes most similar to the query string by cosine similarity.
        """
        query_vec = _text_vector(query)
        scored = [
            (node.name, _cosine_similarity(query_vec, node.vector))
            for node in self._nodes.values()
        ]
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]

    # ------------------------------------------------------------------
    # Consistency checker
    # ------------------------------------------------------------------

    def detect_contradictions(self, candidate_edges: List[Dict]) -> List[str]:
        """
        Given a list of proposed new relationships, detect contradictions with
        existing graph data.

        candidate_edges format: [{"source": str, "relation": str, "target": str}]
        Returns a list of human-readable contradiction messages.
        """
        contradictions = []
        mutex_relations = {
            "ally_of": "enemy_of",
            "enemy_of": "ally_of",
            "owns": "lost",
            "alive": "dead",
            "dead": "alive",
        }

        for candidate in candidate_edges:
            src_node = self._find_node_by_name(candidate.get("source", ""))
            tgt_node = self._find_node_by_name(candidate.get("target", ""))
            if not src_node or not tgt_node:
                continue

            opposite = mutex_relations.get(candidate["relation"])
            if not opposite:
                continue

            for edge in self._edges.values():
                if (
                    edge.source_id == src_node.id
                    and edge.relation == opposite
                    and edge.target_id == tgt_node.id
                ):
                    contradictions.append(
                        f"CONTRADICTION: '{src_node.name}' cannot be "
                        f"'{candidate['relation']}' to '{tgt_node.name}' "
                        f"because an existing '{opposite}' relationship was "
                        f"established in scene '{edge.scene_context or 'unknown'}'."
                    )

        return contradictions

    # ------------------------------------------------------------------
    # Bulk ingest from project data
    # ------------------------------------------------------------------

    def ingest_project(self, project_data: Dict) -> "StoryGraph":
        """
        Populate the graph from an existing StoryCore project dict
        (characters, scenes, sequences).
        """
        characters = project_data.get("characters", [])
        scenes = project_data.get("scenes", [])

        # Add character nodes
        for char in characters:
            node = self.add_node(
                name=char.get("name", "Unknown"),
                entity_type="character",
                attributes={
                    "role": char.get("role"),
                    "personality": char.get("personality"),
                    "appearance": char.get("appearance"),
                },
            )
            # Self-relationship: alive by default
            self.add_edge(
                node.name,
                "status",
                "alive",
                source_type="character",
                target_type="state",
            )

        # Add scene nodes and location edges
        for scene in scenes:
            scene_node = self.add_node(
                name=scene.get("title", "Scene"),
                entity_type="event",
                attributes={
                    "description": scene.get("description"),
                    "time_of_day": scene.get("time_of_day"),
                },
            )
            loc = scene.get("location")
            if loc:
                self.add_node(loc, entity_type="location")
                self.add_edge(
                    source_name=scene_node.name,
                    relation="located_in",
                    target_name=loc,
                    source_type="event",
                    target_type="location",
                    scene_context=scene.get("id"),
                )
            for char_name in scene.get("characters", []):
                self.add_edge(
                    source_name=char_name,
                    relation="appears_in",
                    target_name=scene_node.name,
                    source_type="character",
                    target_type="event",
                    scene_context=scene.get("id"),
                )

        return self

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def save(self):
        """Persist the graph to disk as JSON."""
        if not self._persistence_path:
            return
        self._persistence_path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "nodes": {nid: asdict(n) for nid, n in self._nodes.items()},
            "edges": {eid: asdict(e) for eid, e in self._edges.items()},
        }
        with open(self._persistence_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def _load(self):
        with open(self._persistence_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        for nid, nd in data.get("nodes", {}).items():
            self._nodes[nid] = GraphNode(**nd)
        for eid, ed in data.get("edges", {}).items():
            self._edges[eid] = GraphEdge(**ed)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _find_node_by_name(self, name: str) -> Optional[GraphNode]:
        name_lower = name.lower()
        for node in self._nodes.values():
            if node.name.lower() == name_lower:
                return node
        return None

    def stats(self) -> Dict[str, Any]:
        """Detailed graph statistics including entity type breakdown."""
        type_counts: Dict[str, int] = {}
        for node in self._nodes.values():
            type_counts[node.entity_type] = type_counts.get(node.entity_type, 0) + 1

        relation_types = set(e.relation for e in self._edges.values())
        return {
            "nodes": len(self._nodes),
            "edges": len(self._edges),
            "types": type_counts,
            "unique_relations": len(relation_types),
        }

    # ------------------------------------------------------------------
    # Character Arc & Timeline
    # ------------------------------------------------------------------

    def get_character_arc(self, character_name: str) -> List[Dict[str, Any]]:
        """
        Track how a character evolves across scenes.
        Returns a chronological list of events and relationship changes.
        """
        char_node = self._find_node_by_name(character_name)
        if not char_node:
            return []

        arc_events: List[Dict[str, Any]] = []
        for edge in self._edges.values():
            if edge.source_id == char_node.id or edge.target_id == char_node.id:
                other_id = (
                    edge.target_id if edge.source_id == char_node.id else edge.source_id
                )
                other_node = self._nodes.get(other_id)
                if other_node:
                    arc_events.append(
                        {
                            "scene": edge.scene_context,
                            "relation": edge.relation,
                            "direction": "outgoing"
                            if edge.source_id == char_node.id
                            else "incoming",
                            "other_entity": other_node.name,
                            "other_type": other_node.entity_type,
                            "timestamp": edge.timestamp or 0,
                        }
                    )

        # Sort by timestamp or scene reference
        arc_events.sort(key=lambda x: x["timestamp"])
        return arc_events

    def get_timeline(self) -> List[Dict[str, Any]]:
        """
        Reconstruct the narrative timeline from scene events.
        Groups edges by scene_context and provides a chronological summary.
        """
        scene_map: Dict[str, List[Dict[str, Any]]] = {}

        for edge in self._edges.values():
            scene_key = edge.scene_context or "unknown"
            src = self._nodes.get(edge.source_id)
            tgt = self._nodes.get(edge.target_id)
            if not src or not tgt:
                continue

            if scene_key not in scene_map:
                scene_map[scene_key] = []

            scene_map[scene_key].append(
                {
                    "source": src.name,
                    "relation": edge.relation,
                    "target": tgt.name,
                    "timestamp": edge.timestamp or 0,
                }
            )

        timeline = []
        for scene_key, events in sorted(
            scene_map.items(), key=lambda x: min(e["timestamp"] for e in x[1])
        ):
            # Find the scene node if it exists
            scene_node = self._find_node_by_name(scene_key)
            scene_info = scene_node.attributes if scene_node else {}

            characters_involved = set()
            for evt in events:
                characters_involved.add(evt["source"])
                characters_involved.add(evt["target"])

            timeline.append(
                {
                    "scene": scene_key,
                    "scene_details": scene_info,
                    "characters": list(characters_involved),
                    "events": events,
                }
            )

        return timeline


# ---------------------------------------------------------------------------
# High-level GraphRAG API
# ---------------------------------------------------------------------------


class GraphRAG:
    """
    High-level interface consumed by the RLM engine.

    Wraps StoryGraph with serialised query/answer methods that the
    RLM Reflection module can call directly.
    """

    def __init__(self, graph: StoryGraph):
        self.graph = graph

    def query(self, entities: List[str], max_depth: int = 1) -> str:
        """
        Translate a graph subgraph into a human-readable, LLM-digestible text block.
        Called by RLMEngine.process() during the Reflection step.
        """
        if not entities:
            return "Knowledge Graph is empty or no entities specified."

        subgraph = self.graph.get_subgraph(entities, max_depth)
        nodes = subgraph["nodes"]
        edges = subgraph["edges"]

        if not nodes and not edges:
            similar = self.graph.find_similar_entities(" ".join(entities), top_k=3)
            if similar:
                hints = ", ".join(f"'{n}' ({s:.2f})" for n, s in similar)
                return (
                    f"No exact match for {entities}. Closest known entities: {hints}."
                )
            return f"No known entities for {entities} in the Knowledge Graph."

        lines: List[str] = [
            f"Knowledge Graph — {len(nodes)} nodes, {len(edges)} edges:\n"
        ]

        for node in nodes:
            attrs = ", ".join(f"{k}={v}" for k, v in node["attributes"].items() if v)
            lines.append(
                f"  [{node['type'].upper()}] {node['name']}"
                + (f" ({attrs})" if attrs else "")
            )

        lines.append("\nRelationships:")
        for edge in edges:
            ctx = (
                f" [scene: {edge['scene_context']}]"
                if edge.get("scene_context")
                else ""
            )
            lines.append(
                f"  {edge['source']}  --{edge['relation']}-->  {edge['target']}{ctx}"
            )

        return "\n".join(lines)

    def check_consistency(self, generated_text: str) -> str:
        """
        Heuristically extract proposed relationships from generated text and
        check them against the graph for contradictions.
        Returns human-readable warnings for the Reflection module.
        """
        # Extended extraction patterns (English + French common patterns)
        patterns = [
            (r"(\w+)\s+is the enemy of\s+(\w+)", "enemy_of"),
            (r"(\w+)\s+is an ally of\s+(\w+)", "ally_of"),
            (r"(\w+)\s+owns\s+the\s+(\w+)", "owns"),
            (r"(\w+)\s+is dead", "dead"),
            (r"(\w+)\s+is alive", "alive"),
            (r"(\w+)\s+betrays?\s+(\w+)", "enemy_of"),
            (r"(\w+)\s+loves?\s+(\w+)", "ally_of"),
            (r"(\w+)\s+possesses?\s+(?:the\s+)?(\w+)", "owns"),
            (r"(\w+)\s+(?:is|was)\s+(?:in|at)\s+(?:the\s+)?(\w+)", "located_in"),
            (r"(\w+)\s+(?:arrives?|enters?)\s+(?:the\s+)?(\w+)", "located_in"),
            (r"(\w+)\s+(?:knows?|remembers?)\s+(\w+)", "knows"),
            (r"(\w+)\s+(?:fears?|dreads?)\s+(\w+)", "fears"),
        ]

        candidates = []
        for pattern, relation in patterns:
            for match in re.finditer(pattern, generated_text, re.IGNORECASE):
                groups = match.groups()
                if len(groups) == 2:
                    candidates.append(
                        {"source": groups[0], "relation": relation, "target": groups[1]}
                    )
                elif len(groups) == 1:
                    candidates.append(
                        {"source": groups[0], "relation": relation, "target": groups[0]}
                    )

        if not candidates:
            return "No relational patterns detected in the generated text — consistency looks fine."

        contradictions = self.graph.detect_contradictions(candidates)
        if contradictions:
            severity = "CRITICAL" if len(contradictions) > 2 else "WARNING"
            return (
                f"⚠️ CONSISTENCY {severity} ({len(contradictions)} issues):\n"
                + "\n".join(f"  • {c}" for c in contradictions)
            )

        return f"✅ No contradictions detected — {len(candidates)} relationships verified against Knowledge Graph."

    def query_character_arc(self, character_name: str) -> str:
        """
        Produce a human-readable summary of a character's narrative arc.
        Used by the RLM engine when exploring character development.
        """
        arc = self.graph.get_character_arc(character_name)
        if not arc:
            return f"No arc data found for character '{character_name}' in the Knowledge Graph."

        lines = [f"Character Arc for '{character_name}' ({len(arc)} events):\n"]

        for event in arc:
            direction = "→" if event["direction"] == "outgoing" else "←"
            scene_label = f"[Scene: {event['scene']}]" if event["scene"] else ""
            lines.append(
                f"  {direction} {event['relation']} {event['other_entity']} "
                f"({event['other_type']}) {scene_label}"
            )

        return "\n".join(lines)

    def query_timeline(self) -> str:
        """
        Produce a narrative timeline summary from the Knowledge Graph.
        """
        timeline = self.graph.get_timeline()
        if not timeline:
            return "No timeline data available in the Knowledge Graph."

        lines = [f"Narrative Timeline — {len(timeline)} scene groups:\n"]

        for i, scene_block in enumerate(timeline, 1):
            scene_name = scene_block["scene"]
            chars = ", ".join(scene_block["characters"][:5])
            details = scene_block.get("scene_details", {})
            desc = details.get("description", "")

            lines.append(f"  ── Scene {i}: {scene_name} ──")
            if desc:
                lines.append(f"     {desc}")
            lines.append(f"     Characters: {chars}")
            for evt in scene_block["events"][:3]:
                lines.append(
                    f"       • {evt['source']} --{evt['relation']}--> {evt['target']}"
                )
            if len(scene_block["events"]) > 3:
                lines.append(
                    f"       ... and {len(scene_block['events']) - 3} more events"
                )
            lines.append("")

        return "\n".join(lines)
