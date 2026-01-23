#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
integration.py - Module d'intégration pour le générateur de prompts vidéo.

Ce module permet d'intégrer le générateur de prompts vidéo avec le projet StoryCore Engine.
"""

import os
from typing import Dict, Any
from .VideoPromptGenerator import VideoPromptGenerator


class VideoPromptIntegration:
    """Classe pour intégrer le générateur de prompts vidéo avec StoryCore Engine."""
    
    def __init__(self, generator: VideoPromptGenerator):
        """Initialise l'intégration avec le générateur de prompts.
        
        Args:
            generator: Instance de VideoPromptGenerator.
        """
        self.generator = generator
    
    def integrate_with_storycore(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """Intègre les prompts vidéo générés avec les données du projet StoryCore.
        
        Args:
            project_data: Données du projet StoryCore.
        
        Returns:
            Dict[str, Any]: Données du projet mises à jour avec les prompts vidéo.
        """
        # Exemple d'intégration: ajouter des prompts vidéo aux séquences du projet
        if "sequences" in project_data:
            for sequence in project_data["sequences"]:
                # Générer un prompt vidéo pour chaque séquence
                prompt = self.generator.generate_prompt(
                    template_name="video_dynamique",
                    sujet=sequence.get("subject", "un personnage"),
                    actions=sequence.get("actions", ["se déplacer", "interagir avec l'environnement"]),
                    details={
                        "détail spécifique": sequence.get("detail", "la fluidité des mouvements"),
                        "description de l'environnement": sequence.get("environment", "un environnement générique")
                    }
                )
                sequence["video_prompt"] = prompt
        
        return project_data
    
    def generate_prompt_for_scene(
        self,
        scene_data: Dict[str, Any],
        template_name: str = "video_dynamique"
    ) -> str:
        """Génère un prompt vidéo pour une scène spécifique.
        
        Args:
            scene_data: Données de la scène.
            template_name: Nom du template à utiliser.
        
        Returns:
            str: Prompt vidéo généré pour la scène.
        """
        sujet = scene_data.get("subject", "un personnage")
        actions = scene_data.get("actions", ["se déplacer", "interagir avec l'environnement"])
        details = {
            "détail spécifique": scene_data.get("detail", "la fluidité des mouvements"),
            "description de l'environnement": scene_data.get("environment", "un environnement générique")
        }
        
        return self.generator.generate_prompt(template_name, sujet, actions, details)
    
    def save_project_with_prompts(
        self,
        project_data: Dict[str, Any],
        output_dir: str = "output"
    ) -> None:
        """Sauvegarde les données du projet avec les prompts vidéo générés.
        
        Args:
            project_data: Données du projet à sauvegarder.
            output_dir: Répertoire de sortie pour les fichiers générés.
        """
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        # Sauvegarder les prompts vidéo pour chaque séquence
        if "sequences" in project_data:
            for i, sequence in enumerate(project_data["sequences"]):
                if "video_prompt" in sequence:
                    prompt_file = os.path.join(output_dir, f"sequence_{i}_video_prompt.txt")
                    with open(prompt_file, 'w', encoding='utf-8') as f:
                        f.write(sequence["video_prompt"])
        
        # Sauvegarder les données complètes du projet
        project_file = os.path.join(output_dir, "project_with_prompts.json")
        import json
        with open(project_file, 'w', encoding='utf-8') as f:
            json.dump(project_data, f, indent=4, ensure_ascii=False)


def main():
    """Fonction principale pour démontrer l'intégration avec StoryCore Engine."""
    generator = VideoPromptGenerator()
    integration = VideoPromptIntegration(generator)
    
    # Exemple de données de projet StoryCore
    project_data = {
        "name": "Mon Projet Vidéo",
        "description": "Un projet de démonstration pour l'intégration des prompts vidéo.",
        "sequences": [
            {
                "id": 1,
                "subject": "un héros",
                "actions": ["courir dans une forêt", "sauter par-dessus un ruisseau", "atterrir en roulant"],
                "detail": "la fluidité des mouvements",
                "environment": "une forêt dense avec des arbres imposants"
            },
            {
                "id": 2,
                "subject": "une héroïne",
                "actions": ["marcher dans une ville", "regarder autour d'elle", "sourire à la caméra"],
                "detail": "les expressions faciales",
                "environment": "une ville animée avec des bâtiments modernes"
            }
        ]
    }
    
    # Intégrer les prompts vidéo avec les données du projet
    updated_project = integration.integrate_with_storycore(project_data)
    
    # Sauvegarder le projet avec les prompts générés
    integration.save_project_with_prompts(updated_project)
    
    print("Projet intégré avec succès! Les prompts vidéo ont été générés et sauvegardés dans le répertoire 'output'.")


if __name__ == "__main__":
    main()