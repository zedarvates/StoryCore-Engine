"""
Dialogue Wizard command handler - Interactive dialogue creation wizard.
"""

import argparse
from pathlib import Path
from typing import List

from ..base import BaseHandler
from ..errors import UserError, SystemError


class DialogueWizardHandler(BaseHandler):
    """Handler for the dialogue-wizard command - dialogue creation wizard."""

    command_name = "dialogue-wizard"
    description = "Interactive dialogue creation wizard"

    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up dialogue-wizard command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )

        parser.add_argument(
            "--characters",
            nargs="+",
            help="Character names to include in dialogue"
        )

        parser.add_argument(
            "--topic",
            help="Topic or concept for the dialogue scene"
        )

        parser.add_argument(
            "--tone",
            choices=["natural", "dramatic", "comedic", "intense", "subtle"],
            default="natural",
            help="Tone of the dialogue (default: natural)"
        )

        parser.add_argument(
            "--purpose",
            choices=["exposition", "conflict", "character_development", "comedy_relief", "climax_building"],
            default="character_development",
            help="Purpose of the dialogue scene (default: character_development)"
        )

        parser.add_argument(
            "--length",
            type=int,
            default=8,
            help="Target number of dialogue lines (default: 8)"
        )

        parser.add_argument(
            "--quick",
            action="store_true",
            help="Use quick generation mode with minimal prompts"
        )

    def execute(self, args: argparse.Namespace) -> int:
        """Execute the dialogue-wizard command."""
        try:
            # Import dialogue wizard
            try:
                from wizard.dialogue_wizard import (
                    create_dialogue_wizard,
                    generate_quick_dialogue,
                    DialoguePurpose,
                    DialogueTone
                )
            except ImportError as e:
                raise SystemError(
                    f"Dialogue wizard modules not available: {e}",
                    "Ensure wizard package is installed"
                )

            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )

            print(f"🎭 Dialogue Wizard for project: {project_path.absolute()}")
            print("=" * 60)

            if args.quick:
                return self._execute_quick_mode(args)
            else:
                return self._execute_interactive_mode(args)

        except Exception as e:
            return self.handle_error(e, "dialogue wizard")

    def _execute_quick_mode(self, args: argparse.Namespace) -> int:
        """Execute dialogue wizard in quick mode."""
        print("\n⚡ Quick Dialogue Generation")
        print("-" * 40)

        # Validate required arguments
        if not args.characters:
            raise UserError(
                "Character names are required in quick mode",
                "Use --characters to specify character names"
            )

        if not args.topic:
            raise UserError(
                "Topic is required in quick mode",
                "Use --topic to specify the dialogue topic"
            )

        # Generate dialogue scene
        scene = generate_quick_dialogue(
            characters=args.characters,
            topic=args.topic,
            tone=args.tone
        )

        # Display results
        self._display_dialogue_scene(scene)

        # Save to project
        success = self._save_dialogue_to_project(scene, args.project)
        if success:
            self.print_success("Dialogue scene saved to project!")
            print(f"  File: dialogue_scenes/{scene.title.lower().replace(' ', '_').replace(':', '')}.txt")

        return 0

    def _execute_interactive_mode(self, args: argparse.Namespace) -> int:
        """Execute dialogue wizard in interactive mode."""
        print("\n🎭 Interactive Dialogue Creation")
        print("-" * 40)

        # Initialize wizard
        wizard = create_dialogue_wizard()

        # Gather information interactively
        characters = args.characters
        if not characters:
            characters = self._prompt_characters()

        topic = args.topic
        if not topic:
            topic = self._prompt_topic()

        tone = self._select_tone(args.tone)
        purpose = self._select_purpose(args.purpose)

        print(f"\n📝 Generating dialogue scene...")
        print(f"   Characters: {', '.join(characters)}")
        print(f"   Topic: {topic}")
        print(f"   Tone: {tone.value}")
        print(f"   Purpose: {purpose.value.replace('_', ' ')}")

        # Create character voices
        print(f"\n👥 Creating character voices...")
        for name in characters:
            personality = self._prompt_character_personality(name)
            wizard.create_character_voice(name, personality=personality)
            print(f"   ✓ {name}: {', '.join(personality)}")

        # Generate scene
        scene = wizard.generate_dialogue_scene(
            scene_concept=f"Discussion about {topic}",
            characters=characters,
            purpose=purpose,
            tone=tone,
            target_length=args.length
        )

        # Display and potentially enhance
        self._display_dialogue_scene(scene)

        # Offer enhancements
        if self._prompt_enhancement():
            enhanced_lines = wizard.enhance_dialogue(scene.dialogue_lines, "emotional_depth")
            scene.dialogue_lines = enhanced_lines
            print(f"\n✨ Enhanced dialogue with emotional depth:")
            self._display_dialogue_lines(enhanced_lines)

        # Save to project
        success = self._save_dialogue_to_project(scene, args.project)
        if success:
            self.print_success("Dialogue scene saved to project!")

        return 0

    def _prompt_characters(self) -> List[str]:
        """Prompt user for character names."""
        print("\n👥 Enter character names (one per line, empty line to finish):")

        characters = []
        while True:
            try:
                name = input("Character name: ").strip()
                if not name:
                    break
                characters.append(name)
            except (KeyboardInterrupt, EOFError):
                break

        if not characters:
            characters = ["Alice", "Bob"]  # Default fallback

        return characters

    def _prompt_topic(self) -> str:
        """Prompt user for dialogue topic."""
        try:
            topic = input("\n📝 Enter the topic or concept for this dialogue scene: ").strip()
            return topic or "a difficult conversation"
        except (KeyboardInterrupt, EOFError):
            return "a difficult conversation"

    def _select_tone(self, default: str) -> DialogueTone:
        """Let user select dialogue tone."""
        tone_options = {
            "1": DialogueTone.NATURAL,
            "2": DialogueTone.DRAMATIC,
            "3": DialogueTone.COMEDIC,
            "4": DialogueTone.INTENSE,
            "5": DialogueTone.SUBTLE
        }

        print(f"\n🎭 Select dialogue tone (current: {default}):")
        print("   1. Natural - Everyday conversation")
        print("   2. Dramatic - Emotional and intense")
        print("   3. Comedic - Humorous and lighthearted")
        print("   4. Intense - High-stakes and confrontational")
        print("   5. Subtle - Understated and restrained")

        try:
            choice = input("Choice (1-5) or Enter for default: ").strip()
            if choice in tone_options:
                return tone_options[choice]
        except (KeyboardInterrupt, EOFError):
            pass

        # Return default
        tone_mapping = {
            "natural": DialogueTone.NATURAL,
            "dramatic": DialogueTone.DRAMATIC,
            "comedic": DialogueTone.COMEDIC,
            "intense": DialogueTone.INTENSE,
            "subtle": DialogueTone.SUBTLE
        }
        return tone_mapping.get(default, DialogueTone.NATURAL)

    def _select_purpose(self, default: str) -> DialoguePurpose:
        """Let user select dialogue purpose."""
        purpose_options = {
            "1": DialoguePurpose.EXPOSITION,
            "2": DialoguePurpose.CONFLICT,
            "3": DialoguePurpose.CHARACTER_DEVELOPMENT,
            "4": DialoguePurpose.COMEDY_RELIEF,
            "5": DialoguePurpose.CLIMAX_BUILDING
        }

        print(f"\n🎯 Select dialogue purpose (current: {default.replace('_', ' ')}):")
        print("   1. Exposition - Share background information")
        print("   2. Conflict - Create tension and disagreement")
        print("   3. Character Development - Reveal character traits")
        print("   4. Comedy Relief - Lighten the mood")
        print("   5. Climax Building - Heighten dramatic tension")

        try:
            choice = input("Choice (1-5) or Enter for default: ").strip()
            if choice in purpose_options:
                return purpose_options[choice]
        except (KeyboardInterrupt, EOFError):
            pass

        # Return default
        purpose_mapping = {
            "exposition": DialoguePurpose.EXPOSITION,
            "conflict": DialoguePurpose.CONFLICT,
            "character_development": DialoguePurpose.CHARACTER_DEVELOPMENT,
            "comedy_relief": DialoguePurpose.COMEDY_RELIEF,
            "climax_building": DialoguePurpose.CLIMAX_BUILDING
        }
        return purpose_mapping.get(default, DialoguePurpose.CHARACTER_DEVELOPMENT)

    def _prompt_character_personality(self, name: str) -> List[str]:
        """Prompt for character personality traits."""
        personality_options = [
            "confident", "nervous", "intellectual", "aggressive",
            "calm", "passionate", "stoic", "emotional", "humorous"
        ]

        print(f"\nSelect personality traits for {name} (comma-separated):")
        print(f"Options: {', '.join(personality_options)}")

        try:
            traits_input = input(f"{name}'s traits: ").strip()
            if traits_input:
                traits = [t.strip() for t in traits_input.split(",")]
                return traits
        except (KeyboardInterrupt, EOFError):
            pass

        return ["confident", "direct"]  # Default

    def _prompt_enhancement(self) -> bool:
        """Ask if user wants to enhance the dialogue."""
        try:
            response = input("\n✨ Enhance dialogue with emotional depth? (y/N): ").strip().lower()
            return response in ["y", "yes"]
        except (KeyboardInterrupt, EOFError):
            return False

    def _display_dialogue_scene(self, scene):
        """Display the generated dialogue scene."""
        print(f"\n🎬 {scene.title}")
        print("=" * 50)
        print(f"Setting: {scene.setting}")
        print(f"Tone: {scene.tone.value}")
        print(f"Purpose: {scene.purpose.value.replace('_', ' ')}")
        print(f"Characters: {', '.join([c.character_name for c in scene.characters])}")
        print(f"Duration: ~{scene.duration_estimate} seconds")
        print()

        if scene.scene_description:
            print("Scene Description:")
            print(scene.scene_description)
            print()

        print("Dialogue:")
        print("-" * 30)
        self._display_dialogue_lines(scene.dialogue_lines)

    def _display_dialogue_lines(self, lines):
        """Display dialogue lines in script format."""
        for line in lines:
            print(f"\n{line.character.upper()}")
            print(f"{line.text}")

            if line.action_description:
                print(line.action_description)

            if line.subtext:
                print(f"({line.subtext})")

    def _save_dialogue_to_project(self, scene, project_path: str) -> bool:
        """Save dialogue scene to project directory."""
        try:
            project_dir = Path(project_path)

            # Create dialogue_scenes directory
            dialogue_dir = project_dir / "dialogue_scenes"
            dialogue_dir.mkdir(exist_ok=True)

            # Create filename from title
            filename = scene.title.lower().replace(" ", "_").replace(":", "").replace(",", "") + ".txt"
            filepath = dialogue_dir / filename

            # Write dialogue to file
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(f"{scene.title}\n")
                f.write("=" * len(scene.title) + "\n\n")

                f.write(f"Setting: {scene.setting}\n")
                f.write(f"Tone: {scene.tone.value}\n")
                f.write(f"Purpose: {scene.purpose.value.replace('_', ' ')}\n")
                f.write(f"Characters: {', '.join([c.character_name for c in scene.characters])}\n\n")

                if scene.scene_description:
                    f.write("Scene Description:\n")
                    f.write(f"{scene.scene_description}\n\n")

                f.write("Dialogue:\n")
                f.write("-" * 30 + "\n")

                for line in scene.dialogue_lines:
                    f.write(f"\n{line.character.upper()}\n")
                    f.write(f"{line.text}\n")

                    if line.action_description:
                        f.write(f"{line.action_description}\n")

                    if line.subtext:
                        f.write(f"({line.subtext})\n")

            return True

        except Exception as e:
            print(f"Warning: Could not save dialogue to project: {e}")
            return False