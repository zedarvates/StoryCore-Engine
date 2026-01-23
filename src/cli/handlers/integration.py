#!/usr/bin/env python3
"""
CLI Integration Handler
Handles integration-related commands for StoryCore components.
"""

import argparse
import asyncio
from typing import Dict, Any

from src.integration.integration_manager import create_integration_manager


class IntegrationHandler:
    """
    CLI handler for integration commands.
    
    Provides commands to manage component integration and services.
    """
    
    def __init__(self):
        """Initialize the integration handler."""
        self.manager = create_integration_manager()
    
    def register_commands(self, subparsers) -> None:
        """
        Register integration commands with the CLI parser.
        
        Args:
            subparsers: Argument parser subparsers object
        """
        # Integration status command
        status_parser = subparsers.add_parser(
            'integration-status',
            help='Show current integration status of all components'
        )
        status_parser.set_defaults(handler=self.handle_integration_status)
        
        # Integrate components command
        integrate_parser = subparsers.add_parser(
            'integrate',
            help='Integrate all StoryCore components'
        )
        integrate_parser.add_argument(
            '--audio-config',
            help='Audio engine configuration file'
        )
        integrate_parser.add_argument(
            '--3d-config',
            help='3D rendering engine configuration file'
        )
        integrate_parser.add_argument(
            '--http-config',
            help='HTTP server configuration file'
        )
        integrate_parser.set_defaults(handler=self.handle_integrate)
        
        # Start services command
        start_parser = subparsers.add_parser(
            'start-services',
            help='Start all integrated services'
        )
        start_parser.set_defaults(handler=self.handle_start_services)
        
        # Stop services command
        stop_parser = subparsers.add_parser(
            'stop-services',
            help='Stop all running services'
        )
        stop_parser.set_defaults(handler=self.handle_stop_services)
    
    def handle_integration_status(self, args) -> int:
        """
        Handle integration status command.
        
        Args:
            args: Command arguments
            
        Returns:
            Exit code (0 for success)
        """
        print("🔧 StoryCore Integration Status")
        print("=" * 40)
        
        status = self.manager.get_integration_status()
        
        for component, stat in status.items():
            symbol = "✓" if stat == 'initialized' else "✗"
            print(f"{symbol} {component.capitalize()}: {stat}")
        
        return 0
    
    def handle_integrate(self, args) -> int:
        """
        Handle integrate command.
        
        Args:
            args: Command arguments
            
        Returns:
            Exit code (0 for success, 1 for failure)
        """
        print("🔧 Integrating StoryCore Components")
        print("=" * 40)
        
        # Load configurations if provided
        audio_config = self._load_config(args.audio_config) if args.audio_config else None
        rendering_config = self._load_config(args._3d_config) if args._3d_config else None
        http_config = self._load_config(args.http_config) if args.http_config else None
        
        # Integrate components
        status = self.manager.integrate_components()
        
        # Show results
        success_count = sum(1 for stat in status.values() if stat == 'initialized')
        total_components = len(status)
        
        print(f"\nIntegration Results: {success_count}/{total_components} components initialized")
        
        for component, stat in status.items():
            symbol = "✓" if stat == 'initialized' else "✗"
            print(f"{symbol} {component.capitalize()}: {stat}")
        
        return 0 if success_count == total_components else 1
    
    async def handle_start_services(self, args) -> int:
        """
        Handle start services command.
        
        Args:
            args: Command arguments
            
        Returns:
            Exit code (0 for success, 1 for failure)
        """
        print("🚀 Starting StoryCore Services")
        print("=" * 40)
        
        try:
            if await self.manager.start_services():
                print("✓ All services started successfully")
                return 0
            else:
                print("✗ Failed to start services")
                return 1
        except Exception as e:
            print(f"✗ Error starting services: {e}")
            return 1
    
    def handle_stop_services(self, args) -> int:
        """
        Handle stop services command.
        
        Args:
            args: Command arguments
            
        Returns:
            Exit code (0 for success)
        """
        print("🛑 Stopping StoryCore Services")
        print("=" * 40)
        
        self.manager.shutdown()
        print("✓ All services stopped")
        
        return 0
    
    def _load_config(self, config_file: str) -> Dict[str, Any]:
        """
        Load configuration from file.
        
        Args:
            config_file: Path to configuration file
            
        Returns:
            Dictionary with configuration data
        """
        import json
        
        try:
            with open(config_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠ Warning: Failed to load config {config_file}: {e}")
            return {}


def create_integration_handler() -> IntegrationHandler:
    """
    Factory function to create integration handler.
    
    Returns:
        Initialized IntegrationHandler instance
    """
    return IntegrationHandler()