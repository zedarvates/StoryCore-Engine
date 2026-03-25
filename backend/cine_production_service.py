import asyncio
import base64
import json
import logging
import os
import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import aiohttp
from pydantic import BaseModel, Field

from backend.config import settings
from backend.ffmpeg_service import FFmpegService
from backend.gem_service_client import gem_client
from src.addon_manager import AddonManager, AddonType, AddonState

logger = logging.getLogger(__name__)

# =============================================================================
# MODELS FOR CINE PRODUCTION
# =============================================================================

class ProductionQuality(Enum):
    DRAFT = "draft"
    STANDARD = "standard"
    CINEMATIC = "cinematic"
    ULTRA = "ultra"

class CineChainType(Enum):
    GENERATE_SCENE = "generate_scene"           # None/One character scene (Storyboard -> Wan 2.1 -> Audio)
    SPEAKING_CHARACTER = "speaking_character"   # Character speaking (Audio -> Wan 2.1 LipSync)
    STORYBOARD_ONLY = "storyboard_only"         # Fast storyboard generation
    MUSIC_PRO = "music_pro"                     # Music generation with Ace Step 1.5 Professional
    AUDIO_REMIX = "audio_remix"                 # Regenerate audio for existing video
    TTS_SPEAKING_CHARACTER = "tts_speaking"     # Text -> Qwen TTS -> LipSync Video
    LTX_VIDEO_GENERATION = "ltx_video"          # LTX2 text-to-video or image-to-video

class CineProductionRequest(BaseModel):
    chain_type: CineChainType = Field(alias="chainType")
    project_id: str = Field(alias="projectId")
    scene_id: Optional[str] = Field(default=None, alias="sceneId")
    
    # Inputs
    image_prompt: Optional[str] = Field(default=None, alias="imagePrompt")
    video_prompt: Optional[str] = Field(default=None, alias="videoPrompt")
    audio_prompt: Optional[str] = Field(default=None, alias="audioPrompt")
    sound_prompt: Optional[str] = Field(default=None, alias="soundPrompt")
    
    # Visual Director
    scene_description: Optional[str] = Field(default=None, alias="sceneDescription")
    use_visual_director: bool = Field(default=False, alias="useVisualDirector")
    
    # Character data if applicable
    character_id: Optional[str] = Field(default=None, alias="characterId")
    character_image_path: Optional[str] = Field(default=None, alias="characterImagePath")
    
    # Project context overrides
    genre: Optional[str] = None
    style: Optional[str] = None
    tone: Optional[str] = None
    
    # Quality settings
    quality: ProductionQuality = ProductionQuality.STANDARD
    width: int = 1280
    height: int = 720
    seed: int = -1
    
    # Engine selection (e.g. "Grok Imagine", "SeedDance")
    preferred_engine: Optional[str] = Field(default=None, alias="preferredEngine")
    
    # Preferred ComfyUI URL
    comfyui_url: Optional[str] = Field(default=None, alias="comfyuiUrl")
    
    # Generic overrides
    overrides: Optional[Dict[str, Any]] = None

    class Config:
        populate_by_name = True
        use_enum_values = True

class CineJobStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class CineProductionJob(BaseModel):
    id: str = Field(alias="jobId")
    request: CineProductionRequest
    status: CineJobStatus = CineJobStatus.PENDING
    progress: float = 0.0
    current_step: str = Field(default="", alias="currentStep")
    results: List[Dict[str, Any]] = Field(default_factory=list)
    comfyui_url: Optional[str] = None
    user_id: Optional[str] = Field(default=None, alias="userId")
    escrow_id: Optional[str] = Field(default=None, alias="escrowId")
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="startTime")
    completed_at: Optional[datetime] = Field(default=None, alias="endTime")

    class Config:
        populate_by_name = True
        use_enum_values = True

# =============================================================================
# CINE PRODUCTION SERVICE
# =============================================================================

