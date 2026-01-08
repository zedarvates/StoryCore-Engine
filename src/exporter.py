"""
Export functionality for StoryCore-Engine projects.
"""

import shutil
import zipfile
from pathlib import Path
from datetime import datetime
import json
from qa_engine import QAEngine


class Exporter:
    """Handles project export with complete submission packages."""
    
    def __init__(self):
        self.qa_engine = QAEngine()
    
    def export_project(self, project_dir: str, export_base: str = "exports") -> str:
        """Export project to complete submission package with ZIP archive."""
        project_path = Path(project_dir)
        export_base_path = Path(export_base)
        
        # Get project name
        project_name = self._get_project_name(project_path)
        
        # Create timestamped export directory
        timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        export_dir = export_base_path / f"{project_name}_export_{timestamp}"
        export_dir.mkdir(parents=True, exist_ok=True)
        
        # Run QA scoring
        print("Running QA scoring...")
        qa_report = self.qa_engine.run_qa_scoring(str(project_path))
        
        # Update project status
        self._update_project_status(project_path, qa_report)
        
        # Copy project files
        self._copy_project_files(project_path, export_dir)
        
        # Save QA report
        self._save_qa_report(export_dir, qa_report)
        
        # Generate summary.md
        self._generate_summary(export_dir, project_path, project_name, timestamp, qa_report)
        
        # Copy demo assets
        self._copy_demo_assets(project_path, export_dir)
        
        # Create ZIP archive
        zip_path = self._create_zip_archive(export_dir, export_base_path, project_name, timestamp)
        
        # Print QA summary
        self._print_qa_summary(qa_report)
        
        return str(export_dir)
    
    def _get_project_name(self, project_path: Path) -> str:
        """Extract project name from project.json or use directory name."""
        try:
            with open(project_path / "project.json", 'r') as f:
                project_data = json.load(f)
            return project_data.get("project_name", project_path.name)
        except:
            return project_path.name
    
    def _generate_summary(self, export_dir: Path, project_path: Path, project_name: str, 
                         timestamp: str, qa_report: dict) -> None:
        """Generate summary.md file."""
        # Get panel count
        total_panels = 0
        try:
            with open(project_path / "project.json", 'r') as f:
                project_data = json.load(f)
            total_panels = project_data.get("asset_manifest", {}).get("promotion_metadata", {}).get("total_panels", 0)
        except:
            pass
        
        # Get sharpness improvement
        sharpness_improvement = None
        try:
            with open(project_path / "project.json", 'r') as f:
                project_data = json.load(f)
            panel_metrics = project_data.get("asset_manifest", {}).get("refinement_metrics", {}).get("panel_metrics", [])
            if panel_metrics:
                improvements = [m.get("improvement_percent", 0) for m in panel_metrics]
                sharpness_improvement = sum(improvements) / len(improvements)
        except:
            pass
        
        # Format timestamp for display
        dt = datetime.strptime(timestamp, "%Y%m%d-%H%M%S")
        display_timestamp = dt.strftime("%Y-%m-%d %H:%M:%S UTC")
        
        # Generate summary content
        summary_content = f"""# Project Export Summary

**Project Name:** {project_name}
**Export Date:** {display_timestamp}
**Pipeline Status:** {'PASSED' if qa_report['overall_score'] >= 4.0 else 'FAILED'}
**QA Score:** {qa_report['overall_score']:.1f}/5.0
**Total Panels:** {total_panels}
"""
        
        if sharpness_improvement is not None:
            summary_content += f"**Sharpness Improvement:** {sharpness_improvement:.1f}%\n"
        
        with open(export_dir / "summary.md", 'w') as f:
            f.write(summary_content)
        
        print("Generated summary.md")
    
    def _copy_demo_assets(self, project_path: Path, export_dir: Path) -> None:
        """Copy demo assets to demo_assets/ subfolder."""
        demo_dir = export_dir / "demo_assets"
        demo_dir.mkdir(exist_ok=True)
        
        # Copy compare assets
        compare_dir = project_path / "assets" / "images" / "compare"
        if compare_dir.exists():
            for file in compare_dir.iterdir():
                if file.is_file():
                    try:
                        shutil.copy2(file, demo_dir / file.name)
                    except:
                        pass
        
        # Copy first 2 promoted images
        promoted_dir = project_path / "assets" / "images" / "promoted"
        if promoted_dir.exists():
            promoted_files = sorted([f for f in promoted_dir.iterdir() if f.is_file()])[:2]
            for file in promoted_files:
                try:
                    shutil.copy2(file, demo_dir / file.name)
                except:
                    pass
        
        # Copy first 2 refined images
        refined_dir = project_path / "assets" / "images" / "refined"
        if refined_dir.exists():
            refined_files = sorted([f for f in refined_dir.iterdir() if f.is_file()])[:2]
            for file in refined_files:
                try:
                    shutil.copy2(file, demo_dir / file.name)
                except:
                    pass
        
        print("Copied demo assets")
    
    def _create_zip_archive(self, export_dir: Path, export_base_path: Path, 
                           project_name: str, timestamp: str) -> Path:
        """Create ZIP archive of the export directory."""
        zip_path = export_base_path / f"{project_name}_export_{timestamp}.zip"
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file in export_dir.rglob('*'):
                if file.is_file():
                    arcname = file.relative_to(export_dir)
                    zipf.write(file, arcname)
        
        print(f"Created ZIP archive: {zip_path.name}")
        return zip_path
    
    def _update_project_status(self, project_path: Path, qa_report: dict) -> None:
        """Update project.json status fields based on QA results."""
        project_file = project_path / "project.json"
        if not project_file.exists():
            return
        
        try:
            with open(project_file, 'r') as f:
                project_data = json.load(f)
            
            project_data["status"]["qa_passed"] = qa_report["passed"]
            project_data["status"]["last_qa_report_id"] = qa_report["qa_report_id"]
            project_data["status"]["current_phase"] = "qa_completed" if qa_report["passed"] else "qa_failed"
            project_data["updated_at"] = datetime.utcnow().isoformat() + "Z"
            
            with open(project_file, 'w') as f:
                json.dump(project_data, f, indent=2)
            
            print("Updated project status based on QA results")
            
        except (json.JSONDecodeError, KeyError) as e:
            print(f"Warning: Could not update project status: {e}")
    
    def _copy_project_files(self, project_path: Path, export_dir: Path) -> None:
        """Copy project.json and storyboard.json to export directory."""
        files_to_copy = ["project.json", "storyboard.json"]
        
        for filename in files_to_copy:
            source_file = project_path / filename
            if source_file.exists():
                shutil.copy2(source_file, export_dir / filename)
                print(f"Copied {filename} to export")
    
    def _save_qa_report(self, export_dir: Path, qa_report: dict) -> None:
        """Save QA report to export directory."""
        with open(export_dir / "qa_report.json", "w") as f:
            json.dump(qa_report, f, indent=2)
        print("Generated qa_report.json with scoring results")
    
    def _print_qa_summary(self, qa_report: dict) -> None:
        """Print QA scoring summary."""
        print(f"\nQA Scoring Results:")
        print(f"Overall Score: {qa_report['overall_score']:.1f}/5.0")
        print(f"Status: {'PASSED' if qa_report['passed'] else 'FAILED'}")
        
        if qa_report.get("categories"):
            print("\nCategory Scores:")
            for category, score in qa_report["categories"].items():
                status = "✓" if score >= 3.0 else "✗"
                print(f"  {status} {category.replace('_', ' ').title()}: {score:.1f}/5.0")
        
        if qa_report.get("issues"):
            print(f"\nIssues Found: {len(qa_report['issues'])}")
            for issue in qa_report["issues"][:3]:
                print(f"  - {issue['description']}")
            if len(qa_report["issues"]) > 3:
                print(f"  ... and {len(qa_report['issues']) - 3} more issues")


