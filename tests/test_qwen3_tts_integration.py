#!/usr/bin/env python3
"""
Tests unitaires pour l'intégration Qwen3-TTS.
Ce module contient des tests pour valider le fonctionnement de base
de l'intégration Qwen3-TTS.
"""

import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch, Mock
from src.qwen3_tts_integration import Qwen3TTSIntegration
from src.qwen3_tts_prompt_strategy import Qwen3TTSPromptStrategy


class TestQwen3TTSIntegration(unittest.TestCase):
    """
    Tests pour la classe Qwen3TTSIntegration.
    """
    
    def setUp(self):
        """
        Configuration initiale pour les tests.
        """
        self.temp_dir = tempfile.mkdtemp()
        self.output_path = os.path.join(self.temp_dir, "test_audio.wav")
        
    def tearDown(self):
        """
        Nettoyage après les tests.
        """
        if os.path.exists(self.output_path):
            os.remove(self.output_path)
        os.rmdir(self.temp_dir)
        
    @patch('src.qwen3_tts_integration.qwen_tts.QwenTTS')
    def test_initialization(self, mock_qwen_tts):
        """
        Test l'initialisation de Qwen3TTSIntegration.
        """
        # Configuration du mock
        mock_instance = MagicMock()
        mock_qwen_tts.return_value = mock_instance
        
        # Initialisation
        qwen3_tts = Qwen3TTSIntegration(model_name="qwen3-tts-1.7b")
        
        # Vérifications
        self.assertEqual(qwen3_tts.model_name, "qwen3-tts-1.7b")
        self.assertIsNotNone(qwen3_tts.config)
        self.assertEqual(qwen3_tts.model, mock_instance)
        
    @patch('src.qwen3_tts_integration.qwen_tts.QwenTTS')
    def test_generate_voice_success(self, mock_qwen_tts):
        """
        Test la génération de voix avec succès.
        """
        # Configuration du mock
        mock_instance = MagicMock()
        mock_instance.generate_voice.return_value = b"fake_audio_data"
        mock_qwen_tts.return_value = mock_instance
        
        # Initialisation
        qwen3_tts = Qwen3TTSIntegration()
        
        # Génération de voix
        result = qwen3_tts.generate_voice("Test text", self.output_path)
        
        # Vérifications
        self.assertTrue(result)
        self.assertTrue(os.path.exists(self.output_path))
        mock_instance.generate_voice.assert_called_once_with("Test text", **{})
        
    @patch('src.qwen3_tts_integration.qwen_tts.QwenTTS')
    def test_generate_voice_failure(self, mock_qwen_tts):
        """
        Test la génération de voix avec échec.
        """
        # Configuration du mock pour lever une exception
        mock_instance = MagicMock()
        mock_instance.generate_voice.side_effect = Exception("Generation error")
        mock_qwen_tts.return_value = mock_instance
        
        # Initialisation
        qwen3_tts = Qwen3TTSIntegration()
        
        # Génération de voix
        result = qwen3_tts.generate_voice("Test text", self.output_path)
        
        # Vérifications
        self.assertFalse(result)
        self.assertFalse(os.path.exists(self.output_path))
        
    @patch('src.qwen3_tts_integration.qwen_tts.QwenTTS')
    def test_clone_voice_success(self, mock_qwen_tts):
        """
        Test le clonage de voix avec succès.
        """
        # Configuration du mock
        mock_instance = MagicMock()
        mock_instance.clone_voice.return_value = b"fake_audio_data"
        mock_qwen_tts.return_value = mock_instance
        
        # Initialisation
        qwen3_tts = Qwen3TTSIntegration()
        
        # Création d'un fichier audio de référence temporaire
        reference_audio_path = os.path.join(self.temp_dir, "reference.wav")
        with open(reference_audio_path, 'wb') as f:
            f.write(b"fake_reference_audio")
        
        # Clonage de voix
        result = qwen3_tts.clone_voice(reference_audio_path, "Test text", self.output_path)
        
        # Vérifications
        self.assertTrue(result)
        self.assertTrue(os.path.exists(self.output_path))
        mock_instance.clone_voice.assert_called_once_with(b"fake_reference_audio", "Test text")
        
    @patch('src.qwen3_tts_integration.qwen_tts.QwenTTS')
    def test_clone_voice_failure(self, mock_qwen_tts):
        """
        Test le clonage de voix avec échec.
        """
        # Configuration du mock pour lever une exception
        mock_instance = MagicMock()
        mock_instance.clone_voice.side_effect = Exception("Cloning error")
        mock_qwen_tts.return_value = mock_instance
        
        # Initialisation
        qwen3_tts = Qwen3TTSIntegration()
        
        # Création d'un fichier audio de référence temporaire
        reference_audio_path = os.path.join(self.temp_dir, "reference.wav")
        with open(reference_audio_path, 'wb') as f:
            f.write(b"fake_reference_audio")
        
        # Clonage de voix
        result = qwen3_tts.clone_voice(reference_audio_path, "Test text", self.output_path)
        
        # Vérifications
        self.assertFalse(result)
        self.assertFalse(os.path.exists(self.output_path))
        
    def test_generate_prompt(self):
        """
        Test la génération de prompts.
        """
        # Initialisation
        qwen3_tts = Qwen3TTSIntegration()
        
        # Génération de prompt
        prompt = qwen3_tts.generate_prompt("male", "happy", "en")
        
        # Vérifications
        self.assertIsInstance(prompt, str)
        self.assertIn("male", prompt)
        self.assertIn("happy", prompt)
        self.assertIn("en", prompt)
        
    def test_close(self):
        """
        Test la fermeture du modèle.
        """
        # Initialisation avec mock
        with patch('src.qwen3_tts_integration.qwen_tts.QwenTTS') as mock_qwen_tts:
            mock_instance = MagicMock()
            mock_qwen_tts.return_value = mock_instance
            
            qwen3_tts = Qwen3TTSIntegration()
            qwen3_tts.close()
            
            # Vérifications
            mock_instance.close.assert_called_once()
            self.assertIsNone(qwen3_tts.model)


