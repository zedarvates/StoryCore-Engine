#!/usr/bin/env python3
"""
Stratégie de prompts pour Qwen3-TTS.
Ce module fournit des techniques de few-shot learning et des exemples de prompts
pour optimiser la qualité des voix générées.
"""

import json
import logging
from typing import Dict, List, Optional

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Qwen3TTSPromptStrategy:
    """
    Classe pour la gestion des prompts optimisés pour Qwen3-TTS.
    
    Cette classe fournit des méthodes pour générer des prompts efficaces
    en utilisant des techniques de few-shot learning et des exemples variés.
    """
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialise la stratégie de prompts.
        
        Args:
            config_path (Optional[str]): Chemin vers un fichier de configuration
                                        pour les prompts personnalisés.
        """
        self.prompt_templates = self._load_prompt_templates()
        self.custom_prompts = self._load_custom_prompts(config_path)
        
    def _load_prompt_templates(self) -> Dict[str, Dict[str, str]]:
        """
        Charge les templates de prompts par défaut.
        
        Returns:
            Dict[str, Dict[str, str]]: Dictionnaire de templates de prompts.
        """
        # Templates de prompts basés sur le plan d'intégration et des exemples variés
        templates = {
            "male": {
                "happy": "British accent, male voice, high pitch, fast speed, clear and cheerful personality traits. Language: {language}",
                "sad": "British accent, male voice, low pitch, slow speed, sad and melancholic personality traits. Language: {language}",
                "angry": "British accent, male voice, high pitch, fast speed, angry and aggressive personality traits. Language: {language}",
                "neutral": "British accent, male voice, normal pitch, normal speed, neutral personality traits. Language: {language}"
            },
            "female": {
                "happy": "British accent, female voice, high pitch, fast speed, clear and cheerful personality traits. Language: {language}",
                "sad": "British accent, female voice, low pitch, slow speed, sad and melancholic personality traits. Language: {language}",
                "angry": "British accent, female voice, high pitch, fast speed, angry and aggressive personality traits. Language: {language}",
                "neutral": "British accent, female voice, normal pitch, normal speed, neutral personality traits. Language: {language}"
            },
            "child": {
                "happy": "Child voice, high pitch, fast speed, playful and cheerful personality traits. Language: {language}",
                "sad": "Child voice, low pitch, slow speed, sad and melancholic personality traits. Language: {language}",
                "angry": "Child voice, high pitch, fast speed, angry and aggressive personality traits. Language: {language}",
                "neutral": "Child voice, normal pitch, normal speed, neutral personality traits. Language: {language}"
            },
            "elderly": {
                "happy": "Elderly voice, low pitch, slow speed, wise and cheerful personality traits. Language: {language}",
                "sad": "Elderly voice, low pitch, slow speed, sad and melancholic personality traits. Language: {language}",
                "angry": "Elderly voice, low pitch, slow speed, angry and authoritative personality traits. Language: {language}",
                "neutral": "Elderly voice, low pitch, slow speed, neutral personality traits. Language: {language}"
            }
        }
        
        return templates
        
    def _load_custom_prompts(self, config_path: Optional[str]) -> Dict[str, str]:
        """
        Charge les prompts personnalisés à partir d'un fichier de configuration.
        
        Args:
            config_path (Optional[str]): Chemin vers le fichier de configuration.
        
        Returns:
            Dict[str, str]: Dictionnaire de prompts personnalisés.
        """
        custom_prompts = {}
        
        if config_path:
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    custom_prompts = json.load(f)
                    logger.info(f"Prompts personnalisés chargés depuis {config_path}")
            except Exception as e:
                logger.error(f"Erreur lors du chargement des prompts personnalisés: {e}")
                
        return custom_prompts
        
    def generate_prompt(self, voice_type: str, emotion: str, 
                       language: str, use_few_shot: bool = False) -> str:
        """
        Génère un prompt optimisé pour la génération de voix.
        
        Args:
            voice_type (str): Type de voix (par exemple, "male", "female", "child").
            emotion (str): Émotion à exprimer (par exemple, "happy", "sad", "angry").
            language (str): Langue de la voix (par exemple, "en", "fr", "es").
            use_few_shot (bool): Si True, utilise des techniques de few-shot learning.
        
        Returns:
            str: Prompt optimisé pour la génération de voix.
        """
        # Récupération du template de prompt
        prompt = self.prompt_templates.get(voice_type, {}).get(emotion, "")
        
        if not prompt:
            logger.warning(f"Aucun template de prompt trouvé pour voice_type={voice_type} et emotion={emotion}")
            prompt = f"{voice_type} voice, {emotion} emotion, neutral pitch, normal speed. Language: {language}"
        else:
            prompt = prompt.format(language=language)
            
        # Ajout de techniques de few-shot learning si demandé
        if use_few_shot:
            prompt = self._apply_few_shot_learning(prompt, voice_type, emotion, language)
            
        return prompt
        
    def _apply_few_shot_learning(self, prompt: str, voice_type: str, 
                                emotion: str, language: str) -> str:
        """
        Applique des techniques de few-shot learning au prompt.
        
        Args:
            prompt (str): Prompt de base.
            voice_type (str): Type de voix.
            emotion (str): Émotion à exprimer.
            language (str): Langue de la voix.
        
        Returns:
            str: Prompt amélioré avec des exemples de few-shot learning.
        """
        # Exemples de few-shot learning basés sur le type de voix et l'émotion
        few_shot_examples = {
            "male": {
                "happy": [
                    "Example 1: 'Hello, how are you today?' -> British accent, male voice, high pitch, fast speed, clear and cheerful.",
                    "Example 2: 'The weather is wonderful!' -> British accent, male voice, high pitch, fast speed, clear and cheerful."
                ],
                "sad": [
                    "Example 1: 'I lost my favorite book.' -> British accent, male voice, low pitch, slow speed, sad and melancholic.",
                    "Example 2: 'It's been a tough day.' -> British accent, male voice, low pitch, slow speed, sad and melancholic."
                ]
            },
            "female": {
                "happy": [
                    "Example 1: 'I'm so excited for the party!' -> British accent, female voice, high pitch, fast speed, clear and cheerful.",
                    "Example 2: 'This is amazing news!' -> British accent, female voice, high pitch, fast speed, clear and cheerful."
                ],
                "sad": [
                    "Example 1: 'I miss my family so much.' -> British accent, female voice, low pitch, slow speed, sad and melancholic.",
                    "Example 2: 'Why did this have to happen?' -> British accent, female voice, low pitch, slow speed, sad and melancholic."
                ]
            }
        }
        
        # Récupération des exemples de few-shot learning
        examples = few_shot_examples.get(voice_type, {}).get(emotion, [])
        
        if examples:
            # Ajout des exemples au prompt
            few_shot_prompt = "\n".join(examples) + f"\n\nNow generate: {prompt}"
            return few_shot_prompt
            
        return prompt
        
    def save_custom_prompt(self, prompt_name: str, prompt_text: str) -> bool:
        """
        Sauvegarde un prompt personnalisé.
        
        Args:
            prompt_name (str): Nom du prompt personnalisé.
            prompt_text (str): Texte du prompt personnalisé.
        
        Returns:
            bool: True si le prompt a été sauvegardé avec succès, False sinon.
        """
        try:
            self.custom_prompts[prompt_name] = prompt_text
            logger.info(f"Prompt personnalisé sauvegardé: {prompt_name}")
            return True
        except Exception as e:
            logger.error(f"Erreur lors de la sauvegarde du prompt personnalisé: {e}")
            return False
            
    def get_custom_prompt(self, prompt_name: str) -> Optional[str]:
        """
        Récupère un prompt personnalisé.
        
        Args:
            prompt_name (str): Nom du prompt personnalisé.
        
        Returns:
            Optional[str]: Texte du prompt personnalisé ou None si non trouvé.
        """
        return self.custom_prompts.get(prompt_name)
        
    def list_available_prompts(self) -> List[str]:
        """
        Liste tous les prompts disponibles.
        
        Returns:
            List[str]: Liste des noms de prompts disponibles.
        """
        prompts = []
        
        # Ajout des templates de prompts
        for voice_type in self.prompt_templates:
            for emotion in self.prompt_templates[voice_type]:
                prompts.append(f"{voice_type}_{emotion}")
                
        # Ajout des prompts personnalisés
        prompts.extend(self.custom_prompts.keys())
        
        return prompts


def main():
    """
    Fonction principale pour tester la stratégie de prompts.
    """
    # Initialisation de la stratégie de prompts
    prompt_strategy = Qwen3TTSPromptStrategy()
    
    # Exemple de génération de prompt
    voice_type = "female"
    emotion = "happy"
    language = "en"
    
    # Génération d'un prompt simple
    prompt = prompt_strategy.generate_prompt(voice_type, emotion, language)
    print(f"Prompt simple: {prompt}")
    
    # Génération d'un prompt avec few-shot learning
    few_shot_prompt = prompt_strategy.generate_prompt(voice_type, emotion, language, use_few_shot=True)
    print(f"Prompt avec few-shot learning:\n{few_shot_prompt}")
    
    # Liste des prompts disponibles
    available_prompts = prompt_strategy.list_available_prompts()
    print(f"\nPrompts disponibles: {available_prompts}")


if __name__ == "__main__":
    main()