"""
StoryCore LLM Assistant API Routes
FastAPI endpoints for intelligent project creation from prompts.
"""

from fastapi import FastAPI, APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import os

# Import our LLM modules
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Note: TypeScript modules need to be converted to Python or used via exec
# For now, we'll create Python equivalents inline

# Create router
llm_router = APIRouter(prefix="/llm", tags=["llm-assistant"])


# Pydantic models for API requests/responses
class ParsePromptRequest(BaseModel):
    prompt: str
    use_llm: Optional[bool] = True


class ParsePromptResponse(BaseModel):
    success: bool
    parsed: Dict[str, Any]
    confidence: float


class GenerateNameRequest(BaseModel):
    project_title: Optional[str] = None
    genre: Optional[str] = None
    setting: Optional[str] = None
    key_elements: Optional[List[str]] = []


class ProjectNameSuggestion(BaseModel):
    suggested_name: str
    version: Optional[int] = None
    full_name: str
    is_duplicate: bool
    project_path: str


class GenerateNameResponse(BaseModel):
    success: bool
    suggestions: List[ProjectNameSuggestion]


class CreateProjectRequest(BaseModel):
    prompt: str
    project_name: Optional[str] = None
    generate_world: bool = True
    generate_characters: bool = True
    generate_story: bool = True
    generate_dialogues: bool = True
    generate_sequences: bool = True
    generate_music: bool = True


class CreateProjectResponse(BaseModel):
    success: bool
    project_path: str
    project_name: str
    parsed_prompt: Dict[str, Any]
    world_config: Optional[Dict[str, Any]] = None
    characters: Optional[List[Dict[str, Any]]] = None
    story: Optional[Dict[str, Any]] = None
    dialogues: Optional[List[Dict[str, Any]]] = None
    sequences: Optional[Dict[str, Any]] = None
    music: Optional[Dict[str, Any]] = None
    message: str


class SequencePlanRequest(BaseModel):
    prompt: str
    parsed: Dict[str, Any]
    target_duration: Optional[int] = 60
    aspect_ratio: Optional[str] = "16:9"


class SequencePlanResponse(BaseModel):
    success: bool
    plan: Dict[str, Any]


class MusicSoundRequest(BaseModel):
    project_title: str
    genre: str
    mood: List[str]
    video_type: str
    setting: Optional[str] = None
    time_period: Optional[str] = None
    target_duration: Optional[int] = 60


class MusicSoundResponse(BaseModel):
    success: bool
    music_description: Dict[str, Any]
    mixing_guide: Optional[Dict[str, Any]] = None


class AspectRatioInfo(BaseModel):
    value: str
    label: str
    description: str


class VideoTypeInfo(BaseModel):
    value: str
    label: str
    default_duration: int
    description: str


