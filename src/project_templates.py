"""
Project Templates for StoryCore LLM Assistant
Dynamic templates based on parsed prompt with aspect ratio/duration configuration
"""

import json
import os
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict


# Aspect ratio configurations
ASPECT_RATIOS = {
    "16:9": {
        "name": "Cinematic Widescreen",
        "width": 1920,
        "height": 1080,
        "description": "Standard for films, trailers, and YouTube",
        "use_cases": ["trailer", "short_film", "music_video"]
    },
    "9:16": {
        "name": "Vertical / Mobile",
        "width": 1080,
        "height": 1920,
        "description": "TikTok, Reels, Shorts, Stories",
        "use_cases": ["teaser", "short_form"]
    },
    "1:1": {
        "name": "Square",
        "width": 1080,
        "height": 1080,
        "description": "Instagram posts, LinkedIn",
        "use_cases": ["teaser", "promo"]
    },
    "4:3": {
        "name": "Classic TV",
        "width": 1440,
        "height": 1080,
        "description": "Nostalgic or documentary style",
        "use_cases": ["documentary", "vintage"]
    },
    "21:9": {
        "name": "Ultrawide Cinema",
        "width": 2560,
        "height": 1080,
        "description": "Cinematic ultrawide format",
        "use_cases": ["trailer", "cinematic"]
    }
}

# Video type configurations
VIDEO_TYPES = {
    "trailer": {
        "name": "Trailer",
        "default_duration": 60,
        "min_duration": 30,
        "max_duration": 180,
        "shots_per_minute": 3,
        "structure": "trailer"
    },
    "teaser": {
        "name": "Teaser",
        "default_duration": 15,
        "min_duration": 10,
        "max_duration": 30,
        "shots_per_minute": 4,
        "structure": "trailer"
    },
    "short_film": {
        "name": "Short Film",
        "default_duration": 180,
        "min_duration": 60,
        "max_duration": 600,
        "shots_per_minute": 2,
        "structure": "three_act"
    },
    "music_video": {
        "name": "Music Video",
        "default_duration": 180,
        "min_duration": 120,
        "max_duration": 300,
        "shots_per_minute": 3,
        "structure": "sequence"
    },
    "commercial": {
        "name": "Commercial",
        "default_duration": 30,
        "min_duration": 15,
        "max_duration": 60,
        "shots_per_minute": 4,
        "structure": "trailer"
    },
    "documentary": {
        "name": "Documentary",
        "default_duration": 300,
        "min_duration": 60,
        "max_duration": 1800,
        "shots_per_minute": 1,
        "structure": "three_act"
    }
}

# Quality tiers
QUALITY_TIERS = {
    "draft": {
        "name": "Draft",
        "steps": 20,
        "cfg_scale": 7,
        "resolution_scale": 0.5,
        "description": "Quick preview, lower quality"
    },
    "preview": {
        "name": "Preview",
        "steps": 30,
        "cfg_scale": 8,
        "resolution_scale": 0.75,
        "description": "Good balance of quality and speed"
    },
    "final": {
        "name": "Final",
        "steps": 50,
        "cfg_scale": 10,
        "resolution_scale": 1.0,
        "description": "Highest quality render"
    }
}

# Genre color palettes
GENRE_PALETTES = {
    "cyberpunk": {
        "primary": "#00ff9d",
        "secondary": "#ff00ff",
        "accent": "#00bfff",
        "background": "#1a1a2e",
        "text": "#ffffff"
    },
    "fantasy": {
        "primary": "#ffd700",
        "secondary": "#8b4513",
        "accent": "#4b0082",
        "background": "#228b22",
        "text": "#ffffff"
    },
    "horror": {
        "primary": "#8b0000",
        "secondary": "#2f4f4f",
        "accent": "#000000",
        "background": "#1c1c1c",
        "text": "#e0e0e0"
    },
    "action": {
        "primary": "#ff4500",
        "secondary": "#ffd700",
        "accent": "#1e90ff",
        "background": "#2c3e50",
        "text": "#ffffff"
    },
    "drama": {
        "primary": "#3498db",
        "secondary": "#95a5a6",
        "accent": "#e74c3c",
        "background": "#ecf0f1",
        "text": "#2c3e50"
    },
    "sci_fi": {
        "primary": "#00bfff",
        "secondary": "#c0c0c0",
        "accent": "#1a1a2e",
        "background": "#0a0a1a",
        "text": "#e0e0e0"
    }
}


