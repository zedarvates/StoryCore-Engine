#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
storycore_integration.py - Module d'intégration avancée pour StoryCore Engine.

Ce module fournit des fonctionnalités avancées pour intégrer le générateur de prompts vidéo
dans le projet StoryCore Engine, en utilisant des méthodes et techniques spécifiques.
"""

import os
import json
from typing import Dict, Any, List
from .VideoPromptGenerator import VideoPromptGenerator


class StoryCoreVideoPromptIntegration:
    """Classe pour intégrer le générateur de prompts vidéo avec StoryCore Engine."""
    
    def __init__(self, generator: VideoPromptGenerator):
        """Initialise l'intégration avec le générateur de prompts.
        
        Args:
            generator: Instance de VideoPromptGenerator.
        """
        self.generator = generator
    
    def recommend_template_for_project(
        self,
        project_type: str,
        audience: str = "general"
    ) -> str:
        """Recommande un template en fonction du type de projet et de l'audience.
        
        Args:
            project_type: Type de projet (par exemple, "action", "drama", "comedy").
            audience: Public cible (par exemple, "general", "children", "professionals").
        
        Returns:
            str: Nom du template recommandé.
        """
        # Logique de recommandation basée sur le type de projet
        if project_type == "action":
            return "video_dynamique"
        elif project_type == "fantasy" or project_type == "sci-fi":
            return "video_effets_speciaux"
        elif project_type == "drama" or project_type == "romance":
            return "video_transition"
        else:
            return "video_dynamique"  # Template par défaut
    
    def generate_prompts_for_project(
        self,
        project_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Génère des prompts vidéo pour toutes les séquences d'un projet.
        
        Args:
            project_data: Données du projet StoryCore.
        
        Returns:
            Dict[str, Any]: Données du projet avec les prompts vidéo ajoutés.
        """
        if "sequences" not in project_data:
            return project_data
        
        for sequence in project_data["sequences"]:
            # Déterminer le template à utiliser pour cette séquence
            template_name = self._determine_template_for_sequence(sequence)
            
            # Générer le prompt vidéo
            prompt = self._generate_prompt_for_sequence(sequence, template_name)
            sequence["video_prompt"] = prompt
        
        return project_data
    
    def _determine_template_for_sequence(self, sequence: Dict[str, Any]) -> str:
        """Détermine le template à utiliser pour une séquence donnée.
        
        Args:
            sequence: Données de la séquence.
        
        Returns:
            str: Nom du template à utiliser.
        """
        # Logique pour déterminer le template en fonction des données de la séquence
        if "special_effects" in sequence and sequence["special_effects"]:
            return "video_effets_speciaux"
        elif "transition" in sequence and sequence["transition"]:
            return "video_transition"
        else:
            return "video_dynamique"
    
    def _generate_prompt_for_sequence(
        self,
        sequence: Dict[str, Any],
        template_name: str
    ) -> str:
        """Génère un prompt vidéo pour une séquence donnée.
        
        Args:
            sequence: Données de la séquence.
            template_name: Nom du template à utiliser.
        
        Returns:
            str: Prompt vidéo généré.
        """
        sujet = sequence.get("subject", "un personnage")
        actions = sequence.get("actions", ["se déplacer", "interagir avec l'environnement"])
        details = {
            "détail spécifique": sequence.get("detail", "la fluidité des mouvements"),
            "description de l'environnement": sequence.get("environment", "un environnement générique")
        }
        
        return self.generator.generate_prompt(template_name, sujet, actions, details)
    
    def export_prompts_to_storycore_format(
        self,
        project_data: Dict[str, Any],
        output_dir: str = "storycore_output"
    ) -> None:
        """Exporte les prompts vidéo dans un format compatible avec StoryCore Engine.
        
        Args:
            project_data: Données du projet avec les prompts vidéo.
            output_dir: Répertoire de sortie pour les fichiers exportés.
        """
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        # Sauvegarder les prompts vidéo pour chaque séquence
        if "sequences" in project_data:
            for i, sequence in enumerate(project_data["sequences"]):
                if "video_prompt" in sequence:
                    prompt_file = os.path.join(output_dir, f"sequence_{i:03d}_video_prompt.json")
                    prompt_data = {
                        "sequence_id": sequence.get("id", i),
                        "video_prompt": sequence["video_prompt"],
                        "template_used": self._determine_template_for_sequence(sequence),
                        "metadata": {
                            "subject": sequence.get("subject", ""),
                            "environment": sequence.get("environment", "")
                        }
                    }
                    with open(prompt_file, 'w', encoding='utf-8') as f:
                        json.dump(prompt_data, f, indent=4, ensure_ascii=False)
        
        # Sauvegarder les données complètes du projet
        project_file = os.path.join(output_dir, "project_prompts.json")
        with open(project_file, 'w', encoding='utf-8') as f:
            json.dump(project_data, f, indent=4, ensure_ascii=False)
    
    def integrate_with_timeline(
        self,
        timeline_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Intègre les prompts vidéo avec les données de la timeline.
        
        Args:
            timeline_data: Données de la timeline.
        
        Returns:
            Dict[str, Any]: Données de la timeline avec les prompts vidéo intégrés.
        """
        if "tracks" in timeline_data:
            for track in timeline_data["tracks"]:
                if track["type"] == "video":
                    for clip in track.get("clips", []):
                        # Générer un prompt vidéo pour chaque clip
                        prompt = self.generator.generate_prompt(
                            template_name="video_dynamique",
                            sujet=clip.get("subject", "un personnage"),
                            actions=clip.get("actions", ["se déplacer", "interagir avec l'environnement"]),
                            details={
                                "détail spécifique": clip.get("detail", "la fluidité des mouvements"),
                                "description de l'environnement": clip.get("environment", "un environnement générique")
                            }
                        )
                        clip["video_prompt"] = prompt
        
        return timeline_data


def main():
    """Fonction principale pour démontrer l'intégration avancée avec StoryCore Engine."""
    generator = VideoPromptGenerator()
    integration = StoryCoreVideoPromptIntegration(generator)
    
    # Exemple de données de projet StoryCore
    project_data = {
        "name": "Mon Projet Vidéo Avancé",
        "description": "Un projet de démonstration pour l'intégration avancée des prompts vidéo.",
        "sequences": [
            {
                "id": 1,
                "subject": "un héros",
                "actions": ["courir dans une forêt", "sauter par-dessus un ruisseau", "atterrir en roulant"],
                "detail": "la fluidité des mouvements",
                "environment": "une forêt dense avec des arbres imposants",
                "special_effects": True
            },
            {
                "id": 2,
                "subject": "une héroïne",
                "actions": ["marcher dans une ville", "regarder autour d'elle", "sourire à la caméra"],
                "detail": "les expressions faciales",
                "environment": "une ville animée avec des bâtiments modernes",
                "transition": True
            },
            {
                "id": 3,
                "subject": "un groupe de personnages",
                "actions": ["se battre contre des ennemis", "utiliser des pouvoirs spéciaux", "célébrer la victoire"],
                "detail": "les effets spéciaux",
                "environment": "un champ de bataille épique",
                "special_effects": True
            }
        ]
    }
    
    # Générer des prompts vidéo pour toutes les séquences
    updated_project = integration.generate_prompts_for_project(project_data)
    
    # Exporter les prompts dans un format compatible avec StoryCore Engine
    integration.export_prompts_to_storycore_format(updated_project)
    
    print("Intégration avancée réussie! Les prompts vidéo ont été générés et exportés dans le répertoire 'storycore_output'.")


if __name__ == "__main__":
    main()