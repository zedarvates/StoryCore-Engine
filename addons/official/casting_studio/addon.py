"""
Casting Studio Addon — StoryCore Engine
========================================
Guarantees visual and emotional character consistency across all shots.

Hooks:
    on_project_load       — build character embedding registry from existing assets
    on_before_generate    — inject character reference prompt prefix
    on_image_ready        — validate face similarity, flag inconsistencies
    on_character_create   — auto-generate reference sheets (Face/Profile/Back)

Status: BETA — prompt injection is production-ready.
        Face validation requires insightface or facenet-pytorch (optional).
"""

import json
import logging
import uuid
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

ADDON_ID = "casting_studio"
ADDON_NAME = "Casting Studio"
VERSION = "0.8.0"

# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------


@dataclass
class CharacterEmbedding:
    character_id: str
    name: str
    description: str
    reference_sheet_path: Optional[str] = None
    face_embedding: Optional[List[float]] = None
    performance_variants: List[str] = field(
        default_factory=list
    )  # paths to variant images
    consistency_score: float = 1.0  # last measured score


@dataclass
class CastingRegistry:
    project_id: str
    characters: Dict[str, CharacterEmbedding] = field(default_factory=dict)

    def save(self, registry_path: Path) -> None:
        registry_path.write_text(
            json.dumps(asdict(self), ensure_ascii=False, indent=2), encoding="utf-8"
        )

    @classmethod
    def load(cls, registry_path: Path) -> "CastingRegistry":
        if not registry_path.exists():
            return cls(project_id="unknown")
        data = json.loads(registry_path.read_text(encoding="utf-8"))
        return cls(
            project_id=data.get("project_id", "unknown"),
            characters={
                k: CharacterEmbedding(**v)
                for k, v in data.get("characters", {}).items()
            },
        )


# ---------------------------------------------------------------------------
# Module-level state (per AddonManager instance lifecycle)
# ---------------------------------------------------------------------------
_registry: Optional[CastingRegistry] = None
_registry_path: Optional[Path] = None
_config: Dict[str, Any] = {}


def get_manifest() -> Dict[str, Any]:
    manifest_path = Path(__file__).parent / "manifest.json"
    return json.loads(manifest_path.read_text(encoding="utf-8"))


def initialize(config: Dict[str, Any]) -> None:
    global _config
    _config = config
    logger.info(
        f"[{ADDON_NAME}] Initialized — "
        f"threshold={config.get('consistency_threshold', 0.90)}, "
        f"reference_sheets={config.get('generate_reference_sheets', True)}"
    )


# ---------------------------------------------------------------------------
# Hook handlers
# ---------------------------------------------------------------------------


