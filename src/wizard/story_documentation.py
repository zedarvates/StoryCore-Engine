"""
Story Documentation Generator for Professional Story Creation

This module generates the complete set of story documentation files:
- 00_master_outline.md
- 01_plot_core.md
- 02_lore_worldbuilding.md
- 03_conspiracy_hidden_truth.md
- 04_character_bibles/*.md (per character)
- 05_timelines.md
- 06_style_guide.md

These files create a professional story bible that enables smaller AI models
to generate consistent, high-quality content.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from pathlib import Path
import json
from datetime import datetime


@dataclass
class CharacterProfile:
    """Character profile for Character Bible"""
    name: str
    full_name: str = ""
    age: str = ""
    origins: str = ""
    biography: str = ""
    visible_goals: str = ""
    hidden_goals: str = ""
    strengths: List[str] = field(default_factory=list)
    weaknesses: List[str] = field(default_factory=list)
    emotional_arc: str = ""
    important_relations: str = ""
    personal_secrets: str = ""
    detailed_arc: str = ""


@dataclass
class TimelineEvent:
    """Timeline event for chronological tracking"""
    date: str
    event: str
    importance: str  # "major", "minor", "key_revelation"
    chapter关联: str = ""


@dataclass
class StoryDocumentation:
    """Complete story documentation container"""
    # Master Outline (00_master_outline.md)
    project_title: str = ""
    general_pitch: str = ""
    major_themes: List[str] = field(default_factory=list)
    tone_and_ambiance: str = ""
    global_structure: str = ""  # "3_act" or "5_act"
    narrative_arcs: str = ""
    emotional_objectives: str = ""
    general_constraints: str = ""
    
    # Plot Core (01_plot_core.md)
    protagonist_goal: str = ""
    antagonist_goal: str = ""
    central_conflict: str = ""
    major_obstacles: List[str] = field(default_factory=list)
    turning_points: List[str] = field(default_factory=list)
    climax: str = ""
    planned_resolution: str = ""
    mandatory_elements: List[str] = field(default_factory=list)
    
    # Lore & Worldbuilding (02_lore_worldbuilding.md)
    world_geography: str = ""
    ancient_history: str = ""
    political_systems: str = ""
    cultures_traditions: str = ""
    technology_magic: str = ""
    economy: str = ""
    flora_fauna: str = ""
    fundamental_rules: str = ""
    unique_elements: str = ""
    
    # Hidden Truth (03_conspiracy_hidden_truth.md)
    major_secrets: List[str] = field(default_factory=list)
    faction_hidden_motivations: str = ""
    initial_lies: List[str] = field(default_factory=list)
    hidden_events: List[str] = field(default_factory=list)
    planned_revelations: List[str] = field(default_factory=list)
    narrative_twists: List[str] = field(default_factory=list)
    secret_character_links: str = ""
    final_truths: str = ""
    
    # Characters (04_character_bibles/)
    characters: List[CharacterProfile] = field(default_factory=list)
    
    # Timeline (05_timelines.md)
    world_timeline: List[TimelineEvent] = field(default_factory=list)
    novel_timeline: List[TimelineEvent] = field(default_factory=list)
    chapter_order: List[str] = field(default_factory=list)
    parallel_events: List[str] = field(default_factory=list)
    key_dates: List[str] = field(default_factory=list)
    
    # Style Guide (06_style_guide.md)
    narrative_style: str = ""
    pacing: str = ""
    vocabulary: str = ""
    description_level: str = ""
    stylistic_inspirations: str = ""
    constraints: str = ""
    style_rules: str = ""
    tone_examples: str = ""


class StoryDocumentationGenerator:
    """
    Generates professional story documentation from wizard state and generated story
    """
    
    def __init__(self):
        """Initialize the documentation generator"""
        self.doc = StoryDocumentation()
    
    def generate_from_wizard_state(self, wizard_state) -> StoryDocumentation:
        """
        Generate complete story documentation from wizard state
        
        Args:
            wizard_state: Wizard state with project information
            
        Returns:
            Complete StoryDocumentation object
        """
        # Extract basic info from wizard state - handle both dict-like and attribute access
        if hasattr(wizard_state, 'project_name'):
            self.doc.project_title = wizard_state.project_name or "Untitled Project"
        else:
            self.doc.project_title = wizard_state.get("project_name", "Untitled Project")
        
        if hasattr(wizard_state, 'story_content'):
            self.doc.general_pitch = wizard_state.story_content[:500] if wizard_state.story_content else ""
        else:
            self.doc.general_pitch = wizard_state.get("story_content", "")[:500]
        
        # If we have a generated story, use its data
        if hasattr(wizard_state, 'generated_story') and wizard_state.generated_story:
            story = wizard_state.generated_story
            self.doc.major_themes = [story.theme] if hasattr(story, 'theme') and story.theme else []
            self.doc.tone_and_ambiance = story.tone if hasattr(story, 'tone') else ""
            self.doc.central_conflict = story.conflict if hasattr(story, 'conflict') else ""
            self.doc.stakes = story.stakes if hasattr(story, 'stakes') else ""
            self.doc.planned_resolution = story.resolution if hasattr(story, 'resolution') else ""
            
            # Extract act structure
            if hasattr(story, 'acts') and story.acts:
                self.doc.global_structure = "3_act"
                self.doc.narrative_arcs = self._generate_arcs_from_acts(story.acts)
                
                # Extract turning points from acts
                for act in story.acts:
                    if hasattr(act, 'beats') and act.beats:
                        for beat in act.beats:
                            if hasattr(beat, 'name') and beat.emotional_intensity >= 7:
                                self.doc.turning_points.append(beat.name)
        
        # Generate default values for missing fields
        self._generate_defaults()
        
        return self.doc
    
    def _generate_defaults(self):
        """Generate default values for unfilled fields"""
        if not self.doc.major_themes:
            self.doc.major_themes = ["To be defined"]
        
        if not self.doc.global_structure:
            self.doc.global_structure = "3_act"
        
        if not self.doc.emotional_objectives:
            self.doc.emotional_objectives = "Create an engaging emotional journey for the reader"
        
        if not self.doc.general_constraints:
            self.doc.general_constraints = "Genre: General | Style: Professional | No explicit content"
        
        # Default plot elements
        if not self.doc.protagonist_goal:
            self.doc.protagonist_goal = "To be defined during story development"
        
        if not self.doc.antagonist_goal:
            self.doc.antagonist_goal = "To be defined during story development"
        
        if not self.doc.climax:
            self.doc.climax = "Major confrontation that resolves the central conflict"
        
        # Default worldbuilding
        if not self.doc.fundamental_rules:
            self.doc.fundamental_rules = "Rules of the world to be established"
        
        if not self.doc.narrative_style:
            self.doc.narrative_style = "Third-person narrative, immersive and descriptive"
        
        if not self.doc.pacing:
            self.doc.pacing = "Dynamic, varies between action and reflection"
    
    def _generate_arcs_from_acts(self, acts) -> str:
        """Generate narrative arcs description from acts"""
        arcs = []
        for i, act in enumerate(acts, 1):
            arc = f"Act {i} ({act.title}): {act.description}"
            arcs.append(arc)
        return "\n".join(arcs)
    
    def add_character(self, character: CharacterProfile):
        """Add a character to the documentation"""
        self.doc.characters.append(character)
    
    def add_timeline_event(self, event: TimelineEvent, is_world: bool = False):
        """Add a timeline event"""
        if is_world:
            self.doc.world_timeline.append(event)
        else:
            self.doc.novel_timeline.append(event)
    
    def add_chapter(self, chapter_name: str):
        """Add a chapter to the order"""
        self.doc.chapter_order.append(chapter_name)
    
    def generate_all_files(self, output_dir: Path) -> Dict[str, str]:
        """
        Generate all story documentation files
        
        Args:
            output_dir: Directory where story files will be created
            
        Returns:
            Dictionary mapping file names to their contents
        """
        files = {}
        
        # Create story directory
        story_dir = output_dir / "story"
        story_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate documentation files
        files["00_master_outline.md"] = self._generate_master_outline()
        files["01_plot_core.md"] = self._generate_plot_core()
        files["02_lore_worldbuilding.md"] = self._generate_lore_worldbuilding()
        files["03_conspiracy_hidden_truth.md"] = self._generate_hidden_truth()
        files["05_timelines.md"] = self._generate_timelines()
        files["06_style_guide.md"] = self._generate_style_guide()
        
        # Generate character bibles
        char_dir = story_dir / "04_character_bibles"
        char_dir.mkdir(parents=True, exist_ok=True)
        
        for char in self.doc.characters:
            char_file = self._generate_character_bible(char)
            filename = f"04_character_bibles/{char.name.lower().replace(' ', '_')}.md"
            files[filename] = char_file
        
        # Generate story-chapter files
        files["story-index.md"] = self._generate_story_index()
        files["story-intro.md"] = self._generate_story_intro()
        for chapter_num in range(1, 6):
            files[f"story-chapter-0{chapter_num}.md"] = self._generate_story_chapter(chapter_num)
        files["story-ending.md"] = self._generate_story_ending()
        files["story-summary.md"] = self._generate_story_summary()
        
        # Generate scenario.md for film/video production
        files["scenario.md"] = self._generate_scenario()
        
        # Generate scenario.md for film/video production
        files["scenario.md"] = self._generate_scenario()
        
        # Write all files to the story directory
        for filename, content in files.items():
            # Determine the correct path - handle character bibles specially
            if filename.startswith("04_character_bibles/"):
                # Character files go to 04_character_bibles/ subdirectory
                char_filename = filename.replace("04_character_bibles/", "")
                file_path = char_dir / char_filename
            else:
                # Other files go directly to story directory
                file_path = story_dir / filename
            
            # Ensure parent directory exists
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
        
        return files
    
    def _generate_master_outline(self) -> str:
        """Generate 00_master_outline.md"""
        return f"""# 00_master_outline.md - Projet: {self.doc.project_title}

