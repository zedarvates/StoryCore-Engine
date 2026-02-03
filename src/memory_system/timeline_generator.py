"""
Timeline and Overview Generator for StoryCore LLM Memory System.

This module handles project timeline and overview generation.
"""

from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime


class TimelineGenerator:
    """
    Manages project timeline and overview generation.
    
    Responsibilities:
    - Record significant events in timeline.txt
    - Generate project_overview.txt
    - Maintain chronological ordering
    - Support all event types (creation, decisions, assets, errors, recovery)
    
    Validates: Requirements 13.1, 13.5, 14.1, 14.2, 14.3, 14.4
    """
    
    SUMMARIES_DIR = "summaries"
    TIMELINE_FILENAME = "timeline.txt"
    OVERVIEW_FILENAME = "project_overview.txt"
    
    EVENT_TYPES = [
        'project_creation',
        'major_decision',
        'asset_addition',
        'error_occurrence',
        'recovery_event',
        'milestone',
        'discussion',
        'configuration_change',
    ]
    
    def __init__(self, project_path: Path):
        """
        Initialize the TimelineGenerator.
        
        Args:
            project_path: Root path for the project
        """
        self.project_path = Path(project_path)
        self.summaries_path = self.project_path / self.SUMMARIES_DIR
        self.timeline_path = self.summaries_path / self.TIMELINE_FILENAME
        self.overview_path = self.summaries_path / self.OVERVIEW_FILENAME
    
    def record_event(
        self,
        event_type: str,
        description: str,
        details: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Record a significant event in timeline.txt.
        
        Args:
            event_type: Type of event
            description: Event description
            details: Additional event details
            
        Returns:
            True if recorded successfully, False otherwise
            
        Validates: Requirement 14.1
        """
        try:
            # Ensure directory exists
            self.summaries_path.mkdir(parents=True, exist_ok=True)
            
            timestamp = datetime.now().isoformat()
            
            # Sanitize description (remove problematic characters)
            clean_description = description.replace('\r', ' ').replace('\n', ' ').strip()
            
            # Format event entry
            entry_lines = []
            entry_lines.append(f"[{timestamp}] {event_type.upper()}")
            entry_lines.append(f"  Description: {clean_description}")
            
            if details:
                for key, value in details.items():
                    # Sanitize both key and value
                    clean_key = str(key).replace('\r', ' ').replace('\n', ' ').strip()
                    clean_value = str(value).replace('\r', ' ').replace('\n', ' ').strip()
                    
                    # Only add if both key and value are non-empty after sanitization
                    if clean_key and clean_value:
                        entry_lines.append(f"  {clean_key}: {clean_value}")
            
            entry_lines.append("")  # Empty line separator
            
            # Append to timeline
            with open(self.timeline_path, 'a', encoding='utf-8') as f:
                f.write("\n".join(entry_lines))
            
            return True
            
        except Exception as e:
            print(f"Error recording timeline event: {e}")
            return False
    
    def record_project_creation(
        self,
        project_name: str,
        project_type: str,
        objectives: List[str]
    ) -> bool:
        """
        Record project creation event.
        
        Args:
            project_name: Name of the project
            project_type: Type of project
            objectives: Project objectives
            
        Returns:
            True if recorded successfully, False otherwise
        """
        return self.record_event(
            event_type="project_creation",
            description=f"Project '{project_name}' created",
            details={
                "project_type": project_type,
                "objectives_count": str(len(objectives)),
                "objectives": ", ".join(objectives[:3]) + ("..." if len(objectives) > 3 else "")
            }
        )
    
    def record_decision(
        self,
        decision: str,
        rationale: Optional[str] = None
    ) -> bool:
        """
        Record a major decision.
        
        Args:
            decision: Decision description
            rationale: Reasoning behind the decision
            
        Returns:
            True if recorded successfully, False otherwise
        """
        return self.record_event(
            event_type="major_decision",
            description=decision,
            details={"rationale": rationale} if rationale else None
        )
    
    def record_asset_addition(
        self,
        asset_name: str,
        asset_type: str
    ) -> bool:
        """
        Record asset addition.
        
        Args:
            asset_name: Name of the asset
            asset_type: Type of asset
            
        Returns:
            True if recorded successfully, False otherwise
        """
        return self.record_event(
            event_type="asset_addition",
            description=f"Asset added: {asset_name}",
            details={"asset_type": asset_type}
        )
    
    def record_error(
        self,
        error_type: str,
        description: str,
        severity: str
    ) -> bool:
        """
        Record an error occurrence.
        
        Args:
            error_type: Type of error
            description: Error description
            severity: Error severity
            
        Returns:
            True if recorded successfully, False otherwise
        """
        return self.record_event(
            event_type="error_occurrence",
            description=f"{severity.upper()} error: {description}",
            details={"error_type": error_type, "severity": severity}
        )
    
    def record_recovery(
        self,
        recovery_type: str,
        result: str
    ) -> bool:
        """
        Record a recovery event.
        
        Args:
            recovery_type: Type of recovery performed
            result: Result of the recovery
            
        Returns:
            True if recorded successfully, False otherwise
        """
        return self.record_event(
            event_type="recovery_event",
            description=f"Recovery performed: {recovery_type}",
            details={"result": result}
        )
    
    def record_milestone(
        self,
        milestone: str,
        details: Optional[str] = None
    ) -> bool:
        """
        Record a project milestone.
        
        Args:
            milestone: Milestone description
            details: Additional details
            
        Returns:
            True if recorded successfully, False otherwise
        """
        return self.record_event(
            event_type="milestone",
            description=milestone,
            details={"details": details} if details else None
        )
    
    def get_timeline(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Retrieve timeline entries.
        
        Args:
            limit: Maximum number of entries to return
            
        Returns:
            List of timeline events
            
        Validates: Requirement 14.2
        """
        if not self.timeline_path.exists():
            return []
        
        events = []
        
        try:
            with open(self.timeline_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Parse events
            current_event = None
            lines = content.split('\n')
            
            for line in lines:
                line = line.strip()
                
                if not line:
                    if current_event:
                        events.append(current_event)
                        current_event = None
                    continue
                
                # Parse event header
                if line.startswith('[') and ']' in line:
                    timestamp = line[1:line.index(']')]
                    event_type = line[line.index(']') + 2:].upper()
                    
                    if current_event:
                        events.append(current_event)
                    
                    current_event = {
                        'timestamp': timestamp,
                        'event_type': event_type,
                        'description': '',
                        'details': {}
                    }
                
                # Parse event details
                elif current_event and ': ' in line:
                    parts = line.split(': ', 1)
                    if len(parts) == 2:
                        key = parts[0].strip()
                        value = parts[1].strip()
                        
                        if key.lower() == "description":
                            current_event['description'] = value
                        else:
                            current_event['details'][key] = value
            
            # Don't forget last event
            if current_event:
                events.append(current_event)
            
            # Sort by timestamp and limit
            events.sort(key=lambda e: e['timestamp'], reverse=True)
            return events[:limit]
            
        except Exception as e:
            print(f"Error reading timeline: {e}")
            return []
    
    def update_overview(
        self,
        project_context: Dict[str, Any],
        force: bool = False
    ) -> bool:
        """
        Update project_overview.txt with current context.
        
        Args:
            project_context: Current project context
            force: Force update even if recently updated
            
        Returns:
            True if updated successfully, False otherwise
            
        Validates: Requirements 13.1, 13.5
        """
        try:
            # Check if update is needed
            if not force and self.overview_path.exists():
                last_modified = self.overview_path.stat().st_mtime
                time_since_mod = datetime.now().timestamp() - last_modified
                
                # Update at most once per hour
                if time_since_mod < 3600:
                    return True
            
            # Generate overview
            overview = self._generate_overview(project_context)
            
            # Write overview
            self.summaries_path.mkdir(parents=True, exist_ok=True)
            
            with open(self.overview_path, 'w', encoding='utf-8') as f:
                f.write(overview)
            
            # Record event
            self.record_event(
                event_type="configuration_change",
                description="Project overview updated",
                details={"force_update": str(force)}
            )
            
            return True
            
        except Exception as e:
            print(f"Error updating overview: {e}")
            return False
    
    def _generate_overview(self, context: Dict[str, Any]) -> str:
        """
        Generate project overview content.
        
        Args:
            context: Project context dictionary
            
        Returns:
            Overview text
            
        Validates: Requirement 13.2
        """
        lines = []
        lines.append("=" * 60)
        lines.append("PROJECT OVERVIEW")
        lines.append(f"Last Updated: {datetime.now().isoformat()}")
        lines.append("=" * 60)
        lines.append("")
        
        # Project name and type
        config = context.get('config', {})
        project_name = config.get('project_name', 'Unnamed Project')
        project_type = config.get('project_type', 'unknown')
        
        lines.append(f"PROJECT: {project_name}")
        lines.append(f"TYPE: {project_type}")
        lines.append("")
        
        # Current state
        memory = context.get('memory', {})
        current_state = memory.get('current_state', {})
        
        lines.append("CURRENT STATE")
        lines.append(f"  Phase: {current_state.get('phase', 'Unknown')}")
        lines.append(f"  Progress: {current_state.get('progress_percentage', 0)}%")
        lines.append("")
        
        # Objectives
        objectives = memory.get('objectives', [])
        if objectives:
            lines.append("OBJECTIVES")
            active = [o for o in objectives if o.get('status') == 'active']
            completed = [o for o in objectives if o.get('status') == 'completed']
            
            lines.append(f"  Active: {len(active)}")
            lines.append(f"  Completed: {len(completed)}")
            lines.append(f"  Total: {len(objectives)}")
            
            if active:
                lines.append("  Current:")
                for obj in active[:3]:
                    lines.append(f"    - {obj.get('description', 'Unknown')}")
            lines.append("")
        
        # Key decisions
        decisions = memory.get('decisions', [])
        if decisions:
            lines.append(f"KEY DECISIONS ({len(decisions)} total)")
            for decision in decisions[-5:]:
                desc = decision.get('description', 'Unknown')
                lines.append(f"  • {desc}")
            lines.append("")
        
        # Recent activity
        timeline = self.get_timeline(10)
        if timeline:
            lines.append("RECENT ACTIVITY")
            for event in timeline[:5]:
                event_type = event.get('event_type', 'UNKNOWN')
                desc = event.get('description', '')
                timestamp = event.get('timestamp', '')
                
                try:
                    dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    time_str = dt.strftime('%Y-%m-%d %H:%M')
                except ValueError:
                    time_str = timestamp[:10]
                
                lines.append(f"  [{time_str}] {event_type}: {desc}")
            lines.append("")
        
        # Next steps (derived from active tasks)
        task_backlog = memory.get('task_backlog', [])
        pending_tasks = [t for t in task_backlog if t.get('status') == 'pending']
        
        if pending_tasks:
            lines.append("NEXT STEPS")
            for task in pending_tasks[:5]:
                desc = task.get('description', 'Unknown')
                priority = task.get('priority', 'medium')
                lines.append(f"  [{priority.upper()}] {desc}")
            lines.append("")
        
        lines.append("=" * 60)
        lines.append("END OF OVERVIEW")
        lines.append("=" * 60)
        
        return "\n".join(lines)
    
    def get_overview(self) -> str:
        """
        Get current project overview.
        
        Returns:
            Overview text, or empty string if not available
        """
        if not self.overview_path.exists():
            return ""
        
        try:
            with open(self.overview_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception:
            return ""
    
    def get_event_count(self) -> int:
        """
        Get total number of timeline events.
        
        Returns:
            Number of events in timeline
        """
        if not self.timeline_path.exists():
            return 0
        
        try:
            with open(self.timeline_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            return content.count('] ')
            
        except Exception:
            return 0

