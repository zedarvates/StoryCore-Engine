# 🎨 Guide de Création des Préceptes Krita (.kra) pour StoryCore

Ce guide explique comment créer des modèles Krita qui seront automatiquement interprétés par le moteur StoryCore pour guider l'IA (Image/Vidéo) et appliquer une mise en scène dynamique.

## 📁 Structure du Fichier
StoryCore utilise les **noms des calques** pour identifier les éléments de la scène et leur appliquer des modifications (teintes, masques).

### 1. Calques Environnementaux (Dynamic Tinting)
Nommez vos calques ainsi pour qu'ils s'adaptent automatiquement au récit (Nuit, Jour, Désert, etc.) :
*   **`Ciel`** ou **`Sky`** : Sera teinté selon l'heure de la journée.
*   **`Sol`** ou **`Ground`** : Sera teinté selon le biome (Herbe -> Vert, Sable -> Jaune).
*   **`Fond`** ou **`Background`** : Éléments lointains (montagnes, immeubles).

### 2. Calques de Personnages (Staging)
Pour définir le cadrage et la position des acteurs :
*   **`Perso1`**, **`Perso2`**, etc. : Utilisez des silhouettes ou des formes simples. StoryCore s'en sert pour le placement des sujets.
*   **`Visage`** : Pour les calculs de "Close-Up" (Gros Plan).

### 3. Nouveaux Objets Sémantiques (New Categories)
Pour un contrôle précis des éléments de décor et d'action :
*   **`Vegetation`** / **`Arbre`** / **`Foret`** : Calques pour la flore (teintables selon la saison).
*   **`Architecture`** / **`Batiment`** / **`Ville`** : Calques pour les structures urbaines ou historiques.
* **Vehicule** / **Voiture** / **Vaisseau** : Pour tout ce qui roule ou vole.
* **Animal** / **Creature** : Pour la faune ou les monstres.

### 4. Liquides et Géologie (Environment Details)
Pour enrichir vos scènes avec des matériaux spécifiques :
* **Eau** / **Ocean** / **Lac** : Calques de liquides (teintables en bleu lagon, eau croupie, etc.).
* **Verre** / **Reflexion** : Pour les vitres et surfaces réfléchissantes.
* **Detritus** / **Debris** : Pour les scènes post-apocalyptiques ou de combat (métal rouillé, ordures).
* **Rocher** / **Pierre** / **Montagne** : Pour les environnements minéraux.

### 5. Calques d'Effets Spéciaux (SFX)
Ces calques servent de "ControlNet" pour l'IA générative :
*   **`Explosion`** : Masque pour les boules de feu et débris.
*   **`Fumée`** ou **`Smoke`** : Pour la fumée volumétrique.
*   **`Etincelles`** ou **`Sparks`** : Pour les particules lumineuses.

---

## 🚀 Workflow de Création
1.  **Format** : Créez votre fichier en **1920x1080** (ou le ratio de votre projet).
2.  **Layers** : Utilisez des calques séparés pour chaque élément. Évitez de fusionner les calques que vous voulez rendre dynamiques.
3.  **Export** : Enregistrez simplement en tant que fichier **`.kra`** standard dans le dossier :
    `src/constants/presets/[votre_dossier]/`
4.  **Déclaration** : Ajoutez le chemin dans `shotPresets.ts` avec son `templatePath`.

## 💡 Astuces pour l'IA
*   **Couleurs contrastées** : Utilisez des couleurs distinctes pour chaque type de calque dans Krita. Cela aide StoryCore à générer de meilleurs masques de guidage.
*   **Pinceaux Texturés** : Pour la fumée ou les explosions, utilisez des pinceaux texturés dans Krita pour donner des indices de détails à l'IA.

---
*StoryCore Engine - Cinematic Production Pipeline*
