/**
 * AI Engine Type Definitions
 * 
 * This file contains TypeScript equivalent of Python enums used in 
 * ai_character_engine.py and ai_script_analysis_engine.py.
 */

// From ai_character_engine.py
export enum CharacterArchetype {
  HERO = "hero",
  VILLAIN = "villain",
  MENTOR = "mentor",
  COMIC_RELIEF = "comic_relief",
  SIDEKICK = "sidekick",
  ANTAGONIST = "antagonist",
  PROTAGONIST = "protagonist",
  TRANSFORMER = "transformer",
}

export enum PersonalityTrait {
  // Big Five Personality Traits (OCEAN Model)
  OPENNESS = "openness",
  CONSCIENTIOUSNESS = "conscientiousness",
  EXTRAVERSION = "extraversion",
  AGREEABLENESS = "agreeableness",
  NEUROTICISM = "neuroticism",
  
  // Additional Narrative Traits
  COURAGE = "courage",
  INTELLIGENCE = "intelligence",
  CHARISMA = "charisma",
  HUMILITY = "humility",
  AMBITION = "ambition",
  LOYALTY = "loyalty",
  CUNNING = "cunning",
  COMPASSION = "compassion",
  HONESTY = "honesty",
  PATIENCE = "patience",
  TEMPER = "temper",
  GENEROSITY = "generosity",
  INDEPENDENCE = "independence",
  CREATIVITY = "creativity",
  ANXIETY = "anxiety",
  WISDOM = "wisdom",
}

// From ai_script_analysis_engine.py
export enum SceneType {
  EXPOSITION = "exposition",
  RISING_ACTION = "rising_action",
  CLIMAX = "climax",
  FALLING_ACTION = "falling_action",
  RESOLUTION = "resolution",
  TRANSITION = "transition",
}

export enum CharacterRole {
  PROTAGONIST = "protagonist",
  ANTAGONIST = "antagonist",
  SUPPORTING = "supporting",
  MENTOR = "mentor",
  COMIC_RELIEF = "comic_relief",
  FOIL = "foil",
  LEAD = "lead", // Added for compatibility with existing code
}

export enum DialogueType {
  EXPOSITION = "exposition",
  CONFLICT = "conflict",
  REVELATION = "revelation",
  HUMOR = "humor",
  ROMANCE = "romance",
  THREAT = "threat",
  PERSUASION = "persuasion",
}

export enum EmotionType {
  HAPPINESS = "happiness",
  SADNESS = "sadness",
  ANGER = "anger",
  FEAR = "fear",
  SURPRISE = "surprise",
  DISGUST = "disgust",
  CONTEMPT = "contempt",
  INTEREST = "interest",
  CONFUSION = "confusion",
  DETERMINATION = "determination",
}
