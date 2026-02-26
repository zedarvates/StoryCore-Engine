"""
Service d'extraction des attributs visuels via LLM Vision.

Ce module utilise des modèles de vision (Qwen3-VL, LLaVA, etc.) pour extraire
les caractéristiques visuelles d'un personnage depuis une image.

StoryCore-Engine - Identity Extraction Service
"""

import base64
import json
import logging
import os
from dataclasses import dataclass
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
from datetime import datetime
from pathlib import Path

import httpx

from backend.config import settings as app_settings
from backend.identity_lock_service import VisualAttributes

logger = logging.getLogger(__name__)


# Répertoires de base autorisés pour l'accès aux images
ALLOWED_IMAGE_BASE_DIRS = [
    Path("./data/images"),
    Path("./data/identities"),
    Path("./projects"),
    Path("./uploads"),
    Path("./output"),
]


def validate_image_path(image_path: str) -> str:
    """
    Valide que le chemin d'image est dans un répertoire autorisé.
    
    Args:
        image_path: Chemin vers l'image à valider
        
    Returns:
        Le chemin résolu et validé
        
    Raises:
        ValueError: Si le chemin est en dehors des répertoires autorisés
    """
    if not image_path:
        raise ValueError("Image path cannot be empty")
    
    # Résoudre le chemin demandé
    try:
        resolved_path = Path(image_path).resolve()
    except Exception as e:
        raise ValueError(f"Invalid path format: {e}")
    
    # Vérifier que le chemin est dans un des répertoires autorisés
    for allowed_dir in ALLOWED_IMAGE_BASE_DIRS:
        try:
            # Créer le répertoire autorisé s'il n'existe pas
            allowed_dir_resolved = allowed_dir.resolve()
            if str(resolved_path).startswith(str(allowed_dir_resolved)):
                # Vérifier que le fichier a une extension d'image valide
                valid_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'}
                if resolved_path.suffix.lower() not in valid_extensions:
                    raise ValueError(f"Invalid image format: {resolved_path.suffix}")
                return str(resolved_path)
        except FileNotFoundError:
            # Le répertoire n'existe pas encore, on continue
            continue
    
    # Si aucun répertoire autorisé ne correspond
    raise ValueError(
        f"Access denied: path '{image_path}' is outside allowed directories. "
        f"Allowed directories: {[str(d) for d in ALLOWED_IMAGE_BASE_DIRS]}"
    )


class VisionProvider(str, Enum):
    """Fournisseurs de modèles Vision disponibles"""
    OLLAMA = "ollama"  # LLaVA, Qwen3-VL, Gemma3, etc.
    OPENAI = "openai"  # GPT-4 Vision
    LOCAL = "local"    # Modèle local via API personnalisée


class VisionModelProvider(Enum):
    """Modèles Vision spécifiques disponibles"""
    OPENAI_GPT4V = "openai_gpt4v"
    OLLAMA_LLAVA = "ollama_llava"
    OLLAMA_GEMMA3 = "ollama_gemma3"
    OLLAMA_QWEN3VL = "ollama_qwen3vl"
    AUTO = "auto"


# Configurations des modèles Vision
MODEL_CONFIGS = {
    VisionModelProvider.OLLAMA_LLAVA: {
        "model_names": ["llava:13b", "llava:7b", "llava"],
        "endpoint": "/api/generate",
        "supports_vision": True,
        "priority": 3,  # Fallback
        "description": "LLaVA - Modèle vision fiable mais moins détaillé",
        "strengths": ["general_description", "basic_attributes"]
    },
    VisionModelProvider.OLLAMA_GEMMA3: {
        "model_names": ["gemma3:27b", "gemma3:12b", "gemma3:4b", "gemma3"],
        "endpoint": "/api/generate",
        "supports_vision": True,
        "priority": 2,  # Bonne alternative
        "description": "Gemma 3 - Bonne description générale",
        "strengths": ["general_description", "clothing_analysis"]
    },
    VisionModelProvider.OLLAMA_QWEN3VL: {
        "model_names": ["qwen3-vl:32b", "qwen3-vl:16b", "qwen3-vl:7b", "qwen3-vl", "qwen2.5-vl:32b", "qwen2.5-vl:7b"],
        "endpoint": "/api/generate",
        "supports_vision": True,
        "priority": 1,  # Meilleur pour l'analyse détaillée
        "description": "Qwen 3VL - Excellent pour l'analyse d'images détaillée",
        "strengths": ["detailed_analysis", "attribute_extraction", "facial_features"]
    },
    VisionModelProvider.OPENAI_GPT4V: {
        "model_names": ["gpt-4o", "gpt-4-vision-preview", "gpt-4-turbo"],
        "endpoint": "https://api.openai.com/v1/chat/completions",
        "supports_vision": True,
        "priority": 0,  # Priorité spéciale (si clé API disponible)
        "description": "GPT-4 Vision - Modèle commercial haute qualité",
        "strengths": ["detailed_analysis", "context_understanding", "all_attributes"]
    },
}


