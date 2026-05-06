/**
 * Catalogue des primitives 3D et Kits Architecturaux (Pipeline MMORPG / Ultimate Odyssey)
 *
 * Ce fichier recense tous les éléments modulaires à générer pour le client Godot.
 * Il peut être utilisé pour peupler les interfaces de création ou formater des requêtes de génération (LLM / ComfyUI).
 */

export type KitCategory =
  | 'structure'
  | 'escaliers_plateformes'
  | 'ouvertures'
  | 'piliers_structures'
  | 'exterieurs'
  | 'addons_fonctionnels'
  | 'kits_modulaires_synthese';

export interface ArchitecturalAsset {
  id: string;
  category: KitCategory;
  subCategory: string;
  name: string;
  description: string;
}

export const ARCHITECTURAL_ASSETS: ArchitecturalAsset[] = [
  // ==========================================
  // 1. STRUCTURE — MURS, SOLS, TOITS
  // ==========================================
  {
    id: 'mur_plein',
    category: 'structure',
    subCategory: 'Murs',
    name: 'Mur plein',
    description: 'Élément structurel de base, sans ouverture',
  },
  {
    id: 'mur_fenetre',
    category: 'structure',
    subCategory: 'Murs',
    name: 'Mur fenêtre',
    description: 'Mur avec ouverture vitrée',
  },
  {
    id: 'mur_porte',
    category: 'structure',
    subCategory: 'Murs',
    name: 'Mur porte',
    description: 'Mur avec encadrement de porte',
  },
  {
    id: 'mur_angle',
    category: 'structure',
    subCategory: 'Murs',
    name: 'Mur angle',
    description: 'Pièce d’angle 90°',
  },
  {
    id: 'mur_demi_hauteur',
    category: 'structure',
    subCategory: 'Murs',
    name: 'Mur demi-hauteur',
    description: 'Pour balustrades, mezzanines',
  },
  {
    id: 'mur_decoratif',
    category: 'structure',
    subCategory: 'Murs',
    name: 'Mur décoratif',
    description: 'Motifs, frises, sculptures',
  },
  {
    id: 'mur_pierre',
    category: 'structure',
    subCategory: 'Murs',
    name: 'Mur pierre',
    description: 'Style château / fort',
  },
  {
    id: 'mur_bois',
    category: 'structure',
    subCategory: 'Murs',
    name: 'Mur bois',
    description: 'Style cabane / médiéval',
  },
  {
    id: 'mur_briques',
    category: 'structure',
    subCategory: 'Murs',
    name: 'Mur briques',
    description: 'Style urbain',
  },
  {
    id: 'mur_marbre',
    category: 'structure',
    subCategory: 'Murs',
    name: 'Mur marbre',
    description: 'Style noble / temple',
  },

  {
    id: 'sol_bois',
    category: 'structure',
    subCategory: 'Sols',
    name: 'Plancher bois',
    description: 'Intérieur classique',
  },
  {
    id: 'sol_pierre',
    category: 'structure',
    subCategory: 'Sols',
    name: 'Plancher pierre',
    description: 'Donjons, caves',
  },
  {
    id: 'sol_marbre',
    category: 'structure',
    subCategory: 'Sols',
    name: 'Plancher marbre',
    description: 'Palais, temples',
  },
  {
    id: 'sol_tatami',
    category: 'structure',
    subCategory: 'Sols',
    name: 'Tatami / motifs',
    description: 'Style oriental',
  },
  {
    id: 'sol_cave',
    category: 'structure',
    subCategory: 'Sols',
    name: 'Sol cave',
    description: 'Texture sombre / humide',
  },

  {
    id: 'toit_tuile_rouge',
    category: 'structure',
    subCategory: 'Toits',
    name: 'Tuile rouge',
    description: 'Style méditerranéen',
  },
  {
    id: 'toit_tuile_grise',
    category: 'structure',
    subCategory: 'Toits',
    name: 'Tuile grise',
    description: 'Style nordique',
  },
  {
    id: 'toit_chaume',
    category: 'structure',
    subCategory: 'Toits',
    name: 'Chaume',
    description: 'Style rural',
  },
  {
    id: 'toit_bois',
    category: 'structure',
    subCategory: 'Toits',
    name: 'Bois',
    description: 'Cabane, longhouse',
  },
  {
    id: 'toit_pierre',
    category: 'structure',
    subCategory: 'Toits',
    name: 'Pierre',
    description: 'Fortifications',
  },
  {
    id: 'toit_plat',
    category: 'structure',
    subCategory: 'Toits',
    name: 'Toit plat',
    description: 'Terrasses',
  },
  {
    id: 'toit_multipente',
    category: 'structure',
    subCategory: 'Toits',
    name: 'Toit multi-pente',
    description: 'Maisons complexes',
  },

  // ==========================================
  // 2. ESCALIERS, RAMPES, PLATEFORMES
  // ==========================================
  {
    id: 'escalier_droit',
    category: 'escaliers_plateformes',
    subCategory: 'Escaliers',
    name: 'Droit',
    description: 'Montée simple',
  },
  {
    id: 'escalier_tournant',
    category: 'escaliers_plateformes',
    subCategory: 'Escaliers',
    name: 'Tournant',
    description: '90° ou 180°',
  },
  {
    id: 'escalier_colimacon',
    category: 'escaliers_plateformes',
    subCategory: 'Escaliers',
    name: 'Colimaçon',
    description: 'Gain de place',
  },
  {
    id: 'escalier_large',
    category: 'escaliers_plateformes',
    subCategory: 'Escaliers',
    name: 'Large',
    description: 'Entrées monumentales',
  },
  {
    id: 'escalier_etroit',
    category: 'escaliers_plateformes',
    subCategory: 'Escaliers',
    name: 'Étroit',
    description: 'Intérieurs serrés',
  },

  {
    id: 'rampe_bois',
    category: 'escaliers_plateformes',
    subCategory: 'Rampes',
    name: 'Rampe bois',
    description: 'Extérieur / fermes',
  },
  {
    id: 'rampe_pierre',
    category: 'escaliers_plateformes',
    subCategory: 'Rampes',
    name: 'Rampe pierre',
    description: 'Fortifications',
  },

  {
    id: 'plateforme_bois',
    category: 'escaliers_plateformes',
    subCategory: 'Plateformes',
    name: 'Plateforme bois',
    description: 'Balcons, docks',
  },
  {
    id: 'plateforme_pierre',
    category: 'escaliers_plateformes',
    subCategory: 'Plateformes',
    name: 'Plateforme pierre',
    description: 'Donjons, temples',
  },

  // ==========================================
  // 3. PORTES, FENÊTRES, ARCHES
  // ==========================================
  {
    id: 'porte_simple',
    category: 'ouvertures',
    subCategory: 'Portes',
    name: 'Simple',
    description: 'Porte standard',
  },
  {
    id: 'porte_double',
    category: 'ouvertures',
    subCategory: 'Portes',
    name: 'Double',
    description: 'Entrées larges',
  },
  {
    id: 'porte_lourde',
    category: 'ouvertures',
    subCategory: 'Portes',
    name: 'Lourde',
    description: 'Métal / fort',
  },
  {
    id: 'porte_secrete',
    category: 'ouvertures',
    subCategory: 'Portes',
    name: 'Secrète',
    description: 'Camouflée dans mur',
  },
  {
    id: 'porte_magique',
    category: 'ouvertures',
    subCategory: 'Portes',
    name: 'Magique',
    description: 'Portail animé',
  },

  {
    id: 'fenetre_petite',
    category: 'ouvertures',
    subCategory: 'Fenêtres',
    name: 'Petite',
    description: 'Style maison',
  },
  {
    id: 'fenetre_grande',
    category: 'ouvertures',
    subCategory: 'Fenêtres',
    name: 'Grande',
    description: 'Style noble',
  },
  {
    id: 'fenetre_vitrail',
    category: 'ouvertures',
    subCategory: 'Fenêtres',
    name: 'Vitrail',
    description: 'Temples, magie',
  },
  {
    id: 'fenetre_meurtriere',
    category: 'ouvertures',
    subCategory: 'Fenêtres',
    name: 'Meurtrière',
    description: 'Fortifications',
  },
  {
    id: 'fenetre_ronde',
    category: 'ouvertures',
    subCategory: 'Fenêtres',
    name: 'Œil-de-bœuf',
    description: 'Fenêtre ronde',
  },

  {
    id: 'arche_ronde',
    category: 'ouvertures',
    subCategory: 'Arches',
    name: 'Ronde',
    description: 'Style classique',
  },
  {
    id: 'arche_gothique',
    category: 'ouvertures',
    subCategory: 'Arches',
    name: 'Gothique',
    description: 'Pointue',
  },
  {
    id: 'arche_large',
    category: 'ouvertures',
    subCategory: 'Arches',
    name: 'Large',
    description: 'Entrées de ville',
  },
  {
    id: 'arche_monumentale',
    category: 'ouvertures',
    subCategory: 'Arches',
    name: 'Monumentale',
    description: 'Portails, temples',
  },

  // ==========================================
  // 4. PILIERS, COLONNES, STRUCTURES
  // ==========================================
  {
    id: 'pilier_bois',
    category: 'piliers_structures',
    subCategory: 'Piliers',
    name: 'Bois',
    description: 'Support simple',
  },
  {
    id: 'pilier_pierre',
    category: 'piliers_structures',
    subCategory: 'Piliers',
    name: 'Pierre',
    description: 'Architecture lourde',
  },
  {
    id: 'pilier_marbre',
    category: 'piliers_structures',
    subCategory: 'Piliers',
    name: 'Marbre',
    description: 'Temples, palais',
  },

  {
    id: 'colonne_lisse',
    category: 'piliers_structures',
    subCategory: 'Colonnes',
    name: 'Lisse',
    description: 'Style sobre',
  },
  {
    id: 'colonne_sculptee',
    category: 'piliers_structures',
    subCategory: 'Colonnes',
    name: 'Sculptée',
    description: 'Style noble',
  },
  {
    id: 'colonne_massive',
    category: 'piliers_structures',
    subCategory: 'Colonnes',
    name: 'Massive',
    description: 'Fortifications',
  },

  {
    id: 'contrefort_petit',
    category: 'piliers_structures',
    subCategory: 'Contreforts',
    name: 'Petit',
    description: 'Support mural',
  },
  {
    id: 'contrefort_grand',
    category: 'piliers_structures',
    subCategory: 'Contreforts',
    name: 'Grand',
    description: 'Cathédrales, châteaux',
  },

  // ==========================================
  // 5. EXTÉRIEURS
  // ==========================================
  {
    id: 'muret_pierre',
    category: 'exterieurs',
    subCategory: 'Murets',
    name: 'Pierre',
    description: 'Jardins, chemins',
  },
  {
    id: 'muret_bois',
    category: 'exterieurs',
    subCategory: 'Murets',
    name: 'Bois',
    description: 'Fermes',
  },

  {
    id: 'cloture_bois',
    category: 'exterieurs',
    subCategory: 'Clôtures',
    name: 'Bois',
    description: 'Style rural',
  },
  {
    id: 'cloture_metal',
    category: 'exterieurs',
    subCategory: 'Clôtures',
    name: 'Métal',
    description: 'Style urbain',
  },

  {
    id: 'portail_bois',
    category: 'exterieurs',
    subCategory: 'Portails',
    name: 'Bois',
    description: 'Entrée simple',
  },
  {
    id: 'portail_fer_forge',
    category: 'exterieurs',
    subCategory: 'Portails',
    name: 'Fer forgé',
    description: 'Noble',
  },

  {
    id: 'ext_puits',
    category: 'exterieurs',
    subCategory: 'Éléments extérieurs',
    name: 'Puits',
    description: 'Village',
  },
  {
    id: 'ext_fontaine',
    category: 'exterieurs',
    subCategory: 'Éléments extérieurs',
    name: 'Fontaine',
    description: 'Place centrale',
  },
  {
    id: 'ext_statues',
    category: 'exterieurs',
    subCategory: 'Éléments extérieurs',
    name: 'Statues',
    description: 'Décor noble',
  },
  {
    id: 'ext_jardinieres',
    category: 'exterieurs',
    subCategory: 'Éléments extérieurs',
    name: 'Jardinières',
    description: 'Habitations',
  },
  {
    id: 'ext_pont_bois',
    category: 'exterieurs',
    subCategory: 'Éléments extérieurs',
    name: 'Pont bois',
    description: 'Rivières',
  },
  {
    id: 'ext_pont_pierre',
    category: 'exterieurs',
    subCategory: 'Éléments extérieurs',
    name: 'Pont pierre',
    description: 'Villes',
  },
  {
    id: 'ext_terrasses',
    category: 'exterieurs',
    subCategory: 'Éléments extérieurs',
    name: 'Terrasses',
    description: 'Maisons nobles',
  },

  // ==========================================
  // 6. ADD-ONS FONCTIONNELS
  // ==========================================
  {
    id: 'atelier_forge',
    category: 'addons_fonctionnels',
    subCategory: 'Ateliers',
    name: 'Forge',
    description: 'Métier forgeron',
  },
  {
    id: 'atelier_enclume',
    category: 'addons_fonctionnels',
    subCategory: 'Ateliers',
    name: 'Enclume',
    description: 'Craft métal',
  },
  {
    id: 'atelier_four',
    category: 'addons_fonctionnels',
    subCategory: 'Ateliers',
    name: 'Four',
    description: 'Cuisine',
  },
  {
    id: 'atelier_moulin',
    category: 'addons_fonctionnels',
    subCategory: 'Ateliers',
    name: 'Moulin',
    description: 'Boulanger',
  },
  {
    id: 'atelier_tisserand',
    category: 'addons_fonctionnels',
    subCategory: 'Ateliers',
    name: 'Métier à tisser',
    description: 'Clothier',
  },
  {
    id: 'atelier_roue_fil',
    category: 'addons_fonctionnels',
    subCategory: 'Ateliers',
    name: 'Roue à fil',
    description: 'Textile',
  },

  {
    id: 'magie_autel',
    category: 'addons_fonctionnels',
    subCategory: 'Magie / Systèmes',
    name: 'Autel',
    description: 'Temples',
  },
  {
    id: 'magie_portail',
    category: 'addons_fonctionnels',
    subCategory: 'Magie / Systèmes',
    name: 'Portail magique',
    description: 'Téléportation',
  },
  {
    id: 'magie_cristaux',
    category: 'addons_fonctionnels',
    subCategory: 'Magie / Systèmes',
    name: 'Cristaux lumineux',
    description: 'Lumière magique',
  },

  {
    id: 'util_coffre',
    category: 'addons_fonctionnels',
    subCategory: 'Utilitaires',
    name: 'Coffre sécurisé',
    description: 'Stockage',
  },
  {
    id: 'util_teleporteur',
    category: 'addons_fonctionnels',
    subCategory: 'Utilitaires',
    name: 'Téléporteur',
    description: 'Déplacements',
  },
  {
    id: 'util_vendor',
    category: 'addons_fonctionnels',
    subCategory: 'Utilitaires',
    name: 'Vendor',
    description: 'PNJ marchand',
  },
  {
    id: 'util_bibliotheque',
    category: 'addons_fonctionnels',
    subCategory: 'Utilitaires',
    name: 'Bibliothèque',
    description: 'Livres, grimoires',
  },
];

