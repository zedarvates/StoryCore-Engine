"""
Synchronization command handler for StoryCore CLI.
"""

import argparse
from pathlib import Path
from src.synchronization_manager import RealTimeSyncService


class SyncHandler:
    """Handler for synchronization commands."""

    command_name = "sync"
    description = "Manage real-time synchronization between sequence plans and recordings"

    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up synchronization command arguments."""
        subparsers = parser.add_subparsers(dest="sync_command", help="Synchronization commands")

        # Start synchronization
        start_parser = subparsers.add_parser("start", help="Start real-time synchronization")
        start_parser.add_argument("--project", type=str, help="Project directory path")

        # Stop synchronization
        stop_parser = subparsers.add_parser("stop", help="Stop real-time synchronization")
        stop_parser.add_argument("--project", type=str, help="Project directory path")

        # Status command
        status_parser = subparsers.add_parser("status", help="Get synchronization status")
        status_parser.add_argument("--project", type=str, help="Project directory path")

        # Manual sync command
        sync_parser = subparsers.add_parser("now", help="Trigger manual synchronization")
        sync_parser.add_argument("--project", type=str, help="Project directory path")

    def execute(self, args: argparse.Namespace) -> int:
        """Execute synchronization commands."""
        try:
            project_path = Path(args.project) if args.project else Path.cwd()
            
            if not project_path.exists():
                print(f"Error: Project directory not found: {project_path}")
                return 1

            sync_service = RealTimeSyncService(project_path)

            if args.sync_command == "start":
                result = sync_service.start_service()
                print(f"Synchronization started: {result['message']}")
                return 0

            elif args.sync_command == "stop":
                result = sync_service.stop_service()
                print(f"Synchronization stopped: {result['message']}")
                return 0

            elif args.sync_command == "status":
                status = sync_service.get_status()
                print(f"Service Status: {status['service_status']}")
                print(f"Sync Status: {status['sync_status']['status']}")
                print(f"Last Sync: {status['sync_status'].get('last_sync', 'Never')}")
                return 0

            elif args.sync_command == "now":
                result = sync_service.trigger_sync()
                if result["success"]:
                    print(f"Synchronization completed: {result['message']}")
                else:
                    print(f"Synchronization failed: {result['message']}")
                return 0 if result["success"] else 1

            else:
                print("Invalid synchronization command")
                return 1

        except Exception as e:
            print(f"Error during synchronization: {str(e)}")
            return 1