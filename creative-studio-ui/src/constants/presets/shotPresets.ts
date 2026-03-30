import { ShotPreset } from '../../types/presets';

/**
 * Cinematic Shot Presets for the StoryCore Engine
 * These presets define the framing, composition, layout guides (colors),
 * and generation prompts for common cinematic shots.
 */

export const CINEMATIC_SHOT_PRESETS: ShotPreset[] = [
  {
    id: 'interior-vehicle-dialogue',
    label: 'Intérieur Véhicule (Dialogue)',
    description: 'Conversation à deux dans l\'habitacle d\'un véhicule.',
    category: 'dialogue',
    framing: 'MS',
    cameraAngle: 'Eye',
    templatePath: 'src/constants/presets/Int car/CarInt2Char1.kra',
    promptTemplate: 'Cinematic interior car shot, dashboard in yellow [Interior], view through windshield showing light blue sky [Exterior], character 1 in red driver seat, character 2 in dark blue passenger seat, anamorphic lens flare, motion blur.',
    layoutColors: {
      character1: '#FF0000', // Rouge
      character2: '#00008B', // Bleu Foncé
      interior: '#FFFF00',   // Jaune
      exterior: '#87CEEB',   // Bleu Ciel
      dashboard: '#FFFF00'
    }
  },
  {
    id: 'establishing-wide-landscape',
    label: 'Grand Angle (Paysage)',
    description: 'Plan large montrant l\'environnement et l\'échelle de la scène.',
    category: 'establishing',
    framing: 'WS',
    cameraAngle: 'Eye',
    promptTemplate: 'Cinematic wide shot, epic landscape, environment focus, high resolution, 8k rendering, sharp detail, dramatic lighting.',
    layoutColors: {
      exterior: '#87CEEB', // Bleu Ciel
      background: '#228B22' // Vert (Nature)
    }
  },
  {
    id: 'close-up-intensity',
    label: 'Gros Plan (Intensité)',
    description: 'Focalisation sur l\'expression faciale et l\'émotion.',
    category: 'reaction',
    framing: 'CU',
    cameraAngle: 'Eye',
    promptTemplate: 'Cinematic close-up, focal on eyes and expression, dramatic side lighting, high skin detail, bokeh background, moody atmosphere.',
    layoutColors: {
      character1: '#FF0000', // Visage (dominant)
      background: '#000000'  // Sombre/Flou
    }
  },
  {
    id: 'over-the-shoulder-duel',
    label: 'Amorce (Confrontation)',
    description: 'Une épaule en amorce au premier plan, l\'autre personnage de face.',
    category: 'dialogue',
    framing: 'OTS',
    cameraAngle: 'Eye',
    promptTemplate: 'Over-the-shoulder shot, character 1 in focus center, character 2 shoulder blurred in foreground, cinematic bokeh, deep conversation.',
    layoutColors: {
      character1: '#FF0000', // Perso 1 (Focus)
      character2: '#00008B', // Epaule (Amorce)
      foreground: '#00008B'
    }
  },
  {
    id: 'low-angle-hero',
    label: 'Contre-Plongée (Héroïque)',
    description: 'Le personnage est vu de dessous pour plus de puissance.',
    category: 'action',
    framing: 'MS',
    cameraAngle: 'Low',
    promptTemplate: 'Low angle shot looking up at hero character, imposing figure, dramatic sky in background, cinematic power pose.',
    layoutColors: {
      character1: '#FF0000', // Perso (Imposant)
      exterior: '#87CEEB'    // Ciel (Derrière)
    }
  },
  {
    id: 'medium-shot-standard',
    label: 'Plan Moyen (Standard)',
    description: 'Cadrage classique de la taille jusqu\'au-dessus de la tête.',
    category: 'action',
    framing: 'MS',
    cameraAngle: 'Eye',
    promptTemplate: 'Cinematic medium shot, focus on body language and character expression, balanced composition, soft cinematic lighting.',
    layoutColors: {
      character1: '#FF0000', // Perso 1
      background: '#222222'  // Neutre
    }
  },
  {
    id: 'street-exterior-standard',
    label: 'Rue (Extérieur Dialogue)',
    description: 'Scène de discussion urbaine en extérieur.',
    category: 'dialogue',
    framing: 'WS',
    cameraAngle: 'Eye',
    templatePath: 'src/constants/presets/ext_street/StreetExtDialog2Char.kra',
    promptTemplate: 'Cinematic street exterior, city buildings background, character 1 and 2 in dialogue, sharp focus, vibrant city life, depth of field.',
    layoutColors: {
      character1: '#FF0000',
      character2: '#00008B',
      background: '#808080', // Pavés/Bitume
      sky: '#87CEEB'
    }
  },
  {
    id: 'forest-exterior-standard',
    label: 'Forêt (Action Nature)',
    description: 'Scène dans la nature ou une forêt dense.',
    category: 'action',
    framing: 'MS',
    cameraAngle: 'Eye',
    templatePath: 'src/constants/presets/ext_forest/ForestExtAction1Char.kra',
    promptTemplate: 'Cinematic forest exterior, dense trees and foliage, character in action, organic lighting, volumetric god rays through leaves.',
    layoutColors: {
      character1: '#FF0000',
      ground: '#228B22', // Herbe/Terre
      background: '#006400' // Forêt dense
    }
  },
  {
    id: 'house-interior-standard',
    label: 'Intérieur Maison (Gros plan)',
    description: 'Plan serré à l\'intérieur d\'une habitation.',
    category: 'reaction',
    framing: 'CU',
    cameraAngle: 'Eye',
    templatePath: 'src/constants/presets/int_house/HouseIntCU1Char.kra',
    promptTemplate: 'Cinematic interior house shot, focus on character face and emotion, cozy interior lighting, domestic background blur.',
    layoutColors: {
      character1: '#FF0000',
      interior: '#8B4513' // Teintes bois/maison
    }
  },
  {
    id: 'canyon-exterior-establishing',
    label: 'Canyon (Panorama Épique)',
    description: 'Plan d\'ensemble majestueux dans un canyon ou grand espace.',
    category: 'establishing',
    framing: 'XWS',
    cameraAngle: 'Eye',
    templatePath: 'src/constants/presets/ext_canyon/CanyonExtWideEstablishing.kra',
    promptTemplate: 'Epic cinematic canyon establishing shot, majestic rock formations, vast scale, dramatic golden hour lighting, 8k aerial view.',
    layoutColors: {
      exterior: '#87CEEB', // Ciel large
      background: '#D2B48C'  // Roche / Canyon
    }
  },
  {
    id: 'action-jump-hero',
    label: 'Action: Saut (Héroïque)',
    description: 'Une pose dynamique de saut ou de bond acrobatique.',
    category: 'action',
    framing: 'WS',
    cameraAngle: 'Low',
    is3DSupported: true,
    rigPath: 'src/constants/presets/personages/Pantin rouge Long Jump M.fbx',
    animationId: 'Long Jump',
    promptTemplate: 'Cinematic action shot, character performing a long jump through the air, heroic pose, dynamic perspective, motion blur, sharp focus, vibrant atmosphere.',
    layoutColors: {
      character1: '#FF0000', // Perso 1 (Rouge)
      background: '#EEEEEE', // Fond neutre / Ciel
      ground: '#444444' // Sol (Point de départ/arrivée)
    }
  },
  {
    id: 'explosion-impact-extreme',
    label: 'SFX: Explosion (Extrême)',
    description: 'Impact visuel fort avec débris et flammes au premier plan.',
    category: 'action',
    framing: 'MS',
    cameraAngle: 'Low',
    templatePath: 'src/constants/presets/fx_explosions/ExplosionImpact1.kra',
    promptTemplate: 'Epic cinematic explosion, massive fireballs, flying debris, intense heat haze, shockwave distortion, high speed photography, 8k particle effects.',
    layoutColors: {
      sfx: '#FF4500', // Orange (Explosion Core)
      smoke: '#808080', // Gris (Smoke)
      background: '#222222'
    }
  },
  {
    id: 'smoke-env-dense',
    label: 'SFX: Fumée (Ambiance)',
    description: 'Nappes de fumée ou brume épaisse pour le mystère ou les retombées.',
    category: 'environment',
    framing: 'WS',
    cameraAngle: 'Eye',
    templatePath: 'src/constants/presets/fx_smoke/DenseSmokeEnv1.kra',
    promptTemplate: 'Volumetric heavy smoke coverage, cinematic fog, mystery atmosphere, light shafts through particulates, deep shadows, 4k cinematic render.',
    layoutColors: {
      smoke: '#A9A9A9', // Gris clair
      background: '#000000'
    }
  },
  {
    id: 'space-ruins-discovery',
    label: 'Découverte : Ruines de l\'Espace',
    description: 'Anciennes structures monumentales flottant dans l\'espace ou sur une planète morte.',
    category: 'establishing',
    framing: 'WS',
    cameraAngle: 'Eye',
    templatePath: 'src/constants/presets/ext_space/SpaceRuins1.kra',
    promptTemplate: 'Ancient monumental ruins, monolithic architecture, floating in deep space, cosmic dust, nebula background, cinematic lighting, overgrown with alien vegetation, high detail, sci-fi atmosphere.',
    layoutColors: {
      architecture: '#444455', // Pierre sombre / Métal
      vegetation: '#226622',   // Flore alien
      background: '#000022'    // Vide spatial
    }
  },
  {
    id: 'spaceship-cockpit-first-person',
    label: 'Poste de Pilotage (Cockpit)',
    description: 'Vue subjective depuis le cockpit d\'un vaisseau spatial.',
    category: 'environment',
    framing: 'CU',
    cameraAngle: 'Eye',
    promptTemplate: 'First-person view from a futuristic spaceship cockpit, holographic displays, glowing control panels, vast starfield visible through reinforced glass, nebula on the horizon, cinematic cockpit details, sci-fi lighting.',
    layoutColors: {
      vehicles: '#333333',     // Structure du cockpit
      liquids: '#00FFFF',      // Hologrammes (Cyans)
      sky: '#000011',          // Espace profond
      interior: '#222222'      // Habitacle
    }
  },
  {
    id: 'nature-fauna-observational',
    label: 'Nature : Faune Sauvage',
    description: 'Plan d\'observation montrant un animal ou une créature dans son habitat.',
    category: 'environment',
    framing: 'WS',
    cameraAngle: 'Eye',
    promptTemplate: 'Cinematic wildlife shot, majestic creature in the center of the frame, dense lush vegetation background, dappled sunlight, high realism, national geographic style, deep bokeh.',
    layoutColors: {
      animals: '#A52A2A',      // Créature (Brun/Roux)
      vegetation: '#228B22',   // Forêt/Herbe
      sky: '#87CEEB',          // Rayons à travers les feuilles
      ground: '#4B3621'        // Terre humide
    }
  },
  {
    id: 'temple-exterior-spiritual',
    label: 'Temple (Extérieur Spirituel)',
    description: 'Structure religieuse ancienne entourée de végétation.',
    category: 'environment',
    framing: 'WS',
    cameraAngle: 'Eye',
    promptTemplate: 'Ancient spiritual temple exterior, ornate architecture, overgrown with creeping vines and lush vegetation, peaceful atmosphere, soft morning light, 8k photographic detail, cinematic tranquility.',
    layoutColors: {
      architecture: '#FFD700', // Doré / Pierre claire
      vegetation: '#228B22',   // Lianes / Plantes
      sky: '#FFFACD',          // Lumière douce
      background: '#DAA520'    // Montagnes au loin
    }
  },
  {
    id: 'castle-exterior-majestic',
    label: 'Château (Majestueux)',
    description: 'Forteresse imposante dominant le paysage.',
    category: 'establishing',
    framing: 'XWS',
    cameraAngle: 'Low',
    promptTemplate: 'Majestic medieval castle on a high cliff, stone fortifications, dramatic sky with volumetric clouds, epic scale, cinematic wide shot, sharp detail, game of thrones style.',
    layoutColors: {
      architecture: '#C0C0C0', // Pierre grise
      background: '#696969',   // Falaise / Rocher
      sky: '#87CEEB',          // Ciel nuageux
      ground: '#228B22'        // Plaines en bas
    }
  },
  {
    id: 'ocean-stormy-dramatic',
    label: 'Océan (Tempête)',
    description: 'Vagues déchaînées et ciel menaçant sur la mer.',
    category: 'environment',
    framing: 'WS',
    cameraAngle: 'Low',
    promptTemplate: 'Dramatic stormy ocean, massive dark waves, white foam, turbulent water, dark grey storm clouds, lightning in the distance, moody cinematic lighting, photorealistic sea texture.',
    layoutColors: {
      liquids: '#000080',      // Eau foncée
      sky: '#2F4F4F',          // Ciel orageux
      smoke: '#DCDCDC'         // Écume / Brume de mer
    }
  },
  {
    id: 'city-exterior-standard',
    label: 'Ville (Extérieur Urbain)',
    description: 'Scène urbaine montrant des immeubles et de l\'architecture.',
    category: 'environment',
    framing: 'WS',
    cameraAngle: 'Eye',
    promptTemplate: 'Modern cinematic city exterior, glass skyscrapers, busy urban architecture, complex structures, sunset reflections, high detail city life, photorealistic environment.',
    layoutColors: {
      architecture: '#808080', // Béton / Acier
      liquids: '#AFEEEE',      // Reflets vitres
      sky: '#FF7F50',          // Coucher de soleil
      ground: '#333333'        // Route / Asphalte
    }
  }
];
