import json
import logging
import aiohttp
import asyncio
import numpy as np
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class TranslatorEngine:
    """
    Moteur de traduction utilisant Ollama pour la génération
    et Jina Embeddings pour la cohérence sémantique.
    """
    
    def __init__(self, ollama_url: str = "http://localhost:11434"):
        self.ollama_url = ollama_url
        self.translation_model = "llama3" # Default
        self.embedding_model = "hf.co/jinaai/jina-embeddings-v5-text-small-retrieval-GGUF"
        
        # Mémoire de traduction (Translation Memory)
        # { source_hash: translation }
        self.translation_memory: Dict[str, str] = {}
        # { source_hash: embedding_vector }
        self.embedding_memory: Dict[str, List[float]] = {}
        
    async def get_embedding(self, text: str) -> Optional[List[float]]:
        """Récupère l'embedding d'un texte via Ollama."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.ollama_url}/api/embeddings",
                    json={"model": self.embedding_model, "prompt": text}
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return data.get("embedding")
                    else:
                        logger.error(f"Ollama Embeddings Error {resp.status}")
                        return None
        except Exception as e:
            logger.error(f"Error calling Ollama Embeddings: {e}")
            return None

    def cosine_similarity(self, v1: List[float], v2: List[float]) -> float:
        """Calcule la similarité cosinus entre deux vecteurs."""
        a = np.array(v1)
        b = np.array(v2)
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

    async def find_similar_translation(self, text: str, threshold: float = 0.95) -> Optional[str]:
        """Cherche une traduction cohérente dans la mémoire."""
        if not self.embedding_memory:
            return None
            
        emb = await self.get_embedding(text)
        if not emb:
            return None
            
        best_score = 0
        best_translation = None
        
        for source_hash, stored_emb in self.embedding_memory.items():
            score = self.cosine_similarity(emb, stored_emb)
            if score > best_score:
                best_score = score
                best_translation = self.translation_memory.get(source_hash)
                
        if best_score >= threshold:
            return best_translation
        return None

    async def translate_text(self, text: str, src_lang: str, tgt_lang: str, context: str = "") -> str:
        """Traduit un texte court en utilisant Ollama."""
        if not text or len(text.strip()) == 0:
            return text
            
        # 1. Vérifier la mémoire pour la cohérence
        # similar = await self.find_similar_translation(text)
        # if similar:
        #    return similar
            
        # 2. Appel Ollama
        prompt = f"Translate the following text from {src_lang} to {tgt_lang}.\n"
        if context:
            prompt += f"Context: {context}\n"
        prompt += f"Text: {text}\n"
        prompt += "Translated text:"
        
        system_prompt = (
            "You are a professional creative translator. "
            "Translate accurately while preserving emotion and character voice. "
            "Return ONLY the translated text without any explanation."
        )
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.ollama_url}/api/generate",
                    json={
                        "model": self.translation_model,
                        "prompt": prompt,
                        "system": system_prompt,
                        "stream": False,
                        "options": {
                            "temperature": 0.3
                        }
                    }
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        translation = data.get("response", "").strip()
                        
                        # Stocker dans la mémoire (optionnel pour l'instant)
                        # self.translation_memory[hash(text)] = translation
                        # self.embedding_memory[hash(text)] = await self.get_embedding(text)
                        
                        return translation
                    else:
                        logger.error(f"Ollama Translation Error {resp.status}")
                        return text # Fallback to original
        except Exception as e:
            logger.error(f"Error calling Ollama Translate: {e}")
            return text

    async def translate_project(self, project_data: Dict[str, Any], tgt_lang: str) -> Dict[str, Any]:
        """Traduit récursivement un objet JSON de projet."""
        src_lang = project_data.get("metadata", {}).get("language", "auto")
        
        # Deep copy
        new_data = json.loads(json.dumps(project_data))
        
        # Champs à traduire (heuristique)
        fields_to_translate = ["name", "description", "title", "content", "story", "backstory", "text", "personality"]
        
        async def process_item(item, context_name=""):
            if isinstance(item, dict):
                # Traduire les champs spécifiques
                for key in fields_to_translate:
                    if key in item and isinstance(item[key], str) and len(item[key]) > 0:
                        # Skip special internal keys
                        if key == "id" or key.endswith("_id"):
                            continue
                        
                        item[key] = await self.translate_text(item[key], src_lang, tgt_lang, context=context_name)
                
                # Récursion
                for k, v in item.items():
                    if k not in fields_to_translate:
                        await process_item(v, context_name=f"{context_name} > {k}")
                        
            elif isinstance(item, list):
                for i in item:
                    await process_item(i, context_name=context_name)

        await process_item(new_data)
        
        # Update metadata
        if "metadata" not in new_data:
            new_data["metadata"] = {}
        new_data["metadata"]["language"] = tgt_lang
        new_data["metadata"]["translated_from"] = src_lang
        
        return new_data
