// ============================================================================
// Wizard Translations
// Internationalization support for all wizard components
// ============================================================================

import { WizardTranslations } from '../types/wizard';

// ============================================================================
// French (Default)
// ============================================================================

const fr: WizardTranslations = {
  common: {
    next: 'Suivant',
    previous: 'Précédent',
    save: 'Sauvegarder',
    cancel: 'Annuler',
    close: 'Fermer',
    generate: 'Générer',
    generating: 'Génération en cours...',
    preview: 'Aperçu',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    step: 'Étape',
    of: 'sur',
    validation: {
      required: 'Ce champ est obligatoire',
      invalid: 'Valeur invalide',
      minLength: 'Minimum {min} caractères requis',
      maxLength: 'Maximum {max} caractères autorisés'
    },
    draft: {
      saved: 'Brouillon sauvegardé',
      autoSave: 'Sauvegarde automatique',
      restore: 'Restaurer le brouillon',
      discard: 'Supprimer le brouillon'
    }
  },
  character: {
    title: 'Créateur de Personnage',
    subtitle: 'Créez un personnage unique pour votre histoire',
    steps: {
      template: { title: 'Template de Personnage', description: 'Choisissez un archétype de départ' },
      basic: { title: 'Informations de Base', description: 'Nom, genre, âge' },
      personality: { title: 'Personnalité & Apparence', description: 'Traits et description physique' },
      backstory: { title: 'Histoire & Contexte', description: 'Backstory et lien au monde' },
      abilities: { title: 'Capacités & Voix', description: 'Pouvoirs et voix SAPI' },
      preview: { title: 'Aperçu & Sauvegarde', description: 'Validation finale' }
    },
    fields: {
      name: 'Nom',
      gender: 'Genre',
      age: 'Âge',
      personality: 'Traits de Personnalité',
      appearance: 'Apparence Physique',
      backstory: 'Histoire Personnelle',
      voice: 'Voix SAPI',
      abilities: 'Capacités/Pouvoirs',
      worldRelation: 'Relation au Monde'
    },
    gender: {
      male: 'Masculin',
      female: 'Féminin',
      other: 'Autre'
    },
    templates: {
      hero: 'Héros',
      mage: 'Mage',
      rogue: 'Voleur',
      scholar: 'Érudit',
      villain: 'Antagoniste',
      mentor: 'Mentor',
      sidekick: 'Compagnon',
      rebel: 'Rebelle',
      mystic: 'Mystique'
    }
  },
  storyteller: {
    title: 'Storyteller - Créateur d\'Histoire',
    subtitle: 'Créez une histoire captivante avec l\'IA',
    steps: {
      analysis: { title: 'Analyse du Projet', description: 'Personnages, monde et continuité' },
      format: { title: 'Format Vidéo', description: 'Type, durée et style de la vidéo' },
      creation: { title: 'Création de l\'Histoire', description: 'Génération de l\'intrigue vidéo' },
      structure: { title: 'Structure Narrative', description: 'Rythme et scènes clés' },
      validation: { title: 'Validation & Export', description: 'Aperçu et sauvegarde du scénario' }
    },
    fields: {
      videoType: 'Type de vidéo',
      duration: 'Durée cible (minutes)',
      genre: 'Genres',
      tone: 'Tons',
      targetAudience: 'Public cible',
      visualStyle: 'Style visuel',
      previousEpisode: 'Référence à l\'épisode précédent'
    },
    videoTypes: {
      courtMetrage: 'Court Métrage',
      metrage: 'Métrage',
      serieEpisode: 'Épisode de Série',
      webSerie: 'Web-Série'
    },
    audience: {
      general: 'Public général',
      family: 'Famille',
      youngAdult: 'Jeune adulte',
      adult: 'Adulte',
      mature: 'Mature'
    },
    visualStyles: {
      cinematographique: 'Cinématographique',
      anime: 'Animé',
      documentaire: 'Documentaire',
      artistique: 'Artistique',
      vintage: 'Vintage',
      minimaliste: 'Minimaliste'
    }
  },
  dialogue: {
    title: 'Génération de Dialogues SAPI',
    autoGenerate: 'Générer Dialogues Automatiques',
    manualAdd: 'Dialogue Manuel',
    generated: 'Dialogues Générés',
    editing: 'Édition du Dialogue',
    fields: {
      character: 'Personnage',
      text: 'Texte du dialogue',
      voice: 'Voix SAPI',
      tone: 'Ton Émotionnel',
      pitch: 'Pitch',
      speed: 'Vitesse',
      volume: 'Volume',
      position: 'Position Spatiale'
    },
    tones: {
      neutral: 'Neutre',
      happy: 'Heureux',
      sad: 'Triste',
      angry: 'En colère',
      excited: 'Excité',
      calm: 'Calme',
      surprised: 'Surpris'
    }
  }
};

