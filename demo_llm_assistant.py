"""
StoryCore LLM Assistant - Demo Script
Test the complete project creation workflow
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.project_templates import ProjectTemplateGenerator, generate_project_template
from src.project_pipeline_manager import ProjectPipelineManager, PipelineStep


def demo_template_generation():
    """Demo: Generate a project template"""
    print("\n" + "="*50)
    print("DEMO 1: Project Template Generation")
    print("="*50)
    
    # Sample parsed prompt (simulating LLM parsing)
    parsed_prompt = {
        "project_title": "Blanche-Neige 2048",
        "genre": "cyberpunk",
        "video_type": "trailer",
        "mood": ["dark", "tense", "intense"],
        "setting": "megalopole neon",
        "timePeriod": "2048",
        "aspectRatio": "16:9",
        "durationSeconds": 60,
        "keyElements": ["IA corrompue", "drones de surveillance", "mercenaires augmentes"]
    }
    
    # Generate template
    generator = ProjectTemplateGenerator()
    template = generator.generate_template(
        project_name="Blanche-Neige 2048",
        parsed_prompt=parsed_prompt,
        aspect_ratio="16:9",
        quality_tier="preview"
    )
    
    print(f"\nTemplate Created: {template.name}")
    print(f"Genre: {template.genre}")
    print(f"Video Type: {template.video_type}")
    print(f"Duration: {template.target_duration}s")
    print(f"Resolution: {template.resolution['width']}x{template.resolution['height']}")
    print(f"Color Palette: {template.color_palette}")
    print(f"Total Scenes: {len(template.scene_structure)}")
    
    # Calculate estimates
    total_shots = generator.calculate_total_shots(60, "trailer")
    print(f"\nEstimated Total Shots: {total_shots}")
    
    estimated_size = generator.estimate_file_size(60, template.resolution, "preview")
    print(f"Estimated File Size: {estimated_size}")
    
    return template


def demo_pipeline():
    """Demo: Show pipeline structure"""
    print("\n" + "="*50)
    print("DEMO 2: Pipeline Structure")
    print("="*50)
    
    manager = ProjectPipelineManager()
    
    print("\nPipeline Steps:")
    for i, step in enumerate(manager.steps, 1):
        status = manager.step_results[step].status.value
        print(f"  {i:2d}. {step.value:25s} [{status}]")
    
    return manager


def demo_available_options():
    """Demo: Show available options"""
    print("\n" + "="*50)
    print("DEMO 3: Available Options")
    print("="*50)
    
    generator = ProjectTemplateGenerator()
    
    print("\nAspect Ratios:")
    for ar in generator.get_available_aspect_ratios():
        print(f"  - {ar['value']}: {ar['name']} ({ar['width']}x{ar['height']})")
    
    print("\nVideo Types:")
    for vt in generator.get_available_video_types():
        print(f"  - {vt['value']}: {vt['name']} ({vt['default_duration']}s)")
    
    print("\nQuality Tiers:")
    for qt in generator.get_available_quality_tiers():
        print(f"  - {qt['value']}: {qt['name']} ({qt['steps']} steps)")


def simulate_blanche_neige_2048():
    """Simulate the Blanche-Neige 2048 example"""
    print("\n" + "="*50)
    print("DEMO 4: Blanche-Neige 2048 - Simulation Complete")
    print("="*50)
    
    print("\n User Prompt:")
    print("   'Cree une bande-annonce intense et cinematique pour une")
    print("    reinterpretation cyberpunk de Blanche-Neige, situes en 2048.'")
    
    # Step 1: Parse
    print("\n1. PARSE PROMPT ->")
    parsed = {
        "project_title": "Blanche-Neige 2048",
        "genre": "cyberpunk",
        "video_type": "trailer",
        "mood": ["dark", "tense", "intense", "nervous"],
        "setting": "megalopole neon",
        "timePeriod": "2048",
        "location": "megalopole",
        "characters": [
            {"name": "Blanche-Neige", "role": "hackeuse recherchee"},
            {"name": "Reine IA", "role": "IA corrompue"},
            {"name": "Mercenaires", "role": "7 mercenaires augmentes"}
        ],
        "keyElements": [
            "megalopole neon",
            "IA corrompue en reine",
            "Blanche-Neige hackeuse",
            "sept mercenaires augmentes",
            "drones de surveillance"
        ],
        "style": ["cinematic", "hollywoodien", "crescendo"],
        "aspectRatio": "16:9",
        "durationSeconds": 60,
        "raw_prompt": "Cree une bande-annonce intense..."
    }
    print(f"   Genre: {parsed['genre']}")
    print(f"   Mood: {', '.join(parsed['mood'])}")
    print(f"   Key Elements: {len(parsed['keyElements'])} detected")
    
    # Step 2: Generate Name
    print("\n2. GENERATE NAME ->")
    print("   Suggested: 'Blanche-Neige 2048'")
    print("   Check: No duplicate found")
    print("   Version: 1")
    
    # Step 3: User Confirmation
    print("\n3. CONFIRMATION")
    print("   Assistant: 'Voulez-vous creer le projet \"Blanche-Neige 2048\" ?'")
    print("   User: 'Oui'")
    
    # Step 4: Generate Components
    print("\n4. GENERATE COMPONENTS")
    
    generator = ProjectTemplateGenerator()
    template = generator.generate_template(
        project_name="Blanche-Neige 2048",
        parsed_prompt=parsed,
        aspect_ratio="16:9",
        quality_tier="preview"
    )
    
    print(f"   World Config: Cyberpunk neon city")
    print(f"   Characters: {len(parsed['characters'])} generated")
    print(f"   Story: 3-act structure")
    print(f"   Sequences: {len(template.scene_structure)} scenes")
    print(f"   Music: Dark tense score")
    
    # Step 5: Create Project
    print("\n5. CREATE PROJECT")
    project_path = "./Blanche-Neige_2048"
    print(f"   Path: {project_path}")
    print("   Created directories:")
    print(f"   |-- {project_path}/")
    print(f"   |-- {project_path}/assets/")
    print(f"   |-- {project_path}/project.json")
    print(f"   |-- {project_path}/project_template.json")
    print(f"   |-- {project_path}/world_config.json")
    print(f"   |-- {project_path}/characters.json")
    print(f"   |-- {project_path}/story_structure.json")
    print(f"   |-- {project_path}/sequence_plan.json")
    print(f"   -- {project_path}/music_description.json")
    
    print("\n Project 'Blanche-Neige 2048' created successfully!")


def main():
    """Main demo function"""
    print("\n" + "="*50)
    print(" StoryCore LLM Assistant - Demo")
    print("="*50)
    
    # Run demos
    demo_template_generation()
    demo_pipeline()
    demo_available_options()
    simulate_blanche_neige_2048()
    
    print("\n" + "="*50)
    print(" Demo Complete!")
    print("="*50)


if __name__ == "__main__":
    main()