@dataclass
class ProjectTemplate:
    """Project template configuration"""
    template_id: str
    name: str
    description: str
    genre: str
    video_type: str
    aspect_ratio: str
    target_duration: int
    quality_tier: str
    resolution: Dict[str, int]
    shots_per_minute: int
    color_palette: Dict[str, str]
    scene_structure: List[Dict[str, Any]]
    created_at: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def save(self, output_path: str) -> bool:
        """Save template to JSON file"""
        try:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(self.to_dict(), f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"Error saving template: {e}")
            return False


class ProjectTemplateGenerator:
    """Generates dynamic project templates based on parsed prompts"""

    def __init__(self):
        self.aspect_ratios = ASPECT_RATIOS
        self.video_types = VIDEO_TYPES
        self.quality_tiers = QUALITY_TIERS
        self.genre_palettes = GENRE_PALETTES

    def generate_template(
        self,
        project_name: str,
        parsed_prompt: Dict[str, Any],
        aspect_ratio: str = "16:9",
        quality_tier: str = "preview",
        custom_duration: Optional[int] = None
    ) -> ProjectTemplate:
        """Generate a complete project template from parsed prompt"""
        
        # Determine video type from parsed prompt
        video_type = parsed_prompt.get("video_type", "trailer")
        genre = parsed_prompt.get("genre", "drama")
        
        # Get video type configuration
        video_config = self.video_types.get(video_type, self.video_types["trailer"])
        
        # Determine duration
        target_duration = custom_duration or video_config["default_duration"]
        target_duration = max(video_config["min_duration"], 
                             min(video_config["max_duration"], target_duration))
        
        # Get aspect ratio configuration
        ar_config = self.aspect_ratios.get(aspect_ratio, self.aspect_ratios["16:9"])
        
        # Get quality tier configuration
        quality_config = self.quality_tiers.get(quality_tier, self.quality_tiers["preview"])
        
        # Get color palette
        color_palette = self.genre_palettes.get(genre, self.genre_palettes["drama"])
        
        # Generate scene structure
        scene_structure = self._generate_scene_structure(
            video_type, target_duration, genre, parsed_prompt
        )
        
        # Create template ID
        template_id = f"template_{project_name.lower().replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        return ProjectTemplate(
            template_id=template_id,
            name=project_name,
            description=f"{video_config['name']} template for {genre} project",
            genre=genre,
            video_type=video_type,
            aspect_ratio=aspect_ratio,
            target_duration=target_duration,
            quality_tier=quality_tier,
            resolution={"width": ar_config["width"], "height": ar_config["height"]},
            shots_per_minute=video_config["shots_per_minute"],
            color_palette=color_palette,
            scene_structure=scene_structure,
            created_at=datetime.now().isoformat() + "Z"
        )

    def _generate_scene_structure(
        self,
        video_type: str,
        duration: int,
        genre: str,
        parsed_prompt: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate scene structure based on video type and duration"""
        
        structures = {
            "trailer": self._generate_trailer_structure,
            "short_film": self._generate_three_act_structure,
            "music_video": self._generate_sequence_structure,
            "teaser": self._generate_trailer_structure,
            "documentary": self._generate_three_act_structure,
            "commercial": self._generate_trailer_structure
        }
        
        generator = structures.get(video_type, self._generate_trailer_structure)
        return generator(duration, genre, parsed_prompt)

    def _generate_trailer_structure(
        self,
        duration: int,
        genre: str,
        parsed_prompt: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate trailer-style scene structure"""
        scenes = []
        scene_count = max(5, int(duration / 10))
        
        scene_templates = [
            {"name": "Opening Hook", "percentage": 10, "mood": "dramatic"},
            {"name": "World Introduction", "percentage": 20, "mood": "establishing"},
            {"name": "Character Setup", "percentage": 20, "mood": "character_focus"},
            {"name": "Conflict Reveal", "percentage": 20, "mood": "tense"},
            {"name": "Escalation", "percentage": 15, "mood": "intense"},
            {"name": "Climax Tease", "percentage": 15, "mood": "epic"}
        ]
        
        for i, template in enumerate(scene_templates[:scene_count]):
            scenes.append({
                "scene_id": f"scene_{i+1}",
                "scene_number": i + 1,
                "name": template["name"],
                "start_time": round(sum(s["percentage"] for s in scene_templates[:i]) / 100 * duration),
                "duration": round(template["percentage"] / 100 * duration),
                "mood": template["mood"],
                "shots_estimate": max(2, round(template["percentage"] / 100 * duration / 3)),
                "key_elements": self._get_scene_key_elements(template["name"], genre),
                "visual_direction": self._get_visual_direction(template["mood"], genre)
            })
        
        return scenes

    def _generate_three_act_structure(
        self,
        duration: int,
        genre: str,
        parsed_prompt: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate three-act structure"""
        scenes = []
        
        acts = [
            {"name": "Act 1 - Setup", "percentage": 25, "mood": "establishing", "key_beats": ["Opening", "Inciting Incident"]},
            {"name": "Act 2 - Confrontation", "percentage": 50, "mood": "developing", "key_beats": ["Rising Action", "Midpoint", "Crisis"]},
            {"name": "Act 3 - Resolution", "percentage": 25, "mood": "resolving", "key_beats": ["Climax", "Denouement"]}
        ]
        
        for i, act in enumerate(acts):
            scenes.append({
                "scene_id": f"act_{i+1}",
                "scene_number": i + 1,
                "name": act["name"],
                "start_time": round(sum(a["percentage"] for a in acts[:i]) / 100 * duration),
                "duration": round(act["percentage"] / 100 * duration),
                "mood": act["mood"],
                "shots_estimate": max(3, round(act["percentage"] / 100 * duration / 2)),
                "key_elements": act["key_beats"],
                "visual_direction": self._get_visual_direction(act["mood"], genre)
            })
        
        return scenes

    def _generate_sequence_structure(
        self,
        duration: int,
        genre: str,
        parsed_prompt: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate sequence-style structure for music videos"""
        scenes = []
        sequence_count = 5
        
        for i in range(sequence_count):
            intensity = i / (sequence_count - 1)
            scenes.append({
                "scene_id": f"sequence_{i+1}",
                "scene_number": i + 1,
                "name": f"Sequence {i+1}",
                "start_time": round(i * duration / sequence_count),
                "duration": round(duration / sequence_count),
                "mood": "building" if intensity < 0.7 else "climax",
                "shots_estimate": max(2, round(duration / sequence_count / 4)),
                "key_elements": [f"Beat {i+1}", "Visual buildup"],
                "visual_direction": self._get_visual_direction("building" if intensity < 0.7 else "climax", genre)
            })
        
        return scenes

    def _get_scene_key_elements(self, scene_name: str, genre: str) -> List[str]:
        """Get key elements for a scene based on genre"""
        genre_elements = {
            "cyberpunk": ["Neon lights", "Technology", "Urban decay", "Cybernetic elements"],
            "fantasy": ["Magic", "Ancient artifacts", "Mystical creatures", "Epic landscapes"],
            "horror": ["Shadows", "Isolation", "Unknown threats", "Tension"],
            "action": ["Explosions", "Chase sequences", "Combat", "Stunts"],
            "drama": ["Character moments", "Dialogue", "Emotional beats", "Relationships"],
            "sci_fi": ["Technology", "Space", "Alien elements", "Future settings"]
        }
        
        elements = genre_elements.get(genre, genre_elements["drama"])
        return elements[:2]

    def _get_visual_direction(self, mood: str, genre: str) -> str:
        """Get visual direction based on mood and genre"""
        directions = {
            ("dramatic", "cyberpunk"): "Low-key lighting, neon accents, rapid cuts",
            ("establishing", "fantasy"): "Wide shots, magical lighting, epic scale",
            ("tense", "horror"): "Close-ups, shadows, slow camera movement",
            ("intense", "action"): "Dynamic camera, quick cuts, explosive visuals",
            ("building", "drama"): "Natural lighting, character focus, steady camera"
        }
        
        return directions.get((mood, genre), f"{mood.capitalize()} visuals appropriate for {genre}")

    def get_available_aspect_ratios(self) -> List[Dict[str, Any]]:
        """Get list of available aspect ratios"""
        return [
            {"value": k, **v} for k, v in self.aspect_ratios.items()
        ]

    def get_available_video_types(self) -> List[Dict[str, Any]]:
        """Get list of available video types"""
        return [
            {"value": k, **v} for k, v in self.video_types.items()
        ]

    def get_available_quality_tiers(self) -> List[Dict[str, Any]]:
        """Get list of available quality tiers"""
        return [
            {"value": k, **v} for k, v in self.quality_tiers.items()
        ]

    def calculate_total_shots(
        self,
        duration: int,
        video_type: str,
        custom_rate: Optional[int] = None
    ) -> int:
        """Calculate total estimated shots for a project"""
        video_config = self.video_types.get(video_type, self.video_types["trailer"])
        rate = custom_rate or video_config["shots_per_minute"]
        return max(3, int(duration / 60 * rate))

    def estimate_file_size(
        self,
        duration: int,
        resolution: Dict[str, int],
        quality_tier: str
    ) -> str:
        """Estimate output file size based on parameters"""
        quality_config = self.quality_tiers.get(quality_tier, self.quality_tiers["preview"])
        
        # Base calculation (rough estimate)
        pixels = resolution["width"] * resolution["height"]
        seconds_per_frame = quality_config["steps"] * 0.05  # Rough estimate
        base_size_mb = (pixels / 1000000) * (duration / 30) * quality_config["steps"] / 20
        
        if base_size_mb < 1:
            return f"{base_size_mb * 1024:.0f} KB"
        elif base_size_mb < 1024:
            return f"{base_size_mb:.1f} MB"
        else:
            return f"{base_size_mb / 1024:.1f} GB"


def create_default_template(
    project_name: str,
    output_dir: str = "."
) -> tuple[ProjectTemplate, str]:
    """Create a default project template and save it"""
    
    generator = ProjectTemplateGenerator()
    
    # Default parsed prompt
    default_prompt = {
        "project_title": project_name,
        "genre": "drama",
        "video_type": "trailer",
        "mood": ["neutral"],
        "setting": "unspecified",
        "time_period": "present"
    }
    
    template = generator.generate_template(
        project_name=project_name,
        parsed_prompt=default_prompt,
        aspect_ratio="16:9",
        quality_tier="preview"
    )
    
    # Save template
    template_path = os.path.join(output_dir, f"{project_name.replace(' ', '_')}_template.json")
    template.save(template_path)
    
    return template, template_path


# Convenience function
def generate_project_template(
    project_name: str,
    genre: str = "drama",
    video_type: str = "trailer",
    aspect_ratio: str = "16:9",
    duration: int = 60,
    quality_tier: str = "preview",
    output_dir: str = "."
) -> tuple[ProjectTemplate, str]:
    """Generate a project template with specified parameters"""
    
    generator = ProjectTemplateGenerator()
    
    parsed_prompt = {
        "project_title": project_name,
        "genre": genre,
        "video_type": video_type,
        "mood": ["neutral"],
        "setting": "unspecified",
        "time_period": "present"
    }
    
    template = generator.generate_template(
        project_name=project_name,
        parsed_prompt=parsed_prompt,
        aspect_ratio=aspect_ratio,
        quality_tier=quality_tier,
        custom_duration=duration
    )
    
    # Save template
    safe_name = project_name.lower().replace(" ", "_")
    template_path = os.path.join(output_dir, f"{safe_name}_template.json")
    template.save(template_path)
    
    return template, template_path
