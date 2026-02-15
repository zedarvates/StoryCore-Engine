"""
Character Wizard Orchestrator

Main orchestrator for character creation wizard that manages the complete
workflow from user input to character integration with StoryCore-Engine systems.
"""

import uuid
import json
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime

from .models import (
    CharacterProfile, 
    CharacterCreationResult, 
    CreationMethod, 
    WizardState,
    AutoGenerationParams,
    ImageAnalysisResult
)
from .config import CharacterWizardConfig, load_config
from .error_handler import CharacterWizardErrorHandler, CharacterWizardError, ErrorCategory, ErrorSeverity
from .auto_character_generator import AutoCharacterGenerator
from .auto_character_generator import AutoCharacterGenerator


class CharacterWizardOrchestrator:
    """Main orchestrator for character creation wizard"""
    
    def __init__(self, project_context: Optional[str] = None):
        self.project_context = project_context
        self.project_path = Path(project_context) if project_context else Path.cwd()
        
        # Load configuration
        self.config = load_config(self.project_path)
        
        # Initialize components
        self.error_handler = CharacterWizardErrorHandler(self.config.__dict__)
        self.auto_generator = AutoCharacterGenerator()
        
        # State management
        self.current_state: Optional[WizardState] = None
        self.session_id = str(uuid.uuid4())
        
        # Initialize state directory
        self.state_dir = self.project_path / ".kiro" / "character_wizard_state"
        self.state_dir.mkdir(parents=True, exist_ok=True)

    def start_wizard(self) -> CharacterCreationResult:
        """
        Start the character creation wizard
        
        Flow:
        1. Display welcome and check for existing state
        2. Collect creation method preference
        3. Route to appropriate workflow
        4. Build complete character profile
        5. Validate and integrate character
        6. Update character library and project
        """
        try:
            # Initialize wizard state
            self.current_state = WizardState(
                session_id=self.session_id,
                current_step="welcome",
                project_context=self.project_context
            )
            
            # Display welcome message
            self._display_welcome()
            
            # Check for existing character library
            self._check_character_library()
            
            # Get creation method from user
            creation_method = self._get_creation_method()
            self.current_state.creation_method = creation_method
            self.current_state.current_step = "method_selected"
            
            # Save state
            self._save_state()
            
            # Route to appropriate workflow
            if creation_method == CreationMethod.AUTO_GENERATED:
                return self._auto_generation_workflow()
            else:
                return self._image_reference_workflow()
                
        except CharacterWizardError as e:
            recovery_action = self.error_handler.handle_error(e)
            return CharacterCreationResult(
                success=False,
                error_message=f"Wizard error: {e.message}",
                warnings=[f"Recovery suggestion: {recovery_action.description}"]
            )
        except Exception as e:
            error = CharacterWizardError(
                message=f"Unexpected error in wizard: {str(e)}",
                category=ErrorCategory.CONFIGURATION_ERROR,
                severity=ErrorSeverity.HIGH
            )
            recovery_action = self.error_handler.handle_error(error)
            return CharacterCreationResult(
                success=False,
                error_message=str(e),
                warnings=[f"Recovery suggestion: {recovery_action.description}"]
            )

    def resume_wizard(self, state_file: str) -> CharacterCreationResult:
        """Resume interrupted wizard session"""
        try:
            state_path = self.state_dir / state_file
            if not state_path.exists():
                raise CharacterWizardError(
                    message=f"State file not found: {state_file}",
                    category=ErrorCategory.FILE_SYSTEM_ERROR,
                    severity=ErrorSeverity.MEDIUM
                )
            
            # Load state
            with open(state_path, 'r', encoding='utf-8') as f:
                state_data = json.load(f)
            
            # Reconstruct state
            self.current_state = WizardState(**state_data)
            
            print(f"Resuming character creation session: {self.current_state.session_id}")
            print(f"Last step: {self.current_state.current_step}")
            
            # Continue from where we left off
            if self.current_state.current_step == "method_selected":
                if self.current_state.creation_method == CreationMethod.AUTO_GENERATED:
                    return self._auto_generation_workflow()
                else:
                    return self._image_reference_workflow()
            else:
                # Resume from appropriate step
                return self._resume_from_step(self.current_state.current_step)
                
        except Exception as e:
            return CharacterCreationResult(
                success=False,
                error_message=f"Failed to resume wizard: {str(e)}"
            )

    def batch_create_characters(self, count: int, common_params: Dict) -> List[CharacterCreationResult]:
        """Create multiple characters with shared parameters"""
        results = []
        
        print(f"Creating {count} characters with batch parameters...")
        
        for i in range(count):
            print(f"\nCreating character {i + 1}/{count}...")
            
            # Create individual session for each character
            batch_orchestrator = CharacterWizardOrchestrator(self.project_context)
            
            # Set up auto-generation parameters
            auto_params = AutoGenerationParams(**common_params)
            
            # Generate character
            result = batch_orchestrator._generate_auto_character(auto_params)
            results.append(result)
            
            if result.success:
                print(f"✓ Character {i + 1} created: {result.character_profile.name}")
            else:
                print(f"✗ Character {i + 1} failed: {result.error_message}")
        
        return results

    def _display_welcome(self):
        """Display welcome message and wizard information"""
        print("🎭 StoryCore-Engine Character Setup Wizard")
        print("=" * 50)
        print("Create comprehensive character profiles for your StoryCore-Engine projects.")
        print("This wizard will guide you through character creation with two methods:")
        print("  • Automatic Generation: AI-powered character creation")
        print("  • Reference Image: Upload images to create custom characters")
        print()

    def _check_character_library(self):
        """Check for existing character library and display count"""
        library_path = self.project_path / self.config.character_library_path
        
        if library_path.exists():
            character_files = list(library_path.glob("*.json"))
            character_count = len(character_files)
            print(f"📚 Existing character library: {character_count} characters")
        else:
            print("📚 No existing character library found - will create new library")
        print()

    def _get_creation_method(self) -> CreationMethod:
        """Get character creation method from user"""
        print("Character Creation Methods:")
        print("1. Auto-generate character (AI-powered)")
        print("2. Upload reference image")
        print()
        
        while True:
            try:
                choice = input("Select creation method (1 or 2): ").strip()
                
                if choice == "1":
                    return CreationMethod.AUTO_GENERATED
                elif choice == "2":
                    return CreationMethod.IMAGE_REFERENCE
                else:
                    print("Please enter 1 or 2")
                    
            except KeyboardInterrupt:
                raise CharacterWizardError(
                    message="User cancelled character creation",
                    category=ErrorCategory.INPUT_VALIDATION,
                    severity=ErrorSeverity.LOW
                )

    def _auto_generation_workflow(self) -> CharacterCreationResult:
        """Handle automatic character generation workflow"""
        print("\n🤖 Automatic Character Generation")
        print("-" * 35)
        
        # Collect generation parameters
        params = self._collect_auto_generation_params()
        
        # Generate character
        return self._generate_auto_character(params)

    def _image_reference_workflow(self) -> CharacterCreationResult:
        """Handle reference image-based character creation workflow"""
        print("\n🖼️  Reference Image Character Creation")
        print("-" * 40)
        
        # Get image path from user
        image_path = self._get_image_path()
        
        # Analyze image (placeholder for now)
        analysis_result = self._analyze_reference_image(image_path)
        
        # Build character from analysis
        return self._build_character_from_analysis(analysis_result)

    def _collect_auto_generation_params(self) -> AutoGenerationParams:
        """Collect parameters for automatic character generation"""
        params = AutoGenerationParams()
        
        # Get role
        print("Character Role:")
        print("1. Protagonist (main character)")
        print("2. Antagonist (villain/opposition)")
        print("3. Supporting (important side character)")
        print("4. Minor (background character)")
        
        role_choice = input("Select role (1-4): ").strip()
        role_map = {"1": "protagonist", "2": "antagonist", "3": "supporting", "4": "minor"}
        params.role = role_map.get(role_choice, "supporting")
        
        # Get genre
        params.genre = input("Genre (fantasy, sci-fi, modern, horror, etc.): ").strip() or "fantasy"

        # Get gender identity (for AI prompts)
        print("\nGender Identity (for AI prompts):")
        print("1. Masculin (Male)")
        print("2. Féminin (Female)")
        print("3. Non genré (Non-binary)")
        print("4. Autre (Other - for aliens, robots, etc.)")

        gender_choice = input("Select gender (1-4): ").strip()
        gender_map = {
            "1": "male",
            "2": "female",
            "3": "non_binary",
            "4": "other"
        }
        selected_gender = gender_map.get(gender_choice)

        # Import Gender enum and set the value
        from .models import Gender
        if selected_gender:
            params.gender = Gender(selected_gender)

        # If "Other" is selected, ask for custom gender specification
        if selected_gender == "other":
            custom_gender = input("Specify custom gender (e.g., alien, robotic, genderless, etc.): ").strip()
            params.gender_custom = custom_gender

        # Get age range
        print("\nAge Range:")
        print("1. Child (5-12)")
        print("2. Teen (13-19)")
        print("3. Young Adult (20-35)")
        print("4. Adult (36-55)")
        print("5. Elderly (55+)")
        
        age_choice = input("Select age range (1-5): ").strip()
        age_map = {"1": "child", "2": "teen", "3": "young_adult", "4": "adult", "5": "elderly"}
        params.age_range = age_map.get(age_choice, "adult")
        
        # Get style preferences
        style = input("Art style (realistic, anime, cartoon, artistic): ").strip() or "realistic"
        params.style_preferences = {"art_style": style}
        
        return params

    def _get_image_path(self) -> str:
        """Get and validate image path from user"""
        while True:
            image_path = input("Enter path to reference image: ").strip()
            
            if not image_path:
                print("Please provide an image path")
                continue
            
            path = Path(image_path)
            if not path.exists():
                print(f"File not found: {image_path}")
                continue
            
            if not self.config.is_supported_image_format(path.suffix):
                print(f"Unsupported format. Supported: {', '.join(self.config.supported_image_formats)}")
                continue
            
            # Check file size
            file_size = path.stat().st_size
            if file_size > self.config.get_max_image_size_bytes():
                print(f"File too large. Maximum size: {self.config.max_image_size_mb}MB")
                continue
            
            return str(path.absolute())

    def _generate_auto_character(self, params: AutoGenerationParams) -> CharacterCreationResult:
        """Generate character automatically using AI-powered generation"""
        try:
            print(f"🎭 Generating {params.role} character for {params.genre} genre...")
            
            # Use the AutoCharacterGenerator to create the character
            character = self.auto_generator.generate_character(params)
            
            print(f"✓ Generated character: {character.name}")
            print(f"  • Role: {params.role}")
            print(f"  • Genre: {params.genre}")
            print(f"  • Age: {character.visual_identity.age_range}")
            print(f"  • Style: {character.visual_identity.art_style}")
            print(f"  • Quality Score: {character.quality_score:.1f}/5.0")
            print(f"  • Consistency Score: {character.consistency_score:.1f}/5.0")
            
            # Display character summary
            self._display_character_summary(character)
            
            # Save character
            success = self._save_character(character)
            
            if success:
                print(f"\n✅ Character '{character.name}' created and saved successfully!")
            else:
                print(f"\n❌ Character created but failed to save")
            
            return CharacterCreationResult(
                success=success,
                character_profile=character,
                processing_time=2.5,
                integration_status={
                    "puppet_system": True, 
                    "comfyui": True,
                    "character_library": success
                }
            )
            
        except Exception as e:
            error_msg = f"Character generation failed: {str(e)}"
            print(f"❌ {error_msg}")
            return CharacterCreationResult(
                success=False,
                error_message=error_msg
            )

    def _analyze_reference_image(self, image_path: str) -> ImageAnalysisResult:
        """Analyze reference image (placeholder implementation)"""
        # This is a placeholder - actual implementation would use computer vision
        result = ImageAnalysisResult()
        result.image_path = image_path
        result.style_classification = "realistic"
        result.quality_score = 4.0
        result.analysis_confidence = 0.8
        result.processing_notes = ["Image analysis completed", "High quality reference image"]
        
        return result

    def _display_character_summary(self, character: CharacterProfile):
        """Display a summary of the generated character"""
        print(f"\n📋 Character Summary:")
        print(f"   Name: {character.name}")
        print(f"   Appearance: {character.visual_identity.age_range} with {character.visual_identity.hair_color} hair")
        print(f"   Personality: {', '.join(character.personality_profile.primary_traits[:3])}")
        print(f"   Voice: {character.voice_identity.speech_patterns}")
        print(f"   Occupation: {character.backstory_profile.occupation}")
        print(f"   Puppet Category: {character.puppet_category.value}")
        
        if character.voice_identity.catchphrases:
            print(f"   Catchphrase: \"{character.voice_identity.catchphrases[0]}\"")

    def _build_character_from_analysis(self, analysis: ImageAnalysisResult) -> CharacterCreationResult:
        """Build character profile from image analysis"""
        try:
            character = CharacterProfile()
            character.character_id = str(uuid.uuid4())
            character.creation_method = CreationMethod.IMAGE_REFERENCE
            character.reference_images = [analysis.image_path]
            character.name = input("Character name: ").strip() or "Unnamed Character"
            
            # Use analysis results
            character.visual_identity = analysis.visual_features
            character.quality_score = analysis.quality_score
            character.consistency_score = analysis.analysis_confidence * 5.0
            
            # Generate personality based on visual analysis
            character.personality_profile.primary_traits = ["mysterious", "confident", "observant"]
            character.personality_profile.strengths = ["intuition", "adaptability"]
            character.personality_profile.flaws = ["secretive", "distrustful"]
            
            # Save character
            success = self._save_character(character)
            
            return CharacterCreationResult(
                success=success,
                character_profile=character,
                processing_time=3.0,
                integration_status={"puppet_system": True, "comfyui": True}
            )
            
        except Exception as e:
            return CharacterCreationResult(
                success=False,
                error_message=f"Character creation from image failed: {str(e)}"
            )

    def _save_character(self, character: CharacterProfile) -> bool:
        """Save character to library"""
        try:
            library_path = self.project_path / self.config.character_library_path
            library_path.mkdir(parents=True, exist_ok=True)
            
            character_file = library_path / f"{character.character_id}.json"
            
            # Convert to dictionary for JSON serialization
            character_dict = {
                "character_id": character.character_id,
                "name": character.name,
                "gender": character.visual_identity.gender.value if character.visual_identity.gender else None,
                "gender_custom": character.visual_identity.gender_custom,
                "creation_method": character.creation_method.value,
                "creation_timestamp": character.creation_timestamp,
                "version": character.version,
                "visual_identity": {
                    "hair_color": character.visual_identity.hair_color,
                    "hair_style": character.visual_identity.hair_style,
                    "hair_length": character.visual_identity.hair_length,
                    "eye_color": character.visual_identity.eye_color,
                    "eye_shape": character.visual_identity.eye_shape,
                    "skin_tone": character.visual_identity.skin_tone,
                    "facial_structure": character.visual_identity.facial_structure,
                    "distinctive_features": character.visual_identity.distinctive_features,
                    "age_range": character.visual_identity.age_range,
                    "height": character.visual_identity.height,
                    "build": character.visual_identity.build,
                    "posture": character.visual_identity.posture,
                    "clothing_style": character.visual_identity.clothing_style,
                    "color_palette": {
                        "primary_colors": character.visual_identity.color_palette.primary_colors,
                        "secondary_colors": character.visual_identity.color_palette.secondary_colors,
                        "accent_colors": character.visual_identity.color_palette.accent_colors,
                        "color_harmony": character.visual_identity.color_palette.color_harmony
                    },
                    "accessories": character.visual_identity.accessories,
                    "aesthetic": character.visual_identity.aesthetic,
                    "art_style": character.visual_identity.art_style,
                    "rendering_style": character.visual_identity.rendering_style,
                    "quality_level": character.visual_identity.quality_level
                },
                "personality_profile": {
                    "openness": character.personality_profile.openness,
                    "conscientiousness": character.personality_profile.conscientiousness,
                    "extraversion": character.personality_profile.extraversion,
                    "agreeableness": character.personality_profile.agreeableness,
                    "neuroticism": character.personality_profile.neuroticism,
                    "primary_traits": character.personality_profile.primary_traits,
                    "strengths": character.personality_profile.strengths,
                    "flaws": character.personality_profile.flaws,
                    "external_goal": character.personality_profile.external_goal,
                    "internal_need": character.personality_profile.internal_need,
                    "fears": character.personality_profile.fears,
                    "values": character.personality_profile.values,
                    "stress_response": character.personality_profile.stress_response,
                    "conflict_style": character.personality_profile.conflict_style,
                    "emotional_expression": character.personality_profile.emotional_expression,
                    "decision_making_style": character.personality_profile.decision_making_style,
                    "attachment_style": character.personality_profile.attachment_style,
                    "social_preferences": character.personality_profile.social_preferences,
                    "trust_patterns": character.personality_profile.trust_patterns
                },
                "voice_identity": {
                    "speech_patterns": character.voice_identity.speech_patterns,
                    "vocabulary_level": character.voice_identity.vocabulary_level,
                    "sentence_complexity": character.voice_identity.sentence_complexity,
                    "speaking_pace": character.voice_identity.speaking_pace,
                    "accent": character.voice_identity.accent,
                    "dialect": character.voice_identity.dialect,
                    "formality_level": character.voice_identity.formality_level.value,
                    "humor_style": character.voice_identity.humor_style.value,
                    "emotional_range": character.voice_identity.emotional_range,
                    "vulnerability_expression": character.voice_identity.vulnerability_expression,
                    "catchphrases": character.voice_identity.catchphrases,
                    "verbal_tics": character.voice_identity.verbal_tics,
                    "signature_expressions": character.voice_identity.signature_expressions,
                    "voice_type": character.voice_identity.voice_type,
                    "emotional_variance": character.voice_identity.emotional_variance
                },
                "backstory_profile": {
                    "origin_story": character.backstory_profile.origin_story,
                    "key_life_events": character.backstory_profile.key_life_events,
                    "formative_experiences": character.backstory_profile.formative_experiences,
                    "family_background": character.backstory_profile.family_background,
                    "significant_relationships": character.backstory_profile.significant_relationships,
                    "relationship_patterns": character.backstory_profile.relationship_patterns,
                    "occupation": character.backstory_profile.occupation,
                    "education_level": character.backstory_profile.education_level,
                    "social_status": character.backstory_profile.social_status,
                    "cultural_background": character.backstory_profile.cultural_background,
                    "hidden_aspects": character.backstory_profile.hidden_aspects,
                    "secrets": character.backstory_profile.secrets,
                    "unresolved_conflicts": character.backstory_profile.unresolved_conflicts,
                    "growth_opportunities": character.backstory_profile.growth_opportunities,
                    "potential_conflicts": character.backstory_profile.potential_conflicts,
                    "transformation_triggers": character.backstory_profile.transformation_triggers
                },
                "coherence_anchors": {
                    "character_descriptor": character.coherence_anchors.character_descriptor,
                    "facial_anchors": character.coherence_anchors.facial_anchors,
                    "clothing_anchors": character.coherence_anchors.clothing_anchors,
                    "style_anchors": character.coherence_anchors.style_anchors,
                    "primary_colors": character.coherence_anchors.primary_colors,
                    "secondary_colors": character.coherence_anchors.secondary_colors,
                    "color_harmony": character.coherence_anchors.color_harmony,
                    "positive_prompts": character.coherence_anchors.positive_prompts,
                    "negative_prompts": character.coherence_anchors.negative_prompts,
                    "style_strength": character.coherence_anchors.style_strength,
                    "seed_base": character.coherence_anchors.seed_base,
                    "cfg_scale": character.coherence_anchors.cfg_scale,
                    "denoising_strength": character.coherence_anchors.denoising_strength
                },
                "puppet_category": character.puppet_category.value,
                "genre_tags": character.genre_tags,
                "style_tags": character.style_tags,
                "reference_images": character.reference_images,
                "quality_score": character.quality_score,
                "consistency_score": character.consistency_score,
                "metadata": character.metadata
            }
            
            with open(character_file, 'w', encoding='utf-8') as f:
                json.dump(character_dict, f, indent=2, ensure_ascii=False)
            
            print(f"✓ Character saved: {character_file}")
            return True
            
        except Exception as e:
            print(f"✗ Failed to save character: {e}")
            return False

    def _save_state(self):
        """Save current wizard state"""
        if self.current_state:
            state_file = self.state_dir / f"session_{self.session_id}.json"
            
            try:
                state_dict = {
                    "session_id": self.current_state.session_id,
                    "current_step": self.current_state.current_step,
                    "creation_method": self.current_state.creation_method.value if self.current_state.creation_method else None,
                    "collected_data": self.current_state.collected_data,
                    "project_context": self.current_state.project_context,
                    "timestamp": self.current_state.timestamp
                }
                
                with open(state_file, 'w', encoding='utf-8') as f:
                    json.dump(state_dict, f, indent=2)
                    
            except Exception as e:
                print(f"Warning: Failed to save wizard state: {e}")

    def _resume_from_step(self, step: str) -> CharacterCreationResult:
        """Resume wizard from specific step"""
        # Placeholder implementation
        return CharacterCreationResult(
            success=False,
            error_message=f"Resume from step '{step}' not yet implemented"
        )