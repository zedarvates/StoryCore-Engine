"""
StoryCore Comparison Engine
Creates visual comparisons between promoted and refined images.
"""

import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    raise ImportError("Pillow is required for the compare command. Install with: pip install Pillow>=10.0.0")


def create_comparison_images(project_path: Path, panel: str = "1", mode: str = "side-by-side", 
                           out_dir: str = "assets/images/compare") -> Dict[str, Any]:
    """
    Create comparison images between promoted and refined panels
    
    Args:
        project_path: Path to project directory
        panel: Panel number or "all"
        mode: "side-by-side" or "grid"
        out_dir: Output directory path
    
    Returns:
        Dict with comparison results and metadata
    """
    promoted_dir = project_path / "assets" / "images" / "promoted"
    refined_dir = project_path / "assets" / "images" / "refined"
    output_dir = project_path / out_dir
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Load refinement metrics if available
    metrics_data = {}
    try:
        with open(project_path / "project.json", 'r') as f:
            project_data = json.load(f)
        
        refinement_metrics = project_data.get("asset_manifest", {}).get("refinement_metrics", {})
        panel_metrics = refinement_metrics.get("panel_metrics", [])
        
        for metric in panel_metrics:
            panel_name = metric.get("panel", "")
            metrics_data[panel_name] = metric
    except (FileNotFoundError, json.JSONDecodeError, KeyError):
        pass
    
    comparison_assets = []
    
    if panel == "all":
        # Find all available panels
        promoted_files = list(promoted_dir.glob("panel_*_promoted.png"))
        panel_numbers = []
        
        for pfile in promoted_files:
            # Extract panel number from filename
            stem = pfile.stem  # panel_01_promoted
            parts = stem.split('_')
            if len(parts) >= 2:
                panel_numbers.append(parts[1])
        
        panel_numbers.sort()
        
        if not panel_numbers:
            raise FileNotFoundError("No promoted panels found. Run 'storycore promote' first.")
        
        if mode == "grid":
            output_file = output_dir / "compare_all.png"
            _create_grid_comparison(promoted_dir, refined_dir, panel_numbers, output_file, metrics_data)
        else:  # side-by-side
            output_file = output_dir / "compare_all.png"
            _create_stacked_comparison(promoted_dir, refined_dir, panel_numbers, output_file, metrics_data)
        
        comparison_assets.append({
            "asset_id": f"compare_all_v1",
            "path": f"{out_dir}/compare_all.png",
            "type": "comparison",
            "mode": mode,
            "panels": panel_numbers
        })
    
    else:
        # Single panel comparison
        panel_num = panel.zfill(2)  # Ensure 2-digit format
        promoted_file = promoted_dir / f"panel_{panel_num}_promoted.png"
        refined_file = refined_dir / f"panel_{panel_num}_refined.png"
        
        if not promoted_file.exists():
            raise FileNotFoundError(f"Promoted panel not found: {promoted_file}. Run 'storycore promote' first.")
        
        if not refined_file.exists():
            raise FileNotFoundError(f"Refined panel not found: {refined_file}. Run 'storycore refine' first.")
        
        output_file = output_dir / f"compare_panel_{panel_num}.png"
        panel_key = f"panel_{panel_num}"
        
        _create_single_comparison(promoted_file, refined_file, output_file, 
                                metrics_data.get(panel_key))
        
        comparison_assets.append({
            "asset_id": f"compare_panel_{panel_num}_v1",
            "path": f"{out_dir}/compare_panel_{panel_num}.png",
            "type": "comparison",
            "mode": mode,
            "panel": panel_num
        })
    
    return {
        "comparison_assets": comparison_assets,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "output_dir": output_dir
    }


