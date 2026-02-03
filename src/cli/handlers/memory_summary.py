"""
Memory Summary command handler - Generate summaries of memory system state.
"""

import argparse
import json
from pathlib import Path
from typing import Dict, Any

from ..base import BaseHandler
from ..errors import UserError, SystemError


class MemorySummaryHandler(BaseHandler):
    """Handler for the memory summary command - memory system summarization."""

    command_name = "memory-summary"
    description = "Generate summaries of memory system state"
    aliases = ["memory-summary", "mem-summary"]

    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up memory summary command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )

        parser.add_argument(
            "--type",
            choices=["overview", "discussions", "assets", "memory", "all"],
            default="overview",
            help="Type of summary to generate (default: overview)"
        )

        parser.add_argument(
            "--format",
            choices=["human", "json", "markdown"],
            default="human",
            help="Output format (default: human)"
        )

        parser.add_argument(
            "--limit",
            type=int,
            default=10,
            help="Limit number of items in summary (default: 10)"
        )

    def execute(self, args: argparse.Namespace) -> int:
        """Execute the memory summary command."""
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

            # Generate requested summary
            summary_type = args.type
            summary_result = {}

            if summary_type in ["overview", "all"]:
                summary_result["overview"] = self._generate_overview_summary(memory_system, args.limit)

            if summary_type in ["discussions", "all"]:
                summary_result["discussions"] = self._generate_discussion_summary(memory_system, args.limit)

            if summary_type in ["assets", "all"]:
                summary_result["assets"] = self._generate_asset_summary(memory_system, args.limit)

            if summary_type in ["memory", "all"]:
                summary_result["memory"] = self._generate_memory_summary(memory_system, args.limit)

            # Output results
            if args.format == "json":
                print(json.dumps(summary_result, indent=2))
            elif args.format == "markdown":
                self._print_markdown_results(summary_result, args)
            else:
                self._print_human_results(summary_result, args)

            return 0

        except Exception as e:
            return self.handle_error(e, "memory summary")

    def _generate_overview_summary(self, memory_system: 'MemorySystemCore', limit: int) -> Dict[str, Any]:
        """Generate project overview summary."""
        try:
            context = memory_system.get_project_context()
            if context is None:
                return {"error": "Could not generate project context"}

            # Get status
            status = memory_system.get_status()

            return {
                "project_name": context.config.project_name,
                "project_type": context.config.project_type,
                "objectives_count": len(context.memory.objectives),
                "entities_count": len(context.memory.entities),
                "decisions_count": len(context.memory.decisions),
                "validation_valid": status.get("validation_valid", False),
                "errors_count": status.get("errors_count", 0),
                "qa_score": status.get("qa_score"),
                "last_activity": status.get("last_activity")
            }

        except Exception as e:
            return {"error": f"Failed to generate overview: {str(e)}"}

    def _generate_discussion_summary(self, memory_system: 'MemorySystemCore', limit: int) -> Dict[str, Any]:
        """Generate discussion summary."""
        try:
            discussions = memory_system.discussion_manager.get_discussion_history(limit)
            summary = memory_system.summarization_engine.summarize_discussion(
                "\n".join([str(d) for d in discussions]),
                max_points=limit
            )

            return {
                "discussions_count": len(discussions),
                "summary": summary
            }

        except Exception as e:
            return {"error": f"Failed to generate discussion summary: {str(e)}"}

    def _generate_asset_summary(self, memory_system: 'MemorySystemCore', limit: int) -> Dict[str, Any]:
        """Generate asset summary."""
        try:
            assets = memory_system.asset_manager.get_asset_index()
            summary = memory_system.summarization_engine.summarize_assets(assets)

            return {
                "assets_count": len(assets),
                "summary": summary
            }

        except Exception as e:
            return {"error": f"Failed to generate asset summary: {str(e)}"}

    def _generate_memory_summary(self, memory_system: 'MemorySystemCore', limit: int) -> Dict[str, Any]:
        """Generate memory summary."""
        try:
            memory = memory_system.memory_manager.load_memory()
            if memory is None:
                return {"error": "Memory not found"}

            return {
                "objectives": memory.objectives[:limit],
                "entities": memory.entities[:limit],
                "decisions": memory.decisions[:limit],
                "constraints": memory.constraints[:limit],
                "current_state": memory.current_state
            }

        except Exception as e:
            return {"error": f"Failed to generate memory summary: {str(e)}"}

    def _print_human_results(self, results: Dict[str, Any], args: argparse.Namespace) -> None:
        """Print human-readable summary results."""
        print(f"Memory System Summary: {Path(args.project).absolute()}")
        print()

        if "overview" in results:
            self._print_overview_summary(results["overview"])

        if "discussions" in results:
            self._print_discussion_summary(results["discussions"])

        if "assets" in results:
            self._print_asset_summary(results["assets"])

        if "memory" in results:
            self._print_memory_summary(results["memory"])

    def _print_overview_summary(self, overview: Dict[str, Any]) -> None:
        """Print overview summary."""
        print("PROJECT OVERVIEW")
        print("=" * 40)
        print(f"Name: {overview.get('project_name', 'Unknown')}")
        print(f"Type: {overview.get('project_type', 'Unknown')}")
        print(f"Objectives: {overview.get('objectives_count', 0)}")
        print(f"Entities: {overview.get('entities_count', 0)}")
        print(f"Decisions: {overview.get('decisions_count', 0)}")
        print(f"Validation: {'Valid' if overview.get('validation_valid', False) else 'Invalid'}")
        print(f"Errors: {overview.get('errors_count', 0)}")
        print(f"QA Score: {overview.get('qa_score', 'N/A')}")
        print(f"Last Activity: {overview.get('last_activity', 'Unknown')}")
        print()

    def _print_discussion_summary(self, discussions: Dict[str, Any]) -> None:
        """Print discussion summary."""
        print("DISCUSSION SUMMARY")
        print("=" * 40)
        print(f"Discussions: {discussions.get('discussions_count', 0)}")
        print()
        if "summary" in discussions:
            print(discussions["summary"])
        else:
            print("No discussion summary available")
        print()

    def _print_asset_summary(self, assets: Dict[str, Any]) -> None:
        """Print asset summary."""
        print("ASSET SUMMARY")
        print("=" * 40)
        print(f"Assets: {assets.get('assets_count', 0)}")
        print()
        if "summary" in assets:
            print(assets["summary"])
        else:
            print("No asset summary available")
        print()

    def _print_memory_summary(self, memory: Dict[str, Any]) -> None:
        """Print memory summary."""
        print("MEMORY SUMMARY")
        print("=" * 40)

        if "error" in memory:
            print(f"Error: {memory['error']}")
            return

        print("OBJECTIVES:")
        for obj in memory.get("objectives", []):
            print(f"  • {obj.get('description', 'Unknown')}")
        print()

        print("ENTITIES:")
        for entity in memory.get("entities", []):
            print(f"  • {entity.get('name', 'Unknown')} ({entity.get('type', 'unknown')})")
        print()

        print("DECISIONS:")
        for decision in memory.get("decisions", []):
            print(f"  • {decision.get('description', 'Unknown')}")
        print()

        print("CONSTRAINTS:")
        for constraint in memory.get("constraints", []):
            print(f"  • {constraint.get('description', 'Unknown')}")
        print()

        print("CURRENT STATE:")
        current_state = memory.get("current_state", {})
        print(f"  Phase: {current_state.get('phase', 'Unknown')}")
        print(f"  Progress: {current_state.get('progress_percentage', 0)}%")
        print(f"  Last Activity: {current_state.get('last_activity', 'Unknown')}")
        print()

    def _print_markdown_results(self, results: Dict[str, Any], args: argparse.Namespace) -> None:
        """Print markdown-formatted summary results."""
        print(f"# Memory System Summary: {Path(args.project).absolute()}")
        print()

        if "overview" in results:
            self._print_overview_markdown(results["overview"])

        if "discussions" in results:
            self._print_discussion_markdown(results["discussions"])

        if "assets" in results:
            self._print_asset_markdown(results["assets"])

        if "memory" in results:
            self._print_memory_markdown(results["memory"])

    def _print_overview_markdown(self, overview: Dict[str, Any]) -> None:
        """Print overview summary in markdown."""
        print("## Project Overview")
        print()
        print(f"- **Name**: {overview.get('project_name', 'Unknown')}")
        print(f"- **Type**: {overview.get('project_type', 'Unknown')}")
        print(f"- **Objectives**: {overview.get('objectives_count', 0)}")
        print(f"- **Entities**: {overview.get('entities_count', 0)}")
        print(f"- **Decisions**: {overview.get('decisions_count', 0)}")
        print(f"- **Validation**: {'Valid' if overview.get('validation_valid', False) else 'Invalid'}")
        print(f"- **Errors**: {overview.get('errors_count', 0)}")
        print(f"- **QA Score**: {overview.get('qa_score', 'N/A')}")
        print(f"- **Last Activity**: {overview.get('last_activity', 'Unknown')}")
        print()

    def _print_discussion_markdown(self, discussions: Dict[str, Any]) -> None:
        """Print discussion summary in markdown."""
        print("## Discussion Summary")
        print()
        print(f"**Discussions**: {discussions.get('discussions_count', 0)}")
        print()
        if "summary" in discussions:
            print("```")
            print(discussions["summary"])
            print("```")
        else:
            print("No discussion summary available")
        print()

    def _print_asset_markdown(self, assets: Dict[str, Any]) -> None:
        """Print asset summary in markdown."""
        print("## Asset Summary")
        print()
        print(f"**Assets**: {assets.get('assets_count', 0)}")
        print()
        if "summary" in assets:
            print("```")
            print(assets["summary"])
            print("```")
        else:
            print("No asset summary available")
        print()

    def _print_memory_markdown(self, memory: Dict[str, Any]) -> None:
        """Print memory summary in markdown."""
        print("## Memory Summary")
        print()

        if "error" in memory:
            print(f"**Error**: {memory['error']}")
            return

        print("### Objectives")
        print()
        for obj in memory.get("objectives", []):
            print(f"- {obj.get('description', 'Unknown')}")
        print()

        print("### Entities")
        print()
        for entity in memory.get("entities", []):
            print(f"- {entity.get('name', 'Unknown')} ({entity.get('type', 'unknown')})")
        print()

        print("### Decisions")
        print()
        for decision in memory.get("decisions", []):
            print(f"- {decision.get('description', 'Unknown')}")
        print()

        print("### Constraints")
        print()
        for constraint in memory.get("constraints", []):
            print(f"- {constraint.get('description', 'Unknown')}")
        print()

        print("### Current State")
        print()
        current_state = memory.get("current_state", {})
        print(f"- **Phase**: {current_state.get('phase', 'Unknown')}")
        print(f"- **Progress**: {current_state.get('progress_percentage', 0)}%")
        print(f"- **Last Activity**: {current_state.get('last_activity', 'Unknown')}")
        print()