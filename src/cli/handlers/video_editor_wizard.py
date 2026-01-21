"""
EditForge Video Editor Wizard command handler - Automatic video montage creation.
"""

import argparse
from pathlib import Path
from typing import List
import json

from ..base import BaseHandler
from ..errors import UserError, SystemError


class VideoEditorWizardHandler(BaseHandler):
    """Handler for the video-editor-wizard command - automatic montage creation."""

    command_name = "video-editor-wizard"
    description = "Create automatic video montages from storyboards with intelligent editing"

    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up video-editor-wizard command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )

        parser.add_argument(
            "--output",
            default="final_montage",
            help="Output filename base (default: final_montage)"
        )

        parser.add_argument(
            "--style",
            choices=["cinematic", "dynamic", "smooth", "intense", "minimalist", "documentary"],
            default="cinematic",
            help="Editing style to apply (default: cinematic)"
        )

        parser.add_argument(
            "--preview",
            action="store_true",
            help="Show preview of montage that would be created"
        )

        parser.add_argument(
            "--format",
            choices=["detailed", "summary", "minimal"],
            default="detailed",
            help="Output format (default: detailed)"
        )

        parser.add_argument(
            "--export-timeline",
            action="store_true",
            help="Export detailed timeline information"
        )

        parser.add_argument(
            "--export-settings",
            action="store_true",
            help="Export video export settings separately"
        )

    def execute(self, args: argparse.Namespace) -> int:
        """Execute the video-editor-wizard command."""
        try:
            # Import Video Editor wizard
            try:
                from wizard.video_editor_wizard import (
                    create_video_editor_wizard,
                    get_montage_preview,
                    VideoMontage,
                    EditingStyle
                )
            except ImportError as e:
                raise SystemError(
                    f"Video Editor wizard modules not available: {e}",
                    "Ensure wizard package is installed"
                )

            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )

            print("🎬 EditForge - Automatic Video Montage Creation")
            print("=" * 65)

            # Handle preview mode
            if args.preview:
                return self._execute_preview_mode(project_path)

            # Execute full montage creation
            import asyncio

            wizard = create_video_editor_wizard()

            # Map style string to enum
            style_map = {
                'cinematic': EditingStyle.CINEMATIC,
                'dynamic': EditingStyle.DYNAMIC,
                'smooth': EditingStyle.SMOOTH,
                'intense': EditingStyle.INTENSE,
                'minimalist': EditingStyle.MINIMALIST,
                'documentary': EditingStyle.DOCUMENTARY
            }
            editing_style = style_map.get(args.style.lower(), EditingStyle.CINEMATIC)

            print(f"🎨 Editing style: {editing_style.value}")
            print(f"📁 Output: {args.output}")

            # Create montage
            montage = asyncio.run(
                wizard.create_video_montage(project_path, args.output, editing_style)
            )

            # Display results based on format
            return self._display_montage_results(montage, args.format, args)

        except Exception as e:
            return self.handle_error(e, "Video montage creation")

    def _execute_preview_mode(self, project_path: Path) -> int:
        """Execute preview mode to show montage potential."""
        print("👁️ Montage Preview Mode")
        print("-" * 30)

        preview = get_montage_preview(project_path)

        if 'error' in preview:
            print(f"❌ Error: {preview['error']}")
            return 1

        print(f"🎬 Project: {preview['project_name']}")
        print(f"📹 Total Shots: {preview['total_shots']}")
        print(f"⏱️ Estimated Duration: {preview['estimated_duration']}s")
        print(f"🎞️ Video Clips: {preview['estimated_clips']}")
        print(f"🎵 Audio Tracks: {preview['estimated_audio_tracks']}")
        print(f"🔄 Transitions: {preview['estimated_transitions']}")
        print(f"🎨 Recommended Style: {preview['recommended_style'].title()}")
        print(f"📊 Quality Potential: {preview['quality_potential'].upper()}")

        print("
💡 Tips:"        print(f"   • {'✅' if preview['has_audio_plan'] else '❌'} Audio plan available - {'Higher' if preview['has_audio_plan'] else 'Lower'} quality expected")
        print(f"   • Run with --style {preview['recommended_style']} for best results")
        print(f"   • Use --preview before full creation to validate")

        return 0

    def _display_montage_results(self, montage: VideoMontage, format_type: str, args: argparse.ArgumentParser) -> int:
        """Display montage creation results."""
        print(f"\n🎞️ Montage Created Successfully - Quality: {montage.quality_metrics.get('overall_quality', 0):.1f}/10")
        print("=" * 85)

        # Basic info
        print(f"🎬 Montage ID: {montage.montage_id}")
        print(f"🕒 Created: {montage.creation_timestamp[:19].replace('T', ' ')}")
        print(f"⏱️ Total Duration: {montage.total_duration:.1f} seconds")
        print(f"🎨 Style: {montage.editing_style.value.title()}")
        print(f"📐 Resolution: {montage.resolution[0]}x{montage.resolution[1]}")
        print(f"🎬 Frame Rate: {montage.frame_rate} fps")

        # Quality metrics
        metrics = montage.quality_metrics
        print(f"\n📊 Quality Metrics:")
        print(f"   Rhythm Consistency: {metrics.get('rhythm_consistency', 0):.1f}/10")
        print(f"   Transition Coverage: {metrics.get('transition_coverage', 0):.1f}/10")
        print(f"   Audio Coverage: {metrics.get('audio_coverage', 0):.1f}/10")

        if format_type == "minimal":
            return self._display_minimal_format(montage, args)
        elif format_type == "summary":
            return self._display_summary_format(montage, args)
        else:
            return self._display_detailed_format(montage, args)

    def _display_minimal_format(self, montage: VideoMontage, args: argparse.ArgumentParser) -> int:
        """Display minimal format output."""
        print(f"\n🎬 Quick Summary:")
        print(f"   Duration: {montage.total_duration:.1f}s")
        print(f"   Clips: {len(montage.video_clips)}")
        print(f"   Audio: {len(montage.audio_tracks)} tracks")
        print(f"   Transitions: {len(montage.transitions)}")

        print(f"\n💾 Plan saved to: video_montage_plan.json")
        return 0

    def _display_summary_format(self, montage: VideoMontage, args: argparse.ArgumentParser) -> int:
        """Display summary format output."""
        print(f"\n🎬 Montage Summary:")

        # Video clips summary
        clip_durations = [clip.duration for clip in montage.video_clips]
        avg_clip_duration = sum(clip_durations) / len(clip_durations) if clip_durations else 0

        print(f"   📹 Video Clips: {len(montage.video_clips)}")
        print(f"      Average duration: {avg_clip_duration:.1f}s")
        print(f"      Total transitions: {len(montage.transitions)}")

        # Audio tracks summary
        audio_by_type = {}
        for track in montage.audio_tracks:
            audio_type = track.audio_type
            audio_by_type[audio_type] = audio_by_type.get(audio_type, 0) + 1

        print(f"   🎵 Audio Tracks: {len(montage.audio_tracks)}")
        for audio_type, count in audio_by_type.items():
            print(f"      {audio_type.title()}: {count}")

        # Export information
        self._display_export_info(montage, args)

        return 0

    def _display_detailed_format(self, montage: VideoMontage, args: argparse.ArgumentParser) -> int:
        """Display detailed format output."""

        # Video clips breakdown
        if montage.video_clips:
            print(f"\n🎬 Video Clips Timeline:")
            for i, clip in enumerate(montage.video_clips, 1):
                end_time = clip.start_time + clip.duration
                print(f"   {i:2d}. {clip.shot_id} | {clip.start_time:.1f}s - {end_time:.1f}s ({clip.duration:.1f}s)")
                if clip.transition_in or clip.transition_out:
                    transitions = []
                    if clip.transition_in:
                        transitions.append(f"In: {clip.transition_in.value}")
                    if clip.transition_out:
                        transitions.append(f"Out: {clip.transition_out.value}")
                    print(f"       Transitions: {', '.join(transitions)}")

        # Audio tracks breakdown
        if montage.audio_tracks:
            print(f"\n🎵 Audio Tracks Timeline:")
            for i, track in enumerate(montage.audio_tracks, 1):
                end_time = track.start_time + track.duration
                print(f"   {i:2d}. {track.audio_type.title()} | {track.start_time:.1f}s - {end_time:.1f}s")
                print(f"       Volume: {track.volume_level:.1%} | Fade: {track.fade_in:.1f}s / {track.fade_out:.1f}s")

        # Transitions breakdown
        if montage.transitions:
            print(f"\n🔄 Transitions:")
            for i, transition in enumerate(montage.transitions, 1):
                trans_type = transition.get('type', 'cut').title()
                duration = transition.get('duration', 0)
                from_shot = transition.get('from_shot', 'unknown')
                to_shot = transition.get('to_shot', 'unknown')
                print(f"   {i:2d}. {trans_type} ({duration:.1f}s) | {from_shot} → {to_shot}")

        # Production notes
        if montage.production_notes:
            print(f"\n📋 Production Notes:")
            for note in montage.production_notes[:5]:  # Show first 5 notes
                print(f"   • {note}")

        # Export settings
        export_settings = montage.export_settings
        if export_settings:
            print(f"\n⚙️ Export Settings:")
            print(f"   Format: {export_settings.get('format', 'MP4')}")
            print(f"   Codec: {export_settings.get('codec', 'H.264')}")
            print(f"   Resolution: {export_settings.get('resolution', '1920x1080')}")
            print(f"   Quality: {export_settings.get('quality', 'high')}")

        # Export information
        self._display_export_info(montage, args)

        print(f"\n✅ Video montage plan created successfully!")
        print(f"   Use this plan with your video editing software to create the final video.")
        print(f"   Import the JSON plan into compatible editing applications.")

        return 0

    def _display_export_info(self, montage: VideoMontage, args: argparse.ArgumentParser) -> None:
        """Display export information."""
        print(f"\n💾 Files Created/Updated:")

        exports = [
            ("video_montage_plan.json", "Complete montage specification"),
            ("project.json", "Updated with montage metadata")
        ]

        if args.export_timeline:
            exports.append(("montage_timeline.json", "Detailed timeline breakdown"))

        if args.export_settings:
            exports.append(("export_settings.json", "Video export configuration"))

        for filename, description in exports:
            print(f"   • {filename} - {description}")

    def _export_additional_files(self, montage: VideoMontage, args: argparse.ArgumentParser) -> None:
        """Export additional files based on arguments."""
        # Export detailed timeline
        if args.export_timeline:
            timeline_data = {
                'montage_timeline': {
                    'montage_id': montage.montage_id,
                    'total_duration': montage.total_duration,
                    'timeline_elements': []
                }
            }

            # Add all timeline elements
            for clip in montage.video_clips:
                timeline_data['montage_timeline']['timeline_elements'].append({
                    'type': 'video',
                    'id': clip.clip_id,
                    'shot_id': clip.shot_id,
                    'start_time': clip.start_time,
                    'duration': clip.duration,
                    'end_time': clip.start_time + clip.duration
                })

            for track in montage.audio_tracks:
                timeline_data['montage_timeline']['timeline_elements'].append({
                    'type': 'audio',
                    'id': track.track_id,
                    'audio_type': track.audio_type,
                    'start_time': track.start_time,
                    'duration': track.duration,
                    'end_time': track.start_time + track.duration,
                    'volume': track.volume_level
                })

            for transition in montage.transitions:
                timeline_data['montage_timeline']['timeline_elements'].append({
                    'type': 'transition',
                    'id': transition['transition_id'],
                    'transition_type': transition['type'],
                    'start_time': transition['start_time'],
                    'duration': transition['duration'],
                    'end_time': transition['start_time'] + transition['duration']
                })

            with open("montage_timeline.json", 'w') as f:
                json.dump(timeline_data, f, indent=2)

        # Export export settings
        if args.export_settings and montage.export_settings:
            settings_data = {
                'export_settings': {
                    'montage_id': montage.montage_id,
                    'settings': montage.export_settings
                }
            }

            with open("export_settings.json", 'w') as f:
                json.dump(settings_data, f, indent=2)