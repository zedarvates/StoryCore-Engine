
import sys
import os
from pathlib import Path

root = str(Path(__file__).parent.parent)
sys.path.append(root)

try:
    from src.image_enhancement.skin_enhancer import SkinEnhancerEngine
    print("SkinEnhancerEngine imported")
    engine = SkinEnhancerEngine()
    import asyncio
    res = asyncio.run(engine.enhance(None))
    print(f"Result: {res}")
except Exception as e:
    import traceback
    traceback.print_exc()