@dataclass
class ExtractionResult:
    """Résultat de l'extraction des attributs visuels"""
    attributes: VisualAttributes
    confidence: float
    provider: str
    model: str
    raw_response: str
    extraction_time_ms: int
    success: bool
    error_message: Optional[str] = None


# Prompt système pour l'extraction des attributs visuels
VISION_EXTRACTION_PROMPT = """You are a visual analysis expert specializing in character identification for visual consistency.

Analyze the provided image and extract the following visual attributes of the main character visible in the image.

IMPORTANT: 
- Focus on the MAIN character only (the most prominent person)
- Be precise and descriptive
- If an attribute cannot be determined, respond with "unknown"
- Respond ONLY in valid JSON format

Extract these attributes:
1. face_shape: oval, round, square, heart, or oblong
2. skin_tone: descriptive skin tone (e.g., "fair", "medium brown", "dark")
3. eye_color: color of the eyes
4. hair_color: color of the hair
5. hair_style: style description (e.g., "straight", "curly", "wavy", "braided")
6. hair_length: length (e.g., "short", "medium", "long", "bald")
7. body_type: general body type (e.g., "slim", "athletic", "average", "heavy")
8. height: estimated relative height (e.g., "tall", "average", "short") - only if context allows
9. age_appearance: apparent age range (e.g., "young adult", "middle-aged", "elderly", "child")
10. clothing_style: description of visible clothing style
11. accessories: list of visible accessories (glasses, jewelry, hats, etc.)
12. distinctive_features: notable features (beard, mustache, tattoos, etc.)
13. scars_marks: any visible scars or marks

Respond in this exact JSON format:
{
  "face_shape": "...",
  "skin_tone": "...",
  "eye_color": "...",
  "hair_color": "...",
  "hair_style": "...",
  "hair_length": "...",
  "body_type": "...",
  "height": "...",
  "age_appearance": "...",
  "clothing_style": "...",
  "accessories": ["...", "..."],
  "distinctive_features": ["...", "..."],
  "scars_marks": ["...", "..."],
  "confidence_score": 0.0-1.0
}

Analyze the image now and provide the JSON response:"""