def _create_single_comparison(promoted_file: Path, refined_file: Path, output_file: Path, 
                            metrics: Optional[Dict[str, Any]] = None) -> None:
    """Create side-by-side comparison for a single panel."""
    with Image.open(promoted_file) as promoted_img, Image.open(refined_file) as refined_img:
        # Ensure same height
        if promoted_img.size[1] != refined_img.size[1]:
            # Resize refined to match promoted height
            new_width = int(refined_img.size[0] * promoted_img.size[1] / refined_img.size[1])
            refined_img = refined_img.resize((new_width, promoted_img.size[1]), Image.Resampling.LANCZOS)
        
        # Calculate dimensions
        margin = 20
        header_height = 60
        total_width = promoted_img.size[0] + refined_img.size[0] + 3 * margin
        total_height = promoted_img.size[1] + header_height + 2 * margin
        
        # Create comparison image
        comparison = Image.new('RGB', (total_width, total_height), 'white')
        
        # Paste images
        comparison.paste(promoted_img, (margin, header_height + margin))
        comparison.paste(refined_img, (promoted_img.size[0] + 2 * margin, header_height + margin))
        
        # Add text labels
        draw = ImageDraw.Draw(comparison)
        
        try:
            # Try to use a better font if available
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
        except (OSError, IOError):
            font = ImageFont.load_default()
        
        # Labels
        draw.text((margin + promoted_img.size[0]//2 - 40, 20), "PROMOTED", fill='black', font=font)
        draw.text((promoted_img.size[0] + 2*margin + refined_img.size[0]//2 - 35, 20), "REFINED", fill='black', font=font)
        
        # Add metrics if available
        if metrics:
            before = metrics.get("sharpness_before", 0)
            after = metrics.get("sharpness_after", 0)
            improvement = metrics.get("improvement_percent", 0)
            
            metrics_text = f"Sharpness: {before:.1f} → {after:.1f} ({improvement:+.1f}%)"
            draw.text((margin, total_height - 30), metrics_text, fill='blue', font=font)
        
        comparison.save(output_file, "PNG")


def _create_grid_comparison(promoted_dir: Path, refined_dir: Path, panel_numbers: List[str], 
                          output_file: Path, metrics_data: Dict[str, Any]) -> None:
    """Create grid comparison with promoted/refined columns."""
    images = []
    max_width = 0
    total_height = 0
    
    # Load all images and calculate dimensions
    for panel_num in panel_numbers:
        promoted_file = promoted_dir / f"panel_{panel_num}_promoted.png"
        refined_file = refined_dir / f"panel_{panel_num}_refined.png"
        
        if not promoted_file.exists() or not refined_file.exists():
            continue
        
        with Image.open(promoted_file) as promoted_img, Image.open(refined_file) as refined_img:
            # Ensure same height for the pair
            if promoted_img.size[1] != refined_img.size[1]:
                new_width = int(refined_img.size[0] * promoted_img.size[1] / refined_img.size[1])
                refined_img = refined_img.resize((new_width, promoted_img.size[1]), Image.Resampling.LANCZOS)
            
            row_width = promoted_img.size[0] + refined_img.size[0] + 60  # 3 margins
            max_width = max(max_width, row_width)
            total_height += promoted_img.size[1] + 40  # margin between rows
            
            images.append((promoted_img.copy(), refined_img.copy(), panel_num))
    
    if not images:
        raise FileNotFoundError("No matching promoted/refined panel pairs found.")
    
    # Create grid
    header_height = 60
    total_height += header_height + 40
    grid = Image.new('RGB', (max_width, total_height), 'white')
    draw = ImageDraw.Draw(grid)
    
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
    except (OSError, IOError):
        font = ImageFont.load_default()
    
    # Header
    draw.text((max_width//4, 20), "PROMOTED", fill='black', font=font)
    draw.text((3*max_width//4, 20), "REFINED", fill='black', font=font)
    
    # Paste images
    y_offset = header_height + 20
    for promoted_img, refined_img, panel_num in images:
        margin = 20
        grid.paste(promoted_img, (margin, y_offset))
        grid.paste(refined_img, (promoted_img.size[0] + 2*margin, y_offset))
        
        # Add panel label and metrics
        panel_key = f"panel_{panel_num}"
        if panel_key in metrics_data:
            metrics = metrics_data[panel_key]
            improvement = metrics.get("improvement_percent", 0)
            metrics_text = f"Panel {panel_num}: {improvement:+.1f}%"
            draw.text((margin, y_offset + promoted_img.size[1] + 5), metrics_text, fill='blue', font=font)
        
        y_offset += promoted_img.size[1] + 40
    
    grid.save(output_file, "PNG")


def _create_stacked_comparison(promoted_dir: Path, refined_dir: Path, panel_numbers: List[str], 
                             output_file: Path, metrics_data: Dict[str, Any]) -> None:
    """Create vertically stacked side-by-side comparisons."""
    comparisons = []
    max_width = 0
    total_height = 0
    
    # Create individual comparisons
    for panel_num in panel_numbers:
        promoted_file = promoted_dir / f"panel_{panel_num}_promoted.png"
        refined_file = refined_dir / f"panel_{panel_num}_refined.png"
        
        if not promoted_file.exists() or not refined_file.exists():
            continue
        
        with Image.open(promoted_file) as promoted_img, Image.open(refined_file) as refined_img:
            # Ensure same height
            if promoted_img.size[1] != refined_img.size[1]:
                new_width = int(refined_img.size[0] * promoted_img.size[1] / refined_img.size[1])
                refined_img = refined_img.resize((new_width, promoted_img.size[1]), Image.Resampling.LANCZOS)
            
            # Create single comparison
            margin = 20
            header_height = 40
            comp_width = promoted_img.size[0] + refined_img.size[0] + 3 * margin
            comp_height = promoted_img.size[1] + header_height + margin
            
            comparison = Image.new('RGB', (comp_width, comp_height), 'white')
            comparison.paste(promoted_img, (margin, header_height))
            comparison.paste(refined_img, (promoted_img.size[0] + 2 * margin, header_height))
            
            # Add labels and metrics
            draw = ImageDraw.Draw(comparison)
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
            except (OSError, IOError):
                font = ImageFont.load_default()
            
            draw.text((margin, 10), f"Panel {panel_num} - PROMOTED", fill='black', font=font)
            draw.text((promoted_img.size[0] + 2*margin, 10), "REFINED", fill='black', font=font)
            
            panel_key = f"panel_{panel_num}"
            if panel_key in metrics_data:
                metrics = metrics_data[panel_key]
                improvement = metrics.get("improvement_percent", 0)
                metrics_text = f"({improvement:+.1f}%)"
                draw.text((comp_width - 80, 10), metrics_text, fill='blue', font=font)
            
            comparisons.append(comparison)
            max_width = max(max_width, comp_width)
            total_height += comp_height + 10
    
    if not comparisons:
        raise FileNotFoundError("No matching promoted/refined panel pairs found.")
    
    # Stack comparisons
    stacked = Image.new('RGB', (max_width, total_height), 'white')
    y_offset = 0
    
    for comparison in comparisons:
        stacked.paste(comparison, (0, y_offset))
        y_offset += comparison.size[1] + 10
    
    stacked.save(output_file, "PNG")


def update_project_manifest_comparison(project_path: Path, comparison_data: Dict[str, Any]) -> None:
    """Update project.json with comparison metadata"""
    project_file = project_path / "project.json"
    
    with open(project_file, 'r') as f:
        project_data = json.load(f)
    
    # Update asset manifest
    if "asset_manifest" not in project_data:
        project_data["asset_manifest"] = {}
    
    project_data["asset_manifest"]["comparison_assets"] = comparison_data["comparison_assets"]
    project_data["asset_manifest"]["comparison_metadata"] = {
        "created_at": comparison_data["created_at"],
        "total_comparisons": len(comparison_data["comparison_assets"])
    }
    
    with open(project_file, 'w') as f:
        json.dump(project_data, f, indent=2)
