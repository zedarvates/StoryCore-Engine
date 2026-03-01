/**
 * Narrative Substitution Engine — Content Sensitivity Addon
 *
 * Au lieu de pixeliser ou simplement censurer [CENSURÉ], ce module propose
 * des ALTERNATIVES NARRATIVES CRÉATIVES qui préservent la tension dramatique
 * tout en remplaçant le contenu problématique par des équivalents acceptables.
 *
 * Principe : chaque objet/concept sensible a des équivalents narratifs
 * soigneusement choisis pour garder le sens de la scène (menace, tension,
 * mystère, pouvoir) sans exposer explicitement le contenu original.
 *
 * Exemples :
 *   - Pistolet       → talky-walky, baguette magique, perceuse
 *   - Poudre blanche → fleurs de coquelicot, farine, sucre glace
 *   - Tête de mort + masque à gaz → masque de carnaval vénitien, visage de marionnette
 */

'use strict';

// ─── Base de substitutions narratives ─────────────────────────────────────────
//
// Chaque entrée contient :
//   - pattern    : RegExp pour détecter l'élément sensible dans le texte
//   - category   : catégorie thématique
//   - level      : niveau de sensibilité minimal pour déclencher la substitution
//   - original   : terme canonique représenté
//   - alternatives : tableau d'alternatives, du plus sobre au plus créatif
//     Chaque alternative :
//       - text    : le terme de remplacement narratif
//       - tone    : tonalité ('neutre', 'poétique', 'absurde', 'enfantin', 'symbolique')
//       - rationale: pourquoi ça fonctionne narrativement
//
// ─────────────────────────────────────────────────────────────────────────────

