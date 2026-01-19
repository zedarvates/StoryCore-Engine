"""
Puppet & Layer Engine - Stage 5 of 10-Stage Multimodal Pipeline
Generates puppet rigs and layer files (L0-L8) with metadata for AI generation.

Follows DOCUMENT 24 — GLOBAL PIPELINE ARCHI V2 and DOCUMENT 4 — STYLE & COHERENCE BIBL V2

This module has been refactored into smaller components:
- core.py: Core configuration and processing
- generators.py: Puppet and layer generation methods
- metadata.py: Metadata generation methods
- utils.py: Utility calculation methods
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Tuple
import hashlib

from .puppet.core import PuppetLayerEngineCore
from .puppet.generators import PuppetLayerGenerators
from .puppet.metadata import PuppetLayerMetadata
from .puppet.utils import PuppetLayerUtils


class PuppetLayerEngine(PuppetLayerEngineCore, PuppetLayerGenerators, PuppetLayerMetadata, PuppetLayerUtils):
    """Handles puppet rig generation and layer system creation."""