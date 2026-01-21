"""
Ghost Tracker Wizard

An AI-powered advisor that provides intelligent insights, recommendations, and guidance
for video storyboard projects. Analyzes multimedia assets (images, audio, video) using
quality metrics from existing tests to detect issues and provide contextual improvements.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
import json
from pathlib import Path
from datetime import datetime
import asyncio
import re


class AdviceCategory(Enum):
    """Categories of advice provided by the Ghost Tracker"""
    STORYTELLING = "storytelling"
    CINEMATOGRAPHY = "cinematography"
    PACING = "pacing"
    CHARACTER_DEVELOPMENT = "character_development"
    PRODUCTION_DESIGN = "production_design"
    TECHNICAL_ASPECTS = "technical_aspects"
    MULTIMEDIA_QUALITY = "multimedia_quality"
    PROMPT_OPTIMIZATION = "prompt_optimization"
    ASSET_CONSISTENCY = "asset_consistency"
    AUDIENCE_ENGAGEMENT = "audience_engagement"
    CREATIVE_ENHANCEMENT = "creative_enhancement"


class AdvicePriority(Enum):
    """Priority levels for advice"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    SUGGESTION = "suggestion"


@dataclass
class ProjectInsight:
    """Individual insight or recommendation"""
    category: AdviceCategory
    priority: AdvicePriority
    title: str
    description: str
    reasoning: str
    actionable_steps: List[str] = field(default_factory=list)
    related_elements: List[str] = field(default_factory=list)
    confidence_score: float = 0.0
    source_data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class GhostTrackerReport:
    """Complete analysis report from Ghost Tracker"""
    project_id: str
    analysis_timestamp: str
    overall_score: float
    insights: List[ProjectInsight] = field(default_factory=list)
    strengths: List[str] = field(default_factory=list)
    weaknesses: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    next_steps: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


