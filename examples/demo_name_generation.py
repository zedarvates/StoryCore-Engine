"""
Demonstration of AI-Powered Character Name Generation

This script demonstrates the capabilities of the CharacterNameGenerator
by generating names for various character types, genres, and cultures.
"""

from src.character_wizard.name_generator import CharacterNameGenerator, NameStyle


def print_section(title: str):
    """Print a formatted section header"""
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print('=' * 60)


def demonstrate_basic_generation():
    """Demonstrate basic name generation"""
    print_section("Basic Name Generation")
    
    generator = CharacterNameGenerator()
    
    print("\nGenerating 5 basic names:")
    for i in range(5):
        name = generator.generate_name()
        print(f"  {i+1}. {name}")


def demonstrate_genre_specific():
    """Demonstrate genre-specific name generation"""
    print_section("Genre-Specific Name Generation")
    
    generator = CharacterNameGenerator()
    
    genres = ["fantasy", "sci-fi", "modern", "horror"]
    
    for genre in genres:
        print(f"\n{genre.upper()} Genre:")
        for i in range(3):
            name = generator.generate_name(genre=genre)
            print(f"  {i+1}. {name}")


def demonstrate_archetype_based():
    """Demonstrate archetype-based name generation"""
    print_section("Archetype-Based Name Generation")
    
    generator = CharacterNameGenerator()
    
    archetypes = ["hero", "villain", "mentor", "ally", "trickster"]
    
    for archetype in archetypes:
        print(f"\n{archetype.upper()} Archetype:")
        for i in range(3):
            name = generator.generate_name(
                genre="fantasy",
                archetype_role=archetype
            )
            print(f"  {i+1}. {name}")


def demonstrate_cultural_context():
    """Demonstrate cultural context in name generation"""
    print_section("Cultural Context Name Generation")
    
    generator = CharacterNameGenerator()
    
    cultures = ["western", "fantasy", "eastern", "sci-fi"]
    
    for culture in cultures:
        print(f"\n{culture.upper()} Culture:")
        for i in range(3):
            name = generator.generate_name(
                culture=culture,
                genre="fantasy"
            )
            print(f"  {i+1}. {name}")


def demonstrate_personality_influence():
    """Demonstrate personality trait influence on names"""
    print_section("Personality-Influenced Name Generation")
    
    generator = CharacterNameGenerator()
    
    trait_sets = [
        (["brave", "loyal", "strong"], "Heroic Traits"),
        (["cunning", "mysterious", "dark"], "Villainous Traits"),
        (["wise", "patient", "kind"], "Mentor Traits"),
        (["clever", "playful", "chaotic"], "Trickster Traits")
    ]
    
    for traits, description in trait_sets:
        print(f"\n{description} ({', '.join(traits)}):")
        for i in range(3):
            name = generator.generate_name(
                genre="fantasy",
                archetype_role="hero",
                personality_traits=traits
            )
            print(f"  {i+1}. {name}")


def demonstrate_full_names():
    """Demonstrate full name generation"""
    print_section("Full Name Generation")
    
    generator = CharacterNameGenerator()
    
    print("\nFantasy Full Names:")
    for i in range(3):
        name = generator.generate_full_name(
            culture="fantasy",
            genre="fantasy",
            archetype_role="hero"
        )
        print(f"  {i+1}. {name}")
    
    print("\nSci-Fi Full Names:")
    for i in range(3):
        name = generator.generate_full_name(
            culture="western",
            genre="sci-fi",
            archetype_role="hero"
        )
        print(f"  {i+1}. {name}")
    
    print("\nModern Full Names:")
    for i in range(3):
        name = generator.generate_full_name(
            culture="western",
            genre="modern",
            archetype_role="ally"
        )
        print(f"  {i+1}. {name}")


def demonstrate_titles():
    """Demonstrate name generation with titles"""
    print_section("Names with Titles")
    
    generator = CharacterNameGenerator()
    
    archetypes = ["hero", "villain", "mentor"]
    
    for archetype in archetypes:
        print(f"\n{archetype.upper()} with Title:")
        for i in range(2):
            name = generator.generate_full_name(
                culture="fantasy",
                genre="fantasy",
                archetype_role=archetype,
                include_title=True
            )
            print(f"  {i+1}. {name}")


def demonstrate_style_preferences():
    """Demonstrate explicit style preferences"""
    print_section("Style Preference Override")
    
    generator = CharacterNameGenerator()
    
    styles = [
        (NameStyle.FANTASY, "Fantasy Style"),
        (NameStyle.SCIFI, "Sci-Fi Style"),
        (NameStyle.TRADITIONAL, "Traditional Style"),
        (NameStyle.MODERN, "Modern Style")
    ]
    
    for style, description in styles:
        print(f"\n{description}:")
        for i in range(3):
            name = generator.generate_name(
                culture="western",
                genre="modern",
                archetype_role="hero",
                style_preference=style
            )
            print(f"  {i+1}. {name}")


def demonstrate_integration():
    """Demonstrate integration with AutoCharacterGenerator"""
    print_section("Integration with Character Generation")
    
    from src.character_wizard.auto_character_generator import AutoCharacterGenerator
    from src.character_wizard.models import AutoGenerationParams
    
    generator = AutoCharacterGenerator()
    
    print("\nGenerating complete characters with AI-powered names:\n")
    
    test_cases = [
        ("Fantasy Hero", "fantasy", "protagonist"),
        ("Sci-Fi Villain", "sci-fi", "antagonist"),
        ("Modern Mentor", "modern", "supporting")
    ]
    
    for description, genre, role in test_cases:
        params = AutoGenerationParams(
            role=role,
            genre=genre,
            age_range="adult",
            style_preferences={"art_style": "realistic"},
            cultural_context="western"
        )
        
        character = generator.generate_character(params)
        
        print(f"{description}:")
        print(f"  Name: {character.name}")
        print(f"  Genre: {genre}")
        print(f"  Role: {role}")
        print(f"  Personality: {', '.join(character.personality_profile.primary_traits[:3])}")
        print()


def main():
    """Run all demonstrations"""
    print("\n" + "=" * 60)
    print("  AI-POWERED CHARACTER NAME GENERATION DEMONSTRATION")
    print("=" * 60)
    
    demonstrate_basic_generation()
    demonstrate_genre_specific()
    demonstrate_archetype_based()
    demonstrate_cultural_context()
    demonstrate_personality_influence()
    demonstrate_full_names()
    demonstrate_titles()
    demonstrate_style_preferences()
    demonstrate_integration()
    
    print("\n" + "=" * 60)
    print("  DEMONSTRATION COMPLETE")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
