/**
 * Built-in Pose Templates
 * Pre-configured character poses for shots
 */

export interface PoseTemplate {
  id: string;
  name: string;
  description: string;
  category: 'basic' | 'action' | 'emotional' | 'interaction';
  tags: string[];
}

export const POSE_TEMPLATES: PoseTemplate[] = [
  // ============================================================================
  // Basic Poses
  // ============================================================================
  {
    id: 'standing-neutral',
    name: 'Standing Neutral',
    description: 'Standard upright standing position',
    category: 'basic',
    tags: ['standing', 'neutral', 'basic'],
  },
  {
    id: 'standing-relaxed',
    name: 'Standing Relaxed',
    description: 'Casually standing with weight on one leg',
    category: 'basic',
    tags: ['standing', 'relaxed', 'casual'],
  },
  {
    id: 'sitting-chair',
    name: 'Sitting on Chair',
    description: 'Standard sitting position for chairs or benches',
    category: 'basic',
    tags: ['sitting', 'chair', 'basic'],
  },
  {
    id: 'sitting-floor',
    name: 'Sitting on Floor',
    description: 'Sitting cross-legged or relaxed on the ground',
    category: 'basic',
    tags: ['sitting', 'floor', 'relaxed'],
  },

  // ============================================================================
  // Action Poses
  // ============================================================================
  {
    id: 'running-fast',
    name: 'Running Fast',
    description: 'High-intensity running pose',
    category: 'action',
    tags: ['running', 'action', 'fast'],
  },
  {
    id: 'jumping-mid-air',
    name: 'Jumping',
    description: 'Mid-air jumping pose',
    category: 'action',
    tags: ['jumping', 'action', 'dynamic'],
  },
  {
    id: 'fighting-punch',
    name: 'Punching',
    description: 'Standard forward punch',
    category: 'action',
    tags: ['fighting', 'action', 'punch'],
  },
  {
    id: 'fighting-kick',
    name: 'Kicking',
    description: 'Dynamic high kick',
    category: 'action',
    tags: ['fighting', 'action', 'kick'],
  },
  {
    id: 'fighting-guard',
    name: 'Defensive Guard',
    description: 'Defensive stance with arms up',
    category: 'action',
    tags: ['fighting', 'defensive', 'guard'],
  },

  // ============================================================================
  // Emotional Poses
  // ============================================================================
  {
    id: 'crying-kneeling',
    name: 'Crying Kneeling',
    description: 'Kneeling on the ground while crying',
    category: 'emotional',
    tags: ['emotional', 'crying', 'kneeling', 'sad'],
  },
  {
    id: 'laughing-hysterical',
    name: 'Laughing Hysterical',
    description: 'Bending over with laughter',
    category: 'emotional',
    tags: ['emotional', 'laughing', 'happy', 'dynamic'],
  },
  {
    id: 'surprised-recoil',
    name: 'Surprised Recoil',
    description: 'Stepping back in surprise or shock',
    category: 'emotional',
    tags: ['emotional', 'surprised', 'shock', 'dynamic'],
  },
  {
    id: 'angry-clenched-fists',
    name: 'Angry Clenched Fists',
    description: 'Standing with clenched fists and tense posture',
    category: 'emotional',
    tags: ['emotional', 'angry', 'tense'],
  },

  // ============================================================================
  // Interaction Poses
  // ============================================================================
  {
    id: 'pointing-distant',
    name: 'Pointing Distant',
    description: 'Pointing towards something in the distance',
    category: 'interaction',
    tags: ['interaction', 'pointing', 'direction'],
  },
  {
    id: 'handshake',
    name: 'Handshake',
    description: 'Reaching out for a handshake',
    category: 'interaction',
    tags: ['interaction', 'handshake', 'greeting'],
  },
  {
    id: 'hugging',
    name: 'Hugging',
    description: 'Arms open for a hug or embracing',
    category: 'interaction',
    tags: ['interaction', 'hugging', 'affection'],
  },
  {
    id: 'giving-item',
    name: 'Giving Item',
    description: 'Reaching out as if handing over an object',
    category: 'interaction',
    tags: ['interaction', 'giving', 'item'],
  },
];

export const POSE_TEMPLATE_CATEGORIES = {
  basic: {
    name: 'Basic',
    description: 'Standard daily poses',
    icon: '🧍',
  },
  action: {
    name: 'Action',
    description: 'Dynamic and high-energy poses',
    icon: '🏃',
  },
  emotional: {
    name: 'Emotional',
    description: 'Poses conveying strong feelings',
    icon: '🎭',
  },
  interaction: {
    name: 'Interaction',
    description: 'Poses for interacting with others or objects',
    icon: '👥',
  },
};