## Titre du projet
{self.doc.project_title}

## Pitch général
{self.doc.general_pitch}

## Thèmes majeurs
{', '.join(self.doc.major_themes)}

## Ton et ambiance
{self.doc.tone_and_ambiance}

## Structure globale
{self.doc.global_structure.upper()} ({"3 actes" if self.doc.global_structure == "3_act" else "5 actes"})

## Arcs narratifs principaux
{self.doc.narrative_arcs}

## Objectifs émotionnels du lecteur
{self.doc.emotional_objectives}

## Contraintes générales
{self.doc.general_constraints}

---
*Généré par StoryCore-Engine - {datetime.now().strftime('%Y-%m-%d %H:%M')}*
"""
    
    def _generate_plot_core(self) -> str:
        """Generate 01_plot_core.md"""
        obstacles = "\n".join([f"- {o}" for o in self.doc.major_obstacles]) if self.doc.major_obstacles else "- À définir"
        turning_points = "\n".join([f"- {t}" for t in self.doc.turning_points]) if self.doc.turning_points else "- À définir"
        mandatory = "\n".join([f"- {m}" for m in self.doc.mandatory_elements]) if self.doc.mandatory_elements else "- À définir"
        
        return f"""# 01_plot_core.md - Ligne narrative principale

## Objectif principal du protagoniste
{self.doc.protagonist_goal}

