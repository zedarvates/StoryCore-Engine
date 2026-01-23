#!/usr/bin/env python3
"""
Module d'intégration de l'API Qwen3-TTS pour StoryCore Engine.
Ce module fournit une interface pour interagir avec les modèles Qwen3-TTS
pour la génération de voix, le clonage de voix et la synthèse multilingue.
"""

import os
import json
import logging
from typing import Optional, Dict, Any
from pathlib import Path

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Qwen3TTSIntegration:
    """
    Classe principale pour l'intégration de Qwen3-TTS.
    
    Cette classe gère l'initialisation du modèle, la génération de voix,
    le clonage de voix et la gestion des prompts.
    """
    
    def __init__(self, model_name: str = "qwen3-tts-1.7b", 
                 config_path: Optional[str] = None):
        """
        Initialise l'intégration Qwen3-TTS.
        
        Args:
            model_name (str): Nom du modèle Qwen3-TTS à utiliser.
            config_path (Optional[str]): Chemin vers le fichier de configuration.
        """
        self.model_name = model_name
        self.config = self._load_config(config_path)
        self.model = None
        self._initialize_model()
        
    def _load_config(self, config_path: Optional[str]) -> Dict[str, Any]:
        """
        Charge la configuration à partir d'un fichier JSON.
        
        Args:
            config_path (Optional[str]): Chemin vers le fichier de configuration.
        
        Returns:
            Dict[str, Any]: Configuration chargée ou configuration par défaut.
        """
        default_config = {
            "sample_rate": 44100,
            "voice_type": "default",
            "language": "en",
            "use_gpu": True
        }
        
        if config_path and os.path.exists(config_path):
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    default_config.update(config)
                    logger.info(f"Configuration chargée depuis {config_path}")
            except Exception as e:
                logger.error(f"Erreur lors du chargement de la configuration: {e}")
        
        return default_config
        
    def _initialize_model(self):
        """
        Initialise le modèle Qwen3-TTS.
        
        Cette méthode charge le modèle et le prépare pour la génération de voix.
        """
        try:
            # Importation dynamique pour éviter les erreurs si le package n'est pas installé
            from qwen_tts import QwenTTS
            
            # Initialisation du modèle
            self.model = QwenTTS(
                model_name=self.model_name,
                sample_rate=self.config["sample_rate"],
                voice_type=self.config["voice_type"],
                language=self.config["language"],
                use_gpu=self.config["use_gpu"]
            )
            logger.info(f"Modèle {self.model_name} initialisé avec succès")
        except ImportError as e:
            logger.error(f"Erreur d'importation du module QwenTTS: {e}")
            raise
        except Exception as e:
            logger.error(f"Erreur lors de l'initialisation du modèle: {e}")
            raise
            
    def generate_voice(self, text: str, output_path: str, 
                      voice_params: Optional[Dict[str, Any]] = None) -> bool:
        """
        Génère une voix à partir d'un texte donné.
        
        Args:
            text (str): Texte à convertir en voix.
            output_path (str): Chemin de sortie pour le fichier audio généré.
            voice_params (Optional[Dict[str, Any]]): Paramètres supplémentaires pour la voix.
        
        Returns:
            bool: True si la génération a réussi, False sinon.
        """
        if not self.model:
            logger.error("Le modèle n'est pas initialisé")
            return False
            
        try:
            # Préparation des paramètres de voix
            params = voice_params or {}
            
            # Génération de la voix
            audio_data = self.model.generate_voice(text, **params)
            
            # Sauvegarde du fichier audio
            output_dir = Path(output_path).parent
            if output_dir and not output_dir.exists():
                output_dir.mkdir(parents=True, exist_ok=True)
                
            with open(output_path, 'wb') as f:
                f.write(audio_data)
                
            logger.info(f"Voix générée avec succès: {output_path}")
            return True
        except Exception as e:
            logger.error(f"Erreur lors de la génération de la voix: {e}")
            return False
            
    def clone_voice(self, reference_audio_path: str, text: str, 
                   output_path: str) -> bool:
        """
        Clone une voix à partir d'un échantillon audio de référence.
        
        Args:
            reference_audio_path (str): Chemin vers l'échantillon audio de référence.
            text (str): Texte à convertir en voix clonée.
            output_path (str): Chemin de sortie pour le fichier audio généré.
        
        Returns:
            bool: True si le clonage a réussi, False sinon.
        """
        if not self.model:
            logger.error("Le modèle n'est pas initialisé")
            return False
            
        try:
            # Chargement de l'échantillon audio de référence
            with open(reference_audio_path, 'rb') as f:
                reference_audio = f.read()
                
            # Clonage de la voix
            audio_data = self.model.clone_voice(reference_audio, text)
            
            # Sauvegarde du fichier audio
            output_dir = Path(output_path).parent
            if output_dir and not output_dir.exists():
                output_dir.mkdir(parents=True, exist_ok=True)
                
            with open(output_path, 'wb') as f:
                f.write(audio_data)
                
            logger.info(f"Voix clonée avec succès: {output_path}")
            return True
        except Exception as e:
            logger.error(f"Erreur lors du clonage de la voix: {e}")
            return False
            
    def generate_prompt(self, voice_type: str, emotion: str, 
                       language: str) -> str:
        """
        Génère un prompt optimisé pour la génération de voix.
        
        Args:
            voice_type (str): Type de voix (par exemple, "male", "female", "child").
            emotion (str): Émotion à exprimer (par exemple, "happy", "sad", "angry").
            language (str): Langue de la voix (par exemple, "en", "fr", "es").
        
        Returns:
            str: Prompt optimisé pour la génération de voix.
        """
        # Exemples de prompts basés sur le plan d'intégration
        prompt_templates = {
            "male": {
                "happy": f"British accent, male voice, high pitch, fast speed, clear and cheerful personality traits. Language: {language}",
                "sad": f"British accent, male voice, low pitch, slow speed, sad and melancholic personality traits. Language: {language}",
                "angry": f"British accent, male voice, high pitch, fast speed, angry and aggressive personality traits. Language: {language}"
            },
            "female": {
                "happy": f"British accent, female voice, high pitch, fast speed, clear and cheerful personality traits. Language: {language}",
                "sad": f"British accent, female voice, low pitch, slow speed, sad and melancholic personality traits. Language: {language}",
                "angry": f"British accent, female voice, high pitch, fast speed, angry and aggressive personality traits. Language: {language}"
            },
            "child": {
                "happy": f"Child voice, high pitch, fast speed, playful and cheerful personality traits. Language: {language}",
                "sad": f"Child voice, low pitch, slow speed, sad and melancholic personality traits. Language: {language}",
                "angry": f"Child voice, high pitch, fast speed, angry and aggressive personality traits. Language: {language}"
            }
        }
        
        # Récupération du template de prompt
        prompt = prompt_templates.get(voice_type, {}).get(emotion, "")
        
        if not prompt:
            logger.warning(f"Aucun template de prompt trouvé pour voice_type={voice_type} et emotion={emotion}")
            prompt = f"{voice_type} voice, {emotion} emotion, neutral pitch, normal speed. Language: {language}"
            
        return prompt
        
    def close(self):
        """
        Ferme le modèle et libère les ressources.
        """
        if self.model:
            self.model.close()
            self.model = None
            logger.info("Modèle fermé et ressources libérées")


def main():
    """
    Fonction principale pour tester l'intégration Qwen3-TTS.
    """
    # Initialisation de l'intégration
    qwen3_tts = Qwen3TTSIntegration()
    
    # Exemple de génération de voix
    text = "Hello, this is a test of Qwen3-TTS integration."
    output_path = "output_audio.wav"
    
    # Génération de la voix
    success = qwen3_tts.generate_voice(text, output_path)
    
    if success:
        print(f"Voix générée avec succès: {output_path}")
    else:
        print("Échec de la génération de la voix")
        
    # Fermeture du modèle
    qwen3_tts.close()


if __name__ == "__main__":
    main()