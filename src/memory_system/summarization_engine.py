"""
Summarization Engine for StoryCore LLM Memory System.

This module handles content compression and synthesis for efficient LLM consumption.
"""

from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime


class SummarizationEngine:
    """
    Compresses content for LLM efficiency.
    
    Responsibilities:
    - Summarize discussions with key point extraction
    - Consolidate asset summaries by type
    - Generate comprehensive project overviews
    - Maintain 10-20% compression ratio
    - Preserve decisions, action items, entities, constraints
    
    Validates: Requirements 4.2, 7.4, 13.1, 13.2, 13.3
    """
    
    # Target compression ratio (10-20%)
    MIN_COMPRESSION_RATIO = 0.10
    MAX_COMPRESSION_RATIO = 0.20
    
    def __init__(self, project_path: Path):
        """
        Initialize the SummarizationEngine.
        
        Args:
            project_path: Root path for the project
        """
        self.project_path = Path(project_path)
    
    def summarize_discussion(
        self, 
        discussion_text: str,
        max_points: int = 10
    ) -> str:
        """
        Create compressed summary of conversation.
        
        Args:
            discussion_text: Original discussion text
            max_points: Maximum number of key points to extract
            
        Returns:
            Compressed summary
            
        Validates: Requirement 4.2
        """
        lines = discussion_text.split('\n')
        
        summary = {
            "decisions": [],
            "action_items": [],
            "entities": [],
            "constraints": [],
            "objectives": [],
            "questions": []
        }
        
        for line in lines:
            line_lower = line.lower().strip()
            
            # Extract decisions
            if any(kw in line_lower for kw in ['decision:', 'decided:', 'we decided', 'agreed to']):
                content = self._extract_content(line)
                if content:
                    summary["decisions"].append(content)
            
            # Extract action items
            if any(kw in line_lower for kw in ['action:', 'will:', 'todo:', 'to do', 'need to']):
                content = self._extract_content(line)
                if content:
                    summary["action_items"].append(content)
            
            # Extract constraints
            if any(kw in line_lower for kw in ['constraint:', 'must', 'required to', 'cannot']):
                content = self._extract_content(line)
                if content:
                    summary["constraints"].append(content)
            
            # Extract objectives
            if any(kw in line_lower for kw in ['objective:', 'goal:', 'aim:']):
                content = self._extract_content(line)
                if content:
                    summary["objectives"].append(content)
        
        # Format summary
        return self._format_discussion_summary(summary)
    
    def _extract_content(self, line: str) -> Optional[str]:
        """Extract meaningful content from a line."""
        # Remove common prefixes
        prefixes = ['- ', '* ', '• ', '1. ', '2. ', '3. ']
        content = line.strip()
        
        for prefix in prefixes:
            if content.startswith(prefix):
                content = content[len(prefix):]
        
        # Remove role indicators
        if content.lower().startswith(('user:', 'assistant:', 'system:')):
            content = content.split(':', 1)[-1].strip()
        
        return content if content else None
    
    def _format_discussion_summary(self, summary: Dict[str, List[str]]) -> str:
        """Format discussion summary for output."""
        lines = []
        lines.append("=" * 60)
        lines.append("DISCUSSION SUMMARY")
        lines.append(f"Generated: {datetime.now().isoformat()}")
        lines.append("=" * 60)
        lines.append("")
        
        if summary["decisions"]:
            lines.append("KEY DECISIONS:")
            for decision in summary["decisions"][:10]:
                lines.append(f"  • {decision}")
            lines.append("")
        
        if summary["action_items"]:
            lines.append("ACTION ITEMS:")
            for action in summary["action_items"][:10]:
                lines.append(f"  • {action}")
            lines.append("")
        
        if summary["constraints"]:
            lines.append("CONSTRAINTS:")
            for constraint in summary["constraints"][:5]:
                lines.append(f"  • {constraint}")
            lines.append("")
        
        if summary["objectives"]:
            lines.append("OBJECTIVES:")
            for objective in summary["objectives"][:5]:
                lines.append(f"  • {objective}")
            lines.append("")
        
        return "\n".join(lines)
    
    def summarize_assets(self, assets: List[Dict[str, Any]]) -> str:
        """
        Generate consolidated asset summary.
        
        Args:
            assets: List of asset information dictionaries
            
        Returns:
            Consolidated asset summary
            
        Validates: Requirement 7.4
        """
        # Group by type
        by_type = {}
        for asset in assets:
            asset_type = asset.get('type', 'unknown')
            if asset_type not in by_type:
                by_type[asset_type] = []
            by_type[asset_type].append(asset)
        
        lines = []
        lines.append("=" * 60)
        lines.append("ASSET SUMMARY")
        lines.append(f"Generated: {datetime.now().isoformat()}")
        lines.append("=" * 60)
        lines.append("")
        
        total_size = 0
        
        for asset_type in ['image', 'audio', 'video', 'document']:
            type_assets = by_type.get(asset_type, [])
            if not type_assets:
                continue
            
            lines.append(f"--- {asset_type.upper()}S ({len(type_assets)}) ---")
            
            for asset in type_assets:
                name = asset.get('filename', 'Unknown')
                size = asset.get('size_bytes', 0)
                total_size += size
                
                lines.append(f"• {name}")
                lines.append(f"  Size: {self._format_size(size)}")
                
                # Add type-specific info
                if asset_type == 'image':
                    dims = asset.get('metadata', {}).get('dimensions')
                    if dims:
                        lines.append(f"  Dimensions: {dims[0]}x{dims[1]}")
                elif asset_type == 'video':
                    duration = asset.get('metadata', {}).get('duration')
                    if duration:
                        lines.append(f"  Duration: {duration:.1f}s")
                elif asset_type == 'document':
                    pages = asset.get('metadata', {}).get('pages')
                    if pages:
                        lines.append(f"  Pages: {pages}")
                
                lines.append("")
        
        lines.append("=" * 60)
        lines.append(f"TOTAL: {len(assets)} assets, {self._format_size(total_size)}")
        lines.append("=" * 60)
        
        return "\n".join(lines)
    
    def _format_size(self, size_bytes: int) -> str:
        """Format file size in human-readable format."""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} TB"
    
    def generate_project_overview(
        self,
        memory_data: Dict[str, Any],
        recent_discussions: Optional[List[str]] = None,
        asset_summary: Optional[str] = None
    ) -> str:
        """
        Create comprehensive project summary.
        
        Args:
            memory_data: Project memory data
            recent_discussions: Recent discussion summaries
            asset_summary: Asset summary string
            
        Returns:
            Project overview
            
        Validates: Requirements 13.2, 13.3
        """
        lines = []
        lines.append("=" * 60)
        lines.append("PROJECT OVERVIEW")
        lines.append(f"Generated: {datetime.now().isoformat()}")
        lines.append("=" * 60)
        lines.append("")
        
        # Current state
        current_state = memory_data.get('current_state', {})
        lines.append("CURRENT STATE")
        lines.append(f"  Phase: {current_state.get('phase', 'Unknown')}")
        lines.append(f"  Progress: {current_state.get('progress_percentage', 0)}%")
        
        active_tasks = current_state.get('active_tasks', [])
        if active_tasks:
            lines.append(f"  Active Tasks: {', '.join(active_tasks)}")
        
        blockers = current_state.get('blockers', [])
        if blockers:
            lines.append("  Blockers:")
            for blocker in blockers:
                lines.append(f"    - {blocker}")
        lines.append("")
        
        # Objectives
        objectives = memory_data.get('objectives', [])
        if objectives:
            lines.append("OBJECTIVES")
            for obj in objectives:
                status = obj.get('status', 'unknown')
                desc = obj.get('description', 'Unknown')
                lines.append(f"  [{status.upper()}] {desc}")
            lines.append("")
        
        # Key decisions
        decisions = memory_data.get('decisions', [])
        if decisions:
            lines.append("RECENT DECISIONS")
            for decision in decisions[-5:]:
                desc = decision.get('description', 'Unknown')
                lines.append(f"  • {desc}")
            lines.append("")
        
        # Entities
        entities = memory_data.get('entities', [])
        if entities:
            lines.append(f"KEY ENTITIES ({len(entities)} total)")
            for entity in entities[:5]:
                name = entity.get('name', 'Unknown')
                entity_type = entity.get('type', 'unknown')
                lines.append(f"  • {name} ({entity_type})")
            lines.append("")
        
        # Task backlog
        task_backlog = memory_data.get('task_backlog', [])
        if task_backlog:
            pending_tasks = [t for t in task_backlog if t.get('status') in ['pending', 'in_progress']]
            lines.append(f"TASKS ({len(pending_tasks)} pending)")
            for task in pending_tasks[:5]:
                desc = task.get('description', 'Unknown')
                priority = task.get('priority', 'medium')
                lines.append(f"  [{priority.upper()}] {desc}")
            lines.append("")
        
        # Recent discussions
        if recent_discussions:
            lines.append("RECENT DISCUSSIONS")
            for i, disc in enumerate(recent_discussions[-3:], 1):
                lines.append(f"  {i}. {disc[:100]}...")
            lines.append("")
        
        # Asset summary
        if asset_summary:
            lines.append("ASSETS")
            lines.append(asset_summary[:500])
            lines.append("")
        
        lines.append("=" * 60)
        lines.append("END OF OVERVIEW")
        lines.append("=" * 60)
        
        return "\n".join(lines)
    
    def extract_key_points(
        self, 
        text: str, 
        max_points: int = 10
    ) -> List[str]:
        """
        Identify most important information from text.
        
        Args:
            text: Source text
            max_points: Maximum number of points to extract
            
        Returns:
            List of key points
            
        Validates: Requirement 4.4
        """
        lines = text.split('\n')
        key_points = []
        
        importance_markers = [
            'important:', 'key:', 'critical:', 'essential:',
            'remember:', 'note:', 'main:', 'primary:'
        ]
        
        decision_markers = ['decided', 'decision', 'agreed', 'concluded']
        action_markers = ['action:', 'will:', 'to do:', 'task:']
        
        for line in lines:
            line_lower = line.lower().strip()
            
            # Check for importance markers
            if any(marker in line_lower for marker in importance_markers):
                content = self._extract_content(line)
                if content:
                    key_points.append(f"IMPORTANT: {content}")
            
            # Check for decisions
            elif any(marker in line_lower for marker in decision_markers):
                content = self._extract_content(line)
                if content:
                    key_points.append(f"DECISION: {content}")
            
            # Check for action items
            elif any(marker in line_lower for marker in action_markers):
                content = self._extract_content(line)
                if content:
                    key_points.append(f"ACTION: {content}")
            
            # Limit results
            if len(key_points) >= max_points:
                break
        
        return key_points[:max_points]
    
    def synthesize_information(self, sources: List[str]) -> str:
        """
        Combine information from multiple sources.
        
        Args:
            sources: List of source texts to synthesize
            
        Returns:
            Synthesized summary
            
        Validates: Requirement 13.3
        """
        all_points = []
        
        for source in sources:
            points = self.extract_key_points(source, max_points=5)
            all_points.extend(points)
        
        # Format synthesis
        lines = []
        lines.append("=" * 60)
        lines.append("SYNTHESIZED INFORMATION")
        lines.append(f"Generated: {datetime.now().isoformat()}")
        lines.append(f"Sources: {len(sources)}")
        lines.append("=" * 60)
        lines.append("")
        
        # Group by type
        decisions = [p for p in all_points if p.startswith("DECISION:")]
        actions = [p for p in all_points if p.startswith("ACTION:")]
        important = [p for p in all_points if p.startswith("IMPORTANT:")]
        other = [p for p in all_points if not any(p.startswith(prefix) for prefix in ["DECISION:", "ACTION:", "IMPORTANT:"])]
        
        if decisions:
            lines.append("DECISIONS:")
            for point in decisions[:10]:
                lines.append(f"  • {point[9:]}")  # Remove "DECISION: " prefix
            lines.append("")
        
        if actions:
            lines.append("ACTIONS:")
            for point in actions[:10]:
                lines.append(f"  • {point[7:]}")  # Remove "ACTION: " prefix
            lines.append("")
        
        if important:
            lines.append("IMPORTANT POINTS:")
            for point in important[:10]:
                lines.append(f"  • {point[10:]}")  # Remove "IMPORTANT: " prefix
            lines.append("")
        
        if other:
            lines.append("OTHER NOTES:")
            for point in other[:10]:
                lines.append(f"  • {point}")
            lines.append("")
        
        return "\n".join(lines)
    
    def calculate_compression_ratio(self, original: str, summary: str) -> float:
        """
        Calculate the compression ratio of a summary.
        
        Args:
            original: Original text
            summary: Summarized text
            
        Returns:
            Compression ratio (summary_size / original_size)
        """
        original_len = len(original)
        summary_len = len(summary)
        
        if original_len == 0:
            return 1.0  # Empty original means 100% compression (degenerate case)
        
        return summary_len / original_len
    
    def validate_summary_quality(
        self, 
        original: str, 
        summary: str,
        min_ratio: float = MIN_COMPRESSION_RATIO,
        max_ratio: float = MAX_COMPRESSION_RATIO
    ) -> Dict[str, Any]:
        """
        Validate that a summary meets quality criteria.
        
        Args:
            original: Original text
            summary: Summarized text
            min_ratio: Minimum compression ratio
            max_ratio: Maximum compression ratio
            
        Returns:
            Dictionary with validation results
        """
        ratio = self.calculate_compression_ratio(original, summary)
        
        issues = []
        
        # Check compression ratio
        if ratio > max_ratio:
            issues.append(f"Summary too long (ratio: {ratio:.2%}, max: {max_ratio:.2%})")
        elif ratio < min_ratio:
            issues.append(f"Summary too short (ratio: {ratio:.2%}, min: {min_ratio:.2%})")
        
        # Check for key information preservation
        key_points = self.extract_key_points(original, max_points=20)
        preserved = 0
        
        for point in key_points:
            point_content = point.split(': ', 1)[-1] if ': ' in point else point
            if point_content.lower() in summary.lower():
                preserved += 1
        
        preservation_ratio = preserved / len(key_points) if key_points else 1.0
        
        if preservation_ratio < 0.5:
            issues.append(f"Low key information preservation ({preservation_ratio:.0%})")
        
        return {
            "valid": len(issues) == 0,
            "compression_ratio": ratio,
            "information_preservation": preservation_ratio,
            "issues": issues
        }

