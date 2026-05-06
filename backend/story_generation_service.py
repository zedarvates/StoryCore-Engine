from enum import Enum
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
import logging
import json
from backend.story_alignment_scorer import get_story_scorer

logger = logging.getLogger(__name__)


class StoryGenre(Enum):
    ADVENTURE = "adventure"
    DRAMA = "drama"
    COMEDY = "comedy"
    HORROR = "horror"
    ROMANCE = "romance"
    SCIFI = "scifi"
    FANTASY = "fantasy"
    THRILLER = "thriller"
    DOCUMENTARY = "documentary"


class StoryStructure(Enum):
    THREE_ACT = "three_act"
    HERO_JOURNEY = "hero_journey"
    SAVE_THE_CAT = "save_the_cat"
    FIVE_POINT = "five_point"
    SEQUENCE = "sequence"


class ProductionMode(Enum):
    FICTION = "fiction"
    DOCUMENTARY = "documentary"
    INTERVIEW = "interview"
    MUSIC_VIDEO = "music_video"
    SOCIAL_MEDIA = "social_media"
    CINEMATIC = "cinematic"
    AUDIODRAMA = "audiodrama"
    RECAP = "recap"
    INFLUENCER = "influencer"
    MAKER = "maker"
    SCIENTIFIC_REVIEW = "scientific_review"
    HISTORICAL_REVIEW = "historical_review"
    TOP_TIER_LIST = "top_tier_list"
    FAITH_SPIRITUALITY = "faith_spirituality"
    GAME_REVIEW = "game_review"
    TECH_REVIEW = "tech_review"
    FINANCE_REVIEW = "finance_review"
    MASTERCLASS = "masterclass"
    REAL_ESTATE = "real_estate"
    PRODUCT_HYPE = "product_hype"
    LEGAL_RECON = "legal_recon"
    ASMR = "asmr"
    MEDITATION = "meditation"
    EXPERIMENTAL = "experimental"
    TRUE_CRIME = "true_crime"
    SPORTS_HIGHLIGHT = "sports_highlight"
    GARDENING = "gardening"
    RENOVATION = "renovation"


@dataclass
class StoryProp:
    id: str
    name: str
    description: str
    is_immutable: bool = False
    owner_id: Optional[str] = None
    interaction_type: str = ""


@dataclass
class StorySFX:
    id: str
    name: str
    category: str  # action, character, ambiance
    description: str
    associated_entity_id: Optional[str] = None  # Char, Prop, or Location ID


@dataclass
class StoryBeat:
    id: str
    name: str
    description: str
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    emotional_beat: str = ""
    narrative_function: str = ""
    characters_involved: List[str] = field(default_factory=list)
    scene_reference: Optional[str] = None


@dataclass
class StoryArc:
    id: str
    name: str
    genre: StoryGenre
    structure: StoryStructure
    beats: List[StoryBeat] = field(default_factory=list)
    theme: str = ""
    conflict: str = ""
    resolution: str = ""


@dataclass
class StoryScene:
    id: str
    title: str
    description: str
    location: Optional[str] = None
    time_of_day: Optional[str] = None
    characters: List[str] = field(default_factory=list)
    dialogue: List[Dict[str, str]] = field(default_factory=list)
    beat_ids: List[str] = field(default_factory=list)
    visual_direction: str = ""
    audio_mood: str = ""
    props: List[str] = field(default_factory=list)
    sfx: List[str] = field(default_factory=list)


@dataclass
class Story:
    id: str
    title: str
    synopsis: str
    genre: StoryGenre
    mode: ProductionMode = ProductionMode.FICTION
    arcs: List[StoryArc] = field(default_factory=list)
    scenes: List[StoryScene] = field(default_factory=list)
    characters: List[Dict[str, Any]] = field(default_factory=list)
    locations: List[Dict[str, Any]] = field(default_factory=list)
    props: List[StoryProp] = field(default_factory=list)
    sfx: List[StorySFX] = field(default_factory=list)
    alignment_report: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    critique: Optional[str] = None