## Objectif de l'antagoniste
{self.doc.antagonist_goal}

## Conflit central
{self.doc.central_conflict}

## Obstacles majeurs
{obstacles}

## Points de bascule
{turning_points}

## Climax
{self.doc.climax}

## Résolution prévue
{self.doc.planned_resolution}

## Éléments obligatoires à intégrer dans le récit
{mandatory}

---
*Généré par StoryCore-Engine - {datetime.now().strftime('%Y-%m-%d %H:%M')}*
"""
    
    def _generate_lore_worldbuilding(self) -> str:
        """Generate 02_lore_worldbuilding.md"""
        return f"""# 02_lore_worldbuilding.md - Univers et worldbuilding

## Géographie du monde
{self.doc.world_geography}

## Histoire ancienne
{self.doc.ancient_history}

## Systèmes politiques
{self.doc.political_systems}

## Cultures et traditions
{self.doc.cultures_traditions}

## Technologies ou magie
{self.doc.technology_magic}

## Économie
{self.doc.economy}

## Faune et flore
{self.doc.flora_fauna}

## Règles fondamentales du monde
{self.doc.fundamental_rules}

## Éléments uniques à respecter
{self.doc.unique_elements}

---
*Généré par StoryCore-Engine - {datetime.now().strftime('%Y-%m-%d %H:%M')}*
"""
    
    def _generate_hidden_truth(self) -> str:
        """Generate 03_conspiracy_hidden_truth.md"""
        secrets = "\n".join([f"- {s}" for s in self.doc.major_secrets]) if self.doc.major_secrets else "- À définir"
        lies = "\n".join([f"- {l}" for l in self.doc.initial_lies]) if self.doc.initial_lies else "- À définir"
        events = "\n".join([f"- {e}" for e in self.doc.hidden_events]) if self.doc.hidden_events else "- À définir"
        revelations = "\n".join([f"- {r}" for r in self.doc.planned_revelations]) if self.doc.planned_revelations else "- À définir"
        twists = "\n".join([f"- {t}" for t in self.doc.narrative_twists]) if self.doc.narrative_twists else "- À définir"
        
        return f"""# 03_conspiracy_hidden_truth.md - Secrets et révélations

## Secrets majeurs du récit
{secrets}

## Motivations cachées des factions
{self.doc.faction_hidden_motivations}

## Mensonges initiaux
{lies}

## Événements dissimulés au lecteur
{events}

## Révélations prévues
{revelations}

## Twists narratifs
{twists}

## Liens secrets entre personnages
{self.doc.secret_character_links}

## Vérités finales
{self.doc.final_truths}

---
*Généré par StoryCore-Engine - {datetime.now().strftime('%Y-%m-%d %H:%M')}*
"""
    
    def _generate_character_bible(self, char: CharacterProfile) -> str:
        """Generate character bible file"""
        strengths = ", ".join(char.strengths) if char.strengths else "À définir"
        weaknesses = ", ".join(char.weaknesses) if char.weaknesses else "À définir"
        
        return f"""# 04_character_bibles/{char.name}.md - Fiche personnage

## Nom complet
{char.full_name or char.name}

## Âge
{char.age}

## Origines
{char.origins}

## Biographie condensée
{char.biography}

## Objectifs visibles
{char.visible_goals}

## Objectifs cachés
{char.hidden_goals}

## Forces et faiblesses
**Forces:** {strengths}
**Faiblesses:** {weaknesses}

## Évolution émotionnelle prévue
{char.emotional_arc}

## Relations importantes
{char.important_relations}

## Secrets personnels
{char.personal_secrets}

## Arc narratif détaillé
{char.detailed_arc}

---
*Généré par StoryCore-Engine - {datetime.now().strftime('%Y-%m-%d %H:%M')}*
"""
    
    def _generate_timelines(self) -> str:
        """Generate 05_timelines.md"""
        world_events = "\n".join([f"- **{e.date}**: {e.event} ({e.importance})" 
                                   for e in self.doc.world_timeline]) if self.doc.world_timeline else "- À définir"
        novel_events = "\n".join([f"- **{e.date}**: {e.event} ({e.importance})" 
                                  for e in self.doc.novel_timeline]) if self.doc.novel_timeline else "- À définir"
        chapters = "\n".join([f"- Chapitre {i+1}: {c}" for i, c in enumerate(self.doc.chapter_order)]) if self.doc.chapter_order else "- À définir"
        
        return f"""# 05_timelines.md - Chronologie

## Chronologie du monde
{world_events}

## Événements historiques majeurs
{world_events}

## Timeline du roman
{novel_events}

## Ordre des chapitres
{chapters}

## Événements parallèles
{chr(10).join([f"- {e}" for e in self.doc.parallel_events]) if self.doc.parallel_events else "- À définir"}

## Dates clés pour les révélations
{chr(10).join([f"- {d}" for d in self.doc.key_dates]) if self.doc.key_dates else "- À définir"}

## Cohérence temporelle à respecter
Les événements doivent suivre la chronologie établie. Tout flashback doit être clairement identifié.

