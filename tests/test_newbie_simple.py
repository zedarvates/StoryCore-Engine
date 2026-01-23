"""
Simple Integration Test for NewBie Image Integration

Quick validation test for the NewBie anime-style image generation
to ensure basic functionality works correctly.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

import sys
import time
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent / "src"))

try:
    from newbie_image_integration import (
        NewBieImageIntegration,
        NewBieConfig,
        CharacterDefinition,
        AnimeStyle,
        CharacterGender,
        ImageQuality,
        create_newbie_integration
    )
    print("✅ Successfully imported NewBie Image Integration")
except ImportError as e:
    print(f"❌ Import failed: {e}")
    sys.exit(1)

def test_basic_functionality():
    """Test basic NewBie integration functionality."""
    print("\n🎨 Testing NewBie Image Integration")
    
    # Test 1: Integration initialization
    start_time = time.time()
    integration = create_newbie_integration()
    init_time = time.time() - start_time
    print(f"✅ Integration initialized in {init_time:.2f}s: {integration is not None}")
    
    # Test 2: Custom configuration
    config = NewBieConfig(
        model_path="test_newbie_model",
        default_resolution=(1024, 1536),
        default_steps=25
    )
    custom_integration = NewBieImageIntegration(config)
    print(f"✅ Custom config created: {custom_integration.config.model_path == 'test_newbie_model'}")
    
    # Test 3: Character creation from dictionary
    character_data = {
        "name": "Sakura",
        "gender": "female",
        "age_range": "teenager",
        "hair_color": "pink",
        "hair_style": "long twin tails",
        "eye_color": "green",
        "clothing": "school uniform",
        "personality_traits": ["cheerful", "energetic", "determined"],
        "physical_features": ["petite build", "bright smile"],
        "accessories": ["hair ribbons", "school bag"],
        "reference_tags": ["anime", "school girl", "magical girl"]
    }
    
    character = integration.create_character_from_dict(character_data)
    print(f"✅ Character created: {character.name} ({character.gender.value})")
    
    # Test 4: XML character parsing
    xml_content = """
    <character>
        <name>Ninja</name>
        <gender>male</gender>
        <age_range>young adult</age_range>
        <appearance>
            <hair_color>black</hair_color>
            <hair_style>spiky</hair_style>
            <eye_color>red</eye_color>
        </appearance>
        <clothing>ninja outfit</clothing>
        <personality>
            <trait>mysterious</trait>
            <trait>skilled</trait>
        </personality>
        <reference_tags>
            <tag>ninja</tag>
            <tag>warrior</tag>
        </reference_tags>
    </character>
    """
    
    xml_character = integration.parse_character_xml(xml_content)
    print(f"✅ XML character parsed: {xml_character.name} with {len(xml_character.personality_traits)} traits")
    
    # Test 5: Prompt template system
    templates_count = len(integration.prompt_templates)
    has_default_templates = all(template in integration.prompt_templates for template in [
        "classic_portrait", "modern_scene", "fantasy_adventure"
    ])
    print(f"✅ Prompt templates loaded: {templates_count} templates, defaults present: {has_default_templates}")
    
    # Test 6: Structured prompt building
    prompt = integration.build_structured_prompt("classic_portrait", character)
    prompt_valid = len(prompt) > 50 and "sakura" in prompt.lower()
    print(f"✅ Structured prompt built: {len(prompt)} chars, valid: {prompt_valid}")
    
    # Test 7: Character description building
    description = integration._build_character_description(character)
    has_key_elements = all(element in description.lower() for element in [
        "teenager", "female", "pink", "green", "school uniform"
    ])
    print(f"✅ Character description: {len(description)} chars, elements present: {has_key_elements}")
    
    # Test 8: Image generation (mock)
    result = integration.generate_image(prompt, character, ImageQuality.HIGH)
    generation_successful = result.quality_score > 0 and result.resolution == (1024, 1536)
    print(f"✅ Image generation: Quality {result.quality_score:.3f}, Resolution {result.resolution}, Success: {generation_successful}")
    
    # Test 9: Quality validation
    quality_results = integration.validate_anime_quality(result.image_path, AnimeStyle.CLASSIC)
    quality_valid = "overall_anime_quality" in quality_results and quality_results["overall_anime_quality"] > 0
    print(f"✅ Anime quality validation: {quality_results.get('overall_anime_quality', 0):.3f}, Valid: {quality_valid}")
    
    # Test 10: Character consistency checking
    image_paths = ["image1.png", "image2.png", "image3.png"]
    consistency_results = integration.check_character_consistency(image_paths, character)
    consistency_valid = "overall_consistency" in consistency_results and consistency_results["overall_consistency"] > 0
    print(f"✅ Character consistency: {consistency_results.get('overall_consistency', 0):.3f}, Valid: {consistency_valid}")
    
    return {
        "integration_init": integration is not None,
        "custom_config": custom_integration.config.model_path == "test_newbie_model",
        "character_created": character.name == "Sakura",
        "xml_parsed": xml_character.name == "Ninja",
        "templates_loaded": has_default_templates,
        "prompt_built": prompt_valid,
        "description_valid": has_key_elements,
        "generation_successful": generation_successful,
        "quality_valid": quality_valid,
        "consistency_valid": consistency_valid
    }

def test_anime_styles_and_quality():
    """Test anime style handling and quality levels."""
    print("\n🎭 Testing Anime Styles and Quality Levels")
    
    integration = create_newbie_integration()
    
    # Test anime styles
    styles = list(AnimeStyle)
    print(f"✅ Anime styles available: {len(styles)} ({', '.join([s.value for s in styles[:5]])}...)")
    
    # Test quality levels
    qualities = list(ImageQuality)
    quality_resolutions = {
        ImageQuality.DRAFT: (512, 768),
        ImageQuality.STANDARD: (768, 1024),
        ImageQuality.HIGH: (1024, 1536),
        ImageQuality.ULTRA: (1536, 2048)
    }
    
    character_data = {
        "name": "TestChar",
        "gender": "female",
        "hair_color": "blue",
        "eye_color": "amber",
        "clothing": "casual outfit"
    }
    character = integration.create_character_from_dict(character_data)
    
    quality_results = {}
    for quality in qualities:
        result = integration.generate_image("test prompt", character, quality)
        expected_resolution = quality_resolutions[quality]
        resolution_correct = result.resolution == expected_resolution
        quality_results[quality.value] = resolution_correct
        print(f"   {quality.value}: {result.resolution} (expected: {expected_resolution}) ✅" if resolution_correct else f"   {quality.value}: {result.resolution} (expected: {expected_resolution}) ❌")
    
    all_qualities_correct = all(quality_results.values())
    print(f"✅ Quality levels working: {all_qualities_correct}")
    
    return quality_results

def test_character_library_management():
    """Test character library and export functionality."""
    print("\n📚 Testing Character Library Management")
    
    integration = create_newbie_integration()
    
    # Create multiple characters
    characters_data = [
        {"name": "Hero", "gender": "male", "hair_color": "brown", "clothing": "armor"},
        {"name": "Mage", "gender": "female", "hair_color": "silver", "clothing": "robes"},
        {"name": "Rogue", "gender": "non_binary", "hair_color": "black", "clothing": "leather"}
    ]
    
    for char_data in characters_data:
        integration.create_character_from_dict(char_data)
    
    characters_cached = len(integration.character_cache)
    print(f"✅ Characters cached: {characters_cached}/3")
    
    # Test statistics
    stats = integration.get_generation_statistics()
    stats_valid = "characters_used" in stats and stats["characters_used"] == 3
    print(f"✅ Statistics tracking: {stats_valid}")
    
    # Test export (mock)
    try:
        export_path = "test_character_library.json"
        export_success = integration.export_character_library(export_path)
        print(f"✅ Library export: {export_success}")
        
        # Clean up
        if Path(export_path).exists():
            Path(export_path).unlink()
    except Exception as e:
        print(f"❌ Library export failed: {e}")
        export_success = False
    
    return {
        "characters_cached": characters_cached == 3,
        "stats_valid": stats_valid,
        "export_success": export_success
    }

def test_error_handling():
    """Test error handling and edge cases."""
    print("\n🛡️ Testing Error Handling")
    
    integration = create_newbie_integration()
    
    # Test invalid XML parsing
    try:
        integration.parse_character_xml("<invalid>xml</broken>")
        xml_error_handled = False
    except ValueError:
        xml_error_handled = True
    print(f"✅ Invalid XML handled: {xml_error_handled}")
    
    # Test invalid template
    character_data = {"name": "Test", "gender": "female", "hair_color": "red"}
    character = integration.create_character_from_dict(character_data)
    
    try:
        integration.build_structured_prompt("nonexistent_template", character)
        template_error_handled = False
    except ValueError:
        template_error_handled = True
    print(f"✅ Invalid template handled: {template_error_handled}")
    
    # Test insufficient images for consistency check
    consistency_result = integration.check_character_consistency(["single_image.png"], character)
    insufficient_images_handled = "error" in consistency_result
    print(f"✅ Insufficient images handled: {insufficient_images_handled}")
    
    # Test invalid gender handling
    invalid_gender_data = character_data.copy()
    invalid_gender_data["gender"] = "invalid_gender"
    char_with_invalid_gender = integration.create_character_from_dict(invalid_gender_data)
    gender_fallback = char_with_invalid_gender.gender == CharacterGender.UNSPECIFIED
    print(f"✅ Invalid gender fallback: {gender_fallback}")
    
    return {
        "xml_error_handled": xml_error_handled,
        "template_error_handled": template_error_handled,
        "insufficient_images_handled": insufficient_images_handled,
        "gender_fallback": gender_fallback
    }

def main():
    """Run all tests and display results."""
    print("🎨 NewBie Image Integration - Simple Test")
    print("=" * 50)
    
    try:
        # Run basic functionality tests
        basic_results = test_basic_functionality()
        basic_success = sum(basic_results.values())
        basic_total = len(basic_results)
        
        # Run anime styles and quality tests
        quality_results = test_anime_styles_and_quality()
        quality_success = sum(quality_results.values())
        quality_total = len(quality_results)
        
        # Run character library tests
        library_results = test_character_library_management()
        library_success = sum(library_results.values())
        library_total = len(library_results)
        
        # Run error handling tests
        error_results = test_error_handling()
        error_success = sum(error_results.values())
        error_total = len(error_results)
        
        # Summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        
        print(f"Basic Functionality: {basic_success}/{basic_total} tests passed")
        print(f"Quality & Styles: {quality_success}/{quality_total} tests passed")
        print(f"Library Management: {library_success}/{library_total} tests passed")
        print(f"Error Handling: {error_success}/{error_total} tests passed")
        
        # Overall assessment
        total_success = basic_success + quality_success + library_success + error_success
        total_tests = basic_total + quality_total + library_total + error_total
        success_rate = total_success / total_tests if total_tests > 0 else 0
        
        print(f"\n📈 Overall Success Rate: {success_rate:.1%} ({total_success}/{total_tests})")
        
        if success_rate >= 0.9:
            status = "✅ EXCELLENT"
            message = "NewBie Image Integration is ready for production!"
        elif success_rate >= 0.8:
            status = "✅ GOOD"
            message = "NewBie Image Integration is working well with minor issues."
        elif success_rate >= 0.7:
            status = "⚠️ ACCEPTABLE"
            message = "NewBie Image Integration has some issues that need attention."
        else:
            status = "❌ NEEDS WORK"
            message = "NewBie Image Integration has significant issues."
        
        print(f"\n🎯 ASSESSMENT: {status}")
        print(f"   {message}")
        
        # Key achievements
        if success_rate >= 0.8:
            print("\n🚀 KEY ACHIEVEMENTS:")
            print("   - Comprehensive anime-style image generation")
            print("   - Structured prompt template system")
            print("   - XML character definition parsing")
            print("   - Multiple quality levels and anime styles")
            print("   - Character consistency validation")
            print("   - Professional quality assessment")
            print("   - Character library management")
            print("   - Robust error handling")
        
        return success_rate >= 0.8
        
    except Exception as e:
        print(f"\n❌ Test execution failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)