class CineProductionService:
    """
    High-Fidelity Cinema Production Service.
    
    Handles complex workflow chaining for Wan 2.2, LTX2, and ACE Step 1.5.
    Manages data flow between storyboard, video generation, and audio production.
    """
    
    WORKFLOW_PATHS = {
        "storyboard": "workflows/high_fidelity/smart_vision_storyboard.json",
        "wan_i2v": "workflows/high_fidelity/image_to_video_wan2.2.json",
        "wan_s2v": "workflows/high_fidelity/generate_one_character_speaking_video.json",
        "ace_step": "workflows/high_fidelity/smart_vision_ace_step_1.5_Professional.json",
        "none_character": "workflows/high_fidelity/generate_none_character_scene.json",
        "one_character": "workflows/high_fidelity/generate_one_character_scene.json",
        "ltx_video": "workflows/high_fidelity/smart_vision_ltx2_i2v_gguf.json"
    }

    # Mapping of visual styles to musical/audio characteristics
    STYLE_MUSIC_MAPPING = {
        "anime 80s": "City Pop, late 80s synth-pop, FM synthesis, nostalgic Japanese city-pop vibes, bright brass hits, funky basslines.",
        "anime 90s": "Eurobeat, J-pop 90s, high-energy techno-pop, or epic orchestral strings (Evangelion style), breakbeats.",
        "anime 2000s": "Digital J-Rock, early 2000s trance-inspired pop, clean digital production, rock guitars.",
        "photorealistic cyberpunk": "Dark synthwave, industrial drones, heavy sub-bass, glitchy electronic textures, Vangelis-style pads.",
        "cinematic photorealistic": "Orchestral cinematic score, deep cinematic percussion, hybrid orchestral-electronic, Hans Zimmer style.",
        "ghibli": "Joe Hisaishi style, whimsical piano, lush orchestral arrangements, woodwinds, emotional and sweeping melodies.",
        "horror": "Dissonant strings, jump-scare stingers, low-frequency drones, scratching textures, tense clock-ticking sounds.",
        "noir": "Jazz noir, mournful trumpet, smoky lounge atmosphere, upright bass, rain sounds in the background.",
    }

    def __init__(self, comfyui_url: str = None):
        self.comfyui_url = comfyui_url or settings.COMFYUI_BASE_URL
        self._jobs: Dict[str, CineProductionJob] = {}
        self._active_tasks: Dict[str, asyncio.Task] = {}
        try:
            self.ffmpeg = FFmpegService()
        except Exception as e:
            logger.warning(f"FFmpeg not available: {e}")
            self.ffmpeg = None
        self.output_dir = "./output"
        os.makedirs(self.output_dir, exist_ok=True)
        
        # Addon System Integration
        self.addon_manager = AddonManager()
        # Store task reference to prevent garbage collection before completion
        self._addon_init_task: Optional[asyncio.Task] = None
        try:
            loop = asyncio.get_running_loop()
            self._addon_init_task = asyncio.create_task(self.addon_manager.initialize_all_addons())
        except RuntimeError:
            # No running loop, will initialize lazily on first use
            pass
        
        logger.info(f"CineProductionService initialized with ComfyUI at {self.comfyui_url}")

    def _calculate_job_cost(self, job: CineProductionJob) -> int:
        """Determines the cost in gems based on complexity."""
        base_costs = {
            CineChainType.STORYBOARD_ONLY.value: 1,
            CineChainType.GENERATE_SCENE.value: 5,
            CineChainType.LTX_VIDEO_GENERATION.value: 5,
            CineChainType.SPEAKING_CHARACTER.value: 3,
            CineChainType.MUSIC_PRO.value: 2,
            CineChainType.TTS_SPEAKING_CHARACTER.value: 4
        }
        
        # Use string lookup
        cost = base_costs.get(job.request.chain_type, 2)
        
        # Quality Multiplier
        quality_multipliers = {
            ProductionQuality.DRAFT.value: 0.5,
            ProductionQuality.STANDARD.value: 1.0,
            ProductionQuality.CINEMATIC.value: 2.0,
            ProductionQuality.ULTRA.value: 5.0
        }
        
        multiplier = quality_multipliers.get(job.request.quality, 1.0)
        return int(cost * multiplier)

    async def start_production_job(self, request: CineProductionRequest, user_id: str = None) -> str:
        """Starts a background production job."""
        job_id = str(uuid.uuid4())
        job = CineProductionJob(
            id=job_id, 
            request=request,
            comfyui_url=request.comfyui_url or self.comfyui_url,
            user_id=user_id
        )
        self._jobs[job_id] = job
        
        # Launch async task
        task = asyncio.create_task(self._process_job(job_id))
        self._active_tasks[job_id] = task
        
        return job_id

    async def get_job_status(self, job_id: str) -> Optional[CineProductionJob]:
        """Returns the status of a specific job."""
        return self._jobs.get(job_id)

    async def _process_job(self, job_id: str):
        """Main processing loop for a job."""
        job = self._jobs[job_id]
        job.status = CineJobStatus.PROCESSING
        
        # Phase -1: Escrow Setup (New)
        if job.user_id:
            cost = self._calculate_job_cost(job)
            if cost > 0:
                # Map internal request to hardware-aware task_type
                # Pydantic with use_enum_values=True converts Enums to strings
                task_type_val = job.request.chain_type
                quality_val = job.request.quality
                
                # Refined mapping for MVP Secure
                if task_type_val == CineChainType.STORYBOARD_ONLY.value:
                    task_type = "audio_sfx" # Storyboard is light
                elif quality_val == ProductionQuality.DRAFT.value:
                    task_type = "video_draft"
                elif quality_val == ProductionQuality.STANDARD.value:
                    task_type = "video_cinematic" # Standard is already cinematic in high-fidelity
                elif quality_val == ProductionQuality.CINEMATIC.value:
                    task_type = "video_cinematic"
                elif quality_val == ProductionQuality.ULTRA.value:
                    task_type = "video_ultra"
                else:
                    task_type = str(task_type_val)
                
                logger.info(f"Creating escrow for job {job_id} (Type: {task_type}): {cost} gems from {job.user_id}")
                
                escrow_id = await gem_client.create_escrow(
                    sender_id=job.user_id,
                    receiver_id="system_shared_compute",
                    amount=cost,
                    reason=f"Cine Production: {job.request.chain_type}",
                    task_type=task_type
                )
                if not escrow_id:
                    job.status = CineJobStatus.FAILED
                    job.error = "Escrow rejected: Insufficient gems or no suitable hardware (VRAM)."
                    return
                job.escrow_id = escrow_id

        try:
            # Load project context (genre, style, tone)
            project_context = await self._get_project_context(job.request.project_id)
            
            # If scene_description is missing, try to fetch it from scenario
            if not job.request.scene_description and job.request.scene_id:
                job.request.scene_description = await self._get_scene_description(job.request.project_id, job.request.scene_id)
            
            # Phase 0: Visual Director (LLM expansion)
            if job.request.use_visual_director and job.request.scene_description:
                await self._run_visual_director_phase(job, project_context)
                
            # Phase 1: Workflow Chaining
            # If a preferred engine (addon) is selected, we may skip the standard internal chains
            # unless the preferred engine is explicitly "comfyui".
            use_addon = False
            if job.request.preferred_engine and job.request.preferred_engine.lower() != "comfyui":
                addon_info = self.addon_manager.get_addon_info(job.request.preferred_engine)
                # Fallback check
                if not addon_info:
                    for name in self.addon_manager.addons:
                        if name.lower() == job.request.preferred_engine.lower():
                            addon_info = self.addon_manager.get_addon_info(name)
                            break
                
                if addon_info and addon_info.state == AddonState.ENABLED:
                    use_addon = True
                    logger.info(f"Using addon engine {job.request.preferred_engine} - skipping standard chains")

            if not use_addon:
                if job.request.chain_type == CineChainType.GENERATE_SCENE:
                    await self._run_scene_generation_chain(job)
                elif job.request.chain_type == CineChainType.LTX_VIDEO_GENERATION:
                    await self._run_ltx_video_generation_chain(job)
                elif job.request.chain_type == CineChainType.SPEAKING_CHARACTER:
                    await self._run_speaking_character_chain(job)
                elif job.request.chain_type == CineChainType.MUSIC_PRO:
                    await self._run_music_pro_chain(job)
                elif job.request.chain_type == CineChainType.STORYBOARD_ONLY:
                    await self._run_storyboard_only_chain(job)
                elif job.request.chain_type == CineChainType.AUDIO_REMIX:
                    await self._run_audio_remix_chain(job)
                elif job.request.chain_type == CineChainType.TTS_SPEAKING_CHARACTER:
                    await self._run_tts_speaking_character_chain(job)
            else:
                # Still run visual director if requested (already handled above)
                # Then run addon generation
                await self._run_addon_generation(job)
            
            # Phase 2: Persist results to Shot storage
            await self._update_shot_metadata(job, job.results)
            
            job.status = CineJobStatus.COMPLETED
            job.progress = 100.0
            job.current_step = "Finished"
            job.completed_at = datetime.utcnow()
            
            # Step Final: Release Escrow
            if job.escrow_id:
                logger.info(f"Releasing escrow {job.escrow_id} for job {job_id}")
                await gem_client.release_escrow(job.escrow_id)
            
        except asyncio.CancelledError:
            job.status = CineJobStatus.CANCELLED
            logger.info(f"Job {job_id} was cancelled")
            if job.escrow_id:
                await gem_client.cancel_escrow(job.escrow_id)
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            logger.error(f"Job {job_id} failed: {error_trace}")
            job.status = CineJobStatus.FAILED
            job.error = str(e)
            job.completed_at = datetime.utcnow()
            if job.escrow_id:
                logger.warning(f"Refunding gems for failed job {job_id} (escrow {job.escrow_id})")
                await gem_client.cancel_escrow(job.escrow_id)
        finally:
            if job_id in self._active_tasks:
                del self._active_tasks[job_id]

    async def _run_visual_director_phase(self, job: CineProductionJob, context: Dict[str, Any]):
        """Uses an LLM to expand a scene description into detailed cinematic prompts."""
        job.current_step = "Visual Director: Composing prompts"
        job.progress = 5.0
        
        from backend.llm_api import generate_text, LLMRequest
        
        # Priority: Request overrides > Project Context > Defaults
        genre = job.request.genre or context.get("genre") or context.get("metadata", {}).get("genre", "Cinematic")
        style = job.request.style or context.get("style") or context.get("metadata", {}).get("style", "Photorealistic")
        tone = job.request.tone or context.get("tone") or context.get("metadata", {}).get("tone", "Dramatic")
        
        # Style-specific instructions expansion
        style_guidance = ""
        lower_style = style.lower()
        
        if "photorealistic" in lower_style or "cinematic" in lower_style:
            style_guidance = """
            - USE PHOTOREALISTIC TERMS: 35mm anamorphic lenses, T1.5 aperture, Rembrandt lighting, volumetric fog, detailed skin textures, ray-traced reflections.
            - FOCUS: Cinematic composition, rule of thirds, depth of field, and naturalistic color grading.
            """
        elif "anime" in lower_style:
            if "80s" in lower_style:
                style_guidance = """
                - STYLE: 80s Retro Anime (Retro-futurism).
                - VISUALS: Hand-painted animation cels, heavy ink outlines, chromatic aberration, lo-fi CRT texture, airbrushed highlights on metal.
                - MOOD: Gritty sci-fi or romantic city-pop aesthetics.
                """
            elif "90s" in lower_style:
                style_guidance = """
                - STYLE: 90s Classic Anime (Aesthetic era).
                - VISUALS: Balanced hand-drawn and early digital look, pastel color palettes, shimmering eyes, detailed watercolor backgrounds, slight film grain.
                """
            elif "2000s" in lower_style:
                style_guidance = """
                - STYLE: 2000s Modern Digital Anime.
                - VISUALS: Sharp digital line art, cel-shading with high-contrast gradients, dynamic speed lines, clean digital backgrounds.
                """
            else:
                style_guidance = """
                - STYLE: Contemporary Anime.
                - VISUALS: High production value, digital compositing, glowing particle effects, vibrant colors, expressive character designs.
                """
        elif "stylized" in lower_style or "animation" in lower_style:
            style_guidance = f"""
            - STYLE: {style}.
            - VISUALS: Focus on the specific artistic medium (e.g., Oil Painting, Sketch, 3D Pixar-style). 
            - DO NOT use photorealistic camera terms unless they refer to artistic composition.
            """

        prompt = f"""
        You are a Visual Director for a high-end cinematic production.
        Your MISSION is to expand the scene description into three specialized prompts, while strictly adhering to the project's visual identity.
        
        PROJECT IDENTITY (MAX PRIORITY):
        - Genre: {genre}
        - Visual Style: {style}
        - Narrative Tone: {tone}
        
        SCENE DESCRIPTION: {job.request.scene_description}
        
        VISUAL STYLE GUIDANCE:
        {style_guidance}
        
        INSTRUCTIONS:
        1. MANDATORY STYLE ADHERENCE: All prompts MUST strictly respect the Visual Style ({style}). 
        2. IMAGE_PROMPT: Detailed visual style, lighting, composition, and mood for a static storyboard frame.
        3. VIDEO_PROMPT: Dynamic evolution, specific camera movements (dolly, tracking, zoom), and temporal effects (e.g. slow motion, time-lapse).
        4. AUDIO_PROMPT: Sound design, foley requirements, and musical mood consistent with the {tone}.
        
        FORMAT YOUR RESPONSE EXACTLY AS JSON:
        {{
          "image_prompt": "...",
          "video_prompt": "...",
          "audio_prompt": "..."
        }}
        """
        
        try:
            # We assume the user has a valid JWT or we use a system-level verify/bypass for internal calls
            # For simplicity, we create a mock request or call the helper directly
            llm_req = LLMRequest(prompt=prompt, temperature=0.7)
            # Internal call - ideally we have a service method that doesn't require FastAPI Dependencies
            # But generate_text is a route handler. Let's call the underlying helper call_llm_real
            from backend.llm_api import call_llm_real
            response = await call_llm_real(llm_req, user_id="system_director")
            
            # Parse response
            # Clean possible markdown block
            text = response.text.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            
            prompts = json.loads(text)
            
            # Apply expanded prompts if not already provided
            if not job.request.image_prompt: job.request.image_prompt = prompts.get("image_prompt")
            if not job.request.video_prompt: job.request.video_prompt = prompts.get("video_prompt")
            if not job.request.audio_prompt: job.request.audio_prompt = prompts.get("audio_prompt")
            
            logger.info(f"Visual Director expanded prompts for job {job.id}")
            
        except Exception as e:
            logger.warning(f"Visual Director failed: {e}. Falling back to default prompts.")

    async def _get_project_context(self, project_id: str) -> Dict[str, Any]:
        """Fetches project metadata to provide context for the Visual Director."""
        try:
            from backend.storage import JSONFileStorage
            # Try loading from projects directory (default ./projects)
            # project_api uses ./projects
            storage = JSONFileStorage("./projects")
            project = storage.load(project_id)
            if project:
                return project
                
            # Fallback or check scenario
            storage_scenario = JSONFileStorage("./data/scenarios")
            scenario = storage_scenario.load(project_id) # Sometimes project_id = scenario_id
            if scenario:
                meta = scenario.get("meta", {})
                return {
                    "genre": meta.get("genre", "Drama"),
                    "style": meta.get("style", "Photorealistic"),
                    "tone": meta.get("ton", "Serious")
                }
        except Exception as e:
            logger.warning(f"Could not load project context for {project_id}: {e}")
            
        return {}

    async def _get_scene_description(self, project_id: str, scene_id: str) -> Optional[str]:
        """Attempts to fetch a scene description from the scenario data."""
        try:
            from backend.storage import JSONFileStorage
            storage = JSONFileStorage("./data/scenarios")
            scenario = storage.load(project_id) or storage.load(scene_id.split('_')[0])
            
            if scenario:
                for scene in scenario.get("scenes", []):
                    if str(scene.get("id")) == str(scene_id):
                        return scene.get("description")
        except Exception as e:
            logger.debug(f"Could not load scene description: {e}")
        return None

    async def _run_scene_generation_chain(self, job: CineProductionJob):
        """
        Storyboard -> Wan 2.2 -> ACE Step Audio
        """
        # Step 1: Storyboard
        job.current_step = "Generating Storyboard"
        job.progress = 10.0
        storyboard_result = await self._execute_workflow(
            "storyboard",
            self.WORKFLOW_PATHS["storyboard"],
            {
                "image_prompt": job.request.image_prompt,
                "seed": job.request.seed
            },
            comfyui_url=job.comfyui_url
        )
        job.results.append({"step": "storyboard", "output": storyboard_result})
        
        # Pass storyboard to Video Gen
        storyboard_image = storyboard_result.get("filename")
        
        # Step 2: Wan 2.1 Video
        job.current_step = "Generating Cinematic Video (Wan 2.1)"
        job.progress = 40.0
        video_result = await self._execute_workflow(
            "wan_i2v",
            self.WORKFLOW_PATHS["wan_i2v"],
            {
                "image": storyboard_image, # ComfyUI LoadImage expects filename
                "positive": job.request.video_prompt or job.request.image_prompt,
                "width": job.request.width,
                "height": job.request.height
            },
            comfyui_url=job.comfyui_url
        )
        job.results.append({"step": "video", "output": video_result})
        
        # Step 3: ACE Step Audio (Design Sonore)
        job.current_step = "Designing Sound & Music (ACE Step)"
        job.progress = 80.0
        
        # Enrich audio prompt with project context for the architects
        project_context = await self._get_project_context(job.request.project_id) # Re-fetch or pass from _process_job
        audio_context = self._build_audio_context_prompt(job, project_context)
        
        audio_result = await self._execute_workflow(
            "ace_step",
            self.WORKFLOW_PATHS["ace_step"],
            {
                "audio_input": audio_context,
                "image": storyboard_image # Vibe-check influence
            },
            comfyui_url=job.comfyui_url
        )
        job.results.append({"step": "audio", "output": audio_result})

        # Step 4: Muxing (Optional but recommended for high-fidelity)
        await self._mux_results(job, video_result, audio_result)

    async def _run_ltx_video_generation_chain(self, job: CineProductionJob):
        """
        LTX2 Video Generation Chain (Fast/Pro/Ultra mode support)
        """
        job.current_step = "Generating Cinematic Video (LTX2)"
        job.progress = 20.0
        
        # Configure quality/mode overrides
        steps = 20
        if job.request.quality == ProductionQuality.DRAFT:
            steps = 10 # Fast Mode
        elif job.request.quality == ProductionQuality.STANDARD:
            steps = 20 # Pro Mode
        elif job.request.quality in [ProductionQuality.CINEMATIC, ProductionQuality.ULTRA]:
            steps = 40 # Ultra Mode
            
        video_result = await self._execute_workflow(
            "ltx_video",
            self.WORKFLOW_PATHS["ltx_video"],
            {
                "positive": job.request.video_prompt or job.request.image_prompt or "cinematic video scene",
                "image": job.request.character_image_path, # Optional image-to-video
                "width": job.request.width,
                "height": job.request.height,
                "steps": steps,
                "seed": job.request.seed
            },
            comfyui_url=job.comfyui_url
        )
        job.results.append({"step": "video", "output": video_result})
        job.progress = 80.0
        
        # Optional audio muxing if requested
        if job.request.audio_prompt:
            job.current_step = "Designing Sound & Music (ACE Step)"
            project_context = await self._get_project_context(job.request.project_id)
            audio_context = self._build_audio_context_prompt(job, project_context)
            audio_result = await self._execute_workflow(
                "ace_step",
                self.WORKFLOW_PATHS["ace_step"],
                {
                    "audio_input": audio_context,
                    "image": None 
                },
                comfyui_url=job.comfyui_url
            )
            job.results.append({"step": "audio", "output": audio_result})
            await self._mux_results(job, video_result, audio_result)
        else:
            job.progress = 100.0

    async def _run_tts_speaking_character_chain(self, job: CineProductionJob):
        """
        Text Input -> Qwen TTS -> LipSync Video
        """
        job.current_step = "Generating TTS Audio (Qwen3)"
        job.progress = 10.0
        
        from backend.qwen_tts_service import QwenTTSService
        tts_service = QwenTTSService(comfyui_url=job.comfyui_url)
        
        # Load project context
        project_context = await self._get_project_context(job.request.project_id)
        
        # Determine text and voice
        text = job.request.audio_prompt or project_context.get("description", "Hello")
        voice_id = job.request.character_id or "Ryan"
        
        # 1. Generate Audio
        tts_result = await tts_service.text_to_speech(
            text=text,
            voice=voice_id,
            instruct=job.request.tone or "neutral"
        )
        
        if not tts_result.success:
            raise Exception(f"TTS Failed: {tts_result.error_message}")
            
        audio_file = tts_result.audio_path
        job.results.append({"step": "tts", "output": {"filename": audio_file}})
        job.progress = 40.0
        
        # 2. Lip Sync
        job.current_step = "Generating LipSync Video"
        
        # Ref image: character image or storyboard
        ref_image = job.request.character_image_path
        if not ref_image:
            # Create a quick storyboard if missing? No, assume user provided it or we use default
            ref_image = "default_character.png"
            
        # Lip sync is now handled via the unified workflow executor
        # In a real system, we'd use a shared task queue. 
        # Here we'll call the internal helper or _execute_workflow with a lipsync json
        video_result = await self._execute_workflow(
            "wan_s2v", # Reuse wan_s2v for lip sync if configured correctly
            self.WORKFLOW_PATHS["wan_s2v"],
            {
                "positive": job.request.video_prompt or "cinematic character speaking",
                "image": ref_image,
                "audio": audio_file
            },
            comfyui_url=job.comfyui_url
        )
        
        job.results.append({"step": "speaking_video", "output": video_result})
        job.progress = 90.0

    async def _run_speaking_character_chain(self, job: CineProductionJob):
        """
        Audio + Image -> Wan 2.2 Speaking Video
        """
        job.current_step = "Generating Speaking Character (Wan S2V)"
        job.progress = 20.0
        
        # Audio selection: job input > character default > fallback
        audio_input = job.request.audio_prompt # In S2V, sometimes audio_prompt is a filename
        if not audio_input:
             audio_input = f"voice_{job.request.character_id}.wav"
        
        # Use provided character image or fallback to storyboard result if this is part of a larger chain
        ref_image = job.request.character_image_path
        if not ref_image and job.results:
            # Try to grab storyboard from previous results
            story_res = next((r for r in job.results if r["step"] == "storyboard"), None)
            if story_res:
                ref_image = story_res["output"].get("filename")
        
        video_result = await self._execute_workflow(
            "wan_s2v",
            self.WORKFLOW_PATHS["wan_s2v"],
            {
                "positive": job.request.video_prompt or "character speaking directly to camera, cinematic",
                "image": ref_image,
                "audio": audio_input
            },
            comfyui_url=job.comfyui_url
        )
        job.results.append({"step": "speaking_video", "output": video_result})

    async def _run_music_pro_chain(self, job: CineProductionJob):
        """
        Advanced music generation with ACE Step
        """
        job.current_step = "Composing Advanced Music"
        job.progress = 50.0
        
        project_context = await self._get_project_context(job.request.project_id)
        audio_context = self._build_audio_context_prompt(job, project_context)
        
        audio_result = await self._execute_workflow(
            "ace_step",
            self.WORKFLOW_PATHS["ace_step"],
            {
                "audio_input": audio_context,
                "image": job.request.character_image_path # Optional influence
            },
            comfyui_url=job.comfyui_url
        )
        job.results.append({"step": "music_pro", "output": audio_result})

    def _build_audio_context_prompt(self, job: CineProductionJob, context: Dict[str, Any]) -> str:
        """Constructs an enriched prompt for the audio LLM (ACE Step)."""
        genre = job.request.genre or context.get("genre", "Soundtrack")
        tone = job.request.tone or context.get("tone", "Dramatic")
        style = (job.request.style or context.get("style", "")).lower()
        
        # Get era-specific music cues
        style_cues = ""
        for s_key, s_val in self.STYLE_MUSIC_MAPPING.items():
            if s_key in style:
                style_cues = s_val
                break
        
        # If no style-specific match, fallback to general tone
        if not style_cues:
            style_cues = f"Musical style aligned with {tone} mood."

        # Extract SFX cues from description if they follow the [SFX: ...] pattern
        sfx_highlights = ""
        if job.request.scene_description:
            import re
            sfx_matches = re.findall(r'\[(\d+s\s*-\s*\d+s)\]:.*?\[SFX:\s*(.*?)\]', job.request.scene_description)
            if sfx_matches:
                sfx_highlights = "\n        TIMED SFX CUES (MANDATORY):\n"
                for time, sfx in sfx_matches:
                    sfx_highlights += f"        - At {time}: Generate {sfx}\n"

        return f"""
        TASK: You are a SONIC ARCHITECT. Design the audio for a cinematic scene.
        
        SCENE THEME: {job.request.scene_description}
        PROJECT GENRE: {genre}
        NARRATIVE TONE: {tone}
        VISUAL STYLE: {style}
        
        REQUIRED MUSICAL DIRECTION: 
        {style_cues}
        {sfx_highlights}
        
        SOUND DESIGN INSTRUCTIONS:
        1. SYNCHRONIZATION: Ensure the sound effects (SFX) are perfectly synchronized with the timestamps provided in the SCENE THEME.
        2. AMBIANCE: Mix the specific SFX with a background ambiance that matches the {tone}.
        3. FOLEY: Include high-quality foley for footsteps, object handling, and environmental sounds.
        
        USER SPECIFIC INSTRUCTION: {job.request.audio_prompt or 'Create a balanced mix of music and ambiance with synchronized sound effects.'}
        """

    async def _run_storyboard_only_chain(self, job: CineProductionJob):
        """
        Fast storyboard generation (Image only)
        """
        job.current_step = "Generating Storyboard (Fast)"
        job.progress = 30.0
        storyboard_result = await self._execute_workflow(
            "storyboard",
            self.WORKFLOW_PATHS["storyboard"],
            {
                "image_prompt": job.request.image_prompt,
                "seed": job.request.seed
            },
            comfyui_url=job.comfyui_url
        )
        job.results.append({"step": "storyboard", "output": storyboard_result})

    async def _run_audio_remix_chain(self, job: CineProductionJob):
        """
        Regenerate audio for an existing video using ACE Step.
        """
        job.current_step = "Regenerating Sound Design (ACE Step)"
        job.progress = 20.0
        
        # Get video context if possible (for visual influence)
        ref_image = None
        try:
            from backend.storage import JSONFileStorage
            shot_storage = JSONFileStorage("./data/shots")
            shot = shot_storage.load(job.request.scene_id)
            if shot:
                ref_image = shot.get("metadata", {}).get("storyboard_file")
        except:
            pass
            
        project_context = await self._get_project_context(job.request.project_id)
        audio_context = self._build_audio_context_prompt(job, project_context)
        
        audio_result = await self._execute_workflow(
            "ace_step",
            self.WORKFLOW_PATHS["ace_step"],
            {
                "audio_input": audio_context,
                "image": ref_image
            },
            comfyui_url=job.comfyui_url
        )
        job.results.append({"step": "audio", "output": audio_result})
        
        # Muxing for remix
        # Try to find existing video if scene_id points to a shot with video
        existing_video = None
        try:
            from backend.storage import JSONFileStorage
            shot_storage = JSONFileStorage("./data/shots")
            shot = shot_storage.load(job.request.scene_id)
            if shot and shot.get("result_url"):
                # result_url is like /output/wan_0001.mp4
                existing_video = shot["result_url"].replace("/output/", "")
        except:
            pass
            
        if existing_video:
            await self._mux_results(job, {"filename": existing_video}, audio_result)

    async def _execute_workflow(self, workflow_name: str, workflow_path: str, overrides: Dict[str, Any], comfyui_url: str = None) -> Dict[str, Any]:
        """Loads, modifies, and submits a workflow to ComfyUI."""
        from src.comfyui_executor import comfyui_executor
        
        # Load workflow JSON
        abs_path = os.path.join(os.getcwd(), workflow_path)
        with open(abs_path, 'r', encoding='utf-8') as f:
            workflow_raw = json.load(f)
            
        # Convert UI format to API format if needed
        if "nodes" in workflow_raw:
            workflow_api = self._convert_ui_to_api(workflow_raw)
        else:
            workflow_api = workflow_raw
            
        # Apply overrides
        self._apply_overrides(workflow_name, workflow_api, overrides)
        
        # 1. Clean memory before high-fidelity tasks
        await comfyui_executor.free_memory(comfyui_url=comfyui_url or self.comfyui_url)
        
        # 2. Execute via shared executor
        result = await comfyui_executor.execute_workflow(
            workflow=workflow_api,
            comfyui_url=comfyui_url or self.comfyui_url
        )
        
        if not result["success"]:
            raise Exception(f"ComfyUI Execution Failed: {result.get('error')}")
            
        # Format result for CineProductionService expectation
        # CineProductionService expects a dictionary with "outputs"
        return {"outputs": {out["node_id"]: {"images": [{"filename": out["filename"], "type": "output"}]} for out in result["outputs"] if out["type"] == "image"}}

    def _convert_ui_to_api(self, workflow_ui: Dict[str, Any]) -> Dict[str, Any]:
        """Converts ComfyUI UI JSON format to API JSON format with link resolution."""
        workflow_api = {}
        # Map link_id -> (source_node_id, source_output_index)
        links = {l[0]: (str(l[1]), l[2]) for l in workflow_ui.get("links", [])}
        
        # Build API nodes
        nodes = workflow_ui.get("nodes", [])
        for node in nodes:
            node_id = str(node["id"])
            inputs = {}
            
            # 1. Handle widget values (guess mapping or use as meta)
            if "widgets_values" in node:
                inputs["_widgets"] = node["widgets_values"]
            
            # 2. Handle links (inputs from other nodes)
            for inp in node.get("inputs", []):
                link_id = inp.get("link")
                if link_id in links:
                    # API format: "input_name": ["node_id", output_index]
                    inputs[inp["name"]] = list(links[link_id])
            
            workflow_api[node_id] = {
                "class_type": node["type"],
                "inputs": inputs
            }
            
        return workflow_api

    async def _update_shot_metadata(self, job: CineProductionJob, results: List[Dict[str, Any]]):
        """Updates the shot metadata and status in the storage."""
        try:
            from backend.storage import JSONFileStorage
            shot_storage = JSONFileStorage("./data/shots")
            shot = shot_storage.load(job.request.scene_id)
            if not shot:
                return
                
            # Update results
            for res in results:
                step = res.get("step")
                output = res.get("output", {})
                
                if step == "storyboard":
                    shot["thumbnail_url"] = f"/output/{output.get('filename')}"
                    shot["metadata"]["storyboard_file"] = output.get("filename")
                elif step in ["video", "speaking_video"]:
                    # Default video if no muxing happened yet
                    if not shot.get("result_url") or "final_" not in shot.get("result_url"):
                        shot["result_url"] = f"/output/{output.get('filename')}"
                    shot["status"] = "completed"
                elif step == "muxed_video":
                    # Muxed video is the highest quality main result
                    shot["result_url"] = f"/output/{output.get('filename')}"
                    shot["status"] = "completed"
                elif step == "audio":
                    shot["metadata"]["audio_file"] = output.get("filename")
            
            shot["updated_at"] = datetime.utcnow().isoformat()
            shot_storage.save(job.request.scene_id, shot)
            logger.info(f"Updated shot {job.request.scene_id} with production results")
            
        except Exception as e:
            logger.error(f"Failed to update shot metadata: {e}")

    def _apply_overrides(self, workflow_name: str, workflow: Dict[str, Any], overrides: Dict[str, Any]):
        """Helper to inject values into specific nodes based on workflow name."""
        
        # MAPPING FOR HIGH-FIDELITY WORKFLOWS
        # (Based on manual analysis of the provided JSONs)
        MAPS = {
            "storyboard": {
                "image_prompt": ("22", "prompt"),  # TextEncodeQwenImageEditPlus
                "width": ("12", "width"),          # ImageResizeKJv2
                "height": ("12", "height"),
            },
            "wan_i2v": {
                "positive": ("6", "positive"),      # WanSoundImageToVideo
                "image": ("6", "ref_image"),
            },
            "wan_s2v": {
                "positive": ("25", "text"),
                "image": ("31", "image"),
                "audio": ("13", "audio")
            },
            "ace_step": {
                "audio_input": ("12", "text"),      # ttN text (Master Input)
                "audio_prompt": ("16", "prompt"),   # Sonic Architect
                "audio_tags": ("13", "tags"),
                "image": ("21", "image"),           # Storyboard Influence
                "duration": ("14", "value")         # Song Duration Node
            },
            "ltx_video": {
                "positive": ("3", "text"),          # Prompt node reference
                "image": ("5", "image"),            # Image load node
                "steps": ("10", "steps"),           # Sampler steps node
                "seed": ("10", "seed")              # Sampler seed
            }
        }
        
        if workflow_name in MAPS:
            for key, (node_id, input_name) in MAPS[workflow_name].items():
                if key in overrides and node_id in workflow:
                    workflow[node_id]["inputs"][input_name] = overrides[key]
        
        # Generic fallback
        for node_id, node in workflow.items():
            class_type = node.get("class_type")
            if class_type == "CLIPTextEncode" and "positive" in overrides:
                node["inputs"]["text"] = overrides["positive"]
            if class_type == "LoadImage" and "image" in overrides:
                node["inputs"]["image"] = overrides["image"]
            if "seed" in node["inputs"] and overrides.get("seed", -1) != -1:
                node["inputs"]["seed"] = overrides["seed"]

    async def _free_memory(self, session: aiohttp.ClientSession, comfyui_url: str = None):
        """Calls ComfyUI's /free endpoint to release GPU memory."""
        url = comfyui_url or self.comfyui_url
        try:
            async with session.post(f"{url}/free", json={"unload_models": True, "free_memory": True}) as resp:
                if resp.status == 200:
                    logger.info("ComfyUI memory cleared")
        except Exception as e:
            logger.warning(f"Failed to clear ComfyUI memory: {e}")

    async def _wait_for_completion(self, session: aiohttp.ClientSession, prompt_id: str, timeout: int = 600, comfyui_url: str = None) -> Dict[str, Any]:
        """Polls for workflow completion and gathers all outputs."""
        url = comfyui_url or self.comfyui_url
        start_time = datetime.utcnow()
        while (datetime.utcnow() - start_time).total_seconds() < timeout:
            async with session.get(f"{url}/history/{prompt_id}") as resp:
                if resp.status == 200:
                    history = await resp.json()
                    if prompt_id in history:
                        # Extract outputs
                        node_outputs = history[prompt_id].get("outputs", {})
                        all_files = []
                        
                        for node_id, output in node_outputs.items():
                            # Handle Images
                            if "images" in output:
                                for img in output["images"]:
                                    all_files.append({"type": "image", "filename": img["filename"], "node": node_id})
                            # Handle Videos (different nodes use different keys)
                            for video_key in ["gifs", "videos", "videos_out"]:
                                if video_key in output:
                                    for vid in output[video_key]:
                                        all_files.append({"type": "video", "filename": vid["filename"], "node": node_id})
                            # Handle Audio
                            if "audio" in output:
                                for aud in output["audio"]:
                                    all_files.append({"type": "audio", "filename": aud["filename"], "node": node_id})
                        
                        if all_files:
                            # Prioritize video > image > audio for the main result
                            main_result = next((f for f in all_files if f["type"] == "video"), 
                                              next((f for f in all_files if f["type"] == "image"), 
                                                   all_files[0]))
                            return {**main_result, "all_outputs": all_files}
                            
                        return {"status": "completed", "prompt_id": prompt_id}
            
            await asyncio.sleep(3)
        
        raise Exception(f"Job timed out after {timeout} seconds")

    async def _download_from_comfyui(self, filename: str, file_type: str = "output", comfyui_url: str = None):
        """Downloads a file from ComfyUI output directory to local storage."""
        url_base = comfyui_url or self.comfyui_url
        local_path = os.path.join(self.output_dir, filename)
        
        # Skip if already exists locally
        if os.path.exists(local_path):
            return local_path
            
        async with aiohttp.ClientSession() as session:
            url = f"{url_base}/view?filename={filename}&type={file_type}"
            try:
                async with session.get(url) as resp:
                    if resp.status == 200:
                        content = await resp.read()
                        with open(local_path, "wb") as f:
                            f.write(content)
                        logger.info(f"Downloaded {filename} to {local_path}")
                        return local_path
                    else:
                        logger.error(f"Failed to download {filename}: HTTP {resp.status}")
                        return None
            except Exception as e:
                logger.error(f"Download error for {filename}: {e}")
                return None

    async def _mux_results(self, job: CineProductionJob, video_res: Dict[str, Any], audio_res: Dict[str, Any]):
        """Downloads video and audio, then muxes them into a final high-fidelity shot."""
        video_filename = video_res.get("filename")
        audio_filename = audio_res.get("filename")
        
        if not video_filename or not audio_filename:
            return None
            
        job.current_step = "Muxing Video & Audio"
        job.progress = 90.0
        
        # 1. Download both files
        video_local = await self._download_from_comfyui(video_filename, comfyui_url=job.comfyui_url)
        audio_local = await self._download_from_comfyui(audio_filename, comfyui_url=job.comfyui_url)
        
        if not video_local or not audio_local:
            logger.error("Muxing failed: Could not download source files")
            return None
            
        # 2. Mux with FFmpeg
        output_name = f"final_{job.id[:8]}_{video_filename}"
        output_path = os.path.join(self.output_dir, output_name)
        
        success, error = self.ffmpeg.merge_audio_video(
            video_local, 
            audio_local, 
            output_path, 
            replace_audio=True
        )
        
        if success:
            logger.info(f"Successfully muxed video for job {job.id}: {output_name}")
            mux_result = {"filename": output_name, "type": "video"}
            job.results.append({"step": "muxed_video", "output": mux_result})
            return output_name
        else:
            logger.error(f"FFmpeg Muxing failed: {error}")
            return None

    async def _run_addon_generation(self, job: CineProductionJob):
        """Runs generation through an external addon engine."""
        engine_name = job.request.preferred_engine
        addon_info = self.addon_manager.get_addon_info(engine_name)
        
        if not addon_info:
            # Try lowercase matching if not found
            for name in self.addon_manager.addons:
                if name.lower() == engine_name.lower():
                    addon_info = self.addon_manager.get_addon_info(name)
                    engine_name = name
                    break
        
        if not addon_info or addon_info.state != AddonState.ENABLED:
            logger.warning(f"Addon engine {engine_name} not found or not enabled. Falling back.")
            return

        job.current_step = f"Generating via {engine_name}"
        job.progress = 50.0
        
        try:
            # Addons from official collection have a 'generate' method on the 'addon' instance
            if hasattr(addon_info.module, 'addon') and addon_info.module.addon:
                addon_instance = addon_info.module.addon
                
                # Prep scene data
                scene_data = {
                    "name": f"Job {job.id[:8]}",
                    "description": job.request.scene_description,
                    "image_prompt": job.request.image_prompt,
                    "video_prompt": job.request.video_prompt,
                    "audio_prompt": job.request.audio_prompt
                }
                
                # Prep overrides
                overrides = job.request.overrides or {}
                overrides.update({
                    "width": job.request.width,
                    "height": job.request.height,
                    "seed": job.request.seed,
                    "style": job.request.style,
                    "genre": job.request.genre
                })
                
                # Execution
                logger.info(f"Invoking {engine_name}.generate()...")
                result = await addon_instance.generate(scene_data, config_overrides=overrides)
                
                if result and result.get("status") == "success":
                    # Handle video or image results
                    res_path = result.get("video") or (result.get("images")[0] if result.get("images") else None)
                    if res_path:
                        filename = os.path.basename(res_path)
                        target_path = os.path.join(self.output_dir, filename)
                        
                        # Copy to output dir if it's elsewhere
                        if os.path.abspath(res_path) != os.path.abspath(target_path) and os.path.exists(res_path):
                            import shutil
                            shutil.copy2(res_path, target_path)
                        
                        res_type = "video" if result.get("video") else "image"
                        job.results.append({
                            "step": f"{engine_name}_generation",
                            "output": {"filename": filename, "type": res_type}
                        })
                        job.progress = 100.0
                        logger.info(f"Addon {engine_name} successfully generated {res_type}")
                    else:
                        logger.error(f"Addon {engine_name} success but no file path returned")
                else:
                    error_msg = result.get("error", "Unknown error")
                    logger.error(f"Addon {engine_name} failed: {error_msg}")
                    job.results.append({"step": "error", "output": f"Addon {engine_name} error: {error_msg}"})
            else:
                logger.error(f"Addon {engine_name} module does not have 'addon' instance")
                
        except Exception as e:
            logger.error(f"Exception in addon {engine_name} generation: {e}")
            job.results.append({"step": "error", "output": f"Addon exception: {str(e)}"})
