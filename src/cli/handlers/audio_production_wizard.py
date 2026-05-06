"""
Audio Production Wizard command handler - Sound design and audio generation.
"""

import argparse
from pathlib import Path
from typing import Dict, Any
import json

from ..base import BaseHandler
from ..errors import UserError, SystemError
from src.wizard.audio_production_wizard import (
    AudioProductionPlan,
    get_audio_preview_for_shot,
)


class AudioProductionWizardHandler(BaseHandler):
    """Handler for the audio-production-wizard command - sound design assistant."""

    command_name = "audio-production-wizard"
    description = "Create comprehensive audio production plans with voice overs, sound effects, and music cues"

    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up audio-production-wizard command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)",
        )

        parser.add_argument(
            "--shots", nargs="+", help="Specific shot IDs to focus audio design on"
        )

        parser.add_argument(
            "--preview-shot",
            help="Preview audio suggestions for a specific shot (provide shot data as JSON string)",
        )

        parser.add_argument(
            "--format",
            choices=["detailed", "summary", "minimal"],
            default="detailed",
            help="Output format (default: detailed)",
        )

        parser.add_argument(
            "--export-script",
            action="store_true",
            help="Export voice over script to separate file",
        )

        parser.add_argument(
            "--export-music-cues",
            action="store_true",
            help="Export music cues to separate file",
        )

    def execute(self, args: argparse.Namespace) -> int:
        """Execute the audio-production-wizard command."""
        try:
            # Import Audio Production wizard
            try:
                from wizard.audio_production_wizard import (
                    create_audio_production_wizard,
                    get_audio_preview_for_shot,
                    AudioProductionPlan,
                )
            except ImportError as e:
                raise SystemError(
                    f"Audio Production wizard modules not available: {e}",
                    "Ensure wizard package is installed",
                )

            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'",
                )

            print("🎵 Audio Production Wizard - Sound Design Assistant")
            print("=" * 65)

            # Handle preview mode
            if args.preview_shot:
                try:
                    shot_data = json.loads(args.preview_shot)
                    return self._execute_preview_mode(shot_data)
                except json.JSONDecodeError:
                    raise UserError(
                        "Invalid JSON format for --preview-shot",
                        "Provide shot data as valid JSON string",
                    )

            # Execute full audio production plan
            import asyncio

            wizard = create_audio_production_wizard()

            print(f"📂 Project: {project_path.absolute()}")
            if args.shots:
                print(f"🎯 Focusing on shots: {', '.join(args.shots)}")

            # Generate audio production plan
            plan = asyncio.run(
                wizard.create_audio_production_plan(project_path, args.shots)
            )

            # Display results based on format
            return self._display_audio_plan(plan, args.format, args)

        except Exception as e:
            return self.handle_error(e, "Audio Production planning")

    def _execute_preview_mode(self, shot_data: Dict[str, Any]) -> int:
        """Execute preview mode for a specific shot."""
        print("👁️ Audio Preview Mode")
        print("-" * 30)

        preview = get_audio_preview_for_shot(shot_data)

        print(f"🎬 Shot: {preview['shot_id']}")
        print(f"🎭 Mood: {preview['mood'].title()}")
        print(f"⏱️ Duration: {preview['duration']:.1f}s")
        print("\n🎵 Suggested Audio Elements:")

        for i, suggestion in enumerate(preview["suggested_audio"], 1):
            priority_icon = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(
                suggestion["priority"], "⚪"
            )

            print(f"   {i}. {priority_icon} {suggestion['description']}")
            print(f"      Type: {suggestion['type'].replace('_', ' ').title()}")
            print(f"      Priority: {suggestion['priority'].title()}")

        return 0

    def _display_audio_plan(
        self, plan: AudioProductionPlan, format_type: str, args: argparse.Namespace
    ) -> int:
        """Display the audio production plan."""
        print(
            f"\n🎼 Audio Production Plan Complete - Quality: {plan.quality_metrics.get('overall_quality', 0):.1f}/10"
        )
        print("=" * 85)

        # Project and timing info
        print(f"📁 Project ID: {plan.project_id}")
        print(f"🕒 Generated: {plan.plan_timestamp[:19].replace('T', ' ')}")
        print(f"⏱️ Total Duration: {plan.total_duration:.1f} seconds")
        print(f"🎵 Audio Sequences: {len(plan.audio_sequences)}")

        # Quality metrics
        metrics = plan.quality_metrics
        print("\n📊 Quality Metrics:")
        print(f"   Voice Coverage: {metrics.get('voice_coverage', 0):.1%}")
        print(f"   SFX Coverage: {metrics.get('sfx_coverage', 0):.1%}")
        print(f"   Music Coverage: {metrics.get('music_coverage', 0):.1%}")
        print(f"   Average Confidence: {metrics.get('average_confidence', 0):.1%}")

        if format_type == "minimal":
            return self._display_minimal_format(plan, args)
        elif format_type == "summary":
            return self._display_summary_format(plan, args)
        else:
            return self._display_detailed_format(plan, args)

    def _display_minimal_format(
        self, plan: AudioProductionPlan, args: argparse.Namespace
    ) -> int:
        """Display minimal format output."""
        total_elements = sum(len(seq.audio_elements) for seq in plan.audio_sequences)

        print("\n🎵 Quick Summary:")
        print(f"   Sequences: {len(plan.audio_sequences)}")
        print(f"   Audio Elements: {total_elements}")
        print(
            f"   Voice Overs: {len(plan.voice_over_script.split()) if plan.voice_over_script else 0} segments"
        )
        print(f"   Music Cues: {len(plan.music_cues)}")

        print("\n💾 Plan saved to: audio_production_plan.json")
        return 0

    def _display_summary_format(
        self, plan: AudioProductionPlan, args: argparse.Namespace
    ) -> int:
        """Display summary format output."""
        print("\n🎵 Audio Production Summary:")

        # Element counts
        voice_count = sum(
            1
            for seq in plan.audio_sequences
            for elem in seq.audio_elements
            if elem.audio_type.value == "voice_over"
        )
        sfx_count = sum(
            1
            for seq in plan.audio_sequences
            for elem in seq.audio_elements
            if elem.audio_type.value == "sound_effect"
        )
        foley_count = sum(
            1
            for seq in plan.audio_sequences
            for elem in seq.audio_elements
            if elem.audio_type.value == "foley"
        )
        ambient_count = sum(
            1
            for seq in plan.audio_sequences
            for elem in seq.audio_elements
            if elem.audio_type.value == "ambient_sound"
        )
        music_count = len(plan.music_cues)

        print(f"   🎤 Voice Over Segments: {voice_count}")
        print(f"   🔊 Sound Effects: {sfx_count}")
        print(f"   👣 Foley Effects: {foley_count}")
        print(f"   🌍 Ambient Audio: {ambient_count}")
        print(f"   🎶 Music Cues: {music_count}")

        # Top audio sequences
        if plan.audio_sequences:
            print("\n🎼 Top Audio Sequences:")
            for seq in plan.audio_sequences[:3]:
                elem_count = len(seq.audio_elements)
                print(f"   • {seq.shot_id}: {elem_count} audio elements")

        # Export information
        self._display_export_info(plan, args)

        return 0

    def _display_detailed_format(
        self, plan: AudioProductionPlan, args: argparse.Namespace
    ) -> int:
        """Display detailed format output."""

        # Audio sequences breakdown
        if plan.audio_sequences:
            print("\n🎼 Audio Sequences Breakdown:")
            for seq in plan.audio_sequences:
                print(f"\n   📹 Shot {seq.shot_id} ({seq.duration:.1f}s):")

                for elem in seq.audio_elements:
                    type_icon = {
                        "voice_over": "🎤",
                        "sound_effect": "🔊",
                        "background_music": "🎶",
                        "ambient_sound": "🌍",
                        "foley": "👣",
                        "dialogue": "💬",
                    }.get(elem.audio_type.value, "🎵")

                    priority_icon = {
                        "critical": "🔴",
                        "high": "🟠",
                        "medium": "🟡",
                        "low": "🟢",
                        "optional": "⚪",
                    }.get(elem.priority.value, "⚪")

                    print(f"      {type_icon} {priority_icon} {elem.name}")
                    print(
                        f"         Duration: {elem.duration_seconds:.1f}s | Volume: {elem.volume_level:.1%}"
                    )
                    print(
                        f"         Mood: {elem.mood.value.title()} | Confidence: {elem.confidence_score:.1%}"
                    )

                    if elem.generation_prompt:
                        prompt_short = (
                            elem.generation_prompt[:50] + "..."
                            if len(elem.generation_prompt) > 50
                            else elem.generation_prompt
                        )
                        print(f'         Prompt: "{prompt_short}"')

        # Voice over script
        if plan.voice_over_script:
            print("\n🎤 Voice Over Script:")
            script_lines = plan.voice_over_script.split("\n\n")
            for line in script_lines[:5]:  # Show first 5 segments
                if line.strip():
                    print(f"   {line}")
            if len(script_lines) > 5:
                print(f"   ... and {len(script_lines) - 5} more segments")

        # Music cues
        if plan.music_cues:
            print("\n🎶 Music Cues:")
            for cue in plan.music_cues[:3]:  # Show first 3 cues
                print(f"   • {cue['cue_name']} ({cue['mood'].title()})")
                print(f"     Genre: {cue['genre']} | Tempo: {cue['tempo']}")
                instruments = ", ".join(cue["instruments"][:3])
                if len(cue["instruments"]) > 3:
                    instruments += f" +{len(cue['instruments']) - 3} more"
                print(f"     Instruments: {instruments}")

        # Sound effects inventory
        if plan.sound_effects_inventory:
            print("\n🔊 Sound Effects Inventory:")
            for category in plan.sound_effects_inventory[:3]:  # Show first 3 categories
                print(
                    f"   📂 {category['category'].title()}: {len(category['effects'])} effects"
                )
                for effect in category["effects"][
                    :2
                ]:  # Show first 2 effects per category
                    print(f"      • {effect['name']} ({effect['shot_id']})")

        # Production notes
        if plan.production_notes:
            print("\n📋 Production Notes:")
            for note in plan.production_notes[:5]:  # Show first 5 notes
                print(f"   • {note}")

        # Technical requirements
        tech_reqs = plan.technical_requirements
        if tech_reqs:
            print("\n⚙️ Technical Requirements:")
            print(f"   Sample Rate: {tech_reqs['sample_rate']} Hz")
            print(f"   Bit Depth: {tech_reqs['bit_depth']} bits")
            print(f"   Format: {tech_reqs['format']}")
            print(f"   Mastering Level: {tech_reqs['mastering_level']} LUFS")

        # Export information
        self._display_export_info(plan, args)

        print("\n✅ Audio production plan completed successfully!")
        print(
            "   Use this plan to guide your sound design and audio production workflow."
        )

        return 0

    def _display_export_info(
        self, plan: AudioProductionPlan, args: argparse.Namespace
    ) -> None:
        """Display export information."""
        print("\n💾 Files Created/Updated:")

        exports = [
            ("audio_production_plan.json", "Complete audio production plan"),
            ("voice_over_script.txt", "Voice over script for recording"),
            ("project.json", "Updated with audio plan metadata"),
        ]

        if args.export_script and plan.voice_over_script:
            exports.append(
                ("voice_over_script_export.txt", "Formatted voice over script")
            )

        if args.export_music_cues and plan.music_cues:
            exports.append(
                ("music_cues_export.json", "Detailed music cue specifications")
            )

        for filename, description in exports:
            print(f"   • {filename} - {description}")

    def _export_additional_files(
        self, plan: AudioProductionPlan, args: argparse.Namespace
    ) -> None:
        """Export additional files based on arguments."""
        # Export voice over script in formatted version
        if args.export_script and plan.voice_over_script:
            formatted_script = self._format_voice_over_script(plan.voice_over_script)
            with open("voice_over_script_export.txt", "w") as f:
                f.write(formatted_script)

        # Export music cues in detailed format
        if args.export_music_cues and plan.music_cues:
            music_data = {
                "music_cues_export": {
                    "generated_at": plan.plan_timestamp,
                    "total_cues": len(plan.music_cues),
                    "cues": plan.music_cues,
                }
            }
            with open("music_cues_export.json", "w") as f:
                json.dump(music_data, f, indent=2)

    def _format_voice_over_script(self, script: str) -> str:
        """Format voice over script for production."""
        lines = script.split("\n")
        formatted_lines = []

        for line in lines:
            line = line.strip()
            if line:
                # Add timing placeholders and formatting
                formatted_lines.append(f"[TIMING] {line}")
                formatted_lines.append("[PAUSE 1.5s]")
                formatted_lines.append("")

        return "\n".join(formatted_lines)
