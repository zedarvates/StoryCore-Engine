"""Adapters from existing StoryCore structures into the engine's contracts.

Reuse over rewrite: the narrative knowledge graph already holds entities, relations
and a logical ordering, so the canon layer consumes it through a thin, explicit
adapter instead of duplicating that store.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from .input_model import CanonInput


class UnsupportedGraphSource(TypeError):
    """The object does not expose a narrative graph this adapter understands."""


def _nodes_and_edges(graph: Any) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """StoryGraph keeps its stores private and exposes no enumeration.

    Access is therefore explicit and guarded: an unexpected object fails loudly rather
    than silently producing an empty canon.
    """

    nodes = getattr(graph, "_nodes", None)
    edges = getattr(graph, "_edges", None)
    if isinstance(nodes, dict) and isinstance(edges, dict):
        return nodes, edges
    raise UnsupportedGraphSource(
        "expected a StoryGraph-like object exposing _nodes and _edges mappings"
    )


def canon_from_story_graph(graph: Any, version: Optional[str] = None) -> CanonInput:
    """Convert a StoryGraph into the canon contract.

    Node names become entities, declared aliases are preserved, and directed edges
    become subject-predicate-object relations. The timeline is built from distinct edge
    timestamps only: equal timestamps are a normal consequence of several facts being
    established in one scene, and must not be mistaken for an ambiguous chronology.
    """

    nodes, edges = _nodes_and_edges(graph)
    name_by_id: Dict[str, str] = {}
    entities: List[Dict[str, Any]] = []

    for node in nodes.values():
        name_by_id[node.id] = node.name
        aliases: List[str] = []
        attributes = getattr(node, "attributes", None)
        if isinstance(attributes, dict):
            raw = attributes.get("aliases") or []
            if isinstance(raw, (list, tuple)):
                aliases = [str(alias) for alias in raw]
        entities.append(
            {"name": node.name, "kind": node.entity_type, "aliases": aliases}
        )

    relations: List[Dict[str, Any]] = []
    contexts_by_order: Dict[int, List[str]] = {}
    for edge in edges.values():
        subject = name_by_id.get(edge.source_id)
        obj = name_by_id.get(edge.target_id)
        if subject is None or obj is None:
            continue
        relations.append(
            {
                "subject": subject,
                "predicate": edge.relation,
                "object": obj,
                "scene": edge.scene_context,
            }
        )
        if edge.timestamp is not None:
            order = int(edge.timestamp)
            contexts = contexts_by_order.setdefault(order, [])
            if edge.scene_context and edge.scene_context not in contexts:
                contexts.append(edge.scene_context)

    timeline: List[Dict[str, Any]] = []
    if len(contexts_by_order) >= 2:
        timeline = [
            {
                "label": ", ".join(contexts_by_order[order]) or ("order " + str(order)),
                "order": order,
            }
            for order in sorted(contexts_by_order)
        ]

    return CanonInput(
        entities=entities, relations=relations, timeline=timeline, version=version
    )