class StoryGenerationService:
    """Service de génération de stories avec IA"""

    PROMPT_TEMPLATES = {
        StoryGenre.ADVENTURE: """
        ## METHODOLOGIE BOUT EN BOUT - FICTION/ADVENTURE
        Create an adventure story bible.
        CONTRAINTES STRICTES:
        - Personnages: Min. 3 (Triangle de relation).
        - Lieux: Min. 3 (Progression spatiale).
        - Objets: Min. 1 porté par perso + 2 immuables.
        - SFX: 1 par objet + signatures personnages + ambiance par lieu.
        """,
        StoryGenre.DOCUMENTARY: """
        ## METHODOLOGIE BOUT EN BOUT - DOCUMENTAIRE
        Create a factual documentary structure.
        CONTRAINTES STRICTES:
        - Personnages: Min. 2 (Intervenants/Narrateurs).
        - Lieux: Min. 2 (Contextes réels).
        - Objets: Min. 3 objets de preuve/illustration.
        - SFX: Ambiances sonores réelles (diegetic).
        """,
        ProductionMode.INTERVIEW: """
        ## METHODOLOGIE BOUT EN BOUT - INTERVIEW
        Create a conversational flow.
        CONTRAINTES: 2 Personnes minimum. Focus sur l'échange et les réactions.
        """,
        ProductionMode.MUSIC_VIDEO: """
        ## METHODOLOGIE BOUT EN BOUT - CLIP MUSICAL
        Create a visual structure synced to music.
        CONTRAINTES: 
        - Structure: Intro, Verset 1, Refrain, Verset 2, Refrain, Outro.
        - SFX: Focus sur les sons rythmiques et synchronisation visuelle.
        """,
        ProductionMode.SOCIAL_MEDIA: """
        ## METHODOLOGIE BOUT EN BOUT - SOCIAL/SHORT
        Create high-retention short content.
        CONTRAINTES:
        - 0-3s: Hook ultra-visuel.
        - 3-15s: Contenu rapide (coupes rapides).
        - Outro: Call to Action.
        """,
        ProductionMode.CINEMATIC: """
        ## METHODOLOGIE BOUT EN BOUT - CINEMATOGRAPHIE PRO
        Create high-fidelity cinematic project.
        CONTRAINTES:
        - Direction visuelle: Focus sur l'éclairage et les objectifs (Lenses).
        - Mouvements: Dolly, Pan, Tilt spécifiés pour chaque scène.
        """,
        ProductionMode.RECAP: """
        ## METHODOLOGIE BOUT EN BOUT - RECAP
        Create a condensation of events.
        CONTRAINTES:
        - Structure: Rappel du contexte, Points clés, Conclusion.
        - Rythme: Rapide, narration dense.
        """,
        ProductionMode.INFLUENCER: """
        ## METHODOLOGIE BOUT EN BOUT - INFLUENCEUR
        Create a high-impact personal brand or lifestyle video.
        CONTRAINTES:
        - Hook (0-5s): A visceral question or visual surprise to stop the scroll.
        - Personnage: L'influenceur doit avoir une "vibe" unique et un décor signature.
        - Ton: Ultra-authentique, direct, usage de jargon de niche (ex: "POV", "GRWM").
        - Visuel: Incrustations mobiles, emojis 3D dynamiques, sous-titres "Pop" synchronisés.
        - Rythme: Jump-cuts agressifs pour maintenir l'attention.
        - Call to Action: Intégré organiquement au milieu et à la fin.
        - SFX: "Whoosh" transitions, notifications sonores, musique tendance (Lofi ou Phonk).
        """,
        ProductionMode.MAKER: """
        ## METHODOLOGIE BOUT EN BOUT - MAKER/DIY
        Create a project showcase or tutorial.
        CONTRAINTES:
        - Étapes: Matériel, Processus, Résultat final.
        - SFX: Sons d'outils, bruits de construction.
        """,
        ProductionMode.SCIENTIFIC_REVIEW: """
        ## METHODOLOGIE BOUT EN BOUT - REVUE SCIENTIFIQUE
        Create a rigorous and educational scientific analysis.
        CONTRAINTES:
        - Structure: Hypothèse (Introduction), Méthodologie (Processus), Data Viz (Analyse), Conclusion.
        - Objets: Séquenceurs ADN, microscopes électroniques, schémas moléculaires, équations de Maxwell.
        - Visuel: Look "Labo High-tech" ou "Paper-style" élégant. Infographies minimalistes.
        - Vocabulaire: Scientifique précis (ex: "entropie", "catalyse", "stochastique") avec vulgarisation intelligente.
        - Ton: Calme, analytique, inspirant la confiance.
        - SFX: Bruitages de mécanismes de précision, ambiances de salles blanches (room tone léger).
        """,
        ProductionMode.HISTORICAL_REVIEW: """
        ## METHODOLOGIE BOUT EN BOUT - REVUE HISTORIQUE
        Create a journey through the past.
        CONTRAINTES:
        - Objets: Cartes, documents d'archives, artefacts.
        - Lieux: Reconstitution de sites historiques.
        """,
        ProductionMode.TOP_TIER_LIST: """
        ## METHODOLOGIE BOUT EN BOUT - TOP / TIER LIST
        Create a ranked list.
        CONTRAINTES:
        - Structure: Mention honorable, Top 5 à 1.
        - Dynamique: Comparaison, argumentation.
        """,
        ProductionMode.FAITH_SPIRITUALITY: """
        ## METHODOLOGIE BOUT EN BOUT - FOI ET SPIRITUALITÉ
        Create a reflective or spiritual content.
        CONTRAINTES:
        - Atmosphere: Calme, méditative, lumineuse.
        - Son: Musique ambiante, silence significatif.
        """,
        ProductionMode.GAME_REVIEW: """
        ## METHODOLOGIE BOUT EN BOUT - JEU VIDÉO
        Create a review or analysis of a game.
        CONTRAINTES:
        - Éléments: Gameplay, Graphismes, Histoire, Verdict.
        - SFX: Sons de jeu, bruitages 8-bit ou modernes.
        """,
        ProductionMode.TECH_REVIEW: """
        ## METHODOLOGIE BOUT EN BOUT - TECH REVIEW
        Create a product review.
        CONTRAINTES:
        - Objets: Gadgets, hardware, software UI, boîtes de déballage (Unboxing).
        - Focus: Specs détaillées (Benchmarks), ergonomie, prix/qualité.
        - B-Roll: Plans macro sur les ports, les textures, les écrans en fonctionnement.
        - Verdict: Tableau récapitulatif "Points Positifs / Points Négatifs".
        """,
        ProductionMode.FINANCE_REVIEW: """
        ## METHODOLOGIE BOUT EN BOUT - FINANCE
        Create market analysis or financial tips.
        CONTRAINTES:
        - Objets: Graphiques boursiers, monnaie, contrats.
        - Ton: Sérieux, analytique.
        """,
        ProductionMode.MASTERCLASS: """
        ## METHODOLOGIE BOUT EN BOUT - MASTERCLASS
        Create a premium educational course.
        CONTRAINTES:
        - Structure: Chapitrage clair, Introduction, Leçons, Résumé.
        - Visuel: Overlay de texte informatif, alternance face-cam / illustration.
        """,
        ProductionMode.REAL_ESTATE: """
        ## METHODOLOGIE BOUT EN BOUT - IMMOBILIER
        Create a fluid property walkthrough.
        CONTRAINTES:
        - Caméra: Mouvements fluides (Stabilisés), plans larges (Wide).
        - Focus: Luminosité, matériaux, agencement des pièces.
        """,
        ProductionMode.PRODUCT_HYPE: """
        ## METHODOLOGIE BOUT EN BOUT - PRODUCT HYPE
        Create a cinematic product reveal.
        CONTRAINTES:
        - Caméra: Plans macro (Extreme Close-up), rotations 360°.
        - Éclairage: Dramatique, reflets, clair-obscur.
        """,
        ProductionMode.LEGAL_RECON: """
        ## METHODOLOGIE BOUT EN BOUT - RECONSTITUTION JURIDIQUE
        Create a neutral factual reconstruction.
        CONTRAINTES:
        - Ton: Neutre, descriptif.
        - Visuel: Horodatage constant, vue d'ensemble, pas de dramatisation.
        """,
        ProductionMode.ASMR: """
        ## METHODOLOGIE BOUT EN BOUT - ASMR
        Create a sensory audio-visual experience.
        CONTRAINTES:
        - Audio: Haute fidélité, sons de proximité (Triggers).
        - Visuel: Gros plans extrêmes, mouvements lents et répétitifs.
        """,
        ProductionMode.MEDITATION: """
        ## METHODOLOGIE BOUT EN BOUT - MEDITATION
        Create a peaceful guided experience.
        CONTRAINTES:
        - Atmosphere: Calme, éthérée, respiration visuelle (zooms ultra-lents).
        - SFX: Nature (eau, vent), silence significatif.
        """,
        ProductionMode.EXPERIMENTAL: """
        ## METHODOLOGIE BOUT EN BOUT - EXPERIMENTAL
        Create an abstract visual journey.
        CONTRAINTES:
        - Structure: Non-linéaire, montage par association d'idées.
        - Visuel: Glitch, distorsion, expérimentations de couleurs.
        """,
        ProductionMode.TRUE_CRIME: """
        ## METHODOLOGIE BOUT EN BOUT - TRUE CRIME
        Create a stylized investigative narrative.
        CONTRAINTES:
        - Atmosphere: Pesante, mystérieuse (Noir).
        - Objets: Indices, dossiers, photos d'archives.
        """,
        ProductionMode.SPORTS_HIGHLIGHT: """
        ## METHODOLOGIE BOUT EN BOUT - SPORTS HIGHLIGHT
        Create an energetic action compilation.
        CONTRAINTES:
        - Rythme: Ultra-rapide, synchronisation sur les impacts.
        - Effets: Ralentis (Slow-mo), tracking de mouvement.
        """,
        ProductionMode.GARDENING: """
        ## METHODOLOGIE BOUT EN BOUT - JARDINAGE / BOTANIQUE
        Create a professional and aesthetic botanical guide.
        CONTRAINTES:
        - Lieux: Serres baignées de lumière, potagers en permaculture, jardins de curé.
        - Objets: Sécateurs en laiton, arrosoirs design, semences anciennes, terreau fertile.
        - Zoom: Focus Macro sur les textures des feuilles, les bourgeons, les insectes utiles.
        - SFX: Froissement de feuilles, terre grattée, arrosage cristallin, chant d'oiseaux printaniers.
        - Ton: Apaisant, pédagogique, proche de la nature.
        """,
        ProductionMode.RENOVATION: """
        ## METHODOLOGIE BOUT EN BOUT - RENOVATION / DIY
        Create a stunning residential or artistic transformation.
        CONTRAINTES:
        - Structure: État initial (Le défi), Travaux (L'effort / Montage accéléré), Résultat (L'effet "Wow").
        - Comparaison: Obligation de décrire l'état "Avant" pour chaque nouveau décor créé après travaux.
        - Objets: Plans d'architecte, échantillons de bois, ponceuses, pinceaux, débris de démolition.
        - SFX: Impact de masse, stridence de scie circulaire, rouile de pinceau, musique épique de révélation.
        - Ton: Inspirant, technique, dynamique.
        """,
    }

    STRUCTURES = {
        StoryStructure.THREE_ACT: {
            "beats_count": 8,
            "distribution": [0.15, 0.25, 0.60],  # Act 1, 2, 3
            "act_beats": [
                ["Inciting Incident", "First Plot Point"],
                ["Midpoint", "All Is Lost"],
                ["Climax", "Resolution"],
            ],
        },
        StoryStructure.HERO_JOURNEY: {
            "beats_count": 12,
            "steps": [
                "Ordinary World",
                "Call to Adventure",
                "Refusal",
                "Meeting Mentor",
                "Crossing Threshold",
                "Tests",
                "Allies",
                "Enemy",
                "Ordeal",
                "Reward",
                "Road Back",
                "Resurrection",
                "Return",
            ],
        },
        StoryStructure.SAVE_THE_CAT: {
            "beats_count": 15,
            "beats": [
                "Opening Image",
                "Theme Stated",
                "Set-Up",
                "Catalyst",
                "Debate",
                "Break into Two",
                "B Story",
                "Fun and Games",
                "Midpoint",
                "Bad Guys Close In",
                "All Is Lost",
                "Dark Night of the Soul",
                "Break into Three",
                "Finale",
                "Final Image",
            ],
        },
        StoryStructure.FIVE_POINT: {
            "beats_count": 5,
            "beats": [
                "Exposition",
                "Rising Action",
                "Climax",
                "Falling Action",
                "Resolution",
            ],
        },
    }

    def __init__(self, llm_service=None):
        self.llm = llm_service
        self.stories: Dict[str, Story] = {}

        # Initialize Knowledge Graph
        try:
            from src.assistant.knowledge_graph import StoryGraph
            from backend.config import settings
            from pathlib import Path

            self.graph = StoryGraph(
                persistence_path=Path(settings.KNOWLEDGE_GRAPH_PATH)
            )
            logger.info(
                f"Connected to Knowledge Graph at {settings.KNOWLEDGE_GRAPH_PATH}"
            )
        except Exception as e:
            logger.warning(f"Could not initialize Knowledge Graph: {e}")
            self.graph = None

    async def _call_llm(
        self, prompt: str, temperature: float = 0.7, max_tokens: int = 4096
    ) -> str:
        """Appel au LLM avec fallback sur mock si nécessaire"""
        import os
        from backend.llm_api import call_llm_real, LLMRequest

        # Check if mock mode is explicitly forced
        use_mock = os.environ.get("USE_MOCK_LLM", "false").lower() == "true"

        if not use_mock:
            try:
                # Use call_llm_real which handles provider selection (OpenAI, Anthropic, Ollama)
                request = LLMRequest(
                    prompt=prompt, temperature=temperature, max_tokens=max_tokens
                )
                response = await call_llm_real(request, user_id="system_story_service")
                if response and response.text:
                    return response.text
            except Exception as e:
                logger.warning(
                    f"Real LLM call failed: {e}. Falling back to internal mock."
                )

        # Fallback sur le mock interne
        return self._generate_mock_llm_response(prompt)

    async def generate_story(
        self,
        prompt: str,
        genre: StoryGenre,
        structure: StoryStructure,
        mode: ProductionMode = ProductionMode.FICTION,
        length: str = "medium",  # short, medium, long
        characters: List[Dict[str, Any]] = None,
        with_critique: bool = False,
        with_alignment_score: bool = True,
    ) -> Story:
        """Générer une story complète à partir d'un prompt via IA"""

        # 1. Utilisation du template Méthodologie "Bout en Bout"
        template = self.PROMPT_TEMPLATES.get(mode, self.PROMPT_TEMPLATES.get(genre, ""))
        rich_prompt = f"{template}\n\nUSER PROMPT: {prompt}\n\nGenerate a detailed narrative based on the above rules. Target length: {length}."

        # Call LLM to refine the synopsis if possible
        ai_synopsis = await self._call_llm(rich_prompt)
        final_synopsis = ai_synopsis if ai_synopsis else prompt

        story = Story(
            id=str(uuid.uuid4()),
            title=self._extract_title(final_synopsis),
            synopsis=final_synopsis,
            genre=genre,
            mode=mode,
            arcs=[],
            scenes=[],
            characters=characters or [],
        )

        # Générer la bible de production (méthodologie bout en bout)
        # On pourrait passer ces méthodes en async aussi si elles appellent le LLM
        await self._populate_production_bible(story)

        # Générer les arcs narratifs
        story.arcs = await self._generate_arcs(story, structure)

        # Générer les scènes
        story.scenes = await self._generate_scenes(story, length)

        # Enrichir avec les beats
        self._populate_beats(story, structure)

        if with_critique:
            await self._critique_story(story)

        if with_alignment_score:
            await self._run_alignment_scoring(story, prompt)

        self.stories[story.id] = story

        # 2. Synchroniser avec le Knowledge Graph (GraphRAG Persistence)
        if self.graph:
            await self._sync_story_to_graph(story)

        return story

    async def _sync_story_to_graph(self, story: Story):
        """Ingérer les nouveaux éléments de l'histoire dans le graphe de connaissances"""
        logger.info(f"Syncing story '{story.title}' to Knowledge Graph")

        # Add story node
        self.graph.add_node(
            name=story.title,
            entity_type="event",
            attributes={
                "synopsis": story.synopsis,
                "genre": story.genre.name,
                "mode": story.mode.name,
            },
        )

        # Add character nodes
        for char in story.characters:
            char_name = char.get("name", "Unknown")
            self.graph.add_node(
                name=char_name,
                entity_type="character",
                attributes={
                    "role": char.get("role"),
                    "description": char.get("description"),
                    "origin_story_id": story.id,
                },
            )
            self.graph.add_edge(
                source_name=char_name,
                relation="character_of",
                target_name=story.title,
                target_type="event",
            )

        # Add location nodes
        for loc in story.locations:
            loc_name = loc.get("name", "Unknown")
            self.graph.add_node(
                name=loc_name,
                entity_type="location",
                attributes={
                    "type": loc.get("type"),
                    "description": loc.get("description"),
                    "origin_story_id": story.id,
                },
            )
            self.graph.add_edge(
                source_name=loc_name,
                relation="located_in",
                target_name=story.title,
                target_type="event",
            )

        # Persistence
        self.graph.save()
        logger.info("Knowledge Graph updated and saved.")

    async def _critique_story(self, story: Story):
        """
        Analyse de cohérence par une seconde instance d'IA (Rôle Critique).
        Vérifie la consistance spatiale, temporelle et logique.
        """
        logger.info(f"Démarrage de la critique multi-agent pour : {story.title}")

        # Aggréger le contenu pour l'analyse
        content = f"TITRE: {story.title}\nSYNOPSIS: {story.synopsis}\n"
        content += "BIBLE DE PRODUCTION:\n"
        content += f"- Persos: {[{c['name']: c['role']} for c in story.characters]}\n"
        content += f"- Lieux: {[loc['name'] for loc in story.locations]}\n"
        content += f"- Props: {[p.name for p in story.props]}\n"
        content += "\nSCÉNARIO (SCÈNES):\n"
        for i, s in enumerate(story.scenes):
            content += f"S{i + 1}: {s.title} @{s.location} - {s.description[:100]}...\n"

        critique_prompt = f"""
        En tant qu'Expert en Script Doctoring, analyse ce projet :
        
        {content}
        
        Identifie 3 points d'amélioration concernant la COHÉRENCE (ex: un personnage oublié, un objet non utilisé, une rupture de ton).
        Sois concis. Réponds en français.
        """

        critique_res = await self._call_llm(
            critique_prompt, temperature=0.5
        )  # Plus basse pour plus de rigueur
        if critique_res:
            story.critique = critique_res
            logger.info("Critique générée avec succès.")
        else:
            story.critique = "L'IA critique n'a pas pu être contactée."

    async def _run_alignment_scoring(self, story: Story, original_prompt: str):
        """Exécute le système de scoring d'alignement détaillé"""
        logger.info(f"Exécution du scoring d'alignement pour : {story.title}")
        try:
            # We pass self._call_llm wrapped in a lambda to ensure the scorer uses our
            # centralized LLM management (including mock fallback and configuration).
            scorer = get_story_scorer(
                call_llm_func=lambda p: self._call_llm(
                    p, temperature=0.3, max_tokens=1000
                )
            )

            # Prepare story data for scorer
            story_dict = self.export_story(story.id)

            report = await scorer.score_story(
                story_dict,
                original_prompt,
                story.genre.value,
                "Three-Act Structure",  # Default or from story metadata
            )

            # Store report in story
            story.alignment_report = {
                "total_score": report.total_score,
                "summary": report.summary,
                "recommendations": report.recommendations,
                "is_pass": report.is_pass,
                "categories": {
                    cat.value: {
                        "score": res.score,
                        "feedback": res.feedback,
                        "issues": res.issues,
                    }
                    for cat, res in report.categories.items()
                },
            }

            # If critique is missing, use the alignment summary
            if not story.critique:
                story.critique = (
                    f"Base Score: {report.total_score}/100\n\n{report.summary}"
                )

            logger.info(
                f"Scoring d'alignement terminé. Score total : {report.total_score}"
            )
        except Exception as e:
            logger.error(f"Erreur lors du scoring d'alignement : {e}")
            story.alignment_report = {"error": str(e), "total_score": 0}

    async def _populate_production_bible(self, story: Story):
        """
        Implémente la règle 'Bout en Bout' :
        Force la création du triangle relationnel, de la trinité spatiale,
        des objets immuables et des SFX. Utilise l'IA pour le casting.
        """

        # 1. Configuration par mode
        mode_config = {
            ProductionMode.FICTION: {
                "min_chars": 3,
                "min_locs": 3,
                "is_narrative": True,
            },
            ProductionMode.DOCUMENTARY: {
                "min_chars": 2,
                "min_locs": 2,
                "is_narrative": False,
            },
            ProductionMode.INTERVIEW: {
                "min_chars": 2,
                "min_locs": 1,
                "is_narrative": False,
            },
            ProductionMode.MUSIC_VIDEO: {
                "min_chars": 1,
                "min_locs": 3,
                "is_narrative": False,
            },
            ProductionMode.SOCIAL_MEDIA: {
                "min_chars": 1,
                "min_locs": 2,
                "is_narrative": True,
            },
            ProductionMode.GARDENING: {
                "min_chars": 1,
                "min_locs": 2,
                "is_narrative": False,
                "loc_names": ["Serre", "Potager", "Jardin d'ornement"],
                "prop_names": ["Sécateur", "Arrosoir", "Bêche", "Graines"],
            },
            ProductionMode.RENOVATION: {
                "min_chars": 2,
                "min_locs": 2,
                "is_narrative": False,
                "loc_names": ["Site (État Initial)", "Site (Après Travaux)"],
                "prop_names": ["Mètre ruban", "Niveau à bulle", "Perceuse", "Peinture"],
            },
            ProductionMode.MASTERCLASS: {
                "min_chars": 1,
                "min_locs": 2,
                "is_narrative": False,
                "loc_names": ["Studio", "Lieu de démonstration"],
                "prop_names": ["Micro", "Tableau blanc", "Cahier de notes"],
            },
            ProductionMode.TECH_REVIEW: {
                "min_chars": 1,
                "min_locs": 1,
                "is_narrative": False,
                "loc_names": ["Setup Tech", "Laboratoire de test"],
                "prop_names": ["Caméra Macro", "Station de charge", "Packaging"],
            },
            ProductionMode.REAL_ESTATE: {
                "min_chars": 1,
                "min_locs": 4,
                "is_narrative": False,
                "loc_names": ["Hall d'entrée", "Salon", "Cuisine", "Jardin/Balcon"],
            },
            ProductionMode.ASMR: {
                "min_chars": 1,
                "min_locs": 1,
                "is_narrative": False,
                "loc_names": ["Chambre sourde", "Studio ASMR"],
                "prop_names": ["Micro 3Dio", "Brosse", "Vaporisateur"],
            },
            ProductionMode.RECAP: {
                "min_chars": 1,
                "min_locs": 2,
                "is_narrative": True,
                "loc_names": ["Flashback", "Contexte actuel"],
                "prop_names": ["Timeline", "Mémoire holographique"],
            },
            ProductionMode.INFLUENCER: {
                "min_chars": 1,
                "min_locs": 2,
                "is_narrative": False,
                "loc_names": ["Studio Vlog", "Extérieur Lifestyle"],
                "prop_names": ["Ring Light", "iPhone/Smartphone", "Produit Sponsorisé"],
            },
            ProductionMode.MAKER: {
                "min_chars": 1,
                "min_locs": 2,
                "is_narrative": False,
                "loc_names": ["Atelier", "Établi de soudure"],
                "prop_names": ["Poste à souder", "Imprimante 3D", "Fer à souder"],
            },
            ProductionMode.SCIENTIFIC_REVIEW: {
                "min_chars": 2,
                "min_locs": 2,
                "is_narrative": False,
                "loc_names": ["Laboratoire", "Observatoire"],
                "prop_names": ["Microscope", "Graphique de données", "Échantillon"],
            },
            ProductionMode.HISTORICAL_REVIEW: {
                "min_chars": 1,
                "min_locs": 3,
                "is_narrative": False,
                "loc_names": ["Archives", "Site de fouilles", "Musée"],
                "prop_names": ["Parchemin ancien", "Artefact", "Carte historique"],
            },
            ProductionMode.TOP_TIER_LIST: {
                "min_chars": 1,
                "min_locs": 1,
                "is_narrative": False,
                "loc_names": ["Écran de classement"],
                "prop_names": ["Tier Maker Board", "Logo S-Tier"],
            },
            ProductionMode.FAITH_SPIRITUALITY: {
                "min_chars": 2,
                "min_locs": 1,
                "is_narrative": False,
                "loc_names": ["Lieu de culte/méditation"],
                "prop_names": ["Bougie", "Livre sacré", "Encens"],
            },
            ProductionMode.GAME_REVIEW: {
                "min_chars": 1,
                "min_locs": 1,
                "is_narrative": False,
                "loc_names": ["Station de jeu"],
                "prop_names": ["Manette", "Casque Gamer", "Carte graphique"],
            },
            ProductionMode.FINANCE_REVIEW: {
                "min_chars": 1,
                "min_locs": 1,
                "is_narrative": False,
                "loc_names": ["Bureau de trading"],
                "prop_names": ["Écran Bloomberg", "Graphique bougies", "Calculatrice"],
            },
            ProductionMode.PRODUCT_HYPE: {
                "min_chars": 1,
                "min_locs": 1,
                "is_narrative": False,
                "loc_names": ["Black Box Studio"],
                "prop_names": ["Le Produit", "Drapeau lumière", "Tournette"],
            },
            ProductionMode.LEGAL_RECON: {
                "min_chars": 3,
                "min_locs": 1,
                "is_narrative": False,
                "loc_names": ["Salle d'audience", "Lieu du délit"],
                "prop_names": ["Preuve n°1", "Marteau du juge", "Dossier d'enquête"],
            },
            ProductionMode.MEDITATION: {
                "min_chars": 1,
                "min_locs": 1,
                "is_narrative": False,
                "loc_names": ["Zen Garden", "Espace vide"],
                "prop_names": ["Bol chantant", "Tapis de yoga"],
            },
            ProductionMode.EXPERIMENTAL: {
                "min_chars": 2,
                "min_locs": 3,
                "is_narrative": True,
                "loc_names": ["Nébulosité", "L'Inconscient"],
                "prop_names": ["Fragment de réalité", "Miroir déformant"],
            },
            ProductionMode.TRUE_CRIME: {
                "min_chars": 2,
                "min_locs": 2,
                "is_narrative": True,
                "loc_names": ["Scène de crime", "Bureau enquêteur"],
                "prop_names": ["Ruban de police", "Lampe UV", "Enregistreur vocal"],
            },
            ProductionMode.SPORTS_HIGHLIGHT: {
                "min_chars": 2,
                "min_locs": 1,
                "is_narrative": False,
                "loc_names": ["Stadium", "Court de sport"],
                "prop_names": ["Ballon/Balle", "Chronomètre", "Trophée"],
            },
        }

        config = mode_config.get(story.mode, mode_config[ProductionMode.FICTION])

        # 1. Personnages (Triangle de relation si fiction)
        min_chars = config.get("min_chars", 3)
        if not story.characters:
            # Generate characters via LLM based on story synopsis
            char_prompt = f"Based on this story: '{story.synopsis}', generate {min_chars} characters. Return ONLY a JSON list of objects with 'nom', 'role', and 'description'. No other text."
            char_json = await self._call_llm(char_prompt)

            try:
                import json

                # Find the first '[' and last ']' to extract JSON
                start = char_json.find("[")
                end = char_json.rfind("]") + 1
                if start != -1 and end != -1:
                    chars_data = json.loads(char_json[start:end])
                    for char in chars_data:
                        story.characters.append(
                            {
                                "id": str(uuid.uuid4()),
                                "name": char.get("name", char.get("nom", "Inconnu")),
                                "role": char.get("role", "Rôle"),
                                "description": char.get("description", "Généré via IA"),
                            }
                        )
                else:
                    raise ValueError("No JSON list found")
            except Exception:
                logger.warning("LLM character generation failed, using placeholders")
                for i in range(min_chars):
                    char_id = str(uuid.uuid4())
                    roles = (
                        ["Protagoniste", "Antagoniste", "Allié"]
                        if config.get("is_narrative")
                        else ["Présentateur", "Invité", "Expert"]
                    )
                    story.characters.append(
                        {
                            "id": char_id,
                            "name": f"Personnage {i + 1}",
                            "role": roles[i] if i < len(roles) else "Secondaire",
                            "description": "Généré via méthodologie bout en bout",
                        }
                    )

        # 2. Lieux (Trinité spatiale ou contextuels)
        min_locs = config.get("min_locs", 3)
        loc_names = config.get(
            "loc_names", ["Départ", "Transition", "Résolution", "Autre"]
        )

        loc_prompt = f"Based on this story: '{story.synopsis}', generate {min_locs} locations. Return ONLY a JSON list of objects with 'nom' and 'description'. No other text."
        loc_json = await self._call_llm(loc_prompt)

        try:
            import json

            start = loc_json.find("[")
            end = loc_json.rfind("]") + 1
            if start != -1 and end != -1:
                locs_data = json.loads(loc_json[start:end])
                for loc in locs_data:
                    story.locations.append(
                        {
                            "id": str(uuid.uuid4()),
                            "name": loc.get("name", loc.get("nom", "Inconnu")),
                            "description": loc.get(
                                "description", "Ancrage spatial consistant"
                            ),
                        }
                    )
            else:
                raise ValueError("No JSON list found")
        except Exception:
            logger.warning("LLM location generation failed, using placeholders")
            for i in range(min_locs):
                loc_id = str(uuid.uuid4())
                name = loc_names[i] if i < len(loc_names) else f"Lieu {i + 1}"
                story.locations.append(
                    {
                        "id": loc_id,
                        "name": name,
                        "description": "Ancrage spatial consistant",
                    }
                )

        # 3. Objets (Props) (IA-Driven)
        prop_prompt = f"Based on this story: '{story.synopsis}', identify main interactive objects (Props). Return ONLY a JSON list of objects with 'name', 'description', and 'is_immutable' (boolean). Generate at least 5 props."
        prop_json = await self._call_llm(prop_prompt)

        try:
            import json

            start = prop_json.find("[")
            end = prop_json.rfind("]") + 1
            if start != -1 and end != -1:
                props_data = json.loads(prop_json[start:end])
                for p_data in props_data:
                    prop = StoryProp(
                        id=str(uuid.uuid4()),
                        name=p_data.get("name", "Objet inconnu"),
                        description=p_data.get("description", "Objet interactif"),
                        is_immutable=p_data.get("is_immutable", False),
                    )
                    story.props.append(prop)
            else:
                raise ValueError("No JSON list found")
        except Exception:
            # Fallback to predefined props
            predefined_props = config.get("prop_names", ["Objet 1", "Objet 2"])
            for name in predefined_props:
                prop = StoryProp(
                    id=str(uuid.uuid4()),
                    name=name,
                    description="Objet consistant",
                    is_immutable=True,
                )
                story.props.append(prop)

        # 4. SFX (Bruitages) (IA-Driven)
        sfx_prompt = f"Based on these props {[{p.name for p in story.props}]} and locations {[{loc['name'] for loc in story.locations}]}, generate a list of 5 specific SFX. Return ONLY a JSON list of objects with 'name', 'category' (action/ambiance), and 'description'."
        sfx_json = await self._call_llm(sfx_prompt)

        try:
            import json

            start = sfx_json.find("[")
            end = sfx_json.rfind("]") + 1
            if start != -1 and end != -1:
                sfx_data = json.loads(sfx_json[start:end])
                for s_data in sfx_data:
                    sfx = StorySFX(
                        id=str(uuid.uuid4()),
                        name=s_data.get("name", "Bruitage"),
                        category=s_data.get("category", "action"),
                        description=s_data.get(
                            "description", "Signatures sonores consistantes"
                        ),
                    )
                    story.sfx.append(sfx)
            else:
                raise ValueError("No JSON list found")
        except Exception:
            # Simple fallback
            for loc in story.locations:
                sfx = StorySFX(
                    id=str(uuid.uuid4()),
                    name=f"Ambiance {loc['name']}",
                    category="ambiance",
                    description="Son d'ambiance",
                )
                story.sfx.append(sfx)

    async def _generate_arcs(
        self, story: Story, structure: StoryStructure
    ) -> List[StoryArc]:
        """Générer les arcs narratifs basés sur la structure via IA"""
        # Mapping des noms d'actes par structure
        act_names_map = {
            StoryStructure.THREE_ACT: [
                "Act 1 - Setup",
                "Act 2 - Confrontation",
                "Act 3 - Resolution",
            ],
            StoryStructure.HERO_JOURNEY: ["Departure", "Initiation", "Return"],
            StoryStructure.SAVE_THE_CAT: ["Setup", "Development", "Finale"],
            StoryStructure.FIVE_POINT: ["Rising Action", "Climax", "Resolution"],
            StoryStructure.SEQUENCE: ["Opening", "Development", "Closing"],
        }
        names = act_names_map.get(structure, ["Part 1", "Part 2", "Part 3"])

        arc_prompt = f"""
        For this story: '{story.synopsis}', generate {len(names)} narrative themes and conflicts for each act.
        Structure: {structure.name}
        
        Return ONLY a JSON list of objects with 'theme' and 'conflict'.
        """

        arc_json = await self._call_llm(arc_prompt)

        arcs = []
        try:
            import json

            start = arc_json.find("[")
            end = arc_json.rfind("]") + 1
            if start != -1 and end != -1:
                arcs_data = json.loads(arc_json[start:end])
                for i, name in enumerate(names):
                    a_data = (
                        arcs_data[i]
                        if i < len(arcs_data)
                        else {"theme": "Thème", "conflict": "Conflit"}
                    )
                    arc = StoryArc(
                        id=str(uuid.uuid4()),
                        name=name,
                        genre=story.genre,
                        structure=structure,
                        beats=[],
                        theme=a_data.get("theme", "Thème de l'acte"),
                        conflict=a_data.get("conflict", "Conflit principal"),
                        resolution="",
                    )
                    arcs.append(arc)
            else:
                raise ValueError("No JSON list found")
        except Exception:
            # Fallback
            for i, name in enumerate(names):
                arc = StoryArc(
                    id=str(uuid.uuid4()),
                    name=name,
                    genre=story.genre,
                    structure=structure,
                    beats=[],
                    theme=self._generate_theme(story.genre),
                    conflict=f"Main conflict of {name}",
                    resolution="",
                )
                arcs.append(arc)

        return arcs

    async def _generate_scenes(self, story: Story, length: str) -> List[StoryScene]:
        """Générer les scènes de la story via IA en plusieurs passages (chunking)"""
        scene_count = {"short": 5, "medium": 12, "long": 24}.get(length, 12)

        scenes = []

        # Prepare context for LLM
        locations_str = ", ".join([loc["name"] for loc in story.locations])
        characters_str = ", ".join([c["name"] for c in story.characters])

        # Use chunking for long generations to prevent token limit errors
        chunk_size = 8
        remaining = scene_count
        iteration = 1

        while remaining > 0:
            current_batch_size = min(chunk_size, remaining)
            logger.info(
                f"Generating scenes batch {iteration} ({current_batch_size} scenes)..."
            )

            scene_prompt = f"""
            Generate scenes {scene_count - remaining + 1} to {scene_count - remaining + current_batch_size} of {scene_count} for this story: '{story.synopsis}'.
            Characters: {characters_str}
            Locations: {locations_str}
            
            Previous scenes context (titles only): {", ".join([s.title for s in scenes]) if scenes else "None"}
            
            Return ONLY a JSON list of {current_batch_size} objects with: 'title', 'description', 'location', 'visual_direction', 'audio_mood'.
            'location' must be one of the provided locations.
            DO NOT include other text.
            """

            # Use slightly larger max_tokens for JSON output stability
            scene_json = await self._call_llm(scene_prompt, max_tokens=4096)

            try:
                import json

                start = scene_json.find("[")
                end = scene_json.rfind("]") + 1
                if start != -1 and end != -1:
                    scenes_data = json.loads(scene_json[start:end])
                    # Ensure we don't accidentally add more than the requested batch size if LLM is overenthusiastic
                    for i, s_data in enumerate(scenes_data[:current_batch_size]):
                        scene = StoryScene(
                            id=str(uuid.uuid4()),
                            title=s_data.get("title", f"Scène {len(scenes) + 1}"),
                            description=s_data.get("description", ""),
                            location=s_data.get("location", "Inconnu"),
                            time_of_day=self._generate_time_of_day(),
                            visual_direction=s_data.get("visual_direction", ""),
                            audio_mood=s_data.get("audio_mood", ""),
                        )
                        scenes.append(scene)
                else:
                    raise ValueError(f"No JSON list found in batch {iteration}")
            except Exception as e:
                logger.error(f"LLM scene generation failed for batch {iteration}: {e}")
                # Fallback for this specific batch
                for i in range(current_batch_size):
                    import random

                    location_name = (
                        random.choice(story.locations).get("name")
                        if story.locations
                        else "Studio"
                    )
                    scene = StoryScene(
                        id=str(uuid.uuid4()),
                        title=f"Scene {len(scenes) + 1} (Fallback)",
                        description="Generated via fallback mechanism due to AI error.",
                        location=location_name,
                        time_of_day=self._generate_time_of_day(),
                        visual_direction=self._generate_visual_direction(story.genre),
                        audio_mood=self._generate_audio_mood(story.genre),
                    )
                    scenes.append(scene)

            remaining -= current_batch_size
            iteration += 1

        return scenes

    def _populate_beats(self, story: Story, structure: StoryStructure):
        """Remplir les beats pour chaque arc"""
        config = self.STRUCTURES.get(
            structure, self.STRUCTURES[StoryStructure.THREE_ACT]
        )
        beats_list = config.get("beats", [])

        beat_index = 0
        scenes_per_arc = (
            len(story.scenes) // len(story.arcs) if story.arcs else len(story.scenes)
        )

        for arc in story.arcs:
            for i in range(min(scenes_per_arc, len(beats_list) - beat_index)):
                if beat_index < len(beats_list):
                    beat = StoryBeat(
                        id=str(uuid.uuid4()),
                        name=beats_list[beat_index],
                        description=f"Beat {beat_index + 1} in {arc.name}",
                        emotional_beat=self._generate_emotional_beat(),
                        narrative_function=self._generate_narrative_function(),
                        characters_involved=[],
                        scene_reference=None,
                    )
                    arc.beats.append(beat)
                    beat_index += 1

    def _extract_title(self, prompt: str) -> str:
        """Extraire un titre du prompt"""
        words = prompt.split()
        if len(words) <= 6:
            return " ".join(words).title()
        return " ".join(words[:6]).title() + "..."

    def _generate_scene_title(self, scene_number: int) -> str:
        """Générer un titre de scène"""
        prefixes = [
            "Opening",
            "Discovery",
            "Conflict",
            "Tension",
            "Revelation",
            "Climax",
            "Resolution",
        ]
        return f"{prefixes[scene_number % len(prefixes)]} Scene {scene_number}"

    def _generate_scene_description(self, scene_index: int, total_scenes: int) -> str:
        """Générer une description de scène"""
        position = scene_index / total_scenes if total_scenes > 0 else 0

        if position < 0.2:
            return "Introduction of characters and setting. Establishing the world and initial situation."
        elif position < 0.5:
            return "Development of conflict. Characters face challenges and relationships develop."
        elif position < 0.8:
            return "Rising tension. Stakes increase as obstacles mount."
        else:
            return (
                "Climax and resolution. Conflicts reach their peak and find conclusion."
            )

    def _generate_theme(self, genre: StoryGenre) -> str:
        """Générer un thème basé sur le genre"""
        themes = {
            StoryGenre.ADVENTURE: "Heroism and discovery",
            StoryGenre.DRAMA: "Personal growth and relationships",
            StoryGenre.COMEDY: "Life's absurdities and joy",
            StoryGenre.HORROR: "Fear of the unknown",
            StoryGenre.ROMANCE: "Love conquers all",
            StoryGenre.SCIFI: "Technology and humanity",
            StoryGenre.FANTASY: "Magic and destiny",
            StoryGenre.THRILLER: "Survival and justice",
            StoryGenre.DOCUMENTARY: "Truth and understanding",
        }
        return themes.get(genre, "Universal themes")

    def _generate_conflict(self, genre: StoryGenre) -> str:
        """Générer un conflit basé sur le genre"""
        conflicts = {
            StoryGenre.ADVENTURE: "External obstacles and physical challenges",
            StoryGenre.DRAMA: "Internal struggles and relationships",
            StoryGenre.COMEDY: "Misunderstandings and comedic situations",
            StoryGenre.HORROR: "Supernatural or psychological threats",
            StoryGenre.ROMANCE: "Barriers to love",
            StoryGenre.SCIFI: "Technological or existential threats",
            StoryGenre.FANTASY: "Dark forces and magical challenges",
            StoryGenre.THRILLER: "Danger and deception",
            StoryGenre.DOCUMENTARY: "Social and real-world issues",
        }
        return conflicts.get(genre, "Character vs Circumstance")

    def _generate_location(self, genre: StoryGenre) -> str:
        """Générer un lieu basé sur le genre"""
        locations = {
            StoryGenre.ADVENTURE: "Exotic landscapes and ancient ruins",
            StoryGenre.DRAMA: "Domestic settings and urban environments",
            StoryGenre.COMEDY: "Everyday locations with comedic potential",
            StoryGenre.HORROR: "Dark, isolated, or abandoned places",
            StoryGenre.ROMANCE: "Romantic and picturesque settings",
            StoryGenre.SCIFI: "Futuristic facilities and space stations",
            StoryGenre.FANTASY: "Magical realms and mythical lands",
            StoryGenre.THRILLER: "Urban environments with hidden dangers",
            StoryGenre.DOCUMENTARY: "Real-world locations and documentary settings",
        }
        return locations.get(genre, "Various locations")

    def _generate_time_of_day(self) -> str:
        """Générer un moment de la journée"""
        times = ["Dawn", "Morning", "Afternoon", "Dusk", "Night", "Midnight"]
        import random

        return random.choice(times)

    def _generate_visual_direction(self, genre: StoryGenre) -> str:
        """Générer des directions visuelles"""
        directions = {
            StoryGenre.ADVENTURE: "Sweeping vistas, dynamic camera movements",
            StoryGenre.DRAMA: "Intimate close-ups, natural lighting",
            StoryGenre.COMEDY: "Bright colors, wide shots for physical comedy",
            StoryGenre.HORROR: "Dark shadows, low-key lighting, POV shots",
            StoryGenre.ROMANCE: "Warm tones, soft focus, golden hour lighting",
            StoryGenre.SCIFI: "Clean lines, cool colors, technological aesthetics",
            StoryGenre.FANTASY: "Rich colors, magical lighting effects",
            StoryGenre.THRILLER: "Handheld camera, tension-building framing",
            StoryGenre.DOCUMENTARY: "Direct address, documentary-style footage",
        }
        return directions.get(genre, "Standard cinematographic techniques")

    def _generate_audio_mood(self, genre: StoryGenre) -> str:
        """Générer une ambiance sonore"""
        moods = {
            StoryGenre.ADVENTURE: "Epic orchestral with percussion",
            StoryGenre.DRAMA: "Emotional strings and piano",
            StoryGenre.COMEDY: "Light, playful musical cues",
            StoryGenre.HORROR: "Dissonant strings, ambient dread",
            StoryGenre.ROMANCE: "Warm strings and romantic melodies",
            StoryGenre.SCIFI: "Electronic, futuristic soundscapes",
            StoryGenre.FANTASY: "Orchestral fantasy score",
            StoryGenre.THRILLER: "Tense, rhythmic tension music",
            StoryGenre.DOCUMENTARY: "Ambient documentary score",
        }
        return moods.get(genre, "Adaptive scoring")

    def _generate_emotional_beat(self) -> str:
        """Générer un beat émotionnel"""
        beats = [
            "Hope rises",
            "Fear intensifies",
            "Joy emerges",
            "Sadness deepens",
            "Anger explodes",
            "Love blossoms",
            "Betrayal shocks",
            "Courage manifests",
            "Doubt creeps in",
            "Determination strengthens",
        ]
        import random

        return random.choice(beats)

    def _generate_narrative_function(self) -> str:
        """Générer une fonction narrative"""
        functions = [
            "Set up conflict",
            "Raise stakes",
            "Develop character",
            "Create tension",
            "Provide revelation",
            "Advance plot",
            "Deepen theme",
            "Create turning point",
            "Build to climax",
        ]
        import random

        return random.choice(functions)

    def add_beat(self, arc_id: str, beat_data: dict) -> StoryBeat:
        """Ajouter un beat narratif"""
        beat = StoryBeat(**beat_data)
        return beat

    def add_scene(self, story_id: str, scene_data: dict) -> StoryScene:
        """Ajouter une scène"""
        scene = StoryScene(**scene_data)
        if story_id in self.stories:
            self.stories[story_id].scenes.append(scene)
        return scene

    def get_story(self, story_id: str) -> Optional[Story]:
        """Récupérer une story par ID"""
        return self.stories.get(story_id)

    def list_stories(self) -> List[Story]:
        """Lister toutes les stories"""
        return list(self.stories.values())

    def export_story(self, story_id: str, format: str = "json") -> Dict[str, Any]:
        """Exporter la story dans différents formats"""
        story = self.stories[story_id]
        return {
            "id": story.id,
            "title": story.title,
            "synopsis": story.synopsis,
            "genre": story.genre.value,
            "arcs_count": len(story.arcs),
            "scenes_count": len(story.scenes),
            "arcs": [
                {
                    "id": arc.id,
                    "name": arc.name,
                    "theme": arc.theme,
                    "conflict": arc.conflict,
                    "resolution": arc.resolution,
                    "beats_count": len(arc.beats),
                    "beats": [
                        {
                            "id": beat.id,
                            "name": beat.name,
                            "description": beat.description,
                            "emotional_beat": beat.emotional_beat,
                            "narrative_function": beat.narrative_function,
                        }
                        for beat in arc.beats
                    ],
                }
                for arc in story.arcs
            ],
            "scenes": [
                {
                    "id": s.id,
                    "title": s.title,
                    "description": s.description,
                    "location": s.location,
                    "time_of_day": s.time_of_day,
                    "characters": s.characters,
                    "visual_direction": s.visual_direction,
                    "audio_mood": s.audio_mood,
                }
                for s in story.scenes
            ],
            "characters": story.characters,
            "locations": story.locations,
            "props": [
                {
                    "id": p.id,
                    "name": p.name,
                    "description": p.description,
                    "is_immutable": p.is_immutable,
                    "owner_id": p.owner_id,
                }
                for p in story.props
            ],
            "sfx": [
                {
                    "id": s.id,
                    "name": s.name,
                    "category": s.category,
                    "description": s.description,
                    "associated_entity_id": s.associated_entity_id,
                }
                for s in story.sfx
            ],
            "created_at": story.created_at.isoformat(),
            "updated_at": story.updated_at.isoformat(),
        }

    def analyze_story_structure(self, story_id: str) -> Dict[str, Any]:
        """Analyser la structure narrative"""
        story = self.stories.get(story_id)
        if not story:
            return {"error": "Story not found"}

        total_beats = sum(len(arc.beats) for arc in story.arcs)
        total_scenes = len(story.scenes)

        # Calculer le pacing
        beats_per_scene = total_beats / total_scenes if total_scenes > 0 else 0
        pacing_score = 1.0 - abs(0.5 - beats_per_scene) if beats_per_scene > 0 else 0.5

        # Analyser la conformité à la structure
        structure_beats_count = self.STRUCTURES.get(
            story.arcs[0].structure if story.arcs else StoryStructure.THREE_ACT,
            self.STRUCTURES[StoryStructure.THREE_ACT],
        )["beats_count"]

        structure_compliance = (
            min(1.0, total_beats / (structure_beats_count * len(story.arcs)))
            if story.arcs
            else 0.5
        )

        # Générer des recommandations
        recommendations = []
        if pacing_score < 0.6:
            recommendations.append("Consider adding more beats to improve pacing")
        elif pacing_score > 0.9:
            recommendations.append("Pacing may be too fast, consider expanding scenes")

        if structure_compliance < 0.7:
            recommendations.append(
                f"Story structure could better follow {story.arcs[0].structure.value if story.arcs else 'standard'} pattern"
            )

        return {
            "total_beats": total_beats,
            "total_scenes": total_scenes,
            "pacing_score": round(pacing_score, 2),
            "pacing_analysis": "balanced"
            if 0.6 <= pacing_score <= 0.9
            else ("fast" if pacing_score > 0.9 else "slow"),
            "character_arcs": len(story.characters),
            "structure_compliance": round(structure_compliance, 2),
            "arc_distribution": [len(arc.beats) for arc in story.arcs],
            "recommendations": recommendations,
        }

    def _generate_mock_llm_response(self, prompt: str) -> str:
        """Générateur de réponses mock intelligentes pour la démo"""
        p_lower = prompt.lower()

        # 1. Detection de demande de JSON (Personnages/Lieux)
        if "json" in p_lower:
            if "character" in p_lower or "personnage" in p_lower:
                return json.dumps(
                    [
                        {
                            "name": "Elias Thorne",
                            "role": "Protagoniste",
                            "description": "Un ingénieur solitaire hanté par son passé.",
                        },
                        {
                            "name": "Sarah Vance",
                            "role": "Alliée",
                            "description": "Une experte en informatique très pragmatique.",
                        },
                        {
                            "name": "Unknown Entity",
                            "role": "Antagoniste",
                            "description": "Une présence mystérieuse dans le système.",
                        },
                    ]
                )
            if "location" in p_lower or "lieu" in p_lower:
                return json.dumps(
                    [
                        {
                            "name": "Le Phare",
                            "description": "Une structure ancienne mais modernisée.",
                        },
                        {
                            "name": "L'Île",
                            "description": "Un rocher escarpé battu par les vents.",
                        },
                        {
                            "name": "Le Laboratoire",
                            "description": "Un espace rempli de serveurs et d'écrans.",
                        },
                    ]
                )

        # 2. Detection de demande de Critique
        if "critique" in p_lower or "cohérence" in p_lower:
            return """### Analyse de Cohérence Multi-Agent
1. **Structure Narrative** : Le passage de l'état initial à la transition est fluide. Le concept de rénovation est bien exploité comme métaphore de la reconstruction personnelle.
2. **Rythme** : Attention à la scène 3, le rythme s'accélère brusquement. Prévoir plus de respirations visuelles.
3. **Utilisation des Objets** : L'objet 'Plan de rénovation' est introduit tardivement, il devrait être présent dès la scène 1.
**Verdict** : Projet solide. Recommandation : Accentuer le contraste visuel 'Avant/Après'."""

        # 3. Réponse générique
        return f"Ceci est une réponse générée (Simulation). Contenu basé sur : {prompt[:50]}..."

    async def refine_story(self, story_id: str, feedback: str) -> Story:
        """Affiner une story via LLM basé sur un feedback textuel (Script Doctoring)"""
        story = self.stories.get(story_id)
        if not story:
            raise ValueError("Story not found")

        logger.info(f"Refining story {story_id} with feedback: {feedback}")

        # Build context for refinement
        context = f"STORY: {story.title}\nSYNOPSIS: {story.synopsis}\n"
        context += "CRITIQUE ACTUELLE:\n" + (story.critique or "Aucune") + "\n"

        refine_prompt = f"""
        En tant que Script Doctor Expert, tu dois affiner le projet suivant basé sur le FEEDBACK de l'utilisateur.
        
        {context}
        
        FEEDBACK UTILISATEUR: "{feedback}"
        
        CONSIGNES:
        1. Modifie le SYNOPSIS ou les ÉLÉMENTS si nécessaire.
        2. Si le feedback demande des changements majeurs, explique ce que tu as fait.
        3. Retourne TOUJOURS le nouveau contenu sous forme de JSON structuré:
        {{
            "new_synopsis": "le synopsis mis à jour",
            "changes_summary": "explication des modifications",
            "updated_critique": "une nouvelle critique tenant compte des changements"
        }}
        """

        result_json = await self._call_llm(refine_prompt)
        try:
            start = result_json.find("{")
            end = result_json.rfind("}") + 1
            data = json.loads(result_json[start:end])

            story.synopsis = data.get("new_synopsis", story.synopsis)
            story.critique = data.get("updated_critique", story.critique)
            # On pourrait aussi affiner les scènes ici dynamiquement

            logger.info(f"Refinement complete for {story_id}")
        except Exception as e:
            logger.error(f"Failed to parse refinement JSON: {e}")
            # Fallback: use raw response as synopsis or just log error

        story.updated_at = datetime.now()
        return story
