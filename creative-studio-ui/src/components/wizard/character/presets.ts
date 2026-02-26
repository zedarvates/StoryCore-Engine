

export interface CharacterPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  archetype: string;
  traits: string[];
  appearance?: string;
  clothing?: string;
}

export const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: 'hero',
    name: 'Protagonist',
    description: 'A courageous and determined lead character with strong ideals.',
    icon: '⚔️',
    archetype: 'HERO',
    traits: ['Brave', 'Determined', 'Protective'],
    appearance: 'Strong, determined gaze with a confident posture.',
    clothing: 'Practical, well-maintained adventuring gear.',
  },
  {
    id: 'mage',
    name: 'Scholar/Mage',
    description: 'A master of ancient knowledge and mystical arts.',
    icon: '🔮',
    archetype: 'MAGE',
    traits: ['Wise', 'Curious', 'Reserved'],
    appearance: 'Slightly built, observant eyes, often carries books or artifacts.',
    clothing: 'Layered robes with many pockets for components.',
  },
  {
    id: 'rogue',
    name: 'Rogue/Infiltrator',
    description: 'An expert in stealth, agility, and quick thinking.',
    icon: '🗡️',
    archetype: 'ROGUE',
    traits: ['Cunning', 'Independent', 'Mysterious'],
    appearance: 'Lean and agile, moves with unnatural silence.',
    clothing: 'Dark, form-fitting garments that don\'t make noise.',
  },
  {
    id: 'mentor',
    name: 'Elder Mentor',
    description: 'A wise guide who provides counsel and experience.',
    icon: '🧙‍♂️',
    archetype: 'MENTOR',
    traits: ['Sage', 'Patient', 'Inspirational'],
    appearance: 'Weathered features, calm presence, silver hair.',
    clothing: 'Dignified but simple traditional attire.',
  },
  {
    id: 'villain',
    name: 'Antagonist',
    description: 'A complex adversary with powerful motivations.',
    icon: '👹',
    archetype: 'VILLAIN',
    traits: ['Ambitious', 'Intelligent', 'Manipulative'],
    appearance: 'Imposing presence, sharp features, calculating gaze.',
    clothing: 'Ornate and intimidating formal wear.',
  }
];

export const ICONS = {
  fresh: '✨',
  quick: '⚡',
};
