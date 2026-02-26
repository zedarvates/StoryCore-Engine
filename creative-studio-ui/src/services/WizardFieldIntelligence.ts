/**
 * WizardFieldIntelligence
 * =========================
 * Moteur de mapping sémantique entre commandes vocales/textuelles
 * et champs de formulaire dans les wizards StoryCore.
 *
 * Supporte les entités :
 *   👤 Personnage — identité, physique, personnalité, background
 *   📍 Lieu — type, ambiance, architecture, période
 *   📦 Objet — type, matériau, état, rareté
 *
 * Exemples de commandes reconnues :
 *   "Mets les yeux en vert"
 *   "Change la couleur des cheveux en roux"
 *   "Il est grand et musclé"
 *   "Elle a une cicatrice sur la joue"
 *   "L'ambiance est sombre et inquiétante"
 *   "La texture est en cuir vieilli"
 *   "Remplace le nom par Zara"
 *   "Génère une suggestion pour le physique"
 *   "Remplis les champs manquants"
 *   "L'arc narratif change : il devient un traître"
 */

// ============================================================================
// TYPES PUBLIC
// ============================================================================

export type WizardEntityType = 'character' | 'location' | 'object' | 'unknown';

export interface FieldPatch {
  /** Section parente (ex: 'visual_identity', 'personality', 'background') */
  section: string | null;
  /** Nom du champ (ex: 'eye_color', 'hair_color', 'name') */
  field: string;
  /** Nouvelle valeur */
  value: unknown;
  /** Confiance 0–1 */
  confidence: number;
  /** Texte humain de ce qui a été compris */
  explanation: string;
}

export interface WizardCommandIntent {
  /** Type d'action demandée */
  action: 'set_field' | 'generate_section' | 'fill_missing' | 'suggest' | 'navigate_tab' | 'unknown';
  /** Entité ciblée */
  entityType: WizardEntityType;
  /** Liste de patches à appliquer */
  patches: FieldPatch[];
  /** Section de wizard à activer (si navigation) */
  targetTab?: string;
  /** Prompt de génération LLM (si action = generate/suggest) */
  generationPrompt?: string;
  /** Section à générer ('appearance', 'personality', etc.) */
  sectionToGenerate?: string;
  /** Confiance globale */
  confidence: number;
  /** Transcript original */
  rawTranscript: string;
}

// ============================================================================
// TABLE DE MAPPING SÉMANTIQUE
// Chaque entrée : keywords → section + field + transform
// ============================================================================

interface FieldRule {
  /** Mots-clés qui déclenchent cette règle (FR + EN + phonétique) */
  keywords: string[];
  /** Section parente (null = champ racine) */
  section: string | null;
  /** Nom du champ */
  field: string;
  /** Type de valeur attendu */
  valueType: 'string' | 'array_push' | 'number' | 'boolean';
  /** Valeurs suggérées (pour autocomplétion) */
  presets?: string[];
  /** Label humain */
  label: string;
}

// ── PERSONNAGE ─────────────────────────────────────────────────────────────