---
*Généré par StoryCore-Engine - {datetime.now().strftime('%Y-%m-%d %H:%M')}*
"""
    
    def _generate_style_guide(self) -> str:
        """Generate 06_style_guide.md"""
        return f"""# 06_style_guide.md - Guide de style

## Style narratif attendu
{self.doc.narrative_style}

## Rythme du récit
{self.doc.pacing}

## Vocabulaire privilégié
{self.doc.vocabulary}

## Niveaux de description
{self.doc.description_level}

## Inspirations stylistiques
{self.doc.stylistic_inspirations}

## Contraintes
{self.doc.constraints}

## Règles de cohérence stylistique
{self.doc.style_rules}

## Exemples de ton correct
{self.doc.tone_examples}

---
*Généré par StoryCore-Engine - {datetime.now().strftime('%Y-%m-%d %H:%M')}*
"""
    
    def _generate_scenario(self) -> str:
        """
        Generate scenario.md - Cinema-format scenario for film/video production
        
        This file is used to create:
        - Storyboards
        - Shot lists (plans séquences)
        - Dialogue prompts
        """
        scenes = self._generate_scenario_scenes()
        
        return f"""# Scenario: {self.doc.project_title}

## Overview
This scenario document is designed for film/video production workflow.
It contains cinema-format scenes with INT./EXT. headers, dialogue, and shot lists.

## Production Notes
- **Total Scenes**: {len(scenes)}
- **Structure**: {self.doc.global_structure.upper()}
- **Tone**: {self.doc.tone_and_ambiance or "To be determined"}

---

{scenes}

---

## Production Summary

### Character List
{self._get_scenario_character_list()}

### Location List
{self._get_scenario_location_list()}

### Estimated Runtime
Based on {len(scenes)} scenes, estimated runtime: {self._estimate_runtime()}

---

*Généré par StoryCore-Engine - {datetime.now().strftime('%Y-%m-%d %H:%M')}*
*Format: Cinema Scenario (INT./EXT. with Shot Lists)*
"""
    
    def _generate_scenario_scenes(self) -> str:
        """Generate all scenario scenes"""
        # Determine number of scenes based on structure
        num_scenes = 7 if self.doc.global_structure == "3_act" else 10
        
        # If we have turning points, use them to influence scene count
        if self.doc.turning_points:
            num_scenes = max(num_scenes, len(self.doc.turning_points) + 4)
        
        scenes = []
        for i in range(1, num_scenes + 1):
            scene = self._generate_single_scenario_scene(i)
            scenes.append(scene)
        
        return "\n---\n\n".join(scenes)
    
    def _generate_single_scenario_scene(self, scene_num: int) -> str:
        """Generate a single cinema-format scene"""
        # Determine scene type (INT/EXT) and location
        scene_type, location, time_of_day = self._get_scene_header_info(scene_num)
        
        # Get characters for this scene
        characters = self._get_scene_characters(scene_num)
        
        # Generate action description
        action = self._get_scene_action(scene_num)
        
        # Generate dialogue
        dialogue = self._get_scene_dialogue(scene_num, characters)
        
        # Generate shot list
        shot_list = self._get_scene_shot_list(scene_num)
        
        # Determine transition
        transition = self._get_scene_transition(scene_num)
        
        return f"""## Scene {scene_num}
### {scene_type}. {location} - {time_of_day}

**Characters:** {characters}

**Action:**
{action}

**Dialogue:**
{dialogue}

**Shot List:**
{shot_list}

