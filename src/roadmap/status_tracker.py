"""
Status Tracker component for the Public Roadmap System.

This module determines the current implementation status of features by analyzing
tasks.md files and git history. It calculates completion percentages, maps them
to status enums, and retrieves completion dates.
"""

import logging
import re
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

from .models import FeatureStatus


# Configure logging
logger = logging.getLogger(__name__)


class StatusTracker:
    """
    Tracks feature implementation status by analyzing task completion.
    
    This class parses tasks.md files to calculate completion percentages,
    determines appropriate status values, and retrieves completion dates
    from git history when features reach 100% completion.
    """
    
    def calculate_completion(self, tasks_file: Path) -> float:
        r"""
        Calculate task completion percentage from tasks.md file.
        
        Parses markdown checkbox syntax to count completed vs total tasks.
        Supports the following checkbox formats:
        - [ ] = Not started (space inside brackets)
        - [x] = Completed (x inside brackets)
        - [-] = In progress (dash inside brackets)
        - [~] = Queued (tilde inside brackets)
        
        Optional tasks (marked with * or \* after the closing bracket) are
        excluded from completion calculations.
        
        Args:
            tasks_file: Path to the tasks.md file
            
        Returns:
            Completion percentage as a float between 0.0 and 1.0
            
        Raises:
            FileNotFoundError: If tasks_file doesn't exist
            ValueError: If file cannot be read or parsed
        """
        if not tasks_file.exists():
            logger.error("Tasks file not found: %s", tasks_file)
            raise FileNotFoundError(f"Tasks file not found: {tasks_file}")
        
        try:
            content = tasks_file.read_text(encoding='utf-8')
        except PermissionError as e:
            logger.error("Permission denied reading %s: %s", tasks_file, e)
            raise ValueError(f"Permission denied reading {tasks_file}: {e}")
        except UnicodeDecodeError as e:
            logger.error("Unicode decode error reading %s: %s", tasks_file, e)
            raise ValueError(f"Failed to decode {tasks_file} as UTF-8: {e}")
        except OSError as e:
            logger.error("OS error reading %s: %s", tasks_file, e)
            raise ValueError(f"Failed to read {tasks_file}: {e}")
        except Exception as e:
            logger.error("Unexpected error reading %s: %s", tasks_file, e, exc_info=True)
            raise ValueError(f"Failed to read tasks file {tasks_file}: {e}")
        
        try:
            # Pattern to match task checkboxes
            # Matches: - [ ], - [x], - [-], - [~]
            # Captures: checkbox status and whether task is optional
            task_pattern = re.compile(
                r'^[ \t]*-[ \t]+\[([x \-~])\](\*|\\?\*)?',
                re.MULTILINE
            )
            
            matches = task_pattern.findall(content)
            
            if not matches:
                # No tasks found, consider it 0% complete
                logger.debug("No tasks found in %s", tasks_file)
                return 0.0
            
            # Filter out optional tasks (those with * or \* after checkbox)
            required_tasks = [
                status for status, optional in matches
                if not optional or optional.strip() == ''
            ]
            
            if not required_tasks:
                # All tasks are optional, consider it 100% complete
                logger.debug("All tasks in %s are optional", tasks_file)
                return 1.0
            
            # Count completed tasks (marked with 'x')
            completed = sum(1 for status in required_tasks if status == 'x')
            total = len(required_tasks)
            
            completion = completed / total if total > 0 else 0.0
            logger.debug("Calculated completion for %s: %.1f%% (%d/%d)", 
                        tasks_file.name, completion * 100, completed, total)
            return completion
            
        except Exception as e:
            logger.error("Error calculating completion for %s: %s", tasks_file, e, exc_info=True)
            raise ValueError(f"Failed to calculate completion for {tasks_file}: {e}")
    
    def determine_status(
        self,
        completion: float,
        metadata: Optional[Dict] = None
    ) -> FeatureStatus:
        """
        Determine feature status from completion percentage and metadata.
        
        Maps completion percentage to status:
        - 0% = planned
        - 1-99% = in-progress
        - 100% = completed
        
        Respects manual status overrides in metadata if provided.
        
        Args:
            completion: Task completion percentage (0.0 to 1.0)
            metadata: Optional metadata dict that may contain status override
            
        Returns:
            FeatureStatus enum value
            
        Raises:
            ValueError: If completion is not between 0.0 and 1.0
        """
        if not isinstance(completion, (int, float)):
            logger.error("completion must be a number, got %s", type(completion))
            raise ValueError(f"completion must be a number, got {type(completion)}")
        
        if not 0.0 <= completion <= 1.0:
            logger.error("completion must be between 0.0 and 1.0, got %f", completion)
            raise ValueError(
                f"Completion must be between 0.0 and 1.0, got {completion}"
            )
        
        try:
            # Check for manual status override in metadata
            if metadata and 'status' in metadata:
                status_str = str(metadata['status']).lower()
                try:
                    # Try to match the status string to a FeatureStatus enum
                    for status in FeatureStatus:
                        if status.value == status_str:
                            logger.debug("Using manual status override: %s", status.value)
                            return status
                    logger.warning("Invalid status override '%s', using automatic determination", status_str)
                except (AttributeError, KeyError) as e:
                    logger.warning("Error processing status override: %s", e)
                    pass  # Fall through to automatic determination
            
            # Automatic status determination based on completion
            if completion == 0.0:
                status = FeatureStatus.PLANNED
            elif completion == 1.0:
                status = FeatureStatus.COMPLETED
            else:
                status = FeatureStatus.IN_PROGRESS
            
            logger.debug("Determined status: %s (completion=%.1f%%)", status.value, completion * 100)
            return status
            
        except Exception as e:
            logger.error("Error determining status: %s", e, exc_info=True)
            # Default to PLANNED on error
            return FeatureStatus.PLANNED
    
    def get_completion_date(self, spec_dir: Path) -> Optional[datetime]:
        """
        Get completion date from git history.
        
        Analyzes git log to find when tasks.md reached 100% completion.
        This is determined by finding the most recent commit where all
        required tasks were marked as completed.
        
        Args:
            spec_dir: Path to the spec directory
            
        Returns:
            Datetime of completion, or None if not completed or git unavailable
        """
        if not spec_dir.exists():
            logger.warning("Spec directory does not exist: %s", spec_dir)
            return None
        
        tasks_file = spec_dir / "tasks.md"
        
        if not tasks_file.exists():
            logger.debug("No tasks.md file in %s", spec_dir)
            return None
        
        try:
            # Get git log for the tasks.md file
            # Format: commit hash and date
            result = subprocess.run(
                [
                    'git', 'log',
                    '--follow',  # Follow file renames
                    '--format=%H|%aI',  # Hash and ISO date
                    '--',
                    str(tasks_file)
                ],
                cwd=spec_dir.parent.parent,  # Run from repo root
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode != 0:
                # Git command failed (not a git repo, file not tracked, etc.)
                logger.debug("Git command failed for %s: %s", tasks_file, result.stderr)
                return None
            
            # Parse git log output
            commits = []
            for line in result.stdout.strip().split('\n'):
                if not line:
                    continue
                parts = line.split('|')
                if len(parts) == 2:
                    commit_hash, date_str = parts
                    commits.append((commit_hash, date_str))
            
            if not commits:
                logger.debug("No git commits found for %s", tasks_file)
                return None
            
            # Check each commit from newest to oldest
            for commit_hash, date_str in commits:
                try:
                    # Get file content at this commit
                    content_result = subprocess.run(
                        [
                            'git', 'show',
                            f'{commit_hash}:{tasks_file.relative_to(spec_dir.parent.parent)}'
                        ],
                        cwd=spec_dir.parent.parent,
                        capture_output=True,
                        text=True,
                        timeout=10
                    )
                    
                    if content_result.returncode != 0:
                        logger.debug("Failed to get content for commit %s", commit_hash[:8])
                        continue
                    
                    # Write content to temporary file and calculate completion
                    import tempfile
                    with tempfile.NamedTemporaryFile(
                        mode='w',
                        suffix='.md',
                        delete=False,
                        encoding='utf-8'
                    ) as tmp:
                        tmp.write(content_result.stdout)
                        tmp_path = Path(tmp.name)
                    
                    try:
                        completion = self.calculate_completion(tmp_path)
                        if completion == 1.0:
                            # Found the completion commit
                            completion_date = datetime.fromisoformat(date_str)
                            logger.debug("Found completion date for %s: %s", 
                                       spec_dir.name, completion_date.strftime("%Y-%m-%d"))
                            return completion_date
                    finally:
                        tmp_path.unlink()  # Clean up temp file
                        
                except subprocess.TimeoutExpired:
                    logger.warning("Git command timed out for commit %s", commit_hash[:8])
                    continue
                except Exception as e:
                    logger.debug("Error processing commit %s: %s", commit_hash[:8], e)
                    continue
            
            # No commit found with 100% completion
            logger.debug("No completion commit found for %s", spec_dir.name)
            return None
            
        except subprocess.TimeoutExpired:
            logger.warning("Git log command timed out for %s", tasks_file)
            return None
        except subprocess.SubprocessError as e:
            logger.debug("Git subprocess error for %s: %s", tasks_file, e)
            return None
        except OSError as e:
            logger.debug("OS error running git for %s: %s", tasks_file, e)
            return None
        except Exception as e:
            logger.error("Unexpected error getting completion date for %s: %s", 
                        spec_dir, e, exc_info=True)
            return None