// ============================================================================
// English
// ============================================================================

const en: WizardTranslations = {
  common: {
    next: 'Next',
    previous: 'Previous',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    generate: 'Generate',
    generating: 'Generating...',
    preview: 'Preview',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    step: 'Step',
    of: 'of',
    validation: {
      required: 'This field is required',
      invalid: 'Invalid value',
      minLength: 'Minimum {min} characters required',
      maxLength: 'Maximum {max} characters allowed'
    },
    draft: {
      saved: 'Draft saved',
      autoSave: 'Auto-save',
      restore: 'Restore draft',
      discard: 'Discard draft'
    }
  },
  character: {
    title: 'Character Creator',
    subtitle: 'Create a unique character for your story',
    steps: {
      template: { title: 'Character Template', description: 'Choose a starting archetype' },
      basic: { title: 'Basic Information', description: 'Name, gender, age' },
      personality: { title: 'Personality & Appearance', description: 'Traits and physical description' },
      backstory: { title: 'History & Context', description: 'Backstory and world connection' },
      abilities: { title: 'Abilities & Voice', description: 'Powers and SAPI voice' },
      preview: { title: 'Preview & Save', description: 'Final validation' }
    },
    fields: {
      name: 'Name',
      gender: 'Gender',
      age: 'Age',
      personality: 'Personality Traits',
      appearance: 'Physical Appearance',
      backstory: 'Personal History',
      voice: 'SAPI Voice',
      abilities: 'Abilities/Powers',
      worldRelation: 'World Connection'
    },
    gender: {
      male: 'Male',
      female: 'Female',
      other: 'Other'
    },
    templates: {
      hero: 'Hero',
      mage: 'Mage',
      rogue: 'Rogue',
      scholar: 'Scholar',
      villain: 'Villain',
      mentor: 'Mentor',
      sidekick: 'Sidekick',
      rebel: 'Rebel',
      mystic: 'Mystic'
    }
  },
  storyteller: {
    title: 'Storyteller - Story Creator',
    subtitle: 'Create a captivating story with AI',
    steps: {
      analysis: { title: 'Project Analysis', description: 'Characters, world and continuity' },
      format: { title: 'Video Format', description: 'Type, duration and video style' },
      creation: { title: 'Story Creation', description: 'Video plot generation' },
      structure: { title: 'Narrative Structure', description: 'Rhythm and key scenes' },
      validation: { title: 'Validation & Export', description: 'Preview and save scenario' }
    },
    fields: {
      videoType: 'Video type',
      duration: 'Target duration (minutes)',
      genre: 'Genres',
      tone: 'Tones',
      targetAudience: 'Target audience',
      visualStyle: 'Visual style',
      previousEpisode: 'Previous episode reference'
    },
    videoTypes: {
      courtMetrage: 'Short Film',
      metrage: 'Feature Film',
      serieEpisode: 'Series Episode',
      webSerie: 'Web Series'
    },
    audience: {
      general: 'General Audience',
      family: 'Family',
      youngAdult: 'Young Adult',
      adult: 'Adult',
      mature: 'Mature'
    },
    visualStyles: {
      cinematographique: 'Cinematic',
      anime: 'Anime',
      documentaire: 'Documentary',
      artistique: 'Artistic',
      vintage: 'Vintage',
      minimaliste: 'Minimalist'
    }
  },
  dialogue: {
    title: 'SAPI Dialogue Generation',
    autoGenerate: 'Generate Automatic Dialogues',
    manualAdd: 'Manual Dialogue',
    generated: 'Generated Dialogues',
    editing: 'Dialogue Editing',
    fields: {
      character: 'Character',
      text: 'Dialogue text',
      voice: 'SAPI Voice',
      tone: 'Emotional Tone',
      pitch: 'Pitch',
      speed: 'Speed',
      volume: 'Volume',
      position: 'Spatial Position'
    },
    tones: {
      neutral: 'Neutral',
      happy: 'Happy',
      sad: 'Sad',
      angry: 'Angry',
      excited: 'Excited',
      calm: 'Calm',
      surprised: 'Surprised'
    }
  }
};

// ============================================================================
// Spanish
// ============================================================================