# Helper function to parse prompt (Python implementation)
def parse_prompt_rule_based(prompt: str) -> Dict[str, Any]:
    """Parse prompt using rule-based approach."""
    prompt_lower = prompt.lower()
    
    # Detect video type
    video_type = "unknown"
    if "trailer" in prompt_lower:
        video_type = "trailer"
    elif "teaser" in prompt_lower:
        video_type = "teaser"
    elif "music video" in prompt_lower or "clip musical" in prompt_lower:
        video_type = "music_video"
    elif "short film" in prompt_lower or "court métrage" in prompt_lower:
        video_type = "short_film"
    elif "documentary" in prompt_lower:
        video_type = "documentary"
    
    # Detect genre
    genre = "drama"
    if any(kw in prompt_lower for kw in ["cyberpunk", "sci-fi", "science fiction", "futuristic"]):
        genre = "cyberpunk"
    elif any(kw in prompt_lower for kw in ["fantasy", "magical", "enchanted"]):
        genre = "fantasy"
    elif any(kw in prompt_lower for kw in ["horror", "scary", "terror"]):
        genre = "horror"
    elif any(kw in prompt_lower for kw in ["action", "explosive", "chase"]):
        genre = "action"
    
    # Detect mood
    mood = []
    if any(kw in prompt_lower for kw in ["dark", "gloomy", "dystopian"]):
        mood.append("dark")
    if any(kw in prompt_lower for kw in ["tense", "tension", "nerve"]):
        mood.append("tense")
    if any(kw in prompt_lower for kw in ["epic", "grand", "heroic"]):
        mood.append("epic")
    if any(kw in prompt_lower for kw in ["intense", "intensity"]):
        mood.append("intense")
    if not mood:
        mood = ["neutral"]
    
    # Detect time period
    time_period = "unspecified"
    if any(kw in prompt_lower for kw in ["2048", "future", "2050", "futur"]):
        time_period = "future"
    elif any(kw in prompt_lower for kw in ["medieval", "ancient", "historical"]):
        time_period = "past"
    
    # Detect location
    location = "unspecified"
    if any(kw in prompt_lower for kw in ["city", "urban", "mégalopole"]):
        location = "city"
    elif any(kw in prompt_lower for kw in ["forest", "nature"]):
        location = "forest"
    
    # Detect key elements
    key_elements = []
    if "néon" in prompt_lower or "neon" in prompt_lower:
        key_elements.append("néon city")
    if "ia" in prompt_lower or "ai" in prompt_lower or "corrupt" in prompt_lower:
        key_elements.append("IA corrompue")
    if "drone" in prompt_lower:
        key_elements.append("drones de surveillance")
    if "mercenary" in prompt_lower or "mercenaires" in prompt_lower:
        key_elements.append("sept mercenaires augmentés")
    
    # Detect aspect ratio
    aspect_ratio = "16:9"
    if "9:16" in prompt_lower or "vertical" in prompt_lower:
        aspect_ratio = "9:16"
    elif "1:1" in prompt_lower or "square" in prompt_lower:
        aspect_ratio = "1:1"
    
    # Detect duration
    duration_seconds = 30
    if video_type == "trailer":
        duration_seconds = 60
    elif video_type == "teaser":
        duration_seconds = 15
    elif video_type == "short_film":
        duration_seconds = 180
    
    # Generate project title
    project_title = f"{genre.title()} {time_period.title()}" if time_period != "unspecified" else f"{genre.title()} Project"
    
    return {
        "project_title": project_title,
        "genre": genre,
        "setting": time_period,
        "time_period": time_period,
        "location": location,
        "mood": mood,
        "tone": mood[0] if mood else "neutral",
        "video_type": video_type,
        "aspect_ratio": aspect_ratio,
        "duration_seconds": duration_seconds,
        "quality_tier": "preview",
        "key_elements": key_elements,
        "visual_references": [],
        "excluded_elements": [],
        "raw_prompt": prompt,
        "confidence": 0.7,
        "characters": []
    }


def generate_name_suggestions(parsed: Dict[str, Any], base_path: str = ".") -> List[Dict[str, Any]]:
    """Generate project name suggestions."""
    suggestions = []
    
    # Get existing projects
    existing_names = set()
    try:
        for entry in os.listdir(base_path):
            if os.path.isdir(entry) and not entry.startswith('.'):
                existing_names.add(entry.lower())
    except:
        pass
    
    # Generate base names
    base_names = []
    if parsed.get("project_title"):
        base_names.append(parsed["project_title"])
    
    genre = parsed.get("genre", "project")
    setting = parsed.get("setting", "")
    if setting and setting != "unspecified":
        base_names.append(f"{genre.title()} {setting}")
    
    if not base_names:
        base_names.append(f"{genre.title()} Project")
    
    # Remove duplicates and sanitize
    seen = set()
    for name in base_names:
        clean_name = name.replace(" ", "-").replace("/", "")
        if clean_name.lower() not in seen:
            seen.add(clean_name.lower())
            
            # Check for duplicates
            version = 1
            full_name = clean_name
            while full_name.lower() in existing_names:
                version += 1
                full_name = f"{clean_name} V{version}"
            
            suggestions.append({
                "suggested_name": clean_name,
                "version": version if version > 1 else None,
                "full_name": full_name,
                "is_duplicate": version > 1,
                "project_path": os.path.join(base_path, full_name)
            })
    
    return suggestions


