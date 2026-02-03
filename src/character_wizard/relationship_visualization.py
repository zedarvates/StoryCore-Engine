"""
Relationship Visualization Data Generator

This module generates visualization data for character relationships,
supporting various graph visualization libraries and formats.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

import json
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum

from .relationship_network import RelationshipNetwork, CharacterNode
from .relationship_types import (
    RelationshipType, RelationshipCategory, RelationshipStrength
)

logger = logging.getLogger(__name__)


class GraphFormat(Enum):
    """Output graph formats."""
    D3_JSON = "d3_json"
    CYTOSCAPE = "cytoscape"
    NETWORKX = "networkx"
    VISJS = "visjs"
    FORCE_DIRECTED = "force_directed"


@dataclass
class GraphNode:
    """Graph node for visualization."""
    id: str
    label: str
    node_type: str = "character"
    
    # Visual properties
    color: Optional[str] = None
    size: Optional[int] = None
    shape: str = "ellipse"
    
    # Categorization
    archetype: Optional[str] = None
    is_protagonist: bool = False
    is_antagonist: bool = False
    cluster: Optional[str] = None
    
    # Importance
    centrality: float = 0.5
    importance_score: float = 0.5
    
    # Metadata
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        result = {
            "id": self.id,
            "label": self.label,
            "type": self.node_type
        }
        
        if self.color:
            result["color"] = self.color
        if self.size:
            result["size"] = self.size
        if self.shape:
            result["shape"] = self.shape
        if self.archetype:
            result["archetype"] = self.archetype
        if self.cluster:
            result["cluster"] = self.cluster
        
        result["is_protagonist"] = self.is_protagonist
        result["is_antagonist"] = self.is_antagonist
        result["centrality"] = self.centrality
        result["importance_score"] = self.importance_score
        
        return result


@dataclass
class GraphEdge:
    """Graph edge for visualization."""
    source: str
    target: str
    edge_type: str = "relationship"
    
    # Visual properties
    color: Optional[str] = None
    width: Optional[int] = None
    style: str = "solid"
    
    # Relationship data
    relationship_type: str = ""
    relationship_category: str = ""
    strength: int = 0
    strength_label: str = ""
    
    # Dynamics
    trend: Optional[str] = None
    is_mutual: bool = True
    
    # Label
    label: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        result = {
            "source": self.source,
            "target": self.target,
            "type": self.edge_type
        }
        
        if self.color:
            result["color"] = self.color
        if self.width:
            result["width"] = self.width
        if self.style:
            result["style"] = self.style
        if self.label:
            result["label"] = self.label
        
        result["relationship_type"] = self.relationship_type
        result["relationship_category"] = self.relationship_category
        result["strength"] = self.strength
        result["strength_label"] = self.strength_label
        result["trend"] = self.trend
        result["is_mutual"] = self.is_mutual
        
        return result


@dataclass
class GraphData:
    """Complete graph data for visualization."""
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    
    # Metadata
    format: str = "d3_json"
    story_id: str = ""
    
    # Layout hints
    layout: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "format": self.format,
            "story_id": self.story_id,
            "nodes": [n.to_dict() for n in self.nodes],
            "edges": [e.to_dict() for e in self.edges],
            "layout": self.layout,
            "nodeCount": len(self.nodes),
            "edgeCount": len(self.edges)
        }


class RelationshipVisualizer:
    """
    Generates visualization data from relationship networks.
    """
    
    # Color schemes for different relationship categories
    CATEGORY_COLORS = {
        RelationshipCategory.FAMILY: "#4ECDC4",      # Teal
        RelationshipCategory.ROMANTIC: "#FF6B6B",    # Red/Pink
        RelationshipCategory.SOCIAL: "#45B7D1",      # Blue
        RelationshipCategory.PROFESSIONAL: "#96CEB4", # Green
        RelationshipCategory.HISTORICAL: "#DDA0DD",   # Plum
        RelationshipCategory.OTHER: "#C0C0C0",       # Silver
    }
    
    # Color scheme for relationship strength (positive)
    POSITIVE_STRENGTH_COLORS = {
        1: "#FFE5E5",  # Very weak - light pink
        2: "#FFCCCC",  # Weak - pink
        3: "#FFB3B3",  # Moderate - medium pink
        4: "#FF8080",  # Strong - coral
        5: "#FF4D4D",  # Very strong - red
    }
    
    # Color scheme for relationship strength (negative)
    NEGATIVE_STRENGTH_COLORS = {
        -1: "#E5E5FF",  # Very weak negative - light blue
        -2: "#CCCCFF",  # Weak negative - blue
        -3: "#B3B3FF",  # Moderate negative - medium blue
        -4: "#8080FF",  # Strong negative - dark blue
        -5: "#4D4DFF",  # Very strong negative - intense blue
    }
    
    # Node colors by archetype
    ARCHETYPE_COLORS = {
        "hero": "#FFD700",       # Gold
        "villain": "#DC143C",    # Crimson
        "mentor": "#4169E1",     # Royal Blue
        "ally": "#32CD32",       # Lime Green
        "trickster": "#FF8C00",  # Dark Orange
        "innocent": "#87CEEB",   # Sky Blue
        "explorer": "#9370DB",   # Purple
        "ruler": "#8B0000",      # Dark Red
        "caregiver": "#FF69B4",  # Hot Pink
        "sage": "#708090",       # Slate Gray
    }
    
    def __init__(self):
        """Initialize the visualizer."""
        pass
    
    def generate_graph(
        self,
        network: RelationshipNetwork,
        format: GraphFormat = GraphFormat.D3_JSON,
        include_labels: bool = True,
        highlight_key_relationships: bool = True
    ) -> GraphData:
        """
        Generate graph data from a relationship network.
        
        Args:
            network: RelationshipNetwork to visualize
            format: Output format
            include_labels: Whether to include edge labels
            highlight_key_relationships: Highlight important relationships
            
        Returns:
            GraphData object ready for visualization
        """
        nodes = self._generate_nodes(network)
        edges = self._generate_edges(
            network,
            include_labels=include_labels,
            highlight_key=highlight_key_relationships
        )
        
        # Calculate centrality for nodes
        self._calculate_centrality(nodes, edges)
        
        # Assign clusters
        self._assign_clusters(nodes, network)
        
        return GraphData(
            nodes=nodes,
            edges=edges,
            format=format.value,
            story_id=network.story_id,
            layout=self._get_layout_hints(network)
        )
    
    def _generate_nodes(
        self,
        network: RelationshipNetwork
    ) -> List[GraphNode]:
        """Generate graph nodes from characters."""
        nodes = []
        
        for char_id, char_node in network.characters.items():
            # Determine color
            color = self.ARCHETYPE_COLORS.get(
                char_node.archetype.lower() if char_node.archetype else "",
                "#999999"
            )
            
            # Protagonist gets special color
            if char_node.is_protagonist:
                color = "#FFD700"  # Gold
            
            # Antagonist gets special color
            if char_node.is_antagonist:
                color = "#DC143C"  # Crimson
            
            # Determine size based on relationship count
            rel_count = len(network.get_character_relationships(char_id))
            size = min(50, 20 + rel_count * 3)
            
            node = GraphNode(
                id=char_id,
                label=char_node.name,
                node_type="character",
                color=color,
                size=size,
                archetype=char_node.archetype,
                is_protagonist=char_node.is_protagonist,
                is_antagonist=char_node.is_antagonist,
                cluster=char_node.cluster_id,
                importance_score=char_node.importance_score,
                metadata=char_node.metadata
            )
            
            nodes.append(node)
        
        return nodes
    
    def _generate_edges(
        self,
        network: RelationshipNetwork,
        include_labels: bool = True,
        highlight_key: bool = True
    ) -> List[GraphEdge]:
        """Generate graph edges from relationships."""
        edges = []
        
        # Get key relationships for highlighting
        key_relationships = set()
        if highlight_key:
            key_rels = network.find_key_relationships(top_n=10)
            for rel in key_rels:
                key_relationships.add(rel.character_pair)
        
        for pair, rel in network.relationships.items():
            # Determine color based on strength and category
            strength_value = rel.strength.value
            category = rel.relationship_type.get_category()
            
            if strength_value > 0:
                color = self.POSITIVE_STRENGTH_COLORS.get(
                    strength_value,
                    "#CCCCCC"
                )
            else:
                color = self.NEGATIVE_STRENGTH_COLORS.get(
                    strength_value,
                    "#CCCCCC"
                )
            
            # Category color for category-specific visualization
            category_color = self.CATEGORY_COLORS.get(category, "#CCCCCC")
            
            # Determine width based on strength
            width = min(10, abs(strength_value) * 2)
            
            # Style based on category
            style = "solid"
            if category == RelationshipCategory.ROMANTIC:
                style = "dashed"
            elif category == RelationshipCategory.FAMILY:
                style = "solid"
            elif category == RelationshipCategory.PROFESSIONAL:
                style = "dotted"
            
            # Create label
            label = None
            if include_labels:
                # Use relationship type for label
                label = rel.relationship_type.value.replace("_", " ").title()
                if abs(strength_value) >= 4:
                    label = f"{label} ({rel.strength.name.lower()})"
            
            # Determine if mutual
            is_mutual = True  # Simplified - could check asymmetric relationships
            
            edge = GraphEdge(
                source=rel.character_id_1,
                target=rel.character_id_2,
                edge_type="relationship",
                color=category_color,  # Use category for edge color
                width=width if width > 1 else None,
                style=style,
                relationship_type=rel.relationship_type.value,
                relationship_category=category.value,
                strength=strength_value,
                strength_label=rel.strength.name,
                trend=rel.calculate_trend(),
                is_mutual=is_mutual,
                label=label
            )
            
            # Highlight key relationships
            if pair in key_relationships:
                edge.color = "#FFD700"  # Gold for key relationships
                if edge.width:
                    edge.width = min(15, edge.width + 5)
            
            edges.append(edge)
        
        return edges
    
    def _calculate_centrality(
        self,
        nodes: List[GraphNode],
        edges: List[GraphEdge]
    ) -> None:
        """
        Calculate degree centrality for nodes.
        
        Simple centrality: number of connections / total possible connections
        """
        if not nodes:
            return
        
        # Build adjacency
        adj = {node.id: set() for node in nodes}
        for edge in edges:
            adj[edge.source].add(edge.target)
            adj[edge.target].add(edge.source)
        
        # Calculate centrality
        max_connections = len(nodes) - 1
        for node in nodes:
            connections = len(adj[node.id])
            node.centrality = connections / max_connections if max_connections > 0 else 0
    
    def _assign_clusters(
        self,
        nodes: List[GraphNode],
        network: RelationshipNetwork
    ) -> None:
        """Assign cluster information to nodes."""
        clusters = network.find_clusters()
        
        for node in nodes:
            if node.id in network.characters:
                char = network.characters[node.id]
                if char.cluster_id and char.cluster_id in clusters:
                    node.cluster = char.cluster_id
    
    def _get_layout_hints(
        self,
        network: RelationshipNetwork
    ) -> Dict[str, Any]:
        """Get layout configuration hints."""
        return {
            "type": "force_directed",
            "nodeStrength": -30,
            "linkDistance": 100,
            "centerForce": 0.5,
            "collisionPadding": 10,
            "alphaDecay": 0.02,
            "preventOverlap": True
        }
    
    # =========================================================================
    # Format-Specific Exports
    # =========================================================================
    
    def to_d3_json(
        self,
        network: RelationshipNetwork,
        pretty: bool = True
    ) -> str:
        """
        Generate D3.js-compatible JSON.
        
        Format:
        {
          "nodes": [...],
          "edges": [...]
        }
        """
        graph = self.generate_graph(network, GraphFormat.D3_JSON)
        data = graph.to_dict()
        
        if pretty:
            return json.dumps(data, indent=2)
        return json.dumps(data)
    
    def to_cytoscape_json(
        self,
        network: RelationshipNetwork,
        pretty: bool = True
    ) -> str:
        """
        Generate Cytoscape.js-compatible JSON.
        
        Format:
        {
          "elements": {
            "nodes": [...],
            "edges": [...]
          },
          "style": [...],
          "layout": {...}
        }
        """
        graph = self.generate_graph(network, GraphFormat.CYTOSCAPE)
        
        # Convert to Cytoscape format
        elements = {
            "nodes": [
                {"data": n.to_dict()}
                for n in graph.nodes
            ],
            "edges": [
                {"data": e.to_dict()}
                for e in graph.edges
            ]
        }
        
        # Add style
        style = self._get_cytoscape_style(graph.nodes, graph.edges)
        
        # Add layout
        layout = {
            "name": "cose",
            "animate": True,
            "nodeRepulsion": 4500,
            "edgeElasticity": 100
        }
        
        result = {
            "elements": elements,
            "style": style,
            "layout": layout
        }
        
        if pretty:
            return json.dumps(result, indent=2)
        return json.dumps(result)
    
    def to_force_directed_json(
        self,
        network: RelationshipNetwork,
        pretty: bool = True
    ) -> str:
        """
        Generate generic force-directed graph JSON.
        
        Includes positions and velocities for animation.
        """
        graph = self.generate_graph(network, GraphFormat.FORCE_DIRECTED)
        
        # Add initial positions (radial layout)
        import math
        center_x, center_y = 400, 300
        radius = 200
        
        for i, node in enumerate(graph.nodes):
            angle = (2 * math.pi * i) / len(graph.nodes)
            if "initialPosition" not in node.metadata:
                node.metadata["initialPosition"] = {
                    "x": center_x + radius * math.cos(angle),
                    "y": center_y + radius * math.sin(angle)
                }
        
        result = {
            "nodes": [n.to_dict() for n in graph.nodes],
            "links": [e.to_dict() for e in graph.edges],
            "simulation": {
                "alphaDecay": 0.02,
                "velocityDecay": 0.4,
                "linkDistance": 100,
                "linkStrength": 0.1,
                "chargeStrength": -300,
                "centerX": center_x,
                "centerY": center_y
            }
        }
        
        if pretty:
            return json.dumps(result, indent=2)
        return json.dumps(result)
    
    def _get_cytoscape_style(
        self,
        nodes: List[GraphNode],
        edges: List[GraphEdge]
    ) -> List[Dict[str, Any]]:
        """Generate Cytoscape.js style sheet."""
        return [
            {
                "selector": "node",
                "style": {
                    "label": "data(label)",
                    "background-color": "data(color)",
                    "width": "data(size)",
                    "height": "data(size)",
                    "shape": "data(shape)",
                    "font-size": "12px",
                    "text-valign": "bottom",
                    "text-halign": "center"
                }
            },
            {
                "selector": "edge",
                "style": {
                    "width": "data(width)",
                    "line-color": "data(color)",
                    "line-style": "data(style)",
                    "target-arrow-color": "data(color)",
                    "target-arrow-shape": "triangle",
                    "curve-style": "bezier",
                    "label": "data(label)",
                    "font-size": "10px",
                    "color": "#666"
                }
            },
            {
                "selector": "node[is_protagonist]",
                "style": {
                    "border-width": 3,
                    "border-color": "#FFD700"
                }
            },
            {
                "selector": "node[is_antagonist]",
                "style": {
                    "border-width": 3,
                    "border-color": "#DC143C"
                }
            }
        ]
    
    # =========================================================================
    # Utility Methods
    # =========================================================================
    
    def export_for_d3_force(
        self,
        network: RelationshipNetwork,
        output_path: str
    ) -> bool:
        """Export graph data for D3.js force simulation."""
        try:
            json_data = self.to_d3_json(network, pretty=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(json_data)
            return True
        except Exception as e:
            logger.error(f"Failed to export D3 data: {e}")
            return False
    
    def export_for_cytoscape(
        self,
        network: RelationshipNetwork,
        output_path: str
    ) -> bool:
        """Export graph data for Cytoscape.js."""
        try:
            json_data = self.to_cytoscape_json(network, pretty=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(json_data)
            return True
        except Exception as e:
            logger.error(f"Failed to export Cytoscape data: {e}")
            return False
    
    def export_for_visjs(
        self,
        network: RelationshipNetwork,
        output_path: str
    ) -> bool:
        """Export graph data for vis.js network."""
        try:
            graph = self.generate_graph(network, GraphFormat.VISJS)
            
            # Convert to vis.js format
            vis_data = {
                "nodes": [
                    {
                        "id": n.id,
                        "label": n.label,
                        "color": n.color,
                        "shape": n.shape,
                        "size": n.size
                    }
                    for n in graph.nodes
                ],
                "edges": [
                    {
                        "from": e.source,
                        "to": e.target,
                        "color": e.color,
                        "width": e.width,
                        "label": e.label,
                        "arrows": "to" if not e.is_mutual else "both"
                    }
                    for e in graph.edges
                ]
            }
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(vis_data, f, indent=2)
            
            return True
        except Exception as e:
            logger.error(f"Failed to export vis.js data: {e}")
            return False

