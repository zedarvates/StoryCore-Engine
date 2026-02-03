"""
Memory Export command handler - Export memory system data and state.
"""

import argparse
import json
from pathlib import Path
from typing import Dict, Any, List
import shutil
import zipfile
import tarfile

from ..base import BaseHandler
from ..errors import UserError, SystemError


class MemoryExportHandler(BaseHandler):
    """Handler for the memory export command - memory system export."""

    command_name = "memory-export"
    description = "Export memory system data and state"
    aliases = ["memory-export", "mem-export"]

    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up memory export command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )

        parser.add_argument(
            "--output", "-o",
            help="Output directory or file for export"
        )

        parser.add_argument(
            "--format",
            choices=["directory", "zip", "tar"],
            default="directory",
            help="Export format (default: directory)"
        )

        parser.add_argument(
            "--scope",
            nargs="+",
            choices=["memory", "discussions", "assets", "config", "all"],
            default=["all"],
            help="Export scope (default: all)"
        )

        parser.add_argument(
            "--include-summaries",
            action="store_true",
            help="Include generated summaries in export"
        )

    def execute(self, args: argparse.Namespace) -> int:
        """Execute the memory export command."""
        try:
            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )

            # Import memory system
            try:
                from memory_system import MemorySystemCore
            except ImportError as e:
                raise SystemError(
                    f"Memory system not available: {e}",
                    "Ensure memory_system module is installed"
                )

            # Initialize memory system
            memory_system = MemorySystemCore(project_path)

            # Determine output path
            if args.output:
                output_path = Path(args.output)
            else:
                output_path = project_path / "memory_export"

            # Create export directory
            export_dir = output_path
            if args.format == "directory":
                export_dir.mkdir(parents=True, exist_ok=True)
            else:
                # For archive formats, create temporary directory
                export_dir = output_path.parent / f"{output_path.stem}_temp"
                export_dir.mkdir(parents=True, exist_ok=True)

            # Determine export scope
            scopes = args.scope if isinstance(args.scope, list) else [args.scope]

            # Export requested data
            export_results = {
                "project": str(project_path.absolute()),
                "output": str(output_path.absolute()),
                "format": args.format,
                "scopes": scopes,
                "exported_files": []
            }

            if "memory" in scopes or "all" in scopes:
                memory_files = self._export_memory(memory_system, export_dir)
                export_results["exported_files"].extend(memory_files)

            if "discussions" in scopes or "all" in scopes:
                discussion_files = self._export_discussions(memory_system, export_dir, args.include_summaries)
                export_results["exported_files"].extend(discussion_files)

            if "assets" in scopes or "all" in scopes:
                asset_files = self._export_assets(memory_system, export_dir)
                export_results["exported_files"].extend(asset_files)

            if "config" in scopes or "all" in scopes:
                config_files = self._export_config(memory_system, export_dir)
                export_results["exported_files"].extend(config_files)

            # Create archive if requested
            if args.format != "directory":
                archive_path = self._create_archive(export_dir, output_path, args.format)
                export_results["archive_path"] = str(archive_path)
                
                # Clean up temporary directory
                shutil.rmtree(export_dir)
                export_dir = archive_path

            # Output results
            print(f"Memory System Export Complete")
            print(f"Project: {export_results['project']}")
            print(f"Output: {export_results['output']}")
            print(f"Format: {export_results['format']}")
            print(f"Scopes: {', '.join(export_results['scopes'])}")
            print(f"Files exported: {len(export_results['exported_files'])}")
            print()
            print("Exported files:")
            for file_path in export_results['exported_files']:
                print(f"  • {file_path}")

            return 0

        except Exception as e:
            return self.handle_error(e, "memory export")

    def _export_memory(self, memory_system: 'MemorySystemCore', export_dir: Path) -> List[str]:
        """Export memory system data."""
        exported_files = []

        try:
            # Export memory.json
            memory_path = memory_system.project_path / "assistant" / "memory.json"
            if memory_path.exists():
                dest_path = export_dir / "memory" / "memory.json"
                dest_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy(memory_path, dest_path)
                exported_files.append(str(dest_path.relative_to(export_dir)))

            # Export variables.json
            variables_path = memory_system.project_path / "assistant" / "variables.json"
            if variables_path.exists():
                dest_path = export_dir / "memory" / "variables.json"
                dest_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy(variables_path, dest_path)
                exported_files.append(str(dest_path.relative_to(export_dir)))

        except Exception as e:
            self.logger.warning(f"Failed to export memory: {e}")

        return exported_files

    def _export_discussions(self, memory_system: 'MemorySystemCore', export_dir: Path, include_summaries: bool) -> List[str]:
        """Export discussion data."""
        exported_files = []

        try:
            # Export raw discussions
            discussions_dir = memory_system.project_path / "assistant" / "discussions_raw"
            if discussions_dir.exists():
                dest_dir = export_dir / "discussions" / "raw"
                dest_dir.mkdir(parents=True, exist_ok=True)
                
                for file_path in discussions_dir.glob("*.json"):
                    dest_path = dest_dir / file_path.name
                    shutil.copy(file_path, dest_path)
                    exported_files.append(str(dest_path.relative_to(export_dir)))

            # Export discussion summaries if requested
            if include_summaries:
                summaries_dir = memory_system.project_path / "assistant" / "discussions_summary"
                if summaries_dir.exists():
                    dest_dir = export_dir / "discussions" / "summaries"
                    dest_dir.mkdir(parents=True, exist_ok=True)
                    
                    for file_path in summaries_dir.glob("*.json"):
                        dest_path = dest_dir / file_path.name
                        shutil.copy(file_path, dest_path)
                        exported_files.append(str(dest_path.relative_to(export_dir)))

        except Exception as e:
            self.logger.warning(f"Failed to export discussions: {e}")

        return exported_files

    def _export_assets(self, memory_system: 'MemorySystemCore', export_dir: Path) -> List[str]:
        """Export asset data."""
        exported_files = []

        try:
            # Export asset index
            assets_dir = memory_system.project_path / "assets"
            if assets_dir.exists():
                # Copy asset files
                for ext in ['*.jpg', '*.jpeg', '*.png', '*.gif', '*.mp4', '*.avi', '*.mov', '*.mp3', '*.wav', '*.flac']:
                    for file_path in assets_dir.glob(ext):
                        dest_path = export_dir / "assets" / file_path.name
                        dest_path.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy(file_path, dest_path)
                        exported_files.append(str(dest_path.relative_to(export_dir)))

        except Exception as e:
            self.logger.warning(f"Failed to export assets: {e}")

        return exported_files

    def _export_config(self, memory_system: 'MemorySystemCore', export_dir: Path) -> List[str]:
        """Export configuration data."""
        exported_files = []

        try:
            # Export project config
            config_path = memory_system.project_path / "project_config.json"
            if config_path.exists():
                dest_path = export_dir / "config" / "project_config.json"
                dest_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy(config_path, dest_path)
                exported_files.append(str(dest_path.relative_to(export_dir)))

        except Exception as e:
            self.logger.warning(f"Failed to export config: {e}")

        return exported_files

    def _create_archive(self, source_dir: Path, output_path: Path, format: str) -> Path:
        """Create archive from exported files."""
        try:
            if format == "zip":
                with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    for file_path in source_dir.rglob('*'):
                        if file_path.is_file():
                            arcname = file_path.relative_to(source_dir)
                            zipf.write(file_path, arcname)

            elif format == "tar":
                with tarfile.open(output_path, 'w:gz') as tar:
                    for file_path in source_dir.rglob('*'):
                        if file_path.is_file():
                            arcname = file_path.relative_to(source_dir)
                            tar.add(file_path, arcname)

            return output_path

        except Exception as e:
            self.logger.error(f"Failed to create archive: {e}")
            raise SystemError(f"Archive creation failed: {e}")