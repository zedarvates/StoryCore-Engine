"""
Agent Card Generator

This module provides functionality to create and manage agent cards for StoryCore.
Each card contains personality, capabilities, behavior, and file associations.

Usage:
    from agents.card_generator import AgentCardGenerator
    
    generator = AgentCardGenerator()
    card = generator.create_card("scientific_audit")
    generator.save_card(card, "agents/scientific_audit_card.json")
"""

import json
import os
from typing import Dict, Any, Optional, List
from datetime import datetime
from pathlib import Path


class AgentCardGenerator:
    """Generator for agent cards in StoryCore."""
    
    def __init__(self, base_path: Optional[str] = None):
        """
        Initialize the Agent Card Generator.
        
        Args:
            base_path: Base path for the project. If None, uses C:/storycore-engine
        """
        self.base_path = base_path or "C:/storycore-engine"
        self.agents_dir = os.path.join(self.base_path, "agents")
        
        # Ensure agents directory exists
        os.makedirs(self.agents_dir, exist_ok=True)
    
    def create_card(
        self,
        agent_id: str,
        name: str,
        personality: Dict[str, Any],
        capabilities: Dict[str, Any],
        behavior: Dict[str, Any],
        files: Dict[str, Any],
        description: str = "",
        version: str = "1.0"
    ) -> Dict[str, Any]:
        """
        Create a complete agent card.
        
        Args:
            agent_id: Unique identifier for the agent
            name: Human-readable name
            personality: Personality traits and characteristics
            capabilities: What the agent can do
            behavior: Typical actions and workflow
            files: Associated files
            description: Brief description
            version: Agent version
            
        Returns:
            Complete agent card dictionary
        """
        card = {
            "agent_id": agent_id,
            "name": name,
            "description": description,
            "personality": personality,
            "capabilities": capabilities,
            "behavior": behavior,
            "files": files,
            "image": {
                "generated": False,
                "prompt": self._generate_image_prompt(personality, capabilities),
                "manual_path": f"assets/agents/{agent_id}_card.png"
            },
            "version": version,
            "created": datetime.now().isoformat(),
            "last_updated": datetime.now().isoformat()
        }
        
        return card
    
    def _generate_image_prompt(
        self,
        personality: Dict[str, Any],
        capabilities: Dict[str, Any]
    ) -> str:
        """
        Generate an image prompt based on personality and capabilities.
        
        Args:
            personality: Agent personality
            capabilities: Agent capabilities
            
        Returns:
            Generated prompt string for image generation
        """
        traits = personality.get("traits", [])
        primary = capabilities.get("primary", [])
        
        # Build prompt parts
        parts = []
        
        # Add trait-based visual elements
        if traits:
            trait_str = ", ".join(traits[:3])
            parts.append(f"portrait with {trait_str} characteristics")
        
        # Add capability-based visual elements
        if primary:
            cap_str = ", ".join(primary[:2])
            parts.append(f"focused on {cap_str}")
        
        # Add style elements
        parts.append("professional, badge-style, clean design")
        parts.append("blue and white color scheme")
        
        return ", ".join(parts)
    
    def save_card(self, card: Dict[str, Any], filename: Optional[str] = None) -> str:
        """
        Save agent card to JSON file.
        
        Args:
            card: Agent card dictionary
            filename: Optional filename. If None, uses agent_id + _card.json
            
        Returns:
            Path to saved file
        """
        if filename is None:
            filename = f"{card['agent_id']}_card.json"
        
        filepath = os.path.join(self.agents_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(card, f, indent=2, ensure_ascii=False)
        
        return filepath
    
    def load_card(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """
        Load an agent card from file.
        
        Args:
            agent_id: Agent identifier
            
        Returns:
            Agent card dictionary or None if not found
        """
        filepath = os.path.join(self.agents_dir, f"{agent_id}_card.json")
        
        if not os.path.exists(filepath):
            return None
        
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def list_cards(self) -> List[str]:
        """
        List all available agent cards.
        
        Returns:
            List of agent IDs
        """
        if not os.path.exists(self.agents_dir):
            return []
        
        cards = []
        for filename in os.listdir(self.agents_dir):
            if filename.endswith('_card.json'):
                agent_id = filename.replace('_card.json', '')
                cards.append(agent_id)
        
        return cards
    
    def update_card(self, agent_id: str, updates: Dict[str, Any]) -> bool:
        """
        Update an existing agent card.
        
        Args:
            agent_id: Agent identifier
            updates: Dictionary of updates to apply
            
        Returns:
            True if successful, False otherwise
        """
        card = self.load_card(agent_id)
        
        if card is None:
            return False
        
        # Apply updates
        card.update(updates)
        card["last_updated"] = datetime.now().isoformat()
        
        # Save updated card
        self.save_card(card)
        
        return True


def create_scientific_audit_card() -> Dict[str, Any]:
    """Create the Scientific Audit Agent card."""
    generator = AgentCardGenerator()
    
    return generator.create_card(
        agent_id="scientific_audit",
        name="Scientific Audit Agent",
        description="Agent de vérification fakta untuk teks berbasis. Extrait les affirmations factuelles, vérifie les sources, et génère des rapports de vérification.",
        personality={
            "traits": ["méthodique", "analytique", "précis", "rigoureux"],
            "values": ["véracité", "objectivité", "rigueur scientifique"],
            "communication_style": "formel, factuel, professionnel",
            "limitations": [
                "pas de conseils médicaux",
                "pas de jugements politiques",
                "pas d'attribution d'intention"
            ]
        },
        capabilities={
            "primary": [
                "extraction de faits",
                "vérification de sources",
                "analyse de confiance",
                "classification de domaine"
            ],
            "secondary": [
                "génération de rapports",
                "évaluation des risques",
                "récupération de preuves"
            ],
            "input_types": ["texte", "transcription"],
            "output_types": ["rapport JSON", "résumé lisible", "statistiques"]
        },
        behavior={
            "typical_actions": [
                "1. Prétraitement: normalisation et validation du texte",
                "2. Extraction: identifier les affirmations factuelles",
                "3. Classification: assigner des catégories de domaine",
                "4. Évaluation: récupérer des preuves et vérifier",
                "5. Scoring: calculer la confiance et les niveaux de risque",
                "6. Rapportage: générer des sorties structurées"
            ],
            "workflow": "preprocessing → extraction → classification → évaluation → scoring → rapport",
            "safety_constraints": [
                "pas d'attribution d'intention",
                "pas de jugements politiques",
                "pas de conseils médicaux",
                "reconnaissance explicite de l'incertitude"
            ]
        },
        files={
            "main": "src/fact_checker/scientific_audit_agent.py",
            "dependencies": [
                "src/fact_checker/models.py",
                "src/fact_checker/fact_extraction.py",
                "src/fact_checker/domain_routing.py",
                "src/fact_checker/trusted_sources.py",
                "src/fact_checker/evidence_retrieval.py",
                "src/fact_checker/fact_checking.py",
                "src/fact_checker/report_generation.py"
            ]
        }
    )


def create_antifake_video_card() -> Dict[str, Any]:
    """Create the Anti-Fake Video Agent card."""
    generator = AgentCardGenerator()
    
    return generator.create_card(
        agent_id="antifake_video",
        name="Anti-Fake Video Agent",
        description="Agent d'analyse de transcriptions vidéo pour détecter les manipulations, les incohérences logiques, les manipulations émotionnelles et les biais narratifs.",
        personality={
            "traits": ["vigilant", "critique", "équilibré", "objectif"],
            "values": ["intégrité journalistique", "objectivité", "équité"],
            "communication_style": "analytique, neutre, structuré",
            "limitations": [
                "pas de conclusions définitives sur l'authenticité",
                "pas d'attribution d'intention",
                "pas de jugements politiques"
            ]
        },
        capabilities={
            "primary": [
                "détection de manipulations logiques",
                "détection de manipulations émotionnelles",
                "détection de biais narratifs",
                "analyse de cohérence"
            ],
            "secondary": [
                "évaluation de l'intégrité",
                "évaluation des risques",
                "identification de segments problématiques",
                "génération de recommandations"
            ],
            "input_types": ["transcription vidéo", "texte avec timestamps"],
            "output_types": ["rapport JSON", "résumé lisible", "segments problématiques"]
        },
        behavior={
            "typical_actions": [
                "1. Parsing: extraire et valider la transcription",
                "2. Détection: identifier les signaux de manipulation",
                "3. Cohérence: évaluer la cohérence logique",
                "4. Intégrité: évaluer l'intégrité journalistique",
                "5. Risque: assigner les niveaux de risque",
                "6. Rapportage: générer des sorties structurées"
            ],
            "workflow": "parsing → détection manipulation → cohérence → intégrité → risque → rapport",
            "safety_constraints": [
                "pas d'attribution d'intention",
                "pas de jugements politiques",
                "pas de conclusions définitives",
                "avertissement explicite sur le caractère automatique"
            ]
        },
        files={
            "main": "src/fact_checker/antifake_video_agent.py",
            "dependencies": [
                "src/fact_checker/models.py",
                "src/fact_checker/fact_extraction.py",
                "src/fact_checker/safety_constraints.py",
                "src/fact_checker/validation.py"
            ]
        }
    )


def generate_all_cards():
    """Generate all agent cards."""
    generator = AgentCardGenerator()
    
    # Create scientific audit card
    scientific_card = create_scientific_audit_card()
    generator.save_card(scientific_card)
    print(f"Created: {scientific_card['agent_id']}_card.json")
    
    # Create antifake video card
    antifake_card = create_antifake_video_card()
    generator.save_card(antifake_card)
    print(f"Created: {antifake_card['agent_id']}_card.json")
    
    print(f"\nTotal cards created: {len(generator.list_cards())}")


if __name__ == "__main__":
    generate_all_cards()

