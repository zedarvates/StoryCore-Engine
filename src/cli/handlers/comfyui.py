"""
ComfyUI command handler - Manage ComfyUI service.
"""

import argparse
import time
import webbrowser
from pathlib import Path

from ..base import BaseHandler
from ..errors import UserError, SystemError


class ComfyUIHandler(BaseHandler):
    """Handler for the comfyui command - ComfyUI service management."""
    
    command_name = "comfyui"
    description = "Manage ComfyUI service (start, stop, status, restart)"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up comfyui command arguments."""
        parser.add_argument(
            "comfyui_command",
            nargs="?",
            choices=["start", "stop", "status", "restart"],
            help="ComfyUI service command"
        )
        
        parser.add_argument(
            "--comfyui-url",
            default="http://127.0.0.1:8188",
            help="ComfyUI server URL (default: http://127.0.0.1:8188)"
        )
        
        parser.add_argument(
            "--open",
            action="store_true",
            help="Open ComfyUI in browser after starting"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the comfyui command."""
        try:
            # Import ComfyUI image engine
            try:
                from comfyui_image_engine import ComfyUIImageEngine
            except ImportError as e:
                raise SystemError(
                    f"ComfyUIImageEngine not available: {e}",
                    "Ensure comfyui_image_engine module is installed"
                )
            
            # Validate command
            if not args.comfyui_command:
                raise UserError(
                    "ComfyUI service command required",
                    "Available commands: start, stop, status, restart"
                )
            
            # Initialize engine
            engine = ComfyUIImageEngine(comfyui_url=args.comfyui_url)
            
            # Execute command
            if args.comfyui_command == "start":
                return self._start_service(engine, args)
            elif args.comfyui_command == "stop":
                return self._stop_service(engine, args)
            elif args.comfyui_command == "status":
                return self._show_status(engine, args)
            elif args.comfyui_command == "restart":
                return self._restart_service(engine, args)
            
        except Exception as e:
            return self.handle_error(e, "ComfyUI service management")
    
    def _start_service(self, engine, args: argparse.Namespace) -> int:
        """Start ComfyUI service."""
        print(f"Starting ComfyUI service at {args.comfyui_url}")
        
        success = engine.start_comfyui_service()
        
        if success:
            self.print_success("ComfyUI service started successfully")
            
            # Show service status
            status = engine.get_service_status()
            print(f"   Service State: {status['service_state']}")
            print(f"   Server URL: {status['server_url']}")
            print(f"   Port: {status['port']}")
            
            # Open in browser if requested
            if args.open:
                self._open_in_browser(status['server_url'])
            
            return 0
        else:
            self.print_error("Failed to start ComfyUI service")
            return 1
    
    def _stop_service(self, engine, args: argparse.Namespace) -> int:
        """Stop ComfyUI service."""
        print(f"Stopping ComfyUI service at {args.comfyui_url}")
        
        success = engine.stop_comfyui_service()
        
        if success:
            self.print_success("ComfyUI service stopped successfully")
            return 0
        else:
            self.print_error("Failed to stop ComfyUI service")
            return 1
    
    def _show_status(self, engine, args: argparse.Namespace) -> int:
        """Show ComfyUI service status."""
        print(f"Checking ComfyUI service status at {args.comfyui_url}")
        
        status = engine.get_service_status()
        
        print(f"\nComfyUI Service Status:")
        print(f"   Running: {'[YES]' if status['service_running'] else '[NO]'}")
        print(f"   State: {status['service_state']}")
        print(f"   Server URL: {status['server_url']}")
        print(f"   Port: {status['port']}")
        print(f"   Mock Mode: {'[YES]' if status['mock_mode'] else '[NO]'}")
        print(f"   Service Available: {'[YES]' if status['service_available'] else '[NO]'}")
        
        if status.get('last_health_check'):
            print(f"   Last Health Check: {status['last_health_check']}")
        
        if status.get('uptime_seconds'):
            print(f"   Uptime: {status['uptime_seconds']:.1f} seconds")
        
        if status.get('error_message'):
            print(f"   Error: {status['error_message']}")
        
        return 0
    
    def _restart_service(self, engine, args: argparse.Namespace) -> int:
        """Restart ComfyUI service."""
        print(f"Restarting ComfyUI service at {args.comfyui_url}")
        
        # Stop first
        print("Stopping service...")
        stop_success = engine.stop_comfyui_service()
        
        if not stop_success:
            self.print_error("Failed to restart ComfyUI service (stop failed)")
            return 1
        
        # Wait a moment
        time.sleep(2)
        
        # Start again
        print("Starting service...")
        start_success = engine.start_comfyui_service()
        
        if start_success:
            self.print_success("ComfyUI service restarted successfully")
            
            # Show service status
            status = engine.get_service_status()
            print(f"   Service State: {status['service_state']}")
            print(f"   Server URL: {status['server_url']}")
            print(f"   Port: {status['port']}")
            
            return 0
        else:
            self.print_error("Failed to restart ComfyUI service (start failed)")
            return 1
    
    def _open_in_browser(self, url: str) -> None:
        """Open ComfyUI in default web browser."""
        try:
            webbrowser.open(url)
            print(f"  Opened ComfyUI in browser: {url}")
        except Exception as e:
            self.logger.warning(f"Failed to open browser: {e}")
            print(f"  ⚠️  Could not open browser automatically")
            print(f"  Open manually: {url}")
