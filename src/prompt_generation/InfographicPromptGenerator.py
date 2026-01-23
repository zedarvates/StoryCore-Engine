#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
InfographicPromptGenerator.py
Module de génération de prompts pour infographies basé sur des templates de style.
Intégré au projet StoryCore Engine pour une génération modulaire et personnalisée.
"""

import json
import os
import re
from typing import Dict, List, Optional, Any
from dataclasses import dataclass


@dataclass
class InfographicTemplate:
    """Classe représentant un template de style pour infographie."""
    name: str
    description: str
    structure: str
    graphic_style: str
    orientation: str
    detail_level: str
    visual_requirements: List[str]
    example_prompt: str


class InfographicPromptGenerator:
    """Système de génération de prompts pour infographies."""
    
    def __init__(self, template_file_path: str = None):
        """
        Initialise le générateur de prompts.
        
        Args:
            template_file_path: Chemin vers le fichier de templates (optionnel)
        """
        self.templates: Dict[str, InfographicTemplate] = {}
        if template_file_path:
            self.default_template_file = template_file_path
        else:
            self.default_template_file = os.path.join(
                os.path.dirname(__file__),
                "..",
                "..",
                "documentation",
                "docs R&D",
                "templates_prompts_infographies.md"
            )
        
    def load_templates_from_file(self, file_path: str = None) -> None:
        """
        Charge les templates à partir d'un fichier Markdown.
        
        Args:
            file_path: Chemin vers le fichier de templates
        """
        file_path = file_path or self.default_template_file
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Template file not found: {file_path}")
        
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        self._parse_templates_from_markdown(content)
    
    def _parse_templates_from_markdown(self, markdown_content: str) -> None:
        """
        Parse les templates à partir du contenu Markdown.
        
        Args:
            markdown_content: Contenu Markdown à parser
        """
        # Pattern pour extraire les templates
        template_pattern = re.compile(
            r'### Template \d+ : (.+?)\n\n```\n(.+?)```',
            re.DOTALL
        )
        
        # Pattern pour extraire les styles graphiques
        styles_pattern = re.compile(
            r'### Styles (.+?)\n(.+?)(?=###|$)',
            re.DOTALL
        )
        
        # Extraire les templates
        templates = template_pattern.findall(markdown_content)
        
        for template_name, template_content in templates:
            template_info = self._parse_template_content(template_content)
            self.templates[template_name.strip()] = template_info
        
        # Extraire les styles graphiques
        self.graphic_styles = {}
        for match in styles_pattern.findall(markdown_content):
            style_category = match[0].strip()
            style_items = [item.strip() for item in match[1].split('\n') if item.strip() and item != '-']
            self.graphic_styles[style_category] = style_items
    
    def _parse_template_content(self, template_content: str) -> InfographicTemplate:
        """
        Parse le contenu d'un template individuel.
        
        Args:
            template_content: Contenu du template à parser
        
        Returns:
            InfographicTemplate: Objet template parsé
        """
        lines = [line.strip() for line in template_content.split('\n') if line.strip()]
        
        # Extraire les informations du template
        sujet = ""
        disposition = ""
        style_graphique = ""
        orientation = ""
        niveau_detail = ""
        exigences_visuelles = []
        
        in_exigences = False
        
        for line in lines:
            if line.startswith("Créer une infographie"):
                # Extraire le type et le sujet
                match = re.search(r"pour expliquer \[(.+?)\]", line)
                if match:
                    sujet = match.group(1)
            elif line.startswith("Structure :"):
                match = re.search(r"\[(.+?)\]", line)
                if match:
                    disposition = match.group(1)
            elif line.startswith("Format :"):
                match = re.search(r"\[(.+?)\]", line)
                if match:
                    orientation = match.group(1)
            elif line.startswith("Style graphique :"):
                match = re.search(r"\[(.+?)\]", line)
                if match:
                    style_graphique = match.group(1)
            elif line.startswith("Niveau de détail :"):
                niveau_detail = line.split(":")[1].strip()
            elif line.startswith("Exigences visuelles :"):
                in_exigences = True
                continue
            elif in_exigences:
                if line.startswith("-"):
                    exigences_visuelles.append(line[1:].strip())
                elif line and not line.startswith("Générer"):
                    exigences_visuelles.append(line.strip())
                else:
                    in_exigences = False
        
        return InfographicTemplate(
            name=f"Template pour {sujet}",
            description=f"Infographie sur {sujet}",
            structure=disposition,
            graphic_style=style_graphique,
            orientation=orientation,
            detail_level=niveau_detail,
            visual_requirements=exigences_visuelles,
            example_prompt=template_content
        )
    
    def generate_prompt(
        self,
        template_name: str,
        sujet: str,
        disposition: str = None,
        style_graphique: str = None,
        orientation: str = None,
        niveau_detail: str = None,
        exigences_supplementaires: List[str] = None
    ) -> str:
        """
        Génère un prompt personnalisé pour une infographie.
        
        Args:
            template_name: Nom du template à utiliser
            sujet: Sujet de l'infographie
            disposition: Type de disposition (optionnel)
            style_graphique: Style graphique (optionnel)
            orientation: Orientation (optionnel)
            niveau_detail: Niveau de détail (optionnel)
            exigences_supplementaires: Exigences supplémentaires (optionnel)
        
        Returns:
            str: Prompt généré
        """
        if template_name not in self.templates:
            raise ValueError(f"Template '{template_name}' non trouvé")
        
        template = self.templates[template_name]
        
        # Remplacer les valeurs par défaut par les paramètres fournis
        disposition = disposition or template.structure
        style_graphique = style_graphique or template.graphic_style
        orientation = orientation or template.orientation
        niveau_detail = niveau_detail or template.detail_level
        
        # Construire le prompt
        prompt_lines = [
            f"Créer une infographie {template.description.lower()} pour expliquer {sujet}.",
            f"Structure : {disposition}.",
            f"Format : {orientation}.",
            f"Style graphique : {style_graphique}.",
            f"Niveau de détail : {niveau_detail}.",
            "Exigences visuelles :"
        ]
        
        # Ajouter les exigences visuelles
        for exigence in template.visual_requirements:
            prompt_lines.append(f"- {exigence}")
        
        # Ajouter les exigences supplémentaires
        if exigences_supplementaires:
            for exigence in exigences_supplementaires:
                prompt_lines.append(f"- {exigence}")
        
        # Ajouter la conclusion
        prompt_lines.append(
            "Générer une infographie mémorable et professionnelle, "
            "adaptée pour présentation, blog et réseaux sociaux."
        )
        
        return "\n".join(prompt_lines)
    
    def get_available_templates(self) -> List[str]:
        """
        Retourne la liste des templates disponibles.
        
        Returns:
            List[str]: Liste des noms de templates
        """
        return list(self.templates.keys())
    
    def get_available_graphic_styles(self) -> Dict[str, List[str]]:
        """
        Retourne les styles graphiques disponibles.
        
        Returns:
            Dict[str, List[str]]: Styles graphiques par catégorie
        """
        return self.graphic_styles
    
    def save_template_to_json(
        self,
        template_name: str,
        output_file: str
    ) -> None:
        """
        Sauvegarde un template au format JSON.
        
        Args:
            template_name: Nom du template à sauvegarder
            output_file: Chemin du fichier de sortie
        """
        if template_name not in self.templates:
            raise ValueError(f"Template '{template_name}' non trouvé")
        
        template = self.templates[template_name]
        template_dict = {
            "name": template.name,
            "description": template.description,
            "structure": template.structure,
            "graphic_style": template.graphic_style,
            "orientation": template.orientation,
            "detail_level": template.detail_level,
            "visual_requirements": template.visual_requirements,
            "example_prompt": template.example_prompt
        }
        
        with open(output_file, 'w', encoding='utf-8') as file:
            json.dump(template_dict, file, indent=2, ensure_ascii=False)
    
    def load_template_from_json(self, json_file: str) -> InfographicTemplate:
        """
        Charge un template à partir d'un fichier JSON.
        
        Args:
            json_file: Chemin vers le fichier JSON
        
        Returns:
            InfographicTemplate: Template chargé
        """
        with open(json_file, 'r', encoding='utf-8') as file:
            template_data = json.load(file)
        
        return InfographicTemplate(
            name=template_data["name"],
            description=template_data["description"],
            structure=template_data["structure"],
            graphic_style=template_data["graphic_style"],
            orientation=template_data["orientation"],
            detail_level=template_data["detail_level"],
            visual_requirements=template_data["visual_requirements"],
            example_prompt=template_data["example_prompt"]
        )


def create_infographic_prompt(
    template_name: str,
    sujet: str,
    disposition: str = None,
    style_graphique: str = None,
    orientation: str = None,
    niveau_detail: str = None,
    exigences_supplementaires: List[str] = None
) -> str:
    """
    Fonction utilitaire pour créer un prompt d'infographie.
    
    Args:
        template_name: Nom du template
        sujet: Sujet de l'infographie
        disposition: Type de disposition
        style_graphique: Style graphique
        orientation: Orientation
        niveau_detail: Niveau de détail
        exigences_supplementaires: Exigences supplémentaires
    
    Returns:
        str: Prompt généré
    """
    generator = InfographicPromptGenerator()
    generator.load_templates_from_file()
    return generator.generate_prompt(
        template_name,
        sujet,
        disposition,
        style_graphique,
        orientation,
        niveau_detail,
        exigences_supplementaires
    )


if __name__ == "__main__":
    # Exemple d'utilisation
    generator = InfographicPromptGenerator()
    generator.load_templates_from_file()
    
    # Générer un prompt pour une infographie professionnelle
    prompt = generator.generate_prompt(
        "Infographie Professionnelle",
        "le fonctionnement des énergies renouvelables",
        "processus en 5 étapes",
        "dashboard entreprise",
        "16/9",
        "standard"
    )
    
    print("Prompt généré:")
    print(prompt)
    
    # Afficher les templates disponibles
    print("\nTemplates disponibles:")
    for template in generator.get_available_templates():
        print(f"- {template}")
    
    # Afficher les styles graphiques disponibles
    print("\nStyles graphiques disponibles:")
    for category, styles in generator.get_available_graphic_styles().items():
        print(f"\n{category}:")
        for style in styles:
            print(f"  - {style}")