"""
Story Feedback Integration Service for StoryCore-Engine

Integrates story generation feedback with GitHub Issues for continuous improvement.
Provides structured feedback collection and automatic issue creation.
"""

import asyncio
import logging
import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field

from pydantic import BaseModel, Field, validator
from backend.database import get_db
from backend.database_models import generate_uuid

logger = logging.getLogger(__name__)

# =============================================================================
# Data Models
# =============================================================================

class StoryFeedback(BaseModel):
    """Structured feedback for story generation"""
    story_id: str = Field(..., description="ID of the story")
    feedback_type: str = Field(..., description="Type of feedback: quality, structure, characters, plot, etc.")
    rating: int = Field(..., ge=1, le=5, description="Rating from 1-5")
    comment: str = Field(..., description="Detailed feedback comment")
    suggestions: List[str] = Field(default_factory=list, description="Suggestions for improvement")
    user_id: Optional[str] = Field(None, description="User ID (if available)")
    timestamp: datetime = Field(default_factory=datetime.now, description="Feedback timestamp")

class FeedbackIssue(BaseModel):
    """GitHub issue created from feedback"""
    issue_id: str = Field(..., description="GitHub issue ID")
    story_id: str = Field(..., description="Related story ID")
    feedback_id: str = Field(..., description="Original feedback ID")
    title: str = Field(..., description="Issue title")
    body: str = Field(..., description="Issue body")
    labels: List[str] = Field(default_factory=list, description="GitHub labels")
    status: str = Field(default="open", description="Issue status")
    created_at: datetime = Field(default_factory=datetime.now, description="Creation timestamp")

class FeedbackAnalytics(BaseModel):
    """Analytics for feedback patterns"""
    total_feedback: int = Field(0, description="Total feedback received")
    average_rating: float = Field(0.0, description="Average rating")
    common_issues: List[str] = Field(default_factory=list, description="Common issues identified")
    improvement_suggestions: List[str] = Field(default_factory=list, description="Suggested improvements")
    feedback_trend: Dict[str, float] = Field(default_factory=dict, description="Feedback trends over time")

# =============================================================================
# Story Feedback Integration Service
# =============================================================================