const es: WizardTranslations = {
  common: {
    next: 'Siguiente',
    previous: 'Anterior',
    save: 'Guardar',
    cancel: 'Cancelar',
    close: 'Cerrar',
    generate: 'Generar',
    generating: 'Generando...',
    preview: 'Vista previa',
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    step: 'Paso',
    of: 'de',
    validation: {
      required: 'Este campo es obligatorio',
      invalid: 'Valor inválido',
      minLength: 'Mínimo {min} caracteres requeridos',
      maxLength: 'Máximo {max} caracteres permitidos'
    },
    draft: {
      saved: 'Borrador guardado',
      autoSave: 'Guardado automático',
      restore: 'Restaurar borrador',
      discard: 'Eliminar borrador'
    }
  },
  character: {
    title: 'Creador de Personajes',
    subtitle: 'Crea un personaje único para tu historia',
    steps: {
      template: { title: 'Plantilla de Personaje', description: 'Elige un arquetipo inicial' },
      basic: { title: 'Información Básica', description: 'Nombre, género, edad' },
      personality: { title: 'Personalidad y Aspecto', description: 'Traits y descripción física' },
      backstory: { title: 'Historia y Contexto', description: 'Historia personal y conexión al mundo' },
      abilities: { title: 'Habilidades y Voz', description: 'Poderes y voz SAPI' },
      preview: { title: 'Vista Previa y Guardar', description: 'Validación final' }
    },
    fields: {
      name: 'Nombre',
      gender: 'Género',
      age: 'Edad',
      personality: 'Traits de Personalidad',
      appearance: 'Aspecto Físico',
      backstory: 'Historia Personal',
      voice: 'Voz SAPI',
      abilities: 'Habilidades/Poderes',
      worldRelation: 'Conexión al Mundo'
    },
    gender: {
      male: 'Masculino',
      female: 'Femenino',
      other: 'Otro'
    },
    templates: {
      hero: 'Héroe',
      mage: 'Mago',
      rogue: 'Pícaro',
      scholar: 'Erudito',
      villain: 'Villano',
      mentor: 'Mentor',
      sidekick: 'Compañero',
      rebel: 'Rebelde',
      mystic: 'Místico'
    }
  },
  storyteller: {
    title: 'Storyteller - Creador de Historias',
    subtitle: 'Crea una historia cautivadora con IA',
    steps: {
      analysis: { title: 'Análisis del Proyecto', description: 'Personajes, mundo y continuidad' },
      format: { title: 'Formato de Video', description: 'Tipo, duración y estilo de video' },
      creation: { title: 'Creación de Historia', description: 'Generación de trama' },
      structure: { title: 'Estructura Narrativa', description: 'Ritmo y escenas clave' },
      validation: { title: 'Validación y Exportación', description: 'Vista previa y guardado' }
    },
    fields: {
      videoType: 'Tipo de video',
      duration: 'Duración objetivo (minutos)',
      genre: 'Géneros',
      tone: 'Tonos',
      targetAudience: 'Audiencia objetivo',
      visualStyle: 'Estilo visual',
      previousEpisode: 'Referencia del episodio anterior'
    },
    videoTypes: {
      courtMetrage: 'Corto Metraje',
      metrage: 'Largometraje',
      serieEpisode: 'Episodio de Serie',
      webSerie: 'Web Serie'
    },
    audience: {
      general: 'Audiencia General',
      family: 'Familia',
      youngAdult: 'Adulto Joven',
      adult: 'Adulto',
      mature: 'Madura'
    },
    visualStyles: {
      cinematographique: 'Cinematográfico',
      anime: 'Anime',
      documentaire: 'Documental',
      artistique: 'Artístico',
      vintage: 'Vintage',
      minimaliste: 'Minimalista'
    }
  },
  dialogue: {
    title: 'Generación de Diálogos SAPI',
    autoGenerate: 'Generar Diálogos Automáticos',
    manualAdd: 'Diálogo Manual',
    generated: 'Diálogos Generados',
    editing: 'Edición de Diálogo',
    fields: {
      character: 'Personaje',
      text: 'Texto del diálogo',
      voice: 'Voz SAPI',
      tone: 'Tono Emocional',
      pitch: 'Tono',
      speed: 'Velocidad',
      volume: 'Volumen',
      position: 'Posición Espacial'
    },
    tones: {
      neutral: 'Neutral',
      happy: 'Contento',
      sad: 'Triste',
      angry: 'Enojado',
      excited: 'Emocionado',
      calm: 'Calmo',
      surprised: 'Sorprendido'
    }
  }
};

// ============================================================================
// German
// ============================================================================

