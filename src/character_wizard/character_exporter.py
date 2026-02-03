"""
Character Export Functionality

This module handles exporting character data in various formats:
- JSON (standard and pretty-printed)
- YAML (with custom formatting)
- Markdown (character sheets)
- LLM-ready prompts
- ComfyUI-compatible prompts

Author: StoryCore-Engine Team
Version: 1.0.0
"""

import json
import logging
from dataclasses import asdict
from datetime import datetime
from typing import Any, Dict, List, Optional, TextIO

import yaml

try:
    from yaml import CDumper as Dumper
except ImportError:
    from yaml import Dumper

logger = logging.getLogger(__name__)


class CharacterExporter:
    """
    Export characters in various formats.
    
    Supported formats:
    - JSON: Standard data interchange format
    - YAML: Human-readable configuration format
    - Markdown: Character sheet documentation
    - LLM Prompt: Text optimized for language models
    - ComfyUI Prompt: Image generation prompts
    """
    
    def __init__(self):
        """Initialize the character exporter."""
        pass
    
    # =========================================================================
    # JSON Export
    # =========================================================================
    
    def export_to_json(
        self,
        character: Dict[str, Any],
        output: TextIO,
        pretty: bool = True
    ) -> int:
        """
        Export character to JSON format.
        
        Args:
            character: Character data dictionary
            output: File-like object to write to
            pretty: Use pretty-printing (indentation)
            
        Returns:
            Number of bytes written
        """
        try:
            if pretty:
                json.dump(
                    character,
                    output,
                    indent=2,
                    ensure_ascii=False,
                    default=str
                )
            else:
                json.dump(
                    character,
                    output,
                    ensure_ascii=False,
                    default=str
                )
            output.write("\n")
            return output.tell()
        except Exception as e:
            logger.error(f"JSON export failed: {e}")
            raise
    
    def export_to_json_file(
        self,
        character: Dict[str, Any],
        filepath: str,
        pretty: bool = True
    ) -> bool:
        """
        Export character to a JSON file.
        
        Args:
            character: Character data dictionary
            filepath: Output file path
            pretty: Use pretty-printing
            
        Returns:
            True if successful
        """
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                self.export_to_json(character, f, pretty)
            logger.info(f"Exported character to {filepath}")
            return True
        except Exception as e:
            logger.error(f"Failed to export to {filepath}: {e}")
            return False
    
    def export_multiple_to_json(
        self,
        characters: List[Dict[str, Any]],
        output: TextIO,
        pretty: bool = True
    ) -> int:
        """
        Export multiple characters to a JSON array.
        
        Args:
            characters: List of character data dictionaries
            output: File-like object to write to
            pretty: Use pretty-printing
            
        Returns:
            Number of bytes written
        """
        data = {
            "characters": characters,
            "exported_at": datetime.now().isoformat(),
            "total": len(characters)
        }
        return self.export_to_json(data, output, pretty)
    
    # =========================================================================
    # YAML Export
    # =========================================================================
    
    def export_to_yaml(
        self,
        character: Dict[str, Any],
        output: TextIO,
        include_metadata: bool = True
    ) -> int:
        """
        Export character to YAML format.
        
        Args:
            character: Character data dictionary
            output: File-like object to write to
            include_metadata: Include export metadata
            
        Returns:
            Number of bytes written
        """
        try:
            if include_metadata:
                data = {
                    "_metadata": {
                        "exported_at": datetime.now().isoformat(),
                        "version": "1.0.0"
                    },
                    "character": character
                }
            else:
                data = character
            
            yaml.dump(
                data,
                output,
                Dumper=Dumper,
                allow_unicode=True,
                default_flow_style=False,
                sort_keys=False
            )
            return output.tell()
        except Exception as e:
            logger.error(f"YAML export failed: {e}")
            raise
    
    def export_to_yaml_file(
        self,
        character: Dict[str, Any],
        filepath: str,
        include_metadata: bool = True
    ) -> bool:
        """
        Export character to a YAML file.
        
        Args:
            character: Character data dictionary
            filepath: Output file path
            include_metadata: Include export metadata
            
        Returns:
            True if successful
        """
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                self.export_to_yaml(character, f, include_metadata)
            logger.info(f"Exported character to {filepath}")
            return True
        except Exception as e:
            logger.error(f"Failed to export to {filepath}: {e}")
            return False
    
    # =========================================================================
    # Markdown Export
    # =========================================================================
    
    def export_to_markdown(
        self,
        character: Dict[str, Any],
        output: TextIO,
        include_sections: Optional[List[str]] = None
    ) -> int:
        """
        Export character to Markdown format (character sheet).
        
        Args:
            character: Character data dictionary
            output: File-like object to write to
            include_sections: Optional list of sections to include
            
        Returns:
            Number of bytes written
        """
        if include_sections is None:
            include_sections = [
                "identity", "personality", "appearance",
                "backstory", "relationships", "notes"
            ]
        
        lines = []
        
        # Header
        name = character.get("name", "Unnamed Character")
        archetype = character.get("archetype", "Unknown")
        lines.append(f"# {name}")
        lines.append(f"**Archetype:** {archetype}")
        lines.append("")
        lines.append(f"*Exported: {datetime.now().strftime('%Y-%m-%d %H:%M')}*")
        lines.append("")
        lines.append("---")
        lines.append("")
        
        # Identity section
        if "identity" in include_sections:
            lines.append("## Identity")
            lines.append("")
            identity = character.get("identity", {})
            if identity:
                lines.append(f"- **Name:** {identity.get('name', name)}")
                lines.append(f"- **Role:** {identity.get('role', 'Unknown')}")
                lines.append(f"- **Archetype:** {identity.get('archetype', archetype)}")
                if identity.get("age"):
                    lines.append(f"- **Age:** {identity['age']}")
                if identity.get("occupation"):
                    lines.append(f"- **Occupation:** {identity['occupation']}")
            lines.append("")
        
        # Personality section
        if "personality" in include_sections:
            lines.append("## Personality")
            lines.append("")
            personality = character.get("personality", {})
            if personality:
                # Big Five traits
                traits = personality.get("big_five", {})
                if traits:
                    lines.append("### Big Five Traits")
                    lines.append("")
                    lines.append("| Trait | Score |")
                    lines.append("|-------|-------|")
                    for trait, value in traits.items():
                        bar = "█" * int(value * 10) + "░" * (10 - int(value * 10))
                        lines.append(f"| {trait.title()} | {bar} ({value:.2f}) |")
                    lines.append("")
                
                # Primary traits
                primary = personality.get("primary_traits", [])
                if primary:
                    lines.append("### Traits")
                    lines.append(", ".join(f"**{t}**" for t in primary))
                    lines.append("")
                
                # Strengths and flaws
                strengths = personality.get("strengths", [])
                flaws = personality.get("flaws", [])
                if strengths:
                    lines.append("### Strengths")
                    for s in strengths:
                        lines.append(f"- {s}")
                    lines.append("")
                if flaws:
                    lines.append("### Flaws")
                    for f in flaws:
                        lines.append(f"- {f}")
                    lines.append("")
                
                # Goals
                external = personality.get("external_goal", "")
                internal = personality.get("internal_need", "")
                if external or internal:
                    lines.append("### Goals")
                    if external:
                        lines.append(f"**External:** {external}")
                    if internal:
                        lines.append(f"**Internal:** {internal}")
                    lines.append("")
            lines.append("")
        
        # Appearance section
        if "appearance" in include_sections:
            lines.append("## Appearance")
            lines.append("")
            appearance = character.get("appearance", {})
            if appearance:
                lines.append(f"- **Style:** {appearance.get('clothing_style', 'Not specified')}")
                lines.append(f"- **Colors:** {', '.join(appearance.get('clothing_colors', [])) or 'Not specified'}")
                
                accessories = appearance.get("accessories", [])
                if accessories:
                    lines.append(f"- **Accessories:** {', '.join(accessories)}")
                
                grooming = appearance.get("grooming_notes", [])
                if grooming:
                    lines.append("### Grooming Notes")
                    for g in grooming[:3]:
                        lines.append(f"- {g}")
            lines.append("")
        
        # Backstory section
        if "backstory" in include_sections:
            lines.append("## Backstory")
            lines.append("")
            backstory = character.get("backstory", {})
            if backstory:
                origin = backstory.get("origin", "")
                if origin:
                    lines.append(f"**Origin:** {origin}")
                    lines.append("")
                
                key_events = backstory.get("key_events", [])
                if key_events:
                    lines.append("### Key Events")
                    for event in key_events[:5]:
                        lines.append(f"- {event}")
                    lines.append("")
                
                skills = backstory.get("skills", [])
                if skills:
                    lines.append("### Skills")
                    lines.append(", ".join(skills))
                    lines.append("")
            else:
                backstory_text = character.get("backstory_text", "")
                if backstory_text:
                    lines.append(backstory_text[:500])
                    lines.append("")
        
        # Relationships section
        if "relationships" in include_sections:
            lines.append("## Relationships")
            lines.append("")
            relationships = character.get("relationships", [])
            if relationships:
                for rel in relationships[:10]:
                    char = rel.get("character_name", "Unknown")
                    rel_type = rel.get("relationship_type", "Unknown")
                    strength = rel.get("strength", 0)
                    status = rel.get("status", "neutral")
                    lines.append(f"- **{char}** ({rel_type}) - {status} [{'★' * int(strength * 5)}]")
                lines.append("")
            else:
                lines.append("No recorded relationships.")
                lines.append("")
        
        # Notes section
        if "notes" in include_sections:
            lines.append("## Notes")
            lines.append("")
            notes = character.get("notes", "")
            if notes:
                lines.append(notes)
            else:
                lines.append("_No additional notes._")
            lines.append("")
        
        # Write output
        output.write("\n".join(lines))
        return output.tell()
    
    def export_to_markdown_file(
        self,
        character: Dict[str, Any],
        filepath: str,
        include_sections: Optional[List[str]] = None
    ) -> bool:
        """
        Export character to a Markdown file.
        
        Args:
            character: Character data dictionary
            filepath: Output file path
            include_sections: Sections to include
            
        Returns:
            True if successful
        """
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                self.export_to_markdown(character, f, include_sections)
            logger.info(f"Exported character to {filepath}")
            return True
        except Exception as e:
            logger.error(f"Failed to export to {filepath}: {e}")
            return False
    
    # =========================================================================
    # LLM Prompt Export
    # =========================================================================
    
    def export_to_llm_prompt(
        self,
        character: Dict[str, Any],
        output: TextIO,
        prompt_type: str = "summary"
    ) -> int:
        """
        Export character data formatted for LLM consumption.
        
        Args:
            character: Character data dictionary
            output: File-like object to write to
            prompt_type: Type of prompt (summary, roleplay, dialogue)
            
        Returns:
            Number of bytes written
        """
        lines = []
        
        name = character.get("name", "Unnamed Character")
        archetype = character.get("archetype", "Unknown")
        
        if prompt_type == "summary":
            lines.append(f"# Character Profile: {name}")
            lines.append(f"**Archetype:** {archetype}")
            lines.append("")
            lines.append("## Personality Summary")
            
            personality = character.get("personality", {})
            traits = personality.get("big_five", {})
            if traits:
                trait_lines = []
                for trait, value in traits.items():
                    level = "high" if value > 0.6 else "low" if value < 0.4 else "moderate"
                    trait_lines.append(f"- {trait.title()}: {level} ({value:.2f})")
                lines.append("\n".join(trait_lines))
            
            lines.append("")
            lines.append("## Key Traits")
            primary = personality.get("primary_traits", [])
            if primary:
                lines.append(", ".join(primary))
            
            lines.append("")
            lines.append("## Motivation")
            goal = personality.get("external_goal", "Unknown")
            need = personality.get("internal_need", "Unknown")
            lines.append(f"Goal: {goal}")
            lines.append(f"Need: {need}")
            
            lines.append("")
            lines.append("## Behavior Guidelines")
            stress = personality.get("stress_response", "")
            conflict = personality.get("conflict_style", "")
            if stress:
                lines.append(f"Stress response: {stress}")
            if conflict:
                lines.append(f"Conflict style: {conflict}")
        
        elif prompt_type == "roleplay":
            lines.append(f"You are {name}, a {archetype} character.")
            lines.append("")
            
            personality = character.get("personality", {})
            traits = personality.get("primary_traits", [])
            if traits:
                lines.append(f"Your key traits are: {', '.join(traits)}.")
            
            strengths = personality.get("strengths", [])
            if strengths:
                lines.append(f"You are known for your {', '.join(strengths[:2])}.")
            
            flaws = personality.get("flaws", [])
            if flaws:
                lines.append(f"However, you struggle with {', '.join(flaws[:2])}.")
            
            lines.append("")
            lines.append("## Speaking Style")
            traits = personality.get("big_five", {})
            if traits.get("extraversion", 0.5) > 0.6:
                lines.append("You are talkative and outgoing.")
            elif traits.get("extraversion", 0.5) < 0.4:
                lines.append("You are quiet and reserved.")
            
            lines.append("")
            lines.append("## Response Guidelines")
            lines.append("- Stay in character as described above")
            lines.append("- Respond naturally based on your personality")
            lines.append("- Consider your goals and needs when making decisions")
        
        elif prompt_type == "dialogue":
            lines.append(f"# Dialogue Context for {name}")
            lines.append("")
            
            identity = character.get("identity", {})
            lines.append(f"**Name:** {name}")
            lines.append(f"**Role:** {identity.get('role', 'Unknown')}")
            lines.append("")
            
            personality = character.get("personality", {})
            traits = personality.get("primary_traits", [])
            if traits:
                lines.append(f"**Personality:** {', '.join(traits)}")
            
            goals = personality.get("external_goal", "")
            if goals:
                lines.append(f"**Current Goal:** {goals}")
            
            lines.append("")
            lines.append("## Speaking Patterns")
            traits = personality.get("big_five", {})
            if traits:
                if traits.get("conscientiousness", 0.5) > 0.6:
                    lines.append("- Speaks clearly and organized")
                if traits.get("agreeableness", 0.5) > 0.6:
                    lines.append("- Warm and cooperative tone")
                if traits.get("neuroticism", 0.5) > 0.6:
                    lines.append("- May show emotional reactivity")
        
        else:
            lines.append(f"# Character: {name}")
            lines.append(f"Archetype: {archetype}")
            lines.append("")
            lines.append(json.dumps(character, indent=2, default=str))
        
        output.write("\n".join(lines))
        return output.tell()
    
    def export_to_llm_prompt_file(
        self,
        character: Dict[str, Any],
        filepath: str,
        prompt_type: str = "summary"
    ) -> bool:
        """
        Export character to an LLM prompt file.
        
        Args:
            character: Character data dictionary
            filepath: Output file path
            prompt_type: Type of prompt
            
        Returns:
            True if successful
        """
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                self.export_to_llm_prompt(character, f, prompt_type)
            logger.info(f"Exported LLM prompt to {filepath}")
            return True
        except Exception as e:
            logger.error(f"Failed to export to {filepath}: {e}")
            return False
    
    # =========================================================================
    # ComfyUI Prompt Export
    # =========================================================================
    
    def export_to_comfyui_prompt(
        self,
        character: Dict[str, Any],
        output: TextIO,
        style_preset: str = "realistic"
    ) -> int:
        """
        Export character data formatted for ComfyUI image generation.
        
        Args:
            character: Character data dictionary
            output: File-like object to write to
            style_preset: Visual style (realistic, anime, fantasy, etc.)
            
        Returns:
            Number of bytes written
        """
        lines = []
        
        name = character.get("name", "Unknown")
        archetype = character.get("archetype", "Unknown")
        
        # Build prompt components
        prompt_parts = []
        
        # Subject description
        subject_parts = [f"character, {archetype}"]
        
        # Appearance from character data
        appearance = character.get("appearance", {})
        if appearance:
            clothing = appearance.get("clothing_style", "")
            colors = appearance.get("clothing_colors", [])
            
            if clothing:
                subject_parts.append(f"wearing {clothing} clothes")
            if colors:
                color_str = ", ".join(colors[:3])
                subject_parts.append(f"wearing {color_str} colors")
            
            accessories = appearance.get("accessories", [])
            if accessories:
                subject_parts.append(f"with {', '.join(accessories[:3])}")
        
        # Personality traits affecting appearance
        personality = character.get("personality", {})
        traits = personality.get("primary_traits", [])
        
        # Map traits to visual descriptors
        trait_visuals = {
            "confident": "confident posture, regal bearing",
            "shy": "introverted pose, looking away",
            "aggressive": "confrontational stance",
            "friendly": "approachable expression, warm smile",
            "mysterious": "enigmatic expression, hooded eyes",
            "elegant": "graceful pose, refined posture",
        }
        
        for trait in traits:
            trait_lower = trait.lower()
            for key, visual in trait_visuals.items():
                if key in trait_lower:
                    subject_parts.append(visual)
                    break
        
        # Construct the main prompt
        main_prompt = ", ".join(subject_parts)
        prompt_parts.append(main_prompt)
        
        # Add quality tags
        quality_tags = [
            "masterpiece",
            "best quality",
            "highly detailed",
            "sharp focus",
            "professional"
        ]
        prompt_parts.extend(quality_tags)
        
        # Style-specific additions
        style_additions = {
            "realistic": ["photorealistic", "photo realistic", "8k uhd"],
            "anime": ["anime style", "anime artwork", "cel shaded"],
            "fantasy": ["fantasy character", "magical", "epic"],
            "sci-fi": ["sci-fi character", "futuristic", "cyberpunk"],
            "portrait": ["portrait", "head and shoulders", "close-up"],
        }
        
        if style_preset in style_additions:
            prompt_parts.extend(style_additions[style_preset])
        
        # Negative prompt (what to avoid)
        negative_parts = [
            "low quality",
            "worst quality",
            "blurry",
            "ugly",
            "deformed",
            "bad anatomy",
            "extra limbs",
            "fused fingers",
            "too many fingers",
            "cropped",
            "jpeg artifacts"
        ]
        
        # Build JSON structure for ComfyUI
        comfyui_prompt = {
            "name": name,
            "archetype": archetype,
            "prompt": ", ".join(prompt_parts),
            "negative_prompt": ", ".join(negative_parts),
            "style_preset": style_preset,
            "generated_at": datetime.now().isoformat()
        }
        
        lines.append("# ComfyUI Prompt for Character Image Generation")
        lines.append(f"# Character: {name}")
        lines.append(f"# Archetype: {archetype}")
        lines.append("")
        lines.append("## Positive Prompt")
        lines.append("```")
        lines.append(", ".join(prompt_parts))
        lines.append("```")
        lines.append("")
        lines.append("## Negative Prompt")
        lines.append("```")
        lines.append(", ".join(negative_parts))
        lines.append("```")
        lines.append("")
        lines.append("## Style Settings")
        lines.append(f"- Preset: {style_preset}")
        lines.append("")
        lines.append("## Raw JSON")
        lines.append("```json")
        lines.append(json.dumps(comfyui_prompt, indent=2))
        lines.append("```")
        
        output.write("\n".join(lines))
        return output.tell()
    
    def export_to_comfyui_prompt_file(
        self,
        character: Dict[str, Any],
        filepath: str,
        style_preset: str = "realistic"
    ) -> bool:
        """
        Export character to a ComfyUI prompt file.
        
        Args:
            character: Character data dictionary
            filepath: Output file path
            style_preset: Visual style
            
        Returns:
            True if successful
        """
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                self.export_to_comfyui_prompt(character, f, style_preset)
            logger.info(f"Exported ComfyUI prompt to {filepath}")
            return True
        except Exception as e:
            logger.error(f"Failed to export to {filepath}: {e}")
            return False
    
    def generate_comfyui_workflow(
        self,
        character: Dict[str, Any],
        style_preset: str = "realistic"
    ) -> Dict[str, Any]:
        """
        Generate a complete ComfyUI workflow structure.
        
        Args:
            character: Character data dictionary
            style_preset: Visual style preset
            
        Returns:
            ComfyUI workflow dictionary
        """
        name = character.get("name", "Unknown")
        
        # This creates a basic workflow structure
        workflow = {
            "name": f"Character Portrait - {name}",
            "nodes": [
                {
                    "id": 1,
                    "type": "CheckpointLoader",
                    "inputs": {
                        "ckpt_name": f"{style_preset}_character_model.safetensors"
                    }
                },
                {
                    "id": 2,
                    "type": "CLIPTextEncode",
                    "inputs": {
                        "text": self._build_comfyui_prompt(character, style_preset),
                        "clip": ["CLIP", 0]
                    }
                },
                {
                    "id": 3,
                    "type": "CLIPTextEncode",
                    "inputs": {
                        "text": "low quality, worst quality, blurry, ugly",
                        "clip": ["CLIP", 0]
                    }
                },
                {
                    "id": 4,
                    "type": "KSampler",
                    "inputs": {
                        "seed": 42,
                        "steps": 20,
                        "cfg": 7.0,
                        "sampler_name": "euler_a",
                        "scheduler": "normal",
                        "positive": ["CLIPTextEncode", 2],
                        "negative": ["CLIPTextEncode", 3],
                        "model": ["CheckpointLoader", 1]
                    }
                }
            ]
        }
        
        return workflow
    
    def _build_comfyui_prompt(
        self,
        character: Dict[str, Any],
        style_preset: str
    ) -> str:
        """Build a ComfyUI prompt string from character data."""
        parts = ["character"]
        
        archetype = character.get("archetype", "Unknown")
        parts.append(archetype)
        
        appearance = character.get("appearance", {})
        if appearance:
            clothing = appearance.get("clothing_style", "")
            if clothing:
                parts.append(f"wearing {clothing}")
            colors = appearance.get("clothing_colors", [])
            if colors:
                parts.append(f"with {', '.join(colors[:2])} outfit")
        
        # Add quality
        parts.extend(["masterpiece", "best quality", "highly detailed"])
        
        return ", ".join(parts)


# =============================================================================
# Convenience Functions
# =============================================================================

def export_character(
    character: Dict[str, Any],
    filepath: str,
    format: str = "json"
) -> bool:
    """
    Convenience function to export a character.
    
    Args:
        character: Character data dictionary
        filepath: Output file path
        format: Export format (json, yaml, md, llm, comfyui)
        
    Returns:
        True if successful
    """
    exporter = CharacterExporter()
    
    if format == "json":
        return exporter.export_to_json_file(character, filepath)
    elif format == "yaml":
        return exporter.export_to_yaml_file(character, filepath)
    elif format == "md":
        return exporter.export_to_markdown_file(character, filepath)
    elif format == "llm":
        return exporter.export_to_llm_prompt_file(character, filepath)
    elif format == "comfyui":
        return exporter.export_to_comfyui_prompt_file(character, filepath)
    else:
        logger.error(f"Unknown format: {format}")
        return False


def export_character_summary(
    character: Dict[str, Any],
    output: TextIO
) -> int:
    """
    Quick export to a human-readable summary.
    
    Args:
        character: Character data dictionary
        output: Output stream
        
    Returns:
        Bytes written
    """
    exporter = CharacterExporter()
    return exporter.export_to_markdown(character, output)
