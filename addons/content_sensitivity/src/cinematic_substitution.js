/**
 * Cinematic Substitution Engine — Content Sensitivity Addon
 *
 * Pour les SCÈNES entières (et non plus de simples mots), ce module propose
 * des ALTERNATIVES DE PLANS CINÉMATOGRAPHIQUES qui suggèrent le contenu
 * sans jamais le montrer explicitement.
 *
 * Technique classique du cinéma : montrer l'EFFET sans la CAUSE.
 * On voit la bougie s'éteindre, la porte se fermer, les chaussures tomber —
 * le spectateur complète mentalement. Tension narrative préservée à 100%.
 *
 * Chaque "scène sensible" a :
 *   - des SÉQUENCES ALTERNATIVES : plans de remplacement complets
 *   - des MARQUEURS DE LOCALITÉ   : certains codes visuels varient selon la culture
 *   - un PUBLIC CIBLE suggéré     : adultes, familial, international
 *
 * Adapté au public et à la localité cible du projet.
 */

'use strict';

// ─── Types de plans cinématographiques ────────────────────────────────────────

/**
 * @typedef {object} CinematicShot
 * @property {string}   description   Description du plan tel qu'il doit être tourné/écrit
 * @property {string}   shotType      Type de plan : 'insert', 'cutaway', 'reaction', 'symbolic', 'sound_only'
 * @property {string}   tone          Tonalité : 'romantique', 'comique', 'dramatique', 'neutre', 'poétique'
 * @property {string}   rationale     Pourquoi ce plan fonctionne narrativement
 * @property {string[]} locales       Localités pour lesquelles ce plan est approprié ([] = universel)
 * @property {string[]} audience      Publics cibles : 'family', 'teen', 'adult', 'universal'
 * @property {string}   duration      Durée suggérée du plan : 'court (1-2s)', 'moyen (3-5s)', 'long (5-10s)'
 */

// ─── Base de scènes cinématographiques et leurs alternatives ──────────────────

