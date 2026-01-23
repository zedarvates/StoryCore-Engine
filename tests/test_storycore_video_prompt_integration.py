#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test pour l'intégration avancée du générateur de prompts vidéo avec StoryCore Engine.

Ce module contient des tests unitaires pour vérifier le bon fonctionnement
de l'intégration avancée du générateur de prompts vidéo avec StoryCore Engine.
"""

import unittest
import os
import tempfile
import shutil
from src.prompt_generation.VideoPromptGenerator import VideoPromptGenerator
from src.prompt_generation.storycore_integration import StoryCoreVideoPromptIntegration


class TestStoryCoreVideoPromptIntegration(unittest.TestCase):
    """Classe de test pour StoryCoreVideoPromptIntegration."""
    
    def setUp(self):
        """Configuration initiale pour les tests."""
        self.generator = VideoPromptGenerator()
        self.integration = StoryCoreVideoPromptIntegration(self.generator)
    
    def test_recommend_template_for_project(self):
        """Test la recommandation de template pour un projet."""
        template = self.integration.recommend_template_for_project("action")
        self.assertEqual(template, "video_dynamique")
        
        template = self.integration.recommend_template_for_project("fantasy")
        self.assertEqual(template, "video_effets_speciaux")
        
        template = self.integration.recommend_template_for_project("drama")
        self.assertEqual(template, "video_transition")
    
    def test_generate_prompts_for_project(self):
        """Test la génération de prompts pour un projet complet."""
        project_data = {
            "name": "Test Project",
            "sequences": [
                {
                    "id": 1,
                    "subject": "un héros",
                    "actions": ["courir", "sauter"],
                    "detail": "la fluidité",
                    "environment": "une forêt",
                    "special_effects": True
                },
                {
                    "id": 2,
                    "subject": "une héroïne",
                    "actions": ["marcher", "regarder"],
                    "detail": "les expressions",
                    "environment": "une ville",
                    "transition": True
                }
            ]
        }
        
        updated_project = self.integration.generate_prompts_for_project(project_data)
        
        self.assertIn("video_prompt", updated_project["sequences"][0])
        self.assertIn("video_prompt", updated_project["sequences"][1])
    
    def test_export_prompts_to_storycore_format(self):
        """Test l'export des prompts dans un format compatible avec StoryCore Engine."""
        project_data = {
            "name": "Test Project",
            "sequences": [
                {
                    "id": 1,
                    "subject": "un héros",
                    "actions": ["courir", "sauter"],
                    "detail": "la fluidité",
                    "environment": "une forêt",
                    "special_effects": True,
                    "video_prompt": "Une vidéo montrant un héros en train de courir..."
                }
            ]
        }
        
        # Créer un répertoire temporaire pour le test
        temp_dir = tempfile.mkdtemp()
        
        try:
            self.integration.export_prompts_to_storycore_format(project_data, temp_dir)
            
            # Vérifier que les fichiers ont été créés
            prompt_file = os.path.join(temp_dir, "sequence_000_video_prompt.json")
            project_file = os.path.join(temp_dir, "project_prompts.json")
            
            self.assertTrue(os.path.exists(prompt_file))
            self.assertTrue(os.path.exists(project_file))
            
        finally:
            # Nettoyer le répertoire temporaire
            shutil.rmtree(temp_dir)
    
    def test_integrate_with_timeline(self):
        """Test l'intégration avec les données de la timeline."""
        timeline_data = {
            "tracks": [
                {
                    "type": "video",
                    "clips": [
                        {
                            "subject": "un personnage",
                            "actions": ["se déplacer", "interagir"],
                            "detail": "la fluidité",
                            "environment": "un environnement"
                        }
                    ]
                }
            ]
        }
        
        updated_timeline = self.integration.integrate_with_timeline(timeline_data)
        
        self.assertIn("video_prompt", updated_timeline["tracks"][0]["clips"][0])


if __name__ == "__main__":
    unittest.main()