"""
StoryCore API Server - Simple HTTP Demo API
Provides REST endpoints for StoryCore-Engine dashboard functionality.

Author: StoryCore-Engine Team
Date: 2026-01-15
"""

import json
import time
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
import urllib.parse
import threading

class APIRequestHandler(BaseHTTPRequestHandler):
    """Custom request handler for StoryCore API endpoints."""

    def do_GET(self):
        """Handle GET requests."""
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        # Set CORS headers
        self.send_cors_headers()

        if path == '/health':
            self.send_json_response(200, {
                "status": "healthy",
                "timestamp": datetime.utcnow().isoformat(),
                "version": "1.0.0"
            })
        elif path == '/projects':
            projects = [{
                "id": "demo-project",
                "name": "StoryCore-Engine Demo",
                "path": "./demo-project",
                "status": "completed",
                "created_at": datetime.utcnow().isoformat()
            }]
            self.send_json_response(200, projects)
        elif path.startswith('/projects/') and '/' not in path[10:]:
            # /projects/{project_id}
            self.send_json_response(200, PROJECT_DATA)
        else:
            self.send_json_response(404, {"error": "Not found"})

    def do_POST(self):
        """Handle POST requests."""
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        # Set CORS headers
        self.send_cors_headers()

        # Get request body
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
        except:
            data = {}

        if path.startswith('/projects/') and path.endswith('/export'):
            # /projects/{project_id}/export
            project_id = path.split('/')[2]
            output_dir = data.get('output_dir', 'exports')

            # Simulate export process
            time.sleep(1)

            response = {
                "export_id": "demo_export_id",
                "status": "completed",
                "export_path": f"./{output_dir}/storycore-export-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}",
                "message": f"Project {project_id} exported successfully"
            }
            self.send_json_response(200, response)

        elif '/panels/' in path and path.endswith('/repromote'):
            # /projects/{project_id}/panels/{panel_id}/repromote
            parts = path.split('/')
            project_id = parts[2]
            panel_id = parts[4]

            denoising_strength = data.get('denoising_strength', 0.35)
            sharpen_amount = data.get('sharpen_amount', 1.2)

            # Simulate processing time
            time.sleep(2)

            response = {
                "panel_id": panel_id,
                "status": "completed",
                "new_sharpness_score": 145.2,
                "processing_time_seconds": 2.1,
                "parameters_used": {
                    "denoising_strength": denoising_strength,
                    "sharpen_amount": sharpen_amount
                },
                "message": f"Panel {panel_id} re-promoted successfully"
            }
            self.send_json_response(200, response)

        else:
            self.send_json_response(404, {"error": "Not found"})

    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS."""
        self.send_cors_headers()
        self.end_headers()

    def send_cors_headers(self):
        """Send CORS headers."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Content-Type', 'application/json')

    def send_json_response(self, status_code, data):
        """Send JSON response."""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def log_message(self, format, *args):
        """Override to reduce log verbosity."""
        pass

# Mock project data
PROJECT_DATA = {
    "project_name": "StoryCore-Engine Demo",
    "global_seed": 42,
    "duration_seconds": 27,
    "genre": "Cinematic Drama",
    "style_anchor": "STYLE_CINE_REALISM_V1",
    "grid_specification": "3x3",
    "qa_score": 4.2,
    "panels": [
        {
            "panel_id": "panel_01",
            "status": "ok",
            "sharpness_score": 112.4
        },
        {
            "panel_id": "panel_02",
            "status": "ok",
            "sharpness_score": 98.7
        },
        {
            "panel_id": "panel_03",
            "status": "processing",
            "sharpness_score": 0
        },
        {
            "panel_id": "panel_04",
            "status": "auto_fixed",
            "sharpness_score": 71.8,
            "initial_sharpness": 42.3,
            "improvement_delta": 29.5,
            "autofix_log": {
                "denoising_adjustment": -0.05,
                "sharpen_adjustment": 0.15,
                "applied_rules": ["under_sharpened_correction"]
            }
        },
        {
            "panel_id": "panel_05",
            "status": "ok",
            "sharpness_score": 134.2
        },
        {
            "panel_id": "panel_06",
            "status": "ok",
            "sharpness_score": 89.3
        },
        {
            "panel_id": "panel_07",
            "status": "processing",
            "sharpness_score": 0
        },
        {
            "panel_id": "panel_08",
            "status": "ok",
            "sharpness_score": 156.7
        },
        {
            "panel_id": "panel_09",
            "status": "ok",
            "sharpness_score": 143.1
        }
    ]
}

def run_server():
    """Run the HTTP server."""
    server_address = ('', 8080)
    httpd = HTTPServer(server_address, APIRequestHandler)
    print("StoryCore API Server running on http://localhost:8080")
    print("Available endpoints:")
    print("  GET  /health")
    print("  GET  /projects")
    print("  GET  /projects/{project_id}")
    print("  POST /projects/{project_id}/export")
    print("  POST /projects/{project_id}/panels/{panel_id}/repromote")
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()
