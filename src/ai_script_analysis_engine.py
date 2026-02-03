"""
AI Script Analysis Engine - Script analysis and scene breakdown.

This module provides AI-powered script analysis capabilities including
scene breakdown, character analysis, dialogue analysis, and story structure analysis.
"""

import asyncio
import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Any, Optional, Tuple, Union
from pathlib import Path
import json
import time
from datetime import datetime
import uuid

try:
    from .circuit_breaker import CircuitBreaker, CircuitBreakerConfig
    from .ai_enhancement_engine import AIConfig
except ImportError:
    from circuit_breaker import CircuitBreaker, CircuitBreakerConfig
    from ai_enhancement_engine import AIConfig


class SceneType(Enum):
    """Types of scenes in script analysis."""
    EXPOSITION = "exposition"
    RISING_ACTION = "rising_action"
    CLIMAX = "climax"
    FALLING_ACTION = "falling_action"
    RESOLUTION = "resolution"
    TRANSITION = "transition"


class CharacterRole(Enum):
    """Character roles in script analysis."""
    PROTAGONIST = "protagonist"
    ANTAGONIST = "antagonist"
    SUPPORTING = "supporting"
    MENTOR = "mentor"
    COMIC_RELIEF = "comic_relief"
    FOIL = "foil"


class DialogueType(Enum):
    """Types of dialogue in script analysis."""
    EXPOSITION = "exposition"
    CONFLICT = "conflict"
    REVELATION = "revelation"
    HUMOR = "humor"
    ROMANCE = "romance"
    THREAT = "threat"
    PERSUASION = "persuasion"


class EmotionType(Enum):
    """Emotion types for dialogue analysis."""
    HAPPINESS = "happiness"
    SADNESS = "sadness"
    ANGER = "anger"
    FEAR = "fear"
    SURPRISE = "surprise"
    DISGUST = "disgust"
    CONTEMPT = "contempt"
    INTEREST = "interest"
    CONFUSION = "confusion"
    DETERMINATION = "determination"


@dataclass
class CharacterAnalysis:
    """Analysis of a character in the script."""
    character_id: str
    name: str
    role: CharacterRole
    screen_time_percentage: float
    dialogue_count: int
    emotional_range: List[EmotionType]
    character_arcs: List[str]
    relationships: Dict[str, str]
    key_traits: List[str]
    motivations: List[str]
    conflicts: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'character_id': self.character_id,
            'name': self.name,
            'role': self.role.value,
            'screen_time_percentage': self.screen_time_percentage,
            'dialogue_count': self.dialogue_count,
            'emotional_range': [e.value for e in self.emotional_range],
            'character_arcs': self.character_arcs,
            'relationships': self.relationships,
            'key_traits': self.key_traits,
            'motivations': self.motivations,
            'conflicts': self.conflicts
        }


@dataclass
class SceneAnalysis:
    """Analysis of a scene in the script."""
    scene_id: str
    scene_number: int
    scene_type: SceneType
    location: str
    time_of_day: str
    characters: List[str]
    duration_estimated: float
    emotional_tone: EmotionType
    plot_significance: int  # 1-10 scale
    conflict_level: int     # 1-10 scale
    key_events: List[str]
    dialogue_count: int
    action_descriptions: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'scene_id': self.scene_id,
            'scene_number': self.scene_number,
            'scene_type': self.scene_type.value,
            'location': self.location,
            'time_of_day': self.time_of_day,
            'characters': self.characters,
            'duration_estimated': self.duration_estimated,
            'emotional_tone': self.emotional_tone.value,
            'plot_significance': self.plot_significance,
            'conflict_level': self.conflict_level,
            'key_events': self.key_events,
            'dialogue_count': self.dialogue_count,
            'action_descriptions': self.action_descriptions
        }


@dataclass
class DialogueAnalysis:
    """Analysis of dialogue in the script."""
    dialogue_id: str
    speaker: str
    listener: str
    dialogue_type: DialogueType
    emotion: EmotionType
    word_count: int
    sentiment_score: float  # -1 to 1 scale
    subtext_level: int      # 1-5 scale
    purpose: str
    key_phrases: List[str]
    emotional_impact: float
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'dialogue_id': self.dialogue_id,
            'speaker': self.speaker,
            'listener': self.listener,
            'dialogue_type': self.dialogue_type.value,
            'emotion': self.emotion.value,
            'word_count': self.word_count,
            'sentiment_score': self.sentiment_score,
            'subtext_level': self.subtext_level,
            'purpose': self.purpose,
            'key_phrases': self.key_phrases,
            'emotional_impact': self.emotional_impact
        }