const NARRATIVE_SUBSTITUTIONS = [

  // ── ARMES À FEU ──────────────────────────────────────────────────────────────
  {
    pattern:     /\b(pistolet|flingue|arme à feu|revolver|gun|handgun|firearm|glock)\b/gi,
    category:    'armes',
    level:       'medium',
    original:    'pistolet',
    alternatives: [
      { text: 'talky-walky',          tone: 'absurde',    rationale: 'Même forme, même geste de "pointer", tension préservée.' },
      { text: 'perceuse',             tone: 'neutre',     rationale: 'Objet tenu de la même façon, potentiellement menaçant.' },
      { text: 'baguette de chef d\'orchestre', tone: 'poétique', rationale: 'Pouvoir de contrôler, d\'imposer le silence.' },
      { text: 'briquet chromé',       tone: 'symbolique', rationale: 'Objet compact tenu en main, évoque le pouvoir et le danger.' },
    ],
  },
  {
    pattern:     /\b(fusil|carabine|rifle|shotgun|sniper|kalachnikov|AK)\b/gi,
    category:    'armes',
    level:       'medium',
    original:    'fusil',
    alternatives: [
      { text: 'longue-vue en bois',   tone: 'poétique',   rationale: 'Même silhouette allongée, même geste de viser.' },
      { text: 'canne de chasseur',    tone: 'neutre',     rationale: 'Conserve le personnage du chasseur sans l\'arme.' },
      { text: 'trépied de photographe', tone: 'absurde',  rationale: 'Longue structure à trois pattes, même posture.' },
    ],
  },
  {
    pattern:     /\b(bombe|explosif|grenade|TNT|dynamite|IED)\b/gi,
    category:    'armes',
    level:       'high',
    original:    'bombe',
    alternatives: [
      { text: 'citrouille sculptée',  tone: 'absurde',    rationale: 'Objet rond, même tension de "quelque chose va exploser".' },
      { text: 'boîte à musique',      tone: 'poétique',   rationale: 'Objet mystérieux qu\'on n\'ose pas ouvrir.' },
      { text: 'réveil mécanique',     tone: 'symbolique', rationale: 'Décompte du temps, même tension.' },
      { text: 'valise abandonnée',    tone: 'neutre',     rationale: 'Objet suspect sans être explicite.' },
    ],
  },
  {
    pattern:     /\b(couteau|lame|poignard|dague|stiletto|couteau de chasse)\b/gi,
    category:    'armes',
    level:       'low',
    original:    'couteau',
    alternatives: [
      { text: 'stylet de calligraphe', tone: 'poétique',  rationale: 'Lame fine, geste précis, pouvoir des mots.' },
      { text: 'règle en métal',       tone: 'absurde',    rationale: 'Objet tranchant du quotidien.' },
      { text: 'sabre de liège',       tone: 'enfantin',   rationale: 'Dédramatise la scène pour un public jeune.' },
    ],
  },

  // ── DROGUES & SUBSTANCES ──────────────────────────────────────────────────────
  {
    pattern:     /\b(poudre blanche|cocaïne|cocaine|coke|neige|charlie)\b/gi,
    category:    'drogues',
    level:       'high',
    original:    'poudre blanche',
    alternatives: [
      { text: 'fleurs de coquelicot séchées', tone: 'poétique',   rationale: 'Belle image poétique, reference historique (1ere guerre) sans être explicite.' },
      { text: 'sucre glace',                  tone: 'enfantin',   rationale: 'Même aspect visuel, totalement inoffensif.' },
      { text: 'sel de mer',                   tone: 'neutre',     rationale: 'Poudre blanche du quotidien.' },
      { text: 'farine de sarrasin',           tone: 'absurde',    rationale: 'Concret, banal, décale l\'imagerie.' },
      { text: 'cendres d\'encens blanc',      tone: 'symbolique', rationale: 'Dimension rituelle, mystérieuse.' },
    ],
  },
  {
    pattern:     /\b(héroïne|heroin|opium|morphine|smack|horse)\b/gi,
    category:    'drogues',
    level:       'high',
    original:    'héroïne',
    alternatives: [
      { text: 'sirop de pavot',        tone: 'poétique',  rationale: 'La plante d\'origine, évocateur sans être direct.' },
      { text: 'thé de minuit',         tone: 'symbolique', rationale: 'Rituel nocturne, substance apaisante et trouble.' },
      { text: 'encre noire de seiche', tone: 'absurde',   rationale: 'Substance sombre et liquide, déroute le lecteur.' },
    ],
  },
  {
    pattern:     /\b(cannabis|marijuana|weed|herbe|joint|pétard|shit)\b/gi,
    category:    'drogues',
    level:       'medium',
    original:    'cannabis',
    alternatives: [
      { text: 'cigare de feuilles d\'automne', tone: 'poétique',  rationale: 'Même geste, même forme, inoffensif.' },
      { text: 'cigarette de verveine',          tone: 'neutre',   rationale: 'Herbe aromatique, même rituel.' },
      { text: 'bougie d\'encens',               tone: 'symbolique', rationale: 'Fumée, relaxation, dimension ésotérique.' },
    ],
  },
  {
    pattern:     /\b(seringue|shoot|s'shooter|piquer)\b/gi,
    category:    'drogues',
    level:       'high',
    original:    'seringue',
    alternatives: [
      { text: 'stylo-plume en verre',  tone: 'poétique',  rationale: 'Même forme délicate en verre, geste de "piquer" le papier.' },
      { text: 'épingle à chapeau',     tone: 'absurde',   rationale: 'Objet pointu du quotidien, complètement décalé.' },
    ],
  },

  // ── VIOLENCE & MORT ───────────────────────────────────────────────────────────
  {
    pattern:     /\b(tuer|assassiner|murder|kill|éliminer|liquider)\b/gi,
    category:    'violence',
    level:       'medium',
    original:    'tuer',
    alternatives: [
      { text: 'faire disparaître',    tone: 'neutre',     rationale: 'Euphémisme narratif classique, tension maintenue.' },
      { text: 'mettre hors jeu',      tone: 'symbolique', rationale: 'Métaphore sportive, dédramatise sans effacer l\'action.' },
      { text: 'effacer',              tone: 'poétique',   rationale: 'Court, puissant, abstrait.' },
    ],
  },
  {
    pattern:     /\b(sang|saignement|hémorragie|blood)\b/gi,
    category:    'violence',
    level:       'medium',
    original:    'sang',
    alternatives: [
      { text: 'encre rouge',          tone: 'poétique',   rationale: 'Métaphore visuelle, même couleur, dimension artistique.' },
      { text: 'jus de grenade',       tone: 'absurde',    rationale: 'Même couleur, complètement inoffensif.' },
      { text: 'teinture de garance',  tone: 'symbolique', rationale: 'Colorant naturel rouge, dimension historique.' },
    ],
  },

  // ── SYMBOLES CULTURELS SENSIBLES ─────────────────────────────────────────────
  {
    pattern:     /\b(têtes? de mort|skulls?|crânes? humains?)\b/gi,
    category:    'symboles',
    level:       'medium',
    original:    'tête de mort',
    alternatives: [
      { text: 'masque de carnaval vénitien', tone: 'poétique',   rationale: 'Masque qui cache le visage, même mystère, esthétique riche.' },
      { text: 'visage de marionnette ancienne', tone: 'absurde', rationale: 'Inquiétant sans être morbide, dimension théâtrale.' },
      { text: 'chapeau de brigand médiéval',  tone: 'neutre',   rationale: 'Symbolise le danger et la transgression sans la mort.' },
      { text: 'masque de loup sculpté sur bois', tone: 'symbolique', rationale: 'Symbole de prédation dans de nombreuses cultures.' },
    ],
  },
  {
    pattern:     /\b(masques? à gaz)\b/gi,
    category:    'symboles',
    level:       'medium',
    original:    'masque à gaz',
    alternatives: [
      { text: 'masque d\'apiculteur',         tone: 'absurde',    rationale: 'Même esthétique protectrice, dimension bucolique.' },
      { text: 'heaume de chevalier médiéval', tone: 'poétique',   rationale: 'Protection du visage, dimension héroïque et historique.' },
      { text: 'casque de plongée à hublot',   tone: 'neutre',     rationale: 'Même look industriel, connotation aventurière.' },
    ],
  },
  {
    pattern:     /\b(croix gammée|svastika|swastika|nazi)\b/gi,
    category:    'symboles',
    level:       'high',
    original:    'croix gammée',
    alternatives: [
      { text: 'symbole alchimique interdit',  tone: 'symbolique', rationale: 'Garde le côté "symbole occulte" sans référence historique directe.' },
      { text: 'sceau de faction obscure',     tone: 'neutre',     rationale: 'Generic mais efficace narrativement.' },
    ],
  },

  // ── CONTENU SEXUEL ────────────────────────────────────────────────────────────
  {
    pattern:     /\b(nu|nude|naked|dénudé|déshabillé|seins|sein nu)\b/gi,
    category:    'contenu_adulte',
    level:       'medium',
    original:    'nudité',
    alternatives: [
      { text: 'peinture à l\'huile d\'un modèle classique', tone: 'poétique',  rationale: 'Référence artistique, même sujet, dignité préservée.' },
      { text: 'silhouette de papier découpé',               tone: 'symbolique', rationale: 'Forme sans détail, suggestion pure.' },
      { text: 'mannequin de couturier',                     tone: 'neutre',     rationale: 'Corps humain dans un contexte professionnel.' },
    ],
  },

  // ── VIOLENCE PSYCHOLOGIQUE & ORGANISATION CRIMINELLE ─────────────────────────
  {
    pattern:     /\b(cartel|mafia|gang|organisation criminelle)\b/gi,
    category:    'crime',
    level:       'medium',
    original:    'organisation criminelle',
    alternatives: [
      { text: 'guilde des marchands de nuit',  tone: 'poétique',   rationale: 'Dimension fantasy, même structure hiérarchique et dangereuse.' },
      { text: 'confrérie des ombres',          tone: 'symbolique', rationale: 'Mystérieux, parallèle clair sans être explicite.' },
      { text: 'société secrète de collectionneurs', tone: 'absurde', rationale: 'Décale dans le banal tout en gardant la tension de l\'illicite.' },
    ],
  },
  {
    pattern:     /\b(rançon|enlèvement|otage|kidnapping|séquestre)\b/gi,
    category:    'crime',
    level:       'medium',
    original:    'enlèvement',
    alternatives: [
      { text: 'disparition mystérieuse',         tone: 'neutre',     rationale: 'Même situation sans le côté brutal.' },
      { text: 'voyage forcé vers l\'inconnu',    tone: 'poétique',  rationale: 'Maintient la tension le danger, plus abstrait.' },
      { text: 'invitation impossible à décliner', tone: 'symbolique', rationale: 'Euphémisme élégant qui préserve la contrainte.' },
    ],
  },
];

// ─── Modes de sélection d'alternative ────────────────────────────────────────

const SELECTION_MODES = {
  /** Toujours choisir l'alternative la plus neutre (ton: 'neutre') */
  neutral:  (alts) => alts.find(a => a.tone === 'neutre')  ?? alts[0],
  /** Choisir la plus poétique */
  poetic:   (alts) => alts.find(a => a.tone === 'poétique') ?? alts[0],
  /** Pour contenu enfants — toujours 'enfantin' ou le plus doux disponible */
  children: (alts) => alts.find(a => a.tone === 'enfantin') ?? alts.find(a => a.tone === 'absurde') ?? alts[0],
  /** Choisir de façon aléatoire parmi les alternatives */
  random:   (alts) => alts[Math.floor(Math.random() * alts.length)],
  /** Retourner TOUTES les alternatives (pour proposer un choix à l'utilisateur) */
  all:      (alts) => alts,
};

// ─── Fonctions principales ────────────────────────────────────────────────────

/**
 * Applique les substitutions narratives à un texte.
 *
 * @param {string} text            Texte à transformer
 * @param {object} [options]
 * @param {'low'|'medium'|'high'} [options.level='medium']      Niveau de sensibilité minimum
 * @param {'neutral'|'poetic'|'children'|'random'|'all'} [options.mode='neutral']  Mode de sélection
 * @param {string[]} [options.categories]   Filtrer sur des catégories spécifiques
 * @returns {{
 *   substituted: string,
 *   changes: Array<{ original: string, replacement: string, tone: string, rationale: string, category: string }>,
 *   unchanged: boolean
 * }}
 */
function applyNarrativeSubstitutions(text, options = {}) {
  if (!text || typeof text !== 'string') {
    return { substituted: text ?? '', changes: [], unchanged: true };
  }

  const {
    level      = 'medium',
    mode       = 'neutral',
    categories = null,
  } = options;

  const LEVEL_ORDER = { low: 0, medium: 1, high: 2 };
  const currentLevelIndex = LEVEL_ORDER[level] ?? 1;

  let substituted = text;
  const changes   = [];

  const selector = SELECTION_MODES[mode] ?? SELECTION_MODES.neutral;

  for (const entry of NARRATIVE_SUBSTITUTIONS) {
    // Filtrer par niveau : ne traiter que les entrées dont le niveau <= niveau actuel
    if (LEVEL_ORDER[entry.level] > currentLevelIndex) continue;

    // Filtrer par catégorie si spécifié
    if (categories && !categories.includes(entry.category)) continue;

    const matched = [];
    substituted = substituted.replace(entry.pattern, (match) => {
      const selected = selector(entry.alternatives);

      if (Array.isArray(selected)) {
        // Mode 'all' → on retourne la première mais on note toutes les options
        matched.push({
          original:     match,
          replacement:  selected[0].text,
          tone:         selected[0].tone,
          rationale:    selected[0].rationale,
          category:     entry.category,
          allOptions:   selected.map(a => ({ text: a.text, tone: a.tone, rationale: a.rationale })),
        });
        return selected[0].text;
      }

      matched.push({
        original:    match,
        replacement: selected.text,
        tone:        selected.tone,
        rationale:   selected.rationale,
        category:    entry.category,
      });
      return selected.text;
    });

    changes.push(...matched);
  }

  return {
    substituted,
    changes,
    unchanged: changes.length === 0,
  };
}

/**
 * Retourne toutes les alternatives disponibles pour un terme donné,
 * sans effectuer de substitution. Utile pour proposer un choix à l'utilisateur.
 *
 * @param {string} term         Terme à rechercher
 * @returns {Array<{
 *   category: string,
 *   original: string,
 *   alternatives: Array<{ text: string, tone: string, rationale: string }>
 * }>}
 */
function getAlternativesFor(term) {
  const results = [];
  for (const entry of NARRATIVE_SUBSTITUTIONS) {
    if (entry.pattern.test(term)) {
      entry.pattern.lastIndex = 0; // reset stateful regex
      results.push({
        category:     entry.category,
        original:     entry.original,
        level:        entry.level,
        alternatives: entry.alternatives,
      });
    }
  }
  return results;
}

/**
 * Retourne l'ensemble des substitutions disponibles, groupées par catégorie.
 * @returns {object}
 */
function getAllSubstitutions() {
  const byCategory = {};
  for (const entry of NARRATIVE_SUBSTITUTIONS) {
    if (!byCategory[entry.category]) byCategory[entry.category] = [];
    byCategory[entry.category].push({
      original:     entry.original,
      level:        entry.level,
      alternatives: entry.alternatives,
    });
  }
  return byCategory;
}

// ─── Export ───────────────────────────────────────────────────────────────────

module.exports = {
  applyNarrativeSubstitutions,
  getAlternativesFor,
  getAllSubstitutions,
  NARRATIVE_SUBSTITUTIONS,
  SELECTION_MODES,
};
