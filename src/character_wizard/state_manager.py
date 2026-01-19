"""
Wizard State Manager

Handles state persistence and recovery for character wizard sessions.
"""

import json
import uuid
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime

from .models import WizardState, CreationMethod


class WizardStateManager:
    """Manages wizard session state persistence and recovery"""
    
    def __init__(self, project_path: Path):
        self.project_path = project_path
        self.state_dir = project_path / ".kiro" / "character_wizard_state"
        self.state_dir.mkdir(parents=True, exist_ok=True)

    def create_session(self, project_context: Optional[str] = None) -> WizardState:
        """Create a new wizard session"""
        session_id = str(uuid.uuid4())
        
        state = WizardState(
            session_id=session_id,
            current_step="welcome",
            project_context=project_context,
            timestamp=datetime.now().isoformat()
        )
        
        return state

    def save_state(self, state: WizardState) -> bool:
        """Save wizard state to file"""
        try:
            state_file = self.state_dir / f"session_{state.session_id}.json"
            
            # Convert to dictionary for JSON serialization
            state_dict = {
                "session_id": state.session_id,
                "current_step": state.current_step,
                "creation_method": state.creation_method.value if state.creation_method else None,
                "collected_data": state.collected_data,
                "project_context": state.project_context,
                "timestamp": state.timestamp
            }
            
            # Add character profile if exists
            if state.character_profile:
                state_dict["character_profile"] = self._serialize_character_profile(state.character_profile)
            
            with open(state_file, 'w', encoding='utf-8') as f:
                json.dump(state_dict, f, indent=2, ensure_ascii=False)
            
            return True
            
        except Exception as e:
            print(f"Warning: Failed to save wizard state: {e}")
            return False

    def load_state(self, session_id: str) -> Optional[WizardState]:
        """Load wizard state from file"""
        try:
            state_file = self.state_dir / f"session_{session_id}.json"
            
            if not state_file.exists():
                return None
            
            with open(state_file, 'r', encoding='utf-8') as f:
                state_data = json.load(f)
            
            # Reconstruct state
            state = WizardState(
                session_id=state_data["session_id"],
                current_step=state_data["current_step"],
                collected_data=state_data.get("collected_data", {}),
                project_context=state_data.get("project_context"),
                timestamp=state_data["timestamp"]
            )
            
            # Restore creation method
            if state_data.get("creation_method"):
                state.creation_method = CreationMethod(state_data["creation_method"])
            
            # Restore character profile if exists
            if state_data.get("character_profile"):
                state.character_profile = self._deserialize_character_profile(state_data["character_profile"])
            
            return state
            
        except Exception as e:
            print(f"Error: Failed to load wizard state: {e}")
            return None

    def list_sessions(self) -> List[Dict[str, Any]]:
        """List all available wizard sessions"""
        sessions = []
        
        for state_file in self.state_dir.glob("session_*.json"):
            try:
                with open(state_file, 'r', encoding='utf-8') as f:
                    state_data = json.load(f)
                
                session_info = {
                    "session_id": state_data["session_id"],
                    "current_step": state_data["current_step"],
                    "creation_method": state_data.get("creation_method"),
                    "timestamp": state_data["timestamp"],
                    "file_path": str(state_file)
                }
                
                # Add character name if available
                if state_data.get("character_profile", {}).get("name"):
                    session_info["character_name"] = state_data["character_profile"]["name"]
                
                sessions.append(session_info)
                
            except Exception as e:
                print(f"Warning: Failed to read session file {state_file}: {e}")
                continue
        
        # Sort by timestamp (newest first)
        sessions.sort(key=lambda x: x["timestamp"], reverse=True)
        return sessions

    def cleanup_old_sessions(self, max_age_days: int = 7) -> int:
        """Clean up old wizard sessions"""
        from datetime import timedelta
        
        cutoff_date = datetime.now() - timedelta(days=max_age_days)
        cleaned_count = 0
        
        for state_file in self.state_dir.glob("session_*.json"):
            try:
                with open(state_file, 'r', encoding='utf-8') as f:
                    state_data = json.load(f)
                
                session_date = datetime.fromisoformat(state_data["timestamp"])
                
                if session_date < cutoff_date:
                    state_file.unlink()
                    cleaned_count += 1
                    
            except Exception as e:
                print(f"Warning: Failed to process session file {state_file}: {e}")
                continue
        
        return cleaned_count

    def delete_session(self, session_id: str) -> bool:
        """Delete a specific wizard session"""
        try:
            state_file = self.state_dir / f"session_{session_id}.json"
            
            if state_file.exists():
                state_file.unlink()
                return True
            else:
                return False
                
        except Exception as e:
            print(f"Error: Failed to delete session: {e}")
            return False

    def _serialize_character_profile(self, profile) -> Dict[str, Any]:
        """Serialize character profile for JSON storage"""
        # This is a simplified serialization - full implementation would handle all nested objects
        return {
            "character_id": profile.character_id,
            "name": profile.name,
            "creation_method": profile.creation_method.value,
            "creation_timestamp": profile.creation_timestamp,
            "version": profile.version,
            "puppet_category": profile.puppet_category.value,
            "genre_tags": profile.genre_tags,
            "style_tags": profile.style_tags,
            "reference_images": profile.reference_images,
            "quality_score": profile.quality_score,
            "consistency_score": profile.consistency_score,
            "metadata": profile.metadata
        }

    def _deserialize_character_profile(self, data: Dict[str, Any]):
        """Deserialize character profile from JSON data"""
        from .models import CharacterProfile, CreationMethod, PuppetCategory
        
        # This is a simplified deserialization - full implementation would handle all nested objects
        profile = CharacterProfile()
        profile.character_id = data.get("character_id", "")
        profile.name = data.get("name", "")
        profile.creation_method = CreationMethod(data.get("creation_method", "auto_generated"))
        profile.creation_timestamp = data.get("creation_timestamp", "")
        profile.version = data.get("version", "1.0")
        profile.puppet_category = PuppetCategory(data.get("puppet_category", "M1"))
        profile.genre_tags = data.get("genre_tags", [])
        profile.style_tags = data.get("style_tags", [])
        profile.reference_images = data.get("reference_images", [])
        profile.quality_score = data.get("quality_score", 0.0)
        profile.consistency_score = data.get("consistency_score", 0.0)
        profile.metadata = data.get("metadata", {})
        
        return profile