#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VideoPromptGenerator.py - Système de génération de prompts pour vidéos.

Ce module permet de générer des prompts personnalisés pour différents types de vidéos
en utilisant des templates de style extraits des fichiers "wan prompt wan 2.2.txt" et
"wan2.2 Image-Generated Video, Detai.txt".
"""

import json
import os
import re
from typing import Dict, List, Optional, Any
from dataclasses import dataclass


@dataclass
class VideoTemplate:
    """Classe pour représenter un template de prompt vidéo."""
    name: str
    description: str
    metadata: Dict[str, str]
    generation_steps: List[str]
    prompt_template: str


class VideoPromptGenerator:
    """Classe principale pour la génération de prompts vidéo."""
    
    def __init__(self, template_dir: str = "templates"):
        """Initialise le générateur de prompts vidéo.
        
        Args:
            template_dir: Répertoire contenant les templates de prompts.
        """
        self.template_dir = template_dir
        self.templates: Dict[str, VideoTemplate] = {}
        self._load_templates()
    
    def _load_templates(self) -> None:
        """Charge les templates de prompts à partir du répertoire spécifié."""
        try:
            # Vérifier si le répertoire existe
            if not os.path.exists(self.template_dir):
                os.makedirs(self.template_dir)
                print(f"Répertoire {self.template_dir} créé.")
            
            # Charger les templates par défaut
            self._load_default_templates()
            
        except Exception as e:
            print(f"Erreur lors du chargement des templates: {e}")
    
    def _load_default_templates(self) -> None:
        """Charge les templates par défaut basés sur les fichiers de référence."""
        # Template 1: Vidéo Dynamique
        self.templates["video_dynamique"] = VideoTemplate(
            name="Génération de Prompt Vidéo Dynamique",
            description="Template pour des vidéos avec des mouvements denses et une forte amplitude.",
            metadata={
                "Nom": "[Nom du Projet]",
                "Description": "[Description du contenu vidéo]"
            },
            generation_steps=[
                "Analyser l'image ou le sujet fourni.",
                "Identifier les mouvements clés et l'environnement.",
                "Définir 2 à 5 actions distinctes sur 5 secondes.",
                "Assurer la continuité et l'amplitude des mouvements.",
                "Vérifier la logique physique et la distinction visuelle.",
                "Ajuster l'amplitude pour des mouvements reconnaissables."
            ],
            prompt_template="""
Une vidéo montrant [sujet] en train de [action 1], puis [action 2], et enfin [action 3].
Les mouvements sont fluides et amples, avec une attention particulière à [détail spécifique].
L'environnement est [description de l'environnement], et la caméra a un léger effet de mouvement naturel.
            """
        )
        
        # Template 2: Vidéo avec Effets Spéciaux
        self.templates["video_effets_speciaux"] = VideoTemplate(
            name="Génération de Prompt Vidéo avec Effets Spéciaux",
            description="Template pour des vidéos nécessitant des effets spéciaux ou des éléments fantastiques.",
            metadata={
                "Nom": "[Nom du Projet]",
                "Description": "[Description des effets spéciaux ou éléments fantastiques]"
            },
            generation_steps=[
                "Identifier les éléments fantastiques ou effets spéciaux requis.",
                "Analyser l'interaction entre le sujet et les effets.",
                "Intégrer les effets spéciaux dans les actions.",
                "Assurer une transition fluide entre les actions et les effets.",
                "Vérifier la cohérence des effets avec l'environnement.",
                "Ajuster l'intensité des effets pour un rendu réaliste."
            ],
            prompt_template="""
Une vidéo montrant [sujet] en train de [action 1], avec [effet spécial 1].
Ensuite, [sujet] effectue [action 2], accompagné de [effet spécial 2].
L'environnement est [description de l'environnement], et les effets sont intégrés de manière fluide et naturelle.
            """
        )
        
        # Template 3: Vidéo de Transition
        self.templates["video_transition"] = VideoTemplate(
            name="Génération de Prompt Vidéo de Transition",
            description="Template pour des vidéos nécessitant des transitions fluides entre différentes scènes ou actions.",
            metadata={
                "Nom": "[Nom du Projet]",
                "Description": "[Description des transitions ou changements de scène]"
            },
            generation_steps=[
                "Identifier les points de transition dans la vidéo.",
                "Analyser les scènes avant et après la transition.",
                "Définir des actions qui facilitent une transition fluide.",
                "Assurer la continuité visuelle et narrative.",
                "Vérifier la cohérence des transitions avec le récit global.",
                "Ajuster les détails pour éviter les ruptures visuelles."
            ],
            prompt_template="""
