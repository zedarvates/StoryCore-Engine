"""
StoryCore — Narrative Extractor
=================================
Analyse un chapitre BD terminé (Comic Generator) ou un recap (Recap Engine)
et en extrait une empreinte narrative complète :

  • Personnages : état émotionnel/physique, transformations, relations
  • Lieux : visités, ambiance, importance narrative
  • Objets : acquis, perdus, utilisés
  • Arcs : ouverts, fermés, nouveaux
  • Mémoire : local / arc / global (3 niveaux)
  • Checkpoint de continuité → injectables dans le chapitre suivant

Utilisable par :
  - Comic Generator  : via NarrativeAdapter pour la continuité entre chapitres
  - Recap Engine     : via RecapPipeline pour annoter les scènes extraites
  - StoryCore UI     : pour afficher la progression et proposer de continuer
"""

import json
import logging
import re
from copy import deepcopy
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from uuid import uuid4

logger = logging.getLogger(__name__)


# ============================================================================
# EXTRACTED NARRATIVE TYPES
# ============================================================================


@dataclass
class ExtractedCharacter:
    """
    Portrait d'un personnage extrait depuis un chapitre.
    Rassemble tout ce qu'on sait de lui APRÈS ce chapitre.
    """

    character_id: str
    character_name: str

    # Position narrative
    role: str = "character"  # "hero" | "villain" | "ally" | "mentor" | "neutral"
    emotional_state: str = "neutral"  # État émotionnel en fin de chapitre
    physical_state: str = "healthy"  # État physique en fin de chapitre
    arc_status: str = "active"  # "active" | "resolved" | "missing" | "deceased"

    # Dernière position / contexte
    last_location: Optional[str] = None
    last_seen_page: Optional[int] = None

    # Évolution narrative
    transformations: List[str] = field(default_factory=list)  # Ce qui lui est arrivé
    relationships: Dict[str, str] = field(default_factory=dict)  # char_id → description
    active_objects: List[str] = field(default_factory=list)  # Objets portés/utilisés

    # Dialogue marquant (pour voiceover futur)
    memorable_quotes: List[str] = field(default_factory=list)

    # Données visuelles (pour cohérence image)
    visual_identity: Dict[str, Any] = field(default_factory=dict)

    # Importance dans ce chapitre (0.0 – 1.0)
    chapter_importance: float = 0.5

    # Nombre de panels/scènes d'apparition
    appearance_count: int = 0


@dataclass
class ExtractedLocation:
    """Lieu visité dans ce chapitre avec sa charge narrative."""

    location_id: Optional[str]
    location_name: str
    location_type: str = "unknown"  # "interior" | "exterior" | "virtual" | "flashback"
    atmosphere: str = "neutral"  # "tense" | "calm" | "dramatic" | "mysterious"
    importance: float = 0.5  # 0.0 – 1.0
    visited_by: List[str] = field(default_factory=list)  # character_ids
    key_events: List[str] = field(default_factory=list)  # Événements marquants ici
    panel_count: int = 0


@dataclass
class ExtractedObject:
    """Objet narrativement significatif mentionné dans le chapitre."""

    object_id: Optional[str]
    object_name: str
    owner_id: Optional[str] = None  # Qui le possède au final
    status: str = "present"  # "acquired" | "lost" | "destroyed" | "present"
    narrative_role: str = "prop"  # "macguffin" | "weapon" | "symbol" | "prop"
    mentioned_pages: List[int] = field(default_factory=list)


@dataclass
class NarrativeArc:
    """Arc narratif (ouvert, fermé, ou nouveau après ce chapitre)."""

    arc_id: str
    title: str
    description: str
    status: str = "open"  # "open" | "closed" | "escalated" | "new"
    involved_characters: List[str] = field(default_factory=list)  # character_ids
    tension_level: float = 0.5  # 0.0 – 1.0
    chapter_opened: Optional[int] = None
    chapter_resolved: Optional[int] = None


@dataclass
class NarrativeMemory:
    """Mémoire narrative à 3 niveaux (miroir de ComicState)."""

    local: List[str] = field(default_factory=list)  # Événements de la dernière page
    arc: List[str] = field(default_factory=list)  # Événements du chapitre entier
    global_: List[str] = field(default_factory=list)  # Événements de toute la série


