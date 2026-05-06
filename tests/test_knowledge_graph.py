"""
Comprehensive test for StoryCore Knowledge Graph & GraphRAG.

Tests:
  - Node and edge creation
  - Deduplication
  - Subgraph traversal (BFS)
  - Fuzzy vector search
  - Contradiction detection
  - Character arc tracking
  - Timeline reconstruction
  - GraphRAG query formatting
  - GraphRAG consistency check (extended patterns)
  - Project data ingestion
  - Persistence (save/load)
"""

import tempfile
from pathlib import Path

from src.assistant.knowledge_graph import (
    StoryGraph,
    GraphRAG,
    _text_vector,
    _cosine_similarity,
)


class TestVectorHelpers:
    def test_text_vector_dimension(self):
        vec = _text_vector("hello")
        assert len(vec) == 26, f"Expected 26 dimensions, got {len(vec)}"

    def test_text_vector_normalized(self):
        import math

        vec = _text_vector("test")
        mag = math.sqrt(sum(v * v for v in vec))
        assert abs(mag - 1.0) < 0.001, f"Vector not normalized: {mag}"

    def test_cosine_similarity_identical(self):
        vec = _text_vector("wizard")
        sim = _cosine_similarity(vec, vec)
        assert abs(sim - 1.0) < 0.001, f"Self-similarity should be 1.0, got {sim}"

    def test_cosine_similarity_different(self):
        a = _text_vector("aaaa")
        b = _text_vector("zzzz")
        sim = _cosine_similarity(a, b)
        assert sim < 0.1, f"Dissimilar vectors should have low similarity: {sim}"


class TestStoryGraphNodes:
    def test_add_node(self):
        g = StoryGraph()
        node = g.add_node("Gandalf", "character")
        assert node.name == "Gandalf"
        assert node.entity_type == "character"

    def test_deduplication(self):
        g = StoryGraph()
        n1 = g.add_node("Gandalf", "character")
        n2 = g.add_node("gandalf", "character", {"role": "wizard"})
        assert n1.id == n2.id, "Same name (case-insensitive) should return same node"
        assert n2.attributes.get("role") == "wizard", "Attributes should be merged"

    def test_multiple_types(self):
        g = StoryGraph()
        g.add_node("Gandalf", "character")
        g.add_node("Rivendell", "location")
        g.add_node("The Ring", "object")
        assert g.stats()["nodes"] == 3


class TestStoryGraphEdges:
    def test_add_edge(self):
        g = StoryGraph()
        edge = g.add_edge("Gandalf", "ally_of", "Frodo")
        assert edge.relation == "ally_of"

    def test_edge_deduplication(self):
        g = StoryGraph()
        e1 = g.add_edge("Gandalf", "ally_of", "Frodo")
        e2 = g.add_edge("Gandalf", "ally_of", "Frodo")
        assert e1.id == e2.id, "Duplicate edge should return same object"

    def test_remove_edge(self):
        g = StoryGraph()
        g.add_edge("Gandalf", "enemy_of", "Sauron")
        g.remove_edge_by_relation("Gandalf", "enemy_of", "Sauron")
        assert g.stats()["edges"] == 0


class TestSubgraph:
    def test_depth_1(self):
        g = StoryGraph()
        g.add_edge("Gandalf", "ally_of", "Frodo")
        g.add_edge("Frodo", "carries", "The Ring")
        g.add_edge("Sauron", "enemy_of", "Gandalf")

        sub = g.get_subgraph(["Gandalf"], max_depth=1)
        names = {n["name"] for n in sub["nodes"]}
        assert "Gandalf" in names
        assert "Frodo" in names
        assert "Sauron" in names

    def test_depth_0(self):
        g = StoryGraph()
        g.add_edge("A", "x", "B")
        sub = g.get_subgraph(["A"], max_depth=0)
        # Depth 0 should only visit the seed itself
        names = {n["name"] for n in sub["nodes"]}
        assert "A" in names


class TestContradictionDetection:
    def test_detect_ally_enemy(self):
        g = StoryGraph()
        g.add_edge("Gandalf", "ally_of", "Frodo")

        contradictions = g.detect_contradictions(
            [{"source": "Gandalf", "relation": "enemy_of", "target": "Frodo"}]
        )
        assert len(contradictions) == 1
        assert "CONTRADICTION" in contradictions[0]

    def test_no_contradiction(self):
        g = StoryGraph()
        g.add_edge("Gandalf", "ally_of", "Frodo")

        contradictions = g.detect_contradictions(
            [{"source": "Gandalf", "relation": "ally_of", "target": "Aragorn"}]
        )
        assert len(contradictions) == 0


class TestCharacterArc:
    def test_arc_tracking(self):
        g = StoryGraph()
        g.add_edge("Frodo", "ally_of", "Gandalf", scene_context="scene_1")
        g.add_edge(
            "Frodo",
            "carries",
            "The Ring",
            source_type="character",
            target_type="object",
            scene_context="scene_1",
        )
        g.add_edge(
            "Frodo",
            "appears_in",
            "Mordor",
            source_type="character",
            target_type="location",
            scene_context="scene_3",
        )

        arc = g.get_character_arc("Frodo")
        assert len(arc) == 3, f"Expected 3 arc events, got {len(arc)}"
        # All should reference Frodo's connections
        other_entities = {e["other_entity"] for e in arc}
        assert "Gandalf" in other_entities
        assert "The Ring" in other_entities

    def test_arc_for_unknown_character(self):
        g = StoryGraph()
        arc = g.get_character_arc("Nobody")
        assert arc == []


