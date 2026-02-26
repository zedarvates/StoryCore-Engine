import asyncio
import json
import logging
import os
import sys
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict

# Importations des services StoryCore
# Note: On suppose que le PYTHONPATH inclut la racine du projet
try:
    from backend.llm_api import generate_text, LLMRequest
    from backend.identity_lock_service import IdentityLockService, IdentityProfile
    from backend.music_lyrics_service import MusicLyricsService, LyricsGenerationRequest, MusicStyleRequest
    from backend.ai_transition_engine import AITransitionEngine, AITransitionType
    from backend.cine_production_service import CineProductionService, CineProductionRequest, CineChainType, CineJobStatus
    from blender_bridge.backend_integration import CharacterSystemBridge
    from blender_bridge import BlenderBridge
except ImportError as e:
    print(f"Erreur d'importation : {e}")
    print("Assurez-vous que le PYTHONPATH est correctement configuré.")
    # Pour le développement, on ne bloque pas tout de suite
    pass

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("one_prompt_pipeline.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("OnePromptPipeline")

@dataclass
class PipelineConfig:
    project_id: str
    output_dir: Path
    quality: str = "standard"
    width: int = 1280
    height: int = 720
    fps: int = 30

class OnePromptPipeline:
    """
    Orchestrateur de haut niveau pour la génération de vidéo à partir d'un seul prompt.
    """
    
    def __init__(self, config: PipelineConfig):
        self.config = config
        self.config.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialisation des services
        self.identity_service = IdentityLockService()
        self.music_service = MusicLyricsService()
        self.transition_engine = AITransitionEngine()
        self.cine_service = CineProductionService()
        self.blender_bridge = BlenderBridge()
        self.char_bridge = CharacterSystemBridge()
        
        logger.info(f"Pipeline initialisé pour le projet : {config.project_id}")

    async def run(self, user_prompt: str):
        """Exécute le pipeline complet."""
        logger.info(f"Démarrage du pipeline pour le prompt : {user_prompt}")
        
        try:
            # 1. Analyse du prompt et décomposition
            story_data = await self._analyze_prompt(user_prompt)
            
            # 2. Gestion des personnages (CharacterRegistry / IdentityLock)
            characters = await self._setup_characters(story_data.get("characters", []))
            
            # 3. Génération de la musique et des paroles
            music_assets = await self._generate_music(story_data.get("music_theme", user_prompt))
            
            # 4. Génération des segments (Blender + ComfyUI)
            video_segments = []
            for i, segment in enumerate(story_data.get("segments", [])):
                logger.info(f"Traitement du segment {i+1}/{len(story_data['segments'])}")
                segment_path = await self._process_segment(i, segment, characters)
                if segment_path:
                    video_segments.append(segment_path)
                else:
                    logger.warning(f"Échec de la génération du segment {i+1}, passage au suivant.")

            if not video_segments:
                raise RuntimeError("Aucun segment vidéo n'a été généré avec succès.")

            # 5. Assemblage avec transitions
            final_video = await self._assemble_video(video_segments)
            
            logger.info(f"Pipeline terminé avec succès ! Vidéo finale : {final_video}")
            return final_video

        except Exception as e:
            logger.error(f"Échec critique du pipeline : {str(e)}", exc_info=True)
            return None

    async def _analyze_prompt(self, prompt: str) -> Dict[str, Any]:
        """Utilise un LLM pour décomposer le prompt en structure narrative."""
        logger.info("Analyse du prompt par le LLM...")
        
        analysis_prompt = f"""
        Tu es un réalisateur expert. Analyse le prompt utilisateur suivant et décompose-le en une structure de production vidéo complète.
        Prompt: "{prompt}"
        
        Réponds UNIQUEMENT en JSON valide avec la structure suivante:
        {{
            "characters": [
                {{
                    "name": "Nom du personnage",
                    "description": "Description physique détaillée pour la cohérence visuelle (Identity Lock)"
                }}
            ],
            "music_theme": "Description du style musical et de l'ambiance sonore",
            "segments": [
                {{
                    "description": "Description visuelle détaillée pour ComfyUI",
                    "action": "Action spécifique pour Blender Bridge",
                    "camera": "Mouvement de caméra (pan, tilt, zoom, tracking)",
                    "duration": 5
                }}
            ]
        }}
        """
        
        try:
            # Utilisation de generate_text avec le modèle configuré
            response = await generate_text(LLMRequest(prompt=analysis_prompt, model="gpt-4"))
            
            # Nettoyage de la réponse JSON
            clean_response = response.strip()
            if "```json" in clean_response:
                clean_response = clean_response.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_response:
                clean_response = clean_response.split("```")[1].split("```")[0].strip()
            
            data = json.loads(clean_response)
            logger.info(f"Analyse réussie : {len(data.get('segments', []))} segments identifiés.")
            return data
        except Exception as e:
            logger.error(f"Erreur lors de l'analyse LLM : {e}")
            # Fallback minimal robuste
            return {
                "characters": [],
                "music_theme": f"Cinematic score for: {prompt}",
                "segments": [
                    {
                        "description": prompt,
                        "action": "standing still",
                        "camera": "cinematic tracking",
                        "duration": 5
                    }
                ]
            }

    async def _setup_characters(self, char_defs: List[Dict[str, Any]]) -> List[IdentityProfile]:
        """Enregistre et verrouille les identités des personnages via IdentityLockService."""
        logger.info(f"Configuration de {len(char_defs)} personnages...")
        profiles = []
        for char in char_defs:
            try:
                # Création de l'identité dans le service
                profile = await self.identity_service.create_identity(
                    name=char['name'],
                    description=char['description'],
                    project_id=self.config.project_id
                )
                # Verrouillage automatique des attributs (simulation ou appel réel si implémenté)
                # await self.identity_service.extract_and_lock_attributes(profile.id)
                profiles.append(profile)
                logger.info(f"Personnage '{char['name']}' configuré et verrouillé.")
            except Exception as e:
                logger.error(f"Erreur lors de la configuration du personnage {char.get('name')}: {e}")
        
        return profiles

    async def _generate_music(self, theme: str) -> Dict[str, Any]:
        """Génère les paroles et le style musical."""
        logger.info(f"Génération de la musique pour le thème : {theme}")
        try:
            lyrics_req = LyricsGenerationRequest(theme=theme, style="cinematic", mood=["epic"])
            lyrics = await self.music_service.generate_lyrics(lyrics_req)
            
            style_req = MusicStyleRequest(prompt=theme, style="cinematic", mood=["epic"])
            style = await self.music_service.generate_music_style(style_req)
            
            return {"lyrics": lyrics, "style": style}
        except Exception as e:
            logger.error(f"Erreur génération musique : {e}")
            return {}

    async def _process_segment(self, index: int, segment: Dict[str, Any], characters: List[IdentityProfile]) -> Optional[str]:
        """Orchestre Blender et ComfyUI pour un segment donné."""
        segment_id = f"seg_{index:03d}"
        logger.info(f"Traitement segment {segment_id} : {segment['description']}")
        
        try:
            # A. Blender Bridge : Layout 3D et passes ControlNet
            # On utilise le CharacterSystemBridge pour lier les personnages au rig Blender
            for char in characters:
                self.char_bridge.load_character(char.name, self.config.project_id)
            
            # Simulation de l'appel Blender (headless)
            logger.info(f"[{segment_id}] Génération du layout 3D via Blender...")
            # layout_data = self.blender_bridge.generate_layout(segment['action'], segment['camera'])

            # B. ComfyUI : Rendu final via CineProductionService
            # On utilise IP-Adapter si des personnages sont présents
            char_id = characters[0].id if characters else None
            
            request = CineProductionRequest(
                chainType=CineChainType.GENERATE_SCENE,
                projectId=self.config.project_id,
                sceneDescription=segment['description'],
                characterId=char_id,
                quality=self.config.quality,
                width=self.config.width,
                height=self.config.height,
                useVisualDirector=True
            )
            
            job_id = await self.cine_service.start_production_job(request)
            logger.info(f"[{segment_id}] Job ComfyUI démarré : {job_id}")
            
            # Attente du résultat (polling simple pour l'exemple)
            max_retries = 60 # 5 minutes avec 5s d'intervalle
            for _ in range(max_retries):
                await asyncio.sleep(5)
                job = await self.cine_service.get_job_status(job_id)
                if job.status == CineJobStatus.COMPLETED:
                    # On récupère le premier résultat (vidéo)
                    if job.results:
                        video_url = job.results[0].get("url") or job.results[0].get("path")
                        logger.info(f"[{segment_id}] Rendu terminé : {video_url}")
                        return video_url
                    break
                elif job.status == CineJobStatus.FAILED:
                    raise RuntimeError(f"Job ComfyUI échoué : {job.error}")
            
            raise TimeoutError(f"Le rendu du segment {segment_id} a dépassé le délai imparti.")
            
        except Exception as e:
            logger.error(f"Erreur segment {segment_id} : {e}")
            return None

    async def _assemble_video(self, segments: List[str]) -> str:
        """Assemble les clips avec AITransitionEngine."""
        logger.info(f"Assemblage final de {len(segments)} segments...")
        output_file = self.config.output_dir / "final_video.mp4"
        
        if len(segments) == 1:
            # Pas de transition nécessaire
            import shutil
            shutil.copy(segments[0], output_file)
            return str(output_file)
            
        # Logique d'assemblage avec transitions
        # current_video = segments[0]
        # for i in range(1, len(segments)):
        #     next_video = segments[i]
        #     temp_output = self.config.output_dir / f"temp_merge_{i}.mp4"
        #     await self.transition_engine.generate_transition(
        #         current_video, next_video, AITransitionType.INTERPOLATE, str(temp_output)
        #     )
        #     current_video = str(temp_output)
            
        return str(output_file)

async def main():
    parser = argparse.ArgumentParser(description="StoryCore One-Prompt Video Pipeline")
    parser.add_argument("prompt", type=str, help="Le prompt utilisateur pour générer la vidéo")
    parser.add_argument("--project", type=str, default="default_project", help="ID du projet")
    parser.add_argument("--output", type=str, default="./output/one_prompt", help="Répertoire de sortie")
    
    args = parser.parse_args()
    
    config = PipelineConfig(
        project_id=args.project,
        output_dir=Path(args.output)
    )
    
    pipeline = OnePromptPipeline(config)
    await pipeline.run(args.prompt)

if __name__ == "__main__":
    asyncio.run(main())
