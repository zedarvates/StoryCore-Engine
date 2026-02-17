
import subprocess
import os

def check_all_large_files():
    # Check all files in the directory recursively, not just staged
    large_files = []
    for root, dirs, files in os.walk('.'):
        if '.git' in root or 'node_modules' in root or '.venv' in root:
            continue
        for f in files:
            path = os.path.join(root, f)
            try:
                size = os.path.getsize(path)
                if size > 50 * 1024 * 1024: # 50MB
                    large_files.append((path, size))
            except:
                continue
    
    large_files.sort(key=lambda x: x[1], reverse=True)
    print(f"Total large files found (>50MB): {len(large_files)}")
    for p, s in large_files:
        print(f"{p}: {s / (1024*1024):.2f} MB")

if __name__ == "__main__":
    check_all_large_files()
