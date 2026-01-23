# Personality Generation with Psychological Models

## Overview

The Character Setup Wizard uses sophisticated psychological models to generate realistic, coherent character personalities. The system is based on the **Big Five personality model** (OCEAN), combined with archetype-specific traits and genre conventions to create psychologically consistent characters.

## The Big Five Personality Model (OCEAN)

The Big Five model is a widely-accepted framework in psychology that describes personality using five core dimensions:

### 1. Openness to Experience (O)
- **High (0.7-1.0)**: Creative, imaginative, curious, adventurous
- **Medium (0.4-0.6)**: Balanced approach to new experiences
- **Low (0.0-0.3)**: Practical, conventional, prefers routine

### 2. Conscientiousness (C)
- **High (0.7-1.0)**: Organized, disciplined, reliable, thorough
- **Medium (0.4-0.6)**: Moderately organized and responsible
- **Low (0.0-0.3)**: Spontaneous, flexible, less structured

### 3. Extraversion (E)
- **High (0.7-1.0)**: Outgoing, energetic, sociable, talkative
- **Medium (0.4-0.6)**: Comfortable in various social settings
- **Low (0.0-0.3)**: Reserved, introspective, prefers solitude

### 4. Agreeableness (A)
- **High (0.7-1.0)**: Compassionate, cooperative, trusting, kind
- **Medium (0.4-0.6)**: Balanced between cooperation and competition
- **Low (0.0-0.3)**: Skeptical, competitive, direct

### 5. Neuroticism (N)
- **High (0.7-1.0)**: Anxious, sensitive, emotional, cautious
- **Medium (0.4-0.6)**: Moderate emotional stability
- **Low (0.0-0.3)**: Calm, resilient, emotionally stable

## Personality Generation Algorithm

The system generates personalities through a multi-step process:

### Step 1: Archetype Baseline
Each character archetype (Hero, Villain, Mentor, etc.) has baseline Big Five scores:

```python
"hero": {
    "openness": 0.7,
    "conscientiousness": 0.8,
    "extraversion": 0.6,
    "agreeableness": 0.8,
    "neuroticism": 0.4
}
```

### Step 2: Genre Modifiers
Genre-specific modifiers adjust traits to fit genre conventions:

- **Fantasy**: +10% Openness (embrace magic/wonder)
- **Sci-Fi**: +15% Openness, +10% Conscientiousness (methodical, embrace technology)
- **Horror**: -10% Extraversion, +15% Neuroticism (introverted, anxious)
- **Romance**: +15% Agreeableness, +10% Extraversion (cooperative, social)

### Step 3: Controlled Randomization
A ±15% random variation adds uniqueness while maintaining coherence:

```python
final_trait = base_value + genre_modifier + random(-0.15, 0.15)
```

### Step 4: Trait Derivation
Descriptive traits are derived from Big Five scores:

- **High Openness** → "creative", "imaginative", "curious"
- **High Conscientiousness** → "disciplined", "organized", "reliable"
- **High Extraversion** → "outgoing", "energetic", "sociable"
- **High Agreeableness** → "compassionate", "cooperative", "trusting"
- **Low Neuroticism** → "calm", "resilient", "confident"

### Step 5: Coherent Strengths & Flaws
Strengths and flaws are generated to align with personality traits:

**Strengths from High Scores:**
- High Openness → creativity, adaptability, innovation
- High Conscientiousness → reliability, organization, persistence
- High Extraversion → leadership, communication, enthusiasm
- High Agreeableness → empathy, cooperation, diplomacy

**Flaws from Extreme Scores:**
- Very High Openness (>0.8) → impractical, easily distracted
- Very Low Openness (<0.3) → rigid, close-minded
- Very High Conscientiousness (>0.8) → perfectionist, inflexible
- Very Low Conscientiousness (<0.3) → disorganized, unreliable

### Step 6: Behavioral Patterns
Behavioral patterns are derived from personality traits:

**Stress Response:**
- High Neuroticism → anxiety, panic, withdrawal
- High Extraversion → seek support, talk it out
- Low Extraversion → internalize, seek solitude

**Conflict Style:**
- High Agreeableness → collaborative
- High Extraversion → confrontational
- High Conscientiousness → systematic
- Low scores → avoidant

**Decision Making:**
- High Conscientiousness → methodical and planned
- High Openness → intuitive and creative
- Balanced → practical and cautious

### Step 7: Relationship Patterns
Relationship patterns reflect personality dynamics:

**Attachment Style:**
- High Agreeableness + Low Neuroticism → secure
- High Neuroticism → anxious
- Low Agreeableness → avoidant

**Social Preferences:**
- High Extraversion → enjoys large groups
- Low Extraversion → prefers small groups or one-on-one
- Medium → comfortable in various settings

**Trust Patterns:**
- High Agreeableness → trusts easily
- Low Agreeableness → slow to trust
- Medium → balanced approach