const CHARACTER_FIELD_RULES: FieldRule[] = [
  // ── Identité
  { keywords: ['nom', 'name', 'appelle', 'prenom', 'prénom', 'rename', 'nomme'], section: null, field: 'name', valueType: 'string', label: 'Nom du personnage' },
  { keywords: ['age', 'âge', 'ans', 'years', 'old'], section: 'visual_identity', field: 'age_range', valueType: 'string', label: 'Tranche d\'âge' },
  { keywords: ['genre', 'gender', 'sexe', 'féminin', 'masculin', 'femme', 'homme', 'non-binaire'], section: 'visual_identity', field: 'gender', valueType: 'string', label: 'Genre' },
  { keywords: ['archetype', 'rôle', 'role', 'type de personnage', 'hero', 'héros', 'villain', 'méchant', 'mentor', 'ally'], section: 'role', field: 'archetype', valueType: 'string', label: 'Archétype' },

  // ── Yeux
  { keywords: ['yeux', 'eye', 'eyes', 'oculaire', 'regard', 'iris', 'couleur des yeux', 'eye color', 'eye colour'], section: 'visual_identity', field: 'eye_color', valueType: 'string', presets: ['Bleu', 'Vert', 'Marron', 'Noir', 'Gris', 'Noisette', 'Violet', 'Ambre', 'Rouge'], label: 'Couleur des yeux' },
  { keywords: ['forme des yeux', 'eye shape', 'orbital', 'orbite'], section: 'visual_identity', field: 'eye_shape', valueType: 'string', label: 'Forme des yeux' },

  // ── Cheveux
  { keywords: ['cheveux', 'chevelure', 'hair', 'tof', 'follicular', 'criniere', 'crinière', 'coupe de cheveux', 'coupe', 'couleur des cheveux', 'hair color'], section: 'visual_identity', field: 'hair_color', valueType: 'string', presets: ['Noir', 'Brun', 'Châtain', 'Blond', 'Roux', 'Blanc', 'Gris', 'Bleu', 'Violet', 'Rose', 'Rouge'], label: 'Couleur des cheveux' },
  { keywords: ['style cheveux', 'coiffure', 'hair style', 'haircut', 'coupe'], section: 'visual_identity', field: 'hair_style', valueType: 'string', label: 'Style de cheveux' },
  { keywords: ['longueur cheveux', 'hair length', 'long', 'court', 'mi-long'], section: 'visual_identity', field: 'hair_length', valueType: 'string', label: 'Longueur des cheveux' },

  // ── Peau
  { keywords: ['peau', 'teint', 'skin', 'couleur de peau', 'carnation', 'dermal', 'épiderme'], section: 'visual_identity', field: 'skin_tone', valueType: 'string', presets: ['Très clair', 'Clair', 'Méditerranéen', 'Olive', 'Caramel', 'Brun', 'Très foncé', 'Ébène'], label: 'Teint / couleur de peau' },

  // ── Morphologie
  { keywords: ['taille', 'hauteur', 'height', 'grand', 'petite', 'petit', 'grande'], section: 'visual_identity', field: 'height', valueType: 'string', presets: ['Très petit', 'Petit', 'Moyen', 'Grand', 'Très grand'], label: 'Taille' },
  { keywords: ['corpulence', 'build', 'musculature', 'physique', 'silhouette', 'svelte', 'musclé', 'athlétique', 'costaud', 'mince'], section: 'visual_identity', field: 'build', valueType: 'string', presets: ['Mince', 'Svelte', 'Athlétique', 'Musclé', 'Robuste', 'Enrobé', 'Massif'], label: 'Corpulence' },
  { keywords: ['posture', 'port', 'maintien', 'attitude physique'], section: 'visual_identity', field: 'posture', valueType: 'string', label: 'Posture' },
  { keywords: ['visage', 'facial', 'cranial', 'structure faciale', 'tête'], section: 'visual_identity', field: 'facial_structure', valueType: 'string', label: 'Structure du visage' },

  // ── Vêtements / Style
  { keywords: ['vêtement', 'vêtements', 'tenue', 'habit', 'habit', 'clothing', 'outfit', 'style vestimentaire', 'costume', 'robe', 'armure'], section: 'visual_identity', field: 'clothing_style', valueType: 'string', label: 'Style vestimentaire' },

  // ── Caractéristiques distinctives
  { keywords: ['cicatrice', 'tatouage', 'marque', 'scar', 'tattoo', 'caracteristique', 'caractéristique distinctive', 'anomalie', 'particulier', 'feature'], section: 'visual_identity', field: 'distinctive_features', valueType: 'array_push', label: 'Caractéristique distinctive' },

  // ── Palette de couleurs
  { keywords: ['palette', 'couleur signature', 'teinte', 'color palette', 'chroma'], section: 'visual_identity', field: 'color_palette', valueType: 'array_push', label: 'Palette de couleurs' },

  // ── Personnalité
  { keywords: ['personnalité', 'personality', 'caractère', 'tempérament', 'nature'], section: 'personality', field: 'traits', valueType: 'array_push', label: 'Traits de personnalité' },
  { keywords: ['motivation', 'but', 'objectif', 'goal', 'drive', 'désir', 'désire'], section: 'personality', field: 'motivations', valueType: 'string', label: 'Motivations' },
  { keywords: ['peur', 'crainte', 'fear', 'phobie', 'phobia', 'anxiete', 'anxiété'], section: 'personality', field: 'fears', valueType: 'string', label: 'Peurs' },
  { keywords: ['défaut', 'flaw', 'faiblesse', 'weakness', 'vice', 'travers'], section: 'personality', field: 'flaws', valueType: 'string', label: 'Défauts' },
  { keywords: ['vertu', 'qualité', 'quality', 'force', 'strength', 'talent'], section: 'personality', field: 'strengths', valueType: 'string', label: 'Qualités / forces' },

  // ── Arc narratif
  { keywords: ['arc', 'arc narratif', 'evolution', 'evolution du personnage', 'traître', 'trahison', 'redemption', 'rédemption', 'transformation'], section: 'background', field: 'character_arc', valueType: 'string', label: 'Arc narratif' },

  // ── Background
  { keywords: ['origine', 'background', 'histoire', 'passé', 'past', 'naissance', 'born', 'vient de'], section: 'background', field: 'origin', valueType: 'string', label: 'Origine' },
  { keywords: ['profession', 'metier', 'métier', 'job', 'occupation', 'career'], section: 'background', field: 'occupation', valueType: 'string', label: 'Profession' },
];