class TestQwen3TTSPromptStrategy(unittest.TestCase):
    """
    Tests pour la classe Qwen3TTSPromptStrategy.
    """
    
    def setUp(self):
        """
        Configuration initiale pour les tests.
        """
        self.prompt_strategy = Qwen3TTSPromptStrategy()
        
    def test_generate_prompt_simple(self):
        """
        Test la génération d'un prompt simple.
        """
        # Génération de prompt
        prompt = self.prompt_strategy.generate_prompt("male", "happy", "en")
        
        # Vérifications
        self.assertIsInstance(prompt, str)
        self.assertIn("male", prompt)
        self.assertIn("cheerful", prompt)
        self.assertIn("en", prompt)
        
    def test_generate_prompt_few_shot(self):
        """
        Test la génération d'un prompt avec few-shot learning.
        """
        # Génération de prompt avec few-shot learning
        prompt = self.prompt_strategy.generate_prompt("male", "happy", "en", use_few_shot=True)
        
        # Vérifications
        self.assertIsInstance(prompt, str)
        self.assertIn("Example", prompt)
        self.assertIn("male", prompt)
        self.assertIn("cheerful", prompt)
        
    def test_save_custom_prompt(self):
        """
        Test la sauvegarde d'un prompt personnalisé.
        """
        # Sauvegarde d'un prompt personnalisé
        result = self.prompt_strategy.save_custom_prompt("test_prompt", "This is a test prompt")
        
        # Vérifications
        self.assertTrue(result)
        self.assertEqual(self.prompt_strategy.get_custom_prompt("test_prompt"), "This is a test prompt")
        
    def test_get_custom_prompt(self):
        """
        Test la récupération d'un prompt personnalisé.
        """
        # Sauvegarde d'un prompt personnalisé
        self.prompt_strategy.save_custom_prompt("test_prompt", "This is a test prompt")
        
        # Récupération du prompt
        prompt = self.prompt_strategy.get_custom_prompt("test_prompt")
        
        # Vérifications
        self.assertEqual(prompt, "This is a test prompt")
        
    def test_list_available_prompts(self):
        """
        Test la liste des prompts disponibles.
        """
        # Liste des prompts disponibles
        prompts = self.prompt_strategy.list_available_prompts()
        
        # Vérifications
        self.assertIsInstance(prompts, list)
        self.assertGreater(len(prompts), 0)
        


if __name__ == "__main__":
    unittest.main()