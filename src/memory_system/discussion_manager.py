"""
Discussion Manager for StoryCore LLM Memory System.

This module handles recording conversations and creating summaries for efficient
LLM context management.
"""

import json
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
import os

from .data_models import (
    Conversation,
    Message,
)


class DiscussionManager:
    """
    Manages conversation recording and summarization.
    
    Responsibilities:
    - Record conversations to timestamped files
    - Support session-based file grouping
    - Create compressed summaries
    - Extract key information from discussions
    
    Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5
    """
    
    DISCUSSIONS_RAW_DIR = "assistant/discussions_raw"
    DISCUSSIONS_SUMMARY_DIR = "assistant/discussions_summary"
    
    def __init__(self, project_path: Path):
        """
        Initialize the DiscussionManager.
        
        Args:
            project_path: Root path for the project
        """
        self.project_path = Path(project_path)
        self.raw_path = self.project_path / self.DISCUSSIONS_RAW_DIR
        self.summary_path = self.project_path / self.DISCUSSIONS_SUMMARY_DIR
        
        # Track current session for grouping
        self._current_session_id: Optional[str] = None
        self._current_session_file: Optional[Path] = None
    
    def record_conversation(
        self, 
        conversation: Conversation, 
        session_id: Optional[str] = None
    ) -> Path:
        """
        Append conversation to timestamped file in discussions_raw/.
        
        If a session ID is provided and matches current session, append to same file.
        Otherwise, create a new file for the new session.
        
        Args:
            conversation: The conversation to record
            session_id: Optional session identifier for grouping
            
        Returns:
            Path to the discussion file
            
        Validates: Requirements 3.1, 3.3, 3.4, 3.5
        """
        # Ensure directories exist
        self.raw_path.mkdir(parents=True, exist_ok=True)
        
        # Determine session file
        if session_id and session_id == self._current_session_id and self._current_session_file:
            # Continue in current session file
            discussion_file = self._current_session_file
        else:
            # Create new session file
            session_id = session_id or self._generate_session_id(conversation.start_time)
            discussion_file = self._create_session_file(session_id)
            self._current_session_id = session_id
            self._current_session_file = discussion_file
        
        # Append conversation to file
        self._append_conversation_to_file(discussion_file, conversation)
        
        return discussion_file
    
    def _generate_session_id(self, start_time: datetime) -> str:
        """
        Generate a session ID from timestamp.
        
        Args:
            start_time: Start time of the conversation
            
        Returns:
            Session ID string
        """
        return f"session_{start_time.strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
    
    def _create_session_file(self, session_id: str) -> Path:
        """
        Create a new discussion file for a session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Path to the new discussion file
        """
        filename = f"{session_id}.json"
        file_path = self.raw_path / filename
        return file_path
    
    def _append_conversation_to_file(
        self, 
        file_path: Path, 
        conversation: Conversation
    ) -> None:
        """
        Append conversation content to a discussion file.
        
        Args:
            file_path: Path to the discussion file
            conversation: Conversation to append
        """
        # Read existing content if file exists
        existing_data = []
        if file_path.exists():
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
            except (json.JSONDecodeError, UnicodeDecodeError):
                existing_data = []
        
        # Convert conversation to serializable format
        conversation_data = {
            "session_id": conversation.session_id,
            "start_time": conversation.start_time.isoformat() if isinstance(conversation.start_time, datetime) else conversation.start_time,
            "messages": [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat() if isinstance(msg.timestamp, datetime) else msg.timestamp,
                }
                for msg in conversation.messages
            ]
        }
        
        existing_data.append(conversation_data)
        
        # Write back to file
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(existing_data, f, indent=2, ensure_ascii=False)
    
    def get_discussion_file(self, session_id: str) -> Optional[Path]:
        """
        Get the discussion file path for a session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Path to the discussion file or None if not found
        """
        filename = f"{session_id}.json"
        file_path = self.raw_path / filename
        return file_path if file_path.exists() else None
    
    def should_summarize(self, discussion_file: Optional[Path] = None, threshold_kb: int = 50) -> bool:
        """
        Check if discussion file exceeds size threshold for summarization.
        
        Args:
            discussion_file: Path to discussion file (uses current session if None)
            threshold_kb: Size threshold in KB
            
        Returns:
            True if summarization should be triggered
            
        Validates: Requirement 4.1
        """
        if discussion_file is None:
            discussion_file = self._current_session_file
        
        if discussion_file is None or not discussion_file.exists():
            return False
        
        file_size_bytes = discussion_file.stat().st_size
        threshold_bytes = threshold_kb * 1024
        
        return file_size_bytes > threshold_bytes
    
    def create_summary(
        self, 
        discussion_file: Optional[Path] = None,
        session_id: Optional[str] = None
    ) -> Optional[Path]:
        """
        Generate compressed summary and save to discussions_summary/.
        
        Args:
            discussion_file: Path to discussion file
            session_id: Session identifier (used if discussion_file is None)
            
        Returns:
            Path to the summary file
            
        Validates: Requirements 4.2, 4.3
        """
        # Determine discussion file
        if discussion_file is None and session_id:
            discussion_file = self.get_discussion_file(session_id)
        
        if discussion_file is None or not discussion_file.exists():
            return None
        
        # Read discussion content
        try:
            with open(discussion_file, 'r', encoding='utf-8') as f:
                discussions = json.load(f)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None
        
        # Generate summary
        summary_content = self._generate_summary_content(discussions)
        
        # Create summary file
        self.summary_path.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        summary_filename = f"summary_{discussion_file.stem}_{timestamp}.txt"
        summary_file = self.summary_path / summary_filename
        
        with open(summary_file, 'w', encoding='utf-8') as f:
            f.write(summary_content)
        
        return summary_file
    
    def _generate_summary_content(self, discussions: List[Dict[str, Any]]) -> str:
        """
        Generate a compressed summary from discussion data.
        
        Args:
            discussions: List of conversation data
            
        Returns:
            Summary text
        """
        summary_lines = []
        summary_lines.append("=" * 60)
        summary_lines.append("DISCUSSION SUMMARY")
        summary_lines.append(f"Generated: {datetime.now().isoformat()}")
        summary_lines.append("=" * 60)
        summary_lines.append("")
        
        for i, discussion in enumerate(discussions, 1):
            summary_lines.append(f"--- Conversation {i} ---")
            summary_lines.append(f"Session: {discussion.get('session_id', 'Unknown')}")
            summary_lines.append(f"Start Time: {discussion.get('start_time', 'Unknown')}")
            summary_lines.append("")
            
            # Extract key information
            messages = discussion.get('messages', [])
            
            # Collect decisions, action items, entities, constraints
            decisions = []
            action_items = []
            entities = []
            constraints = []
            user_queries = []
            
            for msg in messages:
                content = msg.get('content', '')
                role = msg.get('role', '')
                
                if role == 'user':
                    user_queries.append(content)
                elif role == 'assistant':
                    # Look for structured responses
                    if 'decision:' in content.lower() or 'decided:' in content.lower():
                        decisions.append(content)
                    elif 'action:' in content.lower() or 'will:' in content.lower():
                        action_items.append(content)
                
                # Simple entity extraction (keywords)
                for word in ['character', 'module', 'component', 'system', 'feature']:
                    if word in content.lower() and content not in entities:
                        entities.append(content[:200] + '...' if len(content) > 200 else content)
            
            # Write extracted information
            if decisions:
                summary_lines.append("KEY DECISIONS:")
                for decision in decisions[:5]:  # Limit to 5
                    summary_lines.append(f"  • {decision[:300]}")
                summary_lines.append("")
            
            if action_items:
                summary_lines.append("ACTION ITEMS:")
                for action in action_items[:5]:
                    summary_lines.append(f"  • {action[:300]}")
                summary_lines.append("")
            
            if entities:
                summary_lines.append("ENTITIES/MODULES:")
                for entity in list(set(entities))[:5]:
                    summary_lines.append(f"  • {entity[:200]}")
                summary_lines.append("")
            
            # Last user query (current context)
            if user_queries:
                summary_lines.append("CURRENT FOCUS:")
                summary_lines.append(f"  {user_queries[-1][:500]}")
                summary_lines.append("")
            
            summary_lines.append("-" * 40)
            summary_lines.append("")
        
        return "\n".join(summary_lines)
    
    def extract_key_information(self, discussion_text: str) -> Dict[str, Any]:
        """
        Extract decisions, action items, entities, constraints from discussion.
        
        Args:
            discussion_text: Raw discussion text
            
        Returns:
            Dictionary with extracted key information
            
        Validates: Requirement 4.4
        """
        key_info = {
            "decisions": [],
            "action_items": [],
            "entities": [],
            "constraints": [],
            "objectives": [],
        }
        
        lines = discussion_text.split('\n')
        
        for line in lines:
            line_lower = line.lower().strip()
            
            # Simple keyword-based extraction (can be enhanced with LLM)
            if any(keyword in line_lower for keyword in ['decision:', 'decided:', 'we decided', 'agreed to']):
                decision = line.split(':', 1)[-1].strip() if ':' in line else line
                if decision:
                    key_info["decisions"].append(decision)
            
            if any(keyword in line_lower for keyword in ['action:', 'will:', 'todo:', 'to do', 'action item']):
                action = line.split(':', 1)[-1].strip() if ':' in line else line
                if action:
                    key_info["action_items"].append(action)
            
            if any(keyword in line_lower for keyword in ['constraint:', 'must', 'required to', 'cannot', 'must not']):
                constraint = line.split(':', 1)[-1].strip() if ':' in line else line
                if constraint:
                    key_info["constraints"].append(constraint)
            
            if any(keyword in line_lower for keyword in ['objective:', 'goal:', 'aim:']):
                objective = line.split(':', 1)[-1].strip() if ':' in line else line
                if objective:
                    key_info["objectives"].append(objective)
        
        return key_info
    
    def get_discussion_history(
        self, 
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Retrieve recent discussion summaries.
        
        Args:
            limit: Maximum number of discussions to return
            
        Returns:
            List of discussion summaries
        """
        if not self.raw_path.exists():
            return []
        
        discussions = []
        
        # Get all discussion files, sorted by modification time
        try:
            files = sorted(
                self.raw_path.glob("*.json"),
                key=lambda f: f.stat().st_mtime,
                reverse=True
            )[:limit]
            
            for file_path in files:
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        for discussion in data:
                            discussion['_file'] = str(file_path)
                            discussions.append(discussion)
                except (json.JSONDecodeError, UnicodeDecodeError):
                    continue
        except PermissionError:
            pass
        
        return discussions
    
    def get_summary_file_for_discussion(self, discussion_file: Path) -> Optional[Path]:
        """
        Get the summary file corresponding to a discussion file.
        
        Args:
            discussion_file: Path to the discussion file
            
        Returns:
            Path to the summary file or None
        """
        if not self.summary_path.exists():
            return None
        
        # Look for summary files with matching session prefix
        prefix = discussion_file.stem
        summary_files = list(self.summary_path.glob(f"summary_{prefix}_*.txt"))
        
        if summary_files:
            # Return most recent
            return max(summary_files, key=lambda f: f.stat().st_mtime)
        
        return None
    
    def get_recent_summaries(self, limit: int = 5) -> List[Path]:
        """
        Get the most recent summary files.
        
        Args:
            limit: Maximum number of summaries to return
            
        Returns:
            List of summary file paths
        """
        if not self.summary_path.exists():
            return []
        
        try:
            files = sorted(
                self.summary_path.glob("*.txt"),
                key=lambda f: f.stat().st_mtime,
                reverse=True
            )[:limit]
            return list(files)
        except PermissionError:
            return []
    
    def clear_session(self) -> None:
        """Clear the current session tracking."""
        self._current_session_id = None
        self._current_session_file = None

