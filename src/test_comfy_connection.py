import requests
import sys

def test_connection():
    url = "http://127.0.0.1:8000/system_stats"
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            print(f"SUCCESS: ComfyUI is reachable at {url}")
            print(f"Server Stats: {response.json()}")
            return True
        else:
            print(f"FAILURE: ComfyUI returned status code {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"FAILURE: Could not connect to ComfyUI at {url}. Is it running?")
        return False
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    if test_connection():
        sys.exit(0)
    else:
        sys.exit(1)