// ── LIEU ────────────────────────────────────────────────────────────────────

const LOCATION_FIELD_RULES: FieldRule[] = [
  { keywords: ['nom', 'name', 'appelle', 's\'appelle', 'nomme'], section: null, field: 'name', valueType: 'string', label: 'Nom du lieu' },
  { keywords: ['type', 'categorie', 'catégorie', 'genre de lieu', 'kind of place'], section: null, field: 'type', valueType: 'string', presets: ['Urbain', 'Rural', 'Souterrain', 'Aquatique', 'Spatial', 'Fantastique'], label: 'Type de lieu' },
  { keywords: ['ambiance', 'atmosphère', 'atmosphere', 'mood', 'feeling', 'ambience', 'sombre', 'lumineux', 'inquiétant', 'chaleureux'], section: null, field: 'atmosphere', valueType: 'string', label: 'Ambiance' },
  { keywords: ['architecture', 'style architectural', 'bâtiment', 'construction', 'structure'], section: null, field: 'architecture_style', valueType: 'string', label: 'Architecture' },
  { keywords: ['époque', 'periode', 'période', 'ère', 'ere', 'siècle', 'siecle', 'period', 'era', 'age'], section: null, field: 'time_period', valueType: 'string', label: 'Époque' },
  { keywords: ['climat', 'weather', 'temps', 'météo', 'meteo', 'chaud', 'froid', 'tropical', 'arctique'], section: null, field: 'climate', valueType: 'string', label: 'Climat' },
  { keywords: ['description', 'décrit', 'décrit comme', 'describe', 'looks like', 'ressemble'], section: null, field: 'description', valueType: 'string', label: 'Description' },
  { keywords: ['élément', 'caracteristique', 'caractéristique', 'feature', 'detail', 'détail', 'particularité'], section: null, field: 'distinctive_features', valueType: 'array_push', label: 'Éléments distinctifs' },
];

// ── OBJET ────────────────────────────────────────────────────────────────────