# Prompt optimisé pour Qwen 3VL (analyse détaillée)
QWEN3VL_EXTRACTION_PROMPT = """You are an advanced visual analysis AI specialized in detailed character attribute extraction for visual consistency in media production.

Carefully examine the image and extract comprehensive visual attributes of the PRIMARY character (the most prominent/central person).

INSTRUCTIONS:
1. Focus exclusively on the MAIN character - ignore background figures
2. Provide detailed, specific descriptions
3. If an attribute cannot be determined from the image, use "unknown"
4. Output MUST be valid JSON only - no additional text

DETAILED ATTRIBUTE EXTRACTION:

FACIAL FEATURES:
- face_shape: Analyze the face contour (oval, round, square, heart, oblong, diamond)
- skin_tone: Specific skin tone description (e.g., "pale fair", "light olive", "medium brown", "deep dark")
- eye_color: Precise eye color (brown, dark brown, hazel, green, blue, gray, amber)
- eye_shape: If visible (almond, round, hooded, upturned, downturned)

HAIR ANALYSIS:
- hair_color: Natural or dyed color with details (e.g., "dark brown with subtle highlights")
- hair_style: Style description (straight, wavy, curly, coily, braided, ponytail, bun, etc.)
- hair_length: Category (bald, very short, short, medium, long, very long)
- hair_texture: If visible (fine, medium, coarse)

BODY & PHYSIQUE:
- body_type: Build description (slim, lean, athletic, average, muscular, heavy, curvy)
- height: Relative height estimation if context allows (tall, average, short)
- age_appearance: Estimated age category (child, teenager, young adult, adult, middle-aged, elderly)

STYLE & APPEARANCE:
- clothing_style: Detailed clothing description (style, colors, notable items)
- accessories: Array of visible accessories (glasses, jewelry, watches, hats, scarves, etc.)
- distinctive_features: Array of notable features (beard, mustache, freckles, dimples, tattoos, piercings)
- scars_marks: Array of visible scars, birthmarks, or other identifying marks

CONFIDENCE SCORING:
- Provide a confidence_score between 0.0 and 1.0 based on image clarity and visibility

RESPONSE FORMAT (JSON ONLY):
{
  "face_shape": "...",
  "skin_tone": "...",
  "eye_color": "...",
  "eye_shape": "...",
  "hair_color": "...",
  "hair_style": "...",
  "hair_length": "...",
  "hair_texture": "...",
  "body_type": "...",
  "height": "...",
  "age_appearance": "...",
  "clothing_style": "...",
  "accessories": ["...", "..."],
  "distinctive_features": ["...", "..."],
  "scars_marks": ["...", "..."],
  "confidence_score": 0.0-1.0
}

Provide your JSON analysis now:"""


# Prompt optimisé pour Gemma 3 (description générale)
GEMMA3_EXTRACTION_PROMPT = """You are a visual character analysis assistant. Analyze the main person in this image and describe their physical attributes.

Focus on the most prominent person in the image. Provide clear, concise descriptions.

Extract these attributes:
- face_shape: Face contour shape
- skin_tone: Skin tone description
- eye_color: Eye color
- hair_color: Hair color
- hair_style: Hair style
- hair_length: Hair length
- body_type: Body build
- height: Estimated height if possible
- age_appearance: Apparent age range
- clothing_style: Clothing description
- accessories: List of accessories
- distinctive_features: Notable features
- scars_marks: Any visible marks

If you cannot determine an attribute, write "unknown".

Respond ONLY with this JSON format:
{
  "face_shape": "...",
  "skin_tone": "...",
  "eye_color": "...",
  "hair_color": "...",
  "hair_style": "...",
  "hair_length": "...",
  "body_type": "...",
  "height": "...",
  "age_appearance": "...",
  "clothing_style": "...",
  "accessories": ["..."],
  "distinctive_features": ["..."],
  "scars_marks": ["..."],
  "confidence_score": 0.0-1.0
}

Analyze and respond with JSON:"""


# Mapping des prompts par modèle
MODEL_PROMPTS = {
    VisionModelProvider.OLLAMA_QWEN3VL: QWEN3VL_EXTRACTION_PROMPT,
    VisionModelProvider.OLLAMA_GEMMA3: GEMMA3_EXTRACTION_PROMPT,
    VisionModelProvider.OLLAMA_LLAVA: VISION_EXTRACTION_PROMPT,
    VisionModelProvider.OPENAI_GPT4V: QWEN3VL_EXTRACTION_PROMPT,  # GPT-4V utilise le prompt détaillé
}