const CINEMATIC_SCENE_SUBSTITUTIONS = [

  // ══════════════════════════════════════════════════════════════════════════════
  // CONTENU ÉROTIQUE / INTIME
  // Principe : montrer l'avant, l'après, ou l'environnement. JAMAIS l'acte.
  // ══════════════════════════════════════════════════════════════════════════════
  {
    sceneId:     'scene_erotic_explicit',
    category:    'intimite',
    description: 'Scène à contenu érotique ou sexuellement explicite',
    keywords:    ['scène de sexe', 'scène intime', 'ébats', 'acte sexuel', 'faire l\'amour de façon explicite'],
    level:       'medium',
    sequences: [

      // ── AVANT / ELLIPSE ──────────────────────────────────────────────────────
      {
        id:          'hotel_door_close',
        description: 'Plan fixe sur la porte de chambre d\'hôtel qui se ferme lentement. ' +
                     'On entend le déclic du verrou. Fondu au noir. ' +
                     'Coupe sur un plan de la même porte le lendemain matin, le soleil filtrant sous la porte.',
        shotType:    'cutaway',
        tone:        'romantique',
        rationale:   'Technique classique du cinéma : l\'ellipse. La porte fermée = contrat de complicité avec le spectateur. Imagination plus puissante que tout.',
        locales:     [],
        audience:    ['teen', 'adult', 'universal'],
        duration:    'moyen (3-5s)',
      },
      {
        id:          'shoes_falling',
        description: 'Travelling bas sur le sol. Une paire de chaussures femme tombe d\'un côté, ' +
                     'une paire d\'homme de l\'autre. La lumière sous la porte s\'éteint. ' +
                     'Fondu enchaîné vers le matin.',
        shotType:    'insert',
        tone:        'romantique',
        rationale:   'Le détail suggestif le plus universel au cinéma. Jamais choquant, toujours compréhensible.',
        locales:     [],
        audience:    ['teen', 'adult', 'universal'],
        duration:    'court (1-2s)',
      },
      {
        id:          'window_curtain_wind',
        description: 'Plan sur la fenêtre entrouverte. Le rideau de voile blanc gonfle doucement ' +
                     'dans la brise nocturne. En fond sonore : respiration, bruissement de draps. ' +
                     'La caméra s\'attarde sur la ville illuminée au loin.',
        shotType:    'cutaway',
        tone:        'poétique',
        rationale:   'Le rideau est métaphore : il sépare l\'espace public et privé. La ville continue, indifférente. Universel.',
        locales:     [],
        audience:    ['adult', 'universal'],
        duration:    'long (5-10s)',
      },
      {
        id:          'wall_trembling',
        description: 'Plan serré sur un tableau accroché au mur qui tremble légèrement. ' +
                     'Un verre d\'eau sur la table de nuit frémit. ' +
                     'Quelques bruits sourds de l\'autre côté de la cloison. ' +
                     'La caméra recule lentement, révélant qu\'on est dans la chambre voisine.',
        shotType:    'cutaway',
        tone:        'comique',
        rationale:   'Ton léger, suggestion sans montre rien. Le recul caméra révèle un POV de voisin = distanciation humoristique.',
        locales:     [],
        audience:    ['adult', 'universal'],
        duration:    'moyen (3-5s)',
      },

      // ── APRÈS / LENDEMAIN ────────────────────────────────────────────────────
      {
        id:          'morning_after',
        description: 'Coupe directe sur le lendemain matin. Lumière dorée de l\'aube. ' +
                     'Deux tasses de café fumant sur la table. Un sourire échangé. ' +
                     'Les personnages habillés, décontractés, une complicité nouvelle dans le regard.',
        shotType:    'reaction',
        tone:        'romantique',
        rationale:   'L\'ellipse temporelle est le raccourci le plus élégant. Le spectateur comprend, rien n\'est expliqué.',
        locales:     [],
        audience:    ['family', 'teen', 'adult', 'universal'],
        duration:    'moyen (3-5s)',
      },
      {
        id:          'disheveled_hair_smile',
        description: 'Insert sur le reflet dans un miroir : cheveux emmêlés, léger rouge aux joues, ' +
                     'un sourire retenu. Un bruit de douche en fond sonore. ' +
                     'Le personnage attrape son téléphone : message non lu, il/elle sourit encore plus.',
        shotType:    'insert',
        tone:        'romantique',
        rationale:   'L\'état du personnage après est plus expressif que tout ce qu\'on aurait pu montrer avant.',
        locales:     [],
        audience:    ['teen', 'adult', 'universal'],
        duration:    'court (1-2s)',
      },

      // ── SYMBOLIQUE ────────────────────────────────────────────────────────────
      {
        id:          'intertwined_hands',
        description: 'Gros plan sur deux mains qui s\'entrelacent lentement. ' +
                     'La caméra monte le long des bras. Fondu au noir avant d\'atteindre les visages.',
        shotType:    'symbolic',
        tone:        'poétique',
        rationale:   'La main est la partie du corps la plus expressive et la moins sexualisée. Universel toutes cultures.',
        locales:     [],
        audience:    ['family', 'teen', 'adult', 'universal'],
        duration:    'moyen (3-5s)',
      },
      {
        id:          'fireplace_logs',
        description: 'Plan contemplatif sur une cheminée. Les braises rougeoyantes decroissent lentement. ' +
                     'En fond sonore : murmures indistincts, puis silence. ' +
                     'Un livre ouvert à côté : personne ne le lit plus.',
        shotType:    'symbolic',
        tone:        'poétique',
        rationale:   'La cheminée qui s\'éteint = temps qui passe. Métaphore thermique de la chaleur humaine.',
        locales:     [],
        audience:    ['adult', 'universal'],
        duration:    'long (5-10s)',
      },

      // ── SON SEUL (SOUND DESIGN) ───────────────────────────────────────────────
      {
        id:          'sound_only_city',
        description: 'Écran noir ou plan extérieur sur la ville. ' +
                     'En fond sonore : bruits off de la scène (légers, jamais explicites), ' +
                     'mêlés progressivement à la musique de la bande originale qui monte, ' +
                     'jusqu\'à recouvrir entièrement. Coupe franche sur le matin.',
        shotType:    'sound_only',
        tone:        'dramatique',
        rationale:   'Le son off + musique montante = technique classique des années 50-70, très efficace.',
        locales:     [],
        audience:    ['adult', 'universal'],
        duration:    'long (5-10s)',
      },
    ],

    // Adaptations par localité
    localeAdaptations: {
      'jp': {
        note:     'Au Japon, l\'implication est souvent faite via des métaphores visuelles très codifiées : une fleur de cerisier qui tombe, un origami plié, deux tasses de thé.',
        preferred: ['intertwined_hands', 'fireplace_logs'],
      },
      'us': {
        note:     'Aux États-Unis (classification PG-13), le standard est : pas de nudité, suggestif acceptable. Le "morning after" est la norme.',
        preferred: ['morning_after', 'disheveled_hair_smile', 'hotel_door_close'],
      },
      'fr': {
        note:     'En France, la suggestion poétique est culturellement valorisée. Rideau, métaphores visuelles.',
        preferred: ['window_curtain_wind', 'fireplace_logs', 'intertwined_hands'],
      },
      'sa': {
        note:     'Pays du Golfe : éviter toute suggestion intime entre non-mariés. Préférer uniquement mains entrelacées si couple marié, sinon coupe directe au matin sans transition.',
        preferred: ['morning_after'],
      },
      'in': {
        note:     'Inde (certification U/A) : romantisme acceptable, intimité suggérée via musique et nature. Fleurs, pluie, coucher de soleil.',
        preferred: ['window_curtain_wind', 'intertwined_hands'],
      },
      'kr': {
        note:     'Corée du Sud : montrer la tension émotionnelle plutôt que physique. Regard intense, proximité des visages.',
        preferred: ['intertwined_hands', 'disheveled_hair_smile'],
      },
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // VIOLENCE GRAPHIQUE
  // Principe : montrer la réaction, pas l'action.
  // ══════════════════════════════════════════════════════════════════════════════
  {
    sceneId:     'scene_graphic_violence',
    category:    'violence',
    description: 'Scène de violence graphique ou gore',
    keywords:    ['scène de violence', 'sang', 'meurtre graphique', 'torture', 'combat brutal'],
    level:       'medium',
    sequences: [
      {
        id:          'reaction_shot',
        description: 'Coupe sur le visage d\'un témoin. Ses yeux s\'écartent. Il détourne le regard. ' +
                     'On entend le son off. La caméra reste sur son visage.',
        shotType:    'reaction',
        tone:        'dramatique',
        rationale:   'Le visage humain est plus éloquent que tout effet spécial. Hitchcock l\'avait compris.',
        locales:     [],
        audience:    ['teen', 'adult', 'universal'],
        duration:    'moyen (3-5s)',
      },
      {
        id:          'shadow_on_wall',
        description: 'La scène se déroule hors-champ. On voit l\'ombre projetée sur le mur. ' +
                     'Sons uniquement. Puis silence.',
        shotType:    'cutaway',
        tone:        'dramatique',
        rationale:   'L\'ombre est une technique du cinéma expressionniste allemand des années 20. Toujours efficace.',
        locales:     [],
        audience:    ['family', 'teen', 'adult', 'universal'],
        duration:    'moyen (3-5s)',
      },
      {
        id:          'aftermath_only',
        description: 'Coupe directe sur l\'après. La scène est vide. Un objet au sol. ' +
                     'La caméra ne s\'attarde pas. Un personnage entre, comprend, repart.',
        shotType:    'cutaway',
        tone:        'neutre',
        rationale:   'L\'imagination du spectateur est bien plus efficace que tout ce qu\'on pourrait montrer.',
        locales:     [],
        audience:    ['family', 'teen', 'adult', 'universal'],
        duration:    'court (1-2s)',
      },
    ],
    localeAdaptations: {
      'us': { note: 'US : La violence suggérée est souvent mieux cotée (PG) que la violence montrée (R).', preferred: ['reaction_shot'] },
      'de': { note: 'Allemagne (FSK) : violence stylisée acceptable, gore interdit pour moins de 18 ans. Privilégier ombre ou réaction.',  preferred: ['shadow_on_wall'] },
      'jp': { note: 'Japon : violence graphique tolérée dans certains genres (anime), mais violence réaliste très réglementée. Préférer aftermath.',  preferred: ['aftermath_only'] },
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // CONSOMMATION DE DROGUES
  // ══════════════════════════════════════════════════════════════════════════════
  {
    sceneId:     'scene_drug_use',
    category:    'drogues',
    description: 'Scène de consommation de drogues à l\'écran',
    keywords:    ['se droguer', 'fumer un joint', 'sniffer', 'shoot', 'prendre de la drogue'],
    level:       'medium',
    sequences: [
      {
        id:          'before_after_state',
        description: 'Plan sur le personnage avant (agité, nerveux). ' +
                     'Coupe sur objets (non identifiables). Son off bref. ' +
                     'Plan sur le personnage après (yeux mi-clos, apaisé mais ailleurs).',
        shotType:    'reaction',
        tone:        'dramatique',
        rationale:   'Montrer l\'effet sur l\'être humain est plus fort dramatiquement que montrer la substance.',
        locales:     [],
        audience:    ['adult', 'universal'],
        duration:    'moyen (3-5s)',
      },
      {
        id:          'open_window_smoke',
        description: 'Plan sur la fenêtre ouverte sur la nuit. Une fumée blanche sort dans l\'air froid. ' +
                     'Un bras. Rien d\'identifiable. La caméra regarde la fumée se dissoudre.',
        shotType:    'symbolic',
        tone:        'poétique',
        rationale:   'La fumée est métaphore d\'évasion et d\'addiction sans jamais être explicite.',
        locales:     [],
        audience:    ['teen', 'adult', 'universal'],
        duration:    'long (5-10s)',
      },
    ],
    localeAdaptations: {
      'nl': { note: 'Pays-Bas : usage du cannabis légal, représentation moins sensible.', preferred: ['before_after_state'] },
      'us': { note: 'USA : montrer l\'usage dans une œuvre dramatique est souvent acceptable si les conséquences sont montrées.', preferred: ['before_after_state'] },
    },
  },
];

// ─── Fonctions principales ─────────────────────────────────────────────────────

/**
 * Retourne les alternatives cinématographiques pour un type de scène donné,
 * filtrées par public cible et localité.
 *
 * @param {string}   sceneId            ID de la scène (ex: 'scene_erotic_explicit')
 * @param {object}   [options]
 * @param {string}   [options.locale]   Code pays ISO (ex: 'fr', 'us', 'jp')
 * @param {string[]} [options.audience] Publics acceptables (ex: ['adult', 'universal'])
 * @param {string}   [options.tone]     Tonalité préférée (ex: 'romantique', 'poétique')
 * @returns {{
 *   scene: object,
 *   sequences: CinematicShot[],
 *   localeNote: string|null,
 *   preferred: string[]
 * }|null}
 */
function getCinematicAlternatives(sceneId, options = {}) {
  const { locale = null, audience = null, tone = null } = options;

  const scene = CINEMATIC_SCENE_SUBSTITUTIONS.find(s => s.sceneId === sceneId);
  if (!scene) return null;

  let sequences = scene.sequences;

  // Filtrer par public cible
  if (audience && audience.length > 0) {
    sequences = sequences.filter(s =>
      s.audience.some(a => audience.includes(a))
    );
  }

  // Filtrer par tonalité si spécifié
  if (tone) {
    const filtered = sequences.filter(s => s.tone === tone);
    if (filtered.length > 0) sequences = filtered;
  }

  // Adapter à la localité
  let localeNote  = null;
  let preferred   = [];
  if (locale && scene.localeAdaptations?.[locale]) {
    const adaptation = scene.localeAdaptations[locale];
    localeNote = adaptation.note;
    preferred  = adaptation.preferred;

    // Re-ordonner : les plans préférés pour cette localité en premier
    sequences = [
      ...sequences.filter(s => preferred.includes(s.id)),
      ...sequences.filter(s => !preferred.includes(s.id)),
    ];
  }

  return {
    scene:     { sceneId: scene.sceneId, category: scene.category, description: scene.description },
    sequences,
    localeNote,
    preferred,
  };
}

/**
 * Cherche les scènes pertinentes à partir de mots-clés dans un texte de description.
 *
 * @param {string}   text      Description de la scène à analyser
 * @param {object}   [options] Mêmes options que getCinematicAlternatives
 * @returns {Array<ReturnType<getCinematicAlternatives>>}
 */
function suggestAlternativesFromText(text, options = {}) {
  if (!text) return [];

  const results = [];
  const lowerText = text.toLowerCase();

  for (const scene of CINEMATIC_SCENE_SUBSTITUTIONS) {
    const hasMatch = scene.keywords.some(kw => lowerText.includes(kw.toLowerCase()));
    if (hasMatch) {
      const alternatives = getCinematicAlternatives(scene.sceneId, options);
      if (alternatives) results.push(alternatives);
    }
  }

  return results;
}

/**
 * Retourne toutes les scènes disponibles, groupées par catégorie.
 * @returns {object}
 */
function getAllCinematicScenes() {
  const byCategory = {};
  for (const scene of CINEMATIC_SCENE_SUBSTITUTIONS) {
    if (!byCategory[scene.category]) byCategory[scene.category] = [];
    byCategory[scene.category].push({
      sceneId:     scene.sceneId,
      description: scene.description,
      keywords:    scene.keywords,
      level:       scene.level,
      sequences:   scene.sequences.length,
      locales:     Object.keys(scene.localeAdaptations ?? {}),
    });
  }
  return byCategory;
}

/**
 * Retourne les codes de localité supportés et leurs notes culturelles
 * pour une scène donnée.
 *
 * @param {string} sceneId
 * @returns {object|null}
 */
function getLocaleNotes(sceneId) {
  const scene = CINEMATIC_SCENE_SUBSTITUTIONS.find(s => s.sceneId === sceneId);
  return scene?.localeAdaptations ?? null;
}

// ─── Export ───────────────────────────────────────────────────────────────────

module.exports = {
  getCinematicAlternatives,
  suggestAlternativesFromText,
  getAllCinematicScenes,
  getLocaleNotes,
  CINEMATIC_SCENE_SUBSTITUTIONS,
};
