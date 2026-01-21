import React, { useState } from 'react';
import { CastingManager } from '../addons/casting/CastingManager';
import { CastingInterface } from '../addons/casting/components/CastingInterface';
import type { Character } from '../types/character';
import type { Avatar } from '../addons/casting/types';

// Demo data
const demoCharacters: Character[] = [
  {
    character_id: 'char-1',
    name: 'Alice Johnson',
    creation_method: 'wizard',
    creation_timestamp: new Date().toISOString(),
    version: '1.0',
    role: {
      archetype: 'Protagonist',
      narrative_function: 'The main character who drives the story forward',
      character_arc: 'From uncertain to confident leader'
    },
    visual_identity: {
      age_range: '25-35',
      hair_color: 'Brown',
      hair_style: 'Long wavy',
      hair_length: 'Long',
      eye_color: 'Blue',
      eye_shape: 'Round',
      skin_tone: 'Fair',
      facial_structure: 'Oval',
      distinctive_features: ['Freckles'],
      height: '5\'6"',
      build: 'Athletic',
      posture: 'Confident',
      clothing_style: 'Casual professional',
      color_palette: ['#8B4513', '#4169E1', '#F5F5DC']
    },
    personality: {
      traits: ['Determined', 'Empathetic'],
      values: ['Justice', 'Loyalty'],
      fears: ['Failure', 'Loss of loved ones'],
      desires: ['Truth', 'Making a difference'],
      flaws: ['Impatient'],
      strengths: ['Leadership', 'Quick thinking'],
      temperament: 'Passionate',
      communication_style: 'Direct and honest'
    },
    background: {
      origin: 'Small town in the Midwest',
      occupation: 'Investigative Journalist',
      education: 'Bachelor\'s in Communications',
      family: 'Supportive parents, one sibling',
      significant_events: ['Won a journalism award', 'Witnessed corporate corruption'],
      current_situation: 'Working on a major story'
    },
    relationships: []
  },
  {
    character_id: 'char-2',
    name: 'Dr. Marcus Chen',
    creation_method: 'wizard',
    creation_timestamp: new Date().toISOString(),
    version: '1.0',
    role: {
      archetype: 'Mentor',
      narrative_function: 'Provides guidance and wisdom to the protagonist',
      character_arc: 'From reclusive to engaged mentor'
    },
    visual_identity: {
      age_range: '45-55',
      hair_color: 'Black',
      hair_style: 'Short',
      hair_length: 'Short',
      eye_color: 'Brown',
      eye_shape: 'Almond',
      skin_tone: 'Medium',
      facial_structure: 'Square',
      distinctive_features: ['Goatee'],
      height: '5\'10"',
      build: 'Slim',
      posture: 'Upright',
      clothing_style: 'Lab coat',
      color_palette: ['#000000', '#FFFFFF', '#808080']
    },
    personality: {
      traits: ['Intelligent', 'Reserved'],
      values: ['Knowledge', 'Ethics'],
      fears: ['Making mistakes', 'Being wrong'],
      desires: ['Discovery', 'Teaching wisdom'],
      flaws: ['Overly cautious'],
      strengths: ['Analytical thinking', 'Patience'],
      temperament: 'Calm',
      communication_style: 'Precise and thoughtful'
    },
    background: {
      origin: 'Urban research facility',
      occupation: 'Research Scientist',
      education: 'PhD in Physics',
      family: 'Divorced, adult children',
      significant_events: ['Major scientific breakthrough', 'Lost funding for research'],
      current_situation: 'Working on classified project'
    },
    relationships: []
  },
  {
    character_id: 'char-3',
    name: 'Sarah Williams',
    creation_method: 'wizard',
    creation_timestamp: new Date().toISOString(),
    version: '1.0',
    role: {
      archetype: 'Antagonist',
      narrative_function: 'Creates conflict and challenges the protagonist',
      character_arc: 'From ambitious to redeemed'
    },
    visual_identity: {
      age_range: '30-40',
      hair_color: 'Blonde',
      hair_style: 'Bob cut',
      hair_length: 'Medium',
      eye_color: 'Green',
      eye_shape: 'Sharp',
      skin_tone: 'Fair',
      facial_structure: 'Angular',
      distinctive_features: ['Sharp features'],
      height: '5\'8"',
      build: 'Fit',
      posture: 'Confident',
      clothing_style: 'Business professional',
      color_palette: ['#FFD700', '#008000', '#000000']
    },
    personality: {
      traits: ['Ambitious', 'Strategic'],
      values: ['Success', 'Power'],
      fears: ['Failure', 'Vulnerability'],
      desires: ['Control', 'Recognition'],
      flaws: ['Ruthless'],
      strengths: ['Planning', 'Persuasion'],
      temperament: 'Driven',
      communication_style: 'Assertive and commanding'
    },
    background: {
      origin: 'Corporate headquarters',
      occupation: 'Executive Vice President',
      education: 'MBA from top business school',
      family: 'Married, no children',
      significant_events: ['Rapid career advancement', 'Ethical compromise'],
      current_situation: 'Climbing corporate ladder'
    },
    relationships: []
  }
];

