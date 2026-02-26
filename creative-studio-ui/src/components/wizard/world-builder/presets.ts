import type { Location, WorldRule, CulturalElements, WorldObject } from '@/types/world';

export interface WorldPreset {
  id: string;
  name: string;
  description: string;
  genre: string[];
  tone: string[];
  locations: Partial<Location>[];
  rules: Partial<WorldRule>[];
  keyObjects?: Partial<WorldObject>[];
  culturalElements: Partial<CulturalElements>;
  icon: string;
}

// Use simple string icons to avoid hydration issues
export const ICONS = {
  fresh: '✨',
  fantasy: '🏰',
  cyberpunk: '🌆',
  postApocalyptic: '☢️',
  spaceOpera: '🚀',
  horror: '👻',
};

export const WORLD_PRESETS: WorldPreset[] = [
  {
    id: 'fantasy-kingdom',
    name: 'Fantasy Kingdom',
    description: 'Classic medieval fantasy setting with magic',
    genre: ['fantasy'],
    tone: ['epic', 'adventurous'],
    locations: [
      { name: 'Royal Castle', description: 'The seat of power', significance: 'Central', atmosphere: 'Majestic' },
      { name: 'Ancient Forest', description: 'Mystical woods', significance: 'Dangerous', atmosphere: 'Mysterious' },
      { name: 'Village', description: 'Humble settlement', significance: 'Home', atmosphere: 'Cozy' },
    ],
    rules: [
      { category: 'magical', rule: 'Magic is rare but powerful', implications: 'Only trained mages can use it' },
      { category: 'social', rule: 'Feudal hierarchy', implications: 'Nobles have more rights' },
    ],
    keyObjects: [
      { name: 'Excalibur', type: 'Weapon', description: 'Legendary sword of the true king', influence: 'Bestows authority' },
      { name: 'The Dragon Eye', type: 'Artifact', description: 'A gem that reveals true forms', influence: 'Uncovers spies' },
    ],
    culturalElements: {
      languages: ['Common', 'Elvish', 'Dwarvish'],
      religions: ['Temple of Light', 'Old Gods'],
      traditions: ['Harvest Festival', 'Knighting Ceremony'],
      historicalEvents: [],
      culturalConflicts: [],
    },
    icon: ICONS.fantasy,
  },
  {
    id: 'cyberpunk-city',
    name: 'Cyberpunk City',
    description: 'High-tech dystopian future',
    genre: ['cyberpunk', 'sci-fi'],
    tone: ['dark', 'gritty'],
    locations: [
      { name: 'Corporate District', description: 'High-tech corporate zone', significance: 'Power center', atmosphere: 'Sterile' },
      { name: 'Underground Market', description: 'Black market hub', significance: 'Illegal trade', atmosphere: 'Dim' },
      { name: 'Slums', description: 'Poor residential area', significance: 'Home of outcasts', atmosphere: 'Gritty' },
    ],
    rules: [
      { category: 'technological', rule: 'Cybernetic enhancements common', implications: 'Social divide between augmented and natural' },
      { category: 'social', rule: 'Corporate control', implications: 'Government is weak, corporations rule' },
    ],
    keyObjects: [
      { name: 'Neural Link V2', type: 'Cyberware', description: 'Experimental brain-computer interface', influence: 'Enables direct data manipulation' },
      { name: 'The Black Ice Chip', type: 'Storage', description: 'Encrypted drive with dirty secrets', influence: 'Could collapse the network' },
    ],
    culturalElements: {
      languages: ['English', 'Japanese', 'Corporate Speak'],
      religions: ['Tech Cult', 'Old Religions'],
      traditions: ['Neon Festival', 'Hackathon'],
      historicalEvents: [],
      culturalConflicts: [],
    },
    icon: ICONS.cyberpunk,
  },
  {
    id: 'post-apocalyptic',
    name: 'Post-Apocalyptic',
    description: 'World after the fall',
    genre: ['post-apocalyptic', 'sci-fi'],
    tone: ['dark', 'gritty'],
    locations: [
      { name: 'Bunker', description: 'Underground shelter', significance: 'Safe haven', atmosphere: 'Confined' },
      { name: 'Ruins', description: 'Collapsed city', significance: 'Danger zone', atmosphere: 'Desolate' },
      { name: 'Oasis', description: 'Rare safe settlement', significance: 'Hope', atmosphere: 'Tense' },
    ],
    rules: [
      { category: 'physical', rule: 'Resources are scarce', implications: 'Survival is priority' },
      { category: 'social', rule: 'Tribal societies', implications: 'Groups form for protection' },
    ],
    keyObjects: [
      { name: 'The Last Seed Case', type: 'Resource', description: 'Case containing viable plant seeds', influence: 'Can restart agriculture' },
      { name: 'Broken Radio', type: 'Device', description: 'Old radio that occasionally picks up signals', influence: 'Only hope for communication' },
    ],
    culturalElements: {
      languages: ['Broken English', 'Tribal dialects'],
      religions: ['Survivor Cults', 'Old World Worship'],
      traditions: ['Survival Day', 'Memorial of the Fall'],
      historicalEvents: [],
      culturalConflicts: [],
    },
    icon: ICONS.postApocalyptic,
  },
  {
    id: 'space-opera',
    name: 'Space Opera',
    description: 'Interstellar adventure setting',
    genre: ['sci-fi', 'fantasy'],
    tone: ['epic', 'adventurous'],
    locations: [
      { name: 'Space Station', description: 'Orbital hub', significance: 'Trade center', atmosphere: 'Busy' },
      { name: 'Alien World', description: 'Exotic planet', significance: 'Adventure', atmosphere: 'Strange' },
      { name: 'Starship', description: 'Player ship', significance: 'Home', atmosphere: 'Cozy' },
    ],
    rules: [
      { category: 'technological', rule: 'FTL travel exists', implications: 'Galaxy is accessible' },
      { category: 'social', rule: 'Various factions compete', implications: 'Politics and war' },
    ],
    keyObjects: [
      { name: 'Warp Drive Core', type: 'Machinery', description: 'Heart of an interstellar vessel', influence: 'Enables exploration' },
      { name: 'Ancient Star Map', type: 'Data', description: 'Map pointing to a lost civilization', influence: 'Goal for many journeys' },
    ],
    culturalElements: {
      languages: ['Galactic Common', 'Alien languages'],
      religions: ['Universal Church', 'Alien faiths'],
      traditions: ['Star Festival', 'Ship Launch'],
      historicalEvents: [],
      culturalConflicts: [],
    },
    icon: ICONS.spaceOpera,
  },
  {
    id: 'horror-manor',
    name: 'Haunted Manor',
    description: 'Gothic horror setting',
    genre: ['horror', 'fantasy'],
    tone: ['dark', 'mysterious'],
    locations: [
      { name: 'Grand Hall', description: 'Main entrance', significance: 'Gathering place', atmosphere: 'Eerie' },
      { name: 'Basement', description: 'Dark underground', significance: 'Secrets', atmosphere: 'Terrifying' },
      { name: 'Attic', description: 'Storage space', significance: 'Hidden truths', atmosphere: 'Dusty' },
    ],
    rules: [
      { category: 'physical', rule: 'Ghosts can interact', implications: 'Spirits are real and dangerous' },
      { category: 'social', rule: 'Family curse', implications: 'Tragedy follows the family' },
    ],
    keyObjects: [
      { name: 'Cursed Locket', type: 'Jewelry', description: 'Contains the soul of a vengeful bride', influence: 'Slowly drains lifeforce' },
      { name: 'The Black Journal', type: 'Book', description: 'Notes on forbidden rituals', influence: 'Grants dark knowledge' },
    ],
    culturalElements: {
      languages: ['English', 'Latin'],
      religions: ['Occult', 'Christianity'],
      traditions: ['Seance', 'Ritual of Binding'],
      historicalEvents: [],
      culturalConflicts: [],
    },
    icon: ICONS.horror,
  },
];