@dataclass
class ChapterContinuityPackage:
    """
    Package de continuité complet extrait d'un chapitre.

    Ce package est le "pont" entre les chapitres.
    Il est:
      - sauvegardé dans data/continuity/<project_id>/chapter_<N>.json
      - injecté automatiquement dans le Comic Generator ou Recap Engine
        pour le début du chapitre suivant
      - affiché dans l'UI pour que l'utilisateur choisisse comment continuer
    """

    package_id: str
    project_id: str
    source_type: str  # "comic_chapter" | "recap_timeline" | "manual"
    source_id: str  # ID du chapitre ou de la timeline
    chapter_number: int
    chapter_title: str

    # Contenu extrait
    characters: List[ExtractedCharacter] = field(default_factory=list)
    locations: List[ExtractedLocation] = field(default_factory=list)
    objects: List[ExtractedObject] = field(default_factory=list)
    arcs: List[NarrativeArc] = field(default_factory=list)
    memory: NarrativeMemory = field(default_factory=NarrativeMemory)

    # Résumé narratif (pour l'UI et le prompt du chapitre suivant)
    chapter_summary: str = ""
    cliffhanger: str = ""  # La dernière phrase marquante
    opening_hook_next: str = ""  # Suggestion d'accroche pour le chapitre suivant

    # Données de continuité visuelle
    visual_continuity: Dict[str, Any] = field(default_factory=dict)

    # Story arc position (0.0 – 1.0 de toute la série)
    global_story_progression: float = 0.0

    # Méta
    extracted_at: str = field(default_factory=lambda: datetime.now().isoformat())
    version: str = "1.0"


@dataclass
class ExtractionResult:
    success: bool
    package: Optional[ChapterContinuityPackage]
    warnings: List[str] = field(default_factory=list)
    error: Optional[str] = None


# ============================================================================
# NARRATIVE EXTRACTOR (Comic Chapter)
# ============================================================================