def generate_dashboard(project_path: Path) -> Path:
    """Generate interactive HTML dashboard for the project."""
    import json
    
    # Load project data
    try:
        with open(project_path / "project.json", 'r') as f:
            project_data = json.load(f)
    except:
        raise FileNotFoundError("project.json not found")
    
    project_name = project_data.get("project_name", project_path.name)
    
    # Get QA data
    qa_score = 0.0
    qa_categories = {}
    try:
        qa_engine = QAEngine()
        qa_report = qa_engine.run_qa_scoring(str(project_path))
        qa_score = qa_report.get("overall_score", 0.0)
        qa_categories = qa_report.get("categories", {})
    except:
        pass
    
    # Get panel data
    panels = []
    refined_dir = project_path / "assets" / "images" / "refined"
    promoted_dir = project_path / "assets" / "images" / "promoted"
    
    # Check if video plan exists
    video_ready = (project_path / "video_plan.json").exists()
    
    if refined_dir.exists():
        for refined_file in sorted(refined_dir.glob("panel_*_refined.png")):
            panel_num = refined_file.stem.split('_')[1]
            promoted_file = promoted_dir / f"panel_{panel_num}_promoted.png"
            
            # Get metrics
            improvement = 0.0
            try:
                panel_metrics = project_data.get("asset_manifest", {}).get("refinement_metrics", {}).get("panel_metrics", [])
                for metric in panel_metrics:
                    if metric.get("panel") == f"panel_{panel_num}":
                        improvement = metric.get("improvement_percent", 0.0)
                        break
            except:
                pass
            
            panels.append({
                "number": panel_num,
                "refined_path": f"assets/images/refined/panel_{panel_num}_refined.png",
                "promoted_path": f"assets/images/promoted/panel_{panel_num}_promoted.png" if promoted_file.exists() else "",
                "improvement": improvement
            })
    
    # Generate HTML
    html_content = _generate_dashboard_html(project_name, qa_score, qa_categories, panels, video_ready)
    
    # Save dashboard
    dashboard_path = project_path / "dashboard.html"
    with open(dashboard_path, 'w') as f:
        f.write(html_content)
    
    return dashboard_path


