/**
 * Built-in Sequence Plan Templates
 * Pre-configured templates for different types of video sequences
 */

import { SequenceTemplate, ActTemplate } from '../../types';

// ============================================================================
// Helper Functions
// ============================================================================

const createActTemplate = (
  number: number,
  title: string,
  description: string,
  targetDuration: number,
  narrativePurpose: string
): ActTemplate => ({
  number,
  title,
  description,
  targetDuration,
  narrativePurpose,
});

// ============================================================================
// Built-in Sequence Templates
// ============================================================================

export const SEQUENCE_TEMPLATES: SequenceTemplate[] = [
  // ============================================================================
  // 3-Act Narrative Structure
  // ============================================================================
  {
    id: '3-act-narrative',
    name: '3-Act Narrative',
    description: 'Classic storytelling structure with setup, confrontation, and resolution. Perfect for feature films, documentaries, and complex narratives.',
    category: 'narrative',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(
          1,
          'Setup',
          'Introduce the world, characters, and initial conflict',
          120, // 2 minutes
          'Exposition'
        ),
        createActTemplate(
          2,
          'Confrontation',
          'Develop the conflict with rising action and complications',
          150, // 2.5 minutes
          'Rising Action'
        ),
        createActTemplate(
          3,
          'Resolution',
          'Climax and resolution of the story',
          90, // 1.5 minutes
          'Climax & Resolution'
        ),
      ],
      defaultSceneCount: 7,
      defaultShotCount: 35,
    },
    defaults: {
      frameRate: 24,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 360, // 6 minutes
    },
    previewImage: '/templates/3-act-narrative.svg',
    tags: ['narrative', 'classic', 'film', 'storytelling'],
  },

  // ============================================================================
  // Commercial Spot (30 seconds)
  // ============================================================================
  {
    id: 'commercial-30s',
    name: '30-Second Commercial',
    description: 'Fast-paced commercial structure designed for maximum impact in 30 seconds. Hook, problem/solution, call-to-action.',
    category: 'commercial',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(
          1,
          'Hook',
          'Grab attention and introduce the product/service',
          10, // 10 seconds
          'Attention Grabber'
        ),
        createActTemplate(
          2,
          'Problem/Solution',
          'Show the problem and demonstrate the solution',
          15, // 15 seconds
          'Value Proposition'
        ),
        createActTemplate(
          3,
          'Call-to-Action',
          'Motivate the audience to take action',
          5, // 5 seconds
          'Conversion'
        ),
      ],
      defaultSceneCount: 3,
      defaultShotCount: 8,
    },
    defaults: {
      frameRate: 30,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 30,
    },
    previewImage: '/templates/commercial-30s.svg',
    tags: ['commercial', 'marketing', 'fast-paced', 'conversion'],
  },

  // ============================================================================
  // Music Video
  // ============================================================================
  {
    id: 'music-video',
    name: 'Music Video',
    description: 'Dynamic structure for music videos with verse-chorus transitions and visual storytelling.',
    category: 'music-video',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(
          1,
          'Intro/Verse 1',
          'Opening scene and first verse',
          45, // 45 seconds
          'Introduction'
        ),
        createActTemplate(
          2,
          'Chorus/Verse 2',
          'Main hook and second verse with dynamic visuals',
          75, // 1:15
          'Core Content'
        ),
        createActTemplate(
          3,
          'Bridge/Outro',
          'Emotional peak and closing scene',
          60, // 1 minute
          'Climax & Close'
        ),
        createActTemplate(
          4,
          'Credits',
          'End credits and final visuals',
          30, // 30 seconds
          'Credits'
        ),
      ],
      defaultSceneCount: 8,
      defaultShotCount: 40,
    },
    defaults: {
      frameRate: 24,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 210, // 3:30
    },
    previewImage: '/templates/music-video.svg',
    tags: ['music', 'entertainment', 'dynamic', 'visual'],
  },

  // ============================================================================
  // Tutorial/How-To
  // ============================================================================
  {
    id: 'tutorial-guide',
    name: 'Tutorial Guide',
    description: 'Educational content structure with clear steps, demonstrations, and reinforcement.',
    category: 'tutorial',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(
          1,
          'Introduction',
          'Hook attention and outline what will be learned',
          30, // 30 seconds
          'Attention & Overview'
        ),
        createActTemplate(
          2,
          'Main Content',
          'Step-by-step demonstration and explanation',
          120, // 2 minutes
          'Instruction'
        ),
        createActTemplate(
          3,
          'Summary',
          'Key takeaways and next steps',
          30, // 30 seconds
          'Reinforcement'
        ),
      ],
      defaultSceneCount: 5,
      defaultShotCount: 15,
    },
    defaults: {
      frameRate: 30,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 180, // 3 minutes
    },
    previewImage: '/templates/tutorial-guide.svg',
    tags: ['educational', 'tutorial', 'how-to', 'instructional'],
  },

  // ============================================================================
  // Documentary Segment
  // ============================================================================
  {
    id: 'documentary-segment',
    name: 'Documentary Segment',
    description: 'Investigative journalism structure with interviews, B-roll, and narrative arc.',
    category: 'documentary',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(
          1,
          'Introduction',
          'Hook with compelling visuals and thesis statement',
          45, // 45 seconds
          'Hook & Thesis'
        ),
        createActTemplate(
          2,
          'Evidence & Interviews',
          'Present facts, interviews, and supporting evidence',
          135, // 2:15
          'Body of Evidence'
        ),
        createActTemplate(
          3,
          'Conclusion',
          'Summarize key points and call to action/thought',
          45, // 45 seconds
          'Conclusion'
        ),
      ],
      defaultSceneCount: 6,
      defaultShotCount: 25,
    },
    defaults: {
      frameRate: 24,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 225, // 3:45
    },
    previewImage: '/templates/documentary-segment.svg',
    tags: ['documentary', 'journalism', 'investigative', 'factual'],
  },

  // ============================================================================
  // Social Media Reel (15-30 seconds)
  // ============================================================================
  {
    id: 'social-media-reel',
    name: 'Social Media Reel',
    description: 'Ultra-fast paced content optimized for social media platforms with quick cuts and high engagement.',
    category: 'commercial',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(
          1,
          'Hook (0-3s)',
          'Immediate attention grabber',
          3, // 3 seconds
          'Attention'
        ),
        createActTemplate(
          2,
          'Content (3-12s)',
          'Main value proposition or story',
          9, // 9 seconds
          'Engagement'
        ),
        createActTemplate(
          3,
          'CTA (12-15s)',
          'Call to action or brand reinforcement',
          3, // 3 seconds
          'Conversion'
        ),
      ],
      defaultSceneCount: 2,
      defaultShotCount: 6,
    },
    defaults: {
      frameRate: 30,
      resolution: { width: 1080, height: 1920 }, // Vertical format
      targetDuration: 15,
    },
    previewImage: '/templates/social-media-reel.svg',
    tags: ['social', 'mobile', 'viral', 'engagement', 'short-form'],
  },

  // ============================================================================
  // Product Demo
  // ============================================================================
  {
    id: 'product-demo',
    name: 'Product Demo',
    description: 'Feature demonstration structure showing product capabilities, benefits, and use cases.',
    category: 'tutorial',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(
          1,
          'Problem Statement',
          'Identify the problem the product solves',
          20, // 20 seconds
          'Context Setting'
        ),
        createActTemplate(
          2,
          'Solution Demo',
          'Show the product in action',
          80, // 1:20
          'Demonstration'
        ),
        createActTemplate(
          3,
          'Benefits & Next Steps',
          'Highlight benefits and encourage action',
          30, // 30 seconds
          'Reinforcement'
        ),
      ],
      defaultSceneCount: 4,
      defaultShotCount: 12,
    },
    defaults: {
      frameRate: 30,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 130, // 2:10
    },
    previewImage: '/templates/product-demo.svg',
    tags: ['product', 'demo', 'showcase', 'features', 'benefits'],
  },

  // ============================================================================
  // Treasure Hunter Quest (Adventure Film Archetype)
  // ============================================================================
  {
    id: 'treasure-hunter-quest',
    name: 'Treasure Hunter Quest',
    description: 'Epic adventure structure with exploration, discovery, and thrilling action sequences. Perfect for action-adventure films with high-stakes quests.',
    category: 'adventure-film',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(
          1,
          'The Discovery',
          'Introduce the hero and the ancient mystery that sparks the adventure',
          90, // 1.5 minutes
          'Setup & Inciting Incident'
        ),
        createActTemplate(
          2,
          'The Pursuit',
          'Journey through exotic locations with obstacles, allies, and escalating dangers',
          180, // 3 minutes
          'Rising Action & Exploration'
        ),
        createActTemplate(
          3,
          'The Confrontation',
          'Final showdown with antagonists and the ultimate challenge',
          60, // 1 minute
          'Climax'
        ),
        createActTemplate(
          4,
          'The Triumph',
          'Resolution of the quest and hero\'s victory',
          30, // 30 seconds
          'Resolution'
        ),
      ],
      defaultSceneCount: 12,
      defaultShotCount: 60,
    },
    defaults: {
      frameRate: 24,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 360, // 6 minutes
    },
    previewImage: '/templates/treasure-hunter-quest.svg',
    tags: ['adventure', 'action', 'exploration', 'quest', 'epic'],
  },

  // ============================================================================
  // Satirical Suburban Tales (Animated Series Archetype)
  // ============================================================================
  {
    id: 'satirical-suburban-tales',
    name: 'Satirical Suburban Tales',
    description: 'Sharp-witted animated series structure with social commentary, recurring characters, and episodic humor. Perfect for satirical storytelling.',
    category: 'animated-series',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(
          1,
          'Setup & Hook',
          'Introduce the absurd situation and main characters',
          30, // 30 seconds
          'Introduction'
        ),
        createActTemplate(
          2,
          'Escalating Chaos',
          'Build the ridiculous scenario with satirical elements',
          60, // 1 minute
          'Development'
        ),
        createActTemplate(
          3,
          'Climactic Absurdity',
          'Peak of the satirical situation',
          30, // 30 seconds
          'Climax'
        ),
        createActTemplate(
          4,
          'Punchline Resolution',
          'Humorous resolution with social commentary',
          30, // 30 seconds
          'Resolution'
        ),
      ],
      defaultSceneCount: 6,
      defaultShotCount: 24,
    },
    defaults: {
      frameRate: 24,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 150, // 2.5 minutes (episode length)
    },
    previewImage: '/templates/satirical-suburban-tales.svg',
    tags: ['animation', 'satire', 'comedy', 'social-commentary', 'episodic'],
  },

  // ============================================================================
  // Urban Friendship Chronicles (Sitcom Archetype)
  // ============================================================================
  {
    id: 'urban-friendship-chronicles',
    name: 'Urban Friendship Chronicles',
    description: 'Lighthearted sitcom structure focusing on relationships, misunderstandings, and everyday humor. Perfect for character-driven comedy.',
    category: 'sitcom',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(
          1,
          'The Setup',
          'Introduce characters and the initial situation',
          45, // 45 seconds
          'Introduction'
        ),
        createActTemplate(
          2,
          'The Complication',
          'Misunderstandings and humorous conflicts arise',
          60, // 1 minute
          'Rising Action'
        ),
        createActTemplate(
          3,
          'The Resolution',
          'Characters resolve the situation with heart and humor',
          45, // 45 seconds
          'Climax & Resolution'
        ),
      ],
      defaultSceneCount: 5,
      defaultShotCount: 18,
    },
    defaults: {
      frameRate: 24,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 150, // 2.5 minutes (episode length)
    },
    previewImage: '/templates/urban-friendship-chronicles.svg',
    tags: ['sitcom', 'comedy', 'relationships', 'character-driven', 'lighthearted'],
  },

  // ============================================================================
  // Romantic Celebration Story (Wedding Video Archetype)
  // ============================================================================
  {
    id: 'romantic-celebration-story',
    name: 'Romantic Celebration Story',
    description: 'Emotional wedding video structure capturing love, family, and celebration. Perfect for personal milestone videos.',
    category: 'wedding-video',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(
          1,
          'The Journey',
          'Story of how the couple met and fell in love',
          60, // 1 minute
          'Background & Romance'
        ),
        createActTemplate(
          2,
          'The Ceremony',
          'The wedding ceremony and vows',
          90, // 1.5 minutes
          'Commitment'
        ),
        createActTemplate(
          3,
          'The Celebration',
          'Reception, dancing, and joyful moments',
          90, // 1.5 minutes
          'Festivity'
        ),
        createActTemplate(
          4,
          'Forever After',
          'Closing reflections and well-wishes',
          30, // 30 seconds
          'Conclusion'
        ),
      ],
      defaultSceneCount: 8,
      defaultShotCount: 32,
    },
    defaults: {
      frameRate: 24,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 270, // 4.5 minutes
    },
    previewImage: '/templates/romantic-celebration-story.svg',
    tags: ['wedding', 'romantic', 'celebration', 'personal', 'emotional'],
  },

  // ============================================================================
  // YouTube Shorts / Social Media
  // ============================================================================
  {
    id: 'youtube-shorts-story',
    name: 'YouTube Shorts AI Story',
    description: 'Fast-paced viral structure with Narrator (Voice-off) and Rewind effect for recaps and multi-take storytelling.',
    category: 'youtube-shorts',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(
          1,
          'The Hook (Narrator)',
          'Instant attention grabber with Voice-off Narration setting the stage',
          5, // 5 seconds
          'Hook'
        ),
        createActTemplate(
          2,
          'The Fail / Twist',
          'Unexpected event or setup that requires a rewind',
          15, // 15 seconds
          'Engagement'
        ),
        createActTemplate(
          3,
          'The Rewind (Effect)',
          'Rewind moment with SFX to retry or recap the story',
          2, // 2 seconds
          'Special Effect'
        ),
        createActTemplate(
          4,
          'The Real Story',
          'The actual payoff or conclusion after the rewind',
          30, // 30 seconds
          'Payoff'
        ),
        createActTemplate(
          5,
          'Viral Outro',
          'Call to action and engagement prompt',
          8, // 8 seconds
          'Conversion'
        ),
      ],
      defaultSceneCount: 3,
      defaultShotCount: 12,
    },
    defaults: {
      frameRate: 60, // Preferred for shorts
      resolution: { width: 1080, height: 1920 }, // Mandatory 9:16
      targetDuration: 60,
    },
    previewImage: '/templates/youtube-shorts.svg',
    tags: ['social', 'mobile', 'vertical', 'narrator', 'rewind', 'viral'],
  },

  // ============================================================================
  // Brand Showcase Presentation (Commercial Presentation Archetype)
  // ============================================================================
  {
    id: 'brand-showcase-presentation',
    name: 'Brand Showcase Presentation',
    description: 'Professional presentation structure for showcasing products, services, or company values. Perfect for corporate videos and brand storytelling.',
    category: 'commercial-presentation',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(
          1,
          'Attention Grabber',
          'Hook the audience and introduce the brand',
          30, // 30 seconds
          'Introduction'
        ),
        createActTemplate(
          2,
          'Value Proposition',
          'Present the product/service and its benefits',
          90, // 1.5 minutes
          'Demonstration'
        ),
        createActTemplate(
          3,
          'Social Proof',
          'Show success stories, testimonials, or data',
          60, // 1 minute
          'Credibility'
        ),
        createActTemplate(
          4,
          'Call to Action',
          'Motivate the audience to engage with the brand',
          30, // 30 seconds
          'Conversion'
        ),
      ],
      defaultSceneCount: 6,
      defaultShotCount: 20,
    },
    defaults: {
      frameRate: 30,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 210, // 3.5 minutes
    },
    previewImage: '/templates/brand-showcase-presentation.svg',
    tags: ['presentation', 'corporate', 'brand', 'professional', 'marketing'],
  },

  // ============================================================================
  // Spirit Warrior Chronicles (Japanese Anime Style)
  // ============================================================================
  {
    id: 'spirit-warrior-chronicles',
    name: 'Spirit Warrior Chronicles',
    description: 'Epic Japanese anime-style storytelling with character development, dramatic confrontations, and mystical elements. Perfect for shonen adventure series.',
    category: 'anime-styles',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(
          1,
          'Awakening',
          'Introduction to the hero\'s world and initial power discovery',
          45, // 45 seconds
          'Setup & Inciting Incident'
        ),
        createActTemplate(
          2,
          'Training & Growth',
          'Character development through challenges and mentorship',
          75, // 1:15
          'Rising Action'
        ),
        createActTemplate(
          3,
          'Epic Confrontation',
          'Major battle or emotional climax with high stakes',
          60, // 1 minute
          'Climax'
        ),
        createActTemplate(
          4,
          'Resolution & Tease',
          'Victory and hint at future adventures',
          30, // 30 seconds
          'Resolution'
        ),
      ],
      defaultSceneCount: 8,
      defaultShotCount: 32,
    },
    defaults: {
      frameRate: 24,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 210, // 3.5 minutes (episode length)
    },
    previewImage: '/templates/spirit-warrior-chronicles.svg',
    tags: ['anime', 'japanese', 'shonen', 'adventure', 'character-development'],
  },

  // ============================================================================
  // Mystic Romance Saga (Korean Manhwa/Webtoon Style)
  // ============================================================================
  {
    id: 'mystic-romance-saga',
    name: 'Mystic Romance Saga',
    description: 'Intense Korean manhwa-style romance with supernatural elements, emotional depth, and dramatic cliffhangers. Perfect for romance fantasy series.',
    category: 'anime-styles',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(
          1,
          'Fateful Encounter',
          'Introduction of protagonists and mysterious connection',
          45, // 45 seconds
          'Setup'
        ),
        createActTemplate(
          2,
          'Rising Tension',
          'Building romance with supernatural complications',
          60, // 1 minute
          'Development'
        ),
        createActTemplate(
          3,
          'Emotional Peak',
          'Dramatic revelation or confrontation',
          45, // 45 seconds
          'Climax'
        ),
        createActTemplate(
          4,
          'Bittersweet Moment',
          'Resolution with emotional impact and future promise',
          30, // 30 seconds
          'Resolution'
        ),
      ],
      defaultSceneCount: 6,
      defaultShotCount: 24,
    },
    defaults: {
      frameRate: 24,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 180, // 3 minutes (episode length)
    },
    previewImage: '/templates/mystic-romance-saga.svg',
    tags: ['manhwa', 'korean', 'romance', 'supernatural', 'dramatic'],
  },

  // ============================================================================
  // Celestial Cultivation Odyssey (Chinese Donghua/Xianxia Style)
  // ============================================================================
  {
    id: 'celestial-cultivation-odyssey',
    name: 'Celestial Cultivation Odyssey',
    description: 'Grand Chinese xianxia-style cultivation journey with martial arts, mystical realms, and epic battles. Perfect for wuxia and xianxia series.',
    category: 'anime-styles',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(
          1,
          'Mortal Awakening',
          'Discovery of cultivation potential and sect introduction',
          60, // 1 minute
          'Setup'
        ),
        createActTemplate(
          2,
          'Path of Cultivation',
          'Training, trials, and power progression',
          90, // 1.5 minutes
          'Rising Action'
        ),
        createActTemplate(
          3,
          'Heavenly Tribulation',
          'Major breakthrough or catastrophic battle',
          75, // 1:15
          'Climax'
        ),
        createActTemplate(
          4,
          'Divine Ascension',
          'Achievement and glimpse of higher realms',
          45, // 45 seconds
          'Resolution'
        ),
      ],
      defaultSceneCount: 10,
      defaultShotCount: 45,
    },
    defaults: {
      frameRate: 24,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 270, // 4.5 minutes (episode length)
    },
    previewImage: '/templates/celestial-cultivation-odyssey.svg',
    tags: ['donghua', 'chinese', 'xianxia', 'cultivation', 'martial-arts'],
  },

  // ============================================================================
  // Enchanted Kingdom Quest (Disney Animated Feature Style)
  // ============================================================================
  {
    id: 'enchanted-kingdom-quest',
    name: 'Enchanted Kingdom Quest',
    description: 'Magical animated adventure with singing animals, heroic quests, and heartwarming lessons. Perfect for family-friendly animated features.',
    category: 'animated-series',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(
          1,
          'The Ordinary World',
          'Introduce the relatable hero and their everyday life before the adventure begins',
          60, // 1 minute
          'Setup'
        ),
        createActTemplate(
          2,
          'The Magical Call',
          'The inciting incident that pulls the hero into the enchanted world',
          75, // 1:15
          'Inciting Incident'
        ),
        createActTemplate(
          3,
          'Friends & Trials',
          'Making allies, facing challenges, and learning important lessons',
          90, // 1.5 minutes
          'Rising Action'
        ),
        createActTemplate(
          4,
          'The Grand Finale',
          'Epic confrontation with the villain and triumphant resolution',
          75, // 1:15
          'Climax & Resolution'
        ),
      ],
      defaultSceneCount: 12,
      defaultShotCount: 48,
    },
    defaults: {
      frameRate: 24,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 300, // 5 minutes (feature length segment)
    },
    previewImage: '/templates/enchanted-kingdom-quest.svg',
    tags: ['animation', 'disney', 'family', 'adventure', 'musical', 'heartwarming'],
  },

  // ============================================================================
  // Heroic Alliance Chronicles (Superhero Saga Style)
  // ============================================================================
  {
    id: 'heroic-alliance-chronicles',
    name: 'Heroic Alliance Chronicles',
    description: 'Epic superhero ensemble story with team dynamics, high-stakes battles, and moral dilemmas. Perfect for superhero team adventures.',
    category: 'superhero-saga',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(
          1,
          'The Gathering',
          'Assemble the team and establish individual hero backgrounds',
          75, // 1:15
          'Team Formation'
        ),
        createActTemplate(
          2,
          'The Threat Emerges',
          'Introduce the major villain and escalating conflicts',
          90, // 1.5 minutes
          'Inciting Incident'
        ),
        createActTemplate(
          3,
          'Internal & External Battles',
          'Team conflicts, training, and major confrontations',
          120, // 2 minutes
          'Rising Action'
        ),
        createActTemplate(
          4,
          'Ultimate Showdown',
          'Final battle and resolution of the central conflict',
          90, // 1.5 minutes
          'Climax'
        ),
        createActTemplate(
          5,
          'New Beginning',
          'Aftermath and setup for future adventures',
          45, // 45 seconds
          'Resolution'
        ),
      ],
      defaultSceneCount: 15,
      defaultShotCount: 75,
    },
    defaults: {
      frameRate: 24,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 420, // 7 minutes
    },
    previewImage: '/templates/heroic-alliance-chronicles.svg',
    tags: ['superhero', 'action', 'ensemble', 'epic', 'team', 'combat'],
  },

  // ============================================================================
  // Charming Romance Twist (Romantic Comedy Style)
  // ============================================================================
  {
    id: 'charming-romance-twist',
    name: 'Charming Romance Twist',
    description: 'Lighthearted romantic comedy with mistaken identities, witty banter, and feel-good resolutions. Perfect for romantic comedy series.',
    category: 'sitcom',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(
          1,
          'Meet Cute',
          'Introduce the main characters and their initial charming encounter',
          45, // 45 seconds
          'Introduction'
        ),
        createActTemplate(
          2,
          'The Mix-Up',
          'Misunderstandings and complications arise, building romantic tension',
          60, // 1 minute
          'Complication'
        ),
        createActTemplate(
          3,
          'Romantic Escalation',
          'Dates, confessions, and deepening feelings',
          45, // 45 seconds
          'Development'
        ),
        createActTemplate(
          4,
          'Happy Resolution',
          'Overcoming obstacles and finding true love',
          30, // 30 seconds
          'Resolution'
        ),
      ],
      defaultSceneCount: 6,
      defaultShotCount: 20,
    },
    defaults: {
      frameRate: 24,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 180, // 3 minutes (episode length)
    },
    previewImage: '/templates/charming-romance-twist.svg',
    tags: ['romance', 'comedy', 'lighthearted', 'feel-good', 'relationships'],
  },

  // ============================================================================
  // Shadow Intrigue Mystery (Mystery Thriller Style)
  // ============================================================================
  {
    id: 'shadow-intrigue-mystery',
    name: 'Shadow Intrigue Mystery',
    description: 'Suspenseful mystery thriller with clues, red herrings, and shocking revelations. Perfect for crime dramas and investigative stories.',
    category: 'mystery-thriller',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(
          1,
          'The Crime',
          'Present the mystery and initial investigation setup',
          60, // 1 minute
          'Setup'
        ),
        createActTemplate(
          2,
          'Gathering Evidence',
          'Following leads, interviewing suspects, and building tension',
          90, // 1.5 minutes
          'Investigation'
        ),
        createActTemplate(
          3,
          'The Chase',
          'High-stakes pursuit and confrontation with suspects',
          75, // 1:15
          'Rising Action'
        ),
        createActTemplate(
          4,
          'The Revelation',
          'Solving the mystery and dramatic confrontation',
          60, // 1 minute
          'Climax'
        ),
        createActTemplate(
          5,
          'Justice Served',
          'Resolution and aftermath',
          45, // 45 seconds
          'Resolution'
        ),
      ],
      defaultSceneCount: 10,
      defaultShotCount: 40,
    },
    defaults: {
      frameRate: 24,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 330, // 5.5 minutes
    },
    previewImage: '/templates/shadow-intrigue-mystery.svg',
    tags: ['mystery', 'thriller', 'suspense', 'investigation', 'crime', 'drama'],
  },

  // ============================================================================
  // Legendary Life Journey (Biographical Epic Style)
  // ============================================================================
  {
    id: 'legendary-life-journey',
    name: 'Legendary Life Journey',
    description: 'Inspiring biographical story showcasing triumph over adversity and personal growth. Perfect for biographical documentaries and films.',
    category: 'biography',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(
          1,
          'Early Days',
          'Introduce the subject\'s background and humble beginnings',
          75, // 1:15
          'Origins'
        ),
        createActTemplate(
          2,
          'The Struggle',
          'Major challenges, setbacks, and moments of doubt',
          90, // 1.5 minutes
          'Conflict'
        ),
        createActTemplate(
          3,
          'Turning Point',
          'The pivotal moment that changes everything',
          60, // 1 minute
          'Crisis'
        ),
        createActTemplate(
          4,
          'Rise to Greatness',
          'Overcoming obstacles and achieving success',
          90, // 1.5 minutes
          'Triumph'
        ),
        createActTemplate(
          5,
          'Legacy',
          'Reflection on impact and lasting influence',
          45, // 45 seconds
          'Conclusion'
        ),
      ],
      defaultSceneCount: 12,
      defaultShotCount: 50,
    },
    defaults: {
      frameRate: 24,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 360, // 6 minutes
    },
    previewImage: '/templates/legendary-life-journey.svg',
    tags: ['biography', 'inspiring', 'historical', 'motivational', 'achievement'],
  },

  // ============================================================================
  // Underdog Victory Saga (Sports Underdog Story Style)
  // ============================================================================
  {
    id: 'underdog-victory-saga',
    name: 'Underdog Victory Saga',
    description: 'Motivational sports story about overcoming odds, team spirit, and triumphant victory. Perfect for sports documentaries and films.',
    category: 'sports-story',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(
          1,
          'The Challenge',
          'Introduce the underdog team/player and their seemingly impossible goal',
          60, // 1 minute
          'Setup'
        ),
        createActTemplate(
          2,
          'Building the Team',
          'Assembling the team, training, and early struggles',
          75, // 1:15
          'Preparation'
        ),
        createActTemplate(
          3,
          'Against the Odds',
          'Major setbacks, injuries, and moments of doubt',
          90, // 1.5 minutes
          'Conflict'
        ),
        createActTemplate(
          4,
          'The Big Game',
          'The climactic competition with high stakes',
          90, // 1.5 minutes
          'Climax'
        ),
        createActTemplate(
          5,
          'Triumph & Celebration',
          'Victory and emotional payoff',
          45, // 45 seconds
          'Resolution'
        ),
      ],
      defaultSceneCount: 10,
      defaultShotCount: 45,
    },
    defaults: {
      frameRate: 30,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 360, // 6 minutes
    },
    previewImage: '/templates/underdog-victory-saga.svg',
    tags: ['sports', 'motivational', 'underdog', 'teamwork', 'victory', 'inspiring'],
  },
  // ============================================================================
  // Anniversary Celebration (Personal Growth Archetype)
  // ============================================================================
  {
    id: 'anniversary-celebration',
    name: 'Anniversary Celebration',
    description: 'A sentimental journey celebrating years of love, friendship, or achievement. Perfect for wedding anniversaries or company milestones.',
    category: 'wedding-video',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(1, 'The Beginning', 'How it all started - early memories and foundation', 45, 'Origins'),
        createActTemplate(2, 'Growth & Moments', 'Key highlights and shared experiences over the years', 90, 'Memories'),
        createActTemplate(3, 'Tributes', 'Messages of love, respect, and shared joy', 60, 'Celebration'),
        createActTemplate(4, 'The Future', 'Looking forward to more years together', 45, 'Legacy'),
      ],
      defaultSceneCount: 8,
      defaultShotCount: 30,
    },
    defaults: {
      frameRate: 24,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 240,
    },
    previewImage: '/templates/anniversary-celebration.svg',
    tags: ['anniversary', 'celebration', 'romance', 'personal', 'milestone'],
  },

  // ============================================================================
  // Vacation Trip Vlog (Lifestyle Archetype)
  // ============================================================================
  {
    id: 'vacation-trip-vlog',
    name: 'Vacation Trip Vlog',
    description: 'Dynamic and immersive travel vlog structure capturing the essence of a holiday. Perfect for social media and personal memories.',
    category: 'adventure-film',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(1, 'Departure & Arrival', 'The excitement of the journey and first impressions', 30, 'Setup'),
        createActTemplate(2, 'Main Highlights', 'Exploring landmarks, local culture, and fun activities', 120, 'Exploration'),
        createActTemplate(3, 'Food & Atmosphere', 'Capturing local flavors and the vibe of the place', 60, 'Immersion'),
        createActTemplate(4, 'Sunset & Farewell', 'A beautiful closing to the trip memories', 30, 'Resolution'),
      ],
      defaultSceneCount: 10,
      defaultShotCount: 40,
    },
    defaults: {
      frameRate: 30,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 240,
    },
    previewImage: '/templates/vacation-vlog.svg',
    tags: ['vacation', 'travel', 'vlog', 'lifestyle', 'adventure'],
  },

  // ============================================================================
  // Bedtime Series (Kids Storytelling Archetype)
  // ============================================================================
  {
    id: 'bedtime-storytelling',
    name: 'Bedtime Series',
    description: 'Calm, soothing, and imaginative structure for children\'s stories. Perfect for episodic bedtime content with a gentle pace.',
    category: 'narrative',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(1, 'Once Upon a Time', 'Introducing the magical world and gentle characters', 60, 'Setup'),
        createActTemplate(2, 'The Little Adventure', 'A low-stakes, imaginative journey or discovery', 120, 'Adventure'),
        createActTemplate(3, 'Sweet Dreams', 'Winding down the story with a positive lesson', 60, 'Resolution'),
      ],
      defaultSceneCount: 5,
      defaultShotCount: 15,
    },
    defaults: {
      frameRate: 24,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 240,
    },
    previewImage: '/templates/bedtime-series.svg',
    tags: ['kids', 'bedtime', 'storytelling', 'calm', 'education'],
  },

  // ============================================================================
  // Life Milestone Video (Personal Documentary Archetype)
  // ============================================================================
  {
    id: 'life-milestone-video',
    name: 'Life Milestone',
    description: 'A comprehensive tribute to a significant life event like graduation, retirement, or a major birthday.',
    category: 'biography',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(1, 'The Foundation', 'Early days leading up to the milestone', 60, 'Background'),
        createActTemplate(2, 'The Achievement', 'The core effort or journey being celebrated', 120, 'Core Story'),
        createActTemplate(3, 'Celebration Day', 'Capturing the event itself and its impact', 90, 'Event'),
        createActTemplate(4, 'Looking Ahead', 'Future aspirations and words of wisdom', 45, 'Outcome'),
      ],
      defaultSceneCount: 12,
      defaultShotCount: 45,
    },
    defaults: {
      frameRate: 24,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 315,
    },
    previewImage: '/templates/life-milestone.svg',
    tags: ['milestone', 'tribute', 'graduation', 'retirement', 'biography'],
  },

  // ============================================================================
  // Horror Suspense Film (Genre Cinema Archetype)
  // ============================================================================
  {
    id: 'horror-suspense-film',
    name: 'Horror Suspense',
    description: 'Tense, atmospheric structure designed to build dread and deliver impactful scares. Perfect for short horror films.',
    category: 'mystery-thriller',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(1, 'Eerie Silence', 'Establishing a creepy atmosphere and subtle warning signs', 60, 'Establishment'),
        createActTemplate(2, 'Building Dread', 'Rising tension through unexplained events and isolation', 120, 'Rising Suspense'),
        createActTemplate(3, 'The Confrontation', 'The terrifying peak where characters face the threat', 90, 'Climax'),
        createActTemplate(4, 'The Aftermath', 'A chilling conclusion or a twist ending', 30, 'Stinger'),
      ],
      defaultSceneCount: 8,
      defaultShotCount: 40,
    },
    defaults: {
      frameRate: 24,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 300,
    },
    previewImage: '/templates/horror-film.svg',
    tags: ['horror', 'suspense', 'thriller', 'scary', 'cinema'],
  },

  // ============================================================================
  // Action Packed Thriller (Genre Cinema Archetype)
  // ============================================================================
  {
    id: 'action-packed-thriller',
    name: 'Action Thriller',
    description: 'High-octane structure with fast-paced cuts, chases, and intense combat sequences. Designed for maximum energy.',
    category: 'narrative',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(1, 'The Hook', 'An explosive opening that sets the stakes high immediately', 45, 'Hook'),
        createActTemplate(2, 'The Chase', 'Intense movement, pursuit, and escalating obstacles', 120, 'Action Development'),
        createActTemplate(3, 'The Showdown', 'The ultimate fight or high-stakes confrontation', 90, 'Climax'),
        createActTemplate(4, 'Escape & Victory', 'Resolution of the immediate threat', 45, 'Resolution'),
      ],
      defaultSceneCount: 12,
      defaultShotCount: 60,
    },
    defaults: {
      frameRate: 30,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 300,
    },
    previewImage: '/templates/action-thriller.svg',
    tags: ['action', 'thriller', 'fast-paced', 'combat', 'cinema'],
  },

  // ============================================================================
  // Manga Style Episode (Anime Archetype)
  // ============================================================================
  {
    id: 'manga-style-episode',
    name: 'Manga Episode',
    description: 'Faithful adaptation of manga storytelling beats - focused on internal monologue, dynamic transformations, and epic battles.',
    category: 'anime-styles',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(1, 'Daily Life / Setup', 'Introduction with manga-style aesthetics and inner thoughts', 60, 'Setup'),
        createActTemplate(2, 'The Incident', 'Challenge arises, pushing the protagonist to their limits', 90, 'Inciting Incident'),
        createActTemplate(3, 'Transformation / Peak', 'The pivotal power-up or emotional breakthrough', 60, 'Climax'),
        createActTemplate(4, 'Cliffhanger', 'Teasing the next chapter with intense anticipation', 30, 'Epilogue'),
      ],
      defaultSceneCount: 10,
      defaultShotCount: 45,
    },
    defaults: {
      frameRate: 24,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 240,
    },
    previewImage: '/templates/manga-episode.svg',
    tags: ['manga', 'anime', 'japanese', 'action', 'storytelling'],
  },

  // ============================================================================
  // Road Trip Adventure (Travel Narrative Archetype)
  // ============================================================================
  {
    id: 'road-trip-adventure',
    name: 'Road Trip Adventure',
    description: 'Capturing the freedom and discovery of the open road. Focused on scenic transitions and character bonding.',
    category: 'adventure-film',
    isBuiltIn: true,
    structure: {
      acts: [
        createActTemplate(1, 'Hitting the Road', 'The journey begins - packing, playlists, and departure', 45, 'Start'),
        createActTemplate(2, 'Unplanned Stops', 'The beauty of side roads and unexpected discoveries', 150, 'The Journey'),
        createActTemplate(3, 'Deep Conversations', 'Bonding moments under the stars or inside the car', 90, 'Connection'),
        createActTemplate(4, 'The Destination', 'Arrival and reflection on the journey itself', 45, 'Resolution'),
      ],
      defaultSceneCount: 15,
      defaultShotCount: 50,
    },
    defaults: {
      frameRate: 24,
      resolution: { width: 1920, height: 1080 },
      targetDuration: 330,
    },
    previewImage: '/templates/road-trip.svg',
    tags: ['road-trip', 'adventure', 'travel', 'discovery', 'scenic'],
  },
];