const OBJECT_FIELD_RULES: FieldRule[] = [
  { keywords: ['nom', 'name', 'appelle', 's\'appelle'], section: null, field: 'name', valueType: 'string', label: 'Nom de l\'objet' },
  { keywords: ['type', 'categorie', 'catégorie', 'genre objet'], section: null, field: 'type', valueType: 'string', presets: ['Arme', 'Armure', 'Bijou', 'Livre', 'Artefact', 'Outil', 'Véhicule', 'Vêtement'], label: 'Type d\'objet' },
  { keywords: ['matériau', 'materiau', 'material', 'fait en', 'made of', 'composé de', 'métal', 'bois', 'cuir', 'pierre', 'verre'], section: null, field: 'material', valueType: 'string', label: 'Matériau' },
  { keywords: ['couleur', 'color', 'colour', 'teinte', 'hue', 'chromatique'], section: null, field: 'color', valueType: 'string', label: 'Couleur' },
  { keywords: ['état', 'etat', 'condition', 'usé', 'neuf', 'ancien', 'abimé', 'abîmé', 'pristine', 'damaged', 'worn'], section: null, field: 'condition', valueType: 'string', presets: ['Neuf', 'Bon état', 'Usé', 'Endommagé', 'Ancien', 'Magique'], label: 'État' },
  { keywords: ['rareté', 'rarete', 'rarity', 'rare', 'commun', 'légendaire', 'mythique', 'unique'], section: null, field: 'rarity', valueType: 'string', presets: ['Commun', 'Peu commun', 'Rare', 'Épique', 'Légendaire', 'Unique'], label: 'Rareté' },
  { keywords: ['description', 'décrit', 'decrit', 'looks like', 'ressemble', 'aspect'], section: null, field: 'description', valueType: 'string', label: 'Description' },
  { keywords: ['pouvoir', 'power', 'capacité', 'capacite', 'effet', 'ability', 'magic', 'magie'], section: null, field: 'special_ability', valueType: 'string', label: 'Pouvoir / capacité spéciale' },
  { keywords: ['appartient', 'propriétaire', 'owner', 'possedé par', 'possédé par'], section: null, field: 'owner', valueType: 'string', label: 'Propriétaire' },
];

// ── COULEURS — Mapping phonétique ──────────────────────────────────────────

const COLOR_MAPPING: Record<string, string> = {
  // FR
  'vert': 'Vert', 'verts': 'Vert', 'verte': 'Vert', 'vertes': 'Vert',
  'bleu': 'Bleu', 'bleue': 'Bleu', 'bleus': 'Bleu', 'bleues': 'Bleu', 'azur': 'Bleu azur',
  'rouge': 'Rouge', 'rouges': 'Rouge', 'cramoisi': 'Cramoisi',
  'noir': 'Noir', 'noire': 'Noir', 'ebene': 'Ébène', 'ébène': 'Ébène',
  'blanc': 'Blanc', 'blanche': 'Blanc', 'blancs': 'Blanc',
  'brun': 'Brun', 'brune': 'Brun', 'marron': 'Marron', 'chocolat': 'Marron chocolat',
  'roux': 'Roux', 'rousse': 'Roux', 'auburn': 'Auburn',
  'blond': 'Blond', 'blonde': 'Blond', 'doré': 'Blond doré', 'dore': 'Blond doré',
  'gris': 'Gris', 'grise': 'Gris', 'argent': 'Argenté', 'argenté': 'Argenté', 'plat': 'Gris platine',
  'violet': 'Violet', 'violette': 'Violet', 'mauve': 'Mauve', 'pourpre': 'Pourpre',
  'rose': 'Rose', 'fuschia': 'Fuchsia', 'magenta': 'Magenta',
  'orange': 'Orange', 'cuivre': 'Cuivré', 'cuivré': 'Cuivré',
  'jaune': 'Jaune', 'or': 'Or', 'doree': 'Doré', 'dorée': 'Doré',
  'turquoise': 'Turquoise', 'cyan': 'Cyan', 'emeraude': 'Émeraude', 'émeraude': 'Émeraude',
  'ambre': 'Ambre', 'noisette': 'Noisette', 'miel': 'Miel',
  // EN
  'green': 'Vert', 'blue': 'Bleu', 'red': 'Rouge', 'black': 'Noir', 'white': 'Blanc',
  'brown': 'Marron', 'auburn': 'Auburn', 'blonde': 'Blond', 'gray': 'Gris', 'grey': 'Gris',
  'purple': 'Violet', 'pink': 'Rose', 'orange': 'Orange', 'yellow': 'Jaune',
  'silver': 'Argenté', 'gold': 'Doré', 'hazel': 'Noisette', 'amber': 'Ambre',
};