def generate_sequence_plan(parsed: Dict[str, Any], target_duration: int = 60, aspect_ratio: str = "16:9") -> Dict[str, Any]:
    """Generate sequence plan from parsed prompt."""
    shots_per_minute = 3
    total_shots = max(3, (target_duration // 60) * shots_per_minute)
    
    shots = []
    avg_duration = target_duration / total_shots
    current_time = 0
    
    shot_types = ["ELS", "LS", "MCU", "CU", "LS", "MCU"]
    
    for i in range(total_shots):
        shot_type = shot_types[i % len(shot_types)]
        
        # Determine shot type details
        shot_descriptions = {
            "ELS": {"name": "Extreme Long Shot", "purpose": "establish_environment"},
            "LS": {"name": "Long Shot", "purpose": "establish_scene"},
            "MCU": {"name": "Medium Close-Up", "purpose": "character_interaction"},
            "CU": {"name": "Close-Up", "purpose": "emotion_detail"}
        }
        
        shot_info = shot_descriptions.get(shot_type, shot_descriptions["MCU"])
        
        # Build prompt
        prompt_parts = [shot_info["name"].lower()]
        if parsed.get("genre"):
            prompt_parts.append(parsed["genre"])
        if parsed.get("setting"):
            prompt_parts.append(parsed["setting"])
        if parsed.get("mood"):
            prompt_parts.append(parsed["mood"][0])
        prompt_parts.append("cinematic, 8k, highly detailed")
        
        shots.append({
            "shot_id": f"shot_{(i+1):03d}",
            "sequence_number": i + 1,
            "shot_number": i + 1,
            "start_time": round(current_time, 1),
            "end_time": round(current_time + avg_duration, 1),
            "duration": round(avg_duration, 1),
            "shot_type": shot_type,
            "shot_type_name": shot_info["name"],
            "purpose": shot_info["purpose"],
            "camera": {
                "angle": "eye-level",
                "movement": "static" if shot_type in ["CU", "ECU"] else "dolly-in",
                "lens": "wide" if shot_type in ["ELS", "LS"] else "normal"
            },
            "first_image_prompt": ", ".join(prompt_parts),
            "negative_prompt": "low quality, blurry, distorted, ugly, bad anatomy",
            "transition_in": "fade" if i == 0 else "cut",
            "transition_out": "fade" if i == total_shots - 1 else "cut",
            "mood": parsed.get("mood", ["neutral"])[0] if parsed.get("mood") else "neutral",
            "intensity": "high" if i > total_shots * 0.7 else "medium" if i > total_shots * 0.3 else "low"
        })
        
        current_time += avg_duration
    
    # Calculate distributions
    shot_distribution = {}
    for shot in shots:
        shot_type = shot["shot_type"]
        shot_distribution[shot_type] = shot_distribution.get(shot_type, 0) + 1
    
    return {
        "plan_id": f"seq_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        "project_title": parsed.get("project_title", "Untitled"),
        "created_at": datetime.utcnow().isoformat() + "Z",
        "aspect_ratio": aspect_ratio,
        "total_duration": target_duration,
        "total_shots": total_shots,
        "sequences": shots,
        "shot_type_distribution": shot_distribution,
        "music_mood": f"{parsed.get('mood', ['neutral'])[0]} and atmospheric" if parsed.get('mood') else "neutral atmospheric",
        "overall_mood": parsed.get("mood", ["neutral"])[0] if parsed.get("mood") else "neutral"
    }


def generate_music_description(params: Dict[str, Any]) -> Dict[str, Any]:
    """Generate music and sound description."""
    genre = params.get("genre", "cinematic")
    mood = params.get("mood", [])
    video_type = params.get("video_type", "trailer")
    duration = params.get("target_duration", 60)
    
    # Determine tempo
    if "epic" in mood or "exciting" in mood or video_type == "trailer":
        bpm = 130 + (hash(str(datetime.now())) % 20)
        tempo_label = "fast"
    elif "tense" in mood or "dark" in mood:
        bpm = 80 + (hash(str(datetime.now())) % 20)
        tempo_label = "medium"
    else:
        bpm = 90 + (hash(str(datetime.now())) % 20)
        tempo_label = "medium"
    
    # Determine instruments based on genre
    if genre == "cyberpunk":
        instruments = [
            {"name": "Synth Bass", "category": "electronic", "role": "bass"},
            {"name": "Analog Synth", "category": "electronic", "role": "pad"},
            {"name": "Drum Machine", "category": "percussion", "role": "rhythm"}
        ]
    elif genre == "fantasy":
        instruments = [
            {"name": "Orchestral Strings", "category": "strings", "role": "lead"},
            {"name": "Brass Section", "category": "brass", "role": "lead"},
            {"name": "Choir", "category": "vocals", "role": "pad"}
        ]
    else:
        instruments = [
            {"name": "Piano", "category": "other", "role": "lead"},
            {"name": "Strings", "category": "strings", "role": "pad"},
            {"name": "Soft Brass", "category": "brass", "role": "pad"}
        ]
    
    # Generate intensity curve
    intensity_curve = [
        {"time": 0, "value": 20, "label": "Opening"},
        {"time": duration * 0.3, "value": 50, "label": "Development"},
        {"time": duration * 0.6, "value": 70, "label": "Building"},
        {"time": duration * 0.85, "value": 90, "label": "Climax"},
        {"time": duration, "value": 40, "label": "End"}
    ]
    
    return {
        "track_id": f"audio_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        "track_name": f"{mood[0].title() if mood else 'Cinematic'} Score",
        "mood": mood[0] if mood else "neutral",
        "genre": "Cinematic Score",
        "tempo": {"bpm": bpm, "label": tempo_label},
        "instruments": instruments,
        "key": "C minor",
        "time_signature": "4/4",
        "structure": {
            "sections": [
                {"name": "Intro", "type": "intro", "bars": 8, "intensity": 30},
                {"name": "Verse", "type": "verse", "bars": 16, "intensity": 50},
                {"name": "Build", "type": "build", "bars": 8, "intensity": 75},
                {"name": "Climax", "type": "climax", "bars": 16, "intensity": 100},
                {"name": "Outro", "type": "outro", "bars": 8, "intensity": 40}
            ]
        },
        "intensity_curve": intensity_curve,
        "sound_design_elements": [
            {"name": "Ambient Sound", "category": "ambience", "timing": "continuous"}
        ],
        "atmosphere": f"{mood[0].title() if mood else 'Cinematic'} Atmosphere" if mood else "Cinematic Atmosphere",
        "total_duration": duration,
        "intro_duration": 8,
        "outro_duration": 5,
        "usage_notes": [
            "Use intro for establishing shots",
            "Build sections ideal for action sequences",
            "Climax section perfect for dramatic peaks"
        ]
    }


# API Endpoints

@llm_router.post("/parse-prompt", response_model=ParsePromptResponse)
async def parse_prompt(request: ParsePromptRequest):
    """Parse a creative prompt and extract structured project data."""
    try:
        parsed = parse_prompt_rule_based(request.prompt)
        return {
            "success": True,
            "parsed": parsed,
            "confidence": parsed["confidence"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@llm_router.post("/suggest-project-name", response_model=GenerateNameResponse)
async def suggest_project_name(request: GenerateNameRequest):
    """Generate project name suggestions based on prompt data."""
    try:
        parsed = {
            "project_title": request.project_title,
            "genre": request.genre,
            "setting": request.setting,
            "key_elements": request.key_elements or []
        }
        suggestions = generate_name_suggestions(parsed)
        return {
            "success": True,
            "suggestions": suggestions
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@llm_router.get("/check-project-name/{name}")
async def check_project_name(name: str):
    """Check if a project name already exists."""
    base_path = "."
    exists = False
    try:
        for entry in os.listdir(base_path):
            if os.path.isdir(entry) and entry.lower() == name.lower():
                exists = True
                break
    except:
        pass
    
    # Calculate next version
    version = 1
    while True:
        test_name = f"{name} V{version}" if version > 1 else name
        test_path = os.path.join(base_path, test_name)
        if not os.path.exists(test_path):
            break
        version += 1
    
    return {
        "name": name,
        "exists": exists,
        "next_version": version if exists else 1
    }


@llm_router.post("/generate-sequences", response_model=SequencePlanResponse)
async def generate_sequences(request: SequencePlanRequest):
    """Generate shot sequence plan with timing and image prompts."""
    try:
        plan = generate_sequence_plan(
            request.parsed,
            request.target_duration or 60,
            request.aspect_ratio or "16:9"
        )
        return {
            "success": True,
            "plan": plan
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@llm_router.post("/generate-music-sound")
async def generate_music_sound(request: MusicSoundRequest):
    """Generate music and sound design description for a project."""
    try:
        music = generate_music_description({
            "genre": request.genre,
            "mood": request.mood,
            "video_type": request.video_type,
            "target_duration": request.target_duration or 60,
            "setting": request.setting,
            "time_period": request.time_period
        })
        
        mixing_guide = {
            "music_volume_curve": ["Fade in", "Sustain", "Build", "Peak", "Fade out"],
            "dialogue_duck_level": -6,
            "sfx_priority": ["Impact sounds", "Dialogue", "Music", "Ambience"]
        }
        
        return {
            "success": True,
            "music_description": music,
            "mixing_guide": mixing_guide
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@llm_router.post("/create-project-from-prompt", response_model=CreateProjectResponse)
async def create_project_from_prompt(request: CreateProjectRequest):
    """Create a complete project from a creative prompt."""
    try:
        # Step 1: Parse the prompt
        parsed = parse_prompt_rule_based(request.prompt)
        
        # Step 2: Determine project name
        project_name = request.project_name or parsed["project_title"]
        
        # Check for existing project
        base_path = "."
        existing = False
        for entry in os.listdir(base_path):
            if os.path.isdir(entry) and entry.lower() == project_name.lower():
                existing = True
                break
        
        if existing:
            version = 2
            while os.path.exists(os.path.join(base_path, f"{project_name} V{version}")):
                version += 1
            project_name = f"{project_name} V{version}"
        
        # Step 3: Create project directory
        project_path = os.path.join(base_path, project_name)
        os.makedirs(project_path, exist_ok=True)
        os.makedirs(os.path.join(project_path, "assets"), exist_ok=True)
        os.makedirs(os.path.join(project_path, "assets", "images"), exist_ok=True)
        os.makedirs(os.path.join(project_path, "assets", "audio"), exist_ok=True)
        
        # Step 4: Generate requested components
        world_config = None
        characters = None
        sequences = None
        music = None
        
        if request.generate_world:
            world_config = {
                "world_id": f"world_{project_name.lower().replace(' ', '_')}",
                "name": project_name,
                "genre": parsed["genre"],
                "setting": parsed["setting"],
                "time_period": parsed["time_period"],
                "location": parsed["location"]
            }
        
        if request.generate_characters:
            characters = []
        
        if request.generate_sequences:
            sequences = generate_sequence_plan(parsed, parsed["duration_seconds"], parsed["aspect_ratio"])
        
        if request.generate_music:
            music = generate_music_description({
                "genre": parsed["genre"],
                "mood": parsed["mood"],
                "video_type": parsed["video_type"],
                "target_duration": parsed["duration_seconds"]
            })
        
        # Save project.json
        project_data = {
            "project_id": f"storycore_{project_name.lower().replace(' ', '_')}",
            "created_at": datetime.utcnow().isoformat() + "Z",
            "genre": parsed["genre"],
            "setting": parsed["setting"],
            "duration_seconds": parsed["duration_seconds"],
            "aspect_ratio": parsed["aspect_ratio"],
            "mood": parsed["mood"]
        }
        
        with open(os.path.join(project_path, "project.json"), "w") as f:
            json.dump(project_data, f, indent=2)
        
        return {
            "success": True,
            "project_path": project_path,
            "project_name": project_name,
            "parsed_prompt": parsed,
            "world_config": world_config,
            "characters": characters,
            "story": None,
            "dialogues": None,
            "sequences": sequences,
            "music": music,
            "message": f"Project '{project_name}' created successfully at {project_path}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@llm_router.post("/preview-project-creation")
async def preview_project_creation(request: ParsePromptRequest):
    """Preview what will be created without actually creating it."""
    try:
        parsed = parse_prompt_rule_based(request.prompt)
        suggestions = generate_name_suggestions(parsed)
        
        preview = {
            "project_name": suggestions[0]["full_name"] if suggestions else parsed["project_title"],
            "genre": parsed["genre"],
            "video_type": parsed["video_type"],
            "duration": f"{parsed['duration_seconds']} seconds",
            "aspect_ratio": parsed["aspect_ratio"],
            "mood": ", ".join(parsed["mood"]) if parsed["mood"] else "neutral",
            "characters_detected": len(parsed["characters"]),
            "key_elements": parsed["key_elements"][:5],
            "estimated_shots": max(3, parsed["duration_seconds"] // 3),
            "confirmation_message": f"Voulez-vous créer le projet '{suggestions[0]['full_name'] if suggestions else parsed['project_title']}' avec ces paramètres?"
        }
        
        return {
            "success": True,
            "preview": preview,
            "parsed": parsed
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@llm_router.get("/aspect-ratios")
async def get_aspect_ratios():
    """Get list of available aspect ratios."""
    return {
        "aspect_ratios": [
            {"value": "16:9", "label": "Cinematic (16:9)", "description": "Standard widescreen for films and trailers"},
            {"value": "9:16", "label": "Vertical (9:16)", "description": "TikTok, Reels, Shorts"},
            {"value": "1:1", "label": "Square (1:1)", "description": "Instagram posts"},
            {"value": "4:3", "label": "Classic (4:3)", "description": "Standard TV aspect ratio"},
            {"value": "21:9", "label": "Ultrawide (21:9)", "description": "Cinematic widescreen"}
        ]
    }


@llm_router.get("/video-types")
async def get_video_types():
    """Get list of available video types."""
    return {
        "video_types": [
            {"value": "trailer", "label": "Trailer", "default_duration": 60, "description": "Movie/series trailer"},
            {"value": "teaser", "label": "Teaser", "default_duration": 15, "description": "Short teaser clip"},
            {"value": "short_film", "label": "Short Film", "default_duration": 180, "description": "Narrative short film"},
            {"value": "music_video", "label": "Music Video", "default_duration": 180, "description": "Music video"},
            {"value": "commercial", "label": "Commercial", "default_duration": 30, "description": "Advertisement"},
            {"value": "documentary", "label": "Documentary", "default_duration": 300, "description": "Documentary segment"}
        ]
    }

