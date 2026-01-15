"""
World Generation Engine for StoryCore-Engine
Automatically generates coherent worlds with geography, culture, technology, and visual identity.
"""

import json
import random
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import hashlib


class WorldGenerationEngine:
    """Engine for automatic world generation with visual identity and consistency."""

    def __init__(self):
        # World type templates
        self.world_types = {
            "fantasy": {
                "technology_levels": ["primitive", "medieval-fantasy", "high-fantasy"],
                "architectural_styles": ["stone castles", "wooden longhouses", "crystal spires", "tree cities"],
                "atmospheres": ["mysterious", "magical", "ancient", "harmonious"],
                "color_palettes": {
                    "forest": ["#2D5016", "#4A7C59", "#8B7355", "#D4C5A9", "#FFD700"],
                    "mountain": ["#696969", "#8B8680", "#DCDCDC", "#F5F5F5", "#00CED1"],
                    "desert": ["#DEB887", "#D2691E", "#CD853F", "#F4A460", "#FF6347"]
                }
            },
            "sci-fi": {
                "technology_levels": ["cyberpunk", "space-opera", "post-apocalyptic", "high-tech"],
                "architectural_styles": ["neon megastructures", "orbital habitats", "underground bunkers", "floating cities"],
                "atmospheres": ["futuristic", "dystopian", "hopeful", "clinical"],
                "color_palettes": {
                    "cyberpunk": ["#FF1493", "#00FFFF", "#FF4500", "#32CD32", "#FFD700"],
                    "space": ["#191970", "#4169E1", "#00CED1", "#C0C0C0", "#F5F5F5"],
                    "wasteland": ["#8B4513", "#696969", "#DCDCDC", "#FF6347", "#FFFF00"]
                }
            },
            "historical": {
                "technology_levels": ["ancient", "medieval", "industrial", "modern"],
                "architectural_styles": ["stone temples", "wooden fortresses", "steampunk factories", "colonial buildings"],
                "atmospheres": ["authentic", "gritty", "romanticized", "documentary"],
                "color_palettes": {
                    "ancient": ["#DEB887", "#8B7355", "#D2691E", "#CD853F", "#FFD700"],
                    "medieval": ["#696969", "#8B8680", "#DCDCDC", "#228B22", "#FF6347"],
                    "industrial": ["#2F4F4F", "#696969", "#C0C0C0", "#FF4500", "#FFFF00"]
                }
            },
            "modern": {
                "technology_levels": ["contemporary", "near-future", "dystopian-modern"],
                "architectural_styles": ["urban skyscrapers", "suburban homes", "industrial complexes", "eco-cities"],
                "atmospheres": ["contemporary", "urban", "suburban", "corporate"],
                "color_palettes": {
                    "urban": ["#696969", "#C0C0C0", "#4169E1", "#FF4500", "#32CD32"],
                    "suburban": ["#228B22", "#32CD32", "#87CEEB", "#FFFFFF", "#FFE4B5"],
                    "corporate": ["#000080", "#C0C0C0", "#FFD700", "#FF4500", "#228B22"]
                }
            }
        }

        # Geographic templates
        self.geography_templates = {
            "regional": {
                "scales": ["village", "town", "city", "region"],
                "terrains": ["forests", "mountains", "plains", "coastal", "desert"],
                "locations": ["market square", "tavern", "castle", "temple", "forest clearing"]
            },
            "continental": {
                "scales": ["province", "kingdom", "continent"],
                "terrains": ["diverse landscapes", "mountain ranges", "rivers", "forests"],
                "locations": ["capital city", "border fortress", "trading hub", "ancient ruins"]
            },
            "planetary": {
                "scales": ["planet", "planetary system"],
                "terrains": ["oceans", "continents", "deserts", "ice caps"],
                "locations": ["megacity", "orbital station", "underground facility", "wilderness preserve"]
            }
        }

    def generate_world(self, project_seed: int, genre: str = "fantasy",
                       world_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate a complete world with geography, culture, and visual identity.

        Args:
            project_seed: Deterministic seed for reproducible generation
            genre: Primary genre (fantasy, sci-fi, historical, modern)
            world_type: Specific world type override (optional)

        Returns:
            Complete world data structure
        """
        # Set deterministic seed
        random.seed(project_seed)

        # Select world type
        if not world_type:
            world_type = self._select_world_type(genre)

        # Generate world components
        world_id = f"world_{world_type}_{project_seed % 1000:03d}"
        world_name = self._generate_world_name(world_type, project_seed)

        geography = self._generate_geography(world_type, project_seed)
        culture = self._generate_culture(world_type, geography, project_seed)
        atmosphere = self._generate_atmosphere(world_type, culture, project_seed)
        visual_identity = self._generate_visual_identity(world_type, geography, project_seed)

        world_data = {
            "world_id": world_id,
            "name": world_name,
            "type": world_type,
            "genre": genre,
            "geography": geography,
            "culture": culture,
            "atmosphere": atmosphere,
            "visual_identity": visual_identity,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "project_seed": project_seed,
            "schema_version": "1.0"
        }

        return world_data

    def _select_world_type(self, genre: str) -> str:
        """Select appropriate world type based on genre."""
        type_options = list(self.world_types.keys())

        # Genre-specific preferences
        if genre.lower() == "fantasy":
            weights = [0.7, 0.2, 0.05, 0.05]  # Favor fantasy
        elif genre.lower() == "sci-fi" or genre.lower() == "science fiction":
            weights = [0.1, 0.7, 0.05, 0.15]  # Favor sci-fi
        elif genre.lower() == "historical":
            weights = [0.1, 0.1, 0.7, 0.1]  # Favor historical
        else:  # modern/contemporary
            weights = [0.1, 0.1, 0.1, 0.7]  # Favor modern

        return random.choices(type_options, weights=weights, k=1)[0]

    def _generate_world_name(self, world_type: str, seed: int) -> str:
        """Generate a fitting world name."""
        name_components = {
            "fantasy": {
                "prefixes": ["Eld", "Myth", "Arc", "Drak", "Sylv", "Thund", "Frost", "Shadow"],
                "suffixes": ["oria", "haven", "realm", "spire", "wood", "forge", "reach", "vale"],
                "full_names": ["Aetherealm", "Dragonspire", "Elmsworth", "Frosthaven"]
            },
            "sci-fi": {
                "prefixes": ["Neo", "Cyber", "Quantum", "Stellar", "Void", "Nova", "Astro", "Techno"],
                "suffixes": [" Prime", " Station", " Colony", " Nexus", " Outpost", " Core", " Matrix"],
                "full_names": ["New Eden", "Cybertron", "Stellar Forge", "Void Station"]
            },
            "historical": {
                "prefixes": ["Ancient", "Imperial", "Royal", "Golden", "Iron", "Stone", "Warriors"],
                "suffixes": [" Empire", " Kingdom", " Lands", " Realms", " Dominion", " Territories"],
                "full_names": ["Ancient Rome", "Imperial China", "Golden Age", "Iron Islands"]
            },
            "modern": {
                "prefixes": ["Metro", "Urban", "Global", "Pacific", "Atlantic", "Continental"],
                "suffixes": [" City", " District", " Zone", " Hub", " Center", " Complex"],
                "full_names": ["Metropolis", "Global City", "Urban Sprawl", "Pacific Rim"]
            }
        }

        components = name_components.get(world_type, name_components["fantasy"])

        # Randomly choose naming style
        name_style = random.choice(["compound", "full"])

        if name_style == "compound":
            prefix = random.choice(components["prefixes"])
            suffix = random.choice(components["suffixes"])
            return prefix + suffix
        else:
            return random.choice(components["full_names"])

    def _generate_geography(self, world_type: str, seed: int) -> Dict[str, Any]:
        """Generate geographical features."""
        # Select scale
        scale_options = ["regional", "continental", "planetary"]
        scale = random.choice(scale_options)

        template = self.geography_templates[scale]

        # Generate locations based on scale
        num_locations = {"regional": 3, "continental": 5, "planetary": 7}[scale]
        locations = random.sample(template["locations"], min(num_locations, len(template["locations"])))

        # Generate terrain features
        num_terrains = random.randint(2, 4)
        terrains = random.sample(template["terrains"], num_terrains)

        # Climate based on world type
        climates = {
            "fantasy": ["temperate", "lush", "mystical", "harsh"],
            "sci-fi": ["artificial", "extreme", "controlled", "hostile"],
            "historical": ["mediterranean", "continental", "tropical", "arid"],
            "modern": ["urban", "suburban", "coastal", "mountain"]
        }

        climate = random.choice(climates.get(world_type, climates["fantasy"]))

        return {
            "scale": scale,
            "locations": locations,
            "terrain": terrains,
            "climate": climate,
            "key_features": self._generate_key_features(world_type, terrains, seed)
        }

    def _generate_key_features(self, world_type: str, terrains: List[str], seed: int) -> List[str]:
        """Generate notable geographical features."""
        features_by_type = {
            "fantasy": [
                "Crystal-clear mountain lakes", "Ancient stone circles", "Enchanted forests",
                "Floating islands", "Volcanic craters", "Sacred groves", "Mystical ruins"
            ],
            "sci-fi": [
                "Orbital elevators", "Underground megacities", "Artificial oceans",
                "Zero-gravity zones", "Nanite swarms", "Energy storms", "Quantum rifts"
            ],
            "historical": [
                "Ancient trade routes", "Fortified citadels", "Sacred temples",
                "Agricultural terraces", "Naval harbors", "Mountain passes", "River valleys"
            ],
            "modern": [
                "Skyscraper districts", "Subway networks", "Industrial parks",
                "Shopping malls", "Highway systems", "Airport hubs", "Tech campuses"
            ]
        }

        features = features_by_type.get(world_type, features_by_type["fantasy"])
        num_features = random.randint(2, 4)

        # Filter features that match terrain
        relevant_features = []
        for feature in features:
            if any(terrain.lower() in feature.lower() for terrain in terrains):
                relevant_features.append(feature)

        if len(relevant_features) < num_features:
            relevant_features = features

        return random.sample(relevant_features, min(num_features, len(relevant_features)))

    def _generate_culture(self, world_type: str, geography: Dict[str, Any], seed: int) -> Dict[str, Any]:
        """Generate cultural elements."""
        # Technology level
        tech_levels = self.world_types[world_type]["technology_levels"]
        technology_level = random.choice(tech_levels)

        # Societies based on geography
        num_societies = random.randint(1, 3)
        society_types = {
            "fantasy": ["Woodland Elves", "Mountain Dwarves", "Desert Nomads", "City Humans", "Underground Gnomes"],
            "sci-fi": ["Corporate Citizens", "Rebel Hackers", "Station Crews", "Colony Settlers", "AI Collectives"],
            "historical": ["Tribal Warriors", "Merchant Guilds", "Religious Orders", "Noble Houses", "Peasant Farmers"],
            "modern": ["Urban Professionals", "Suburban Families", "Tech Entrepreneurs", "Service Workers", "Artists"]
        }

        societies = random.sample(society_types.get(world_type, society_types["fantasy"]),
                                min(num_societies, len(society_types[world_type])))

        # Customs and traditions
        customs = self._generate_customs(world_type, technology_level, societies)

        # Social structure
        social_structures = ["tribal", "feudal", "meritocratic", "corporate", "egalitarian"]
        social_structure = random.choice(social_structures)

        return {
            "societies": societies,
            "customs": customs,
            "technology_level": technology_level,
            "social_structure": social_structure,
            "values": self._generate_values(world_type, social_structure)
        }

    def _generate_customs(self, world_type: str, tech_level: str, societies: List[str]) -> List[str]:
        """Generate cultural customs and traditions."""
        customs_by_type = {
            "fantasy": [
                "Nature communion rituals", "Craftsmanship apprenticeships", "Storytelling gatherings",
                "Seasonal festivals", "Honor duels", "Ancient rune readings"
            ],
            "sci-fi": [
                "Neural link ceremonies", "Data sharing protocols", "Genetic modification rites",
                "Virtual reality gatherings", "AI consultation rituals", "Spacewalk initiations"
            ],
            "historical": [
                "Harvest festivals", "Knightly tournaments", "Religious pilgrimages",
                "Craft guild ceremonies", "Coming-of-age rituals", "Trade caravan customs"
            ],
            "modern": [
                "Social media rituals", "Coffee shop meetups", "Networking events",
                "Music festival traditions", "Fitness challenges", "Volunteer work customs"
            ]
        }

        customs = customs_by_type.get(world_type, customs_by_type["fantasy"])
        num_customs = random.randint(2, 4)

        return random.sample(customs, min(num_customs, len(customs)))

    def _generate_values(self, world_type: str, social_structure: str) -> List[str]:
        """Generate cultural values."""
        values_by_structure = {
            "tribal": ["Community harmony", "Nature respect", "Oral traditions", "Group survival"],
            "feudal": ["Honor and loyalty", "Social hierarchy", "Martial prowess", "Noble obligations"],
            "meritocratic": ["Achievement", "Innovation", "Education", "Competition"],
            "corporate": ["Efficiency", "Profit", "Brand loyalty", "Professional success"],
            "egalitarian": ["Equality", "Fairness", "Social justice", "Personal freedom"]
        }

        values = values_by_structure.get(social_structure, ["Balance", "Harmony", "Growth"])
        return random.sample(values, min(3, len(values)))

    def _generate_atmosphere(self, world_type: str, culture: Dict[str, Any], seed: int) -> Dict[str, Any]:
        """Generate atmospheric and sensory elements."""
        atmospheres = self.world_types[world_type]["atmospheres"]
        mood = random.choice(atmospheres)

        # Time period based on culture
        time_periods = {
            "primitive": ["prehistoric", "ancient"],
            "medieval-fantasy": ["dark ages", "renaissance"],
            "high-fantasy": ["classical antiquity", "eternal medieval"],
            "cyberpunk": ["dystopian future", "corporate era"],
            "space-opera": ["galactic age", "stellar renaissance"],
            "post-apocalyptic": ["wasteland era", "rebuild age"],
            "ancient": ["classical period", "bronze age"],
            "medieval": ["middle ages", "feudal era"],
            "industrial": ["victorian age", "machine age"],
            "contemporary": ["modern era", "digital age"],
            "near-future": ["information age", "automation era"]
        }

        tech_level = culture["technology_level"]
        time_period_options = time_periods.get(tech_level, ["contemporary"])
        time_period = random.choice(time_period_options)

        # Sensory details
        sensory_details = self._generate_sensory_details(world_type, mood)

        return {
            "mood": mood,
            "time_period": time_period,
            "sensory_details": sensory_details,
            "emotional_tone": self._generate_emotional_tone(mood, culture)
        }

    def _generate_sensory_details(self, world_type: str, mood: str) -> List[str]:
        """Generate sensory details for atmosphere."""
        sensory_elements = {
            "fantasy": {
                "mysterious": ["whispering winds", "faint magic glow", "ancient stone scent", "distant owl hoots"],
                "magical": ["sparkling energy", "herbal aromas", "gentle chimes", "soft light glow"],
                "ancient": ["dusty air", "aged wood smell", "faint echoes", "cool stone touch"],
                "harmonious": ["fresh pine scent", "birdsongs", "gentle breezes", "warm sunlight"]
            },
            "sci-fi": {
                "futuristic": ["electronic hums", "cool air circulation", "LED glows", "metallic echoes"],
                "dystopian": ["industrial noise", "chemical scents", "neon flickers", "crowd murmurs"],
                "hopeful": ["clean air", "gentle beeps", "warm lighting", "optimistic chatter"],
                "clinical": ["sterile air", "soft whirring", "cold lighting", "efficient silence"]
            },
            "historical": {
                "authentic": ["wood smoke", "horse hooves", "crowd voices", "fresh bread aroma"],
                "gritty": ["dust and sweat", "animal odors", "rough voices", "damp earth"],
                "romanticized": ["gentle breezes", "sunlit fields", "peaceful silence", "natural sounds"],
                "documentary": ["realistic noises", "authentic smells", "period details", "ambient activity"]
            },
            "modern": {
                "contemporary": ["traffic sounds", "coffee aromas", "digital beeps", "crowded spaces"],
                "urban": ["city bustle", "car exhaust", "street food smells", "neon signs"],
                "suburban": ["lawn mower sounds", "fresh air", "neighbor voices", "car doors"],
                "corporate": ["elevator music", "carpeted halls", "printer sounds", "coffee machine bubbles"]
            }
        }

        elements = sensory_elements.get(world_type, sensory_elements["fantasy"])
        mood_elements = elements.get(mood, elements[list(elements.keys())[0]])

        return random.sample(mood_elements, min(4, len(mood_elements)))

    def _generate_emotional_tone(self, mood: str, culture: Dict[str, Any]) -> str:
        """Generate overall emotional tone."""
        tone_mapping = {
            "mysterious": "intriguing and cautious",
            "magical": "wonder and enchantment",
            "ancient": "reverence and timelessness",
            "harmonious": "peace and balance",
            "futuristic": "excitement and uncertainty",
            "dystopian": "tension and resilience",
            "hopeful": "optimism and progress",
            "clinical": "precision and detachment",
            "authentic": "genuine and lived-in",
            "gritty": "raw and authentic",
            "romanticized": "idealized and beautiful",
            "documentary": "realistic and observational",
            "contemporary": "current and familiar",
            "urban": "energetic and diverse",
            "suburban": "comfortable and routine",
            "corporate": "professional and structured"
        }

        return tone_mapping.get(mood, "balanced and engaging")

    def _generate_visual_identity(self, world_type: str, geography: Dict[str, Any], seed: int) -> Dict[str, Any]:
        """Generate visual identity with colors, architecture, and lighting."""
        # Color palette
        terrain_type = geography["terrain"][0] if geography["terrain"] else "neutral"
        color_palettes = self.world_types[world_type]["color_palettes"]

        # Match terrain to palette
        palette_key = self._match_terrain_to_palette(terrain_type)
        available_palettes = color_palettes.get(palette_key, list(color_palettes.values())[0])

        # Select palette based on terrain
        if isinstance(available_palettes[0], list):
            # Multiple palettes available, pick one
            selected_palette = random.choice(available_palettes)
        else:
            selected_palette = available_palettes

        # Architectural style
        architectural_styles = self.world_types[world_type]["architectural_styles"]
        architectural_style = random.choice(architectural_styles)

        # Lighting characteristics
        lighting_options = {
            "fantasy": ["soft-filtered", "golden-hour", "moonlit", "magical-glow"],
            "sci-fi": ["neon-drenched", "cold-fluorescent", "holographic", "industrial-harsh"],
            "historical": ["natural-candlelight", "sunlit-interior", "torch-lit", "fireplace-glow"],
            "modern": ["LED-clean", "fluorescent-office", "streetlight-urban", "soft-incandescent"]
        }

        lighting_characteristics = random.choice(lighting_options.get(world_type, lighting_options["fantasy"]))

        # Environmental mood
        mood_options = self.world_types[world_type]["atmospheres"]
        environmental_mood = random.choice(mood_options)

        return {
            "color_palette": {
                "primary": selected_palette[:2],
                "secondary": selected_palette[2:4],
                "accent": selected_palette[4:] if len(selected_palette) > 4 else [selected_palette[-1]]
            },
            "architectural_style": architectural_style,
            "lighting_characteristics": lighting_characteristics,
            "environmental_mood": environmental_mood,
            "visual_motifs": self._generate_visual_motifs(world_type, geography)
        }

    def _match_terrain_to_palette(self, terrain: str) -> str:
        """Match terrain type to appropriate color palette."""
        terrain_mapping = {
            "forests": "forest",
            "woodland": "forest",
            "jungle": "forest",
            "mountains": "mountain",
            "rocky": "mountain",
            "peaks": "mountain",
            "desert": "desert",
            "arid": "desert",
            "dunes": "desert",
            "coastal": "urban",  # Default fallback
            "plains": "suburban"  # Default fallback
        }

        # Find matching key
        for key, palette_type in terrain_mapping.items():
            if key in terrain.lower():
                return palette_type

        return "urban"  # Default

    def _generate_visual_motifs(self, world_type: str, geography: Dict[str, Any]) -> List[str]:
        """Generate visual motifs that characterize the world."""
        motifs_by_type = {
            "fantasy": [
                "Flowing robes and cloaks", "Intricate jewelry", "Ancient runes", "Natural integration",
                "Mystical glows", "Wooden carvings", "Stone masonry", "Herbal decorations"
            ],
            "sci-fi": [
                "Holographic displays", "Neural interfaces", "Energy weapons", "Robotic companions",
                "Flying vehicles", "Data streams", "Nanite construction", "Zero-gravity adaptation"
            ],
            "historical": [
                "Period armor and weapons", "Hand-crafted tools", "Textile patterns", "Ceremonial garb",
                "Architectural details", "Artisanal goods", "Transportation methods", "Cultural symbols"
            ],
            "modern": [
                "Digital devices", "Urban fashion", "Transportation systems", "Consumer products",
                "Digital interfaces", "Modern architecture", "Service industry", "Entertainment media"
            ]
        }

        motifs = motifs_by_type.get(world_type, motifs_by_type["fantasy"])
        num_motifs = random.randint(3, 6)

        return random.sample(motifs, min(num_motifs, len(motifs)))

    def save_world(self, world_data: Dict[str, Any], project_path: Path) -> Path:
        """Save world data to world.json file."""
        world_file = project_path / "world.json"

        with open(world_file, 'w', encoding='utf-8') as f:
            json.dump(world_data, f, indent=2, ensure_ascii=False)

        return world_file

    def load_world(self, project_path: Path) -> Optional[Dict[str, Any]]:
        """Load world data from world.json file."""
        world_file = project_path / "world.json"

        if not world_file.exists():
            return None

        with open(world_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    def validate_world_consistency(self, world_data: Dict[str, Any], prompts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate that generated prompts are consistent with world identity."""
        issues = []
        warnings = []

        visual_identity = world_data["visual_identity"]
        world_type = world_data["type"]

        for prompt_data in prompts:
            prompt_text = prompt_data.get("prompt", "").lower()

            # Check color consistency
            color_mentions = []
            for color in visual_identity["color_palette"]["primary"] + visual_identity["color_palette"]["secondary"]:
                if color.lower() in prompt_text:
                    color_mentions.append(color)

            if not color_mentions:
                warnings.append({
                    "type": "color_consistency",
                    "message": f"Prompt lacks world color palette references",
                    "world_colors": visual_identity["color_palette"]["primary"],
                    "prompt_id": prompt_data.get("id", "unknown")
                })

            # Check architectural consistency
            arch_style = visual_identity["architectural_style"].lower()
            if arch_style not in prompt_text and "architecture" in prompt_text:
                issues.append({
                    "type": "architectural_consistency",
                    "message": f"Architecture mentioned but doesn't match world style: {arch_style}",
                    "expected_style": arch_style,
                    "prompt_id": prompt_data.get("id", "unknown")
                })

            # Check atmospheric consistency
            atmosphere_elements = world_data["atmosphere"]["sensory_details"]
            atmosphere_matches = sum(1 for element in atmosphere_elements if element.lower() in prompt_text)

            if atmosphere_matches == 0:
                warnings.append({
                    "type": "atmospheric_consistency",
                    "message": "Prompt lacks atmospheric sensory details",
                    "world_atmosphere": atmosphere_elements,
                    "prompt_id": prompt_data.get("id", "unknown")
                })

        return {
            "is_consistent": len(issues) == 0,
            "issues": issues,
            "warnings": warnings,
            "consistency_score": max(0, 100 - (len(issues) * 20) - (len(warnings) * 5))
        }