**Transition:** {transition}"""
    
    def _get_scene_header_info(self, scene_num: int) -> tuple:
        """Get scene header information (type, location, time)"""
        # Default locations based on scene number
        locations = [
            ("INT", "HEADQUARTERS - MAIN HALL", "DAY"),
            ("EXT", "CITY STREETS", "DAY"),
            ("INT", "CHARACTER'S HOME", "NIGHT"),
            ("EXT", "WILDERNESS", "DAWN"),
            ("INT", "ANTAGONIST'S LAIR", "NIGHT"),
            ("EXT", "BATTLEFIELD", "DAY"),
            ("INT", "SECRET CHAMBER", "NIGHT"),
            ("EXT", "MOUNTAIN PASS", "DUSK"),
            ("INT", "THRONE ROOM", "DAY"),
            ("EXT", "HARBOR", "DAWN")
        ]
        
        # Use world geography if available
        if self.doc.world_geography:
            # Extract potential locations from world geography
            pass
        
        # Cycle through locations if scene_num exceeds list
        idx = (scene_num - 1) % len(locations)
        return locations[idx]
    
    def _get_scene_characters(self, scene_num: int) -> str:
        """Get characters present in a scene"""
        if self.doc.characters:
            # Distribute characters across scenes
            all_chars = [c.name for c in self.doc.characters]
            
            # First few scenes introduce main characters
            if scene_num <= 3:
                # Main characters in early scenes
                main_chars = all_chars[:min(2, len(all_chars))]
                return ", ".join(main_chars) if main_chars else "PROTAGONIST"
            elif scene_num <= 6:
                # Middle scenes have more characters
                return ", ".join(all_chars[:min(3, len(all_chars))]) if all_chars else "PROTAGONIST, ALLIES"
            else:
                # Later scenes focus on key confrontations
                return ", ".join(all_chars[:min(2, len(all_chars))]) if all_chars else "PROTAGONIST, ANTAGONIST"
        
        # Default character assignments
        defaults = {
            1: "PROTAGONIST",
            2: "PROTAGONIST, MENTOR",
            3: "PROTAGONIST, ALLY",
            4: "PROTAGONIST, COMPANION",
            5: "ANTAGONIST, GUARDS",
            6: "PROTAGONIST, ALLIES, ENEMIES",
            7: "PROTAGONIST, ANTAGONIST",
            8: "PROTAGONIST, GUIDE",
            9: "PROTAGONIST, RIVAL",
            10: "PROTAGONIST, ALL SURVIVORS"
        }
        return defaults.get(scene_num, "PROTAGONIST")
    
    def _get_scene_action(self, scene_num: int) -> str:
        """Get action description for a scene"""
        # Use plot information if available
        if self.doc.major_obstacles and scene_num <= len(self.doc.major_obstacles):
            return f"The protagonist faces {self.doc.major_obstacles[scene_num - 1].lower()}. Tension builds as the situation becomes more complex."
        
        if self.doc.turning_points and scene_num <= len(self.doc.turning_points):
            return f"{self.doc.turning_points[scene_num - 1]}. This pivotal moment changes the direction of the story."
        
        # Default actions based on scene position
        default_actions = {
            1: "The scene opens with an establishing shot. The protagonist is introduced in their ordinary world, unaware of the journey ahead.",
            2: "The protagonist receives news that will change everything. The inciting incident begins to unfold.",
            3: "Tensions rise as the protagonist must make a difficult choice. The stakes become clear.",
            4: "A moment of reflection and preparation. The protagonist gathers resources and allies for the challenges ahead.",
            5: "The antagonist's plan is revealed. The threat becomes tangible and immediate.",
            6: "A major confrontation occurs. Both sides suffer losses, but the protagonist gains crucial information.",
            7: "The climax approaches. All story threads converge as the final conflict becomes inevitable.",
            8: "A quiet moment before the storm. Characters reflect on their journey and prepare for what's to come.",
            9: "The final pieces fall into place. The protagonist must face their ultimate challenge.",
            10: "Resolution and aftermath. The consequences of the journey are revealed."
        }
        
        return default_actions.get(scene_num, "The scene advances the plot and develops character arcs.")
    
    def _get_scene_dialogue(self, scene_num: int, characters: str) -> str:
        """Generate dialogue for a scene"""
        char_list = [c.strip() for c in characters.split(",")]
        
        # Generate dialogue based on scene position
        dialogue_templates = {
            1: [
                ("looking around", "Another day, another challenge."),
                ("determined", "I have a feeling things are about to change.")
            ],
            2: [
                ("surprised", "This changes everything."),
                ("thoughtful", "I need to think about this carefully.")
            ],
            3: [
                ("concerned", "The stakes are higher than I imagined."),
                ("resolute", "We have no choice but to move forward.")
            ],
            4: [
                ("to allies", "We need to prepare for what's coming."),
                ("nodding", "Together, we might have a chance.")
            ],
            5: [
                ("menacingly", "Everything is proceeding as planned."),
                ("to subordinate", "Make sure no one interferes.")
            ],
            6: [
                ("in the heat of battle", "We can't give up now!"),
                ("realizing something", "Wait... I understand now.")
            ],
            7: [
                ("facing the antagonist", "This ends here."),
                ("defiant", "You've underestimated me for the last time.")
            ],
            8: [
                ("quietly", "Whatever happens tomorrow... I want you to know."),
                ("reflective", "We've come so far from where we started.")
            ],
            9: [
                ("with finality", "There's no turning back."),
                ("ready", "I'm ready for whatever comes.")
            ],
            10: [
                ("with relief", "It's finally over."),
                ("hopefully", "A new chapter begins.")
            ]
        }
        
        # Build dialogue lines
        lines = []
        template = dialogue_templates.get(scene_num, [
            ("thoughtfully", "We must continue."),
            ("nodding", "I understand.")
        ])
        
        for i, (gesture, dialogue_text) in enumerate(template):
            speaker = char_list[i % len(char_list)] if char_list else "CHARACTER"
            lines.append(f"""{speaker.upper()}
