
import sys
import os
from pathlib import Path

# Add root to sys.path
root = str(Path(__file__).parent.parent)
sys.path.append(root)

def test_api_imports():
    print("Testing API and Service imports...")
    try:
        from backend.high_impact_api import router
        from backend.high_impact_service import high_impact_service
        print("✅ Imports successful")
        
        # Test a service method with mock data
        import asyncio
        import io
        from PIL import Image
        
        # Create a tiny mock image
        img = Image.new('RGB', (64, 64), color = 'red')
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='JPEG')
        image_bytes = img_byte_arr.getvalue()
        
        print("Testing recognize_face service...")
        result = asyncio.run(high_impact_service.recognize_face(image_bytes))
        print(f"Recognize Result: {result.get('success')}")
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    test_api_imports()
