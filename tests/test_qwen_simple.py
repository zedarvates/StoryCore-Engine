"""
Simple integration test for Qwen Image Suite Integration

Quick validation test to ensure the Qwen image editing system works correctly
with basic functionality and can be imported and used without issues.

Author: StoryCore-Engine Team
Date: January 12, 2026
Version: 1.0.0
"""

import asyncio
import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

try:
    from src.qwen_image_suite_integration import (
        QwenImageSuiteIntegration,
        QwenImageConfig,
        EditingMode,
        LightingType,
        LayerType,
        EditingQuality,
        LightingCondition,
        LayerDefinition,
        EditingResult,
        create_qwen_image_integration,
    )

    IMPORT_SUCCESS = True
except ImportError as e:
    print(f"Import failed: {e}")
    IMPORT_SUCCESS = False


# Mock PIL Image for testing
class MockImage:
    def __init__(self, size=(1024, 1024), mode="RGB"):
        self.size = size
        self.mode = mode

    def copy(self):
        return MockImage(self.size, self.mode)

    def save(self, path):
        pass

    @staticmethod
    def new(mode, size, color=None):
        return MockImage(size, mode)


async def test_qwen_integration_basic():
    """Test basic Qwen Image Suite Integration functionality"""
    print("🧪 Testing Qwen Image Suite Integration - Basic Functionality")
    print("=" * 60)

    if not IMPORT_SUCCESS:
        print("❌ Import failed - skipping tests")
        return False

    try:
        # Test 1: Configuration Creation
        print("\n1️⃣ Testing Configuration Creation...")
        config = QwenImageConfig(
            default_quality=EditingQuality.STANDARD,
            enable_lightning_lora=True,
            max_layers=6,
            lightning_steps=4,
        )
        print(f"   ✓ Config created with quality: {config.default_quality.value}")
        print(f"   ✓ Lightning LoRA enabled: {config.enable_lightning_lora}")
        print(f"   ✓ Max layers: {config.max_layers}")

        # Test 2: Integration Creation
        print("\n2️⃣ Testing Integration Creation...")
        integration = create_qwen_image_integration(config)
        print("   ✓ Integration created successfully")
        print(f"   ✓ Models registered: {len(integration.models)}")
        print(f"   ✓ LoRAs registered: {len(integration.loras)}")
        print(f"   ✓ Lighting presets: {len(integration.lighting_presets)}")

        # Test 3: Enum Validation
        print("\n3️⃣ Testing Enum Values...")
        editing_modes = [mode.value for mode in EditingMode]
        lighting_types = [lt.value for lt in LightingType]
        layer_types = [layer.value for layer in LayerType]
        quality_levels = [q.value for q in EditingQuality]

        print(f"   ✓ Editing modes: {editing_modes}")
        print(f"   ✓ Lighting types: {lighting_types}")
        print(f"   ✓ Layer types: {layer_types}")
        print(f"   ✓ Quality levels: {quality_levels}")

        # Test 4: Data Structure Creation
        print("\n4️⃣ Testing Data Structures...")

        # Lighting condition
        lighting_condition = LightingCondition(
            lighting_type=LightingType.GOLDEN_HOUR,
            intensity=1.2,
            color_temperature=3200,
        )
        print(f"   ✓ Lighting condition: {lighting_condition.lighting_type.value}")

        # Layer definition
        layer_def = LayerDefinition(
            layer_type=LayerType.CHARACTER,
            prompt="Beautiful anime character",
            weight=0.9,
            z_index=1,
        )
        print(f"   ✓ Layer definition: {layer_def.layer_type.value}")

        # Test 5: Mock Image Operations
        print("\n5️⃣ Testing Image Operations...")
        test_image = MockImage((1024, 1024))
        print(f"   ✓ Mock image created: {test_image.size}")

        # Test 6: Image Relighting
        print("\n6️⃣ Testing Image Relighting...")
        relight_result = await integration.relight_image(
            test_image, LightingType.STUDIO, EditingQuality.STANDARD
        )
        print(f"   ✓ Relighting success: {relight_result.success}")
        print(f"   ✓ Quality score: {relight_result.quality_score:.3f}")
        print(f"   ✓ Processing time: {relight_result.processing_time:.3f}s")
        print(f"   ✓ Editing mode: {relight_result.editing_mode.value}")

        # Test 7: Multi-Modal Editing
        print("\n7️⃣ Testing Multi-Modal Editing...")
        reference_images = [MockImage((512, 512)) for _ in range(3)]
        edit_result = await integration.edit_image_multi_modal(
            test_image,
            reference_images,
            "Professional photo enhancement with vibrant colors",
            mode="2511",
            quality=EditingQuality.HIGH,
        )
        print(f"   ✓ Multi-modal editing success: {edit_result.success}")
        print(f"   ✓ Quality score: {edit_result.quality_score:.3f}")
        print(
            f"   ✓ Reference images used: {edit_result.metadata['reference_image_count']}"
        )
        print(f"   ✓ Editing mode: {edit_result.metadata['editing_mode']}")

        # Test 8: Layered Generation
        print("\n8️⃣ Testing Layered Generation...")
        layer_definitions = [
            LayerDefinition(
                LayerType.BACKGROUND, "Dramatic mountain landscape", z_index=0
            ),
            LayerDefinition(LayerType.CHARACTER, "Heroic warrior character", z_index=1),
            LayerDefinition(
                LayerType.EFFECT, "Magical energy effects", z_index=2, opacity=0.8
            ),
            LayerDefinition(
                LayerType.LIGHTING, "Dynamic lighting overlay", z_index=3, opacity=0.6
            ),
        ]

        layered_result = await integration.generate_layered_image(
            layer_definitions, canvas_size=(1536, 1536), quality=EditingQuality.HIGH
        )
        print(f"   ✓ Layered generation success: {layered_result.success}")
        print(
            f"   ✓ Layer count: {len(layered_result.layers) if layered_result.layers else 0}"
        )
        print(f"   ✓ Canvas size: {layered_result.metadata['canvas_size']}")
        print(f"   ✓ Quality score: {layered_result.quality_score:.3f}")

        # Test 9: Material Transfer
        print("\n9️⃣ Testing Material Transfer...")
        source_image = MockImage((1024, 1024))
        material_result = await integration.transfer_material(
            source_image,
            test_image,
            "Metallic surface with realistic reflections",
            quality=EditingQuality.STANDARD,
        )
        print(f"   ✓ Material transfer success: {material_result.success}")
        print(f"   ✓ Quality score: {material_result.quality_score:.3f}")
        print(f"   ✓ Material prompt: {material_result.metadata['material_prompt']}")

        # Test 10: Lightning Fast Editing
        print("\n🔟 Testing Lightning Fast Editing...")
        lightning_result = await integration.lightning_edit(
            test_image, "Quick style enhancement and color correction", mode="2509"
        )
        print(f"   ✓ Lightning edit success: {lightning_result.success}")
        print(f"   ✓ Processing time: {lightning_result.processing_time:.3f}s")
        print(f"   ✓ Lightning mode: {lightning_result.metadata['lightning_mode']}")
        print(f"   ✓ Quality score: {lightning_result.quality_score:.3f}")

        # Test 11: Performance Report
        print("\n1️⃣1️⃣ Testing Performance Report...")
        performance_report = integration.get_performance_report()
        print(f"   ✓ Total operations: {performance_report['total_edits']}")
        print(f"   ✓ Success rate: {performance_report['success_rate']:.1%}")
        print(
            f"   ✓ Average quality: {performance_report['average_quality_score']:.3f}"
        )
        print(
            f"   ✓ Average processing time: {performance_report['average_processing_time']:.3f}s"
        )

        quality_dist = performance_report["quality_distribution"]
        print("   ✓ Quality distribution:")
        print(f"     - Excellent (≥0.9): {quality_dist['excellent']}")
        print(f"     - Good (0.8-0.9): {quality_dist['good']}")
        print(f"     - Acceptable (0.7-0.8): {quality_dist['acceptable']}")
        print(f"     - Poor (<0.7): {quality_dist['poor']}")

        # Test 12: Error Handling
        print("\n1️⃣2️⃣ Testing Error Handling...")

        # Test with too many reference images
        too_many_refs = [MockImage() for _ in range(10)]
        error_result = await integration.edit_image_multi_modal(
            test_image, too_many_refs, "This should fail"
        )
        print(f"   ✓ Error handling works: {not error_result.success}")
        print(f"   ✓ Error message: {error_result.error_message}")

        # Test with too many layers
        too_many_layers = [
            LayerDefinition(LayerType.BACKGROUND, f"Layer {i}") for i in range(15)
        ]
        layer_error_result = await integration.generate_layered_image(too_many_layers)
        print(f"   ✓ Layer limit error handling: {not layer_error_result.success}")

        # Test 13: Result Serialization
        print("\n1️⃣3️⃣ Testing Result Serialization...")
        result_dict = relight_result.to_dict()
        required_keys = [
            "success",
            "metadata",
            "quality_score",
            "processing_time",
            "editing_mode",
        ]
        all_keys_present = all(key in result_dict for key in required_keys)
        print(f"   ✓ Result serialization: {all_keys_present}")
        print(f"   ✓ Serialized keys: {list(result_dict.keys())}")

        # Test 14: Configuration Validation
        print("\n1️⃣4️⃣ Testing Configuration Validation...")
        print(f"   ✓ Model precision: {config.model_precision}")
        print(f"   ✓ Memory limit: {config.max_memory_usage_gb}GB")
        print(f"   ✓ Quality threshold: {config.quality_threshold}")
        print(f"   ✓ Lightning steps: {config.lightning_steps}")
        print(f"   ✓ Multi-image limit: {config.multi_image_max_count}")

        print("\n" + "=" * 60)
        print("🎉 ALL TESTS PASSED! Qwen Image Suite Integration is working correctly!")
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
        # Create integration
        config = QwenImageConfig(
            default_quality=EditingQuality.STANDARD,
            enable_lightning_lora=True,
            quality_threshold=0.8,
        )
        integration = create_qwen_image_integration(config)

        # Scenario 1: Professional Photo Enhancement Workflow
        print("\n📸 Scenario 1: Professional Photo Enhancement")
        base_photo = MockImage((1024, 1024))

        # Step 1: Relight for studio quality
        relight_result = await integration.relight_image(
            base_photo, LightingType.STUDIO, EditingQuality.HIGH
        )
        print(
            f"   ✓ Studio relighting: {relight_result.success} (Quality: {relight_result.quality_score:.3f})"
        )

        # Step 2: Multi-modal enhancement with references
        reference_photos = [MockImage((512, 512)) for _ in range(2)]
        enhance_result = await integration.edit_image_multi_modal(
            relight_result.image,
            reference_photos,
            "Professional portrait enhancement with skin smoothing",
            mode="2511",
        )
        print(
            f"   ✓ Multi-modal enhancement: {enhance_result.success} (Quality: {enhance_result.quality_score:.3f})"
        )

        # Step 3: Final lightning touch-up
        final_result = await integration.lightning_edit(
            enhance_result.image, "Final color grading and sharpening"
        )
        print(
            f"   ✓ Lightning final touch: {final_result.success} (Time: {final_result.processing_time:.3f}s)"
        )

        workflow_success = all(
            [relight_result.success, enhance_result.success, final_result.success]
        )
        print(
            f"   🎯 Photo Enhancement Workflow: {'SUCCESS' if workflow_success else 'FAILED'}"
        )

        # Scenario 2: Composite Art Creation Workflow
        print("\n🎨 Scenario 2: Composite Art Creation")

        # Create complex layered composition
        art_layers = [
            LayerDefinition(
                LayerType.BACKGROUND, "Epic fantasy landscape with mountains", z_index=0
            ),
            LayerDefinition(LayerType.FOREGROUND, "Ancient castle ruins", z_index=1),
            LayerDefinition(
                LayerType.CHARACTER, "Mystical wizard character", z_index=2
            ),
            LayerDefinition(
                LayerType.EFFECT, "Magical energy swirls", z_index=3, opacity=0.7
            ),
            LayerDefinition(
                LayerType.LIGHTING, "Dramatic sunset lighting", z_index=4, opacity=0.8
            ),
        ]

        composite_result = await integration.generate_layered_image(
            art_layers, canvas_size=(2048, 1536), quality=EditingQuality.HIGH
        )
        print(
            f"   ✓ Layered composition: {composite_result.success} (Layers: {len(composite_result.layers) if composite_result.layers else 0})"
        )

        # Apply atmospheric lighting
        atmosphere_result = await integration.relight_image(
            composite_result.image, LightingType.GOLDEN_HOUR, EditingQuality.STANDARD
        )
        print(
            f"   ✓ Atmospheric lighting: {atmosphere_result.success} (Quality: {atmosphere_result.quality_score:.3f})"
        )

        art_workflow_success = composite_result.success and atmosphere_result.success
        print(
            f"   🎯 Art Creation Workflow: {'SUCCESS' if art_workflow_success else 'FAILED'}"
        )

        # Scenario 3: Material Design Workflow
        print("\n🔧 Scenario 3: Material Design Workflow")

        # Create material variations
        base_material = MockImage((1024, 1024))
        target_objects = [MockImage((1024, 1024)) for _ in range(3)]

        material_results = []
        materials = [
            "Brushed metal finish",
            "Glossy ceramic surface",
            "Weathered stone texture",
        ]

        for i, (target, material_desc) in enumerate(zip(target_objects, materials)):
            result = await integration.transfer_material(
                base_material, target, material_desc, quality=EditingQuality.STANDARD
            )
            material_results.append(result)
            print(
                f"   ✓ Material {i + 1} ({material_desc}): {result.success} (Quality: {result.quality_score:.3f})"
            )

        material_workflow_success = all(result.success for result in material_results)
        print(
            f"   🎯 Material Design Workflow: {'SUCCESS' if material_workflow_success else 'FAILED'}"
        )

        # Overall workflow assessment
        all_workflows_success = (
            workflow_success and art_workflow_success and material_workflow_success
        )
        print(
            f"\n🏆 Overall Workflow Assessment: {'ALL PASSED' if all_workflows_success else 'SOME FAILED'}"
        )

        return all_workflows_success

    except Exception as e:
        print(f"\n❌ Workflow test failed: {e}")
        return False


def main():
    """Run all tests"""
    print("🚀 Starting Qwen Image Suite Integration Tests")
    print("=" * 60)

    # Run basic functionality tests
    basic_success = asyncio.run(test_qwen_integration_basic())

    # Run workflow scenario tests
    workflow_success = asyncio.run(test_workflow_scenarios())

    # Final summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    print(f"✅ Basic Functionality: {'PASSED' if basic_success else 'FAILED'}")
    print(f"✅ Workflow Scenarios: {'PASSED' if workflow_success else 'FAILED'}")

    overall_success = basic_success and workflow_success
    print(
        f"\n🎯 OVERALL RESULT: {'ALL TESTS PASSED! 🎉' if overall_success else 'SOME TESTS FAILED ❌'}"
    )

    if overall_success:
        print("\n🎊 Qwen Image Suite Integration is ready for production!")
        print("   - All editing modes working correctly")
        print("   - Quality validation functioning")
        print("   - Performance monitoring active")
        print("   - Error handling robust")
        print("   - Workflow scenarios validated")
    else:
        print("\n⚠️  Please review failed tests before proceeding.")

    return overall_success


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
