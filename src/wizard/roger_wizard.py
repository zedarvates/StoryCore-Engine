"""
Roger Wizard - Data Extraction and Project Completion Assistant

An intelligent wizard that analyzes text files (stories, novels, discussion plans, LLM outputs)
to extract all necessary data for completing a StoryCore project. Automatically creates
characters, world-building elements, summaries, and project structure from text input.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
import json
import re
from pathlib import Path
from datetime import datetime
import asyncio


class ExtractionCategory(Enum):
    """Categories of data that can be extracted"""
    CHARACTERS = "characters"
    WORLD_BUILDING = "world_building"
    LOCATIONS = "locations"
    PLOT_SUMMARY = "plot_summary"
    THEMES = "themes"
    CONFLICTS = "conflicts"
    RELATIONSHIPS = "relationships"
    RULES_AND_LORE = "rules_and_lore"
    TIMELINE = "timeline"
    ATMOSPHERE = "atmosphere"


class ConfidenceLevel(Enum):
    """Confidence levels for extracted data"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    UNCERTAIN = "uncertain"


@dataclass
class ExtractedCharacter:
    """A character extracted from the text"""
    name: str
    description: str
    personality_traits: List[str] = field(default_factory=list)
    physical_description: str = ""
    background: str = ""
    motivations: List[str] = field(default_factory=list)
    relationships: Dict[str, str] = field(default_factory=dict)  # name -> relationship_type
    role_in_story: str = ""
    age_group: str = ""  # child, teen, adult, elderly
    gender: str = ""
    occupation: str = ""
    confidence_score: float = 0.0
    source_text: str = ""


@dataclass
class ExtractedLocation:
    """A location extracted from the text"""
    name: str
    description: str
    type: str = ""  # city, building, natural, etc.
    significance: str = ""
    connected_locations: List[str] = field(default_factory=list)
    atmosphere: str = ""
    key_elements: List[str] = field(default_factory=list)
    confidence_score: float = 0.0
    source_text: str = ""


@dataclass
class ExtractedWorldElement:
    """A world-building element extracted from the text"""
    category: str  # magic_system, technology, culture, etc.
    name: str
    description: str
    rules: List[str] = field(default_factory=list)
    examples: List[str] = field(default_factory=list)
    significance: str = ""
    confidence_score: float = 0.0
    source_text: str = ""


@dataclass
class RogerExtractionResult:
    """Complete extraction result from Roger Wizard"""
    project_id: str
    extraction_timestamp: str
    source_file: str
    summary_500_chars: str

    # Extracted data
    characters: List[ExtractedCharacter] = field(default_factory=list)
    locations: List[ExtractedLocation] = field(default_factory=list)
    world_elements: List[ExtractedWorldElement] = field(default_factory=list)

    # Story elements
    plot_summary: str = ""
    main_themes: List[str] = field(default_factory=list)
    main_conflicts: List[str] = field(default_factory=list)
    key_relationships: Dict[str, str] = field(default_factory=dict)

    # Metadata
    extraction_stats: Dict[str, Any] = field(default_factory=dict)
    confidence_metrics: Dict[str, float] = field(default_factory=dict)
    processing_log: List[str] = field(default_factory=list)