({gesture})
{dialogue_text}""")
        
        return "\n\n".join(lines)
    
    def _get_scene_shot_list(self, scene_num: int) -> str:
        """Generate shot list for a scene"""
        # Standard shot progression
        base_shots = [
            "- Shot 1: Wide establishing shot",
            "- Shot 2: Medium shot on main character",
            "- Shot 3: Close-up on reaction",
            "- Shot 4: Two-shot (dialogue)",
            "- Shot 5: Over-the-shoulder shot",
            "- Shot 6: Wide shot (scene exit)"
        ]
        
        # Customize based on scene type
        if scene_num == 1:
            return "\n".join([
                "- Shot 1: Extreme wide shot (location establish)",
                "- Shot 2: Wide shot (character introduction)",
                "- Shot 3: Medium shot (character detail)",
                "- Shot 4: Close-up (expression)",
                "- Shot 5: POV shot (what character sees)"
            ])
        elif scene_num in [5, 6, 7]:  # Action/confrontation scenes
            return "\n".join([
                "- Shot 1: Wide establishing shot",
                "- Shot 2: Medium shot (antagonist reveal)",
                "- Shot 3: Close-up (protagonist reaction)",
                "- Shot 4: Medium close-up (dialogue)",
                "- Shot 5: Two-shot (confrontation)",
                "- Shot 6: Low angle (power dynamic)",
                "- Shot 7: Close-up (climax moment)",
                "- Shot 8: Wide shot (aftermath)"
            ])
        elif scene_num == 10:  # Resolution
            return "\n".join([
                "- Shot 1: Wide shot (final location)",
                "- Shot 2: Medium shot (survivors)",
                "- Shot 3: Close-up (protagonist)",
                "- Shot 4: Two-shot (key relationship)",
                "- Shot 5: Extreme wide shot (horizon/future)",
                "- Shot 6: Fade out"
            ])
        
        return "\n".join(base_shots)
    
    def _get_scene_transition(self, scene_num: int) -> str:
        """Get transition type for a scene"""
        transitions = {
            1: "CUT TO",
            2: "DISSOLVE TO",
            3: "CUT TO",
            4: "DISSOLVE TO",
            5: "SMASH CUT TO",
            6: "CUT TO",
            7: "MATCH CUT TO",
            8: "DISSOLVE TO",
            9: "CUT TO",
            10: "FADE TO BLACK"
        }
        return transitions.get(scene_num, "CUT TO")
    
    def _get_scenario_character_list(self) -> str:
        """Get formatted character list for scenario"""
        if self.doc.characters:
            lines = []
            for char in self.doc.characters:
                desc = char.biography[:80] if char.biography else "Key character in the story"
                lines.append(f"- **{char.name}**: {desc}")
            return "\n".join(lines)
        return "- **PROTAGONIST**: Main character\n- **ANTAGONIST**: Primary opposition\n- **SUPPORTING**: Key allies and mentors"
    
    def _get_scenario_location_list(self) -> str:
        """Get formatted location list for scenario"""
        locations = [
            "- HEADQUARTERS - Main base of operations",
            "- CITY STREETS - Urban environment",
            "- CHARACTER'S HOME - Personal space",
            "- WILDERNESS - Natural environment",
            "- ANTAGONIST'S LAIR - Enemy territory",
            "- BATTLEFIELD - Conflict zone",
            "- SECRET CHAMBER - Hidden location",
            "- MOUNTAIN PASS - Journey location",
            "- THRONE ROOM - Power center",
            "- HARBOR - Transition point"
        ]
        
        if self.doc.world_geography:
            # Could parse world_geography for custom locations
            pass
        
        return "\n".join(locations[:7])
    
    def _estimate_runtime(self) -> str:
        """Estimate runtime based on scene count"""
        # Rough estimate: 1-3 minutes per scene
        return "10-20 minutes (short film) to 90-120 minutes (feature)"
    
    # ========================================
    # Story-Chapter Files Generation Methods
    # ========================================
    
    def _generate_story_index(self) -> str:
        """Generate story-index.md - Index with metadata and chapter list"""
        # Determine genre from themes or use default
        genre = ", ".join(self.doc.major_themes) if self.doc.major_themes else "General Fiction"
        
        # Build chapter list
        chapter_list = []
        chapter_list.append("1. [Introduction](story-intro.md) - Setting the Stage")
        for i in range(1, 6):
            chapter_title = self._get_chapter_title(i)
            chapter_list.append(f"{i+1}. [Chapter {i}](story-chapter-0{i}.md) - {chapter_title}")
        chapter_list.append("7. [Ending](story-ending.md) - Resolution")
        
        chapters_str = "\n".join(chapter_list)
        
        return f"""# Story Index: {self.doc.project_title}

## Metadata
- **Title**: {self.doc.project_title}
- **Genre**: {genre}
- **Chapters**: 5
- **Status**: In Progress
- **Created**: {datetime.now().strftime('%Y-%m-%d')}
- **Structure**: {self.doc.global_structure.upper()}

## Overview
{self.doc.general_pitch or "Story overview to be developed."}

## Chapter List
{chapters_str}

## Reading Guide
This story follows a {self.doc.global_structure.replace('_', '-')} structure. Each chapter builds upon the previous, creating a cohesive narrative arc. The introduction establishes the world and characters, while the ending provides resolution to the central conflict.

## Related Documentation
- [Master Outline](00_master_outline.md) - Overall story structure
- [Plot Core](01_plot_core.md) - Central narrative elements
- [Character Bibles](04_character_bibles/) - Character profiles
- [Timelines](05_timelines.md) - Chronological events

---
*Généré par StoryCore-Engine - {datetime.now().strftime('%Y-%m-%d %H:%M')}*
"""
    
    def _generate_story_intro(self) -> str:
        """Generate story-intro.md - Introduction/setting"""
        return f"""# Introduction: Setting the Stage

## Setting
{self.doc.world_geography or "The world setting will be established in the opening scenes."}

## Initial Situation
{self.doc.general_pitch or "The story begins with an introduction to the world and its inhabitants."}

## The Hook
{self.doc.central_conflict or "A compelling opening that draws the reader into the narrative."}

## Key Elements Introduced
- **World**: {self.doc.world_geography[:200] if self.doc.world_geography else "The setting and its rules"}
- **Tone**: {self.doc.tone_and_ambiance or "Atmospheric and engaging"}
- **Themes**: {', '.join(self.doc.major_themes) if self.doc.major_themes else "Discovery, conflict, resolution"}

## Opening Scene
The introduction establishes the fundamental elements of the story:
1. The world and its rules
2. The protagonist in their ordinary world
3. The inciting incident that begins the journey
4. The central question that drives the narrative

## Characters Introduced
{self._get_characters_list()}

## Foreshadowing
{self.doc.faction_hidden_motivations or "Hints of deeper mysteries and conflicts to come."}

## Transition to Chapter 1
The introduction concludes with the protagonist facing a choice that will launch them into the main narrative.