@dataclass
class StoryStructure:
    """Analysis of overall story structure."""
    acts: List[str]
    plot_points: List[Dict[str, Any]]
    pacing_analysis: Dict[str, float]
    tension_curve: List[float]
    character_development: Dict[str, List[str]]
    theme_analysis: List[str]
    genre_indicators: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'acts': self.acts,
            'plot_points': self.plot_points,
            'pacing_analysis': self.pacing_analysis,
            'tension_curve': self.tension_curve,
            'character_development': self.character_development,
            'theme_analysis': self.theme_analysis,
            'genre_indicators': self.genre_indicators
        }


@dataclass
class ScriptMetrics:
    """Overall metrics for the script."""
    total_scenes: int
    total_characters: int
    total_dialogue_lines: int
    estimated_runtime_minutes: float
    average_scene_length: float
    dialogue_to_action_ratio: float
    emotional_diversity_score: float
    conflict_density: float
    character_interaction_complexity: float
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'total_scenes': self.total_scenes,
            'total_characters': self.total_characters,
            'total_dialogue_lines': self.total_dialogue_lines,
            'estimated_runtime_minutes': self.estimated_runtime_minutes,
            'average_scene_length': self.average_scene_length,
            'dialogue_to_action_ratio': self.dialogue_to_action_ratio,
            'emotional_diversity_score': self.emotional_diversity_score,
            'conflict_density': self.conflict_density,
            'character_interaction_complexity': self.character_interaction_complexity
        }


@dataclass
class ScriptAnalysisResult:
    """Complete result of script analysis."""
    script_id: str
    analysis_timestamp: datetime
    characters: List[CharacterAnalysis]
    scenes: List[SceneAnalysis]
    dialogues: List[DialogueAnalysis]
    story_structure: StoryStructure
    metrics: ScriptMetrics
    recommendations: List[str]
    quality_score: float
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'script_id': self.script_id,
            'analysis_timestamp': self.analysis_timestamp.isoformat(),
            'characters': [c.to_dict() for c in self.characters],
            'scenes': [s.to_dict() for s in self.scenes],
            'dialogues': [d.to_dict() for d in self.dialogues],
            'story_structure': self.story_structure.to_dict(),
            'metrics': self.metrics.to_dict(),
            'recommendations': self.recommendations,
            'quality_score': self.quality_score
        }


@dataclass
class ScriptAnalysisConfig:
    """Configuration for script analysis."""
    analysis_depth: str = "comprehensive"  # basic, standard, comprehensive
    focus_areas: List[str] = field(default_factory=lambda: ["characters", "scenes", "dialogue"])
    genre_hint: Optional[str] = None
    target_audience: Optional[str] = None
    runtime_target: Optional[float] = None
    sensitivity_filter: bool = True


class ScriptAnalysisError(Exception):
    """Custom exception for script analysis errors."""
    pass