const demoAvatars: Avatar[] = [
  {
    id: 'avatar-1',
    name: 'Young Professional Woman',
    path: '/demo-avatar-1.jpg', // Placeholder path
    dimensions: { width: 512, height: 512 },
    createdDate: new Date().toISOString(),
    tags: ['female', 'professional', 'young'],
    format: 'jpg',
    size: 245760
  },
  {
    id: 'avatar-2',
    name: 'Middle-aged Scientist',
    path: '/demo-avatar-2.jpg', // Placeholder path
    dimensions: { width: 512, height: 512 },
    createdDate: new Date().toISOString(),
    tags: ['male', 'scientist', 'middle-aged'],
    format: 'jpg',
    size: 245760
  },
  {
    id: 'avatar-3',
    name: 'Executive Woman',
    path: '/demo-avatar-3.jpg', // Placeholder path
    dimensions: { width: 512, height: 512 },
    createdDate: new Date().toISOString(),
    tags: ['female', 'executive', 'professional'],
    format: 'jpg',
    size: 245760
  },
  {
    id: 'avatar-4',
    name: 'Generic Male Actor',
    path: '/demo-avatar-4.jpg', // Placeholder path
    dimensions: { width: 512, height: 512 },
    createdDate: new Date().toISOString(),
    tags: ['male', 'generic', 'versatile'],
    format: 'jpg',
    size: 245760
  }
];

export function CastingDemo() {
  const [manager] = useState(() => {
    const mgr = new CastingManager();

    // Add demo avatars
    demoAvatars.forEach(avatar => mgr.addAvatar(avatar));

    // Set some demo scene references
    mgr.setSceneReferences([
      { sceneId: 'scene-1', characterId: 'char-1', sceneTitle: 'Introduction' },
      { sceneId: 'scene-2', characterId: 'char-1', sceneTitle: 'First Challenge' },
      { sceneId: 'scene-3', characterId: 'char-2', sceneTitle: 'Meeting the Mentor' },
      { sceneId: 'scene-5', characterId: 'char-3', sceneTitle: 'Confrontation' },
    ]);

    return mgr;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Character Casting System Demo</h1>
          <p className="text-muted-foreground max-w-2xl">
            This demo showcases the Character Casting System add-on. Assign avatar assets to character roles
            for consistent visual representation across your narrative. Features include undo/redo, analytics,
            and seamless integration with the story generation pipeline.
          </p>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <CastingInterface
            characters={demoCharacters}
            manager={manager}
          />
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            This is a demonstration of the Character Casting System add-on.
            In a full implementation, avatars would be loaded from the project's assets folder.
          </p>
        </div>
      </div>
    </div>
  );
}