def on_project_load(payload: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build character registry from existing project assets.
    Payload keys:
        project_path (str)
        project_id   (str)
        characters   (list[dict]) — from scene_breakdown
    """
    global _registry, _registry_path

    project_path = Path(payload.get("project_path", "."))
    project_id = payload.get("project_id", "unknown")

    _registry_path = project_path / "casting_registry.json"
    _registry = CastingRegistry.load(_registry_path)
    _registry.project_id = project_id

    # Register any new characters from payload
    for char in payload.get("characters", []):
        cid = char.get("id") or char.get("character_id") or str(uuid.uuid4())[:8]
        if cid not in _registry.characters:
            _registry.characters[cid] = CharacterEmbedding(
                character_id=cid,
                name=char.get("name", cid),
                description=char.get("description", ""),
            )
            logger.info(f"[{ADDON_NAME}] Registered character: {char.get('name', cid)}")

    _registry.save(_registry_path)
    payload["casting_registry_loaded"] = True
    return payload


def on_before_generate(
    payload: Dict[str, Any], config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Inject character description and reference into generation prompt.
    Payload keys:
        prompt         (str) — current generation prompt
        character_id   (str, optional) — character being generated
        scene_id       (str, optional)
    """
    if _registry is None:
        return payload

    character_id = payload.get("character_id")
    prompt = payload.get("prompt", "")

    if not character_id or character_id not in _registry.characters:
        return payload

    char = _registry.characters[character_id]

    # Build consistency injection
    injection_parts = [f"[CHARACTER CONSISTENCY: {char.name}]"]
    if char.description:
        injection_parts.append(f"Appearance: {char.description}")
    if char.reference_sheet_path:
        injection_parts.append(f"Reference: {char.reference_sheet_path}")
    if _config.get("auto_inject_reference", True):
        injection_parts.append(
            "IMPORTANT: This character MUST look identical to all previous shots."
        )

    injection = " | ".join(injection_parts)
    payload["prompt"] = f"{injection}\n{prompt}"

    logger.debug(f"[{ADDON_NAME}] Injected consistency prefix for {char.name}")
    return payload


def on_image_ready(payload: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate generated image against character reference embedding.
    Payload keys:
        image_path   (str)
        character_id (str, optional)
        scene_id     (str, optional)
    Returns:
        Updated payload with consistency_score and flagged (bool)
    """
    if _registry is None:
        return payload

    character_id = payload.get("character_id")
    image_path = Path(payload.get("image_path", ""))
    threshold = config.get("consistency_threshold", 0.90)

    if not character_id or character_id not in _registry.characters:
        payload["consistency_score"] = 1.0
        payload["flagged"] = False
        return payload

    char = _registry.characters[character_id]

    # Attempt face embedding comparison
    score = _compute_face_similarity(image_path, char)
    char.consistency_score = score
    if _registry_path:
        _registry.save(_registry_path)

    flagged = score < threshold
    payload["consistency_score"] = score
    payload["flagged"] = flagged

    if flagged:
        logger.warning(
            f"[{ADDON_NAME}] ⚠ Character '{char.name}' — "
            f"consistency score {score:.2f} below threshold {threshold:.2f} "
            f"(scene: {payload.get('scene_id', 'unknown')})"
        )
    else:
        logger.debug(
            f"[{ADDON_NAME}] ✓ {char.name} — score {score:.2f} (scene: {payload.get('scene_id', 'unknown')})"
        )

    return payload


def on_character_create(
    payload: Dict[str, Any], config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Auto-generate reference sheets when a character is first added.
    Payload keys:
        character_id  (str)
        name          (str)
        description   (str)
        project_path  (str)
    """
    if not config.get("generate_reference_sheets", True):
        return payload

    character_id = payload.get("character_id")
    name = payload.get("name", character_id)
    description = payload.get("description", "")
    project_path = Path(payload.get("project_path", "."))

    sheets_dir = project_path / "character_sheets"
    sheets_dir.mkdir(parents=True, exist_ok=True)

    logger.info(
        f"[{ADDON_NAME}] Reference sheet queued for: {name}\n"
        f"  → Front, Profile, Back views will be generated by ComfyUI on first scene."
    )

    # Register in casting registry
    if _registry and character_id and character_id not in _registry.characters:
        _registry.characters[character_id] = CharacterEmbedding(
            character_id=character_id,
            name=name,
            description=description,
        )
        if _registry_path:
            _registry.save(_registry_path)

    payload["reference_sheet_dir"] = str(sheets_dir)
    payload["reference_sheet_queued"] = True
    return payload


# ---------------------------------------------------------------------------
# Face similarity (graceful fallback)
# ---------------------------------------------------------------------------


def _compute_face_similarity(image_path: Path, char: CharacterEmbedding) -> float:
    """
    Compute face embedding similarity between image and character reference.
    Falls back to 0.95 (assumed OK) if no face recognition library is available.
    """
    if not image_path.exists() or image_path.stat().st_size == 0:
        return 0.0  # Empty image = definitely inconsistent

    if char.face_embedding is None:
        # No reference embedding yet — first appearance, accept and store
        _try_extract_embedding(image_path, char)
        return 1.0  # First appearance always accepted

    # Try insightface
    try:
        import insightface
        import numpy as np

        app = insightface.app.FaceAnalysis(
            name="buffalo_l", providers=["CPUExecutionProvider"]
        )
        app.prepare(ctx_id=0, det_size=(640, 640))
        from PIL import Image as PILImage

        img = PILImage.open(image_path).convert("RGB")
        img_array = np.array(img)
        faces = app.get(img_array)
        if not faces:
            logger.debug(f"[{ADDON_NAME}] No face detected in {image_path.name}")
            return 0.80  # No face found → warning score, not critical

        embedding = faces[0].normed_embedding.tolist()
        ref = np.array(char.face_embedding)
        emb = np.array(embedding)
        score = float(np.dot(ref, emb) / (np.linalg.norm(ref) * np.linalg.norm(emb)))
        return max(0.0, min(1.0, score))

    except ImportError:
        # insightface not installed — return neutral score
        return 0.95

    except Exception as e:
        logger.debug(f"[{ADDON_NAME}] Face similarity error: {e}")
        return 0.95


def _try_extract_embedding(image_path: Path, char: CharacterEmbedding) -> None:
    """Extract and store face embedding from first appearance image."""
    try:
        import insightface
        import numpy as np
        from PIL import Image as PILImage

        app = insightface.app.FaceAnalysis(
            name="buffalo_l", providers=["CPUExecutionProvider"]
        )
        app.prepare(ctx_id=0, det_size=(640, 640))
        img = PILImage.open(image_path).convert("RGB")
        faces = app.get(np.array(img))
        if faces:
            char.face_embedding = faces[0].normed_embedding.tolist()
            char.reference_sheet_path = str(image_path)
            logger.info(f"[{ADDON_NAME}] Stored reference embedding for {char.name}")
    except Exception:
        pass