class AIScriptAnalysisEngine:
    """
    AI Script Analysis Engine for comprehensive script analysis and scene breakdown.
    
    This engine provides:
    - Scene breakdown and analysis
    - Character analysis and development tracking
    - Dialogue analysis and emotional impact assessment
    - Story structure analysis
    - Script quality metrics and recommendations
    """
    
    def __init__(self, ai_config: AIConfig):
        """Initialize AI Script Analysis Engine."""
        self.ai_config = ai_config
        self.logger = logging.getLogger(__name__)
        
        # Initialize circuit breaker for fault tolerance
        self.circuit_breaker = CircuitBreaker(ai_config.circuit_breaker_config)
        
        # Analysis state
        self.is_initialized = False
        self.analysis_cache = {}
        self.analysis_history = []
        
        # Analysis templates and patterns
        self.scene_patterns = self._load_scene_patterns()
        self.character_patterns = self._load_character_patterns()
        self.dialogue_patterns = self._load_dialogue_patterns()
        
        self.logger.info("AI Script Analysis Engine initialized")
    
    async def initialize(self) -> bool:
        """Initialize script analysis engine components."""
        try:
            self.logger.info("Initializing AI Script Analysis Engine...")
            
            # Validate configuration
            if not self._validate_config():
                raise ValueError("Invalid script analysis configuration")
            
            self.is_initialized = True
            self.logger.info("AI Script Analysis Engine initialization complete")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize AI Script Analysis Engine: {e}")
            return False
    
    def _validate_config(self) -> bool:
        """Validate script analysis configuration."""
        try:
            # Basic validation - more detailed validation can be added
            return True
        except Exception as e:
            self.logger.error(f"Configuration validation failed: {e}")
            return False
    
    def _load_scene_patterns(self) -> Dict[str, List[str]]:
        """Load scene pattern templates for analysis."""
        return {
            'exposition': [
                r'\b(introduces|establishes|reveals|shows)\b',
                r'\b(opening scene|beginning|start)\b',
                r'\b(setup|background|context)\b'
            ],
            'rising_action': [
                r'\b(conflict|tension|problem|challenge)\b',
                r'\b(escalates|builds|develops|grows)\b',
                r'\b(complication|obstacle|difficulty)\b'
            ],
            'climax': [
                r'\b(peak|highest|most intense|turning point)\b',
                r'\b(confrontation|showdown|final battle|ultimate test)\b',
                r'\b(decision|choice|moment of truth)\b'
            ],
            'falling_action': [
                r'\b(resolution|aftermath|consequences|results)\b',
                r'\b(winding down|calming|settling)\b',
                r'\b(impact|effect|outcome)\b'
            ],
            'resolution': [
                r'\b(conclusion|ending|final scene|wrap up)\b',
                r'\b(solved|resolved|finished|complete)\b',
                r'\b(happy ending|sad ending|ambiguous)\b'
            ]
        }
    
    def _load_character_patterns(self) -> Dict[str, List[str]]:
        """Load character pattern templates for analysis."""
        return {
            'protagonist': [
                r'\b(hero|main character|lead|protagonist)\b',
                r'\b(journey|quest|mission|goal)\b',
                r'\b(growth|development|change|transformation)\b'
            ],
            'antagonist': [
                r'\b(villain|enemy|opponent|antagonist)\b',
                r'\b(obstacle|challenge|threat|danger)\b',
                r'\b(evil|malicious|wicked|cruel)\b'
            ],
            'mentor': [
                r'\b(teacher|guide|mentor|wise)\b',
                r'\b(advice|wisdom|knowledge|experience)\b',
                r'\b(help|assist|support|train)\b'
            ]
        }
    
    def _load_dialogue_patterns(self) -> Dict[str, List[str]]:
        """Load dialogue pattern templates for analysis."""
        return {
            'exposition': [
                r'\b(explains|tells|informs|describes)\b',
                r'\b(background|history|context|situation)\b',
                r'\b(know|understand|realize|learn)\b'
            ],
            'conflict': [
                r'\b(argue|fight|disagree|oppose)\b',
                r'\b(angry|mad|furious|upset)\b',
                r'\b(why|how could you|you always)\b'
            ],
            'revelation': [
                r'\b(reveals|discovers|finds out|learns)\b',
                r'\b(surprise|shock|unexpected|amazing)\b',
                r'\b(never knew|didn\'t realize|turns out)\b'
            ],
            'humor': [
                r'\b(joke|funny|laugh|humor)\b',
                r'\b(sarcastic|ironic|witty|clever)\b',
                r'\b(haha|lol|funny|amusing)\b'
            ]
        }
    
    async def analyze_script(self, script_content: str, 
                           config: ScriptAnalysisConfig) -> Optional[ScriptAnalysisResult]:
        """
        Analyze a complete script and provide comprehensive breakdown.
        
        Args:
            script_content: Full script content as string
            config: Analysis configuration
            
        Returns:
            Complete script analysis result or None if analysis fails
        """
        if not self.is_initialized:
            self.logger.error("AI Script Analysis Engine not initialized")
            return None
        
        # Use circuit breaker for fault tolerance
        async def _analyze_operation():
            try:
                # Generate analysis ID
                script_id = str(uuid.uuid4())
                
                # Parse script structure
                script_structure = await self._parse_script_structure(script_content)
                
                # Analyze characters
                characters = await self._analyze_characters(script_structure, config)
                
                # Analyze scenes
                scenes = await self._analyze_scenes(script_structure, config)
                
                # Analyze dialogues
                dialogues = await self._analyze_dialogues(script_structure, config)
                
                # Analyze story structure
                story_structure = await self._analyze_story_structure(script_structure, config)
                
                # Calculate metrics
                metrics = await self._calculate_metrics(script_structure, characters, scenes, dialogues)
                
                # Generate recommendations
                recommendations = await self._generate_recommendations(
                    script_structure, characters, scenes, dialogues, story_structure, metrics
                )
                
                # Calculate quality score
                quality_score = await self._calculate_quality_score(
                    characters, scenes, dialogues, story_structure, metrics
                )
                
                # Create complete analysis result
                analysis_result = ScriptAnalysisResult(
                    script_id=script_id,
                    analysis_timestamp=datetime.now(),
                    characters=characters,
                    scenes=scenes,
                    dialogues=dialogues,
                    story_structure=story_structure,
                    metrics=metrics,
                    recommendations=recommendations,
                    quality_score=quality_score
                )
                
                # Cache the analysis
                self.analysis_cache[script_id] = analysis_result
                self.analysis_history.append(script_id)
                
                self.logger.info(f"Completed script analysis: {script_id}")
                return analysis_result
                
            except Exception as e:
                self.logger.error(f"Script analysis failed: {e}")
                raise
        
        try:
            return await self.circuit_breaker.call(_analyze_operation)
        except Exception as e:
            self.logger.error(f"Circuit breaker blocked script analysis: {e}")
            return None
    
    async def _parse_script_structure(self, script_content: str) -> Dict[str, Any]:
        """Parse script content into structured format."""
        # Mock script parsing - in real implementation, this would use NLP
        lines = script_content.split('\n')
        
        # Basic structure parsing
        scenes = []
        characters = set()
        dialogues = []
        
        current_scene = None
        current_character = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Detect scene headings
            if line.startswith('INT.') or line.startswith('EXT.'):
                if current_scene:
                    scenes.append(current_scene)
                current_scene = {
                    'scene_number': len(scenes) + 1,
                    'heading': line,
                    'content': [],
                    'characters': set(),
                    'dialogues': []
                }
            
            # Detect character names
            elif line.isupper() and len(line) < 50:
                current_character = line
                characters.add(current_character)
                if current_scene:
                    current_scene['characters'].add(current_character)
            
            # Detect dialogue
            elif current_character and line:
                dialogue = {
                    'character': current_character,
                    'text': line,
                    'line_number': len(dialogues) + 1
                }
                dialogues.append(dialogue)
                if current_scene:
                    current_scene['dialogues'].append(dialogue)
            
            # Add to scene content
            elif current_scene:
                current_scene['content'].append(line)
        
        if current_scene:
            scenes.append(current_scene)
        
        return {
            'scenes': scenes,
            'characters': list(characters),
            'dialogues': dialogues,
            'total_lines': len(lines),
            'total_words': len(script_content.split())
        }
    
    async def _analyze_characters(self, script_structure: Dict[str, Any], 
                                config: ScriptAnalysisConfig) -> List[CharacterAnalysis]:
        """Analyze characters in the script."""
        characters = []
        
        for character_name in script_structure['characters']:
            # Mock character analysis
            dialogue_count = sum(1 for d in script_structure['dialogues'] 
                               if d['character'] == character_name)
            
            # Determine role based on dialogue count and patterns
            if dialogue_count > 50:
                role = CharacterRole.PROTAGONIST
            elif dialogue_count > 20:
                role = CharacterRole.SUPPORTING
            else:
                role = CharacterRole.FOIL
            
            # Calculate screen time percentage
            total_dialogue = len(script_structure['dialogues'])
            screen_time = (dialogue_count / total_dialogue) * 100 if total_dialogue > 0 else 0
            
            # Mock emotional range and other attributes
            emotional_range = [EmotionType.HAPPINESS, EmotionType.ANGER, EmotionType.FEAR]
            character_arcs = ["Introduction", "Development", "Resolution"]
            relationships = {"protagonist": "friend", "antagonist": "enemy"}
            key_traits = ["brave", "loyal", "determined"]
            motivations = ["save the world", "find love", "achieve success"]
            conflicts = ["internal struggle", "external threat", "moral dilemma"]
            
            character = CharacterAnalysis(
                character_id=f"char_{hash(character_name) % 10000}",
                name=character_name,
                role=role,
                screen_time_percentage=screen_time,
                dialogue_count=dialogue_count,
                emotional_range=emotional_range,
                character_arcs=character_arcs,
                relationships=relationships,
                key_traits=key_traits,
                motivations=motivations,
                conflicts=conflicts
            )
            
            characters.append(character)
        
        return characters
    
    async def _analyze_scenes(self, script_structure: Dict[str, Any], 
                            config: ScriptAnalysisConfig) -> List[SceneAnalysis]:
        """Analyze scenes in the script."""
        scenes = []
        
        for i, scene_data in enumerate(script_structure['scenes']):
            # Mock scene analysis
            scene_type = SceneType.EXPOSITION if i < 3 else SceneType.RISING_ACTION
            if i > len(script_structure['scenes']) * 0.7:
                scene_type = SceneType.CLIMAX
            elif i > len(script_structure['scenes']) * 0.8:
                scene_type = SceneType.RESOLUTION
            
            # Extract location and time from heading
            location = "Unknown"
            time_of_day = "Unknown"
            if 'heading' in scene_data:
                heading = scene_data['heading']
                if 'INT.' in heading:
                    location = heading.split('INT.')[1].split('-')[0].strip()
                elif 'EXT.' in heading:
                    location = heading.split('EXT.')[1].split('-')[0].strip()
                
                if 'DAY' in heading:
                    time_of_day = "Day"
                elif 'NIGHT' in heading:
                    time_of_day = "Night"
            
            # Calculate scene metrics
            duration_estimated = len(scene_data['content']) * 0.5  # Rough estimate
            dialogue_count = len(scene_data['dialogues'])
            emotional_tone = EmotionType.HAPPINESS
            plot_significance = min(10, dialogue_count // 5 + 1)
            conflict_level = min(10, dialogue_count // 10 + 1)
            
            scene = SceneAnalysis(
                scene_id=f"scene_{i+1:03d}",
                scene_number=i + 1,
                scene_type=scene_type,
                location=location,
                time_of_day=time_of_day,
                characters=list(scene_data['characters']),
                duration_estimated=duration_estimated,
                emotional_tone=emotional_tone,
                plot_significance=plot_significance,
                conflict_level=conflict_level,
                key_events=[f"Event {j+1}" for j in range(min(3, len(scene_data['content'])))],
                dialogue_count=dialogue_count,
                action_descriptions=scene_data['content'][:5]
            )
            
            scenes.append(scene)
        
        return scenes
    
    async def _analyze_dialogues(self, script_structure: Dict[str, Any], 
                               config: ScriptAnalysisConfig) -> List[DialogueAnalysis]:
        """Analyze dialogues in the script."""
        dialogues = []
        
        for i, dialogue_data in enumerate(script_structure['dialogues']):
            # Mock dialogue analysis
            speaker = dialogue_data['character']
            listener = "Other"  # Would need context to determine
            
            # Determine dialogue type based on content
            dialogue_type = DialogueType.EXPOSITION
            text = dialogue_data['text'].lower()
            if any(pattern in text for pattern in ['fight', 'angry', 'mad']):
                dialogue_type = DialogueType.CONFLICT
            elif any(pattern in text for pattern in ['surprise', 'wow', 'amazing']):
                dialogue_type = DialogueType.REVELATION
            elif any(pattern in text for pattern in ['haha', 'funny', 'joke']):
                dialogue_type = DialogueType.HUMOR
            
            # Mock emotion and sentiment analysis
            emotion = EmotionType.HAPPINESS
            sentiment_score = 0.5
            word_count = len(dialogue_data['text'].split())
            subtext_level = 2
            emotional_impact = 0.7
            
            dialogue = DialogueAnalysis(
                dialogue_id=f"dialogue_{i+1:04d}",
                speaker=speaker,
                listener=listener,
                dialogue_type=dialogue_type,
                emotion=emotion,
                word_count=word_count,
                sentiment_score=sentiment_score,
                subtext_level=subtext_level,
                purpose="Character development",
                key_phrases=["key phrase 1", "key phrase 2"],
                emotional_impact=emotional_impact
            )
            
            dialogues.append(dialogue)
        
        return dialogues
    
    async def _analyze_story_structure(self, script_structure: Dict[str, Any], 
                                     config: ScriptAnalysisConfig) -> StoryStructure:
        """Analyze overall story structure."""
        # Mock story structure analysis
        total_scenes = len(script_structure['scenes'])
        
        acts = ["Act 1: Setup", "Act 2: Confrontation", "Act 3: Resolution"]
        
        plot_points = [
            {"name": "Inciting Incident", "scene": 3, "description": "Main conflict introduced"},
            {"name": "Plot Point 1", "scene": 10, "description": "First major turning point"},
            {"name": "Midpoint", "scene": 20, "description": "Major revelation or reversal"},
            {"name": "Plot Point 2", "scene": 30, "description": "Second major turning point"},
            {"name": "Climax", "scene": 35, "description": "Final confrontation"},
            {"name": "Resolution", "scene": 40, "description": "Story conclusion"}
        ]
        
        pacing_analysis = {
            "setup_pace": 0.8,
            "confrontation_pace": 1.2,
            "resolution_pace": 0.9
        }
        
        tension_curve = [0.2, 0.3, 0.5, 0.7, 0.9, 1.0, 0.8, 0.6, 0.4, 0.1]
        
        character_development = {
            "protagonist": ["Introduction", "Challenge", "Growth", "Transformation"],
            "antagonist": ["Introduction", "Conflict", "Escalation", "Defeat"]
        }
        
        theme_analysis = ["Hero's journey", "Good vs evil", "Personal growth"]
        genre_indicators = ["Action", "Drama", "Adventure"]
        
        return StoryStructure(
            acts=acts,
            plot_points=plot_points,
            pacing_analysis=pacing_analysis,
            tension_curve=tension_curve,
            character_development=character_development,
            theme_analysis=theme_analysis,
            genre_indicators=genre_indicators
        )
    
    async def _calculate_metrics(self, script_structure: Dict[str, Any], 
                               characters: List[CharacterAnalysis],
                               scenes: List[SceneAnalysis],
                               dialogues: List[DialogueAnalysis]) -> ScriptMetrics:
        """Calculate overall script metrics."""
        total_scenes = len(scenes)
        total_characters = len(characters)
        total_dialogue_lines = len(dialogues)
        
        # Estimate runtime (rough calculation)
        estimated_runtime = total_scenes * 2.5 + total_dialogue_lines * 0.1
        
        # Calculate averages and ratios
        average_scene_length = script_structure['total_words'] / max(1, total_scenes)
        dialogue_to_action_ratio = total_dialogue_lines / max(1, script_structure['total_lines'] - total_dialogue_lines)
        
        # Mock diversity and complexity scores
        emotional_diversity_score = 0.7
        conflict_density = 0.6
        character_interaction_complexity = 0.8
        
        return ScriptMetrics(
            total_scenes=total_scenes,
            total_characters=total_characters,
            total_dialogue_lines=total_dialogue_lines,
            estimated_runtime_minutes=estimated_runtime,
            average_scene_length=average_scene_length,
            dialogue_to_action_ratio=dialogue_to_action_ratio,
            emotional_diversity_score=emotional_diversity_score,
            conflict_density=conflict_density,
            character_interaction_complexity=character_interaction_complexity
        )
    
    async def _generate_recommendations(self, script_structure: Dict[str, Any],
                                      characters: List[CharacterAnalysis],
                                      scenes: List[SceneAnalysis],
                                      dialogues: List[DialogueAnalysis],
                                      story_structure: StoryStructure,
                                      metrics: ScriptMetrics) -> List[str]:
        """Generate recommendations for script improvement."""
        recommendations = []
        
        # Analyze based on metrics
        if metrics.conflict_density < 0.5:
            recommendations.append("Consider increasing conflict density to maintain audience engagement")
        
        if metrics.emotional_diversity_score < 0.6:
            recommendations.append("Add more emotional variety to create a richer viewing experience")
        
        if metrics.character_interaction_complexity < 0.7:
            recommendations.append("Develop more complex character relationships and interactions")
        
        # Analyze character distribution
        protagonist_count = sum(1 for c in characters if c.role == CharacterRole.PROTAGONIST)
        if protagonist_count == 0:
            recommendations.append("Consider developing a clearer protagonist for audience connection")
        
        # Analyze scene structure
        climax_scenes = [s for s in scenes if s.scene_type == SceneType.CLIMAX]
        if len(climax_scenes) == 0:
            recommendations.append("Ensure your script has a clear climax scene")
        
        # Add general recommendations
        recommendations.extend([
            "Review dialogue for natural flow and character consistency",
            "Ensure each scene advances the plot or develops characters",
            "Consider pacing - avoid scenes that are too long or too short",
            "Check for consistent tone and genre elements"
        ])
        
        return recommendations
    
    async def _calculate_quality_score(self, characters: List[CharacterAnalysis],
                                     scenes: List[SceneAnalysis],
                                     dialogues: List[DialogueAnalysis],
                                     story_structure: StoryStructure,
                                     metrics: ScriptMetrics) -> float:
        """Calculate overall script quality score."""
        # Mock quality scoring algorithm
        character_score = min(1.0, len([c for c in characters if c.role == CharacterRole.PROTAGONIST]) * 0.3)
        scene_score = min(1.0, len([s for s in scenes if s.plot_significance > 7]) * 0.1)
        dialogue_score = min(1.0, metrics.dialogue_to_action_ratio * 0.5)
        structure_score = min(1.0, len(story_structure.plot_points) * 0.1)
        metrics_score = (metrics.emotional_diversity_score + metrics.conflict_density + metrics.character_interaction_complexity) / 3
        
        # Weighted average
        quality_score = (character_score * 0.2 + scene_score * 0.25 + dialogue_score * 0.2 + 
                        structure_score * 0.2 + metrics_score * 0.15)
        
        return min(1.0, quality_score)
    
    def get_analysis_by_id(self, analysis_id: str) -> Optional[ScriptAnalysisResult]:
        """Get analysis result by ID from cache."""
        return self.analysis_cache.get(analysis_id)
    
    def get_analysis_statistics(self) -> Dict[str, Any]:
        """Get analysis statistics."""
        return {
            'total_analyses': len(self.analysis_history),
            'cached_analyses': len(self.analysis_cache),
            'average_quality_score': self._get_average_quality_score(),
            'most_common_genres': self._get_most_common_genres()
        }
    
    def _get_average_quality_score(self) -> float:
        """Get average quality score across all analyses."""
        if not self.analysis_cache:
            return 0.0
        
        total_score = sum(result.quality_score for result in self.analysis_cache.values())
        return total_score / len(self.analysis_cache)
    
    def _get_most_common_genres(self) -> List[str]:
        """Get most common genres from analyses."""
        # Mock implementation
        return ["Action", "Drama", "Comedy", "Thriller"]
    
    async def export_analysis(self, analysis_id: str, format: str = "json") -> Optional[Dict[str, Any]]:
        """Export analysis result in specified format."""
        analysis = self.get_analysis_by_id(analysis_id)
        if not analysis:
            return None
        
        if format == "json":
            return analysis.to_dict()
        else:
            self.logger.error(f"Unsupported export format: {format}")
            return None
    
    async def shutdown(self):
        """Shutdown script analysis engine and cleanup resources."""
        self.logger.info("Shutting down AI Script Analysis Engine...")
        
        # Clear cache and history
        self.analysis_cache.clear()
        self.analysis_history.clear()
        
        self.is_initialized = False
        self.logger.info("AI Script Analysis Engine shutdown complete")


# Factory function for easy initialization
def create_ai_script_analysis_engine(ai_config: AIConfig) -> AIScriptAnalysisEngine:
    """
    Create and configure AI Script Analysis Engine.
    
    Args:
        ai_config: AI configuration from main engine
        
    Returns:
        Configured AI Script Analysis Engine
    """
    return AIScriptAnalysisEngine(ai_config)