---
*Généré par StoryCore-Engine - {datetime.now().strftime('%Y-%m-%d %H:%M')}*
"""
    
    def _generate_story_chapter(self, chapter_num: int) -> str:
        """Generate story-chapter-XX.md - Chapter content"""
        chapter_title = self._get_chapter_title(chapter_num)
        chapter_summary = self._get_chapter_summary(chapter_num)
        scenes = self._get_chapter_scenes(chapter_num)
        characters = self._get_chapter_characters(chapter_num)
        notes = self._get_chapter_notes(chapter_num)
        
        return f"""# Chapter {chapter_num}: {chapter_title}

## Summary
{chapter_summary}

## Scenes
{scenes}

## Characters
{characters}

## Key Events
{self._get_chapter_key_events(chapter_num)}

## Emotional Arc
{self._get_chapter_emotional_arc(chapter_num)}

## Notes
{notes}

## Connections
- **Previous**: {"[Introduction](story-intro.md)" if chapter_num == 1 else f"[Chapter {chapter_num-1}](story-chapter-0{chapter_num-1}.md)"}
- **Next**: {"[Ending](story-ending.md)" if chapter_num == 5 else f"[Chapter {chapter_num+1}](story-chapter-0{chapter_num+1}.md)"}

---
*Généré par StoryCore-Engine - {datetime.now().strftime('%Y-%m-%d %H:%M')}*
"""
    
    def _generate_story_ending(self) -> str:
        """Generate story-ending.md - Conclusion"""
        return f"""# Ending: Resolution

## Resolution Overview
{self.doc.planned_resolution or "The story concludes with resolution of the central conflict."}

## Final Confrontation
{self.doc.climax or "The climax brings all story elements together in a decisive moment."}

## Aftermath
The resolution explores the consequences of the climax:
- How the characters have changed
- The new status quo
- Lingering questions or possibilities

## Character Resolutions
{self._get_character_resolutions()}

## Themes Resolved
{', '.join(self.doc.major_themes) if self.doc.major_themes else "The central themes reach their conclusion."}

## Final Truths Revealed
{self.doc.final_truths or "Any remaining mysteries are resolved, providing closure."}

## Closing Scene
The ending provides:
1. Resolution of the main plot
2. Character arc completions
3. A sense of closure (or deliberate openness for continuation)
4. Final thematic resonance

## Epilogue Possibilities
{self._get_epilogue_notes()}

## Connection to Introduction
The ending mirrors or contrasts with the introduction, creating a satisfying narrative circle.

---
*Généré par StoryCore-Engine - {datetime.now().strftime('%Y-%m-%d %H:%M')}*
"""
    
    def _generate_story_summary(self) -> str:
        """Generate story-summary.md - Rolling summary"""
        return f"""# Story Summary: {self.doc.project_title}

## Overview
This document provides a rolling summary of all chapters, useful for maintaining consistency and quick reference.

## Complete Story Arc

### Introduction
{self.doc.general_pitch or "The story begins..."}

### Chapter 1: {self._get_chapter_title(1)}
{self._get_chapter_summary(1)}

### Chapter 2: {self._get_chapter_title(2)}
{self._get_chapter_summary(2)}

### Chapter 3: {self._get_chapter_title(3)}
{self._get_chapter_summary(3)}

### Chapter 4: {self._get_chapter_title(4)}
{self._get_chapter_summary(4)}

### Chapter 5: {self._get_chapter_title(5)}
{self._get_chapter_summary(5)}

### Ending
{self.doc.planned_resolution or "The story reaches its conclusion."}

## Central Conflict
{self.doc.central_conflict or "The main conflict drives the narrative forward."}

## Character Arcs Summary
{self._get_all_character_arcs()}

## Timeline Summary
{self._get_timeline_summary()}

## Key Revelations
{self._get_key_revelations()}

## Consistency Notes
- Maintain character voices throughout
- Track timeline continuity
- Reference established world rules
- Honor foreshadowing from earlier chapters