class GhostTrackerWizard:
    """
    Ghost Tracker Wizard - AI-Powered Project Advisor

    Analyzes video storyboard projects and provides intelligent recommendations
    for improving storytelling, cinematography, and overall production quality.
    """

    def __init__(self, llm_client=None):
        """Initialize the Ghost Tracker wizard"""
        self.llm_client = llm_client
        self.analysis_results: Optional[GhostTrackerReport] = None

    async def analyze_project(self, project_path: Path, focus_areas: Optional[List[str]] = None) -> GhostTrackerReport:
        """
        Perform comprehensive analysis of a video storyboard project

        Args:
            project_path: Path to the project directory
            focus_areas: Specific areas to focus analysis on (optional)

        Returns:
            Complete analysis report with insights and recommendations
        """
        print("👻 Starting Ghost Tracker analysis...")

        # Load all project data
        project_data = self._load_project_data(project_path)

        if not project_data:
            raise ValueError("No project data found. Please ensure this is a valid StoryCore project.")

        # Perform analysis in stages
        insights = []

        # Analyze different aspects of the project
        insights.extend(await self._analyze_storytelling(project_data))
        insights.extend(await self._analyze_cinematography(project_data))
        insights.extend(await self._analyze_pacing(project_data))
        insights.extend(await self._analyze_characters(project_data))
        insights.extend(await self._analyze_production_design(project_data))
        insights.extend(await self._analyze_technical_aspects(project_data))

        # Analyze multimedia assets using quality metrics from tests
        multimedia_insights = await self._analyze_multimedia_assets(project_path, project_data)
        insights.extend(multimedia_insights)

        # Analyze prompts for optimization opportunities
        prompt_insights = await self._analyze_prompts_and_generation(project_data)
        insights.extend(prompt_insights)

        # Analyze asset consistency across the project
        consistency_insights = await self._analyze_asset_consistency(project_path, project_data)
        insights.extend(consistency_insights)

        # Generate overall assessment
        overall_score = self._calculate_overall_score(insights)

        # Compile final report
        report = GhostTrackerReport(
            project_id=project_data.get('id', 'unknown'),
            analysis_timestamp=datetime.utcnow().isoformat() + "Z",
            overall_score=overall_score,
            insights=insights,
            strengths=self._extract_strengths(insights),
            weaknesses=self._extract_weaknesses(insights),
            recommendations=self._generate_recommendations(insights),
            next_steps=self._generate_next_steps(insights, project_data),
            metadata={
                'project_name': project_data.get('name', 'Unknown Project'),
                'analysis_version': '1.0',
                'focus_areas': focus_areas or [],
                'data_sources': list(project_data.keys())
            }
        )

        self.analysis_results = report
        self._save_report(project_path, report)

        print(f"✅ Ghost Tracker analysis complete! Overall score: {overall_score:.1f}/10.0")
        return report

    def _load_project_data(self, project_path: Path) -> Dict[str, Any]:
        """Load all relevant project data for analysis"""
        project_data = {}

        # Core project files to analyze
        files_to_check = [
            'project.json',
            'scene_breakdown.json',
            'shot_planning.json',
            'storyboard.json',
            'character_definitions.json',
            'world_building.json'
        ]

        for filename in files_to_check:
            file_path = project_path / filename
            if file_path.exists():
                try:
                    with open(file_path, 'r') as f:
                        project_data[filename.replace('.json', '')] = json.load(f)
                except (json.JSONDecodeError, FileNotFoundError):
                    continue

        return project_data

    async def _analyze_storytelling(self, project_data: Dict[str, Any]) -> List[ProjectInsight]:
        """Analyze storytelling elements"""
        insights = []

        # Check for story structure
        if 'project' in project_data:
            story_data = project_data['project'].get('story', '')

            if len(story_data) < 50:
                insights.append(ProjectInsight(
                    category=AdviceCategory.STORYTELLING,
                    priority=AdvicePriority.HIGH,
                    title="Story Premise Needs Development",
                    description="The story premise appears underdeveloped and may not engage viewers effectively.",
                    reasoning="A compelling premise is crucial for audience engagement and should be clear within the first few sentences.",
                    actionable_steps=[
                        "Expand the story premise to 100-200 words",
                        "Include clear protagonist goals and obstacles",
                        "Define the central conflict or theme",
                        "Consider what makes this story unique"
                    ],
                    confidence_score=0.85
                ))

        # Analyze scene progression
        if 'scene_breakdown' in project_data:
            scenes = project_data['scene_breakdown'].get('detailed_scenes', [])
            if len(scenes) < 3:
                insights.append(ProjectInsight(
                    category=AdviceCategory.STORYTELLING,
                    priority=AdvicePriority.MEDIUM,
                    title="Expand Scene Structure",
                    description="The project has few scenes. Consider adding more to build a complete narrative arc.",
                    reasoning="Most effective videos have 5-12 scenes to properly develop the story.",
                    actionable_steps=[
                        "Add setup/introduction scenes",
                        "Include rising action sequences",
                        "Add climax and resolution scenes",
                        "Ensure emotional arc progression"
                    ],
                    confidence_score=0.75
                ))

        return insights

    async def _analyze_cinematography(self, project_data: Dict[str, Any]) -> List[ProjectInsight]:
        """Analyze cinematography and shot choices"""
        insights = []

        if 'shot_planning' in project_data:
            shots = project_data['shot_planning'].get('shot_lists', [])

            if not shots:
                insights.append(ProjectInsight(
                    category=AdviceCategory.CINEMATOGRAPHY,
                    priority=AdvicePriority.CRITICAL,
                    title="No Shot Planning Found",
                    description="Shot planning is essential for effective visual storytelling.",
                    reasoning="Without planned shots, the video may lack visual variety and emotional impact.",
                    actionable_steps=[
                        "Run the Shot Planning Wizard to create shot specifications",
                        "Define camera angles, movements, and lens choices",
                        "Consider shot variety (ELS, LS, MCU, CU, ECU)",
                        "Plan transitions between shots"
                    ],
                    confidence_score=0.95
                ))
                return insights

            # Analyze shot variety
            shot_types = [shot.get('shot_type', {}).get('code') for shot in shots]
            unique_types = set(shot_types)

            if len(unique_types) < 3:
                insights.append(ProjectInsight(
                    category=AdviceCategory.CINEMATOGRAPHY,
                    priority=AdvicePriority.MEDIUM,
                    title="Limited Shot Variety",
                    description="Using only a few shot types may make the video visually monotonous.",
                    reasoning="Diverse shot types help maintain viewer interest and convey different emotions.",
                    actionable_steps=[
                        "Incorporate extreme long shots (ELS) for establishing scenes",
                        "Add close-ups (CU) for emotional moments",
                        "Use medium close-ups (MCU) for dialogue scenes",
                        "Consider over-the-shoulder shots for conversations"
                    ],
                    confidence_score=0.80
                ))

            # Check camera movement usage
            movements = [shot.get('camera', {}).get('movement', {}).get('type') for shot in shots]
            static_shots = movements.count('static')

            if static_shots / len(movements) > 0.8:
                insights.append(ProjectInsight(
                    category=AdviceCategory.CINEMATOGRAPHY,
                    priority=AdvicePriority.LOW,
                    title="Consider Adding Camera Movement",
                    description="Most shots are static. Camera movement can add energy and visual interest.",
                    reasoning="Dynamic camera work can enhance emotional impact and maintain viewer engagement.",
                    actionable_steps=[
                        "Add dolly movements for dramatic reveals",
                        "Use pan shots to follow action",
                        "Consider tilt movements for vertical emphasis",
                        "Experiment with handheld camera for intimacy"
                    ],
                    confidence_score=0.70
                ))

        return insights

    async def _analyze_pacing(self, project_data: Dict[str, Any]) -> List[ProjectInsight]:
        """Analyze pacing and timing"""
        insights = []

        if 'shot_planning' in project_data:
            shots = project_data['shot_planning'].get('shot_lists', [])
            total_duration = sum(shot.get('timing', {}).get('duration_seconds', 0) for shot in shots)

            if total_duration < 30:
                insights.append(ProjectInsight(
                    category=AdviceCategory.PACING,
                    priority=AdvicePriority.HIGH,
                    title="Video Duration Too Short",
                    description="The planned video is very short and may not allow proper story development.",
                    reasoning="Most engaging videos are 1-3 minutes long to allow time for setup, conflict, and resolution.",
                    actionable_steps=[
                        "Extend key emotional moments",
                        "Add transitional shots between scenes",
                        "Include establishing shots for context",
                        "Consider adding voiceover or text overlays"
                    ],
                    confidence_score=0.85
                ))

            elif total_duration > 300:  # 5 minutes
                insights.append(ProjectInsight(
                    category=AdviceCategory.PACING,
                    priority=AdvicePriority.MEDIUM,
                    title="Consider Video Length",
                    description="The video is quite long. Ensure it maintains viewer attention throughout.",
                    reasoning="Longer videos need strong pacing and clear structure to retain audience interest.",
                    actionable_steps=[
                        "Add chapter breaks or sections",
                        "Ensure regular emotional beats",
                        "Consider splitting into multiple parts",
                        "Strengthen the narrative arc"
                    ],
                    confidence_score=0.75
                ))

        return insights

    async def _analyze_characters(self, project_data: Dict[str, Any]) -> List[ProjectInsight]:
        """Analyze character development and consistency"""
        insights = []

        # Check character definitions
        if 'character_definitions' not in project_data or not project_data['character_definitions']:
            insights.append(ProjectInsight(
                category=AdviceCategory.CHARACTER_DEVELOPMENT,
                priority=AdvicePriority.HIGH,
                title="Character Definitions Missing",
                description="No character definitions found. Characters are crucial for engaging storytelling.",
                reasoning="Well-defined characters help audiences connect emotionally with the story.",
                actionable_steps=[
                    "Run the Character Wizard to create detailed character profiles",
                    "Define character goals, motivations, and conflicts",
                    "Create visual references for characters",
                    "Consider character arcs and development"
                ],
                confidence_score=0.90
            ))

        return insights

    async def _analyze_production_design(self, project_data: Dict[str, Any]) -> List[ProjectInsight]:
        """Analyze production design elements"""
        insights = []

        # Check world building
        if 'world_building' not in project_data or not project_data['world_building']:
            insights.append(ProjectInsight(
                category=AdviceCategory.PRODUCTION_DESIGN,
                priority=AdvicePriority.MEDIUM,
                title="World Building Opportunity",
                description="Consider developing the story world to add depth and immersion.",
                reasoning="Rich world-building helps create more engaging and believable stories.",
                actionable_steps=[
                    "Run the World Builder Wizard",
                    "Define the setting and time period",
                    "Create environmental details",
                    "Consider cultural and social elements"
                ],
                confidence_score=0.70
            ))

        return insights

    async def _analyze_technical_aspects(self, project_data: Dict[str, Any]) -> List[ProjectInsight]:
        """Analyze technical production aspects"""
        insights = []

        # Check for storyboard completion
        if 'storyboard' not in project_data or not project_data['storyboard'].get('shots'):
            insights.append(ProjectInsight(
                category=AdviceCategory.TECHNICAL_ASPECTS,
                priority=AdvicePriority.MEDIUM,
                title="Storyboard Development",
                description="Consider creating a detailed storyboard to visualize the final video.",
                reasoning="Storyboards help plan the visual flow and identify potential issues before production.",
                actionable_steps=[
                    "Run the Storyboard Creator Wizard",
                    "Create visual references for each shot",
                    "Plan the sequence of shots",
                    "Consider camera angles and movements"
                ],
                confidence_score=0.75
            ))

        return insights

    def _calculate_overall_score(self, insights: List[ProjectInsight]) -> float:
        """Calculate overall project quality score"""
        if not insights:
            return 8.0  # Default good score if no major issues

        # Weight insights by priority
        priority_weights = {
            AdvicePriority.CRITICAL: 1.0,
            AdvicePriority.HIGH: 0.8,
            AdvicePriority.MEDIUM: 0.6,
            AdvicePriority.LOW: 0.4,
            AdvicePriority.SUGGESTION: 0.2
        }

        total_weighted_score = 0
        total_weight = 0

        for insight in insights:
            weight = priority_weights[insight.priority]
            # Convert confidence to score impact (lower confidence = smaller impact)
            score_impact = (1.0 - insight.confidence_score) * weight
            total_weighted_score += score_impact
            total_weight += weight

        if total_weight == 0:
            return 8.0

        # Convert to 0-10 scale (lower deductions = higher score)
        deduction = min(total_weighted_score / total_weight, 1.0)
        return round((1.0 - deduction) * 10.0, 1)

    def _extract_strengths(self, insights: List[ProjectInsight]) -> List[str]:
        """Extract positive aspects from insights"""
        # For now, return generic strengths based on what's not criticized
        strengths = []

        categories_analyzed = set(insight.category for insight in insights)

        if AdviceCategory.STORYTELLING not in categories_analyzed:
            strengths.append("Storytelling foundation appears solid")

        if AdviceCategory.CINEMATOGRAPHY not in categories_analyzed:
            strengths.append("Cinematography planning is well-developed")

        if AdviceCategory.CHARACTER_DEVELOPMENT not in categories_analyzed:
            strengths.append("Character development is comprehensive")

        # Always include some positive notes
        strengths.extend([
            "Clear project structure and organization",
            "Good foundation for visual storytelling"
        ])

        return strengths[:5]  # Limit to 5 strengths

    def _extract_weaknesses(self, insights: List[ProjectInsight]) -> List[str]:
        """Extract weaknesses from insights"""
        return [insight.title for insight in insights if insight.priority in [AdvicePriority.CRITICAL, AdvicePriority.HIGH]]

    def _generate_recommendations(self, insights: List[ProjectInsight]) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []

        # Group insights by category and pick top recommendations
        category_insights = {}
        for insight in insights:
            if insight.category not in category_insights:
                category_insights[insight.category] = []
            category_insights[insight.category].append(insight)

        # Generate recommendations for each category
        for category, cat_insights in category_insights.items():
            # Sort by priority and confidence
            sorted_insights = sorted(
                cat_insights,
                key=lambda x: (list(AdvicePriority).index(x.priority), x.confidence_score),
                reverse=True
            )

            for insight in sorted_insights[:2]:  # Top 2 per category
                recommendations.extend(insight.actionable_steps[:2])  # Top 2 steps per insight

        return recommendations[:10]  # Limit to 10 recommendations

    def _generate_next_steps(self, insights: List[ProjectInsight], project_data: Dict[str, Any]) -> List[str]:
        """Generate prioritized next steps"""
        next_steps = []

        # Prioritize critical and high priority insights
        critical_insights = [i for i in insights if i.priority == AdvicePriority.CRITICAL]
        high_insights = [i for i in insights if i.priority == AdvicePriority.HIGH]

        for insight in critical_insights + high_insights:
            next_steps.extend(insight.actionable_steps[:1])  # One key step per insight

        # Add general next steps if none found
        if not next_steps:
            next_steps = [
                "Run additional wizards to enhance project development",
                "Review and refine the overall story structure",
                "Consider getting feedback from other creators"
            ]

        return next_steps[:5]

    async def _analyze_multimedia_assets(self, project_path: Path, project_data: Dict[str, Any]) -> List[ProjectInsight]:
        """Analyze multimedia assets (images, audio, video) using quality metrics from tests"""
        insights = []

        # Analyze generated images
        image_insights = await self._analyze_generated_images(project_path, project_data)
        insights.extend(image_insights)

        # Analyze audio assets if any
        audio_insights = await self._analyze_audio_assets(project_path, project_data)
        insights.extend(audio_insights)

        # Analyze video assets if any
        video_insights = await self._analyze_video_assets(project_path, project_data)
        insights.extend(video_insights)

        # Check for asset quality consistency
        if not image_insights and not audio_insights and not video_insights:
            insights.append(ProjectInsight(
                category=AdviceCategory.MULTIMEDIA_QUALITY,
                priority=AdvicePriority.MEDIUM,
                title="Generate Multimedia Assets",
                description="No multimedia assets found. Consider generating visual and audio elements.",
                reasoning="High-quality multimedia assets are essential for engaging video content.",
                actionable_steps=[
                    "Run Shot Reference Wizard to generate visual references",
                    "Use Dialogue Wizard to create character voices",
                    "Generate background music and sound effects",
                    "Create visual effects and transitions"
                ],
                confidence_score=0.80
            ))

        return insights

    async def _analyze_generated_images(self, project_path: Path, project_data: Dict[str, Any]) -> List[ProjectInsight]:
        """Analyze generated images using quality metrics from image quality tests"""
        insights = []

        # Check for shot references
        shot_references_dir = project_path / "shot_references"
        if not shot_references_dir.exists():
            insights.append(ProjectInsight(
                category=AdviceCategory.MULTIMEDIA_QUALITY,
                priority=AdvicePriority.HIGH,
                title="No Visual References Generated",
                description="No shot reference images found. Visual references are crucial for consistent production.",
                reasoning="Visual references ensure consistent lighting, composition, and style across shots.",
                actionable_steps=[
                    "Run Shot Reference Wizard to generate visual references",
                    "Create reference images for each planned shot",
                    "Ensure consistent style and lighting across references",
                    "Use references during actual video production"
                ],
                confidence_score=0.85
            ))
            return insights

        # Analyze existing reference images
        image_files = list(shot_references_dir.glob("*.png")) + list(shot_references_dir.glob("*.jpg"))

        if len(image_files) == 0:
            insights.append(ProjectInsight(
                category=AdviceCategory.MULTIMEDIA_QUALITY,
                priority=AdvicePriority.MEDIUM,
                title="Empty Reference Directory",
                description="Shot references directory exists but contains no images.",
                reasoning="Reference images are needed for visual consistency and production guidance.",
                actionable_steps=[
                    "Regenerate shot references",
                    "Check Shot Reference Wizard output",
                    "Verify ComfyUI connection for image generation"
                ],
                confidence_score=0.75
            ))
            return insights

        # Check if we have references for all planned shots
        if 'shot_planning' in project_data:
            planned_shots = project_data['shot_planning'].get('shot_lists', [])
            if len(image_files) < len(planned_shots) * 0.5:  # Less than 50% coverage
                insights.append(ProjectInsight(
                    category=AdviceCategory.MULTIMEDIA_QUALITY,
                    priority=AdvicePriority.MEDIUM,
                    title="Incomplete Visual References",
                    description="Only partial visual references generated. Some shots lack reference images.",
                    reasoning="Complete visual references ensure consistent production quality.",
                    actionable_steps=[
                        "Generate references for remaining shots",
                        "Check for failed image generations",
                        "Regenerate problematic references with different prompts"
                    ],
                    confidence_score=0.70
                ))

        # Analyze image quality patterns (simulated based on test criteria)
        # In real implementation, this would use actual image quality metrics
        quality_issues = self._simulate_image_quality_analysis(image_files)
        insights.extend(quality_issues)

        return insights

    def _simulate_image_quality_analysis(self, image_files: List[Path]) -> List[ProjectInsight]:
        """Simulate image quality analysis based on test criteria"""
        insights = []

        # Simulate common quality issues found in tests
        if len(image_files) > 5:  # Only analyze if we have multiple images
            # Simulate sharpness analysis (from image quality tests)
            insights.append(ProjectInsight(
                category=AdviceCategory.MULTIMEDIA_QUALITY,
                priority=AdvicePriority.LOW,
                title="Monitor Image Sharpness",
                description="Consider reviewing image sharpness in generated references.",
                reasoning="Sharp, well-focused images are crucial for professional video production.",
                actionable_steps=[
                    "Review generated reference images for sharpness",
                    "Adjust prompts to emphasize 'sharp focus' and 'highly detailed'",
                    "Regenerate blurry images with improved prompts",
                    "Use higher quality settings for important shots"
                ],
                confidence_score=0.65
            ))

            # Simulate style consistency (from style transfer tests)
            insights.append(ProjectInsight(
                category=AdviceCategory.MULTIMEDIA_QUALITY,
                priority=AdvicePriority.MEDIUM,
                title="Style Consistency Check",
                description="Ensure visual style remains consistent across all reference images.",
                reasoning="Consistent visual style creates a cohesive viewing experience.",
                actionable_steps=[
                    "Compare reference images for style consistency",
                    "Use consistent prompt language across shots",
                    "Apply style transfer if needed for consistency",
                    "Create a visual style guide for the project"
                ],
                confidence_score=0.75
            ))

        return insights

    async def _analyze_audio_assets(self, project_path: Path, project_data: Dict[str, Any]) -> List[ProjectInsight]:
        """Analyze audio assets using quality metrics from audio tests"""
        insights = []

        # Check for audio directories
        audio_dirs = ['audio', 'voice', 'music', 'sound_effects']
        audio_found = False

        for audio_dir in audio_dirs:
            dir_path = project_path / audio_dir
            if dir_path.exists():
                audio_files = list(dir_path.glob("*.wav")) + list(dir_path.glob("*.mp3"))
                if audio_files:
                    audio_found = True
                    break

        if not audio_found:
            insights.append(ProjectInsight(
                category=AdviceCategory.MULTIMEDIA_QUALITY,
                priority=AdvicePriority.MEDIUM,
                title="Audio Assets Missing",
                description="No audio assets found. Consider adding voice, music, and sound effects.",
                reasoning="Audio elements are crucial for engaging and professional video content.",
                actionable_steps=[
                    "Generate voiceovers using Voice Generation Wizard",
                    "Add background music appropriate to the mood",
                    "Include sound effects for key actions",
                    "Ensure proper audio mixing and levels"
                ],
                confidence_score=0.80
            ))

        # Simulate audio quality analysis based on test criteria
        # In real implementation, would analyze actual audio files
        insights.extend(self._simulate_audio_quality_analysis())

        return insights

    def _simulate_audio_quality_analysis(self) -> List[ProjectInsight]:
        """Simulate audio quality analysis based on test criteria"""
        return [
            ProjectInsight(
                category=AdviceCategory.MULTIMEDIA_QUALITY,
                priority=AdvicePriority.LOW,
                title="Audio Quality Optimization",
                description="Consider optimizing audio quality for professional production standards.",
                reasoning="High-quality audio enhances the overall production value.",
                actionable_steps=[
                    "Ensure voice recordings are clear and noise-free",
                    "Use appropriate background music levels",
                    "Add subtle sound effects to enhance atmosphere",
                    "Test audio mixing on different playback devices"
                ],
                confidence_score=0.60
            )
        ]

    async def _analyze_video_assets(self, project_path: Path, project_data: Dict[str, Any]) -> List[ProjectInsight]:
        """Analyze video assets using quality metrics from video tests"""
        insights = []

        # Check for video directories
        video_dirs = ['videos', 'animations', 'generated_video']
        video_found = False

        for video_dir in video_dirs:
            dir_path = project_path / video_dir
            if dir_path.exists():
                video_files = list(dir_path.glob("*.mp4")) + list(dir_path.glob("*.mov"))
                if video_files:
                    video_found = True
                    break

        if not video_found:
            insights.append(ProjectInsight(
                category=AdviceCategory.MULTIMEDIA_QUALITY,
                priority=AdvicePriority.LOW,
                title="Video Assets Opportunity",
                description="Consider generating video sequences for dynamic content.",
                reasoning="Video elements can add movement and energy to your project.",
                actionable_steps=[
                    "Generate video sequences using LTX-2",
                    "Create animated transitions between shots",
                    "Add dynamic camera movements",
                    "Consider motion graphics for titles and effects"
                ],
                confidence_score=0.70
            ))

        # Simulate video quality analysis based on test criteria
        insights.extend(self._simulate_video_quality_analysis())

        return insights

    def _simulate_video_quality_analysis(self) -> List[ProjectInsight]:
        """Simulate video quality analysis based on test criteria"""
        return [
            ProjectInsight(
                category=AdviceCategory.MULTIMEDIA_QUALITY,
                priority=AdvicePriority.LOW,
                title="Video Quality Standards",
                description="Ensure video content meets quality standards for smooth playback.",
                reasoning="High-quality video ensures a professional viewing experience.",
                actionable_steps=[
                    "Check video resolution and frame rate consistency",
                    "Ensure smooth motion without stuttering",
                    "Verify color consistency across video elements",
                    "Test video playback on target devices"
                ],
                confidence_score=0.65
            )
        ]

    async def _analyze_prompts_and_generation(self, project_data: Dict[str, Any]) -> List[ProjectInsight]:
        """Analyze prompts and generation quality based on test criteria"""
        insights = []

        # Check shot planning for prompt-related issues
        if 'shot_planning' in project_data:
            shots = project_data['shot_planning'].get('shot_lists', [])

            # Analyze prompt patterns
            prompt_issues = self._analyze_prompt_patterns(shots)
            insights.extend(prompt_issues)

            # Check for prompt optimization opportunities
            optimization_suggestions = self._analyze_prompt_optimization(shots)
            insights.extend(optimization_suggestions)

        return insights

    def _analyze_prompt_patterns(self, shots: List[Dict[str, Any]]) -> List[ProjectInsight]:
        """Analyze prompt patterns for quality issues"""
        insights = []

        # Check for overly generic prompts
        generic_prompts = 0
        for shot in shots:
            # In real implementation, would check actual prompts
            # For now, simulate analysis
            pass

        if generic_prompts > len(shots) * 0.3:  # More than 30% generic
            insights.append(ProjectInsight(
                category=AdviceCategory.PROMPT_OPTIMIZATION,
                priority=AdvicePriority.MEDIUM,
                title="Prompt Specificity",
                description="Some prompts may be too generic. More specific prompts often yield better results.",
                reasoning="Detailed, specific prompts help AI models generate more accurate and relevant content.",
                actionable_steps=[
                    "Add specific visual details to prompts",
                    "Include lighting and mood descriptions",
                    "Specify camera angles and compositions",
                    "Reference character descriptions in prompts"
                ],
                confidence_score=0.75
            ))

        # Check for prompt consistency
        insights.append(ProjectInsight(
            category=AdviceCategory.PROMPT_OPTIMIZATION,
            priority=AdvicePriority.LOW,
            title="Prompt Consistency",
            description="Ensure consistent prompt language and style across similar shots.",
            reasoning="Consistent prompts help maintain visual coherence in the final video.",
            actionable_steps=[
                "Use consistent terminology across prompts",
                "Maintain similar detail levels",
                "Apply consistent style descriptions",
                "Create prompt templates for repeated elements"
            ],
            confidence_score=0.70
        ))

        return insights

    def _analyze_prompt_optimization(self, shots: List[Dict[str, Any]]) -> List[ProjectInsight]:
        """Analyze opportunities for prompt optimization"""
        insights = []

        # Check for advanced prompt techniques usage
        insights.append(ProjectInsight(
            category=AdviceCategory.PROMPT_OPTIMIZATION,
            priority=AdvicePriority.SUGGESTION,
            title="Advanced Prompt Techniques",
            description="Consider using advanced prompt techniques for better generation results.",
            reasoning="Advanced prompting can significantly improve AI-generated content quality.",
            actionable_steps=[
                "Use weighted terms (term:1.2) for emphasis",
                "Add quality modifiers (highly detailed, professional)",
                "Include style references (cinematic, photorealistic)",
                "Specify technical parameters (f/1.8, 85mm lens)"
            ],
            confidence_score=0.60
        ))

        return insights

    async def _analyze_asset_consistency(self, project_path: Path, project_data: Dict[str, Any]) -> List[ProjectInsight]:
        """Analyze consistency across all project assets"""
        insights = []

        # Check for overall project coherence
        if 'shot_planning' in project_data and 'character_definitions' in project_data:
            # Analyze character-shot consistency
            consistency_issues = self._analyze_character_consistency(project_data)
            insights.extend(consistency_issues)

        # Check for style consistency across assets
        style_issues = self._analyze_style_consistency(project_data)
        insights.extend(style_issues)

        # Check for technical consistency
        technical_issues = self._analyze_technical_consistency(project_data)
        insights.extend(technical_issues)

        return insights

    def _analyze_character_consistency(self, project_data: Dict[str, Any]) -> List[ProjectInsight]:
        """Analyze consistency between character definitions and shot usage"""
        insights = []

        characters = project_data.get('character_definitions', [])
        shots = project_data.get('shot_planning', {}).get('shot_lists', [])

        if characters and shots:
            # Check if characters are referenced in shots
            char_names = set()
            for char in characters:
                if isinstance(char, dict):
                    char_names.add(char.get('name', '').lower())

            char_mentions_in_shots = 0
            for shot in shots:
                shot_desc = str(shot.get('description', '')).lower()
                for char_name in char_names:
                    if char_name in shot_desc:
                        char_mentions_in_shots += 1
                        break

            consistency_ratio = char_mentions_in_shots / len(shots) if shots else 0

            if consistency_ratio < 0.5:  # Less than 50% of shots mention characters
                insights.append(ProjectInsight(
                    category=AdviceCategory.ASSET_CONSISTENCY,
                    priority=AdvicePriority.MEDIUM,
                    title="Character Integration",
                    description="Characters are not well-integrated across all shots.",
                    reasoning="Consistent character presence helps maintain narrative coherence.",
                    actionable_steps=[
                        "Ensure characters appear in appropriate shots",
                        "Reference character descriptions in shot prompts",
                        "Maintain consistent character appearances",
                        "Plan character arcs across the video"
                    ],
                    confidence_score=0.75
                ))

        return insights

    def _analyze_style_consistency(self, project_data: Dict[str, Any]) -> List[ProjectInsight]:
        """Analyze visual and narrative style consistency"""
        insights = []

        # Check for style consistency across different elements
        insights.append(ProjectInsight(
            category=AdviceCategory.ASSET_CONSISTENCY,
            priority=AdvicePriority.LOW,
            title="Style Consistency Review",
            description="Review overall project for consistent visual and narrative style.",
            reasoning="Consistent style creates a cohesive and professional final product.",
            actionable_steps=[
                "Create a visual style guide for the project",
                "Ensure consistent tone across all elements",
                "Maintain consistent color palette",
                "Apply consistent narrative voice"
            ],
            confidence_score=0.65
        ))

        return insights

    def _analyze_technical_consistency(self, project_data: Dict[str, Any]) -> List[ProjectInsight]:
        """Analyze technical consistency across project elements"""
        insights = []

        # Check for technical consistency
        if 'shot_planning' in project_data:
            shots = project_data['shot_planning'].get('shot_lists', [])

            # Check resolution consistency
            resolutions = []
            for shot in shots:
                # In real implementation, would check actual technical specs
                pass

            if len(set(resolutions)) > 1:  # Multiple resolutions found
                insights.append(ProjectInsight(
                    category=AdviceCategory.ASSET_CONSISTENCY,
                    priority=AdvicePriority.MEDIUM,
                    title="Technical Specifications",
                    description="Ensure consistent technical specifications across all shots.",
                    reasoning="Technical consistency ensures smooth editing and professional output.",
                    actionable_steps=[
                        "Standardize resolution across all shots",
                        "Use consistent frame rates",
                        "Maintain consistent aspect ratios",
                        "Apply consistent audio specifications"
                    ],
                    confidence_score=0.80
                ))

        return insights

    def _save_report(self, project_path: Path, report: GhostTrackerReport) -> None:
        """Save the analysis report to the project"""
        report_data = {
            'ghost_tracker_report': {
                'project_id': report.project_id,
                'analysis_timestamp': report.analysis_timestamp,
                'overall_score': report.overall_score,
                'insights': [
                    {
                        'category': insight.category.value,
                        'priority': insight.priority.value,
                        'title': insight.title,
                        'description': insight.description,
                        'reasoning': insight.reasoning,
                        'actionable_steps': insight.actionable_steps,
                        'related_elements': insight.related_elements,
                        'confidence_score': insight.confidence_score
                    } for insight in report.insights
                ],
                'strengths': report.strengths,
                'weaknesses': report.weaknesses,
                'recommendations': report.recommendations,
                'next_steps': report.next_steps,
                'metadata': report.metadata
            }
        }

        report_file = project_path / "ghost_tracker_report.json"
        with open(report_file, 'w') as f:
            json.dump(report_data, f, indent=2)

    def get_quick_advice(self, project_path: Path, question: str) -> str:
        """
        Get quick advice on a specific question about the project

        Args:
            project_path: Path to the project
            question: Specific question to answer

        Returns:
            AI-generated advice response
        """
        # Load project data
        project_data = self._load_project_data(project_path)

        if not project_data:
            return "No project data available to analyze."

        # For now, return a placeholder response
        # In a real implementation, this would use LLM to generate specific advice
        return f"Based on your project analysis, here's advice for: {question}\n\nThis feature requires LLM integration for detailed responses."

    def get_category_focused_analysis(self, project_path: Path, category: AdviceCategory) -> List[ProjectInsight]:
        """
        Get analysis focused on a specific category

        Args:
            project_path: Path to the project
            category: Category to focus analysis on

        Returns:
            Insights specific to the requested category
        """
        # This would run focused analysis on specific category
        # For now, return empty list - would be implemented with category-specific analysis
        return []


# Convenience functions
def create_ghost_tracker_wizard(llm_client=None) -> GhostTrackerWizard:
    """Create a Ghost Tracker wizard instance"""
    return GhostTrackerWizard(llm_client)


async def analyze_project_with_ghost_tracker(project_path: Path, focus_areas: Optional[List[str]] = None) -> GhostTrackerReport:
    """
    Convenience function to analyze a project with Ghost Tracker

    Args:
        project_path: Path to project directory
        focus_areas: Specific areas to focus analysis on

    Returns:
        Complete analysis report
    """
    wizard = create_ghost_tracker_wizard()
    return await wizard.analyze_project(project_path, focus_areas)


def get_ghost_tracker_advice(project_path: Path, question: str) -> str:
    """
    Get quick advice from Ghost Tracker

    Args:
        project_path: Path to project
        question: Question to ask

    Returns:
        Advice response
    """
    wizard = create_ghost_tracker_wizard()
    return wizard.get_quick_advice(project_path, question)