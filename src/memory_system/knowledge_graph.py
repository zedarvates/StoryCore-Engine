"""
Knowledge Graph Manager - Handles non-linear entity relationships for the Memory System.

This module provides a graph-based representation of characters, locations, 
and objects to ensure narrative consistency across a story.
"""

import json
from pathlib import Path
from typing import Dict, List, Optional, Set, Any
from dataclasses import dataclass, asdict, field
import uuid
from datetime import datetime

@dataclass
class EntityNode:
    id: str
    name: str
    type: str  # 'character', 'location', 'object', 'event'
    attributes: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class RelationshipEdge:
    source_id: str
    target_id: str
    type: str  # 'friends_with', 'located_in', 'owns', 'witnessed', 'loves', 'hates', 'trusts', 'fears', 'rival_of', 'betrayed'
    strength: float = 1.0  # 0.0 to 1.0
    sentiment: float = 0.0  # -1.0 (negative) to 1.0 (positive)
    metadata: Dict[str, Any] = field(default_factory=dict)

class KnowledgeGraphManager:
    """
    Manages the knowledge graph for a project.
    Persists data to knowledge_graph.json in the project directory.
    """
    
    def __init__(self, project_path: Path):
        self.project_path = Path(project_path)
        self.graph_file = self.project_path / "memory" / "knowledge_graph.json"
        self.nodes: Dict[str, EntityNode] = {}
        self.edges: List[RelationshipEdge] = []
        
        # Load existing graph if available
        self.load_graph()

    def add_node(self, name: str, node_type: str, attributes: Dict[str, Any] = None) -> str:
        """Add an entity node to the graph."""
        node_id = str(uuid.uuid4())
        node = EntityNode(
            id=node_id,
            name=name,
            type=node_type,
            attributes=attributes or {},
            metadata={'created_at': datetime.now().isoformat()}
        )
        self.nodes[node_id] = node
        self.save_graph()
        return node_id

    def add_relationship(self, source_id: str, target_id: str, rel_type: str, strength: float = 1.0) -> bool:
        """Add a relationship edge between two nodes."""
        if source_id not in self.nodes or target_id not in self.nodes:
            return False
        
        edge = RelationshipEdge(
            source_id=source_id,
            target_id=target_id,
            type=rel_type,
            strength=strength,
            metadata={'created_at': datetime.now().isoformat()}
        )
        self.edges.append(edge)
        self.save_graph()
        return True

    def get_related_entities(self, node_id: str, max_depth: int = 1) -> List[Dict[str, Any]]:
        """Get entities related to a specific node."""
        if node_id not in self.nodes:
            return []
            
        related = []
        # Simple BFS search for depth 1 (MVP)
        for edge in self.edges:
            if edge.source_id == node_id:
                target = self.nodes[edge.target_id]
                related.append({
                    'node': asdict(target),
                    'relationship': edge.type,
                    'direction': 'outgoing'
                })
            elif edge.target_id == node_id:
                source = self.nodes[edge.source_id]
                related.append({
                    'node': asdict(source),
                    'relationship': edge.type,
                    'direction': 'incoming'
                })
        return related

    def find_node_by_name(self, name: str, node_type: str = None) -> Optional[EntityNode]:
        """Find a node by its name and optional type."""
        for node in self.nodes.values():
            if node.name.lower() == name.lower():
                if node_type is None or node.type == node_type:
                    return node
        return None

    def get_context_summary(self, entity_name: str) -> str:
        """Get a textual summary of an entity's context for LLM prompt injection."""
        node = self.find_node_by_name(entity_name)
        if not node:
            return f"No context found for {entity_name}."
            
        related = self.get_related_entities(node.id)
        if not related:
            return f"{entity_name} is a {node.type} with no recorded relationships."
            
        summary = [f"Context for {entity_name} ({node.type}):"]
        for rel in related:
            other_node = rel['node']
            rel_type = rel['relationship']
            direction = rel['direction']
            
            if direction == 'outgoing':
                summary.append(f"- {rel_type} {other_node['name']} ({other_node['type']})")
            else:
                summary.append(f"- {other_node['name']} ({other_node['type']}) recorded as {rel_type} {entity_name}")
                
        return "\n".join(summary)
        
    def get_emotional_landscape(self, entity_name: str) -> str:
        """
        Get a summary specifically focused on emotional dynamics between characters.
        Useful for dialogue generation and character arc consistency.
        """
        node = self.find_node_by_name(entity_name, 'character')
        if not node:
            return f"No emotional data for character {entity_name}."
            
        related = self.get_related_entities(node.id)
        emotional_rels = [r for r in related if r['relationship'] in ['loves', 'hates', 'trusts', 'fears', 'rival_of', 'betrayed', 'friends_with']]
        
        if not emotional_rels:
            return f"{entity_name} has no recorded emotional ties or significant interpersonal dynamics."
            
        summary = [f"Emotional Landscape of {entity_name}:"]
        for rel in emotional_rels:
            other_name = rel['node']['name']
            r_type = rel['relationship'].upper()
            direction = rel['direction']
            strength = rel.get('strength', 1.0)
            
            strength_desc = "mildly" if strength < 0.4 else "strongly" if strength > 0.7 else ""
            
            if direction == 'outgoing':
                summary.append(f"- {entity_name} {strength_desc} {r_type} {other_name}")
            else:
                summary.append(f"- {other_name} {strength_desc} {r_type} {entity_name} (Incoming)")
                
        return "\n".join(summary)

    def save_graph(self):
        """Persist the graph to disk."""
        data = {
            'nodes': {k: asdict(v) for k, v in self.nodes.items()},
            'edges': [asdict(e) for e in self.edges],
            'last_updated': datetime.now().isoformat()
        }
        
        self.graph_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.graph_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)

    def load_graph(self):
        """Load the graph from disk."""
        if not self.graph_file.exists():
            return
            
        try:
            with open(self.graph_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            for node_id, node_data in data.get('nodes', {}).items():
                self.nodes[node_id] = EntityNode(**node_data)
            
            for edge_data in data.get('edges', []):
                self.edges.append(RelationshipEdge(**edge_data))
                
        except Exception as e:
            print(f"Error loading knowledge graph: {e}")