// ==========================================
// 7. SYNTHÈSE DES KITS MODULAIRES
// (Groupement pour faciliter l'interface de génération)
// ==========================================
export const MODULAR_KITS = [
  {
    id: 'kit_murs',
    name: 'Kit Murs',
    items: [
      'mur_plein',
      'mur_fenetre',
      'mur_porte',
      'mur_angle',
      'mur_demi_hauteur',
      'mur_decoratif',
    ],
    usage: 'Construction de base',
  },
  {
    id: 'kit_portes',
    name: 'Kit Portes',
    items: ['porte_simple', 'porte_double', 'porte_lourde', 'porte_secrete', 'porte_magique'],
    usage: 'Entrées',
  },
  {
    id: 'kit_fenetres',
    name: 'Kit Fenêtres',
    items: [
      'fenetre_petite',
      'fenetre_grande',
      'fenetre_vitrail',
      'fenetre_meurtriere',
      'fenetre_ronde',
    ],
    usage: 'Ouvertures',
  },
  {
    id: 'kit_arches',
    name: 'Kit Arches',
    items: ['arche_ronde', 'arche_gothique', 'arche_large', 'arche_monumentale'],
    usage: 'Entrées, temples',
  },
  {
    id: 'kit_escaliers',
    name: 'Kit Escaliers',
    items: [
      'escalier_droit',
      'escalier_tournant',
      'escalier_colimacon',
      'escalier_large',
      'rampe_bois',
      'rampe_pierre',
    ],
    usage: 'Verticalité',
  },
  {
    id: 'kit_piliers',
    name: 'Kit Piliers / Colonnes',
    items: ['pilier_bois', 'pilier_pierre', 'colonne_lisse', 'colonne_sculptee'],
    usage: 'Support',
  },
  {
    id: 'kit_toits',
    name: 'Kit Toits',
    items: [
      'toit_tuile_rouge',
      'toit_chaume',
      'toit_bois',
      'toit_pierre',
      'toit_plat',
      'toit_multipente',
    ],
    usage: 'Couverture',
  },
];