class RogerWizard:
    """
    Roger Wizard - Intelligent Data Extraction Assistant

    Analyzes text files to extract all project-relevant data and automatically
    populates StoryCore project structure with characters, world-building,
    locations, and summaries.
    """

    def __init__(self, llm_client=None):
        """Initialize the Roger wizard"""
        self.llm_client = llm_client
        self.extraction_result: Optional[RogerExtractionResult] = None

    async def analyze_and_extract(self, project_path: Path, text_file_path: Path,
                                focus_areas: Optional[List[str]] = None) -> RogerExtractionResult:
        """
        Analyze a text file and extract all project-relevant data

        Args:
            project_path: Path to the StoryCore project directory
            text_file_path: Path to the text file to analyze
            focus_areas: Specific areas to focus extraction on (optional)

        Returns:
            Complete extraction result with all extracted data
        """
        print("🤖 Roger Wizard - Data Extraction Assistant")
        print("=" * 60)

        # Validate inputs
        if not text_file_path.exists():
            raise FileNotFoundError(f"Text file not found: {text_file_path}")

        if not project_path.exists():
            raise FileNotFoundError(f"Project directory not found: {project_path}")

        # Read and validate text file
        text_content = self._read_text_file(text_file_path)
        if len(text_content.strip()) < 100:
            raise ValueError("Text file is too short (minimum 100 characters required)")

        print(f"📄 Analyzing file: {text_file_path.name}")
        print(f"📊 Text length: {len(text_content)} characters")
        if focus_areas:
            print(f"🎯 Focus areas: {', '.join(focus_areas)}")

        print("\n⏳ Starting intelligent extraction...")
        print("   This may take a moment...")

        # Perform extraction in stages
        extraction_result = RogerExtractionResult(
            project_id=self._get_project_id(project_path),
            extraction_timestamp=datetime.utcnow().isoformat() + "Z",
            source_file=str(text_file_path),
            summary_500_chars=""
        )

        # Extract summary first (needed for context)
        extraction_result.summary_500_chars = await self._extract_summary(text_content)

        # Extract characters
        characters = await self._extract_characters(text_content, extraction_result.summary_500_chars)
        extraction_result.characters = characters

        # Extract locations
        locations = await self._extract_locations(text_content, extraction_result.summary_500_chars)
        extraction_result.locations = locations

        # Extract world-building elements
        world_elements = await self._extract_world_elements(text_content, extraction_result.summary_500_chars)
        extraction_result.world_elements = world_elements

        # Extract story elements
        story_elements = await self._extract_story_elements(text_content, extraction_result.summary_500_chars)
        extraction_result.plot_summary = story_elements.get('plot_summary', '')
        extraction_result.main_themes = story_elements.get('themes', [])
        extraction_result.main_conflicts = story_elements.get('conflicts', [])
        extraction_result.key_relationships = story_elements.get('relationships', {})

        # Calculate confidence metrics
        extraction_result.confidence_metrics = self._calculate_confidence_metrics(extraction_result)

        # Calculate extraction statistics
        extraction_result.extraction_stats = self._calculate_extraction_stats(extraction_result)

        # Log processing
        extraction_result.processing_log = [
            f"Processed {len(text_content)} characters from {text_file_path.name}",
            f"Extracted {len(characters)} characters",
            f"Extracted {len(locations)} locations",
            f"Extracted {len(world_elements)} world elements",
            f"Generated {len(extraction_result.summary_500_chars)} character summary",
            f"Identified {len(extraction_result.main_themes)} main themes"
        ]

        self.extraction_result = extraction_result
        self._save_extraction_results(project_path, extraction_result)

        print("\n✅ Extraction complete!")
        print(f"📝 Summary: {len(extraction_result.summary_500_chars)} characters")
        print(f"👥 Characters: {len(extraction_result.characters)}")
        print(f"🏰 Locations: {len(extraction_result.locations)}")
        print(f"🌍 World Elements: {len(extraction_result.world_elements)}")
        print(f"📊 Confidence: {extraction_result.confidence_metrics.get('overall', 0):.1f}/10")

        return extraction_result

    def _read_text_file(self, file_path: Path) -> str:
        """Read and return text file content"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            # Try with different encoding
            with open(file_path, 'r', encoding='latin-1') as f:
                return f.read()

    def _get_project_id(self, project_path: Path) -> str:
        """Get project ID from project.json"""
        project_file = project_path / "project.json"
        if project_file.exists():
            try:
                with open(project_file, 'r') as f:
                    project_data = json.load(f)
                    return project_data.get('id', 'unknown')
            except:
                pass
        return f"roger_extraction_{int(datetime.utcnow().timestamp())}"

    async def _extract_summary(self, text_content: str) -> str:
        """Extract a 500-character summary of the text"""
        # Simple extraction - take first meaningful paragraph or first 500 chars
        text = text_content.strip()

        # Try to find a good starting point (skip titles, headers)
        lines = text.split('\n')
        meaningful_lines = [line for line in lines if len(line.strip()) > 20][:3]

        summary_text = ' '.join(meaningful_lines) if meaningful_lines else text[:800]

        # Clean up and truncate to 500 characters
        summary = re.sub(r'\s+', ' ', summary_text).strip()
        if len(summary) > 500:
            summary = summary[:497] + "..."

        return summary

    async def _extract_characters(self, text_content: str, context_summary: str) -> List[ExtractedCharacter]:
        """Extract characters from the text using pattern recognition and LLM analysis"""
        characters = []

        # Pattern-based extraction first
        pattern_characters = self._extract_characters_by_pattern(text_content)
        characters.extend(pattern_characters)

        # LLM-enhanced extraction (if available)
        if self.llm_client:
            llm_characters = await self._extract_characters_with_llm(text_content, context_summary)
            # Merge and deduplicate
            characters = self._merge_characters(characters, llm_characters)

        # Enhance character data
        for character in characters:
            character.confidence_score = self._calculate_character_confidence(character, text_content)

        # Sort by confidence and remove duplicates
        characters = self._deduplicate_characters(characters)

        return characters[:20]  # Limit to top 20 characters

    def _extract_characters_by_pattern(self, text_content: str) -> List[ExtractedCharacter]:
        """Extract characters using regex patterns and text analysis"""
        characters = []

        # Common patterns for character names
        name_patterns = [
            r'\b[A-Z][a-z]+\s+[A-Z][a-z]+\b',  # First Last
            r'\b[A-Z][a-z]+\b',  # Single names
            r'\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+[A-Z][a-z]+\b',  # Titles
        ]

        found_names = set()

        for pattern in name_patterns:
            matches = re.findall(pattern, text_content)
            for match in matches:
                if match not in found_names and len(match) > 2:
                    found_names.add(match)

                    # Extract context around the name
                    context = self._extract_context_around_match(text_content, match)

                    character = ExtractedCharacter(
                        name=match,
                        description=f"Character mentioned in the story. Context: {context[:200]}...",
                        source_text=context
                    )

                    # Try to infer basic attributes from context
                    character = self._infer_character_attributes(character, context)
                    characters.append(character)

        return characters

    async def _extract_characters_with_llm(self, text_content: str, context_summary: str) -> List[ExtractedCharacter]:
        """Use LLM to extract and analyze characters"""
        # Placeholder for LLM integration
        # In a real implementation, this would call an LLM API to analyze characters
        return []

    def _extract_context_around_match(self, text: str, match: str, context_chars: int = 300) -> str:
        """Extract context around a text match"""
        index = text.find(match)
        if index == -1:
            return ""

        start = max(0, index - context_chars // 2)
        end = min(len(text), index + len(match) + context_chars // 2)

        return text[start:end]

    def _infer_character_attributes(self, character: ExtractedCharacter, context: str) -> ExtractedCharacter:
        """Infer basic character attributes from context"""
        context_lower = context.lower()

        # Age group inference
        if any(word in context_lower for word in ['child', 'kid', 'boy', 'girl', 'young']):
            character.age_group = 'child' if 'child' in context_lower or 'kid' in context_lower else 'teen'
        elif any(word in context_lower for word in ['elderly', 'old', 'aged']):
            character.age_group = 'elderly'
        else:
            character.age_group = 'adult'

        # Gender inference (basic)
        if any(word in context_lower for word in ['he', 'him', 'his', 'man', 'boy']):
            character.gender = 'male'
        elif any(word in context_lower for word in ['she', 'her', 'woman', 'girl']):
            character.gender = 'female'

        # Role inference
        if 'protagonist' in context_lower or 'hero' in context_lower:
            character.role_in_story = 'protagonist'
        elif 'antagonist' in context_lower or 'villain' in context_lower:
            character.role_in_story = 'antagonist'
        elif 'mentor' in context_lower or 'teacher' in context_lower:
            character.role_in_story = 'mentor'

        return character

    def _merge_characters(self, pattern_chars: List[ExtractedCharacter],
                         llm_chars: List[ExtractedCharacter]) -> List[ExtractedCharacter]:
        """Merge characters from different extraction methods"""
        # Simple merge - prefer LLM results over pattern matching
        all_chars = pattern_chars + llm_chars

        # Group by name similarity
        merged = {}
        for char in all_chars:
            key = char.name.lower().strip()
            if key not in merged:
                merged[key] = char
            else:
                # Merge attributes if they complement each other
                existing = merged[key]
                if not existing.description and char.description:
                    existing.description = char.description
                if not existing.personality_traits and char.personality_traits:
                    existing.personality_traits = char.personality_traits

        return list(merged.values())

    def _calculate_character_confidence(self, character: ExtractedCharacter, full_text: str) -> float:
        """Calculate confidence score for extracted character"""
        confidence = 0.5  # Base confidence

        # Name quality
        if len(character.name.split()) > 1:  # Full name
            confidence += 0.2
        if character.name[0].isupper():  # Proper capitalization
            confidence += 0.1

        # Description quality
        if character.description and len(character.description) > 20:
            confidence += 0.2

        # Attributes completeness
        attributes_count = sum(1 for attr in [
            character.age_group, character.gender, character.role_in_story,
            character.occupation, character.background
        ] if attr)
        confidence += attributes_count * 0.1

        # Frequency in text
        name_frequency = full_text.count(character.name)
        if name_frequency > 5:
            confidence += 0.2
        elif name_frequency > 2:
            confidence += 0.1

        return min(confidence, 1.0)

    def _deduplicate_characters(self, characters: List[ExtractedCharacter]) -> List[ExtractedCharacter]:
        """Remove duplicate characters and sort by confidence"""
        # Sort by confidence descending
        characters.sort(key=lambda x: x.confidence_score, reverse=True)

        # Remove duplicates based on name similarity
        unique_chars = []
        seen_names = set()

        for char in characters:
            name_key = char.name.lower().strip()
            if name_key not in seen_names:
                seen_names.add(name_key)
                unique_chars.append(char)

        return unique_chars

    async def _extract_locations(self, text_content: str, context_summary: str) -> List[ExtractedLocation]:
        """Extract locations from the text"""
        locations = []

        # Pattern-based location extraction
        location_patterns = [
            r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b(?:\s+(?:City|Town|Village|Castle|Palace|House|Street|Avenue|Road|Mountain|River|Forest|Sea|Ocean|Lake|Valley|Hill|Island|Kingdom|Realm|World|Planet|Country|Nation|State|Province|District|Neighborhood|Building|School|Hospital|Church|Temple|Store|Shop|Restaurant|Bar|Hotel|Museum|Park|Garden|Beach|Desert|Cave|Mines|Tower|Bridge|Gate|Wall|Fort|Fountain|Square|Plaza))*\b',
        ]

        found_locations = set()

        for pattern in location_patterns:
            matches = re.findall(pattern, text_content)
            for match in matches:
                if len(match) > 3 and match not in found_locations:
                    found_locations.add(match)

                    context = self._extract_context_around_match(text_content, match)

                    location = ExtractedLocation(
                        name=match,
                        description=f"Location mentioned in the story. Context: {context[:200]}...",
                        source_text=context,
                        confidence_score=0.6
                    )

                    # Infer location type
                    location.type = self._infer_location_type(match, context)
                    location.atmosphere = self._infer_location_atmosphere(context)

                    locations.append(location)

        # Sort by confidence and limit
        locations.sort(key=lambda x: x.confidence_score, reverse=True)
        return locations[:15]

    def _infer_location_type(self, name: str, context: str) -> str:
        """Infer the type of location"""
        text = (name + " " + context).lower()

        if any(word in text for word in ['city', 'town', 'village', 'capital']):
            return 'settlement'
        elif any(word in text for word in ['castle', 'palace', 'fort', 'tower']):
            return 'building'
        elif any(word in text for word in ['mountain', 'hill', 'valley', 'canyon']):
            return 'natural'
        elif any(word in text for word in ['forest', 'woods', 'jungle', 'desert']):
            return 'natural_area'
        elif any(word in text for word in ['river', 'lake', 'sea', 'ocean']):
            return 'water_body'
        else:
            return 'location'

    def _infer_location_atmosphere(self, context: str) -> str:
        """Infer the atmosphere/mood of a location"""
        context_lower = context.lower()

        if any(word in context_lower for word in ['dark', 'shadowy', 'eerie', 'haunted']):
            return 'dark and mysterious'
        elif any(word in context_lower for word in ['bright', 'sunny', 'cheerful', 'vibrant']):
            return 'bright and welcoming'
        elif any(word in context_lower for word in ['quiet', 'peaceful', 'serene']):
            return 'calm and peaceful'
        elif any(word in context_lower for word in ['busy', 'crowded', 'lively']):
            return 'bustling and energetic'
        else:
            return 'neutral atmosphere'

    async def _extract_world_elements(self, text_content: str, context_summary: str) -> List[ExtractedWorldElement]:
        """Extract world-building elements from the text"""
        world_elements = []

        # Look for common world-building patterns
        world_patterns = {
            'magic_system': [
                r'magic(?:al)?\s+system',
                r'spell(?:s)?(?:casting)?',
                r'mana|energy|power',
                r'enchantment|charm|curse'
            ],
            'technology': [
                r'technology|tech|machine',
                r'device|gadget|weapon',
                r'scientific|science|research'
            ],
            'culture': [
                r'culture|tradition|custom',
                r'religion|belief|faith|god',
                r'society|social|community'
            ],
            'politics': [
                r'government|kingdom|empire',
                r'king|queen|ruler|lord',
                r'law|politics|policy'
            ],
            'economy': [
                r'money|currency|coin|gold',
                r'trade|merchant|market',
                r'economy|wealth|poverty'
            ]
        }

        for category, patterns in world_patterns.items():
            category_elements = []

            for pattern in patterns:
                matches = re.finditer(pattern, text_content, re.IGNORECASE)
                for match in matches:
                    context = self._extract_context_around_match(text_content, match.group(), 400)

                    element = ExtractedWorldElement(
                        category=category,
                        name=f"{category.title()} Element",
                        description=f"World-building element related to {category}. Context: {context[:300]}...",
                        source_text=context,
                        confidence_score=0.7
                    )

                    # Extract rules if mentioned
                    element.rules = self._extract_rules_from_context(context)
                    element.examples = self._extract_examples_from_context(context)

                    category_elements.append(element)

            # Deduplicate and keep top element per category
            if category_elements:
                best_element = max(category_elements, key=lambda x: x.confidence_score)
                world_elements.append(best_element)

        return world_elements[:10]

    def _extract_rules_from_context(self, context: str) -> List[str]:
        """Extract rules or constraints from context"""
        rules = []

        # Look for rule-like patterns
        rule_patterns = [
            r'(?:must|can(?:not)?|cannot|may|shall|should|always|never)\s+[^.]*',
            r'(?:rule|law|constraint|limitation)[:\s]+[^.]*',
            r'(?:impossible|possible) to[^.]*'
        ]

        for pattern in rule_patterns:
            matches = re.findall(pattern, context, re.IGNORECASE)
            rules.extend(matches[:2])  # Limit per pattern

        return rules[:3]  # Max 3 rules

    def _extract_examples_from_context(self, context: str) -> List[str]:
        """Extract examples from context"""
        examples = []

        # Look for example patterns
        example_patterns = [
            r'(?:for example|such as|like|including)[:\s]+[^.]*',
            r'(?:example|instance)[:\s]+[^.]*'
        ]

        for pattern in example_patterns:
            matches = re.findall(pattern, context, re.IGNORECASE)
            examples.extend(matches[:1])  # One per pattern

        return examples[:2]  # Max 2 examples

    async def _extract_story_elements(self, text_content: str, context_summary: str) -> Dict[str, Any]:
        """Extract story elements like plot summary, themes, conflicts"""
        story_elements = {
            'plot_summary': '',
            'themes': [],
            'conflicts': [],
            'relationships': {}
        }

        # Extract basic plot summary (simplified)
        sentences = re.split(r'[.!?]+', text_content)
        meaningful_sentences = [s.strip() for s in sentences if len(s.strip()) > 20][:5]

        if meaningful_sentences:
            story_elements['plot_summary'] = ' '.join(meaningful_sentences)
            if len(story_elements['plot_summary']) > 1000:
                story_elements['plot_summary'] = story_elements['plot_summary'][:997] + "..."

        # Extract themes (simplified keyword-based)
        theme_keywords = {
            'love': ['love', 'romance', 'heart', 'passion'],
            'adventure': ['adventure', 'journey', 'quest', 'explore'],
            'conflict': ['war', 'battle', 'fight', 'struggle'],
            'mystery': ['mystery', 'secret', 'unknown', 'puzzle'],
            'growth': ['growth', 'change', 'learn', 'develop'],
            'friendship': ['friend', 'loyalty', 'bond', 'trust']
        }

        text_lower = text_content.lower()
        detected_themes = []

        for theme, keywords in theme_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                detected_themes.append(theme.title())

        story_elements['themes'] = detected_themes[:5]

        # Extract conflicts (simplified)
        conflict_indicators = ['conflict', 'problem', 'challenge', 'obstacle', 'versus', 'against']
        conflict_sentences = []

        for sentence in sentences:
            if any(indicator in sentence.lower() for indicator in conflict_indicators):
                conflict_sentences.append(sentence.strip())

        story_elements['conflicts'] = conflict_sentences[:3]

        return story_elements

    def _calculate_confidence_metrics(self, result: RogerExtractionResult) -> Dict[str, float]:
        """Calculate confidence metrics for the extraction"""
        metrics = {}

        # Character confidence
        if result.characters:
            avg_char_confidence = sum(c.confidence_score for c in result.characters) / len(result.characters)
            metrics['characters'] = avg_char_confidence

        # Location confidence
        if result.locations:
            avg_loc_confidence = sum(l.confidence_score for l in result.locations) / len(result.locations)
            metrics['locations'] = avg_loc_confidence

        # World elements confidence
        if result.world_elements:
            avg_world_confidence = sum(w.confidence_score for w in result.world_elements) / len(result.world_elements)
            metrics['world_elements'] = avg_world_confidence

        # Overall confidence
        confidence_values = [v for v in metrics.values()]
        if confidence_values:
            metrics['overall'] = sum(confidence_values) / len(confidence_values)
        else:
            metrics['overall'] = 0.5

        return metrics

    def _calculate_extraction_stats(self, result: RogerExtractionResult) -> Dict[str, Any]:
        """Calculate extraction statistics"""
        return {
            'total_characters_extracted': len(result.characters),
            'total_locations_extracted': len(result.locations),
            'total_world_elements_extracted': len(result.world_elements),
            'summary_length': len(result.summary_500_chars),
            'themes_identified': len(result.main_themes),
            'conflicts_identified': len(result.main_conflicts),
            'relationships_mapped': len(result.key_relationships),
            'extraction_timestamp': result.extraction_timestamp
        }

    def _save_extraction_results(self, project_path: Path, result: RogerExtractionResult) -> None:
        """Save extraction results to project files"""
        # Save main extraction report
        extraction_data = {
            'roger_extraction': {
                'project_id': result.project_id,
                'extraction_timestamp': result.extraction_timestamp,
                'source_file': result.source_file,
                'summary_500_chars': result.summary_500_chars,
                'extraction_stats': result.extraction_stats,
                'confidence_metrics': result.confidence_metrics,
                'processing_log': result.processing_log
            }
        }

        extraction_file = project_path / "roger_extraction_report.json"
        with open(extraction_file, 'w') as f:
            json.dump(extraction_data, f, indent=2)

        # Save extracted characters
        if result.characters:
            characters_data = {
                'character_definitions': [
                    {
                        'name': char.name,
                        'description': char.description,
                        'personality_traits': char.personality_traits,
                        'physical_description': char.physical_description,
                        'background': char.background,
                        'motivations': char.motivations,
                        'relationships': char.relationships,
                        'role_in_story': char.role_in_story,
                        'age_group': char.age_group,
                        'gender': char.gender,
                        'occupation': char.occupation,
                        'confidence_score': char.confidence_score,
                        'extracted_by_roger': True,
                        'extraction_timestamp': result.extraction_timestamp
                    } for char in result.characters
                ]
            }

            characters_file = project_path / "character_definitions.json"
            with open(characters_file, 'w') as f:
                json.dump(characters_data, f, indent=2)

        # Save extracted world elements
        if result.world_elements or result.locations:
            world_data = {
                'world_building': {
                    'locations': [
                        {
                            'name': loc.name,
                            'description': loc.description,
                            'type': loc.type,
                            'significance': loc.significance,
                            'connected_locations': loc.connected_locations,
                            'atmosphere': loc.atmosphere,
                            'key_elements': loc.key_elements,
                            'confidence_score': loc.confidence_score,
                            'extracted_by_roger': True
                        } for loc in result.locations
                    ],
                    'world_elements': [
                        {
                            'category': elem.category,
                            'name': elem.name,
                            'description': elem.description,
                            'rules': elem.rules,
                            'examples': elem.examples,
                            'significance': elem.significance,
                            'confidence_score': elem.confidence_score,
                            'extracted_by_roger': True
                        } for elem in result.world_elements
                    ],
                    'extraction_timestamp': result.extraction_timestamp
                }
            }

            world_file = project_path / "world_building.json"
            with open(world_file, 'w') as f:
                json.dump(world_data, f, indent=2)

        # Update project.json with extraction metadata
        project_file = project_path / "project.json"
        if project_file.exists():
            try:
                with open(project_file, 'r') as f:
                    project_data = json.load(f)

                project_data['roger_extraction'] = {
                    'completed': True,
                    'extraction_timestamp': result.extraction_timestamp,
                    'source_file': result.source_file,
                    'summary': result.summary_500_chars,
                    'stats': result.extraction_stats
                }

                with open(project_file, 'w') as f:
                    json.dump(project_data, f, indent=2)

            except Exception as e:
                print(f"Warning: Could not update project.json: {e}")

    def get_extraction_preview(self, text_file_path: Path) -> Dict[str, Any]:
        """
        Get a preview of what would be extracted from a text file

        Args:
            text_file_path: Path to the text file

        Returns:
            Preview data with extraction estimates
        """
        if not text_file_path.exists():
            return {'error': 'File not found'}

        try:
            text_content = self._read_text_file(text_file_path)

            # Quick analysis
            word_count = len(text_content.split())
            char_count = len(text_content)

            # Estimate extraction potential
            name_matches = len(re.findall(r'\b[A-Z][a-z]+\b', text_content))
            location_matches = len(re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text_content))

            return {
                'file_name': text_file_path.name,
                'file_size': text_file_path.stat().st_size,
                'word_count': word_count,
                'character_count': char_count,
                'estimated_characters': min(name_matches // 3, 20),  # Rough estimate
                'estimated_locations': min(location_matches // 5, 15),  # Rough estimate
                'extraction_potential': 'high' if word_count > 1000 else 'medium' if word_count > 500 else 'low',
                'preview_text': text_content[:300] + "..." if len(text_content) > 300 else text_content
            }

        except Exception as e:
            return {'error': f'Could not analyze file: {str(e)}'}


# Convenience functions
def create_roger_wizard(llm_client=None) -> RogerWizard:
    """Create a Roger wizard instance"""
    return RogerWizard(llm_client)


async def extract_project_data(project_path: Path, text_file_path: Path,
                             focus_areas: Optional[List[str]] = None) -> RogerExtractionResult:
    """
    Convenience function to extract project data from text file

    Args:
        project_path: Path to project directory
        text_file_path: Path to text file to analyze
        focus_areas: Specific areas to focus extraction on

    Returns:
        Complete extraction result
    """
    wizard = create_roger_wizard()
    return await wizard.analyze_and_extract(project_path, text_file_path, focus_areas)


def get_extraction_preview(text_file_path: Path) -> Dict[str, Any]:
    """
    Get extraction preview for a text file

    Args:
        text_file_path: Path to text file

    Returns:
        Preview data
    """
    wizard = create_roger_wizard()
    return wizard.get_extraction_preview(text_file_path)