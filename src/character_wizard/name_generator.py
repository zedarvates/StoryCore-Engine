"""
AI-Powered Character Name Generation System

This module implements intelligent name generation using linguistic patterns,
cultural contexts, genre conventions, and personality-based naming strategies.
"""

import random
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum


class NameStyle(Enum):
    """Name generation styles"""
    TRADITIONAL = "traditional"
    MODERN = "modern"
    FANTASY = "fantasy"
    SCIFI = "scifi"
    MYTHOLOGICAL = "mythological"
    DESCRIPTIVE = "descriptive"


@dataclass
class NameComponents:
    """Components for constructing names"""
    prefixes: List[str]
    roots: List[str]
    suffixes: List[str]
    modifiers: List[str]


class CharacterNameGenerator:
    """
    AI-powered character name generation system
    
    Generates contextually appropriate names using:
    - Linguistic pattern analysis
    - Cultural naming conventions
    - Genre-specific styles
    - Personality-based selection
    - Phonetic harmony algorithms
    """
    
    def __init__(self):
        """Initialize the name generator with linguistic databases"""
        self.name_patterns = self._load_name_patterns()
        self.cultural_databases = self._load_cultural_databases()
        self.genre_styles = self._load_genre_styles()
        self.phonetic_rules = self._load_phonetic_rules()
        self.meaning_database = self._load_meaning_database()
    
    def generate_name(self, 
                     culture: str = "western",
                     genre: str = "modern",
                     archetype_role: str = "hero",
                     personality_traits: Optional[List[str]] = None,
                     style_preference: Optional[NameStyle] = None) -> str:
        """
        Generate a contextually appropriate character name
        
        Algorithm:
        1. Determine name style based on genre and culture
        2. Select appropriate linguistic patterns
        3. Generate name candidates using pattern matching
        4. Filter by phonetic harmony and cultural appropriateness
        5. Select best match based on personality traits
        6. Apply final polish and validation
        
        Args:
            culture: Cultural context (western, eastern, fantasy, etc.)
            genre: Story genre (fantasy, sci-fi, modern, etc.)
            archetype_role: Character archetype (hero, villain, mentor, etc.)
            personality_traits: List of personality traits to influence name
            style_preference: Preferred name style override
            
        Returns:
            Generated character name
        """
        # Step 1: Determine name style
        style = style_preference or self._determine_name_style(genre, culture)
        
        # Step 2: Get appropriate name components
        components = self._get_name_components(culture, genre, style)
        
        # Step 3: Generate candidate names
        candidates = self._generate_candidates(
            components, 
            archetype_role, 
            personality_traits,
            style,
            count=10
        )
        
        # Step 4: Filter and rank candidates
        filtered = self._filter_candidates(candidates, culture, genre)
        ranked = self._rank_candidates(filtered, archetype_role, personality_traits)
        
        # Step 5: Select best name
        if ranked:
            return ranked[0]
        
        # Fallback to simple generation
        return self._generate_simple_name(culture, genre)
    
    def generate_full_name(self,
                          culture: str = "western",
                          genre: str = "modern",
                          archetype_role: str = "hero",
                          personality_traits: Optional[List[str]] = None,
                          include_title: bool = False) -> str:
        """
        Generate a full character name (first + last, optionally with title)
        
        Args:
            culture: Cultural context
            genre: Story genre
            archetype_role: Character archetype
            personality_traits: Personality traits
            include_title: Whether to include a title/honorific
            
        Returns:
            Full character name
        """
        first_name = self.generate_name(culture, genre, archetype_role, personality_traits)
        last_name = self._generate_surname(culture, genre, first_name)
        
        if include_title:
            title = self._generate_title(archetype_role, genre, culture)
            return f"{title} {first_name} {last_name}"
        
        return f"{first_name} {last_name}"
    
    def _determine_name_style(self, genre: str, culture: str) -> NameStyle:
        """Determine appropriate name style based on genre and culture"""
        genre_style_map = {
            "fantasy": NameStyle.FANTASY,
            "sci-fi": NameStyle.SCIFI,
            "science-fiction": NameStyle.SCIFI,
            "modern": NameStyle.MODERN,
            "contemporary": NameStyle.MODERN,
            "historical": NameStyle.TRADITIONAL,
            "mythology": NameStyle.MYTHOLOGICAL,
            "horror": NameStyle.DESCRIPTIVE
        }
        
        return genre_style_map.get(genre.lower(), NameStyle.MODERN)
    
    def _get_name_components(self, culture: str, genre: str, style: NameStyle) -> NameComponents:
        """Get name components for generation"""
        # Get base components from culture
        culture_key = culture.lower()
        if culture_key not in self.cultural_databases:
            culture_key = "western"
        
        base_components = self.cultural_databases[culture_key]
        
        # Get style-specific modifications
        style_key = style.value
        if style_key in self.genre_styles:
            style_components = self.genre_styles[style_key]
            # Merge components
            return NameComponents(
                prefixes=base_components["prefixes"] + style_components.get("prefixes", []),
                roots=base_components["roots"] + style_components.get("roots", []),
                suffixes=base_components["suffixes"] + style_components.get("suffixes", []),
                modifiers=base_components.get("modifiers", []) + style_components.get("modifiers", [])
            )
        
        return NameComponents(
            prefixes=base_components["prefixes"],
            roots=base_components["roots"],
            suffixes=base_components["suffixes"],
            modifiers=base_components.get("modifiers", [])
        )
    
    def _generate_candidates(self,
                            components: NameComponents,
                            archetype_role: str,
                            personality_traits: Optional[List[str]],
                            style: NameStyle,
                            count: int = 10) -> List[str]:
        """Generate candidate names using linguistic patterns"""
        candidates = []
        
        # Strategy 1: Prefix + Root + Suffix combinations
        for _ in range(count // 3):
            name = self._construct_name_from_components(components, style)
            if name:
                candidates.append(name)
        
        # Strategy 2: Meaning-based generation
        if personality_traits:
            for _ in range(count // 3):
                name = self._generate_meaningful_name(personality_traits, archetype_role, components)
                if name:
                    candidates.append(name)
        
        # Strategy 3: Phonetic pattern matching
        for _ in range(count // 3):
            name = self._generate_phonetic_name(archetype_role, components, style)
            if name:
                candidates.append(name)
        
        return candidates
    
    def _construct_name_from_components(self, components: NameComponents, style: NameStyle) -> str:
        """Construct name from linguistic components"""
        # Different construction strategies based on style
        if style == NameStyle.FANTASY:
            # Fantasy names often use prefix + root or root + suffix
            if random.random() < 0.5:
                prefix = random.choice(components.prefixes) if components.prefixes else ""
                root = random.choice(components.roots)
                name = prefix + root
            else:
                root = random.choice(components.roots)
                suffix = random.choice(components.suffixes) if components.suffixes else ""
                name = root + suffix
        
        elif style == NameStyle.SCIFI:
            # Sci-fi names often use unusual combinations or shortened forms
            root = random.choice(components.roots)
            if random.random() < 0.3:
                # Add numbers or special characters
                name = root + str(random.randint(1, 999))
            elif random.random() < 0.5:
                # Shortened form
                name = root[:random.randint(3, 5)]
            else:
                suffix = random.choice(components.suffixes) if components.suffixes else ""
                name = root + suffix
        
        else:
            # Traditional/Modern names use full components
            if random.random() < 0.3 and components.prefixes:
                prefix = random.choice(components.prefixes)
                root = random.choice(components.roots)
                name = prefix + root
            else:
                root = random.choice(components.roots)
                if random.random() < 0.5 and components.suffixes:
                    suffix = random.choice(components.suffixes)
                    name = root + suffix
                else:
                    name = root
        
        # Capitalize appropriately
        return self._capitalize_name(name, style)
    
    def _generate_meaningful_name(self,
                                 personality_traits: List[str],
                                 archetype_role: str,
                                 components: NameComponents) -> str:
        """Generate name based on personality meaning"""
        # Map traits to name meanings
        trait_meanings = {
            "brave": ["valor", "courage", "bold", "strong"],
            "wise": ["sage", "lore", "wise", "bright"],
            "kind": ["grace", "gentle", "kind", "fair"],
            "cunning": ["clever", "swift", "sharp", "keen"],
            "loyal": ["true", "faith", "loyal", "steadfast"],
            "mysterious": ["shadow", "dark", "night", "hidden"],
            "charismatic": ["bright", "star", "radiant", "charm"]
        }
        
        # Find relevant meanings
        meanings = []
        for trait in personality_traits:
            trait_lower = trait.lower()
            if trait_lower in trait_meanings:
                meanings.extend(trait_meanings[trait_lower])
        
        if not meanings:
            # Use archetype-based meanings
            archetype_meanings = {
                "hero": ["valor", "bright", "strong", "true"],
                "villain": ["dark", "shadow", "power", "night"],
                "mentor": ["wise", "sage", "elder", "guide"],
                "ally": ["friend", "true", "loyal", "steadfast"],
                "trickster": ["clever", "swift", "shadow", "wit"]
            }
            meanings = archetype_meanings.get(archetype_role, ["noble", "fair"])
        
        # Find name components that match meanings
        meaning = random.choice(meanings)
        
        # Look for matching roots in meaning database
        if meaning in self.meaning_database:
            roots = self.meaning_database[meaning]
            root = random.choice(roots)
        else:
            root = random.choice(components.roots)
        
        # Add suffix if appropriate
        if random.random() < 0.5 and components.suffixes:
            suffix = random.choice(components.suffixes)
            name = root + suffix
        else:
            name = root
        
        return self._capitalize_name(name, NameStyle.FANTASY)
    
    def _generate_phonetic_name(self,
                               archetype_role: str,
                               components: NameComponents,
                               style: NameStyle) -> str:
        """Generate name using phonetic patterns"""
        # Get phonetic pattern for archetype
        patterns = self.phonetic_rules.get(archetype_role, self.phonetic_rules["default"])
        pattern = random.choice(patterns)
        
        # Generate name following pattern
        # Pattern format: C=consonant, V=vowel, S=soft sound, H=hard sound
        name = ""
        for char in pattern:
            if char == 'C':
                name += random.choice(['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'z'])
            elif char == 'V':
                name += random.choice(['a', 'e', 'i', 'o', 'u', 'y'])
            elif char == 'S':
                name += random.choice(['l', 'r', 'n', 'm', 'w', 'y'])
            elif char == 'H':
                name += random.choice(['k', 't', 'p', 'g', 'd', 'b'])
        
        return self._capitalize_name(name, style)
    
    def _filter_candidates(self, candidates: List[str], culture: str, genre: str) -> List[str]:
        """Filter candidates for appropriateness and quality"""
        filtered = []
        
        for name in candidates:
            # Check minimum length
            if len(name) < 2:
                continue
            
            # Check maximum length
            if len(name) > 15:
                continue
            
            # Check for pronounceability (basic heuristic)
            if not self._is_pronounceable(name):
                continue
            
            # Check for offensive or inappropriate combinations
            if self._contains_inappropriate_content(name):
                continue
            
            filtered.append(name)
        
        return filtered
    
    def _rank_candidates(self,
                        candidates: List[str],
                        archetype_role: str,
                        personality_traits: Optional[List[str]]) -> List[str]:
        """Rank candidates by quality and appropriateness"""
        scored_candidates = []
        
        for name in candidates:
            score = 0.0
            
            # Score based on length (prefer 4-8 characters)
            length = len(name)
            if 4 <= length <= 8:
                score += 2.0
            elif 3 <= length <= 10:
                score += 1.0
            
            # Score based on phonetic quality
            score += self._calculate_phonetic_score(name)
            
            # Score based on archetype fit
            score += self._calculate_archetype_fit(name, archetype_role)
            
            # Score based on uniqueness
            score += self._calculate_uniqueness_score(name)
            
            scored_candidates.append((score, name))
        
        # Sort by score (descending)
        scored_candidates.sort(reverse=True, key=lambda x: x[0])
        
        return [name for score, name in scored_candidates]
    
    def _calculate_phonetic_score(self, name: str) -> float:
        """Calculate phonetic quality score"""
        score = 0.0
        
        # Check vowel-consonant balance
        vowels = sum(1 for c in name.lower() if c in 'aeiouy')
        consonants = len(name) - vowels
        
        if vowels > 0 and consonants > 0:
            ratio = min(vowels, consonants) / max(vowels, consonants)
            score += ratio * 2.0
        
        # Penalize repeated characters
        for i in range(len(name) - 1):
            if name[i] == name[i + 1]:
                score -= 0.5
        
        # Reward alternating vowel-consonant patterns
        alternations = 0
        for i in range(len(name) - 1):
            is_vowel_1 = name[i].lower() in 'aeiouy'
            is_vowel_2 = name[i + 1].lower() in 'aeiouy'
            if is_vowel_1 != is_vowel_2:
                alternations += 1
        
        score += (alternations / len(name)) * 2.0
        
        return score
    
    def _calculate_archetype_fit(self, name: str, archetype_role: str) -> float:
        """Calculate how well name fits archetype"""
        score = 0.0
        name_lower = name.lower()
        
        # Archetype-specific patterns
        archetype_patterns = {
            "hero": {
                "strong_sounds": ['k', 't', 'r', 'd'],
                "preferred_endings": ['n', 'r', 's', 'x'],
                "length_range": (4, 8)
            },
            "villain": {
                "strong_sounds": ['x', 'z', 'v', 'k'],
                "preferred_endings": ['x', 'z', 's', 'n'],
                "length_range": (5, 10)
            },
            "mentor": {
                "strong_sounds": ['m', 'n', 'l', 'r'],
                "preferred_endings": ['n', 's', 'r', 'l'],
                "length_range": (5, 9)
            }
        }
        
        if archetype_role in archetype_patterns:
            pattern = archetype_patterns[archetype_role]
            
            # Check for strong sounds
            for sound in pattern["strong_sounds"]:
                if sound in name_lower:
                    score += 0.5
            
            # Check ending
            if name_lower[-1] in pattern["preferred_endings"]:
                score += 1.0
            
            # Check length range
            min_len, max_len = pattern["length_range"]
            if min_len <= len(name) <= max_len:
                score += 1.0
        
        return score
    
    def _calculate_uniqueness_score(self, name: str) -> float:
        """Calculate name uniqueness score"""
        # Simple heuristic: less common letter combinations score higher
        score = 0.0
        
        # Check for uncommon letter combinations
        uncommon_pairs = ['qu', 'x', 'z', 'ph', 'th', 'ae', 'oe']
        for pair in uncommon_pairs:
            if pair in name.lower():
                score += 0.5
        
        return min(score, 2.0)  # Cap at 2.0
    
    def _is_pronounceable(self, name: str) -> bool:
        """Check if name is pronounceable (basic heuristic)"""
        name_lower = name.lower()
        
        # Check for too many consecutive consonants
        consonant_count = 0
        for char in name_lower:
            if char not in 'aeiouy':
                consonant_count += 1
                if consonant_count > 3:
                    return False
            else:
                consonant_count = 0
        
        # Check for at least one vowel
        if not any(c in 'aeiouy' for c in name_lower):
            return False
        
        return True
    
    def _contains_inappropriate_content(self, name: str) -> bool:
        """Check for inappropriate content (basic filter)"""
        # This is a placeholder - in production, use a comprehensive filter
        inappropriate_patterns = ['xxx', 'ass', 'damn', 'hell']
        name_lower = name.lower()
        
        return any(pattern in name_lower for pattern in inappropriate_patterns)
    
    def _capitalize_name(self, name: str, style: NameStyle) -> str:
        """Capitalize name appropriately for style"""
        if not name:
            return name
        
        if style == NameStyle.SCIFI:
            # Sci-fi names might use all caps or mixed case
            if random.random() < 0.2:
                return name.upper()
            elif random.random() < 0.3:
                # Mixed case (camelCase style)
                mid = len(name) // 2
                return name[:mid].capitalize() + name[mid:].capitalize()
        
        # Default: capitalize first letter
        return name[0].upper() + name[1:].lower()
    
    def _generate_surname(self, culture: str, genre: str, first_name: str) -> str:
        """Generate appropriate surname"""
        culture_key = culture.lower()
        if culture_key not in self.cultural_databases:
            culture_key = "western"
        
        surname_patterns = {
            "western": ["son", "sen", "ton", "ford", "wood", "stone", "field"],
            "fantasy": ["wind", "blade", "heart", "shadow", "light", "storm", "fire"],
            "sci-fi": ["prime", "nova", "zero", "alpha", "omega", "nexus"],
            "eastern": ["yama", "kawa", "moto", "hara", "saki", "zaki"]
        }
        
        # Get appropriate pattern
        if genre.lower() in surname_patterns:
            patterns = surname_patterns[genre.lower()]
        elif culture_key in surname_patterns:
            patterns = surname_patterns[culture_key]
        else:
            patterns = surname_patterns["western"]
        
        # Generate surname
        if genre.lower() == "fantasy":
            # Fantasy surnames often descriptive
            prefix = random.choice(["Iron", "Silver", "Gold", "Dark", "Bright", "Swift", "Strong"])
            suffix = random.choice(patterns)
            return prefix + suffix.capitalize()
        elif genre.lower() == "sci-fi":
            # Sci-fi surnames might be codes or technical
            if random.random() < 0.3:
                return f"{random.choice(patterns).upper()}-{random.randint(100, 999)}"
            else:
                return random.choice(patterns).capitalize()
        else:
            # Traditional surnames
            base = first_name[:3] if len(first_name) >= 3 else first_name
            suffix = random.choice(patterns)
            return (base + suffix).capitalize()
    
    def _generate_title(self, archetype_role: str, genre: str, culture: str) -> str:
        """Generate appropriate title/honorific"""
        titles_by_role = {
            "hero": ["Sir", "Lady", "Captain", "Commander", "Champion"],
            "villain": ["Lord", "Lady", "Master", "Doctor", "Baron"],
            "mentor": ["Master", "Elder", "Professor", "Sage", "Archon"],
            "ally": ["Lieutenant", "Sergeant", "Agent", "Officer"],
            "trickster": ["The", "Mysterious", "Infamous"]
        }
        
        if archetype_role in titles_by_role:
            return random.choice(titles_by_role[archetype_role])
        
        return ""
    
    def _generate_simple_name(self, culture: str, genre: str) -> str:
        """Generate simple fallback name"""
        simple_names = {
            "western": ["Alex", "Jordan", "Sam", "Riley", "Morgan", "Taylor"],
            "fantasy": ["Aelric", "Theron", "Lyra", "Kael", "Aria", "Daven"],
            "sci-fi": ["Nova", "Zara", "Kai", "Orion", "Phoenix", "Atlas"],
            "eastern": ["Akira", "Yuki", "Hiro", "Sakura", "Kenji", "Mei"]
        }
        
        culture_key = culture.lower()
        if culture_key not in simple_names:
            culture_key = "western"
        
        return random.choice(simple_names[culture_key])
    
    def _load_name_patterns(self) -> Dict:
        """Load linguistic name patterns"""
        return {
            "consonant_clusters": ["br", "cr", "dr", "fr", "gr", "pr", "tr", "bl", "cl", "fl", "gl", "pl", "sl"],
            "vowel_combinations": ["ae", "ai", "au", "ea", "ei", "eu", "ia", "ie", "io", "oa", "oi", "ou", "ua", "ue", "ui"],
            "common_endings": ["a", "e", "i", "o", "n", "r", "s", "t", "x", "z"]
        }
    
    def _load_cultural_databases(self) -> Dict:
        """Load cultural naming databases"""
        return {
            "western": {
                "prefixes": ["Al", "El", "Ar", "Er", "Or"],
                "roots": ["ex", "and", "ric", "bert", "fred", "will", "john", "mar", "ann", "kat"],
                "suffixes": ["er", "son", "ton", "ley", "ford", "wood"],
                "modifiers": ["the Great", "the Wise", "the Bold"]
            },
            "fantasy": {
                "prefixes": ["Ael", "Thal", "Gal", "Mor", "Sar", "Kel", "Dra", "Zar"],
                "roots": ["ador", "arin", "elen", "idor", "orin", "wyn", "riel", "thir"],
                "suffixes": ["ion", "iel", "wen", "dor", "mir", "ath", "eth", "oth"],
                "modifiers": ["of the North", "the Eternal", "Shadowblade"]
            },
            "sci-fi": {
                "prefixes": ["Zar", "Kex", "Vex", "Nex", "Pax", "Lux"],
                "roots": ["on", "ax", "ex", "ix", "ox", "ux", "prime", "nova"],
                "suffixes": ["us", "is", "os", "as", "prime", "zero", "one"],
                "modifiers": ["Prime", "Alpha", "Omega", "Neo"]
            },
            "eastern": {
                "prefixes": ["Hi", "Ka", "Ma", "Sa", "Ta", "Ya"],
                "roots": ["ro", "ki", "mi", "ri", "shi", "chi", "ko", "to"],
                "suffixes": ["ko", "ka", "mi", "ri", "na", "ta", "ya"],
                "modifiers": ["san", "sama", "sensei"]
            }
        }
    
    def _load_genre_styles(self) -> Dict:
        """Load genre-specific style modifications"""
        return {
            "fantasy": {
                "prefixes": ["Aer", "Dra", "Eld", "Fae", "Gal", "Mor", "Syl", "Thal"],
                "roots": ["ador", "arin", "elen", "idor", "orin", "riel", "wyn"],
                "suffixes": ["ael", "iel", "ion", "wen", "dor", "mir", "ath"]
            },
            "scifi": {
                "prefixes": ["Cy", "Neo", "Xen", "Zar", "Kex", "Vex"],
                "roots": ["ax", "ex", "ix", "on", "prime", "nova", "zero"],
                "suffixes": ["us", "is", "os", "prime", "alpha", "omega"]
            },
            "modern": {
                "prefixes": ["Al", "El", "Ch", "Sh"],
                "roots": ["ex", "and", "ris", "ton", "son"],
                "suffixes": ["er", "son", "ton", "ley"]
            }
        }
    
    def _load_phonetic_rules(self) -> Dict:
        """Load phonetic pattern rules"""
        return {
            "hero": ["CVCVC", "CVCCV", "CVCV", "CVVC"],
            "villain": ["CVCCVC", "CVCVCC", "CCVCVC", "CVCCV"],
            "mentor": ["CVCVCV", "CVSCV", "CVSVC", "CVSCVC"],
            "ally": ["CVCV", "CVVC", "CVCVC", "CVCCV"],
            "trickster": ["CVHV", "CHVC", "CVHVC", "CHVHV"],
            "default": ["CVCV", "CVCVC", "CVCCV", "CVVC"]
        }
    
    def _load_meaning_database(self) -> Dict[str, List[str]]:
        """Load name meaning database"""
        return {
            "valor": ["Val", "Bran", "Ard", "Fort"],
            "courage": ["Leon", "And", "Ric", "Bold"],
            "wise": ["Soph", "Sage", "Wis", "Lore"],
            "bright": ["Luc", "Clar", "Bri", "Shin"],
            "dark": ["Mor", "Nox", "Shad", "Nyx"],
            "strong": ["Fort", "Val", "Ard", "Stark"],
            "gentle": ["Clem", "Mild", "Soft", "Calm"],
            "swift": ["Vel", "Celer", "Quick", "Fleet"],
            "true": ["Ver", "Fid", "Loy", "Faith"],
            "noble": ["Nob", "Reg", "Roy", "Maj"]
        }
