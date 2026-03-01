
import subprocess
import os

def get_staged_files():
    result = subprocess.run(['git', 'diff', '--cached', '--name-only'], capture_output=True, text=True)
    return result.stdout.splitlines()

def check_file_sizes():
    staged_files = get_staged_files()
    large_files = []
    for f in staged_files:
        if os.path.exists(f):
            size = os.path.getsize(f)
            if size > 10 * 1024 * 1024:  # 10MB
                large_files.append((f, size))
    
    large_files.sort(key=lambda x: x[1], reverse=True)
    for f, size in large_files:
        print(f"{f}: {size / (1024 * 1024):.2f} MB")

if __name__ == "__main__":
    check_file_sizes()