const de: WizardTranslations = {
  common: {
    next: 'Weiter',
    previous: 'Zurück',
    save: 'Speichern',
    cancel: 'Abbrechen',
    close: 'Schließen',
    generate: 'Generieren',
    generating: 'Generierung läuft...',
    preview: 'Vorschau',
    loading: 'Laden...',
    error: 'Fehler',
    success: 'Erfolg',
    step: 'Schritt',
    of: 'von',
    validation: {
      required: 'Dieses Feld ist erforderlich',
      invalid: 'Ungültiger Wert',
      minLength: 'Mindestens {min} Zeichen erforderlich',
      maxLength: 'Maximal {max} Zeichen erlaubt'
    },
    draft: {
      saved: 'Entwurf gespeichert',
      autoSave: 'Automatisches Speichern',
      restore: 'Entwurf wiederherstellen',
      discard: 'Entwurf löschen'
    }
  },
  character: {
    title: 'Charakter-Ersteller',
    subtitle: 'Erstellen Sie einen einzigartigen Charakter für Ihre Geschichte',
    steps: {
      template: { title: 'Charakter-Vorlage', description: 'Wählen Sie ein Ausgangsarchetyp' },
      basic: { title: 'Grundinformationen', description: 'Name, Geschlecht, Alter' },
      personality: { title: 'Persönlichkeit & Aussehen', description: 'Eigenschaften und körperliche Beschreibung' },
      backstory: { title: 'Geschichte & Kontext', description: 'Hintergrundgeschichte und Weltverbindung' },
      abilities: { title: 'Fähigkeiten & Stimme', description: 'Kräfte und SAPI-Stimme' },
      preview: { title: 'Vorschau & Speichern', description: 'Endgültige Validierung' }
    },
    fields: {
      name: 'Name',
      gender: 'Geschlecht',
      age: 'Alter',
      personality: 'Persönlichkeitseigenschaften',
      appearance: 'Körperliches Aussehen',
      backstory: 'Persönliche Geschichte',
      voice: 'SAPI-Stimme',
      abilities: 'Fähigkeiten/Kräfte',
      worldRelation: 'Weltverbindung'
    },
    gender: {
      male: 'Männlich',
      female: 'Weiblich',
      other: 'Andere'
    },
    templates: {
      hero: 'Held',
      mage: 'Magier',
      rogue: 'Schurke',
      scholar: 'Gelehrter',
      villain: 'Schurke',
      mentor: 'Mentor',
      sidekick: 'Begleiter',
      rebel: 'Rebell',
      mystic: 'Mystiker'
    }
  },
  storyteller: {
    title: 'Storyteller - Geschichtenerzähler',
    subtitle: 'Erstellen Sie eine fesselnde Geschichte mit KI',
    steps: {
      analysis: { title: 'Projektanalyse', description: 'Charaktere, Welt und Kontinuität' },
      format: { title: 'Videoformat', description: 'Typ, Dauer und Videostil' },
      creation: { title: 'Geschichtenerstellung', description: 'Handlungsgenerierung' },
      structure: { title: 'Narrative Struktur', description: 'Rhythmus und Schlüsselszenen' },
      validation: { title: 'Validierung & Export', description: 'Vorschau und Szenario speichern' }
    },
    fields: {
      videoType: 'Videotyp',
      duration: 'Zieldauer (Minuten)',
      genre: 'Genres',
      tone: 'Töne',
      targetAudience: 'Zielgruppe',
      visualStyle: 'Visueller Stil',
      previousEpisode: 'Bezug auf vorherige Episode'
    },
    videoTypes: {
      courtMetrage: 'Kurzfilm',
      metrage: 'Spielfilm',
      serieEpisode: 'Serienepisode',
      webSerie: 'Webserie'
    },
    audience: {
      general: 'Allgemeines Publikum',
      family: 'Familie',
      youngAdult: 'Junge Erwachsene',
      adult: 'Erwachsene',
      mature: 'Erwachsene'
    },
    visualStyles: {
      cinematographique: 'Kinematografisch',
      anime: 'Anime',
      documentaire: 'Dokumentarisch',
      artistique: 'Künstlerisch',
      vintage: 'Vintage',
      minimaliste: 'Minimalistisch'
    }
  },
  dialogue: {
    title: 'SAPI-Dialoggenerierung',
    autoGenerate: 'Automatische Dialoge generieren',
    manualAdd: 'Manueller Dialog',
    generated: 'Generierte Dialoge',
    editing: 'Dialogbearbeitung',
    fields: {
      character: 'Charakter',
      text: 'Dialogtext',
      voice: 'SAPI-Stimme',
      tone: 'Emotionaler Ton',
      pitch: 'Tonhöhe',
      speed: 'Geschwindigkeit',
      volume: 'Lautstärke',
      position: 'Räumliche Position'
    },
    tones: {
      neutral: 'Neutral',
      happy: 'Glücklich',
      sad: 'Traurig',
      angry: 'Wütend',
      excited: 'Aufgeregt',
      calm: 'Ruhig',
      surprised: 'Überrascht'
    }
  }
};

// ============================================================================
// Export translations object
// ============================================================================

export const wizardTranslations: Record<string, WizardTranslations> = {
  fr,
  en,
  es,
  de
};

// ============================================================================
// Helper function to get translations
// ============================================================================

export function getWizardTranslations(language: string = 'en'): WizardTranslations {
  return wizardTranslations[language] || en;
}

// ============================================================================
// Helper function to interpolate strings
// ============================================================================

export function interpolate(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
}

