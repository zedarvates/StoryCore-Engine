"""
Enhanced Prompt Parser for end-to-end project creation.

Extracts structured data from free-form user prompts using:
1. LLM-based parsing (if available) for advanced understanding
2. Rule-based parsing with regex patterns as fallback
3. Intelligent defaults for missing fields
"""

import re
import asyncio
from typing import Optional, Dict, Any, List
from src.end_to_end.data_models import ParsedPrompt, CharacterInfo
from src.end_to_end.llm_client import LLMClient, LLMError


class PromptParser:
    """
    Parser for extracting structured data from user prompts.
    
    Uses rule-based parsing with regex patterns to extract:
    - Title, genre, video_type, mood, setting
    - Time period, characters, key elements
    - Visual style, aspect ratio, duration
    
    Provides intelligent defaults for missing fields.
    """
    
    # Genre patterns
    GENRE_PATTERNS = {
        'cyberpunk': r'\b(cyberpunk|cyber-punk|cyber punk)\b',
        'fantasy': r'\b(fantasy|fantastique|magical|magic)\b',
        'horror': r'\b(horror|horreur|scary|terrifying)\b',
        'sci-fi': r'\b(sci-fi|science fiction|science-fiction|futuristic)\b',
        'western': r'\b(western|cowboy|far west)\b',
        'thriller': r'\b(thriller|suspense|tension)\b',
        'romance': r'\b(romance|romantic|love story)\b',
        'action': r'\b(action|combat|fight|battle)\b',
        'comedy': r'\b(comedy|comic|funny|humorous)\b',
        'drama': r'\b(drama|dramatic|emotional)\b',
        'post-apocalyptic': r'\b(post-apo|post-apocalyptic|apocalypse|dystopian)\b',
        'noir': r'\b(noir|dark|gritty)\b',
        'steampunk': r'\b(steampunk|steam-punk)\b',
    }
    
    # Video type patterns
    VIDEO_TYPE_PATTERNS = {
        'trailer': r'\b(trailer|bande-annonce)\b',
        'teaser': r'\b(teaser)\b',
        'short_film': r'\b(short film|court métrage|short)\b',
        'music_video': r'\b(music video|clip|video clip)\b',
        'commercial': r'\b(commercial|ad|advertisement|pub)\b',
        'scene': r'\b(scene|scène)\b',
    }
    
    # Mood patterns
    MOOD_PATTERNS = {
        'dark': r'\b(dark|sombre|obscur)\b',
        'mysterious': r'\b(mysterious|mystérieux|enigmatic)\b',
        'epic': r'\b(epic|épique|grandiose)\b',
        'intimate': r'\b(intimate|intime|personal)\b',
        'tense': r'\b(tense|tension|stressful)\b',
        'melancholic': r'\b(melancholic|mélancolique|sad|triste)\b',
        'uplifting': r'\b(uplifting|inspiring|inspirant)\b',
        'eerie': r'\b(eerie|étrange|uncanny)\b',
        'romantic': r'\b(romantic|romantique)\b',
        'violent': r'\b(violent|brutal|aggressive)\b',
        'peaceful': r'\b(peaceful|calm|serene|paisible)\b',
        'chaotic': r'\b(chaotic|chaotique|frantic)\b',
    }
    
    # Time period patterns
    TIME_PERIOD_PATTERNS = {
        'future': r'\b(2[0-9]{3}|3[0-9]{3}|future|futur|tomorrow)\b',
        'present': r'\b(present|today|contemporary|modern|actuel)\b',
        'past': r'\b(past|passé|historical|historique|ancient|ancien)\b',
        'medieval': r'\b(medieval|médiéval|middle ages)\b',
        'victorian': r'\b(victorian|victorien|19th century)\b',
        'renaissance': r'\b(renaissance)\b',
        'prehistoric': r'\b(prehistoric|préhistorique|stone age)\b',
    }
    
    # Aspect ratio patterns
    ASPECT_RATIO_PATTERNS = {
        '16:9': r'\b(16:9|16/9|widescreen|cinematic)\b',
        '9:16': r'\b(9:16|9/16|vertical|portrait|mobile|tiktok|instagram story)\b',
        '1:1': r'\b(1:1|square|carré|instagram post)\b',
        '21:9': r'\b(21:9|21/9|ultrawide|ultra-wide|anamorphic)\b',
        '4:3': r'\b(4:3|4/3|classic|standard)\b',
    }
    
    # Duration patterns (in seconds)
    DURATION_PATTERNS = {
        r'(\d+)\s*(?:second|sec|s)\b': 1,
        r'(\d+)\s*(?:minute|min|m)\b': 60,
        r'(\d+)\s*(?:hour|hr|h)\b': 3600,
    }
    
    # Character name patterns (common fairy tale characters)
    CHARACTER_PATTERNS = {
        'Snow White': r'\b(snow white|blanche-neige|blanche neige)\b',
        'Little Red Riding Hood': r'\b(little red riding hood|petit chaperon rouge|chaperon rouge)\b',
        'Cinderella': r'\b(cinderella|cendrillon)\b',
        'Prince': r'\b(prince|princely)\b',
        'Princess': r'\b(princess|princesse)\b',
        'Queen': r'\b(queen|reine)\b',
        'King': r'\b(king|roi)\b',
        'Wolf': r'\b(wolf|loup)\b',
        'Hunter': r'\b(hunter|chasseur|huntsman)\b',
        'Witch': r'\b(witch|sorcière|sorceress)\b',
        'Fairy': r'\b(fairy|fée|godmother)\b',
    }
    
    # Visual style patterns
    VISUAL_STYLE_PATTERNS = {
        'neon': r'\b(neon|néon|glowing)\b',
        'gritty': r'\b(gritty|rough|rugged)\b',
        'elegant': r'\b(elegant|élégant|refined)\b',
        'minimalist': r'\b(minimalist|minimaliste|simple)\b',
        'baroque': r'\b(baroque|ornate|decorative)\b',
        'industrial': r'\b(industrial|industriel|mechanical)\b',
        'organic': r'\b(organic|organique|natural)\b',
        'surreal': r'\b(surreal|surréaliste|dreamlike)\b',
        'realistic': r'\b(realistic|réaliste|photorealistic)\b',
        'stylized': r'\b(stylized|stylisé|artistic)\b',
    }
    
    # Setting patterns
    SETTING_PATTERNS = {
        'city': r'\b(city|ville|urban|metropolis)\b',
        'forest': r'\b(forest|forêt|woods|woodland)\b',
        'desert': r'\b(desert|désert|wasteland)\b',
        'space': r'\b(space|espace|cosmos|galaxy)\b',
        'underwater': r'\b(underwater|sous-marin|ocean|sea)\b',
        'mountain': r'\b(mountain|montagne|peak|summit)\b',
        'castle': r'\b(castle|château|fortress|palace)\b',
        'laboratory': r'\b(laboratory|lab|laboratoire)\b',
        'street': r'\b(street|rue|alley|boulevard)\b',
        'home': r'\b(home|house|maison|apartment)\b',
    }
    
    def __init__(self, llm_client: Optional[LLMClient] = None, use_llm: bool = True):
        """
        Initialize prompt parser.
        
        Args:
            llm_client: Optional LLM client for advanced parsing
            use_llm: Whether to use LLM parsing (if available)
        """
        self.llm_client = llm_client
        self.use_llm = use_llm and llm_client is not None and llm_client.is_available()
    
    def parse(self, prompt: str) -> ParsedPrompt:
        """
        Parse user prompt into structured data.
        
        Uses LLM parsing if available, falls back to rule-based parsing.
        
        Args:
            prompt: User input text
            
        Returns:
            ParsedPrompt with all extracted information
        """
        # Try LLM parsing first if available
        if self.use_llm:
            try:
                # Run async LLM parsing in sync context
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    llm_result = loop.run_until_complete(self._parse_with_llm(prompt))
                    if llm_result:
                        return llm_result
                finally:
                    loop.close()
            except Exception as e:
                # LLM parsing failed, fall back to rule-based
                print(f"LLM parsing failed, falling back to rule-based: {e}")
        
        # Fall back to rule-based parsing
        return self._parse_rule_based(prompt)
    
    async def _parse_with_llm(self, prompt: str) -> Optional[ParsedPrompt]:
        """
        Parse prompt using LLM client.
        
        Args:
            prompt: User input text
            
        Returns:
            ParsedPrompt or None if LLM parsing fails
        """
        if not self.llm_client:
            return None
        
        try:
            llm_data = await self.llm_client.parse_prompt(prompt)
            
            # Convert LLM response to ParsedPrompt
            characters = [
                CharacterInfo(
                    name=char.get("name", "Unknown"),
                    role=char.get("role", "supporting"),
                    description=char.get("description", "")
                )
                for char in llm_data.get("characters", [])
            ]
            
            # Calculate confidence scores (LLM parsing has higher confidence)
            confidence_scores = {
                field: 0.9 for field in [
                    'title', 'genre', 'video_type', 'mood', 'setting',
                    'time_period', 'characters', 'key_elements', 'visual_style',
                    'aspect_ratio', 'duration'
                ]
            }
            
            parsed = ParsedPrompt(
                project_title=llm_data.get("project_title", "Untitled Project"),
                genre=llm_data.get("genre", "drama"),
                video_type=llm_data.get("video_type", "trailer"),
                mood=llm_data.get("mood", ["mysterious", "dramatic"]),
                setting=llm_data.get("setting", "city"),
                time_period=llm_data.get("time_period", "present"),
                characters=characters if characters else [
                    CharacterInfo(name="Protagonist", role="main", description="Main character")
                ],
                key_elements=llm_data.get("key_elements", ["atmosphere", "lighting"]),
                visual_style=llm_data.get("visual_style", ["cinematic", "atmospheric"]),
                aspect_ratio=llm_data.get("aspect_ratio", "16:9"),
                duration_seconds=llm_data.get("duration_seconds", 60),
                raw_prompt=prompt,
                confidence_scores=confidence_scores
            )
            
            # Validate and fill defaults
            parsed = self.fill_defaults(parsed)
            
            return parsed
            
        except LLMError as e:
            print(f"LLM parsing error: {e}")
            return None
    
    def _parse_rule_based(self, prompt: str) -> ParsedPrompt:
        """
        Parse prompt using rule-based approach.
        
        Args:
            prompt: User input text
            
        Returns:
            ParsedPrompt with all extracted information
        """
        prompt_lower = prompt.lower()
        
        # Extract all fields
        title = self._extract_title(prompt)
        genre = self._extract_genre(prompt_lower)
        video_type = self._extract_video_type(prompt_lower)
        mood = self._extract_moods(prompt_lower)
        setting = self._extract_setting(prompt_lower)
        time_period = self._extract_time_period(prompt_lower)
        characters = self._extract_characters(prompt)
        key_elements = self._extract_key_elements(prompt_lower)
        visual_style = self._extract_visual_style(prompt_lower)
        aspect_ratio = self._extract_aspect_ratio(prompt_lower)
        duration = self._extract_duration(prompt_lower)
        
        # Calculate confidence scores
        confidence_scores = self._calculate_confidence_scores(
            title, genre, video_type, mood, setting, time_period,
            characters, key_elements, visual_style, aspect_ratio, duration
        )
        
        return ParsedPrompt(
            project_title=title,
            genre=genre,
            video_type=video_type,
            mood=mood,
            setting=setting,
            time_period=time_period,
            characters=characters,
            key_elements=key_elements,
            visual_style=visual_style,
            aspect_ratio=aspect_ratio,
            duration_seconds=duration,
            raw_prompt=prompt,
            confidence_scores=confidence_scores
        )
    
    def _extract_title(self, prompt: str) -> str:
        """Extract or generate project title from prompt"""
        # Try to find quoted title
        quoted_match = re.search(r'["\']([^"\']+)["\']', prompt)
        if quoted_match:
            return quoted_match.group(1).strip()
        
        # Try to find title pattern (e.g., "Title: Something")
        title_match = re.search(r'(?:title|titre)\s*[:=]\s*([^\n,]+)', prompt, re.IGNORECASE)
        if title_match:
            return title_match.group(1).strip()
        
        # Generate title from first significant words (up to 50 chars)
        words = prompt.split()
        title_words = []
        char_count = 0
        
        for word in words:
            if char_count + len(word) > 50:
                break
            title_words.append(word)
            char_count += len(word) + 1
        
        title = ' '.join(title_words)
        
        # Clean up title
        title = re.sub(r'[^\w\s\-\'\"àâäéèêëïîôùûüÿæœç]', '', title)
        title = title.strip()
        
        return title if title else "Untitled Project"
    
    def _extract_genre(self, prompt_lower: str) -> str:
        """Extract genre from prompt"""
        for genre, pattern in self.GENRE_PATTERNS.items():
            if re.search(pattern, prompt_lower, re.IGNORECASE):
                return genre
        
        # Default genre
        return "drama"
    
    def _extract_video_type(self, prompt_lower: str) -> str:
        """Extract video type from prompt"""
        for video_type, pattern in self.VIDEO_TYPE_PATTERNS.items():
            if re.search(pattern, prompt_lower, re.IGNORECASE):
                return video_type
        
        # Default video type
        return "trailer"
    
    def _extract_moods(self, prompt_lower: str) -> List[str]:
        """Extract moods from prompt"""
        moods = []
        
        for mood, pattern in self.MOOD_PATTERNS.items():
            if re.search(pattern, prompt_lower, re.IGNORECASE):
                moods.append(mood)
        
        # Default moods based on genre if none found
        if not moods:
            moods = ["mysterious", "dramatic"]
        
        return moods
    
    def _extract_setting(self, prompt_lower: str) -> str:
        """Extract setting from prompt"""
        for setting, pattern in self.SETTING_PATTERNS.items():
            if re.search(pattern, prompt_lower, re.IGNORECASE):
                return setting
        
        # Default setting
        return "city"
    
    def _extract_time_period(self, prompt_lower: str) -> str:
        """Extract time period from prompt"""
        # Check for specific year
        year_match = re.search(r'\b(2[0-9]{3}|3[0-9]{3})\b', prompt_lower)
        if year_match:
            return year_match.group(1)
        
        # Check for period keywords
        for period, pattern in self.TIME_PERIOD_PATTERNS.items():
            if re.search(pattern, prompt_lower, re.IGNORECASE):
                return period
        
        # Default time period
        return "present"
    
    def _extract_characters(self, prompt: str) -> List[CharacterInfo]:
        """Extract characters from prompt"""
        characters = []
        prompt_lower = prompt.lower()
        
        for char_name, pattern in self.CHARACTER_PATTERNS.items():
            if re.search(pattern, prompt_lower, re.IGNORECASE):
                # Determine role based on character type
                role = self._determine_character_role(char_name)
                
                characters.append(CharacterInfo(
                    name=char_name,
                    role=role,
                    description=f"{char_name} character"
                ))
        
        # If no specific characters found, create generic ones
        if not characters:
            characters = [
                CharacterInfo(
                    name="Protagonist",
                    role="main",
                    description="Main character"
                )
            ]
        
        return characters
    
    def _determine_character_role(self, char_name: str) -> str:
        """Determine character role based on name"""
        main_characters = ['Snow White', 'Little Red Riding Hood', 'Cinderella']
        antagonists = ['Wolf', 'Witch', 'Queen']
        
        if char_name in main_characters:
            return "main"
        elif char_name in antagonists:
            return "antagonist"
        else:
            return "supporting"
    
    def _extract_key_elements(self, prompt_lower: str) -> List[str]:
        """Extract key visual/narrative elements from prompt"""
        elements = []
        
        # Extract nouns that might be key elements
        # This is a simplified approach - could be enhanced with NLP
        element_keywords = [
            'magic', 'technology', 'weapon', 'artifact', 'vehicle',
            'building', 'creature', 'robot', 'android', 'cyborg',
            'portal', 'crystal', 'sword', 'gun', 'ship', 'car'
        ]
        
        for keyword in element_keywords:
            if keyword in prompt_lower:
                elements.append(keyword)
        
        # Default elements if none found
        if not elements:
            elements = ["atmosphere", "lighting"]
        
        return elements
    
    def _extract_visual_style(self, prompt_lower: str) -> List[str]:
        """Extract visual style from prompt"""
        styles = []
        
        for style, pattern in self.VISUAL_STYLE_PATTERNS.items():
            if re.search(pattern, prompt_lower, re.IGNORECASE):
                styles.append(style)
        
        # Default styles if none found
        if not styles:
            styles = ["cinematic", "atmospheric"]
        
        return styles
    
    def _extract_aspect_ratio(self, prompt_lower: str) -> str:
        """Extract aspect ratio from prompt"""
        for ratio, pattern in self.ASPECT_RATIO_PATTERNS.items():
            if re.search(pattern, prompt_lower, re.IGNORECASE):
                return ratio
        
        # Default aspect ratio (cinematic widescreen)
        return "16:9"
    
    def _extract_duration(self, prompt_lower: str) -> int:
        """Extract duration from prompt (in seconds)"""
        for pattern, multiplier in self.DURATION_PATTERNS.items():
            match = re.search(pattern, prompt_lower, re.IGNORECASE)
            if match:
                value = int(match.group(1))
                duration = value * multiplier
                # If duration is invalid (0 or negative), use default
                if duration <= 0:
                    break
                return duration
        
        # Default duration based on video type
        # Trailer: 60s, Teaser: 30s, Short film: 180s, etc.
        video_type = self._extract_video_type(prompt_lower)
        
        duration_defaults = {
            'trailer': 60,
            'teaser': 30,
            'short_film': 180,
            'music_video': 180,
            'commercial': 30,
            'scene': 90,
        }
        
        return duration_defaults.get(video_type, 60)
    
    def _calculate_confidence_scores(
        self,
        title: str,
        genre: str,
        video_type: str,
        mood: List[str],
        setting: str,
        time_period: str,
        characters: List[CharacterInfo],
        key_elements: List[str],
        visual_style: List[str],
        aspect_ratio: str,
        duration: int
    ) -> Dict[str, float]:
        """
        Calculate confidence scores for extracted fields.
        
        Higher scores indicate more confident extraction.
        Lower scores indicate defaults were used.
        """
        scores = {}
        
        # Title confidence (high if not default)
        scores['title'] = 0.9 if title != "Untitled Project" else 0.3
        
        # Genre confidence (medium - based on pattern matching)
        scores['genre'] = 0.7
        
        # Video type confidence
        scores['video_type'] = 0.7
        
        # Mood confidence (higher if multiple moods found)
        scores['mood'] = min(0.9, 0.5 + (len(mood) * 0.2))
        
        # Setting confidence
        scores['setting'] = 0.7
        
        # Time period confidence (high if specific year found)
        scores['time_period'] = 0.9 if time_period.isdigit() else 0.6
        
        # Characters confidence (higher if specific characters found)
        scores['characters'] = 0.8 if len(characters) > 1 else 0.4
        
        # Key elements confidence
        scores['key_elements'] = 0.6
        
        # Visual style confidence
        scores['visual_style'] = min(0.9, 0.5 + (len(visual_style) * 0.2))
        
        # Aspect ratio confidence
        scores['aspect_ratio'] = 0.7
        
        # Duration confidence
        scores['duration'] = 0.7
        
        return scores
    
    def validate_parsed_data(self, parsed: ParsedPrompt) -> tuple:
        """
        Validate that all required fields are present and valid.
        
        Args:
            parsed: ParsedPrompt to validate
            
        Returns:
            Tuple of (is_valid, error_messages)
        """
        errors = []
        
        # Check required fields
        if not parsed.project_title:
            errors.append("Project title is missing")
        
        if not parsed.genre:
            errors.append("Genre is missing")
        
        if not parsed.video_type:
            errors.append("Video type is missing")
        
        if not parsed.aspect_ratio:
            errors.append("Aspect ratio is missing")
        
        if parsed.duration_seconds <= 0:
            errors.append("Duration must be positive")
        
        if parsed.duration_seconds > 3600:
            errors.append("Duration exceeds maximum (1 hour)")
        
        # Check aspect ratio format
        valid_ratios = ["16:9", "9:16", "1:1", "4:3", "21:9"]
        if parsed.aspect_ratio not in valid_ratios:
            errors.append(f"Invalid aspect ratio: {parsed.aspect_ratio}")
        
        # Check lists are not empty
        if not parsed.mood:
            errors.append("Mood list is empty")
        
        if not parsed.characters:
            errors.append("Characters list is empty")
        
        return (len(errors) == 0, errors)
    
    def fill_defaults(self, parsed: ParsedPrompt) -> ParsedPrompt:
        """
        Fill missing fields with intelligent defaults.
        
        Args:
            parsed: ParsedPrompt with potentially missing fields
            
        Returns:
            ParsedPrompt with all fields filled
        """
        # This method ensures all fields have valid values
        # Most defaults are already applied during parsing
        
        if not parsed.project_title:
            parsed.project_title = "Untitled Project"
        
        if not parsed.genre:
            parsed.genre = "drama"
        
        if not parsed.video_type:
            parsed.video_type = "trailer"
        
        if not parsed.mood:
            parsed.mood = ["mysterious", "dramatic"]
        
        if not parsed.setting:
            parsed.setting = "city"
        
        if not parsed.time_period:
            parsed.time_period = "present"
        
        if not parsed.characters:
            parsed.characters = [
                CharacterInfo(
                    name="Protagonist",
                    role="main",
                    description="Main character"
                )
            ]
        
        if not parsed.key_elements:
            parsed.key_elements = ["atmosphere", "lighting"]
        
        if not parsed.visual_style:
            parsed.visual_style = ["cinematic", "atmospheric"]
        
        # Validate and fix aspect ratio
        valid_ratios = ["16:9", "9:16", "1:1", "4:3", "21:9"]
        if not parsed.aspect_ratio or parsed.aspect_ratio not in valid_ratios:
            parsed.aspect_ratio = "16:9"
        
        if parsed.duration_seconds <= 0:
            parsed.duration_seconds = 60
        
        return parsed
