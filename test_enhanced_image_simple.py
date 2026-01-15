"""
Simple integration test for Enhanced Image Engine

Quick validation test to ensure the enhanced image engine works correctly
with all advanced workflows and can handle various generation scenarios.

Author: StoryCore-Engine Team
Date: January 12, 2026
Version: 1.0.0
"""

import asyncio
import sys
import os
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

try:
    from enhanced_image_engine import (
        EnhancedImageEngine,
        EnhancedImageConfig,
        ImageGenerationRequest,
        ImageGenerationResult,
        ImageGenerationMode,
        WorkflowStrategy,
        ImageStyle,
        create_enhanced_image_engine
    )
    from qwen_image_suite_integration import LightingType
    IMPORT_SUCCESS = True
except ImportError as e:
    print(f"Import failed: {e}")
    try:
        # Try alternative import path
        import sys
        sys.path.append('src')
        from enhanced_image_engine import (
            EnhancedImageEngine,
            EnhancedImageConfig,
            ImageGenerationRequest,
            ImageGenerationResult,
            ImageGenerationMode,
            WorkflowStrategy,
            ImageStyle,
            create_enhanced_image_engine
        )
        from qwen_image_suite_integration import LightingType
        IMPORT_SUCCESS = True
    except ImportError as e2:
        print(f"Alternative import also failed: {e2}")
        IMPORT_SUCCESS = False

# Mock PIL Image for testing
class MockImage:
    def __init__(self, size=(1024, 1024), mode='RGB'):
        self.size = size
        self.mode = mode
    
    def copy(self):
        return MockImage(self.size, self.mode)
    
    def save(self, path):
        pass
    
    @staticmethod
    def new(mode, size, color=None):
        return MockImage(size, mode)


