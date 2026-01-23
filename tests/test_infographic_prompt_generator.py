#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tests unitaires pour le générateur de prompts d'infographies.
"""

import unittest
import os
import tempfile
from src.prompt_generation.InfographicPromptGenerator import (
    InfographicPromptGenerator,
    InfographicTemplate
)


class TestInfographicPromptGenerator(unittest.TestCase):
    """Tests pour la classe InfographicPromptGenerator."""
    
    def setUp(self):
        """Configuration initiale pour les tests."""
        self.generator = InfographicPromptGenerator()
        # Utiliser un chemin relatif pour le fichier de templates
        self.generator.default_template_file = os.path.join(
            os.path.dirname(__file__),
            "..",
            "documentation",
            "docs R&D",
            "templates_prompts_infographies.md"
        )
    
    def test_load_templates_from_file(self):
        """Test le chargement des templates à partir d'un fichier."""
        # Vérifier que le fichier existe
        self.assertTrue(os.path.exists(self.generator.default_template_file))
        
        # Charger les templates
        self.generator.load_templates_from_file()
        
        # Vérifier que des templates ont été chargés
        self.assertGreater(len(self.generator.templates), 0)
        
        # Vérifier que les templates attendus sont présents
        expected_templates = [
            "Infographie Professionnelle",
            "Infographie pour Enfants",
            "Infographie Technique",
            "Infographie Ludique",
            "Infographie Corporate"
        ]
        
        for template_name in expected_templates:
            self.assertIn(template_name, self.generator.templates)
    
    def test_get_available_templates(self):
        """Test la récupération des templates disponibles."""
        self.generator.load_templates_from_file()
        templates = self.generator.get_available_templates()
        
        self.assertIsInstance(templates, list)
        self.assertGreater(len(templates), 0)
    
    def test_get_available_graphic_styles(self):
        """Test la récupération des styles graphiques disponibles."""
        self.generator.load_templates_from_file()
        styles = self.generator.get_available_graphic_styles()
        
        self.assertIsInstance(styles, dict)
        self.assertGreater(len(styles), 0)
        
        # Vérifier que certaines catégories de styles sont présentes
        expected_categories = [
            "Professionnels",
            "Ludiques",
            "Artistiques",
            "Techniques",
            "Spéciaux"
        ]
        
        for category in expected_categories:
            self.assertIn(category, styles)
    
    def test_generate_prompt(self):
        """Test la génération d'un prompt personnalisé."""
        self.generator.load_templates_from_file()
        
        # Générer un prompt avec le template professionnel
        prompt = self.generator.generate_prompt(
            "Infographie Professionnelle",
            "le fonctionnement des énergies renouvelables",
            "processus en 5 étapes",
            "dashboard entreprise",
            "16/9",
            "standard"
        )
        
        # Vérifier que le prompt contient les éléments attendus
        self.assertIn("énergies renouvelables", prompt)
        self.assertIn("processus en 5 étapes", prompt)
        self.assertIn("dashboard entreprise", prompt)
        self.assertIn("16/9", prompt)
        self.assertIn("standard", prompt)
    
    def test_generate_prompt_with_custom_requirements(self):
        """Test la génération d'un prompt avec des exigences supplémentaires."""
        self.generator.load_templates_from_file()
        
        custom_requirements = [
            "Utiliser des icônes écologiques",
            "Inclure un diagramme de flux d'énergie",
            "Palette de couleurs verte et bleue"
        ]
        
        prompt = self.generator.generate_prompt(
            "Infographie Professionnelle",
            "les avantages des énergies renouvelables",
            exigences_supplementaires=custom_requirements
        )
        
        # Vérifier que les exigences supplémentaires sont incluses
        for requirement in custom_requirements:
            self.assertIn(requirement, prompt)
    
    def test_save_and_load_template_json(self):
        """Test la sauvegarde et le chargement d'un template au format JSON."""
        self.generator.load_templates_from_file()
        
        # Créer un fichier temporaire pour le test
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as temp_file:
            temp_file_path = temp_file.name
        
        try:
            # Sauvegarder un template
            self.generator.save_template_to_json("Infographie Professionnelle", temp_file_path)
            
            # Vérifier que le fichier a été créé
            self.assertTrue(os.path.exists(temp_file_path))
            
            # Charger le template depuis le fichier JSON
            loaded_template = self.generator.load_template_from_json(temp_file_path)
            
            # Vérifier que le template chargé est valide
            self.assertIsInstance(loaded_template, InfographicTemplate)
            self.assertIn("Template pour", loaded_template.name)
            
        finally:
            # Nettoyer le fichier temporaire
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
    
    def test_create_infographic_prompt_function(self):
        """Test la fonction utilitaire create_infographic_prompt."""
        from src.prompt_generation.InfographicPromptGenerator import create_infographic_prompt
        
        prompt = create_infographic_prompt(
            "Infographie pour Enfants",
            "le cycle de l'eau",
            "carte mentale",
            "Lego 3D",
            "carré",
            "concis"
        )
        
        # Vérifier que le prompt contient les éléments attendus
        self.assertIn("cycle de l'eau", prompt)
        self.assertIn("carte mentale", prompt)
        self.assertIn("Lego 3D", prompt)
        self.assertIn("carré", prompt)
        self.assertIn("concis", prompt)


if __name__ == '__main__':
    unittest.main()