// ============================================================================
// WIZARD FIELD INTELLIGENCE — Classe principale
// ============================================================================

export class WizardFieldIntelligence {

  /**
   * Parse une commande vocale ou textuelle et retourne les patches à appliquer.
   */
  static parseCommand(transcript: string, entityType: WizardEntityType = 'character'): WizardCommandIntent {
    const lower = this.normalize(transcript);

    // ── Détection de l'action ─────────────────────────────────────────────

    // Génération / suggestion de section
    const generateMatch = this.detectGenerationRequest(lower);
    if (generateMatch) {
      return {
        action: 'generate_section',
        entityType,
        patches: [],
        sectionToGenerate: generateMatch.section,
        generationPrompt: generateMatch.prompt,
        confidence: 0.9,
        rawTranscript: transcript,
      };
    }

    // Remplir les champs vides
    if (this.detectFillMissingRequest(lower)) {
      return {
        action: 'fill_missing',
        entityType,
        patches: [],
        confidence: 0.95,
        rawTranscript: transcript,
      };
    }

    // Navigation vers un onglet
    const tabNav = this.detectTabNavigation(lower);
    if (tabNav) {
      return {
        action: 'navigate_tab',
        entityType,
        patches: [],
        targetTab: tabNav,
        confidence: 0.9,
        rawTranscript: transcript,
      };
    }

    // ── Extraction des patches ─────────────────────────────────────────────

    const rules = this.getRulesForEntity(entityType);
    const patches: FieldPatch[] = [];

    for (const rule of rules) {
      const patch = this.matchRule(lower, rule, transcript);
      if (patch) {
        patches.push(patch);
      }
    }

    if (patches.length > 0) {
      return {
        action: 'set_field',
        entityType,
        patches,
        confidence: Math.max(...patches.map(p => p.confidence)),
        rawTranscript: transcript,
      };
    }

    return {
      action: 'unknown',
      entityType,
      patches: [],
      confidence: 0,
      rawTranscript: transcript,
    };
  }

  /**
   * Retourne les règles de champs selon le type d'entité.
   */
  private static getRulesForEntity(entityType: WizardEntityType): FieldRule[] {
    switch (entityType) {
      case 'character': return CHARACTER_FIELD_RULES;
      case 'location':  return LOCATION_FIELD_RULES;
      case 'object':    return OBJECT_FIELD_RULES;
      default:          return CHARACTER_FIELD_RULES;
    }
  }

  /**
   * Tente de matcher une règle dans le transcript.
   * Retourne un FieldPatch si trouvé, null sinon.
   */
  private static matchRule(lower: string, rule: FieldRule, original: string): FieldPatch | null {
    // Vérifier si un mot-clé de la règle est dans le transcript
    const matchedKeyword = rule.keywords.find(kw => lower.includes(kw));
    if (!matchedKeyword) return null;

    // Extraire la valeur
    const value = this.extractValue(lower, original, rule, matchedKeyword);
    if (value === null) return null;

    return {
      section: rule.section,
      field: rule.field,
      value,
      confidence: this.scoreConfidence(lower, matchedKeyword, value),
      explanation: `${rule.label} → "${value}"`,
    };
  }

  /**
   * Extrait la valeur à assigner depuis le transcript.
   */
  private static extractValue(lower: string, original: string, rule: FieldRule, matchedKeyword: string): unknown | null {
    // ── Couleurs : chercher dans la map de couleurs ────────────────────────
    if (rule.field === 'eye_color' || rule.field === 'hair_color' || rule.field === 'skin_tone' || rule.field === 'color') {
      const color = this.extractColor(lower);
      if (color) return color;
    }

    // ── Valeurs prédéfinies : chercher parmi les presets ──────────────────
    if (rule.presets && rule.presets.length > 0) {
      for (const preset of rule.presets) {
        if (lower.includes(preset.toLowerCase())) {
          return preset;
        }
      }
      // Essayer la couleur si c'est un champ couleur
      const color = this.extractColor(lower);
      if (color) return color;
    }

    // ── Extraction de texte après le mot-clé ─────────────────────────────
    return this.extractTextAfterKeyword(original, matchedKeyword);
  }

