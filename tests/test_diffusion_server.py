import pytest
import requests
import subprocess
import time
import os
import signal

def test_diffusion_server_health():
    """Test if the diffusion server starts and responds to health checks."""
    # Start the server in the background
    port = 8005
    env = os.environ.copy()
    env["DIFFUSION_SERVER_PORT"] = str(port)
    
    process = subprocess.Popen(
        ["python", "src/diffusion/diffusion_server.py"],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    time.sleep(2) # Give it time to start
    
    try:
        response = requests.get(f"http://localhost:{port}/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        
        # Test generation
        resp_gen = requests.post(
            f"http://localhost:{port}/generate",
            json={"prompt": "Test story of a knight", "steps": 5}
        )
        assert resp_gen.status_code == 200
        data = resp_gen.json()
        assert "text" in data
        assert "latency_ms" in data
        assert " [Diffusion Result]" in data["text"]
        
    finally:
        # Kill the server
        if os.name == 'nt':
            subprocess.call(['taskkill', '/F', '/T', '/PID', str(process.pid)])
        else:
            os.kill(process.pid, signal.SIGTERM)

if __name__ == "__main__":
    test_diffusion_server_health()