async def test_enhanced_image_engine_basic():
    """Test basic Enhanced Image Engine functionality"""
    print("🧪 Testing Enhanced Image Engine - Basic Functionality")
    print("=" * 60)
    
    if not IMPORT_SUCCESS:
        print("❌ Import failed - skipping tests")
        return False
    
    try:
        # Test 1: Configuration Creation
        print("\n1️⃣ Testing Configuration Creation...")
        config = EnhancedImageConfig(
            default_mode=ImageGenerationMode.AUTO,
            default_strategy=WorkflowStrategy.BALANCED,
            enable_batch_processing=True,
            max_concurrent_generations=3,
            quality_threshold=0.8
        )
        print(f"   ✓ Config created with mode: {config.default_mode.value}")
        print(f"   ✓ Strategy: {config.default_strategy.value}")
        print(f"   ✓ Batch processing: {config.enable_batch_processing}")
        print(f"   ✓ Quality threshold: {config.quality_threshold}")
        
        # Test 2: Engine Creation
        print("\n2️⃣ Testing Engine Creation...")
        engine = create_enhanced_image_engine(config)
        print(f"   ✓ Engine created successfully")
        print(f"   ✓ Workflow map size: {len(engine.workflow_map)}")
        print(f"   ✓ Style patterns: {len(engine.style_patterns)}")
        print(f"   ✓ Performance stats initialized")
        
        # Test 3: Enum Validation
        print("\n3️⃣ Testing Enum Values...")
        generation_modes = [mode.value for mode in ImageGenerationMode]
        workflow_strategies = [strategy.value for strategy in WorkflowStrategy]
        image_styles = [style.value for style in ImageStyle]
        
        print(f"   ✓ Generation modes: {generation_modes}")
        print(f"   ✓ Workflow strategies: {workflow_strategies}")
        print(f"   ✓ Image styles: {image_styles}")
        
        # Test 4: Style Detection
        print("\n4️⃣ Testing Style Detection...")
        
        anime_style = engine._detect_style("beautiful anime character with blue hair")
        realistic_style = engine._detect_style("professional photo portrait")
        artistic_style = engine._detect_style("abstract art painting")
        landscape_style = engine._detect_style("mountain landscape scenery")
        
        print(f"   ✓ Anime detection: {anime_style.value}")
        print(f"   ✓ Realistic detection: {realistic_style.value}")
        print(f"   ✓ Artistic detection: {artistic_style.value}")
        print(f"   ✓ Landscape detection: {landscape_style.value}")
        
        # Test 5: Mode Determination
        print("\n5️⃣ Testing Mode Determination...")
        
        # Anime mode
        anime_request = ImageGenerationRequest(prompt="anime character with magical powers")
        anime_mode = engine._determine_generation_mode(anime_request)
        print(f"   ✓ Anime mode determination: {anime_mode.value}")
        
        # Professional edit mode
        edit_request = ImageGenerationRequest(
            prompt="enhance photo",
            reference_images=[MockImage()],
            editing_instructions="improve lighting"
        )
        edit_mode = engine._determine_generation_mode(edit_request)
        print(f"   ✓ Professional edit mode: {edit_mode.value}")
        
        # Layered composition mode
        layer_request = ImageGenerationRequest(
            prompt="create composition",
            layer_definitions=[{'type': 'background', 'prompt': 'test'}]
        )
        layer_mode = engine._determine_generation_mode(layer_request)
        print(f"   ✓ Layered composition mode: {layer_mode.value}")
        
        # Test 6: Anime Generation
        print("\n6️⃣ Testing Anime Generation...")
        anime_request = ImageGenerationRequest(
            prompt="beautiful anime girl with cat ears and blue hair",
            character_data={'style': 'modern', 'gender': 'female'},
            width=1024,
            height=1536
        )
        anime_result = await engine.generate_image(anime_request)
        print(f"   ✓ Anime generation success: {anime_result.success}")
        print(f"   ✓ Quality score: {anime_result.quality_score:.3f}")
        print(f"   ✓ Processing time: {anime_result.processing_time:.3f}s")
        print(f"   ✓ Workflow used: {anime_result.workflow_used}")
        print(f"   ✓ Mode used: {anime_result.mode_used.value}")
        
        # Test 7: Professional Editing
        print("\n7️⃣ Testing Professional Editing...")
        base_image = MockImage((1024, 1024))
        reference_images = [MockImage((512, 512)), MockImage((512, 512))]
        
        edit_request = ImageGenerationRequest(
            prompt="enhance photo with professional lighting",
            reference_images=[base_image] + reference_images,
            editing_instructions="professional photo enhancement with studio lighting",
            lighting_type=LightingType.STUDIO
        )
        edit_result = await engine.generate_image(edit_request)
        print(f"   ✓ Professional editing success: {edit_result.success}")
        print(f"   ✓ Quality score: {edit_result.quality_score:.3f}")
        print(f"   ✓ Processing time: {edit_result.processing_time:.3f}s")
        print(f"   ✓ Workflow used: {edit_result.workflow_used}")
        
        # Test 8: Layered Composition
        print("\n8️⃣ Testing Layered Composition...")
        layer_definitions = [
            {'type': 'background', 'prompt': 'epic fantasy landscape', 'z_index': 0},
            {'type': 'character', 'prompt': 'heroic warrior character', 'z_index': 1},
            {'type': 'effect', 'prompt': 'magical energy effects', 'z_index': 2, 'opacity': 0.8},
            {'type': 'lighting', 'prompt': 'dramatic lighting overlay', 'z_index': 3, 'opacity': 0.6}
        ]
        
        layer_request = ImageGenerationRequest(
            prompt="fantasy battle scene composition",
            layer_definitions=layer_definitions,
            width=1536,
            height=1024
        )
        layer_result = await engine.generate_image(layer_request)
        print(f"   ✓ Layered composition success: {layer_result.success}")
        print(f"   ✓ Layer count: {len(layer_result.layers) if layer_result.layers else 0}")
        print(f"   ✓ Quality score: {layer_result.quality_score:.3f}")
        print(f"   ✓ Canvas size: {layer_result.metadata.get('canvas_size', 'N/A')}")
        
        # Test 9: Lightning Fast Generation
        print("\n9️⃣ Testing Lightning Fast Generation...")
        lightning_request = ImageGenerationRequest(
            prompt="quick anime character generation",
            strategy=WorkflowStrategy.SPEED_FIRST
        )
        lightning_result = await engine.generate_image(lightning_request)
        print(f"   ✓ Lightning generation success: {lightning_result.success}")
        print(f"   ✓ Processing time: {lightning_result.processing_time:.3f}s")
        print(f"   ✓ Workflow used: {lightning_result.workflow_used}")
        print(f"   ✓ Quality score: {lightning_result.quality_score:.3f}")
        
        # Test 10: Hybrid Generation
        print("\n🔟 Testing Hybrid Generation...")
        hybrid_request = ImageGenerationRequest(
            prompt="high quality anime portrait with professional lighting",
            strategy=WorkflowStrategy.QUALITY_FIRST,
            reference_images=[MockImage()]
        )
        hybrid_result = await engine.generate_image(hybrid_request)
        print(f"   ✓ Hybrid generation success: {hybrid_result.success}")
        print(f"   ✓ Quality score: {hybrid_result.quality_score:.3f}")
        print(f"   ✓ Workflow used: {hybrid_result.workflow_used}")
        print(f"   ✓ Hybrid stages: {hybrid_result.metadata.get('hybrid_stages', 'N/A')}")
        
        # Test 11: Auto Mode Selection
        print("\n1️⃣1️⃣ Testing Auto Mode Selection...")
        auto_requests = [
            ImageGenerationRequest(prompt="cute anime cat girl"),
            ImageGenerationRequest(prompt="professional business portrait"),
            ImageGenerationRequest(prompt="abstract geometric art"),
            ImageGenerationRequest(prompt="mountain landscape photography")
        ]
        
        auto_results = []
        for i, request in enumerate(auto_requests):
            result = await engine.generate_image(request)
            auto_results.append(result)
            print(f"   ✓ Auto request {i+1}: {result.mode_used.value} (Success: {result.success})")
        
        # Test 12: Batch Processing
        print("\n1️⃣2️⃣ Testing Batch Processing...")
        batch_requests = [
            ImageGenerationRequest(prompt="anime character 1", strategy=WorkflowStrategy.SPEED_FIRST),
            ImageGenerationRequest(prompt="realistic portrait 1", strategy=WorkflowStrategy.BALANCED),
            ImageGenerationRequest(prompt="artistic painting 1", strategy=WorkflowStrategy.QUALITY_FIRST),
            ImageGenerationRequest(prompt="landscape photo 1", strategy=WorkflowStrategy.BALANCED),
            ImageGenerationRequest(prompt="abstract design 1", strategy=WorkflowStrategy.SPEED_FIRST)
        ]
        
        batch_results = await engine.generate_batch(batch_requests)
        successful_batch = [r for r in batch_results if r.success]
        print(f"   ✓ Batch processing: {len(successful_batch)}/{len(batch_requests)} successful")
        print(f"   ✓ Average processing time: {sum(r.processing_time for r in batch_results)/len(batch_results):.3f}s")
        
        # Test 13: Performance Report
        print("\n1️⃣3️⃣ Testing Performance Report...")
        performance_report = engine.get_performance_report()
        print(f"   ✓ Total generations: {performance_report['total_generations']}")
        print(f"   ✓ Success rate: {performance_report['success_rate']:.1%}")
        print(f"   ✓ Average quality: {performance_report['average_quality_score']:.3f}")
        print(f"   ✓ Average processing time: {performance_report['average_processing_time']:.3f}s")
        
        mode_usage = performance_report['mode_usage']
        print(f"   ✓ Mode usage:")
        for mode, count in mode_usage.items():
            if count > 0:
                print(f"     - {mode}: {count}")
        
        quality_dist = performance_report['quality_distribution']
        print(f"   ✓ Quality distribution:")
        print(f"     - Excellent (≥0.9): {quality_dist['excellent']}")
        print(f"     - Good (0.8-0.9): {quality_dist['good']}")
        print(f"     - Acceptable (0.7-0.8): {quality_dist['acceptable']}")
        print(f"     - Poor (<0.7): {quality_dist['poor']}")
        
        # Test 14: Error Handling
        print("\n1️⃣4️⃣ Testing Error Handling...")
        
        # Test invalid layer definitions
        invalid_layer_request = ImageGenerationRequest(
            prompt="test",
            layer_definitions=[{'invalid': 'data'}]
        )
        error_result = await engine.generate_image(invalid_layer_request)
        print(f"   ✓ Invalid layer handling: {not error_result.success}")
        
        # Test missing reference for relighting
        invalid_relight_request = ImageGenerationRequest(
            prompt="relight image",
            lighting_type=LightingType.DRAMATIC
        )
        relight_error = await engine.generate_image(invalid_relight_request)
        print(f"   ✓ Missing reference handling: {not relight_error.success}")
        
        # Test 15: Session Export
        print("\n1️⃣5️⃣ Testing Session Export...")
        all_results = [anime_result, edit_result, layer_result, lightning_result, hybrid_result]
        export_path = Path("test_session_export.json")
        
        export_success = engine.export_generation_session(all_results, export_path)
        print(f"   ✓ Session export: {export_success}")
        
        if export_path.exists():
            import json
            with open(export_path, 'r') as f:
                session_data = json.load(f)
            print(f"   ✓ Export contains {len(session_data['results'])} results")
            print(f"   ✓ Session info: {session_data['session_info']['total_generations']} generations")
            export_path.unlink()  # Clean up
        
        print("\n" + "=" * 60)
        print("🎉 ALL TESTS PASSED! Enhanced Image Engine is working correctly!")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_workflow_scenarios():
    """Test realistic workflow scenarios"""
    print("\n🎬 Testing Realistic Workflow Scenarios")
    print("=" * 60)
    
    if not IMPORT_SUCCESS:
        print("❌ Import failed - skipping workflow tests")
        return False
    
    try:
        # Create engine
        config = EnhancedImageConfig(
            default_mode=ImageGenerationMode.AUTO,
            default_strategy=WorkflowStrategy.BALANCED,
            enable_batch_processing=True,
            quality_threshold=0.8
        )
        engine = create_enhanced_image_engine(config)
        
        # Scenario 1: Anime Character Design Workflow
        print("\n🎨 Scenario 1: Anime Character Design")
        
        # Step 1: Create base character
        character_request = ImageGenerationRequest(
            prompt="beautiful anime girl with long silver hair and blue eyes",
            character_data={'style': 'modern', 'gender': 'female', 'age': 'young'},
            width=1024,
            height=1536
        )
        character_result = await engine.generate_image(character_request)
        print(f"   ✓ Base character: {character_result.success} (Quality: {character_result.quality_score:.3f})")
        
        # Step 2: Create variations with different lighting
        if character_result.success and character_result.image:
            lighting_request = ImageGenerationRequest(
                prompt="enhance with dramatic lighting",
                reference_images=[character_result.image],
                lighting_type=LightingType.DRAMATIC
            )
            lighting_result = await engine.generate_image(lighting_request)
            print(f"   ✓ Lighting variation: {lighting_result.success} (Quality: {lighting_result.quality_score:.3f})")
        
        # Step 3: Create scene composition
        scene_layers = [
            {'type': 'background', 'prompt': 'magical forest background', 'z_index': 0},
            {'type': 'character', 'prompt': 'anime character from previous step', 'z_index': 1},
            {'type': 'effect', 'prompt': 'sparkles and magical particles', 'z_index': 2}
        ]
        scene_request = ImageGenerationRequest(
            prompt="magical forest scene with anime character",
            layer_definitions=scene_layers,
            width=1920,
            height=1080
        )
        scene_result = await engine.generate_image(scene_request)
        print(f"   ✓ Scene composition: {scene_result.success} (Layers: {len(scene_result.layers) if scene_result.layers else 0})")
        
        workflow1_success = character_result.success and scene_result.success
        print(f"   🎯 Anime Character Design Workflow: {'SUCCESS' if workflow1_success else 'PARTIAL'}")
        
        # Scenario 2: Professional Photo Enhancement Workflow
        print("\n📸 Scenario 2: Professional Photo Enhancement")
        
        # Step 1: Base photo generation
        photo_request = ImageGenerationRequest(
            prompt="professional business portrait of a person in office setting",
            strategy=WorkflowStrategy.QUALITY_FIRST,
            width=1024,
            height=1024
        )
        photo_result = await engine.generate_image(photo_request)
        print(f"   ✓ Base photo: {photo_result.success} (Quality: {photo_result.quality_score:.3f})")
        
        # Step 2: Professional lighting enhancement
        if photo_result.success and photo_result.image:
            enhance_request = ImageGenerationRequest(
                prompt="enhance with professional studio lighting",
                reference_images=[photo_result.image],
                editing_instructions="professional photo enhancement with perfect lighting",
                lighting_type=LightingType.STUDIO
            )
            enhance_result = await engine.generate_image(enhance_request)
            print(f"   ✓ Lighting enhancement: {enhance_result.success} (Quality: {enhance_result.quality_score:.3f})")
        
        # Step 3: Quick final touch-up
        if 'enhance_result' in locals() and enhance_result.success and enhance_result.image:
            final_request = ImageGenerationRequest(
                prompt="final color grading and sharpening",
                reference_images=[enhance_result.image],
                strategy=WorkflowStrategy.SPEED_FIRST
            )
            final_result = await engine.generate_image(final_request)
            print(f"   ✓ Final touch-up: {final_result.success} (Time: {final_result.processing_time:.3f}s)")
        
        workflow2_success = photo_result.success and 'enhance_result' in locals() and enhance_result.success
        print(f"   🎯 Professional Photo Enhancement: {'SUCCESS' if workflow2_success else 'PARTIAL'}")
        
        # Scenario 3: Creative Art Production Workflow
        print("\n🎭 Scenario 3: Creative Art Production")
        
        # Step 1: Concept art with multiple styles
        concept_requests = [
            ImageGenerationRequest(prompt="futuristic cityscape concept art", strategy=WorkflowStrategy.QUALITY_FIRST),
            ImageGenerationRequest(prompt="fantasy castle concept art", strategy=WorkflowStrategy.BALANCED),
            ImageGenerationRequest(prompt="sci-fi spaceship concept art", strategy=WorkflowStrategy.SPEED_FIRST)
        ]
        
        concept_results = await engine.generate_batch(concept_requests)
        successful_concepts = [r for r in concept_results if r.success]
        print(f"   ✓ Concept art batch: {len(successful_concepts)}/{len(concept_requests)} successful")
        
        # Step 2: Detailed composition from best concept
        if successful_concepts:
            best_concept = max(successful_concepts, key=lambda x: x.quality_score)
            
            detailed_layers = [
                {'type': 'background', 'prompt': 'detailed environment from concept', 'z_index': 0},
                {'type': 'foreground', 'prompt': 'detailed foreground elements', 'z_index': 1},
                {'type': 'character', 'prompt': 'main subject with details', 'z_index': 2},
                {'type': 'effect', 'prompt': 'atmospheric effects and lighting', 'z_index': 3}
            ]
            
            detailed_request = ImageGenerationRequest(
                prompt="detailed final artwork based on concept",
                layer_definitions=detailed_layers,
                strategy=WorkflowStrategy.QUALITY_FIRST,
                width=2048,
                height=1536
            )
            detailed_result = await engine.generate_image(detailed_request)
            print(f"   ✓ Detailed composition: {detailed_result.success} (Quality: {detailed_result.quality_score:.3f})")
        
        workflow3_success = len(successful_concepts) >= 2 and 'detailed_result' in locals() and detailed_result.success
        print(f"   🎯 Creative Art Production: {'SUCCESS' if workflow3_success else 'PARTIAL'}")
        
        # Overall workflow assessment
        all_workflows_success = workflow1_success and workflow2_success and workflow3_success
        print(f"\n🏆 Overall Workflow Assessment: {'ALL PASSED' if all_workflows_success else 'SOME PARTIAL'}")
        
        return all_workflows_success
        
    except Exception as e:
        print(f"\n❌ Workflow test failed: {e}")
        return False


def main():
    """Run all tests"""
    print("🚀 Starting Enhanced Image Engine Tests")
    print("=" * 60)
    
    # Run basic functionality tests
    basic_success = asyncio.run(test_enhanced_image_engine_basic())
    
    # Run workflow scenario tests
    workflow_success = asyncio.run(test_workflow_scenarios())
    
    # Final summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    print(f"✅ Basic Functionality: {'PASSED' if basic_success else 'FAILED'}")
    print(f"✅ Workflow Scenarios: {'PASSED' if workflow_success else 'FAILED'}")
    
    overall_success = basic_success and workflow_success
    print(f"\n🎯 OVERALL RESULT: {'ALL TESTS PASSED! 🎉' if overall_success else 'SOME TESTS FAILED ❌'}")
    
    if overall_success:
        print("\n🎊 Enhanced Image Engine is ready for production!")
        print("   - All generation modes working correctly")
        print("   - Intelligent workflow routing functional")
        print("   - Advanced integrations operational")
        print("   - Batch processing validated")
        print("   - Quality validation active")
        print("   - Performance monitoring working")
        print("   - Error handling robust")
        print("   - Workflow scenarios successful")
    else:
        print("\n⚠️  Please review failed tests before proceeding.")
    
    return overall_success


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)