class TestTimeline:
    def test_timeline_reconstruction(self):
        g = StoryGraph()
        g.add_edge("Frodo", "appears_in", "Shire", scene_context="scene_1")
        g.add_edge("Gandalf", "appears_in", "Shire", scene_context="scene_1")
        g.add_edge("Frodo", "appears_in", "Mordor", scene_context="scene_2")

        timeline = g.get_timeline()
        assert len(timeline) >= 2, (
            f"Expected at least 2 scene groups, got {len(timeline)}"
        )


class TestGraphRAG:
    def _build_test_graph(self):
        g = StoryGraph()
        g.add_edge("Gandalf", "ally_of", "Frodo", scene_context="scene_1")
        g.add_edge("Sauron", "enemy_of", "Gandalf", scene_context="scene_2")
        g.add_node("Rivendell", "location", {"description": "Elven city"})
        g.add_edge(
            "Gandalf",
            "located_in",
            "Rivendell",
            source_type="character",
            target_type="location",
            scene_context="scene_1",
        )
        return GraphRAG(g)

    def test_query_with_results(self):
        rag = self._build_test_graph()
        result = rag.query(["Gandalf"], max_depth=1)
        assert "Gandalf" in result
        assert "Knowledge Graph" in result

    def test_query_no_results(self):
        rag = self._build_test_graph()
        result = rag.query(["UnknownPerson"])
        assert "No exact match" in result or "No known entities" in result

    def test_consistency_clean(self):
        rag = self._build_test_graph()
        result = rag.check_consistency("Gandalf is an ally of Frodo.")
        assert "✅" in result

    def test_consistency_contradiction(self):
        rag = self._build_test_graph()
        result = rag.check_consistency("Gandalf is the enemy of Frodo.")
        assert "⚠️" in result

    def test_consistency_extended_patterns(self):
        rag = self._build_test_graph()
        # Test betrayal pattern (should map to 'enemy_of')
        result = rag.check_consistency("Gandalf betrays Frodo.")
        assert "⚠️" in result  # Gandalf is currently ally_of Frodo

    def test_character_arc_query(self):
        rag = self._build_test_graph()
        result = rag.query_character_arc("Gandalf")
        assert "Character Arc" in result
        assert "Gandalf" in result

    def test_timeline_query(self):
        rag = self._build_test_graph()
        result = rag.query_timeline()
        assert "Timeline" in result or "timeline" in result.lower()


class TestPersistence:
    def test_save_and_load(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "test_graph.json"

            # Create and save
            g1 = StoryGraph(persistence_path=path)
            g1.add_node("Gandalf", "character", {"role": "wizard"})
            g1.add_edge("Gandalf", "ally_of", "Frodo")
            g1.save()

            assert path.exists(), "Graph file should exist after save"

            # Load into new graph
            g2 = StoryGraph(persistence_path=path)
            assert g2.stats()["nodes"] == g1.stats()["nodes"]
            assert g2.stats()["edges"] == g1.stats()["edges"]

            # Check data integrity
            node = g2._find_node_by_name("Gandalf")
            assert node is not None
            assert node.attributes.get("role") == "wizard"


class TestProjectIngestion:
    def test_ingest_full_project(self):
        g = StoryGraph()
        project_data = {
            "characters": [
                {
                    "name": "Alex",
                    "role": "protagonist",
                    "personality": "brave",
                    "appearance": "tall",
                },
                {
                    "name": "ARIA",
                    "role": "antagonist",
                    "personality": "cold",
                    "appearance": "holographic",
                },
            ],
            "scenes": [
                {
                    "id": "s1",
                    "title": "Discovery",
                    "description": "Alex finds ARIA",
                    "location": "Lab",
                    "time_of_day": "night",
                    "characters": ["Alex"],
                },
                {
                    "id": "s2",
                    "title": "Confrontation",
                    "description": "Showdown",
                    "location": "Server Room",
                    "time_of_day": "night",
                    "characters": ["Alex", "ARIA"],
                },
            ],
        }
        g.ingest_project(project_data)

        stats = g.stats()
        assert stats["nodes"] >= 4, (
            f"Should have at least 4 nodes (2 chars, 2 scenes, locations), got {stats['nodes']}"
        )
        assert stats["edges"] >= 2, (
            f"Should have edges for relationships, got {stats['edges']}"
        )

        # Check characters exist
        assert g._find_node_by_name("Alex") is not None
        assert g._find_node_by_name("ARIA") is not None

        # Check locations exist
        assert g._find_node_by_name("Lab") is not None
        assert g._find_node_by_name("Server Room") is not None


def run_all_tests():
    """Run all tests and print results."""
    test_classes = [
        TestVectorHelpers,
        TestStoryGraphNodes,
        TestStoryGraphEdges,
        TestSubgraph,
        TestContradictionDetection,
        TestCharacterArc,
        TestTimeline,
        TestGraphRAG,
        TestPersistence,
        TestProjectIngestion,
    ]

    total = 0
    passed = 0
    failed = 0
    errors = []

    for cls in test_classes:
        instance = cls()
        methods = [m for m in dir(instance) if m.startswith("test_")]
        for method_name in methods:
            total += 1
            try:
                getattr(instance, method_name)()
                passed += 1
                print(f"  ✅ {cls.__name__}.{method_name}")
            except Exception as e:
                failed += 1
                errors.append(f"  ❌ {cls.__name__}.{method_name}: {e}")
                print(f"  ❌ {cls.__name__}.{method_name}: {e}")

    print(f"\n{'=' * 60}")
    print(f"Results: {passed}/{total} passed, {failed} failed")
    if errors:
        print("\nFailed tests:")
        for err in errors:
            print(err)
    print(f"{'=' * 60}")
    return failed == 0


if __name__ == "__main__":
    print("=" * 60)
    print("StoryCore Knowledge Graph — Full Test Suite")
    print("=" * 60)
    success = run_all_tests()
    exit(0 if success else 1)
