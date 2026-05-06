#!/usr/bin/env python3
import sys
import urllib.request
from pathlib import Path


def download_file(url, dest_path):
    temp_path = dest_path + ".tmp"
    try:
        Path(dest_path).parent.mkdir(parents=True, exist_ok=True)
        request = urllib.request.Request(
            url, headers={"User-Agent": "StoryCore-Downloader/1.0"}
        )
        with urllib.request.urlopen(request) as response:
            with open(temp_path, "wb") as f:
                while True:
                    chunk = response.read(8192 * 4)
                    if not chunk:
                        break
                    f.write(chunk)
        Path(temp_path).rename(dest_path)
        print("SUCCESS")
    except Exception as e:
        if Path(temp_path).exists():
            Path(temp_path).unlink()
        print(f"FAILED: {e}")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python download_url.py <url> <dest>")
        sys.exit(1)
    download_file(sys.argv[1], sys.argv[2])
