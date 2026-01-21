"""
Grid generation and slicing for StoryCore-Engine.
Generates configurable grids and slices them into individual panels.
"""

from pathlib import Path
import json
from datetime import datetime
from typing import List, Tuple


class GridGenerator:
    """Handles grid generation and panel slicing with flexible dimensions."""
    
    def __init__(self):
        # 9 deterministic colors for consistent panel identification
        self.colors = [
            (255, 100, 100),  # Red
            (100, 255, 100),  # Green  
            (100, 100, 255),  # Blue
            (255, 255, 100),  # Yellow
            (255, 100, 255),  # Magenta
            (100, 255, 255),  # Cyan
            (255, 150, 100),  # Orange
            (150, 100, 255),  # Purple
            (100, 150, 255),  # Light Blue
        ]
    
    def generate_grid(self, project_dir: str, grid_spec: str = "3x3", 
                     output_name: str = None, cell_size: int = 256) -> str:
        """Generate grid with specified dimensions."""
        # Parse grid specification
        cols, rows = map(int, grid_spec.split('x'))
        
        # Calculate cell dimensions based on grid type
        if grid_spec == "3x3":
            cell_width = cell_height = cell_size
        elif grid_spec in ["1x2", "1x3", "1x4"]:
            cell_height = cell_size
            cell_width = round(cell_size * 16 / 9)
        else:
            raise ValueError(f"Unsupported grid specification: {grid_spec}")
        
        # Default output name based on grid spec
        if output_name is None:
            output_name = f"grid_{grid_spec}.ppm"
        
        project_path = Path(project_dir)
        
        # Create output directories
        grids_dir = project_path / "assets" / "images" / "grids"
        panels_dir = project_path / "assets" / "images" / "panels"
        grids_dir.mkdir(parents=True, exist_ok=True)
        panels_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate grid
        grid_path = grids_dir / output_name
        self._create_ppm_grid(grid_path, cols, rows, cell_width, cell_height)
        
        # Slice into panels
        panel_paths = self._slice_grid(grid_path, panels_dir, cols, rows, cell_width, cell_height)
        
        # Update project.json
        self._update_project_manifest(project_path, grid_path, panel_paths, cols, rows, grid_spec)
        
        return str(grid_path)
    
    def _create_ppm_grid(self, output_path: Path, cols: int, rows: int, 
                        cell_width: int, cell_height: int) -> None:
        """Create PPM grid with specified dimensions."""
        width = cols * cell_width
        height = rows * cell_height
        
        with open(output_path, 'w') as f:
            # PPM P3 header
            f.write("P3\n")
            f.write(f"{width} {height}\n")
            f.write("255\n")
            
            # Generate pixels row by row
            for y in range(height):
                row_pixels = []
                for x in range(width):
                    # Determine which cell we're in
                    cell_x = x // cell_width
                    cell_y = y // cell_height
                    cell_index = cell_y * cols + cell_x
                    
                    # Get base color for this cell
                    color = self.colors[cell_index % len(self.colors)]
                    
                    # Add corner marker (small pattern in top-left of each cell)
                    local_x = x % cell_width
                    local_y = y % cell_height
                    
                    if local_x < 20 and local_y < 20:
                        # Corner marker area - encode panel number
                        if self._is_marker_pixel(local_x, local_y, cell_index + 1):
                            color = (0, 0, 0)  # Black marker
                        else:
                            color = (255, 255, 255)  # White background
                    
                    row_pixels.append(f"{color[0]} {color[1]} {color[2]}")
                
                f.write(" ".join(row_pixels) + "\n")
    
    def _is_marker_pixel(self, x: int, y: int, panel_num: int) -> bool:
        """Determine if pixel should be part of the panel number marker."""
        # Simple pattern: draw dots representing panel number
        if x < 5 or y < 5 or x >= 15 or y >= 15:
            return False
        
        # Create a simple pattern based on panel number
        pattern_x = (x - 5) // 2
        pattern_y = (y - 5) // 2
        
        # Simple encoding: number of dots = panel number
        dot_positions = [
            (1, 1), (3, 1), (1, 3), (3, 3), (2, 2),  # positions 1-5
            (0, 2), (4, 2), (2, 0), (2, 4)           # positions 6-9
        ]
        
        if panel_num <= len(dot_positions):
            return (pattern_x, pattern_y) in dot_positions[:panel_num]
        
        return False
    
    def _slice_grid(self, grid_path: Path, panels_dir: Path, cols: int, rows: int,
                   cell_width: int, cell_height: int) -> List[str]:
        """Slice grid PPM into individual panel PPMs."""
        # Read the grid PPM
        with open(grid_path, 'r') as f:
            lines = f.readlines()
        
        # Parse header
        header_lines = 0
        for i, line in enumerate(lines):
            if line.strip() and not line.startswith('#'):
                if header_lines == 0:  # P3
                    header_lines += 1
                elif header_lines == 1:  # width height
                    width, height = map(int, line.split())
                    header_lines += 1
                elif header_lines == 2:  # max value
                    max_val = int(line.strip())
                    pixel_start = i + 1
                    break
        
        # Read all pixel data
        pixel_data = []
        for line in lines[pixel_start:]:
            pixel_data.extend(line.split())
        
        # Convert to RGB tuples
        pixels = []
        for i in range(0, len(pixel_data), 3):
            pixels.append((int(pixel_data[i]), int(pixel_data[i+1]), int(pixel_data[i+2])))
        
        # Slice into panels
        panel_paths = []
        total_panels = cols * rows
        
        for panel_idx in range(total_panels):
            panel_y = panel_idx // cols
            panel_x = panel_idx % cols
            
            panel_path = panels_dir / f"panel_{panel_idx + 1:02d}.ppm"
            panel_paths.append(str(panel_path.relative_to(panel_path.parents[3])))
            
            with open(panel_path, 'w') as f:
                # PPM header for panel
                f.write("P3\n")
                f.write(f"{cell_width} {cell_height}\n")
                f.write(f"{max_val}\n")
                
                # Extract panel pixels
                for y in range(cell_height):
                    row_pixels = []
                    for x in range(cell_width):
                        grid_x = panel_x * cell_width + x
                        grid_y = panel_y * cell_height + y
                        pixel_idx = grid_y * width + grid_x
                        
                        if pixel_idx < len(pixels):
                            pixel = pixels[pixel_idx]
                            row_pixels.append(f"{pixel[0]} {pixel[1]} {pixel[2]}")
                        else:
                            row_pixels.append("0 0 0")
                    
                    f.write(" ".join(row_pixels) + "\n")
        
        return panel_paths
    
    def _update_project_manifest(self, project_path: Path, grid_path: Path, 
                               panel_paths: List[str], cols: int, rows: int, grid_spec: str) -> None:
        """Update project.json with grid and panel asset information."""
        project_file = project_path / "project.json"
        if not project_file.exists():
            return
        
        try:
            with open(project_file, 'r') as f:
                project_data = json.load(f)
            
            # Update asset manifest
            if "asset_manifest" not in project_data:
                project_data["asset_manifest"] = {}
            
            # Add grid asset
            grid_rel_path = str(grid_path.relative_to(project_path))
            grid_name = f"grid_{grid_spec}"
            project_data["asset_manifest"]["grid"] = {
                "asset_id": f"{grid_name}_v1",
                "path": grid_rel_path,
                "type": "grid",
                "dimensions": grid_spec,
                "created_at": datetime.utcnow().isoformat() + "Z"
            }
            
            # Add panels
            project_data["asset_manifest"]["panels"] = []
            for i, panel_path in enumerate(panel_paths):
                project_data["asset_manifest"]["panels"].append({
                    "asset_id": f"panel_{i+1:02d}_v1",
                    "path": panel_path,
                    "panel_index": i + 1
                })
            
            # Add panel to shot mapping - map to available shots in storyboard
            project_data["asset_manifest"]["panel_to_shot_map"] = {}
            
            # Get number of shots from storyboard
            storyboard_file = project_path / "storyboard.json"
            num_shots = 3  # Default
            if storyboard_file.exists():
                try:
                    with open(storyboard_file, 'r') as f:
                        storyboard_data = json.load(f)
                        num_shots = len(storyboard_data.get("shots", []))
                except (json.JSONDecodeError, KeyError):
                    pass
            
            # Map panels to shots: min(N panels, M shots)
            num_panels = len(panel_paths)
            for i in range(min(num_panels, num_shots)):
                project_data["asset_manifest"]["panel_to_shot_map"][f"panel_{i+1:02d}"] = f"shot_{i+1:02d}"
            
            # Update timestamp
            project_data["updated_at"] = datetime.utcnow().isoformat() + "Z"
            
            # Write back
            with open(project_file, 'w') as f:
                json.dump(project_data, f, indent=2)
            
            print("Updated project.json with grid and panel assets")
            
        except (json.JSONDecodeError, KeyError) as e:
            print(f"Warning: Could not update project manifest: {e}")