Une vidéo montrant [sujet] en train de [action 1], suivie d'une transition fluide vers [scène suivante].
La transition est marquée par [détail de la transition], et l'environnement change de [description initiale] à [description finale].
            """
        )
    
    def generate_prompt(
        self,
        template_name: str,
        sujet: str,
        actions: List[str],
        details: Dict[str, str]
    ) -> str:
        """Génère un prompt personnalisé en utilisant un template spécifié.
        
        Args:
            template_name: Nom du template à utiliser.
            sujet: Sujet principal de la vidéo.
            actions: Liste des actions à inclure dans la vidéo.
            details: Dictionnaire de détails supplémentaires pour personnaliser le prompt.
        
        Returns:
            str: Prompt généré.
        """
        if template_name not in self.templates:
            raise ValueError(f"Template '{template_name}' non trouvé.")
        
        template = self.templates[template_name]
        prompt = template.prompt_template
        
        # Remplacer les placeholders dans le template
        prompt = prompt.replace("[sujet]", sujet)
        
        # Remplacer les actions
        for i, action in enumerate(actions, start=1):
            prompt = prompt.replace(f"[action {i}]", action)
        
        # Remplacer les détails supplémentaires
        for key, value in details.items():
            placeholder = f"[{key}]"
            prompt = prompt.replace(placeholder, value)
        
        return prompt
    
    def save_template_to_file(self, template_name: str, file_path: str) -> None:
        """Sauvegarde un template dans un fichier JSON.
        
        Args:
            template_name: Nom du template à sauvegarder.
            file_path: Chemin du fichier de destination.
        """
        if template_name not in self.templates:
            raise ValueError(f"Template '{template_name}' non trouvé.")
        
        template = self.templates[template_name]
        template_data = {
            "name": template.name,
            "description": template.description,
            "metadata": template.metadata,
            "generation_steps": template.generation_steps,
            "prompt_template": template.prompt_template
        }
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(template_data, f, indent=4, ensure_ascii=False)
    
    def load_template_from_file(self, file_path: str) -> VideoTemplate:
        """Charge un template à partir d'un fichier JSON.
        
        Args:
            file_path: Chemin du fichier JSON contenant le template.
        
        Returns:
            VideoTemplate: Template chargé.
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            template_data = json.load(f)
        
        return VideoTemplate(
            name=template_data["name"],
            description=template_data["description"],
            metadata=template_data["metadata"],
            generation_steps=template_data["generation_steps"],
            prompt_template=template_data["prompt_template"]
        )
    
    def list_templates(self) -> List[str]:
        """Liste tous les templates disponibles.
        
        Returns:
            List[str]: Liste des noms des templates.
        """
        return list(self.templates.keys())
    
    def get_template_info(self, template_name: str) -> Dict[str, Any]:
        """Récupère les informations d'un template spécifié.
        
        Args:
            template_name: Nom du template.
        
        Returns:
            Dict[str, Any]: Informations du template.
        """
        if template_name not in self.templates:
            raise ValueError(f"Template '{template_name}' non trouvé.")
        
        template = self.templates[template_name]
        return {
            "name": template.name,
            "description": template.description,
            "metadata": template.metadata,
            "generation_steps": template.generation_steps,
            "prompt_template": template.prompt_template
        }


def main():
    """Fonction principale pour démontrer l'utilisation du générateur de prompts."""
    generator = VideoPromptGenerator()
    
    # Exemple de génération de prompt
    prompt = generator.generate_prompt(
        template_name="video_dynamique",
        sujet="un personnage",
        actions=["courir dans un champ", "sauter par-dessus une clôture", "atterrir en roulant"],
        details={
            "détail spécifique": "la fluidité des mouvements",
            "description de l'environnement": "un champ verdoyant avec des collines en arrière-plan"
        }
    )
    
    print("Prompt généré:")
    print(prompt)
    
    # Sauvegarder un template dans un fichier
    generator.save_template_to_file("video_dynamique", "example_video_template.json")
    print("\nTemplate sauvegardé dans 'example_video_template.json'")


if __name__ == "__main__":
    main()