class StoryFeedbackIntegrationService:
    """
    Service for integrating story generation feedback with GitHub Issues.
    Provides continuous improvement loop through structured feedback collection.
    """
    
    def __init__(self):
        self.feedback_proxy = FeedbackProxy()
        self.feedback_cache = {}  # Cache for recent feedback
        self.issue_templates = {
            "quality": {
                "title": "Story Quality Issue: {story_id}",
                "body": "Quality feedback received for story {story_id}:\n\n**Rating:** {rating}/5\n\n**Comment:** {comment}\n\n**Suggestions:**\n{suggestions}",
                "labels": ["quality", "story", "needs-improvement"]
            },
            "structure": {
                "title": "Story Structure Issue: {story_id}",
                "body": "Structure feedback received for story {story_id}:\n\n**Rating:** {rating}/5\n\n**Comment:** {comment}\n\n**Suggestions:**\n{suggestions}",
                "labels": ["structure", "story", "needs-improvement"]
            },
            "characters": {
                "title": "Character Development Issue: {story_id}",
                "body": "Character feedback received for story {story_id}:\n\n**Rating:** {rating}/5\n\n**Comment:** {comment}\n\n**Suggestions:**\n{suggestions}",
                "labels": ["characters", "story", "needs-improvement"]
            },
            "plot": {
                "title": "Plot Issue: {story_id}",
                "body": "Plot feedback received for story {story_id}:\n\n**Rating:** {rating}/5\n\n**Comment:** {comment}\n\n**Suggestions:**\n{suggestions}",
                "labels": ["plot", "story", "needs-improvement"]
            }
        }
    
    async def submit_feedback(self, feedback: StoryFeedback) -> Tuple[bool, str]:
        """
        Submit story feedback and create GitHub issue if needed.
        
        Args:
            feedback: Structured feedback data
            
        Returns:
            Tuple of (success, message)
        """
        try:
            # Validate feedback
            if not self._validate_feedback(feedback):
                return False, "Invalid feedback data"
            
            # Save feedback to database
            await self._save_feedback_to_db(feedback)
            
            # Create GitHub issue for low ratings or critical feedback
            if feedback.rating <= 3 or feedback.feedback_type in ["quality", "structure"]:
                issue_result = await self._create_github_issue(feedback)
                if issue_result[0]:
                    # Link issue to feedback
                    await self._link_issue_to_feedback(feedback.story_id, issue_result[1])
                    return True, f"Feedback submitted and issue created: {issue_result[1]}"
                else:
                    return True, f"Feedback submitted but issue creation failed: {issue_result[1]}"
            
            return True, "Feedback submitted successfully"
            
        except Exception as e:
            logger.error(f"Failed to submit feedback: {e}")
            return False, str(e)
    
    async def get_feedback_analytics(self, story_id: Optional[str] = None) -> FeedbackAnalytics:
        """
        Get analytics for feedback data.
        
        Args:
            story_id: Optional story ID to filter analytics
            
        Returns:
            Feedback analytics data
        """
        try:
            async for db in get_db():
                from sqlalchemy import select, func
                # Note: This assumes a StoryFeedback model exists
                # If not, this is a placeholder that returns empty analytics
                query = select(StoryFeedback)
                if story_id:
                    query = query.where(StoryFeedback.story_id == story_id)
                
                result = await db.execute(query)
                feedbacks = result.scalars().all()
                break
            
            if not feedbacks:
                return FeedbackAnalytics()
            
            # Calculate analytics
            total_feedback = len(feedbacks)
            average_rating = sum(f.rating for f in feedbacks) / total_feedback
            
            # Find common issues
            issue_counts = {}
            suggestions_set = set()
            
            for feedback in feedbacks:
                issue_counts[feedback.feedback_type] = issue_counts.get(feedback.feedback_type, 0) + 1
                suggestions_set.update(feedback.suggestions)
            
            common_issues = sorted(issue_counts.items(), key=lambda x: x[1], reverse=True)[:3]
            common_issues = [issue[0] for issue in common_issues]
            
            return FeedbackAnalytics(
                total_feedback=total_feedback,
                average_rating=round(average_rating, 2),
                common_issues=common_issues,
                improvement_suggestions=list(suggestions_set)[:5]
            )
            
        except Exception as e:
            logger.error(f"Failed to get feedback analytics: {e}")
            return FeedbackAnalytics()
    
    async def get_feedback_for_story(self, story_id: str) -> List[StoryFeedback]:
        """
        Get all feedback for a specific story.
        
        Args:
            story_id: ID of the story
            
        Returns:
            List of feedback entries
        """
        try:
            async for db in get_db():
                from sqlalchemy import select
                result = await db.execute(
                    select(StoryFeedback).where(StoryFeedback.story_id == story_id)
                )
                feedbacks = result.scalars().all()
                break
            
            return list(feedbacks)
            
        except Exception as e:
            logger.error(f"Failed to get feedback for story: {e}")
            return []
    
    async def _validate_feedback(self, feedback: StoryFeedback) -> bool:
        """Validate feedback data."""
        try:
            # Check if story exists
            async for db in get_db():
                from sqlalchemy import select
                from backend.database_models import Story
                result = await db.execute(
                    select(Story).where(Story.id == feedback.story_id)
                )
                story = result.scalar_one_or_none()
                break
            
            if not story:
                logger.warning(f"Story {feedback.story_id} not found for feedback")
                return False
            
            # Validate rating
            if feedback.rating < 1 or feedback.rating > 5:
                logger.warning(f"Invalid rating {feedback.rating} for story {feedback.story_id}")
                return False
            
            # Validate feedback type
            valid_types = ["quality", "structure", "characters", "plot", "dialogue", "setting"]
            if feedback.feedback_type not in valid_types:
                logger.warning(f"Invalid feedback type {feedback.feedback_type}")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Feedback validation failed: {e}")
            return False
    
    async def _save_feedback_to_db(self, feedback: StoryFeedback) -> None:
        """Save feedback to database."""
        # Note: This would need a StoryFeedback database model to work properly
        # For now, we log the feedback that would be saved
        logger.info(f"Would save feedback for story {feedback.story_id}: {feedback.feedback_type}")
    
    async def _create_github_issue(self, feedback: StoryFeedback) -> Tuple[bool, str]:
        """
        Create GitHub issue from feedback.
        
        Args:
            feedback: Feedback data
            
        Returns:
            Tuple of (success, issue_id_or_error)
        """
        try:
            # Get template for feedback type
            template = self.issue_templates.get(feedback.feedback_type, self.issue_templates["quality"])
            
            # Format issue body
            issue_body = template["body"].format(
                story_id=feedback.story_id,
                rating=feedback.rating,
                comment=feedback.comment,
                suggestions="\n".join(f"- {suggestion}" for suggestion in feedback.suggestions)
            )
            
            # Create issue via feedback proxy
            issue_data = {
                "title": template["title"].format(story_id=feedback.story_id),
                "body": issue_body,
                "labels": template["labels"]
            }
            
            success, result = await self.feedback_proxy.submit_report({
                "schema_version": "1.0",
                "report_type": "enhancement",
                "timestamp": feedback.timestamp.isoformat(),
                "system_info": {
                    "storycore_version": "1.0.0",
                    "python_version": "3.9",
                    "os_platform": "Windows",
                    "os_version": "11",
                    "language": "Python"
                },
                "module_context": {
                    "active_module": "story_generation",
                    "module_state": {
                        "story_id": feedback.story_id,
                        "feedback_type": feedback.feedback_type,
                        "rating": feedback.rating
                    }
                },
                "user_input": {
                    "description": f"Story feedback for {feedback.story_id}",
                    "reproduction_steps": f"Generated story with ID {feedback.story_id} received feedback"
                },
                "diagnostics": {
                    "stacktrace": "",
                    "logs": [],
                    "memory_usage_mb": 0,
                    "process_state": {}
                },
                "screenshot_base64": None
            })
            
            if success:
                # Extract issue ID from result
                if isinstance(result, dict) and "issue_url" in result:
                    issue_id = result["issue_url"].split("/")[-1]
                    return True, issue_id
                elif isinstance(result, str):
                    return True, result
                else:
                    return True, str(result)
            else:
                return False, result
                
        except Exception as e:
            logger.error(f"Failed to create GitHub issue: {e}")
            return False, str(e)
    
    async def _link_issue_to_feedback(self, story_id: str, issue_id: str) -> None:
        """Link GitHub issue to feedback entry."""
        # Note: This would need a StoryFeedback database model to work properly
        logger.info(f"Would link issue {issue_id} to story {story_id}")
    
    async def get_feedback_trends(self, days: int = 30) -> Dict[str, Any]:
        """
        Get feedback trends over time.
        
        Args:
            days: Number of days to analyze
            
        Returns:
            Dictionary with trend data
        """
        try:
            async for db in get_db():
                from sqlalchemy import func, cast, Date
                from backend.database_models import StoryFeedback
                
                # This assumes StoryFeedback model exists with timestamp field
                # Return empty trends if model doesn't exist
                break
            
            return {"dates": [], "counts": [], "ratings": []}
            
        except Exception as e:
            logger.error(f"Failed to get feedback trends: {e}")
            return {"dates": [], "counts": [], "ratings": []}

# =============================================================================
# Service Factory
# =============================================================================

def create_story_feedback_service() -> StoryFeedbackIntegrationService:
    """Create an instance of the story feedback integration service."""
    return StoryFeedbackIntegrationService()

# =============================================================================
# API Integration Functions
# =============================================================================

async def submit_story_feedback(feedback: StoryFeedback) -> Tuple[bool, str]:
    """Submit story feedback via API."""
    service = create_story_feedback_service()
    return await service.submit_feedback(feedback)

async def get_story_feedback_analytics(story_id: Optional[str] = None) -> FeedbackAnalytics:
    """Get feedback analytics via API."""
    service = create_story_feedback_service()
    return await service.get_feedback_analytics(story_id)

async def get_story_feedback(story_id: str) -> List[StoryFeedback]:
    """Get feedback for a specific story via API."""
    service = create_story_feedback_service()
    return await service.get_feedback_for_story(story_id)

async def get_feedback_trends(days: int = 30) -> Dict[str, Any]:
    """Get feedback trends via API."""
    service = create_story_feedback_service()
    return await service.get_feedback_trends(days)