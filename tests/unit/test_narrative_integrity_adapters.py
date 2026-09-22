"""The canon adapter consumes the existing narrative graph without duplicating it."""

import pytest

from src.assistant.knowledge_graph import GraphEdge, GraphNode, StoryGraph
from src.narrative_integrity import IntegrityInput, NarrativeIntegrityEngine, SceneInput
from src.narrative_integrity.adapters import (
    UnsupportedGraphSource,
    canon_from_story_graph,
)


class StubGraph:
    """A minimal store shaped like StoryGraph, built from its real dataclasses.

    Used where the adapter must react to logical ordering that StoryGraph.add_edge
    does not itself assign.
    """

    def __init__(self, nodes, edges):
        self._nodes = {node.id: node for node in nodes}
        self._edges = {edge.id: edge for edge in edges}


def stub_graph(ordered_edges):
    nodes = [
        GraphNode(id="n1", name="Ida", entity_type="character"),
        GraphNode(id="n2", name="Lyon", entity_type="location"),
    ]
    edges = [
        GraphEdge(
            id="e" + str(position),
            source_id="n1",
            target_id="n2",
            relation="visits",
            scene_context=context,
            timestamp=order,
        )
        for position, (order, context) in enumerate(ordered_edges)
    ]
    return StubGraph(nodes, edges)


def build_real_graph():
    graph = StoryGraph()
    graph.add_node("Ida", "character", {"aliases": ["Ida Voss"]})
    graph.add_node("Lyon", "location")
    graph.add_edge(
        "Ida",
        "lives_in",
        "Lyon",
        source_type="character",
        target_type="location",
        scene_context="s1",
    )
    graph.add_edge(
        "Ida",
        "visits",
        "Lyon",
        source_type="character",
        target_type="location",
        scene_context="s2",
    )
    return graph


def test_nodes_become_entities_with_their_aliases():
    canon = canon_from_story_graph(build_real_graph(), version="graph-v1")
    assert canon.version == "graph-v1"
    names = canon.entity_names()
    assert "Ida" in names
    assert "Ida Voss" in names
    assert "Lyon" in names


def test_edges_become_relations():
    canon = canon_from_story_graph(build_real_graph())
    triples = [tuple(triple) for triple in canon.relation_triples()]
    assert ("Ida", "lives_in", "Lyon") in triples
    assert ("Ida", "visits", "Lyon") in triples


def test_real_graph_without_timestamps_produces_no_invented_timeline():
    # StoryGraph.add_edge leaves the logical ordering unset. The adapter must not
    # manufacture an order out of insertion sequence: that would be a claim, not a fact.
    canon = canon_from_story_graph(build_real_graph())
    assert canon.timeline == []


def test_distinct_timestamps_become_a_timeline():
    canon = canon_from_story_graph(stub_graph([(1, "s1"), (2, "s2")]))
    assert [entry["order"] for entry in canon.timeline] == [1, 2]
    assert canon.timeline[0]["label"] == "s1"


def test_equal_timestamps_never_invent_an_ambiguous_chronology():
    canon = canon_from_story_graph(stub_graph([(1, "s1"), (1, "s2")]))
    assert canon.timeline == [], "one logical instant is not an ambiguous order"


def test_a_single_instant_is_not_a_timeline():
    canon = canon_from_story_graph(stub_graph([(1, "s1"), (1, "s2"), (1, "s3")]))
    assert canon.timeline == []


def test_edges_pointing_outside_the_graph_are_skipped():
    nodes = [GraphNode(id="n1", name="Ida", entity_type="character")]
    edges = [
        GraphEdge(id="e0", source_id="n1", target_id="missing", relation="visits")
    ]
    canon = canon_from_story_graph(StubGraph(nodes, edges))
    assert canon.relation_triples() == []


def test_unknown_source_fails_loudly():
    with pytest.raises(UnsupportedGraphSource):
        canon_from_story_graph(object())


def test_adapted_canon_feeds_the_engine():
    engine = NarrativeIntegrityEngine()
    canon = canon_from_story_graph(build_real_graph(), version="graph-v1")
    report = engine.run(
        IntegrityInput(
            project_id="p",
            artifact="a",
            text="Un texte neutre pour la mesure du canon.",
            canon=canon,
            canon_ref=canon.version,
            scenes=[SceneInput(index=0, characters=["Ida", "Sylvain"], function="goal")],
        ),
        now="2026-09-21T00:00:00",
    )
    unknown = [f for f in report.findings if f.detector_id == "canon.unknown_entity"]
    assert unknown, "Sylvain is declared in a scene but absent from the graph"
    assert unknown[0].evidence[0].excerpt == "sylvain"
    assert report.canon_ref == "graph-v1"
