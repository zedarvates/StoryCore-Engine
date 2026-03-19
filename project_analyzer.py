import os
from pathlib import Path
from typing import Dict, List, Tuple

def analyze_project_structure(root_dir: str) -> Dict[str, any]:
    """
    Analyze the project structure and provide statistics.
    """
    stats = {
        'total_files': 0,
        'total_directories': 0,
        'file_types': {},
        'largest_files': [],
        'directory_tree': {}
    }

    for root, dirs, files in os.walk(root_dir):
        stats['total_directories'] += 1

        for file in files:
            stats['total_files'] += 1
            file_path = os.path.join(root, file)
            file_size = os.path.getsize(file_path)

            # Track file types
            file_extension = Path(file).suffix.lower()
            if file_extension not in stats['file_types']:
                stats['file_types'][file_extension] = {
                    'count': 0,
                    'total_size': 0
                }
            stats['file_types'][file_extension]['count'] += 1
            stats['file_types'][file_extension]['total_size'] += file_size

            # Track largest files
            stats['largest_files'].append((file_path, file_size))

        # Build directory tree
        relative_path = os.path.relpath(root, root_dir)
        if relative_path == '.':
            current_level = stats['directory_tree']
        else:
            parts = relative_path.split(os.sep)
            current_level = stats['directory_tree']
            for part in parts:
                if part not in current_level:
                    current_level[part] = {}
                current_level = current_level[part]

    # Sort largest files by size
    stats['largest_files'].sort(key=lambda x: x[1], reverse=True)
    stats['largest_files'] = stats['largest_files'][:10]

    return stats

def format_size(size_bytes: int) -> str:
    """Format bytes into human readable format."""
    if size_bytes == 0:
        return "0 B"
    units = ['B', 'KB', 'MB', 'GB', 'TB']
    unit_index = 0
    size = size_bytes
    while size >= 1024 and unit_index < len(units) - 1:
        size /= 1024.0
        unit_index += 1
    return f"{size:.2f} {units[unit_index]}"

def print_report(stats: Dict[str, any], root_dir: str):
    """Print a formatted report of the analysis."""
    print("=" * 60)
    print(f"Project Analysis Report for: {root_dir}")
    print("=" * 60)
    print(f"\nTotal Files: {stats['total_files']}")
    print(f"Total Directories: {stats['total_directories'] - 1}")  # Subtract root

    print(f"\nFile Type Distribution:")
    for ext, info in sorted(stats['file_types'].items()):
        print(f"  {ext or 'No extension'}: {info['count']} files, "
              f"total size: {format_size(info['total_size'])}")

    print(f"\nTop 10 Largest Files:")
    for file_path, size in stats['largest_files']:
        print(f"  {file_path} - {format_size(size)}")

    print(f"\nDirectory Structure:")
    def print_tree(tree, indent=0):
        for key, subtree in tree.items():
            print(" " * indent + "├── " + key)
            print_tree(subtree, indent + 4)
    print_tree(stats['directory_tree'])

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        root_dir = sys.argv[1]
    else:
        root_dir = '.'

    print(f"Analyzing project structure in: {root_dir}")
    stats = analyze_project_structure(root_dir)
    print_report(stats, root_dir)