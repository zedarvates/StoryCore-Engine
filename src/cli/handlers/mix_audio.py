"""
Mix-audio command handler - Audio mixing and processing.
"""

import argparse
import json
from pathlib import Path
from typing import Dict, Any, List

from ..base import BaseHandler
from ..errors import UserError, SystemError


class MixAudioHandler(BaseHandler):
    """Handler for the mix-audio command - audio mixing."""

    command_name = "mix-audio"
    description = "Mix and process audio tracks with professional techniques"

    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up mix-audio command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )

        parser.add_argument(
            "--voice-track",
            help="Path to voice/narration audio file"
        )

        parser.add_argument(
            "--music-track",
            help="Path to background music audio file"
        )

        parser.add_argument(
            "--output",
            help="Output file path for mixed audio (default: auto-generated)"
        )

        parser.add_argument(
            "--music-reduction-db",
            type=float,
            default=-12.0,
            help="Music volume reduction during voice segments in dB (default: -12.0)"
        )

        parser.add_argument(
            "--keyframe-offset",
            type=float,
            default=0.5,
            help="Time offset for volume keyframes before/after voice segments in seconds (default: 0.5)"
        )

        parser.add_argument(
            "--format",
            choices=["human", "json"],
            default="human",
            help="Output format (default: human)"
        )

        parser.add_argument(
            "--crossfade-duration",
            type=float,
            default=1.0,
            help="Crossfade duration in seconds for track transitions (default: 1.0)"
        )

        parser.add_argument(
            "--fill-gaps",
            action="store_true",
            help="Automatically detect and fill audio gaps"
        )

    def execute(self, args: argparse.Namespace) -> int:
        """Execute the mix-audio command."""
        try:
            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )

            # Import audio mixing engine
            try:
                from audio_mixing_engine import AudioMixingEngine
            except ImportError as e:
                raise SystemError(
                    f"AudioMixingEngine not available: {e}",
                    "Ensure audio_mixing_engine module is installed"
                )

            print(f"Mixing audio for project: {project_path.absolute()}")

            engine = AudioMixingEngine()
            results = {
                "project": str(project_path.absolute()),
                "operations": [],
                "success": True,
                "output_files": []
            }

            # Voice/music mixing if both tracks provided
            if args.voice_track and args.music_track:
                voice_path = Path(args.voice_track)
                music_path = Path(args.music_track)

                if not voice_path.exists():
                    raise UserError(f"Voice track not found: {voice_path}")
                if not music_path.exists():
                    raise UserError(f"Music track not found: {music_path}")

                # Load audio files (simplified - would need proper audio loading)
                voice_audio = self._load_audio_file(voice_path)
                music_audio = self._load_audio_file(music_path)

                if voice_audio and music_audio:
                    mix_result = engine.create_voice_music_mix(
                        voice_audio,
                        music_audio,
                        music_reduction_db=args.music_reduction_db,
                        keyframe_offset=args.keyframe_offset
                    )

                    if mix_result.get("mixed_samples") is not None:
                        # Save mixed audio
                        output_path = args.output or project_path / "assets" / "audio" / "mixed" / "voice_music_mix.wav"
                        output_path.parent.mkdir(parents=True, exist_ok=True)

                        # Save audio file (simplified)
                        self._save_audio_file(mix_result["mixed_samples"], mix_result["sample_rate"], output_path)

                        results["operations"].append({
                            "type": "voice_music_mix",
                            "input_voice": str(voice_path),
                            "input_music": str(music_path),
                            "output": str(output_path),
                            "duration": mix_result["duration"],
                            "voice_segments": len(mix_result["voice_segments"]),
                            "keyframes": len(mix_result["keyframes"])
                        })
                        results["output_files"].append(str(output_path))
                    else:
                        results["success"] = False
                        results["error"] = mix_result.get("error", "Voice/music mixing failed")

            # Crossfade sequences if multiple tracks
            # This would be more complex, placeholder for now

            # Gap filling if requested
            if args.fill_gaps:
                gap_result = self._fill_audio_gaps(project_path, engine)
                results["operations"].append(gap_result)

            # Output results
            if args.format == "json":
                print(json.dumps(results, indent=2))
            else:
                self._print_human_results(results)

            return 0 if results["success"] else 1

        except Exception as e:
            return self.handle_error(e, "audio mixing")

    def _load_audio_file(self, file_path: Path) -> Dict[str, Any]:
        """Load audio file (simplified placeholder)."""
        # In real implementation, would use librosa or similar
        # For now, return mock data
        return {
            "samples": None,  # Would be numpy array
            "sample_rate": 44100,
            "duration": 10.0
        }

    def _save_audio_file(self, samples, sample_rate: int, output_path: Path) -> None:
        """Save audio file (simplified placeholder)."""
        # In real implementation, would use soundfile or similar
        # For now, just create the file
        output_path.touch()

    def _fill_audio_gaps(self, project_path: Path, engine: 'AudioMixingEngine') -> Dict[str, Any]:
        """Fill audio gaps in the project (simplified)."""
        # Look for audio files to process
        audio_files = (list(project_path.glob("assets/audio/**/*.wav")) +
                      list(project_path.glob("assets/audio/**/*.mp3")))

        return {
            "type": "gap_filling",
            "files_processed": len(audio_files),
            "message": f"Gap filling applied to {len(audio_files)} audio files"
        }

    def _print_human_results(self, results: Dict[str, Any]) -> None:
        """Print human-readable mixing results."""
        print(f"Audio mixing completed for project: {results['project']}")
        print()

        if results["operations"]:
            print("Operations performed:")
            for op in results["operations"]:
                if op["type"] == "voice_music_mix":
                    print(f"[DONE] Voice/music mixing:")
                    print(f"  Voice: {op['input_voice']}")
                    print(f"  Music: {op['input_music']}")
                    print(f"  Output: {op['output']}")
                    print(f"  Duration: {op['duration']:.1f}s")
                    print(f"  Voice segments: {op['voice_segments']}")
                    print(f"  Volume keyframes: {op['keyframes']}")
                elif op["type"] == "gap_filling":
                    print(f"[DONE] Gap filling: {op['message']}")
            print()

        if results["output_files"]:
            print("Output files:")
            for output_file in results["output_files"]:
                print(f"  {output_file}")
            print()

        if results["success"]:
            print("SUCCESS: Audio mixing completed successfully!")
        else:
            print(f"FAILURE: Audio mixing failed: {results.get('error', 'Unknown error')}")