class NarrativeExtractor:
    """
    Analyse un chapitre BD (données JSON du Comic Generator) ou
    une timeline Recap Engine et produit un ChapterContinuityPackage.

    Usage depuis le Comic Generator :
        extractor = NarrativeExtractor()
        result = extractor.extract_from_comic_chapter(comic_data, chapter_id=1)

    Usage depuis le Recap Engine :
        result = extractor.extract_from_recap_timeline(timeline_data, chapter_id=1)
    """

    def __init__(self, output_dir: str = "data/continuity"):
        self._output_dir = Path(output_dir)
        self._output_dir.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def extract_from_comic_chapter(
        self,
        comic_data: Dict[str, Any],
        chapter_id: Optional[str] = None,
        chapter_number: int = 1,
        previous_package: Optional[ChapterContinuityPackage] = None,
    ) -> ExtractionResult:
        """
        Extrait la continuité depuis les données JSON d'un Comic Generator.

        comic_data : le dict JSON retourné par comic_pipeline.export()
        chapter_id : ID du chapitre dans comic_data (None = premier trouvé)
        previous_package : package du chapitre précédent pour la mémoire globale
        """
        warnings: List[str] = []
        project_id = comic_data.get("project_id", "unknown")

        try:
            # Trouver le chapitre
            chapters = comic_data.get("chapters", [])
            if not chapters:
                # Chercher les pages directement si pas de structure chapitre
                pages = comic_data.get("pages", [])
                if pages:
                    chapters = [
                        {
                            "id": chapter_id or "chapter_1",
                            "pages": pages,
                            "title": "Chapitre 1",
                            "chapter_number": chapter_number,
                        }
                    ]
                else:
                    return ExtractionResult(
                        success=False,
                        package=None,
                        error="Aucun chapitre ou page trouvé dans les données BD.",
                    )

            chapter = next(
                (c for c in chapters if c.get("id") == chapter_id), chapters[0]
            )
            pages = chapter.get("pages", [])

            if not pages:
                warnings.append("Aucune page dans ce chapitre — extraction limitée.")

            # Extraire les entités
            characters = self._extract_characters_from_pages(pages, comic_data)
            locations = self._extract_locations_from_pages(pages)
            objects = self._extract_objects(comic_data, pages)
            arcs = self._extract_arcs_from_pages(pages, characters, previous_package)
            memory = self._build_memory(pages, previous_package)

            summary = self._build_chapter_summary(pages, characters)
            cliffhanger = self._extract_cliffhanger(pages)
            next_hook = self._suggest_next_hook(arcs, characters, cliffhanger)
            visual_cont = self._build_visual_continuity(characters, comic_data)
            progression = self._compute_progression(
                chapter, comic_data, previous_package
            )

            package = ChapterContinuityPackage(
                package_id=str(uuid4()),
                project_id=project_id,
                source_type="comic_chapter",
                source_id=chapter.get("id", ""),
                chapter_number=chapter.get("chapter_number", chapter_number),
                chapter_title=chapter.get("title", f"Chapitre {chapter_number}"),
                characters=characters,
                locations=locations,
                objects=objects,
                arcs=arcs,
                memory=memory,
                chapter_summary=summary,
                cliffhanger=cliffhanger,
                opening_hook_next=next_hook,
                visual_continuity=visual_cont,
                global_story_progression=progression,
            )

            self._save_package(package)
            logger.info(
                f"[NarrativeExtractor] Package extrait : {package.package_id} "
                f"({len(characters)} persos, {len(locations)} lieux, {len(arcs)} arcs)"
            )
            return ExtractionResult(success=True, package=package, warnings=warnings)

        except Exception as e:
            logger.error(
                f"[NarrativeExtractor] Extraction échouée : {e}", exc_info=True
            )
            return ExtractionResult(success=False, package=None, error=str(e))

    def extract_from_recap_timeline(
        self,
        timeline_data: Dict[str, Any],
        chapter_number: int = 1,
        previous_package: Optional[ChapterContinuityPackage] = None,
    ) -> ExtractionResult:
        """
        Extrait la continuité depuis une timeline Recap Engine.

        timeline_data : le dict JSON d'une RecapTimeline sérialisée
        """
        warnings: List[str] = []
        project_id = timeline_data.get("project_id", "unknown")

        try:
            scenes = timeline_data.get("scenes", [])
            char_styles = timeline_data.get("character_styles", {})

            if not scenes:
                warnings.append("Aucune scène dans la timeline.")

            # Construire un mapping faux-page depuis les scènes recap
            self._scenes_to_fake_pages(scenes)

            # Extraire les personnages depuis les styles + scènes
            characters = self._extract_characters_from_recap(scenes, char_styles)
            locations = self._extract_locations_from_scenes(scenes)
            objects = []  # Les recaps ne portent pas d'info objet structurée
            arcs = self._extract_arcs_from_scenes(scenes, characters, previous_package)
            memory = self._build_memory_from_scenes(scenes, previous_package)

            summary = timeline_data.get(
                "subtitle", ""
            ) or self._build_summary_from_scenes(scenes)
            cliffhanger = self._extract_cliffhanger_from_scenes(scenes)
            next_hook = self._suggest_next_hook(arcs, characters, cliffhanger)
            visual_cont = self._build_visual_continuity_from_recap(char_styles)
            progression = min(1.0, chapter_number * 0.15)  # Estimation

            package = ChapterContinuityPackage(
                package_id=str(uuid4()),
                project_id=project_id,
                source_type="recap_timeline",
                source_id=timeline_data.get("timeline_id", ""),
                chapter_number=chapter_number,
                chapter_title=timeline_data.get("title", f"Chapitre {chapter_number}"),
                characters=characters,
                locations=locations,
                objects=objects,
                arcs=arcs,
                memory=memory,
                chapter_summary=summary,
                cliffhanger=cliffhanger,
                opening_hook_next=next_hook,
                visual_continuity=visual_cont,
                global_story_progression=progression,
            )

            self._save_package(package)
            return ExtractionResult(success=True, package=package, warnings=warnings)

        except Exception as e:
            logger.error(
                f"[NarrativeExtractor] Extraction recap échouée : {e}", exc_info=True
            )
            return ExtractionResult(success=False, package=None, error=str(e))

    def load_package(
        self,
        project_id: str,
        chapter_number: int,
    ) -> Optional[ChapterContinuityPackage]:
        """Charge un package de continuité depuis le disque."""
        path = self._package_path(project_id, chapter_number)
        if not path.exists():
            return None
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return self._deserialize_package(data)
        except Exception as e:
            logger.error(f"[NarrativeExtractor] Erreur chargement package : {e}")
            return None

    def list_packages(self, project_id: str) -> List[Dict[str, Any]]:
        """Liste tous les packages de continuité d'un projet."""
        project_dir = self._output_dir / project_id
        if not project_dir.exists():
            return []
        results = []
        for f in sorted(project_dir.glob("chapter_*.json")):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                results.append(
                    {
                        "package_id": data.get("package_id"),
                        "chapter_number": data.get("chapter_number"),
                        "chapter_title": data.get("chapter_title"),
                        "source_type": data.get("source_type"),
                        "characters_count": len(data.get("characters", [])),
                        "arcs_count": len(data.get("arcs", [])),
                        "global_story_progression": data.get(
                            "global_story_progression", 0
                        ),
                        "extracted_at": data.get("extracted_at"),
                        "cliffhanger": data.get("cliffhanger", ""),
                        "opening_hook_next": data.get("opening_hook_next", ""),
                    }
                )
            except Exception:
                pass
        return results

    def to_comic_generator_input(
        self,
        package: ChapterContinuityPackage,
    ) -> Dict[str, Any]:
        """
        Convertit un package de continuité en données d'entrée
        pour le Comic Generator (prochain chapitre).

        Retourne le dict attendu par PageGenerationRequest.
        """
        characters = [
            {
                "character_id": c.character_id,
                "name": c.character_name,
                "role": {"archetype": c.role},
                "archetype": c.role,
                "visual_identity": c.visual_identity,
                # État en fin du chapitre précédent
                "continuation_state": {
                    "emotional_state": c.emotional_state,
                    "physical_state": c.physical_state,
                    "arc_status": c.arc_status,
                    "last_location": c.last_location,
                    "transformations": c.transformations,
                    "relationships": c.relationships,
                    "active_objects": c.active_objects,
                },
            }
            for c in package.characters
            if c.arc_status not in ("deceased", "resolved")
        ]

        locations = [
            {
                "location_id": loc.location_id,
                "name": loc.location_name,
                "location_type": loc.location_type,
                "metadata": {
                    "description": f"Lieu visité au chapitre {package.chapter_number}.",
                    "atmosphere": loc.atmosphere,
                },
            }
            for loc in package.locations
        ]

        objects = [
            {
                "object_id": obj.object_id,
                "name": obj.object_name,
                "owner_id": obj.owner_id,
                "narrative_role": obj.narrative_role,
                "status": obj.status,
            }
            for obj in package.objects
            if obj.status not in ("destroyed",)
        ]

        # Construire un NarrativeCheckpoint compatible
        from datetime import datetime

        narrative_checkpoint = {
            "checkpoint_id": package.package_id,
            "page_id": "",
            "page_number": 0,
            "story_arc_position": package.global_story_progression,
            "active_characters": [
                {
                    "character_id": c.character_id,
                    "character_name": c.character_name,
                    "emotional_state": c.emotional_state,
                    "physical_state": c.physical_state,
                    "location": c.last_location,
                    "relationships": c.relationships,
                    "active_objects": c.active_objects,
                    "last_seen_page": c.last_seen_page,
                }
                for c in package.characters[:5]
            ],
            "revealed_secrets": [
                arc.description for arc in package.arcs if arc.status == "closed"
            ],
            "active_conflicts": [
                arc.title for arc in package.arcs if arc.status in ("open", "escalated")
            ],
            "last_dramatic_event": package.cliffhanger or package.chapter_summary,
            "story_summary": package.chapter_summary,
            "created_at": datetime.now().isoformat(),
        }

        return {
            "project_id": package.project_id,
            "story_context": self._build_continuation_context(package),
            "characters": characters,
            "locations": locations,
            "objects": objects,
            "narrative_checkpoint": narrative_checkpoint,
            "global_memory": package.memory.global_,
            "arc_memory": package.memory.arc,
            "chapter_number": package.chapter_number + 1,
            "opening_hook": package.opening_hook_next,
        }

    # ------------------------------------------------------------------
    # Extraction from Comic Pages
    # ------------------------------------------------------------------

    def _extract_characters_from_pages(
        self,
        pages: List[Dict[str, Any]],
        comic_data: Dict[str, Any],
    ) -> List[ExtractedCharacter]:
        """Extrait les personnages depuis les pages BD."""
        char_map: Dict[str, ExtractedCharacter] = {}

        for page in pages:
            page_num = page.get("page_number", 0)
            for panel in page.get("panels", []):
                char_ids = panel.get("characters", [])
                char_names = panel.get("character_names", [])
                beat = panel.get("narrative_beat", "setup")

                for cid, cname in zip(char_ids, char_names):
                    if cid not in char_map:
                        char_map[cid] = ExtractedCharacter(
                            character_id=cid,
                            character_name=cname,
                        )
                    c = char_map[cid]
                    c.appearance_count += 1
                    c.last_seen_page = page_num
                    c.last_location = panel.get("location", c.last_location)

                    # Mettre à jour l'état émotionnel selon le beat
                    c.emotional_state = self._beat_to_emotional_state(beat)

                    # Dialogues mémorables
                    for dlg in panel.get("dialogue", []):
                        if (
                            dlg.get("character_id") == cid
                            and len(dlg.get("text", "")) > 20
                        ):
                            if dlg["text"] not in c.memorable_quotes:
                                c.memorable_quotes.append(dlg["text"])

        # Récupérer les visuels depuis les données source
        source_chars = comic_data.get("characters", [])
        for sc in source_chars:
            cid = sc.get("id", sc.get("character_id", ""))
            if cid in char_map:
                char_map[cid].visual_identity = sc.get("visual_identity", {})
                char_map[cid].role = (
                    sc.get("role", {}).get("archetype", "character")
                    if isinstance(sc.get("role"), dict)
                    else sc.get("archetype", "character")
                )

        # Calculer l'importance relative
        max_count = max((c.appearance_count for c in char_map.values()), default=1)
        for c in char_map.values():
            c.chapter_importance = min(1.0, c.appearance_count / max(max_count, 1))
            c.memorable_quotes = c.memorable_quotes[:3]  # Garder les 3 meilleures

        return sorted(char_map.values(), key=lambda c: -c.chapter_importance)

    def _extract_locations_from_pages(
        self,
        pages: List[Dict[str, Any]],
    ) -> List[ExtractedLocation]:
        """Extrait les lieux visités depuis les pages."""
        loc_map: Dict[str, ExtractedLocation] = {}

        for page in pages:
            for panel in page.get("panels", []):
                loc_name = panel.get("location", "")
                if not loc_name or loc_name.lower() in ("unknown", ""):
                    continue

                beat = panel.get("narrative_beat", "setup")
                chars = panel.get("characters", [])

                if loc_name not in loc_map:
                    loc_map[loc_name] = ExtractedLocation(
                        location_id=panel.get("location_id"),
                        location_name=loc_name,
                        atmosphere=self._beat_to_atmosphere(beat),
                    )

                loc = loc_map[loc_name]
                loc.panel_count += 1
                for cid in chars:
                    if cid not in loc.visited_by:
                        loc.visited_by.append(cid)
                if beat in ("climax", "revelation"):
                    summary = panel.get("visual_cue", "")[:80]
                    if summary and summary not in loc.key_events:
                        loc.key_events.append(summary)

        # Calculer l'importance relative
        max_count = max((l.panel_count for l in loc_map.values()), default=1)
        for loc in loc_map.values():
            loc.importance = min(1.0, loc.panel_count / max(max_count, 1))

        return sorted(loc_map.values(), key=lambda l: -l.importance)

    def _extract_objects(
        self,
        comic_data: Dict[str, Any],
        pages: List[Dict[str, Any]],
    ) -> List[ExtractedObject]:
        """Extrait les objets narratifs depuis les données source et les dialogues."""
        objects: List[ExtractedObject] = []

        # Objets définis dans les données StoryCore
        for obj in comic_data.get("objects", []):
            objects.append(
                ExtractedObject(
                    object_id=obj.get("id", obj.get("object_id")),
                    object_name=obj.get("name", "Objet"),
                    owner_id=obj.get("owner_id"),
                    status=obj.get("status", "present"),
                    narrative_role=obj.get("narrative_role", "prop"),
                )
            )

        # Détecter les objets mentionnés dans les dialogues (heuristique simple)
        object_keywords = [
            "épée",
            "arme",
            "clé",
            "carte",
            "cristal",
            "artefact",
            "livre",
            "journal",
            "lettre",
            "bague",
            "masque",
            "shield",
            "sword",
            "key",
            "crystal",
            "artifact",
            "device",
            "weapon",
            "map",
        ]
        for page in pages:
            page_num = page.get("page_number", 0)
            for panel in page.get("panels", []):
                for dlg in panel.get("dialogue", []):
                    text_lower = dlg.get("text", "").lower()
                    for kw in object_keywords:
                        if kw in text_lower:
                            # Vérifier si déjà dans la liste
                            if not any(o.object_name.lower() == kw for o in objects):
                                objects.append(
                                    ExtractedObject(
                                        object_id=None,
                                        object_name=kw.capitalize(),
                                        narrative_role="mentioned",
                                        mentioned_pages=[page_num],
                                    )
                                )
                            break

        return objects

    def _extract_arcs_from_pages(
        self,
        pages: List[Dict[str, Any]],
        characters: List[ExtractedCharacter],
        previous_package: Optional[ChapterContinuityPackage],
    ) -> List[NarrativeArc]:
        """Déduit les arcs narratifs depuis les beats des pages."""
        arcs: List[NarrativeArc] = []
        all_char_ids = [c.character_id for c in characters]

        # Hériter des arcs ouverts du chapitre précédent
        if previous_package:
            for prev_arc in previous_package.arcs:
                if prev_arc.status in ("open", "escalated"):
                    inherited = deepcopy(prev_arc)
                    # Réévaluer le statut selon les beats du chapitre actuel
                    beats = [
                        panel.get("narrative_beat", "")
                        for page in pages
                        for panel in page.get("panels", [])
                    ]
                    if "resolution" in beats:
                        inherited.status = "closed"
                        inherited.chapter_resolved = (
                            pages[0].get("page_number", 0) if pages else 0
                        )
                    elif "climax" in beats:
                        inherited.status = "escalated"
                    arcs.append(inherited)

        # Détecter les nouveaux arcs depuis les révélations
        revelation_panels = [
            panel
            for page in pages
            for panel in page.get("panels", [])
            if panel.get("narrative_beat") == "revelation"
        ]
        for panel in revelation_panels:
            arc_title = f"Révélation — {panel.get('location', 'scène inconnue')}"
            if not any(a.title == arc_title for a in arcs):
                arcs.append(
                    NarrativeArc(
                        arc_id=str(uuid4())[:8],
                        title=arc_title,
                        description=panel.get("visual_cue", "")[:120],
                        status="open",
                        involved_characters=panel.get("characters", [])[:3],
                        tension_level=0.7,
                    )
                )

        # Arc principal (toujours présent)
        if not arcs:
            protagonist = characters[0] if characters else None
            arcs.append(
                NarrativeArc(
                    arc_id=str(uuid4())[:8],
                    title="Arc principal",
                    description=f"L'histoire de {protagonist.character_name if protagonist else 'nos héros'}.",
                    status="open",
                    involved_characters=all_char_ids[:3],
                    tension_level=0.5,
                )
            )

        return arcs

    def _build_memory(
        self,
        pages: List[Dict[str, Any]],
        previous_package: Optional[ChapterContinuityPackage],
    ) -> NarrativeMemory:
        """Construit la mémoire narrative à 3 niveaux."""
        # Local: résumés des 2 dernières pages
        local = [
            page.get("narrative_summary", "")
            for page in pages[-2:]
            if page.get("narrative_summary")
        ]

        # Arc: résumés de toutes les pages du chapitre
        arc = [
            page.get("narrative_summary", "")
            for page in pages
            if page.get("narrative_summary")
        ][:10]  # Max 10 entrées

        # Global: hérité + résumé global du chapitre
        global_ = []
        if previous_package:
            global_ = previous_package.memory.global_[-8:]  # Garder 8 derniers
        chapter_summary = self._build_chapter_summary(pages, [])
        if chapter_summary:
            global_.append(chapter_summary)

        return NarrativeMemory(local=local, arc=arc, global_=global_)

    # ------------------------------------------------------------------
    # Extraction from Recap Scenes
    # ------------------------------------------------------------------

    def _extract_characters_from_recap(
        self,
        scenes: List[Dict[str, Any]],
        char_styles: Dict[str, Any],
    ) -> List[ExtractedCharacter]:
        """Extrait les personnages depuis les scènes recap + leurs styles."""
        char_map: Dict[str, ExtractedCharacter] = {}

        for scene in scenes:
            narrator_id = scene.get("narrator_character_id", "narrator")
            page_num = scene.get("source_page_number", 0)

            if narrator_id and narrator_id != "narrator":
                if narrator_id not in char_map and narrator_id in char_styles:
                    cs = char_styles[narrator_id]
                    char_map[narrator_id] = ExtractedCharacter(
                        character_id=narrator_id,
                        character_name=cs.get("character_name", narrator_id),
                        role=cs.get("narrator_role", "character"),
                    )
                if narrator_id in char_map:
                    char_map[narrator_id].appearance_count += 1
                    char_map[narrator_id].last_seen_page = page_num

        # Ajouter tous les personnages depuis les styles (même sans scènes)
        for cid, cs in char_styles.items():
            if cid not in char_map:
                char_map[cid] = ExtractedCharacter(
                    character_id=cid,
                    character_name=cs.get("character_name", cid),
                    role=cs.get("narrator_role", "character"),
                )

        # Calcul importance
        max_count = max((c.appearance_count for c in char_map.values()), default=1)
        for c in char_map.values():
            c.chapter_importance = c.appearance_count / max(max_count, 1)

        return sorted(char_map.values(), key=lambda c: -c.chapter_importance)

    def _extract_locations_from_scenes(
        self,
        scenes: List[Dict[str, Any]],
    ) -> List[ExtractedLocation]:
        """Extrait les lieux depuis les narrations des scènes (heuristique)."""
        loc_names: Dict[str, int] = {}

        for scene in scenes:
            text = scene.get("narration_text", "")
            # Chercher les patterns de lieu dans le texte de narration
            for match in re.finditer(
                r"\b(?:à|dans|sur|au|en)\s+([A-Z][a-zA-Zé-àÀ-ÿ ]{3,30})", text
            ):
                loc = match.group(1).strip()
                loc_names[loc] = loc_names.get(loc, 0) + 1

        locations = []
        for name, count in sorted(loc_names.items(), key=lambda x: -x[1])[:8]:
            locations.append(
                ExtractedLocation(
                    location_id=None,
                    location_name=name,
                    panel_count=count,
                    importance=min(1.0, count / 5),
                )
            )
        return locations

    def _extract_arcs_from_scenes(
        self,
        scenes: List[Dict[str, Any]],
        characters: List[ExtractedCharacter],
        previous_package: Optional[ChapterContinuityPackage],
    ) -> List[NarrativeArc]:
        """Déduit les arcs depuis les camera moves (tension = escalade, etc.)."""
        arcs: List[NarrativeArc] = []
        all_char_ids = [c.character_id for c in characters]

        if previous_package:
            for prev_arc in previous_package.arcs:
                if prev_arc.status in ("open", "escalated"):
                    inherited = deepcopy(prev_arc)
                    # Shake = climax = escalade
                    has_shake = any(s.get("camera_move") == "shake" for s in scenes)
                    if has_shake:
                        inherited.status = "escalated"
                        inherited.tension_level = min(
                            1.0, inherited.tension_level + 0.2
                        )
                    arcs.append(inherited)

        if not arcs:
            arcs.append(
                NarrativeArc(
                    arc_id=str(uuid4())[:8],
                    title="Arc principal",
                    description="L'histoire continue…",
                    status="open",
                    involved_characters=all_char_ids[:3],
                    tension_level=0.5,
                )
            )

        return arcs

    def _build_memory_from_scenes(
        self,
        scenes: List[Dict[str, Any]],
        previous_package: Optional[ChapterContinuityPackage],
    ) -> NarrativeMemory:
        local = [
            s.get("narration_text", "")[:80]
            for s in scenes[-2:]
            if s.get("narration_text")
        ]
        arc = [
            s.get("narration_text", "")[:80] for s in scenes if s.get("narration_text")
        ][:10]
        global_ = []
        if previous_package:
            global_ = previous_package.memory.global_[-8:]
        return NarrativeMemory(local=local, arc=arc, global_=global_)

    def _build_summary_from_scenes(self, scenes: List[Dict[str, Any]]) -> str:
        texts = [s.get("narration_text", "") for s in scenes if s.get("narration_text")]
        if not texts:
            return "Un chapitre de l'histoire."
        return texts[0][:200] + ("…" if len(texts[0]) > 200 else "")

    def _extract_cliffhanger_from_scenes(self, scenes: List[Dict[str, Any]]) -> str:
        if not scenes:
            return ""
        last = scenes[-1].get("narration_text", "")
        return last[:150] + ("…" if len(last) > 150 else "")

    def _build_visual_continuity_from_recap(
        self,
        char_styles: Dict[str, Any],
    ) -> Dict[str, Any]:
        return {
            cid: {
                "frame_color": cs.get("frame_color", "#ffffff"),
                "voice_id": cs.get("voice_id", ""),
                "narrator_role": cs.get("narrator_role", "character"),
            }
            for cid, cs in char_styles.items()
        }

    def _scenes_to_fake_pages(
        self, scenes: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Groupe les scènes par page pour l'extraction."""
        pages: Dict[int, Dict[str, Any]] = {}
        for scene in scenes:
            pnum = scene.get("source_page_number", 0)
            if pnum not in pages:
                pages[pnum] = {
                    "page_number": pnum,
                    "panels": [],
                    "narrative_summary": "",
                }
            pages[pnum]["panels"].append(
                {
                    "characters": [],
                    "location": "",
                    "narrative_beat": "setup",
                    "dialogue": [],
                    "visual_cue": scene.get("narration_text", ""),
                }
            )
        return list(pages.values())

    # ------------------------------------------------------------------
    # Helpers / Utilities
    # ------------------------------------------------------------------

    def _beat_to_emotional_state(self, beat: str) -> str:
        return {
            "setup": "calm",
            "tension": "anxious",
            "revelation": "shocked",
            "climax": "intense",
            "resolution": "relieved",
            "transition": "pensive",
        }.get(beat, "neutral")

    def _beat_to_atmosphere(self, beat: str) -> str:
        return {
            "setup": "calm",
            "tension": "tense",
            "revelation": "mysterious",
            "climax": "dramatic",
            "resolution": "peaceful",
            "transition": "neutral",
        }.get(beat, "neutral")

    def _build_chapter_summary(
        self,
        pages: List[Dict[str, Any]],
        characters: List[ExtractedCharacter],
    ) -> str:
        summaries = [
            p.get("narrative_summary", "") for p in pages if p.get("narrative_summary")
        ]
        if not summaries:
            return "Un chapitre de l'histoire."
        # Prendre premier + dernier résumé
        if len(summaries) == 1:
            return summaries[0]
        return f"{summaries[0]} … {summaries[-1]}"

    def _extract_cliffhanger(self, pages: List[Dict[str, Any]]) -> str:
        if not pages:
            return ""
        last_page = pages[-1]
        panels = last_page.get("panels", [])
        if not panels:
            return last_page.get("narrative_summary", "")
        last_panel = panels[-1]
        dialogues = last_panel.get("dialogue", [])
        if dialogues:
            return dialogues[-1].get("text", "")[:150]
        return last_panel.get("visual_cue", "")[:150]

    def _suggest_next_hook(
        self,
        arcs: List[NarrativeArc],
        characters: List[ExtractedCharacter],
        cliffhanger: str,
    ) -> str:
        open_arcs = [a for a in arcs if a.status in ("open", "escalated")]
        primary_char = characters[0].character_name if characters else "le héros"

        if cliffhanger and open_arcs:
            return (
                f"Suite directe du cliffhanger. {primary_char} doit faire face à "
                f"'{open_arcs[0].title}'. Commencer in medias res."
            )
        elif open_arcs:
            return (
                f"Reprendre là où on s'est arrêtés : {open_arcs[0].description[:100]}"
            )
        return f"Nouveau départ pour {primary_char} — ellipse temporelle recommandée."

    def _build_visual_continuity(
        self,
        characters: List[ExtractedCharacter],
        comic_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        return {
            c.character_id: {
                "visual_identity": c.visual_identity,
                "frame_color": comic_data.get("character_styles", {})
                .get(c.character_id, {})
                .get("frame_color", "#ffffff"),
            }
            for c in characters
        }

    def _compute_progression(
        self,
        chapter: Dict[str, Any],
        comic_data: Dict[str, Any],
        previous_package: Optional[ChapterContinuityPackage],
    ) -> float:
        if previous_package:
            return min(1.0, previous_package.global_story_progression + 0.15)
        chapter_num = chapter.get("chapter_number", 1)
        total_chapters = len(comic_data.get("chapters", [1]))
        return round(chapter_num / max(total_chapters, 1), 2)

    def _build_continuation_context(
        self,
        package: ChapterContinuityPackage,
    ) -> str:
        """Construit le story_context pour le chapitre suivant."""
        lines = [
            f"Suite du chapitre {package.chapter_number} : «{package.chapter_title}».",
            "",
            f"Résumé : {package.chapter_summary}",
        ]
        if package.cliffhanger:
            lines.append(f"Cliffhanger : «{package.cliffhanger}»")
        if package.memory.global_:
            lines.append("\nMémoire globale de la série :")
            for mem in package.memory.global_[-4:]:
                lines.append(f"  - {mem}")
        open_arcs = [a for a in package.arcs if a.status in ("open", "escalated")]
        if open_arcs:
            lines.append("\nArcs en suspens :")
            for arc in open_arcs[:3]:
                lines.append(f"  - {arc.title} ({arc.status}) : {arc.description[:80]}")
        return "\n".join(lines)

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def _package_path(self, project_id: str, chapter_number: int) -> Path:
        return self._output_dir / project_id / f"chapter_{chapter_number:03d}.json"

    def _save_package(self, package: ChapterContinuityPackage) -> None:
        path = self._package_path(package.project_id, package.chapter_number)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(asdict(package), indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        logger.info(f"[NarrativeExtractor] Package sauvegardé : {path}")

    def _deserialize_package(self, data: Dict[str, Any]) -> ChapterContinuityPackage:
        """Reconstruit un ChapterContinuityPackage depuis un dict JSON."""
        characters = [ExtractedCharacter(**c) for c in data.get("characters", [])]
        locations = [ExtractedLocation(**l) for l in data.get("locations", [])]
        objects = [ExtractedObject(**o) for o in data.get("objects", [])]
        arcs = [NarrativeArc(**a) for a in data.get("arcs", [])]
        mem_data = data.get("memory", {})
        memory = NarrativeMemory(
            local=mem_data.get("local", []),
            arc=mem_data.get("arc", []),
            global_=mem_data.get("global_", []),
        )
        without_nested = {
            k: v
            for k, v in data.items()
            if k not in ("characters", "locations", "objects", "arcs", "memory")
        }
        return ChapterContinuityPackage(
            **without_nested,
            characters=characters,
            locations=locations,
            objects=objects,
            arcs=arcs,
            memory=memory,
        )
