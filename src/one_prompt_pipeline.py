import asyncio
import json
import logging
import os
import sys
import argparse
import uuid
import shutil
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict

# Importations des services StoryCore
try:
    # LLM & Core Services
    from backend.llm_api import call_llm_real, call_llm_mock, should_use_mock_llm, LLMRequest
    from backend.music_lyrics_service import MusicLyricsService, LyricsGenerationRequest, MusicStyleRequest
    from backend.cine_production_service import (
        CineProductionService, CineProductionRequest, CineChainType, CineJobStatus, ProductionQuality
    )
    from backend.transitions_service import TransitionsService, TransitionType, TransitionConfig
    
    # Character System
    from src.character_registry import CharacterRegistry, CharacterIdentity, VoiceProfile
    
    # Blender Bridge
    from blender_bridge.scene_types import (
        SceneJSON, SceneType, CameraConfig, ShotType, 
        AtmosphereConfig, AtmosphereType, CharacterRig, RenderSettings
    )
    from blender_bridge.script_generator import BlenderScriptGenerator
    from blender_bridge.headless_runner import BlenderHeadlessRunner
    
except ImportError as e:
    print(f"Erreur d'importation : {e}")
    print("Assurez-vous que le PYTHONPATH inclut la racine du projet et que toutes les dépendances sont installées.")
    # On ne bloque pas ici pour permettre l'analyse statique, mais le run échouera
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
    use_blender: bool = True
    export_controlnet: bool = True