  /**
   * Extrait une couleur du transcript via le mapping de couleurs.
   */
  private static extractColor(lower: string): string | null {
    const words = lower.split(/\s+/);
    for (const word of words) {
      const clean = word.replace(/[,.'!?]/g, '');
      if (COLOR_MAPPING[clean]) {
        return COLOR_MAPPING[clean];
      }
    }
    // Essayer des combinaisons de 2 mots (ex: "vert émeraude")
    for (let i = 0; i < words.length - 1; i++) {
      const combo = `${words[i]} ${words[i + 1]}`.replace(/[,.'!?]/g, '');
      if (COLOR_MAPPING[combo]) {
        return COLOR_MAPPING[combo];
      }
    }
    return null;
  }

  /**
   * Extrait le texte qui suit un mot-clé dans la phrase.
   * Ex: "le nom est Zara" → trouve "nom", extrait "Zara"
   */
  private static extractTextAfterKeyword(original: string, keyword: string): string | null {
    const lowerOriginal = this.normalize(original);
    const keywordIdx = lowerOriginal.indexOf(keyword);
    if (keywordIdx === -1) return null;

    // Trouver le contenu après le keyword, en sautant les mots de liaison
    const afterKeyword = original.slice(keywordIdx + keyword.length).trim();
    const cleaned = afterKeyword
      .replace(/^(est|sont|sera|dans|en|de|du|des|par|:\s*|à|au|aux|le|la|les|un|une|des|should be|is|are|to|the|a|an)\s+/i, '')
      .replace(/[.,!?;]$/, '')
      .trim();

    return cleaned.length > 0 ? cleaned : null;
  }

  /**
   * Score de confiance basé sur la présence de mots de liaison forts.
   */
  private static scoreConfidence(lower: string, keyword: string, value: unknown): number {
    let score = 0.65; // base

    // Mots de liaison clairs augmentent la confiance
    const strongLinks = ['est', 'sont', 'devient', 'remplace', 'change', 'mets', 'met', 'mettre',
      'à la place de', 'instead of', 'is', 'should be', 'change to', 'set to', 'make'];
    if (strongLinks.some(link => lower.includes(link))) score += 0.2;

    // Valeur de couleur = confiance élevée
    if (typeof value === 'string' && Object.values(COLOR_MAPPING).some(c => c.toLowerCase() === (value as string).toLowerCase())) {
      score += 0.1;
    }

    // Keyword exact et long = plus fiable
    if (keyword.length > 5) score += 0.05;

    return Math.min(score, 1.0);
  }

  /**
   * Détecte une demande de génération IA (physique, personnalité, background…)
   */
  private static detectGenerationRequest(lower: string): { section: string; prompt: string } | null {
    const sections: Array<{ keywords: string[]; section: string; prompt: string }> = [
      {
        keywords: ['génère physique', 'generate appearance', 'génère apparence', 'suggère physique', 'créer physique', 'invente un physique'],
        section: 'appearance',
        prompt: 'Génère un profil physique cohérent et original pour ce personnage.',
      },
      {
        keywords: ['génère personnalité', 'generate personality', 'suggère personnalité', 'invente personnalité'],
        section: 'personality',
        prompt: 'Génère une personnalité riche, avec traits, motivations, peurs et défauts cohérents.',
      },
      {
        keywords: ['génère background', 'generate background', 'suggère histoire', 'invente histoire', 'génère histoire', 'invente un passé'],
        section: 'background',
        prompt: 'Génère un background profond avec origine, arc narratif et occupation.',
      },
      {
        keywords: ['génère tout', 'generate everything', 'remplis tout', 'fill everything', 'complète tout'],
        section: 'all',
        prompt: 'Génère un profil complet et cohérent pour ce personnage.',
      },
      {
        keywords: ['génère ambiance', 'generate atmosphere', 'génère atmosphère', 'suggère ambiance'],
        section: 'atmosphere',
        prompt: 'Génère une description d\'ambiance riche et immersive pour ce lieu.',
      },
    ];

    for (const { keywords, section, prompt } of sections) {
      if (keywords.some(kw => lower.includes(kw))) {
        return { section, prompt };
      }
    }

    // Détecter "génère quelque chose" générique
    const genericGenerate = [
      'génère', 'générer', 'generate', 'suggère', 'suggérer', 'suggest',
      'invente', 'inventer', 'imagine', 'propose', 'crée', 'créer',
    ];
    if (genericGenerate.some(kw => lower.includes(kw))) {
      return { section: 'current', prompt: 'Génère une suggestion cohérente pour la section actuelle.' };
    }

    return null;
  }

  /**
   * Détecte une demande de remplissage des champs vides.
   */
  private static detectFillMissingRequest(lower: string): boolean {
    const keywords = [
      'remplis', 'remplir', 'remplis les cases', 'remplis les champs',
      'complète', 'compléter', 'fill missing', 'fill the fields', 'fill in',
      'champs manquants', 'cases vides', 'champs vides', 'missing fields',
    ];
    return keywords.some(kw => lower.includes(kw));
  }

  /**
   * Détecte la navigation vers un onglet de wizard.
   */
  private static detectTabNavigation(lower: string): string | null {
    const tabMap: Record<string, string[]> = {
      'identity': ['identité', 'identite', 'identity', 'nom onglet', 'onglet identité'],
      'appearance': ['physique', 'apparence', 'appearance', 'morphologie', 'onglet physique'],
      'personality': ['personnalité', 'personnalite', 'personality', 'caractère', 'onglet personnalité'],
      'background': ['background', 'histoire', 'passé', 'passe', 'onglet histoire'],
      'relationships': ['relations', 'relationship', 'liens', 'onglet relations'],
      'images': ['images', 'photos', 'visuel', 'onglet images'],
      'prompts': ['prompts', 'onglet prompts', 'prompt'],
    };

    const navPrefixes = ['va sur', 'onglet', 'tab', 'montre', 'affiche', 'go to', 'show', 'open tab'];
    const hasNavPrefix = navPrefixes.some(p => lower.includes(p));

    for (const [tabId, keywords] of Object.entries(tabMap)) {
      if (keywords.some(kw => lower.includes(kw))) {
        if (hasNavPrefix || keywords.some(kw => lower.startsWith(kw))) {
          return tabId;
        }
      }
    }

    return null;
  }

  /**
   * Normalise un texte : minuscules + suppression accents pour comparaison.
   */
  private static normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '') // enlever accents
      .replace(/['']/g, "'")           // normaliser apostrophes
      .trim();
  }

  /**
   * Retourne des exemples de commandes pour un type d'entité.
   */
  static getSuggestionsFor(entityType: WizardEntityType): string[] {
    switch (entityType) {
      case 'character':
        return [
          'Mets les yeux en vert',
          'Change la couleur des cheveux en roux',
          'Elle est grande et athlétique',
          'Il a une cicatrice sur la joue',
          'L\'arc narratif : il devient un traître',
          'Génère un physique cohérent',
          'Remplis les champs manquants',
          'Va sur l\'onglet personnalité',
          'Sa motivation est la vengeance',
          'Ajoute une tenue en cuir noir',
        ];
      case 'location':
        return [
          'L\'ambiance est sombre et inquiétante',
          'Architecture gothique médiévale',
          'Climat tropical, humide et chaud',
          'Ajoute un détail : ruines envahies par la végétation',
          'Époque : Japon féodal XVIIe siècle',
          'Génère une atmosphère',
          'Le type de lieu est souterrain',
        ];
      case 'object':
        return [
          'Il est fait en acier rune-gravé',
          'La couleur est argentée avec des reflets bleus',
          'État : ancien, légèrement endommagé',
          'Rareté : légendaire',
          'Son pouvoir : peut absorber la magie environnante',
          'Il appartient au héros principal',
          'Génère une description',
        ];
      default:
        return [];
    }
  }
}

// Export du parser pour usage direct
export const wizardFieldIntelligence = WizardFieldIntelligence;
