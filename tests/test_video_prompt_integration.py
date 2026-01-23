#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test pour l'intégration du générateur de prompts vidéo avec StoryCore Engine.

Ce module contient des tests unitaires pour vérifier le bon fonctionnement
de l'intégration du générateur de prompts vidéo avec StoryCore Engine.
"""

import unittest
import os
import tempfile
import shutil
from src.prompt_generation.VideoPromptGenerator import VideoPromptGenerator
from src.prompt_generation.integration import VideoPromptIntegration


class TestVideoPromptIntegration(unittest.TestCase):
    """Classe de test pour VideoPromptIntegration."""
    
    def setUp(self):
        """Configuration initiale pour les tests."""
        self.generator = VideoPromptGenerator()
        self.integration = VideoPromptIntegration(self.generator)
    
    def test_integrate_with_storycore(self):
        """Test l'intégration avec les données du projet StoryCore."""
        project_data = {
            "name": "Test Project",
            "sequences": [
                {
                    "id": 1,
                    "subject": "un héros",
                    "actions": ["courir", "sauter"],
                    "detail": "la fluidité",
                    "environment": "une forêt"
                }
            ]
        }
        
        updated_project = self.integration.integrate_with_storycore(project_data)
        
        self.assertIn("video_prompt", updated_project["sequences"][0])
        self.assertIsInstance(updated_project["sequences"][0]["video_prompt"], str)
    
    def test_generate_prompt_for_scene(self):
        """Test la génération d'un prompt pour une scène spécifique."""
        scene_data = {
            "subject": "une héroïne",
            "actions": ["marcher", "regarder"],
            "detail": "les expressions",
            "environment": "une ville"
        }
        
        prompt = self.integration.generate_prompt_for_scene(scene_data)
        
        self.assertIsInstance(prompt, str)
        self.assertIn("une héroïne", prompt)
    
    def test_save_project_with_prompts(self):
        """Test la sauvegarde des données du projet avec les prompts générés."""
        project_data = {
            "name": "Test Project",
            "sequences": [
                {
                    "id": 1,
                    "subject": "un héros",
                    "actions": ["courir", "sauter"],
                    "detail": "la fluidité",
                    "environment": "une forêt",
                    "video_prompt": "Une vidéo montrant un héros en train de courir..."
                }
            ]
        }
        
        # Créer un répertoire temporaire pour le test
        temp_dir = tempfile.mkdtemp()
        
        try:
            self.integration.save_project_with_prompts(project_data, temp_dir)
            
            # Vérifier que les fichiers ont été créés
            prompt_file = os.path.join(temp_dir, "sequence_0_video_prompt.txt")
            project_file = os.path.join(temp_dir, "project_with_prompts.json")
            
            self.assertTrue(os.path.exists(prompt_file))
            self.assertTrue(os.path.exists(project_file))
            
        finally:
            # Nettoyer le répertoire temporaire
            shutil.rmtree(temp_dir)


if __name__ == "__main__":
    unittest.main()