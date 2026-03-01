#!/usr/bin/env python3
"""
StoryCore-Engine Demo Script

Simple demonstration of the story to scenario transformation pipeline.

Usage:
    python demo_story_transformer.py
"""

import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.story_transformer import transform_story_to_scenario
from backend.project_builder import build_project_from_scenario


def print_header(title):
    """Print formatted header"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def print_section(title):
    """Print formatted section"""
    print(f"\n--- {title} ---\n")


def demo_simple_transformation():
    """Demo: Simple story transformation"""
    print_header("DEMO: Simple Story Transformation")
    
    sample_story = """
    Marie is a brilliant scientist who discovers a dangerous secret in her laboratory.
    Her mentor, Professor Dubois, has been hiding the truth from her.
    The antagonist, Mr. Noir, wants to use the discovery for world domination.
    In the secret research facility, Marie must make a choice: reveal the truth or protect humanity.
    She finds an old document that reveals everything about the conspiracy.
    With the help of her loyal colleague Jean, she prepares to expose the truth.
    The final confrontation happens in the main laboratory at midnight.
    Marie successfully exposes the conspiracy and saves the world.
    """
    
    print("Input Story:")
    print(sample_story.strip())
    
    # Transform story to scenario
    scenario = transform_story_to_scenario(sample_story, "The Discovery")
    
    print_section("Meta Information")
    meta = scenario.meta
    print(f"Titre: {meta['titre']}")
    print(f"Pitch: {meta['pitch']}")
    print(f"Theme: {meta['theme']}")
    print(f"Ton: {meta['ton']}")
    
    print_section("Characters Found")
    for char in scenario.personnages:
        print(f"  - {char['nom']} ({char['role']})")
    
    print_section("Locations Found")
    for loc in scenario.lieux:
        print(f"  - {loc['nom']} ({loc['type']})")
    
    print_section("Objects Found")
    for obj in scenario.objets:
        print(f"  - {obj['nom']} ({obj['type']})")
    
    print_section("Narrative Structure")
    structure = scenario.structure
    print(f"Acte 1: {structure['acte_1']['titre']}")
    print(f"Acte 2: {structure['acte_2']['titre']}")
    print(f"Acte 3: {structure['acte_3']['titre']}")
    
    print_section("Sequences")
    for seq in scenario.sequences:
        print(f"  {seq['id']}. {seq['titre']}")
    
    print_section("Statistics")
    print(f"  Total Characters: {len(scenario.personnages)}")
    print(f"  Total Locations: {len(scenario.lieux)}")
    print(f"  Total Objects: {len(scenario.objets)}")
    print(f"  Total Sequences: {len(scenario.sequences)}")
    print(f"  Total Scenes: {len(scenario.scenes)}")
    
    return scenario


def demo_project_creation(scenario):
    """Demo: Create project files from scenario"""
    print_header("DEMO: Project Creation")
    
    print("Creating project structure...")
    manifest = build_project_from_scenario(scenario)
    
    print_section("Project Manifest")
    print(f"Project ID: {manifest['id']}")
    print(f"Title: {manifest['titre']}")
    
    print_section("Project Stats")
    stats = manifest['stats']
    for key, value in stats.items():
        print(f"  {key}: {value}")
    
    print_section("Project Structure")
    paths = manifest['paths']
    for key, path in paths.items():
        print(f"  {key}: {path}")
    
    print_section("Files Created")
    project_path = f"projects/{manifest['id']}"
    for root, dirs, files in os.walk(project_path):
        level = root.replace(project_path, '').count(os.sep)
        indent = ' ' * 2 * level
        print(f'{indent}{os.path.basename(root)}/')
        subindent = ' ' * 2 * (level + 1)
        for file in files:
            print(f'{subindent}{file}')
    
    return manifest


def demo_json_output(scenario):
    """Demo: Show JSON output"""
    print_header("DEMO: JSON Output Preview")
    
    json_output = scenario.to_json()
    
    # Show first 2000 characters
    print(json_output[:2000])
    if len(json_output) > 2000:
        print(f"\n... [{len(json_output) - 2000} more characters]")


def main():
    """Main demo function"""
    print_header("StoryCore-Engine Story Transformer Demo")
    print("This demo shows how to transform a raw story into a structured cinematic scenario.")
    
    # Demo 1: Simple transformation
    scenario = demo_simple_transformation()
    
    # Demo 2: Project creation
    manifest = demo_project_creation(scenario)
    
    # Demo 3: JSON output
    demo_json_output(scenario)
    
    print_header("Demo Complete!")
    print(f"\nProject created at: projects/{manifest['id']}/")
    print("You can now:")
    print("  1. View the scenario.json file")
    print("  2. Check character, location, and object assets")
    print("  3. Use the API endpoints to integrate with your frontend")


if __name__ == "__main__":
    main()