---
*Généré par StoryCore-Engine - {datetime.now().strftime('%Y-%m-%d %H:%M')}*
"""
    
    # Helper methods for chapter content
    
    def _get_chapter_title(self, chapter_num: int) -> str:
        """Get title for a specific chapter"""
        default_titles = {
            1: "The Beginning",
            2: "Rising Action",
            3: "The Turning Point",
            4: "Falling Action",
            5: "The Final Push"
        }
        
        # Try to get from turning points if available
        if self.doc.turning_points and chapter_num <= len(self.doc.turning_points):
            return self.doc.turning_points[chapter_num - 1]
        
        return default_titles.get(chapter_num, f"Chapter {chapter_num}")
    
    def _get_chapter_summary(self, chapter_num: int) -> str:
        """Get summary for a specific chapter"""
        default_summaries = {
            1: "The protagonist is introduced to their world and faces the inciting incident that will change everything. The central conflict begins to take shape.",
            2: "The protagonist navigates new challenges and begins to understand the true nature of their journey. Allies and enemies are revealed.",
            3: "A major turning point shifts the direction of the story. Revelations change the protagonist's understanding of their situation.",
            4: "The consequences of the turning point unfold. The protagonist must regroup and prepare for the final confrontation.",
            5: "All story threads converge as the protagonist faces the ultimate challenge. The climax approaches."
        }
        
        # Try to get from obstacles if available
        if self.doc.major_obstacles and chapter_num <= len(self.doc.major_obstacles):
            return f"The protagonist faces: {self.doc.major_obstacles[chapter_num - 1]}"
        
        return default_summaries.get(chapter_num, "Chapter content to be developed.")
    
    def _get_chapter_scenes(self, chapter_num: int) -> str:
        """Get scenes for a specific chapter"""
        scenes = []
        for i in range(1, 4):  # 3 scenes per chapter
            scenes.append(f"""### Scene {i}: {self._get_scene_title(chapter_num, i)}
{self._get_scene_description(chapter_num, i)}""")
        return "\n\n".join(scenes)
    
    def _get_scene_title(self, chapter_num: int, scene_num: int) -> str:
        """Get title for a specific scene"""
        default_scene_titles = {
            (1, 1): "Opening",
            (1, 2): "The Call",
            (1, 3): "Acceptance",
            (2, 1): "Exploration",
            (2, 2): "Discovery",
            (2, 3): "Complication",
            (3, 1): "The Twist",
            (3, 2): "Reassessment",
            (3, 3): "New Direction",
            (4, 1): "Aftermath",
            (4, 2): "Preparation",
            (4, 3): "Commitment",
            (5, 1): "Convergence",
            (5, 2): "Confrontation",
            (5, 3): "Resolution"
        }
        return default_scene_titles.get((chapter_num, scene_num), f"Scene {scene_num}")
    
    def _get_scene_description(self, chapter_num: int, scene_num: int) -> str:
        """Get description for a specific scene"""
        return f"Scene content for Chapter {chapter_num}, Scene {scene_num}. This scene advances the plot and develops character arcs."
    
    def _get_chapter_characters(self, chapter_num: int) -> str:
        """Get characters for a specific chapter"""
        if self.doc.characters:
            # Return relevant characters for this chapter
            chars = []
            for i, char in enumerate(self.doc.characters[:3]):  # First 3 characters
                chars.append(f"- **{char.name}**: {char.biography[:100] if char.biography else 'Character role in this chapter'}")
            return "\n".join(chars)
        return "- **Protagonist**: Main character\n- **Supporting Cast**: Key allies and antagonists"
    
    def _get_chapter_key_events(self, chapter_num: int) -> str:
        """Get key events for a specific chapter"""
        events = [
            f"- Event {chapter_num}.1: Plot advancement",
            f"- Event {chapter_num}.2: Character development",
            f"- Event {chapter_num}.3: Theme reinforcement"
        ]
        return "\n".join(events)
    
    def _get_chapter_emotional_arc(self, chapter_num: int) -> str:
        """Get emotional arc for a specific chapter"""
        arcs = {
            1: "Curiosity → Concern → Determination",
            2: "Confidence → Doubt → Resolve",
            3: "Shock → Grief → Acceptance",
            4: "Despair → Hope → Purpose",
            5: "Fear → Courage → Triumph"
        }
        return arcs.get(chapter_num, "Emotional journey through the chapter")
    
    def _get_chapter_notes(self, chapter_num: int) -> str:
        """Get notes for a specific chapter"""
        return f"""- Maintain consistency with previous chapters
- Track character development
- Ensure plot threads are advancing
- Reference world rules and established lore"""
    
    def _get_characters_list(self) -> str:
        """Get list of characters for introduction"""
        if self.doc.characters:
            return "\n".join([f"- **{char.name}**: {char.biography[:100] if char.biography else 'Character description'}" 
                            for char in self.doc.characters[:5]])
        return "- **Protagonist**: Main character\n- **Antagonist**: Primary opposition\n- **Supporting Characters**: Key allies and mentors"
    
    def _get_character_resolutions(self) -> str:
        """Get character resolutions for ending"""
        if self.doc.characters:
            resolutions = []
            for char in self.doc.characters[:3]:
                arc = char.emotional_arc if char.emotional_arc else "Character arc reaches conclusion"
                resolutions.append(f"- **{char.name}**: {arc}")
            return "\n".join(resolutions)
        return "- **Protagonist**: Character arc completed\n- **Supporting Cast**: Subplots resolved"
    
    def _get_epilogue_notes(self) -> str:
        """Get epilogue notes for ending"""
        return """Consider including:
- A glimpse of the future
- Unresolved threads for potential sequels
- Final character moments
- Thematic closing image"""
    
    def _get_all_character_arcs(self) -> str:
        """Get all character arcs for summary"""
        if self.doc.characters:
            arcs = []
            for char in self.doc.characters:
                arc = char.detailed_arc if char.detailed_arc else char.emotional_arc or "Character development throughout the story"
                arcs.append(f"- **{char.name}**: {arc}")
            return "\n".join(arcs)
        return "- Main character arcs to be developed"
    
    def _get_timeline_summary(self) -> str:
        """Get timeline summary"""
        if self.doc.novel_timeline:
            return "\n".join([f"- {e.date}: {e.event}" for e in self.doc.novel_timeline[:5]])
        return "- Timeline events to be tracked"
    
    def _get_key_revelations(self) -> str:
        """Get key revelations for summary"""
        if self.doc.planned_revelations:
            return "\n".join([f"- {r}" for r in self.doc.planned_revelations])
        if self.doc.major_secrets:
            return "\n".join([f"- {s}" for s in self.doc.major_secrets])
        return "- Key revelations to be revealed throughout the story"


# Convenience function
def generate_story_documentation(wizard_state, output_dir: str = ".") -> Dict[str, str]:
    """
    Generate complete story documentation
    
    Args:
        wizard_state: Wizard state with project information
        output_dir: Output directory for story files
        
    Returns:
        Dictionary of generated files
    """
    generator = StoryDocumentationGenerator()
    generator.generate_from_wizard_state(wizard_state)
    return generator.generate_all_files(Path(output_dir))