### Step 8: Coherence Validation
Final validation ensures no contradictions:

- Remove contradictory trait pairs (e.g., "brave" + "cowardly")
- Ensure minimum trait counts (3+ primary traits, 2+ strengths/flaws)
- Verify Big Five scores are within valid range (0.0-1.0)

## Example: Fantasy Hero

```
Big Five Scores:
  Openness:           0.93 (very creative and imaginative)
  Conscientiousness:  0.82 (highly organized and reliable)
  Extraversion:       0.57 (moderately social)
  Agreeableness:      0.86 (very cooperative and kind)
  Neuroticism:        0.25 (emotionally stable)

Derived Traits:
  Primary: brave, determined, loyal, curious, resilient
  Strengths: cooperation, persistence, organization
  Flaws: self-doubting, impractical, workaholic

Behavioral Patterns:
  Stress Response: internalize
  Conflict Style: collaborative
  Decision Making: methodical and planned
  
Relationship Patterns:
  Attachment: secure
  Social: comfortable in various settings
  Trust: trusts easily but can be hurt by betrayal
```

## Genre-Specific Personality Profiles

### Fantasy Characters
- **Higher Openness**: Embrace magic, wonder, and adventure
- **Balanced Conscientiousness**: Mix of discipline and spontaneity
- **Moderate Extraversion**: Can be social or introspective
- **Higher Agreeableness**: Often cooperative and heroic
- **Lower Neuroticism**: Emotionally resilient heroes

### Sci-Fi Characters
- **Very High Openness**: Embrace new technology and ideas
- **High Conscientiousness**: Methodical, scientific approach
- **Lower Extraversion**: Often introspective thinkers
- **Balanced Agreeableness**: Mix of cooperation and competition
- **Moderate Neuroticism**: Rational but can be stressed

### Horror Characters
- **Lower Openness**: Cautious about unknown
- **Moderate Conscientiousness**: Varies by role
- **Lower Extraversion**: Often introverted and isolated
- **Moderate Agreeableness**: Varies by survival needs
- **Higher Neuroticism**: Anxious, stressed, fearful

### Modern/Contemporary Characters
- **Balanced Openness**: Realistic mix
- **Balanced Conscientiousness**: Varies by occupation
- **Slightly Higher Extraversion**: Social and connected
- **Slightly Higher Agreeableness**: Community-oriented
- **Moderate Neuroticism**: Realistic stress levels

## Integration with Character Creation

The personality generation system integrates seamlessly with other character components:

1. **Visual Identity**: Personality influences appearance choices
2. **Voice Identity**: Speech patterns match personality traits
3. **Backstory**: Life events align with personality development
4. **Coherence Anchors**: Personality consistency maintained across scenes

## Quality Metrics

Generated personalities are scored on:

- **Completeness**: All required traits present (3+ primary, 2+ strengths/flaws)
- **Coherence**: No contradictory traits
- **Psychological Validity**: Big Five scores within valid ranges
- **Archetype Alignment**: Traits match character role
- **Genre Appropriateness**: Personality fits genre conventions

## Usage Example

```python
from character_wizard.auto_character_generator import AutoCharacterGenerator
from character_wizard.models import AutoGenerationParams

generator = AutoCharacterGenerator()

params = AutoGenerationParams(
    role="protagonist",
    genre="fantasy",
    age_range="young_adult",
    style_preferences={"art_style": "fantasy"},
    cultural_context="western"
)

character = generator.generate_character(params)
personality = character.personality_profile

print(f"Openness: {personality.openness:.2f}")
print(f"Traits: {', '.join(personality.primary_traits)}")
print(f"Strengths: {', '.join(personality.strengths)}")
print(f"Flaws: {', '.join(personality.flaws)}")
```

## Best Practices

1. **Trust the Algorithm**: The system generates psychologically coherent personalities
2. **Review and Adjust**: Use the generated personality as a starting point
3. **Consider Context**: Genre and role significantly influence personality
4. **Embrace Complexity**: Real personalities have contradictions and nuances
5. **Validate Coherence**: Always check for trait contradictions

## Technical Implementation

The personality generation system is implemented in:
- `src/character_wizard/auto_character_generator.py`
- `src/character_wizard/models.py` (PersonalityProfile data model)

Key methods:
- `_generate_personality()`: Main generation algorithm
- `_get_genre_personality_modifiers()`: Genre-specific adjustments
- `_derive_traits_from_big_five()`: Convert scores to descriptive traits
- `_generate_coherent_strengths()`: Aligned strength generation
- `_generate_coherent_flaws()`: Aligned flaw generation
- `_validate_personality_coherence()`: Final validation

## References

- Costa, P. T., & McCrae, R. R. (1992). *NEO PI-R Professional Manual*
- Goldberg, L. R. (1993). "The structure of phenotypic personality traits"
- John, O. P., & Srivastava, S. (1999). "The Big Five Trait taxonomy"