// ============================================================================
// Template Categories and Metadata
// ============================================================================

export const SEQUENCE_TEMPLATE_CATEGORIES = {
  narrative: {
    name: 'Narrative',
    description: 'Story-driven content with clear narrative arcs',
    icon: '📖',
    templates: SEQUENCE_TEMPLATES.filter(t => t.category === 'narrative'),
  },
  commercial: {
    name: 'Commercial',
    description: 'Marketing and promotional content',
    icon: '📢',
    templates: SEQUENCE_TEMPLATES.filter(t => t.category === 'commercial'),
  },
  'music-video': {
    name: 'Music Video',
    description: 'Music synchronization and performance content',
    icon: '🎵',
    templates: SEQUENCE_TEMPLATES.filter(t => t.category === 'music-video'),
  },
  tutorial: {
    name: 'Tutorial',
    description: 'Educational and instructional content',
    icon: '🎓',
    templates: SEQUENCE_TEMPLATES.filter(t => t.category === 'tutorial'),
  },
  documentary: {
    name: 'Documentary',
    description: 'Factual and investigative content',
    icon: '📹',
    templates: SEQUENCE_TEMPLATES.filter(t => t.category === 'documentary'),
  },
  'adventure-film': {
    name: 'Adventure Film',
    description: 'Epic adventure and exploration stories',
    icon: '🏔️',
    templates: SEQUENCE_TEMPLATES.filter(t => t.category === 'adventure-film'),
  },
  'animated-series': {
    name: 'Animated Series',
    description: 'Satirical and animated storytelling',
    icon: '🎬',
    templates: SEQUENCE_TEMPLATES.filter(t => t.category === 'animated-series'),
  },
  sitcom: {
    name: 'Sitcom',
    description: 'Lighthearted character-driven comedy',
    icon: '😂',
    templates: SEQUENCE_TEMPLATES.filter(t => t.category === 'sitcom'),
  },
  'wedding-video': {
    name: 'Wedding Video',
    description: 'Romantic celebration and milestone videos',
    icon: '💍',
    templates: SEQUENCE_TEMPLATES.filter(t => t.category === 'wedding-video'),
  },
  'commercial-presentation': {
    name: 'Commercial Presentation',
    description: 'Professional brand and product presentations',
    icon: '🏢',
    templates: SEQUENCE_TEMPLATES.filter(t => t.category === 'commercial-presentation'),
  },
  'anime-styles': {
    name: 'Anime Styles',
    description: 'Japanese, Korean, and Chinese animation storytelling',
    icon: '🎌',
    templates: SEQUENCE_TEMPLATES.filter(t => t.category === 'anime-styles'),
  },
  'superhero-saga': {
    name: 'Superhero Saga',
    description: 'Epic superhero team adventures and hero journeys',
    icon: '🦸',
    templates: SEQUENCE_TEMPLATES.filter(t => t.category === 'superhero-saga'),
  },
  'mystery-thriller': {
    name: 'Mystery Thriller',
    description: 'Suspenseful investigations and crime dramas',
    icon: '🔍',
    templates: SEQUENCE_TEMPLATES.filter(t => t.category === 'mystery-thriller'),
  },
  'biography': {
    name: 'Biography',
    description: 'Inspiring life stories and historical figures',
    icon: '📚',
    templates: SEQUENCE_TEMPLATES.filter(t => t.category === 'biography'),
  },
  'sports-story': {
    name: 'Sports Story',
    description: 'Motivational sports and competition narratives',
    icon: '🏆',
    templates: SEQUENCE_TEMPLATES.filter(t => t.category === 'sports-story'),
  },
  'youtube-shorts': {
    name: 'YouTube Shorts',
    description: 'Viral vertical content with Narrator and SFX effects',
    icon: '🎬',
    templates: SEQUENCE_TEMPLATES.filter(t => t.category === 'youtube-shorts'),
  },
} as const;

export const getSequenceTemplateById = (id: string): SequenceTemplate | undefined => {
  return SEQUENCE_TEMPLATES.find(template => template.id === id);
};

export const getSequenceTemplatesByCategory = (category: string): SequenceTemplate[] => {
  return SEQUENCE_TEMPLATES.filter(template => template.category === category);
};

export const getAllSequenceTemplates = (): SequenceTemplate[] => {
  return [...SEQUENCE_TEMPLATES];
};

export const getFeaturedSequenceTemplates = (): SequenceTemplate[] => {
  // Return the most popular/commonly used templates
  return ['3-act-narrative', 'commercial-30s', 'tutorial-guide'].map(id =>
    SEQUENCE_TEMPLATES.find(t => t.id === id)
  ).filter(Boolean) as SequenceTemplate[];
};