class OnePromptPipeline:
    """
    Orchestrateur de haut niveau StoryCore.
    Génère une vidéo complète à partir d'un seul prompt utilisateur en coordonnant
    LLM, CharacterRegistry, MusicService, BlenderBridge, ComfyUI et Transitions.
    """
    
    def __init__(self, config: PipelineConfig):
        self.config = config
        self.config.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialisation des services
        self.char_registry = CharacterRegistry(storage_path=str(self.config.output_dir / "characters"))
        self.music_service = MusicLyricsService()
        self.cine_service = CineProductionService()
        self.transitions_service = TransitionsService()
        
        # Blender Bridge components
        self.blender_gen = BlenderScriptGenerator(scripts_dir=str(self.config.output_dir / "blender_scripts"))
        self.blender_runner = BlenderHeadlessRunner(output_dir=str(self.config.output_dir / "blender_renders"))
        
        logger.info(f"🚀 Pipeline StoryCore initialisé | Projet: {config.project_id}")

    async def run(self, user_prompt: str) -> Optional[str]:
        """Exécute le flux de production complet."""
        logger.info(f"🎬 Démarrage de la production pour : \"{user_prompt}\"")
        
        try:
            # 1. Analyse et Décomposition (LLM)
            story_data = await self._analyze_prompt(user_prompt)
            if not story_data:
                raise ValueError("L'analyse du prompt a échoué.")

            # 2. Enregistrement des Personnages (CharacterRegistry)
            characters = await self._setup_characters(story_data.get("characters", []))
            
            # 3. Génération Musique & Paroles
            music_assets = await self._generate_music(story_data.get("music_theme", user_prompt))
            
            # 4. Traitement des Segments (Blender + ComfyUI)
            video_segments = []
            segments = story_data.get("segments", [])
            
            for i, seg_def in enumerate(segments):
                logger.info(f"🎞️ Segment {i+1}/{len(segments)} : {seg_def.get('description')}")
                
                # 4a. Blender Bridge (Layout & ControlNet)
                controlnet_passes = {}
                if self.config.use_blender:
                    controlnet_passes = await self._run_blender_stage(i, seg_def, characters)
                
                # 4b. ComfyUI (Rendu Final via CineProductionService)
                segment_video = await self._run_comfyui_stage(i, seg_def, characters, controlnet_passes)
                
                if segment_video:
                    video_segments.append(segment_video)
                else:
                    logger.error(f"❌ Échec du segment {i+1}. Tentative de continuation...")

            if not video_segments:
                raise RuntimeError("Aucun segment vidéo n'a été produit.")

            # 5. Assemblage Final (Transitions)
            final_video = await self._assemble_video(video_segments)
            
            logger.info(f"✅ Production terminée ! Fichier final : {final_video}")
            return final_video

        except Exception as e:
            logger.critical(f"💥 Échec critique du pipeline : {str(e)}", exc_info=True)
            return None

    async def _analyze_prompt(self, prompt: str) -> Dict[str, Any]:
        """Utilise le LLM pour transformer un prompt brut en plan de production JSON."""
        logger.info("🧠 Analyse du prompt par le LLM...")
        
        system_prompt = """Tu es un réalisateur et superviseur VFX expert. 
Décompose le prompt utilisateur en une structure de production technique.
Sois précis sur les descriptions physiques pour l'Identity Lock et les mouvements de caméra pour Blender."""

        analysis_prompt = f"""Analyse ce prompt : "{prompt}"

Réponds UNIQUEMENT en JSON avec cette structure :
{{
    "characters": [
        {{
            "name": "Nom",
            "description": "Description physique ultra-détaillée (visage, vêtements, style)",
            "voice_hint": "Description de la voix"
        }}
    ],
    "music_theme": "Style musical, tempo, instruments",
    "segments": [
        {{
            "description": "Description visuelle pour le rendu IA",
            "blender_scene": {{
                "type": "exterior|interior",
                "camera_shot": "wide|medium|close_up|low_angle",
                "atmosphere": "none|fog|volumetric_fog|rain",
                "action": "Description de la pose/action du personnage"
            }},
            "duration": 5
        }}
    ]
}}"""

        try:
            request = LLMRequest(prompt=f"{system_prompt}\n\n{analysis_prompt}", model="gpt-4")
            if should_use_mock_llm():
                response = await call_llm_mock(request, user_id="cli_system")
            else:
                response = await call_llm_real(request, user_id="cli_system")
            
            # Extraction du JSON
            content = response.text.strip()
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            data = json.loads(content)
            logger.info(f"📊 Plan de production généré : {len(data.get('segments', []))} segments.")
            return data
        except Exception as e:
            logger.error(f"⚠️ Erreur analyse LLM : {e}. Utilisation du fallback.")
            return self._get_fallback_story_data(prompt)

    async def _setup_characters(self, char_defs: List[Dict[str, Any]]) -> List[CharacterIdentity]:
        """Initialise les identités dans le CharacterRegistry."""
        identities = []
        for char in char_defs:
            char_id = f"char_{uuid.uuid4().hex[:4]}"
            identity = CharacterIdentity(
                character_id=char_id,
                name=char['name'],
                physical_description=char['description'],
                voice_profile=VoiceProfile(voice_id=char.get('voice_hint', 'default'))
            )
            self.char_registry.register(identity)
            identities.append(identity)
            logger.info(f"👤 Personnage enregistré : {char['name']} ({char_id})")
        return identities

    async def _generate_music(self, theme: str) -> Dict[str, Any]:
        """Génère les assets musicaux via MusicLyricsService."""
        logger.info("🎵 Génération de la bande son...")
        try:
            lyrics = await self.music_service.generate_lyrics(LyricsGenerationRequest(theme=theme))
            style = await self.music_service.generate_music_style(MusicStyleRequest(prompt=theme))
            return {"lyrics": lyrics, "style": style}
        except Exception as e:
            logger.warning(f"⚠️ Échec musique : {e}")
            return {}

    async def _run_blender_stage(self, index: int, seg_def: Dict[str, Any], characters: List[CharacterIdentity]) -> Dict[str, str]:
        """Génère le layout 3D et les passes ControlNet via Blender."""
        logger.info(f"🧊 [Blender] Génération du layout pour le segment {index+1}...")
        
        try:
            b_cfg = seg_def.get("blender_scene", {})
            
            # Construction de la scène 3D
            scene = SceneJSON(
                scene_id=f"seg_{index:03d}",
                scene_type=SceneType(b_cfg.get("type", "exterior")),
                description=seg_def.get("description", ""),
                camera=CameraConfig(shot_type=ShotType(b_cfg.get("camera_shot", "medium"))),
                atmosphere=AtmosphereConfig(type=AtmosphereType(b_cfg.get("atmosphere", "none"))),
                render=RenderSettings(
                    resolution_x=self.config.width,
                    resolution_y=self.config.height,
                    export_controlnet=self.config.export_controlnet,
                    output_path=str(self.blender_runner.output_dir / f"layout_{index:03d}.png")
                )
            )
            
            # Ajout des personnages en tant que rigs placeholder
            for i, char in enumerate(characters):
                scene.characters.append(CharacterRig(
                    name=char.name,
                    position=(i * 2.0, 0, 0), # Placement simple
                    facing_camera=True
                ))

            # Génération et exécution du script Blender
            script_path = self.blender_gen.generate(scene)
            result = self.blender_runner.execute(script_path, scene)
            
            if result["success"]:
                passes = {"layout": result["render_path"]}
                # Si ControlNet est activé, Blender produit des fichiers depth_ et canny_
                if self.config.export_controlnet:
                    base = Path(result["render_path"]).parent
                    # Blender OutputFile node ajoute des suffixes
                    passes["depth"] = str(base / f"depth_0001.png")
                    passes["canny"] = str(base / f"canny_0001.png")
                
                logger.info(f"✅ [Blender] Layout terminé : {result['render_path']}")
                return passes
            else:
                logger.error(f"❌ [Blender] Erreur : {result['error']}")
                return {}
                
        except Exception as e:
            logger.error(f"⚠️ [Blender] Exception : {e}")
            return {}

    async def _run_comfyui_stage(self, index: int, seg_def: Dict[str, Any], 
                                characters: List[CharacterIdentity], 
                                controlnet_passes: Dict[str, str]) -> Optional[str]:
        """Rendu final via ComfyUI en utilisant les passes Blender et IP-Adapter."""
        logger.info(f"🎨 [ComfyUI] Rendu final du segment {index+1}...")
        
        try:
            # Préparation de la requête CineProduction
            # On utilise le premier personnage pour l'IP-Adapter (simplification)
            char_id = characters[0].character_id if characters else None
            
            # Injection des passes ControlNet dans les overrides si disponibles
            overrides = {}
            if controlnet_passes.get("depth"):
                overrides["controlnet_depth_image"] = controlnet_passes["depth"]
            if controlnet_passes.get("canny"):
                overrides["controlnet_canny_image"] = controlnet_passes["canny"]

            request = CineProductionRequest(
                chainType=CineChainType.GENERATE_SCENE,
                projectId=self.config.project_id,
                sceneDescription=seg_def.get("description"),
                characterId=char_id,
                quality=ProductionQuality(self.config.quality),
                width=self.config.width,
                height=self.config.height,
                useVisualDirector=True,
                overrides=overrides
            )
            
            job_id = await self.cine_service.start_production_job(request)
            
            # Polling du statut
            while True:
                await asyncio.sleep(5)
                job = await self.cine_service.get_job_status(job_id)
                if not job: break
                
                if job.status == CineJobStatus.COMPLETED:
                    # Récupération du chemin local de la vidéo
                    if job.results:
                        # On cherche le résultat de type vidéo
                        video_res = next((r for r in job.results if r.get("step") in ["video", "muxed_video"]), job.results[-1])
                        video_path = video_res.get("output", {}).get("filename")
                        
                        # CineProductionService stocke dans ./output
                        full_path = Path("output") / video_path
                        logger.info(f"✅ [ComfyUI] Segment terminé : {full_path}")
                        return str(full_path)
                    break
                elif job.status == CineJobStatus.FAILED:
                    logger.error(f"❌ [ComfyUI] Job échoué : {job.error}")
                    break
            
            return None
        except Exception as e:
            logger.error(f"⚠️ [ComfyUI] Exception : {e}")
            return None

    async def _assemble_video(self, segments: List[str]) -> str:
        """Assemble les segments avec des transitions fluides."""
        logger.info(f"🎬 Assemblage final de {len(segments)} segments...")
        
        final_output = self.config.output_dir / "final_production.mp4"
        
        if len(segments) == 1:
            shutil.copy(segments[0], final_output)
            return str(final_output)
            
        # Assemblage séquentiel avec transitions Dissolve par défaut
        current_clip = segments[0]
        for i in range(1, len(segments)):
            next_clip = segments[i]
            temp_output = self.config.output_dir / f"temp_merge_{i}.mp4"
            
            success = self.transitions_service.execute_transition(
                current_clip, 
                next_clip, 
                TransitionType.DISSOLVE, 
                str(temp_output),
                TransitionConfig(duration=1.0)
            )
            
            if success:
                current_clip = str(temp_output)
            else:
                logger.warning(f"⚠️ Échec transition {i}, simple concaténation.")
                # Fallback concat (simplifié ici)
                current_clip = next_clip 

        shutil.move(current_clip, final_output)
        return str(final_output)

    def _get_fallback_story_data(self, prompt: str) -> Dict[str, Any]:
        """Plan de secours si le LLM échoue."""
        return {
            "characters": [{"name": "Protagoniste", "description": "Un personnage mystérieux"}],
            "music_theme": "Cinematic ambient",
            "segments": [
                {
                    "description": prompt,
                    "blender_scene": {"type": "exterior", "camera_shot": "wide", "atmosphere": "fog"},
                    "duration": 5
                }
            ]
        }

async def main():
    parser = argparse.ArgumentParser(description="StoryCore One-Prompt Pipeline")
    parser.add_argument("prompt", type=str, help="Le prompt créatif pour la vidéo")
    parser.add_argument("--project", type=str, default=f"prod_{uuid.uuid4().hex[:6]}", help="ID du projet")
    parser.add_argument("--output", type=str, default="./output/one_prompt", help="Dossier de sortie")
    parser.add_argument("--no-blender", action="store_true", help="Désactiver l'étape Blender")
    
    args = parser.parse_args()
    
    config = PipelineConfig(
        project_id=args.project,
        output_dir=Path(args.output),
        use_blender=not args.no_blender
    )
    
    pipeline = OnePromptPipeline(config)
    await pipeline.run(args.prompt)

if __name__ == "__main__":
    asyncio.run(main())