class IdentityExtractionService:
    """Service d'extraction des attributs visuels via LLM Vision"""
    
    def __init__(
        self,
        provider: Optional[VisionProvider] = None,
        model: Optional[str] = None,
        ollama_host: Optional[str] = None,
        model_provider: Optional[VisionModelProvider] = None
    ):
        self.ollama_host = ollama_host or app_settings.OLLAMA_BASE_URL
        self.timeout = 120.0  # Timeout pour les requêtes vision
        
        # Si un model_provider spécifique est demandé
        if model_provider and model_provider != VisionModelProvider.AUTO:
            self.model_provider = model_provider
            self.provider = self._get_provider_from_model(model_provider)
            self.model = model or self._get_model_from_provider(model_provider)
        else:
            # Détection automatique du meilleur modèle disponible
            self.model_provider = model_provider or VisionModelProvider.AUTO
            self.provider = provider or self._detect_provider()
            self.model = model or self._get_default_model()
    
    def _get_provider_from_model(self, model_provider: VisionModelProvider) -> VisionProvider:
        """Convertit un VisionModelProvider en VisionProvider"""
        if model_provider == VisionModelProvider.OPENAI_GPT4V:
            return VisionProvider.OPENAI
        return VisionProvider.OLLAMA
    
    def _get_model_from_provider(self, model_provider: VisionModelProvider) -> str:
        """Retourne le premier nom de modèle pour un VisionModelProvider"""
        config = MODEL_CONFIGS.get(model_provider, {})
        model_names = config.get("model_names", ["llava"])
        return model_names[0]
    
    def _detect_provider(self) -> VisionProvider:
        """Détecte le fournisseur Vision disponible"""
        # Vérifier OpenAI Vision
        if os.environ.get("OPENAI_API_KEY"):
            return VisionProvider.OPENAI
        
        # Vérifier Ollama (par défaut pour les modèles locaux)
        return VisionProvider.OLLAMA
    
    def _get_default_model(self) -> str:
        """Retourne le modèle par défaut selon le fournisseur"""
        if self.provider == VisionProvider.OPENAI:
            return "gpt-4o"  # GPT-4 Vision
        elif self.provider == VisionProvider.OLLAMA:
            # Essayer de trouver un modèle vision disponible
            return os.environ.get("OLLAMA_VISION_MODEL", "llava:13b")
        return "llava:13b"
    
    async def get_available_provider(self) -> Tuple[VisionModelProvider, str]:
        """
        Détecte et retourne le meilleur modèle Vision disponible.
        
        Priorité:
        1. Qwen 3VL (meilleur pour l'analyse d'images détaillée)
        2. Gemma 3 (bonne alternative)
        3. LLaVA (fallback)
        4. GPT-4 Vision (si clé API disponible)
        
        Returns:
            Tuple (VisionModelProvider, nom_du_modèle)
        """
        # Si OpenAI API key est disponible, on peut l'utiliser
        has_openai = bool(os.environ.get("OPENAI_API_KEY"))
        
        # Récupérer les modèles Ollama disponibles
        ollama_models = await self._get_ollama_models()
        
        # Ordre de priorité pour les modèles Ollama
        priority_order = [
            (VisionModelProvider.OLLAMA_QWEN3VL, ["qwen3-vl", "qwen2.5-vl", "qwen2-vl"]),
            (VisionModelProvider.OLLAMA_GEMMA3, ["gemma3", "gemma-3"]),
            (VisionModelProvider.OLLAMA_LLAVA, ["llava", "bakllava"]),
        ]
        
        # Chercher le meilleur modèle disponible
        for model_provider, keywords in priority_order:
            config = MODEL_CONFIGS.get(model_provider, {})
            model_names = config.get("model_names", [])
            
            # Vérifier si un des modèles est disponible
            for model_name in model_names:
                # Vérifier par nom exact ou par mot-clé
                for available_model in ollama_models:
                    available_lower = available_model.lower()
                    if model_name.lower() == available_lower:
                        logger.info(f"Found vision model: {available_model} (provider: {model_provider.value})")
                        return model_provider, available_model
                    # Vérifier par mot-clé
                    for keyword in keywords:
                        if keyword in available_lower:
                            logger.info(f"Found vision model by keyword: {available_model} (provider: {model_provider.value})")
                            return model_provider, available_model
        
        # Si aucun modèle Ollama trouvé, utiliser OpenAI si disponible
        if has_openai:
            logger.info("Using OpenAI GPT-4 Vision as fallback")
            return VisionModelProvider.OPENAI_GPT4V, "gpt-4o"
        
        # Dernier recours: LLaVA
        logger.warning("No vision model found, defaulting to llava:13b")
        return VisionModelProvider.OLLAMA_LLAVA, "llava:13b"
    
    async def _get_ollama_models(self) -> List[str]:
        """Récupère la liste des modèles Ollama disponibles"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.ollama_host}/api/tags")
                if response.status_code == 200:
                    models = response.json().get("models", [])
                    return [m.get("name", "") for m in models]
        except Exception as e:
            logger.warning(f"Could not fetch Ollama models: {e}")
        return []
    
    def _get_prompt_for_model(self, model_provider: VisionModelProvider) -> str:
        """Retourne le prompt optimisé pour un modèle donné"""
        return MODEL_PROMPTS.get(model_provider, VISION_EXTRACTION_PROMPT)
    
    async def extract_attributes(
        self,
        image_path: str,
        custom_prompt: Optional[str] = None,
        auto_detect_model: bool = False
    ) -> ExtractionResult:
        """
        Extrait les attributs visuels depuis une image.
        
        Args:
            image_path: Chemin vers l'image à analyser
            custom_prompt: Prompt personnalisé (optionnel)
            auto_detect_model: Si True, détecte automatiquement le meilleur modèle
            
        Returns:
            ExtractionResult avec les attributs extraits
        """
        start_time = datetime.now()
        
        try:
            # Valider le chemin d'image (protection contre path traversal)
            try:
                validated_path = validate_image_path(image_path)
            except ValueError as e:
                return ExtractionResult(
                    attributes=VisualAttributes(),
                    confidence=0.0,
                    provider=self.provider.value,
                    model=self.model,
                    raw_response="",
                    extraction_time_ms=0,
                    success=False,
                    error_message=str(e)
                )
            
            # Vérifier que l'image existe
            if not os.path.exists(validated_path):
                return ExtractionResult(
                    attributes=VisualAttributes(),
                    confidence=0.0,
                    provider=self.provider.value,
                    model=self.model,
                    raw_response="",
                    extraction_time_ms=0,
                    success=False,
                    error_message=f"Image not found: {validated_path}"
                )
            
            # Détection automatique du meilleur modèle si demandé
            if auto_detect_model or self.model_provider == VisionModelProvider.AUTO:
                detected_provider, detected_model = await self.get_available_provider()
                self.model_provider = detected_provider
                self.model = detected_model
                self.provider = self._get_provider_from_model(detected_provider)
                logger.info(f"Auto-detected model: {detected_model} (provider: {detected_provider.value})")
            
            # Lire et encoder l'image
            image_base64 = self._encode_image(validated_path)
            
            # Sélectionner le prompt approprié
            if custom_prompt:
                prompt = custom_prompt
            else:
                prompt = self._get_prompt_for_model(self.model_provider)
            
            # Appeler le modèle Vision
            if self.provider == VisionProvider.OPENAI:
                result = await self._call_openai_vision(image_base64, prompt)
            else:
                result = await self._call_ollama_vision(image_base64, prompt)
            
            # Parser la réponse
            attributes, confidence = self._parse_vision_response(result["response"])
            
            extraction_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            
            return ExtractionResult(
                attributes=attributes,
                confidence=confidence,
                provider=self.provider.value,
                model=self.model,
                raw_response=result["response"],
                extraction_time_ms=extraction_time_ms,
                success=True
            )
            
        except Exception as e:
            logger.error(f"Error extracting attributes from {image_path}: {e}")
            extraction_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            return ExtractionResult(
                attributes=VisualAttributes(),
                confidence=0.0,
                provider=self.provider.value,
                model=self.model,
                raw_response="",
                extraction_time_ms=extraction_time_ms,
                success=False,
                error_message=str(e)
            )
    
    def _encode_image(self, image_path: str) -> str:
        """Encode une image en base64"""
        with open(image_path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")
    
    async def _call_openai_vision(
        self,
        image_base64: str,
        prompt: str
    ) -> Dict[str, Any]:
        """Appelle l'API OpenAI Vision"""
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not configured")
        
        # Détecter le type MIME
        # Par défaut JPEG, mais pourrait être amélioré
        mime_type = "image/jpeg"
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{mime_type};base64,{image_base64}",
                                        "detail": "high"
                                    }
                                }
                            ]
                        }
                    ],
                    "max_tokens": 1000
                }
            )
            
            if response.status_code != 200:
                raise ValueError(f"OpenAI API error: {response.status_code} - {response.text}")
            
            data = response.json()
            return {
                "response": data["choices"][0]["message"]["content"],
                "usage": data.get("usage", {})
            }
    
    async def _call_ollama_vision(
        self,
        image_base64: str,
        prompt: str
    ) -> Dict[str, Any]:
        """Appelle l'API Ollama pour un modèle Vision"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.ollama_host}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "images": [image_base64],
                    "stream": False,
                    "options": {
                        "temperature": 0.1,  # Basse température pour plus de cohérence
                        "num_predict": 1000
                    }
                }
            )
            
            if response.status_code != 200:
                raise ValueError(f"Ollama API error: {response.status_code} - {response.text}")
            
            data = response.json()
            return {
                "response": data.get("response", ""),
                "usage": {
                    "prompt_tokens": data.get("prompt_eval_count", 0),
                    "completion_tokens": data.get("eval_count", 0)
                }
            }
    
    def _parse_vision_response(
        self,
        response: str
    ) -> Tuple[VisualAttributes, float]:
        """Parse la réponse du modèle Vision en attributs visuels"""
        attributes = VisualAttributes()
        confidence = 0.5  # Confiance par défaut
        
        try:
            # Extraire le JSON de la réponse
            json_str = self._extract_json(response)
            
            if json_str:
                data = json.loads(json_str)
                
                # Remplir les attributs
                attributes.face_shape = data.get("face_shape", "")
                attributes.skin_tone = data.get("skin_tone", "")
                attributes.eye_color = data.get("eye_color", "")
                attributes.hair_color = data.get("hair_color", "")
                attributes.hair_style = data.get("hair_style", "")
                attributes.hair_length = data.get("hair_length", "")
                attributes.body_type = data.get("body_type", "")
                attributes.height = data.get("height", "")
                attributes.age_appearance = data.get("age_appearance", "")
                attributes.clothing_style = data.get("clothing_style", "")
                attributes.accessories = data.get("accessories", [])
                attributes.distinctive_features = data.get("distinctive_features", [])
                attributes.scars_marks = data.get("scars_marks", [])
                
                # Confiance rapportée par le modèle
                if "confidence_score" in data:
                    confidence = float(data["confidence_score"])
                else:
                    # Calculer une confiance basée sur les champs remplis
                    filled_fields = sum(1 for v in [
                        attributes.face_shape,
                        attributes.skin_tone,
                        attributes.eye_color,
                        attributes.hair_color,
                        attributes.body_type
                    ] if v and v != "unknown")
                    confidence = min(1.0, filled_fields / 5.0 * 0.9)
                
                attributes.extraction_confidence = confidence
                
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse vision response as JSON: {e}")
            # Essayer d'extraire des informations de manière basique
            attributes = self._fallback_parse(response)
        except Exception as e:
            logger.error(f"Error parsing vision response: {e}")
        
        return attributes, confidence
    
    def _extract_json(self, text: str) -> Optional[str]:
        """Extrait le JSON d'une réponse textuelle"""
        import re
        
        # Chercher un bloc JSON
        json_match = re.search(r'\{[\s\S]*\}', text)
        if json_match:
            return json_match.group(0)
        
        # Chercher entre ```json et ```
        json_block = re.search(r'```json\s*([\s\S]*?)\s*```', text)
        if json_block:
            return json_block.group(1)
        
        # Chercher entre ``` et ```
        code_block = re.search(r'```\s*([\s\S]*?)\s*```', text)
        if code_block:
            return code_block.group(1)
        
        return None
    
    def _fallback_parse(self, text: str) -> VisualAttributes:
        """Parse basique en cas d'échec du parsing JSON"""
        attributes = VisualAttributes()
        text_lower = text.lower()
        
        # Extraction basique par mots-clés
        if "oval" in text_lower:
            attributes.face_shape = "oval"
        elif "round" in text_lower:
            attributes.face_shape = "round"
        elif "square" in text_lower:
            attributes.face_shape = "square"
        elif "heart" in text_lower:
            attributes.face_shape = "heart"
        
        # Couleurs des yeux
        eye_colors = ["brown", "blue", "green", "hazel", "gray", "black"]
        for color in eye_colors:
            if f"{color} eye" in text_lower or f"eye color: {color}" in text_lower:
                attributes.eye_color = color
                break
        
        # Couleurs des cheveux
        hair_colors = ["black", "brown", "blonde", "red", "gray", "white", "auburn"]
        for color in hair_colors:
            if f"{color} hair" in text_lower:
                attributes.hair_color = color
                break
        
        attributes.extraction_confidence = 0.3  # Faible confiance pour le parsing basique
        
        return attributes
    
    async def batch_extract(
        self,
        image_paths: List[str],
        merge_results: bool = True
    ) -> List[ExtractionResult]:
        """
        Extrait les attributs depuis plusieurs images.
        
        Args:
            image_paths: Liste des chemins d'images
            merge_results: Si True, fusionne les résultats pour une meilleure précision
            
        Returns:
            Liste des résultats d'extraction
        """
        results = []
        
        for path in image_paths:
            result = await self.extract_attributes(path)
            results.append(result)
        
        if merge_results and len(results) > 1:
            # Fusionner les résultats pour une meilleure précision
            merged = self._merge_extraction_results(results)
            return [merged]
        
        return results
    
    def _merge_extraction_results(
        self,
        results: List[ExtractionResult]
    ) -> ExtractionResult:
        """Fusionne plusieurs résultats d'extraction"""
        if not results:
            return ExtractionResult(
                attributes=VisualAttributes(),
                confidence=0.0,
                provider=self.provider.value,
                model=self.model,
                raw_response="",
                extraction_time_ms=0,
                success=False,
                error_message="No results to merge"
            )
        
        # Prendre les attributs les plus fréquents/confiants
        merged_attrs = VisualAttributes()
        total_confidence = 0.0
        successful_results = [r for r in results if r.success]
        
        if not successful_results:
            return results[0]  # Retourner le premier résultat
        
        # Compter les valeurs pour chaque attribut
        from collections import Counter
        
        def most_common_value(values: List[str]) -> str:
            """Retourne la valeur la plus commune non vide"""
            non_empty = [v for v in values if v and v != "unknown"]
            if not non_empty:
                return ""
            return Counter(non_empty).most_common(1)[0][0]
        
        def most_common_list(values: List[List[str]]) -> List[str]:
            """Retourne les éléments les plus communs d'une liste de listes"""
            all_items = [item for sublist in values for item in sublist]
            if not all_items:
                return []
            # Retourner les éléments qui apparaissent plus d'une fois
            counts = Counter(all_items)
            return [item for item, count in counts.most_common() if count >= 1]
        
        # Fusionner les attributs
        merged_attrs.face_shape = most_common_value([r.attributes.face_shape for r in successful_results])
        merged_attrs.skin_tone = most_common_value([r.attributes.skin_tone for r in successful_results])
        merged_attrs.eye_color = most_common_value([r.attributes.eye_color for r in successful_results])
        merged_attrs.hair_color = most_common_value([r.attributes.hair_color for r in successful_results])
        merged_attrs.hair_style = most_common_value([r.attributes.hair_style for r in successful_results])
        merged_attrs.hair_length = most_common_value([r.attributes.hair_length for r in successful_results])
        merged_attrs.body_type = most_common_value([r.attributes.body_type for r in successful_results])
        merged_attrs.height = most_common_value([r.attributes.height for r in successful_results])
        merged_attrs.age_appearance = most_common_value([r.attributes.age_appearance for r in successful_results])
        merged_attrs.clothing_style = most_common_value([r.attributes.clothing_style for r in successful_results])
        merged_attrs.accessories = most_common_list([r.attributes.accessories for r in successful_results])
        merged_attrs.distinctive_features = most_common_list([r.attributes.distinctive_features for r in successful_results])
        merged_attrs.scars_marks = most_common_list([r.attributes.scars_marks for r in successful_results])
        
        # Calculer la confiance moyenne pondérée
        total_confidence = sum(r.confidence for r in successful_results) / len(successful_results)
        merged_attrs.extraction_confidence = total_confidence
        
        # Utiliser le premier chemin source
        merged_attrs.source_image_path = successful_results[0].attributes.source_image_path
        
        return ExtractionResult(
            attributes=merged_attrs,
            confidence=total_confidence,
            provider=self.provider.value,
            model=self.model,
            raw_response="; ".join([r.raw_response[:200] for r in successful_results[:3]]),
            extraction_time_ms=sum(r.extraction_time_ms for r in successful_results),
            success=True
        )
    
    async def check_availability(self) -> Dict[str, Any]:
        """Vérifie la disponibilité du service Vision"""
        result = {
            "provider": self.provider.value,
            "model": self.model,
            "model_provider": self.model_provider.value if self.model_provider else None,
            "available": False,
            "message": "",
            "available_models": []
        }
        
        try:
            if self.provider == VisionProvider.OLLAMA:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(f"{self.ollama_host}/api/tags")
                    if response.status_code == 200:
                        models = response.json().get("models", [])
                        model_names = [m.get("name", "") for m in models]
                        result["available_models"] = model_names
                        
                        # Détecter les modèles vision disponibles avec leur type
                        detected_models = []
                        
                        # Qwen 3VL (priorité 1)
                        qwen_models = [m for m in model_names if any(kw in m.lower() for kw in ["qwen3-vl", "qwen2.5-vl", "qwen2-vl"])]
                        if qwen_models:
                            detected_models.append({
                                "provider": VisionModelProvider.OLLAMA_QWEN3VL.value,
                                "models": qwen_models,
                                "priority": 1,
                                "description": "Qwen 3VL - Excellent pour l'analyse détaillée"
                            })
                        
                        # Gemma 3 (priorité 2)
                        gemma_models = [m for m in model_names if "gemma3" in m.lower() or "gemma-3" in m.lower()]
                        if gemma_models:
                            detected_models.append({
                                "provider": VisionModelProvider.OLLAMA_GEMMA3.value,
                                "models": gemma_models,
                                "priority": 2,
                                "description": "Gemma 3 - Bonne description générale"
                            })
                        
                        # LLaVA (priorité 3 - fallback)
                        llava_models = [m for m in model_names if any(kw in m.lower() for kw in ["llava", "bakllava"])]
                        if llava_models:
                            detected_models.append({
                                "provider": VisionModelProvider.OLLAMA_LLAVA.value,
                                "models": llava_models,
                                "priority": 3,
                                "description": "LLaVA - Modèle vision fiable"
                            })
                        
                        # Autres modèles vision
                        other_vision = ["moondream", "cogvlm", "minicpm-v"]
                        other_models = [m for m in model_names if any(kw in m.lower() for kw in other_vision)]
                        if other_models:
                            detected_models.append({
                                "provider": "other_vision",
                                "models": other_models,
                                "priority": 4,
                                "description": "Autre modèle vision détecté"
                            })
                        
                        result["detected_vision_models"] = detected_models
                        
                        if detected_models:
                            result["available"] = True
                            best = detected_models[0]
                            result["message"] = f"Vision models available. Best: {best['models'][0]} ({best['description']})"
                        else:
                            result["message"] = f"No vision model found. Available: {model_names}. Install with: ollama pull qwen3-vl or ollama pull gemma3 or ollama pull llava"
            
            elif self.provider == VisionProvider.OPENAI:
                if os.environ.get("OPENAI_API_KEY"):
                    result["available"] = True
                    result["detected_vision_models"] = [{
                        "provider": VisionModelProvider.OPENAI_GPT4V.value,
                        "models": ["gpt-4o", "gpt-4-turbo"],
                        "priority": 0,
                        "description": "GPT-4 Vision - Modèle commercial haute qualité"
                    }]
                    result["message"] = "OpenAI Vision API key configured"
                else:
                    result["message"] = "OPENAI_API_KEY not set"
                    
        except Exception as e:
            result["message"] = f"Error checking availability: {str(e)}"
        
        return result


# Instance globale du service
_extraction_service: Optional[IdentityExtractionService] = None


def get_extraction_service() -> IdentityExtractionService:
    """Retourne l'instance globale du service d'extraction"""
    global _extraction_service
    if _extraction_service is None:
        _extraction_service = IdentityExtractionService()
    return _extraction_service
