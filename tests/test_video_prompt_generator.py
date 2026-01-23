#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test pour le générateur de prompts vidéo.

Ce module contient des tests unitaires pour vérifier le bon fonctionnement
du générateur de prompts vidéo.
"""

import unittest
import os
import tempfile
from src.prompt_generation.VideoPromptGenerator import VideoPromptGenerator, VideoTemplate


class TestVideoPromptGenerator(unittest.TestCase):
    """Classe de test pour VideoPromptGenerator."""
    
    def setUp(self):
        """Configuration initiale pour les tests."""
        self.generator = VideoPromptGenerator()
    
    def test_initialization(self):
        """Test l'initialisation du générateur."""
        self.assertIsNotNone(self.generator)
        self.assertGreater(len(self.generator.templates), 0)
    
    def test_list_templates(self):
        """Test la liste des templates disponibles."""
        templates = self.generator.list_templates()
        self.assertIn("video_dynamique", templates)
        self.assertIn("video_effets_speciaux", templates)
        self.assertIn("video_transition", templates)
    
    def test_generate_prompt(self):
        """Test la génération d'un prompt vidéo."""
        prompt = self.generator.generate_prompt(
            template_name="video_dynamique",
            sujet="un personnage",
            actions=["courir", "sauter", "atterrir"],
            details={
                "détail spécifique": "la fluidité",
                "description de l'environnement": "une forêt"
            }
        )
        self.assertIsInstance(prompt, str)
        self.assertIn("un personnage", prompt)
        self.assertIn("courir", prompt)
        self.assertIn("sauter", prompt)
        self.assertIn("atterrir", prompt)
    
    def test_save_and_load_template(self):
        """Test la sauvegarde et le chargement d'un template."""
        # Créer un fichier temporaire pour le test
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as temp_file:
            temp_file_path = temp_file.name
        
        try:
            # Sauvegarder un template
            self.generator.save_template_to_file("video_dynamique", temp_file_path)
            
            # Vérifier que le fichier a été créé
            self.assertTrue(os.path.exists(temp_file_path))
            
            # Charger le template depuis le fichier JSON
            loaded_template = self.generator.load_template_from_file(temp_file_path)
            
            # Vérifier que le template chargé est valide
            self.assertIsInstance(loaded_template, VideoTemplate)
            self.assertEqual(loaded_template.name, "Génération de Prompt Vidéo Dynamique")
            
        finally:
            # Nettoyer le fichier temporaire
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
    
    def test_get_template_info(self):
        """Test la récupération des informations d'un template."""
        template_info = self.generator.get_template_info("video_dynamique")
        self.assertEqual(template_info["name"], "Génération de Prompt Vidéo Dynamique")
        self.assertEqual(template_info["description"], "Template pour des vidéos avec des mouvements denses et une forte amplitude.")
    
    def test_invalid_template(self):
        """Test la gestion des templates invalides."""
        with self.assertRaises(ValueError):
            self.generator.generate_prompt(
                template_name="template_invalide",
                sujet="un personnage",
                actions=["courir"],
                details={}
            )


if __name__ == "__main__":
    unittest.main()