def _generate_dashboard_html(project_name: str, qa_score: float, qa_categories: dict, panels: list, video_ready: bool = False) -> str:
    """Generate the HTML content for the dashboard."""
    
    # QA badge color
    if qa_score >= 4.0:
        badge_color = "#4CAF50"
    elif qa_score >= 3.0:
        badge_color = "#FF9800"
    else:
        badge_color = "#F44336"
    
    # Generate panel cards
    panel_cards = ""
    for panel in panels:
        panel_cards += f"""
        <div class="panel-card">
            <div class="panel-images">
                <img src="{panel['refined_path']}" alt="Panel {panel['number']} Refined" class="refined-img">
                {f'<img src="{panel["promoted_path"]}" alt="Panel {panel["number"]} Promoted" class="promoted-img">' if panel['promoted_path'] else ''}
            </div>
            <div class="panel-info">
                <h3>Panel {panel['number']}</h3>
                <div class="metric">Improvement: {panel['improvement']:+.1f}%</div>
            </div>
        </div>"""
    
    # Generate QA categories
    qa_items = ""
    for category, score in qa_categories.items():
        color = "#4CAF50" if score >= 3.0 else "#F44336"
        qa_items += f'<div class="qa-item"><span>{category.replace("_", " ").title()}</span><span style="color: {color}">{score:.1f}/5.0</span></div>'
    
    # Video ready badge
    video_badge = ""
    if video_ready:
        video_badge = '<div class="stat"><div class="stat-value"><span class="video-badge">Video Ready ✅</span></div><div>Production Plan</div></div>'
    
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{project_name} - Dashboard</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #1a1a1a; color: #fff; }}
        .header {{ background: #2d2d2d; padding: 2rem; text-align: center; border-bottom: 2px solid #444; }}
        .header h1 {{ font-size: 2.5rem; margin-bottom: 1rem; }}
        .stats {{ display: flex; justify-content: center; gap: 2rem; margin-top: 1rem; }}
        .stat {{ text-align: center; }}
        .stat-value {{ font-size: 2rem; font-weight: bold; }}
        .qa-badge {{ background: {badge_color}; padding: 0.5rem 1rem; border-radius: 20px; font-weight: bold; }}
        .video-badge {{ background: #4CAF50; padding: 0.5rem 1rem; border-radius: 20px; font-weight: bold; font-size: 1rem; }}
        .gallery {{ padding: 2rem; }}
        .gallery h2 {{ margin-bottom: 2rem; text-align: center; }}
        .panel-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }}
        .panel-card {{ background: #2d2d2d; border-radius: 10px; overflow: hidden; transition: transform 0.3s; }}
        .panel-card:hover {{ transform: translateY(-5px); }}
        .panel-images {{ position: relative; height: 200px; overflow: hidden; }}
        .panel-images img {{ width: 100%; height: 100%; object-fit: cover; }}
        .promoted-img {{ position: absolute; top: 0; left: 0; opacity: 0; transition: opacity 0.3s; }}
        .panel-images:hover .promoted-img {{ opacity: 1; }}
        .panel-info {{ padding: 1rem; }}
        .panel-info h3 {{ margin-bottom: 0.5rem; }}
        .metric {{ color: #4CAF50; font-weight: bold; }}
        .qa-section {{ padding: 2rem; background: #2d2d2d; margin: 2rem; border-radius: 10px; }}
        .qa-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; }}
        .qa-item {{ display: flex; justify-content: space-between; padding: 0.5rem; background: #1a1a1a; border-radius: 5px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{project_name}</h1>
        <div class="stats">
            <div class="stat">
                <div class="stat-value"><span class="qa-badge">{qa_score:.1f}/5.0</span></div>
                <div>QA Score</div>
            </div>
            <div class="stat">
                <div class="stat-value">{len(panels)}</div>
                <div>Total Panels</div>
            </div>
            {video_badge}
        </div>
    </div>
    
    <div class="gallery">
        <h2>Panel Gallery</h2>
        <div class="panel-grid">
            {panel_cards}
        </div>
    </div>
    
    <div class="qa-section">
        <h2>QA Details</h2>
        <div class="qa-grid">
            {qa_items}
        </div>
    </div>
</body>
</html>"""
