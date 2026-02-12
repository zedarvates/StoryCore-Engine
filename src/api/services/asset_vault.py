#!/usr/bin/env python3
"""
Asset Vault Service for StoryCore
Manages physical storage, versioning, and indexing of generated media assets.
"""

import os
import shutil
import logging
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class AssetVault:
    """
    Manages project-specific assets (videos, images, audio).
    Ensures portability by using relative paths.
    """
    
    def __init__(self, projects_root: str):
        self.projects_root = Path(projects_root)
        self.projects_root.mkdir(parents=True, exist_ok=True)

    def get_project_dir(self, project_id: str) -> Path:
        """Returns the base directory for a project."""
        path = self.projects_root / project_id
        path.mkdir(parents=True, exist_ok=True)
        return path

    def get_asset_dir(self, project_id: str, asset_type: str = "generated") -> Path:
        """Returns the specific asset subdirectory."""
        path = self.get_project_dir(project_id) / "assets" / asset_type
        path.mkdir(parents=True, exist_ok=True)
        return path

    def store_asset(self, project_id: str, source_path: str, asset_name: str, asset_type: str = "generated") -> Optional[str]:
        """
        Moves a generated file from a temp location to the project vault.
        Returns the relative path to the asset.
        """
        try:
            target_dir = self.get_asset_dir(project_id, asset_type)
            source = Path(source_path)
            
            # Ensure unique filename to avoid overwrites
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{Path(asset_name).stem}_{timestamp}{source.suffix}"
            target_path = target_dir / filename
            
            shutil.move(str(source), str(target_path))
            
            # Return relative path for portability
            relative_path = f"assets/{asset_type}/{filename}"
            logger.info("Asset stored in vault: %s", relative_path)
            
            self._update_asset_index(project_id, relative_path, asset_type)
            
            return relative_path
        except Exception as e:
            logger.error("Failed to store asset in vault: %s", str(e))
            return None

    def _update_asset_index(self, project_id: str, relative_path: str, asset_type: str):
        """Updates the project's asset registry JSON."""
        index_path = self.get_project_dir(project_id) / "project_assets.json"
        
        assets = []
        if index_path.exists():
            try:
                with open(index_path, 'r') as f:
                    assets = json.load(f)
            except Exception:
                assets = []
                
        assets.append({
            "path": relative_path,
            "type": asset_type,
            "added_at": datetime.now().isoformat()
        })
        
        try:
            with open(index_path, 'w') as f:
                json.dump(assets, f, indent=2)
        except Exception as e:
            logger.error("Failed to update asset index: %s", str(e))

    def resolve_path(self, project_id: str, relative_path: str) -> str:
        """Converts a vault relative path back to an absolute system path."""
        return str((self.get_project_dir(project_id) / relative_path).absolute())
