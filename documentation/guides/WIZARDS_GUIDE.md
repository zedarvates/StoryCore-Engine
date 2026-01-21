# Guide des Wizards StoryCore Engine

## Vue d'ensemble

Les wizards de StoryCore Engine sont des assistants interactifs qui guident les utilisateurs à travers la création de contenu complexe. Ce guide couvre tous les wizards disponibles, leur utilisation, et les meilleures pratiques.

## Wizards Disponibles

### 🎬 Wizard d'Initialisation de Projet (`storycore init`)

Le wizard principal pour créer de nouveaux projets StoryCore.

#### Fonctionnalités
- **Configuration interactive** du projet
- **Génération automatique d'histoire** (optionnelle)
- **Validation intelligente** des paramètres
- **Création automatique** de la structure de fichiers

#### Utilisation

```bash
# Mode interactif (recommandé)
storycore init

# Création directe avec nom
storycore init "Mon Projet"

# Avec chemin spécifique
storycore init "Mon Projet" --path ~/projets
```

#### Paramètres de Validation

| Champ | Règle | Message d'erreur | Suggestion |
|-------|-------|------------------|------------|
| Nom du projet | Requis, ≤50 caractères, pas de caractères spéciaux | "Project name contains invalid characters" | "Use only letters, numbers, spaces, hyphens, and underscores" |
| Format | Requis avant durée | "Field 'duration' requires 'format' to be filled first" | "Select a format first" |
| Durée | Requis, dépend du format | "Duration is required" | "Enter duration in minutes" |
| Histoire | Requis, ≥10 caractères | "Story content is required (minimum 10 characters)" | "Provide a story description or script" |

### 👥 Wizard de Personnages (`storycore character-wizard`)

Assistant spécialisé dans la création de personnages cohérents et détaillés.

#### Fonctionnalités
- **Profils de personnages riches** avec traits de personnalité
- **Génération automatique** d'arrière-plans
- **Cohérence narrative** garantie
- **Intégration** avec les autres wizards

#### Utilisation

```bash
# Mode interactif
storycore character-wizard

# Création par lot
storycore character-wizard --batch 5 --genre fantasy

# Reprise d'une session
storycore character-wizard --resume session_id
```

#### Traits de Personnalité Disponibles
- `confident` - Assuré et direct
- `nervous` - Anxieux et hésitant
- `intellectual` - Analytique et précis
- `aggressive` - Confrontationnel
- `calm` - Mesuré et posé
- `passionate` - Passionné et intense
- `stoic` - Réservé et contrôlé
- `emotional` - Vulnérable et expressif
- `humorous` - Amusant et léger

### 🎭 Wizard de Dialogue (`storycore dialogue-wizard`) - NOUVEAU

Assistant spécialisé pour créer des dialogues convaincants avec cohérence des personnages.

#### Fonctionnalités
- **Profils vocaux** des personnages
- **Adaptation automatique** du style de dialogue
- **Enrichissement émotionnel** avec sous-texte
- **Format script professionnel**

#### Utilisation

```bash
# Génération rapide
storycore dialogue-wizard --quick --characters Alice Bob --topic "conflit professionnel"

# Mode interactif
storycore dialogue-wizard --interactive

# Avec paramètres spécifiques
storycore dialogue-wizard --characters Alice Bob Charlie --topic "réunion familiale" --tone dramatic --purpose character_development
```

#### Tons Disponibles
- `natural` - Conversation naturelle
- `dramatic` - Émotionnellement intense
- `comedic` - Humoristique et légère
- `intense` - Hautement conflictuelle
- `subtle` - Subtile et retenue

#### Objectifs de Dialogue
- `exposition` - Partage d'informations
- `conflict` - Création de tension
- `character_development` - Révélation de traits
- `comedy_relief` - Allègement de l'ambiance
- `climax_building` - Montée en tension

#### Exemple de Sortie

```
Confrontation: Dispute Familiale

INT. SALON - SOIR

Alice, Bob et Charlie engagent une conversation intense. Le ton dramatique
construit la tension alors qu'ils discutent de réunion familiale.

BOB
C'est allé trop loin !

ALICE
Tu ne comprends pas les conséquences.

CHARLIE
Je ne reculerai pas.
(s'avançant, contact visuel intense)

BOB
Tu fais une terrible erreur.

ALICE
Tu n'as aucune idée de ce que tu fais.
```

### 🌍 Wizard de Monde (`storycore world-wizard`)

Assistant pour la création d'univers cohérents et immersifs.

#### Fonctionnalités
- **Construction de monde** systématique
- **Génération de règles** et contraintes
- **Éléments culturels** détaillés
- **Localisations** interconnectées

#### Utilisation

```bash
# Création de monde interactive
storycore world-wizard
```

#### Règles de Validation

| Champ | Règle | Message d'erreur |
|-------|-------|------------------|
| Nom du monde | Requis | "World name is required" |
| Période temporelle | Requis | "Time period is required" |
| Genre | Au moins 1 sélection | "At least one genre must be selected" |
| Ton | Au moins 1 sélection | "At least one tone must be selected" |

### 🎬 EditForge (`storycore video-editor-wizard`) - NOUVEAU

Assistant révolutionnaire qui crée automatiquement des montages vidéo professionnels à partir de vos storyboards. Assemble intelligemment les plans avec des transitions cinématographiques, synchronise l'audio et optimise le rythme pour une expérience visuelle exceptionnelle.

#### Fonctionnalités
- **Montage automatique** : Assemblage intelligent des plans selon le storyboard
- **Transitions cinématiques** : Choix automatique des transitions adaptées au contenu
- **Synchronisation audio** : Intégration parfaite avec les plans SonicCrafter
- **Styles d'édition** : Cinematic, Dynamic, Smooth, Intense, Minimalist, Documentary
- **Timeline professionnelle** : Export de plans d'édition pour logiciels spécialisés
- **Qualité optimisée** : Métriques de rythme, couverture audio et cohérence
- **Export settings** : Configurations d'export MP4/H.264 professionnelles

#### Styles d'Édition Disponibles
- **Cinematic** : Transitions fluides, rythme professionnel, storytelling immersif
- **Dynamic** : Montage rapide, transitions énergiques, contenu high-energy
- **Smooth** : Dissolves lentes, rythme contemplatif, contenu narratif
- **Intense** : Transitions rapides, montage serré, contenu dramatique
- **Minimalist** : Coupes directes, absence de transitions, style documentaire
- **Documentary** : Transitions naturelles, rythme éducatif, contenu informatif

#### Transitions Intelligentes
- **CUT** : Coupe directe pour continuité
- **DISSOLVE** : Fondu enchaîné pour douceur
- **WIPE** : Balayage dynamique pour énergie
- **ZOOM** : Grossissement pour emphase
- **FADE** : Fondu au noir pour transitions majeures

#### Utilisation

```bash
# Montage cinématique complet
storycore video-editor-wizard --style cinematic

# Montage dynamique avec aperçu
storycore video-editor-wizard --style dynamic --preview

# Montage avec export timeline détaillé
storycore video-editor-wizard --output my_movie --export-timeline --export-settings

# Montage documentaire minimaliste
storycore video-editor-wizard --style documentary --format summary
```

#### Exemple de Montage Complet

```
🎬 EditForge - Automatic Video Montage Creation

🎨 Editing style: cinematic
📁 Output: final_montage

✅ Montage created successfully!
🎬 Total duration: 127.50 seconds
📹 Video clips: 12
🎵 Audio tracks: 24
🔄 Transitions: 11
📊 Quality score: 8.7/10

🎬 Video Clips Timeline:
   1. opening_001     | 0.0s - 8.0s (8.0s)
      Transitions: In: fade_in
   2. character_intro | 8.0s - 15.5s (7.5s)
      Transitions: Out: dissolve
   3. action_sequence | 15.5s - 23.0s (7.5s)
      Transitions: Out: cut
   ...

🎵 Audio Tracks Timeline:
   1. Voice_Over     | 1.0s - 7.0s
      Volume: 80% | Fade: 0.5s / 0.5s
   2. Background_Music | 0.0s - 15.5s
      Volume: 25% | Fade: 2.0s / 1.0s
   3. Sound_Effect    | 12.0s - 13.5s
      Volume: 60% | Fade: 0.2s / 0.2s
   ...

🔄 Transitions:
   1. Dissolve (0.5s) | opening_001 → character_intro
   2. Cut (0.0s)     | character_intro → action_sequence
   3. Wipe (0.3s)    | action_sequence → climax_scene
   ...

⚙️ Export Settings:
   Format: MP4
   Codec: H.264
   Resolution: 1920x1080
   Quality: high

💾 Files Created/Updated:
   • video_montage_plan.json - Complete montage specification
   • montage_timeline.json - Detailed timeline breakdown
   • export_settings.json - Video export configuration
   • project.json - Updated with montage metadata

✅ Video montage plan created successfully!
   Use this plan with your video editing software to create the final video.
   Import the JSON plan into compatible editing applications.
```

#### Métriques de Qualité du Montage
- **Rhythm Consistency** : Cohérence du rythme entre les plans
- **Transition Coverage** : Pourcentage de transitions utilisées
- **Audio Coverage** : Synchronisation audio/visuel
- **Overall Quality** : Score composite d'évaluation

#### Intégration avec l'Écosystème
- **Storyboard Source** : Utilise les plans Shot Planning
- **Audio Sync** : Intègre automatiquement les plans SonicCrafter
- **Timeline Export** : Compatible DaVinci Resolve, Premiere Pro, Final Cut
- **Chapter Markers** : Marquage automatique des shots pour navigation

---

### 🚀 ViralForge (`storycore marketing-wizard`) - NOUVEAU

Assistant révolutionnaire qui transforme vos créations StoryCore en campagnes marketing virales complètes. Génère automatiquement thumbnails accrocheurs, descriptions SEO optimisées, posts sociaux percutants, trailers promotionnels et stratégies hashtag pour maximiser la visibilité et l'engagement.

#### Fonctionnalités
- **Thumbnails viraux** : Génération automatique d'images accrocheuses optimisées par plateforme
- **Descriptions SEO** : Textes optimisés pour les algorithmes YouTube et moteurs de recherche
- **Posts sociaux** : Contenu adapté à TikTok, Instagram, Twitter avec hooks d'engagement
- **Trailers promotionnels** : Vidéos teaser courtes et longues pour différentes audiences
- **Stratégie hashtag** : Recherche intelligente et curation de tags pour visibilité maximale
- **Analyse viral** : Scoring prédictif du potentiel viral basé sur le contenu et les tendances
- **Calendrier posting** : Planification optimale des publications selon les algorithmes

#### Stratégies Virales Disponibles
- **Educational** : Contenu informatif, tutoriels, apprentissage (fort engagement long-terme)
- **Entertaining** : Divertissement, humour, contenu léger (partage viral rapide)
- **Emotional** : Stories touchantes, inspirationnelles (engagement émotionnel profond)
- **Controversial** : Sujets polarisants (risqué mais haute visibilité)
- **Trending** : Saut sur les tendances actuelles (timming critique)
- **Nostalgic** : Références culturelles, rétrospective (engagement générationnel)
- **Inspirational** : Motivation, réussite, croissance (engagement positif)
- **Humorous** : Comédie, memes, contenu drôle (partage viral explosif)

#### Plateformes Supportées
- **YouTube** : Descriptions détaillées, timestamps, tags SEO, thumbnails 16:9
- **TikTok** : Posts courts, hashtags trending, musique populaire, format vertical
- **Instagram** : Stories, Reels, posts carrousel, format esthétique
- **Twitter** : Threads, tweets percutants, hashtags stratégiques
- **Facebook** : Posts détaillés, ciblage démographique
- **LinkedIn** : Contenu professionnel, networking, B2B
- **Reddit** : Posts communautaires, format discussion
- **Discord** : Intégration serveurs, contenu communautaire

#### Utilisation

```bash
# Campagne complète éducative
storycore marketing-wizard --strategy educational

# Campagne divertissante ciblée
storycore marketing-wizard --strategy entertaining --platforms youtube tiktok instagram

# Aperçu avant génération
storycore marketing-wizard --preview --strategy emotional

# Campagne avec export détaillé
storycore marketing-wizard --export-assets --export-strategy --format detailed

# Campagne minimaliste
storycore marketing-wizard --strategy inspirational --format minimal
```

#### Exemple de Campagne ViralForge Complète

```
🚀 ViralForge - Marketing Content Wizard

🎯 Viral strategy: entertaining
📱 Target platforms: youtube, tiktok, instagram

📊 Content Analysis:
   Genre: Comedy
   Visual Appeal: High
   Character Appeal: High
   Viral Triggers: humor, relatable, laughter
   Viral Potential Score: 8.7/10

✅ Marketing campaign created successfully!

🎯 Viral potential: 8.7/10
🎬 Content assets: 12
📈 Estimated reach: 247,000 people
🏷️ Hashtags generated: 35

🖼️ Thumbnails:
   1. YouTube - Viral Potential: 9.1/10
      Title: "YouTube Comedy Gold - Epic Funny Moments"
      Dimensions: 1280x720
      Style: high_contrast_emotional
   2. TikTok - Viral Potential: 9.4/10
      Title: "TikTok Banger - Can't Stop Laughing!"
      Dimensions: 1080x1080
      Style: trending_effect

📝 Descriptions:
   1. YouTube Description - Viral Potential: 8.8/10
      "The FUNNIEST comedy you'll see all year! 🤣 From hilarious character moments to laugh-out-loud scenes, this comedy masterpiece will have you in stitches! 😂

      🎯 What makes this special:
      • Side-splitting humor and relatable comedy
      • Brilliant character chemistry and timing
      • Professional production with heart
      • Feel-good comedy for everyone

      🎭 Perfect for fans of: The Grand Budapest Hotel, Booksmart, Lady Bird

      🔥 Don't forget to:
      👍 LIKE if you're still laughing!
      🔔 SUBSCRIBE for more hilarious content!
      💬 COMMENT your favorite funny moment below!

      ⏱️ TIMESTAMPS:
      00:00 - Opening Laughs
      00:45 - Character Introductions
      02:15 - The Big Comedy Set Piece
      04:30 - Emotional Heart Moment
      05:45 - Perfect Ending

      #Comedy #Funny #Humor #LaughOutLoud #ComedyGold #StoryCore #Hilarious #ComedyMovie

      🔗 Connect with us:
      Instagram: @storycore
      TikTok: @storycore
      Website: storycore.com

      Thanks for watching! 🎭✨"

📱 Social Posts:
   1. TikTok Post - Viral Potential: 9.2/10 (Funniest scene EVER! 😂 Can't stop rewatching! #Comedy #Viral #FYP)
   2. Instagram Post - Viral Potential: 8.9/10 (When comedy meets heart... This film is PURE MAGIC ✨🎭 #ComedyFilm #MustWatch)

🎬 Trailers:
   1. YouTube Trailer - 30s - Viral Potential: 9.0/10
      Style: cinematic
      Call to Action: Watch Full Comedy Now!
   2. TikTok Trailer - 15s - Viral Potential: 9.5/10
      Style: fast_paced
      Call to Action: Link in Bio! 👆

🏷️ Hashtag Strategy (35 hashtags):
   Project: #StoryCore #Comedy #Funny #Humor
   Genre: #ComedyFilm #LaughOutLoud #Hilarious #ComedyGold
   Viral: #Viral #Trending #FYP #MustWatch #ComedyRelief

👥 Target Audience:
   Age: 18-29
   Interests: comedy, entertainment, social_media
   Platforms: youtube, tiktok, instagram
   Psychographics: fun_loving, social, optimistic

📅 Posting Schedule:
   • YouTube Main Video: Thursday 2-4 PM (Peak viewing time)
   • TikTok Teaser: Tuesday 6-8 PM (High engagement)
   • Instagram Story: Wednesday 11 AM - 1 PM (Lunch break)
   • TikTok Full Video: Friday 7-9 PM (Weekend traffic)

📊 Performance Goals:
   Views Goal: 24,700
   Engagement Goal: 12,350
   Tracking Period: 30 days

💾 Files Created/Updated:
   • marketing_campaign.json - Complete campaign specification
   • thumbnails_export.json - Individual thumbnail assets
   • social_posts_export.json - Social media post content
   • project.json - Updated with campaign metadata

✅ Viral marketing campaign created successfully!
   Use this campaign to launch your comedy masterpiece across platforms!
   Track performance and adjust strategy based on audience engagement.
```

#### Métriques de Performance
- **Viral Potential Score** : Prédiction du potentiel viral (0-10)
- **Estimated Reach** : Audience potentielle basée sur l'analyse
- **Engagement Prediction** : Taux d'interaction prédit
- **Platform Optimization** : Score d'adaptation aux algorithmes

#### Stratégies de Contenu par Plateforme

**YouTube (Long-form) :**
- Descriptions 1500-2000 caractères avec timestamps
- 10-15 tags SEO optimisés
- Thumbnails high-contrast avec texte lisible
- Hooks dans les 15 premières secondes

**TikTok (Short-form) :**
- Posts 80-120 caractères maximum
- 3-5 hashtags trending
- Format vertical 9:16
- Musique et effets trending

**Instagram (Visual) :**
- Format carré 1:1 ou story 9:16
- Hashtags stratégiques (30 max)
- Emojis et call-to-action
- Esthétique cohérente

#### Intégration avec l'Écosystème
- **Project Analysis** : Utilise données Ghost Tracker pour insights
- **Content Adaptation** : S'adapte au genre et au ton du projet
- **SonicCrafter Sync** : Intègre trailers audio quand disponible
- **EditForge Integration** : Utilise montages finaux pour teasers

---

### 🎵 SonicCrafter (`storycore audio-production-wizard`) - NOUVEAU

Assistant spécialisé dans la création de plans de production audio complets pour vos vidéos. Génère automatiquement voice overs, effets sonores, musique d'ambiance et organise toute la bande son de votre projet.

#### Fonctionnalités
- **Analyse automatique des shots** : détermine les besoins audio par séquence
- **Génération de voice overs** : scripts et timing pour narration
- **Effets sonores contextuels** : SFX adaptés au contenu des scènes
- **Musique d'ambiance** : cues musicaux selon l'atmosphère
- **Foley et sons pratiques** : effets sonores synchronisés
- **Plan de production complet** : organisation de toute la bande son
- **Spécifications techniques** : standards audio professionnels

#### Types d'Audio Générés
- **🎤 Voice Over** : narration et commentaires off
- **🔊 Sound Effects** : effets sonores synchronisés
- **👣 Foley** : sons pratiques (pas, manipulations)
- **🌍 Ambient Sound** : ambiances et atmosphères
- **🎶 Background Music** : musique d'accompagnement
- **💬 Dialogue** : échanges de personnages

#### Analyse de Mood Audio
- **Dramatic** : orchestral, brass, percussion
- **Tense** : suspense, piano, atmospheric pads
- **Peaceful** : ambient, piano, strings, flute
- **Energetic** : electronic, drums, bass
- **Mysterious** : atmospheric, low percussion
- **Romantic** : piano, strings, harp
- **Epic** : full orchestra, choir, percussion
- **Melancholic** : strings, piano, cello

#### Utilisation

```bash
# Plan audio complet pour tout le projet
storycore audio-production-wizard

# Focus sur shots spécifiques
storycore audio-production-wizard --shots shot_001 shot_003 shot_007

# Aperçu audio pour un shot
storycore audio-production-wizard --preview-shot '{"shot_id":"shot_001","description":"door opens slowly","purpose":"suspense","timing":{"duration_seconds":3.0}}'

# Export du script voice over
storycore audio-production-wizard --export-script

# Export des cues musicaux
storycore audio-production-wizard --export-music-cues

# Format de sortie minimal
storycore audio-production-wizard --format minimal
```

#### Exemple de Plan Audio Complet

```
🎵 Audio Production Wizard - Sound Design Assistant

🎼 Audio Production Plan Complete - Quality: 8.3/10

📁 Project ID: epic_fantasy_project
🕒 Generated: 2024-01-21 14:30:00
⏱️ Total Duration: 45.50 seconds
🎵 Audio Sequences: 8

📊 Quality Metrics:
   Voice Coverage: 75%
   SFX Coverage: 100%
   Music Coverage: 50%
   Average Confidence: 82%

🎼 Audio Sequences Breakdown:

   📹 Shot opening_001 (8.0s):
      🎤 🔴 Voice Over - opening_001
         Duration: 5.6s | Volume: 80%
         Mood: Dramatic | Confidence: 85%
         Prompt: "In a world where ancient magic flows through crystal veins..."

      🎶 🟡 Dramatic Music Cue
         Duration: 8.0s | Volume: 25%
         Mood: Dramatic | Confidence: 80%

   📹 Shot forest_encounter_002 (5.5s):
      🔊 🟡 Forest Ambience
         Duration: 5.5s | Volume: 30%
         Mood: Mysterious | Confidence: 75%

      👣 🟢 Footsteps on Forest Floor
         Duration: 3.2s | Volume: 40%
         Mood: Neutral | Confidence: 70%

🎤 Voice Over Script:
[opening_001] In a world where ancient magic flows through crystal veins, a young apprentice discovers her destiny...
[climax_007] As darkness threatens to consume everything, one final choice will determine the fate of all...

🎶 Music Cues:
   • Opening Dramatic (Dramatic)
     Genre: orchestral | Tempo: slow_building
     Instruments: strings, brass, percussion

   • Mysterious Forest (Mysterious)
     Genre: atmospheric | Tempo: slow_mysterious
     Instruments: strings, atmospheric_pads, low_percussion

🔊 Sound Effects Inventory:
   📂 doors: 2 effects
      • Wooden Door Opening (shot_003)
      • Castle Gate Creaking (shot_006)

   📂 footsteps: 3 effects
      • Forest Floor Footsteps (shot_002)
      • Stone Corridor Walking (shot_004)

📋 Production Notes:
   • Audio Production Plan Overview: Total audio elements: 24, Voice over segments: 6, Sound effects: 12, Music cues: 4, Total duration: 45.50 seconds
   • Voice Production Notes: Record voice overs in a quiet environment, Use a quality microphone for clear audio, Consider professional voice talent for important segments
   • Sound Effects Production Notes: Source high-quality sound libraries, Record custom effects if needed, Ensure consistent quality across all effects
   • Music Production Notes: License royalty-free music or compose original, Ensure music fits the emotional tone of scenes, Fade music appropriately between scenes

⚙️ Technical Requirements:
   Sample Rate: 48000 Hz
   Bit Depth: 24 bits
   Format: WAV
   Mastering Level: -6 LUFS

💾 Files Created/Updated:
   • audio_production_plan.json - Complete audio production plan
   • voice_over_script.txt - Voice over script for recording
   • project.json - Updated with audio plan metadata

✅ Audio production plan completed successfully!
   Use this plan to guide your sound design and audio production workflow.
```

#### Métriques de Qualité Audio
- **Voice Coverage** : pourcentage de shots avec voice over
- **SFX Coverage** : couverture des effets sonores
- **Music Coverage** : présence de musique d'ambiance
- **Confidence Score** : fiabilité des suggestions
- **Technical Compliance** : conformité aux standards broadcast

### 🤖 Roger Data Extractor (`storycore roger-wizard`) - NOUVEAU

Assistant intelligent qui extrait automatiquement toutes les données pertinentes d'un fichier texte (histoire, novel, discussion LLM) pour compléter votre projet StoryCore.

#### Fonctionnalités
- **Extraction automatique** de personnages avec attributs complets
- **Analyse de localisation** et environnements
- **Construction du monde** et règles extractibles
- **Résumé intelligent** en 500 caractères
- **Sauvegarde automatique** dans les fichiers projet
- **Interface utilisateur** intuitive avec prévisualisation

#### Types de Contenu Supportés
- **Histoires et romans** : extraction complète des éléments narratifs
- **Plans de discussion** : récupération des idées et concepts
- **Outputs LLM externes** : analyse des réponses générées
- **Documents créatifs** : scénarios, concepts, lore

#### Données Extractibles
- **👥 Personnages** : noms, descriptions, personnalités, rôles, relations
- **🏰 Lieux** : noms, types, atmosphères, significations
- **🌍 Éléments de monde** : magie, technologie, culture, économie
- **📖 Éléments narratifs** : thèmes, conflits, relations
- **📝 Résumé exécutif** : condensé 500 caractères

#### Utilisation Interface
1. **Sélection du fichier** : choisissez votre document texte
2. **Prévisualisation** : estimation des extractions possibles
3. **Configuration** : focus sur des domaines spécifiques (optionnel)
4. **Extraction** : analyse automatique et sauvegarde
5. **Résultats** : vue d'ensemble des données extraites

#### Utilisation CLI
```bash
# Extraction complète avec prévisualisation
storycore roger-wizard --preview --file mon_histoire.txt

# Extraction ciblée sur personnages et lieux
storycore roger-wizard --file roman.txt --focus characters locations

# Extraction silencieuse (pas de sortie console)
storycore roger-wizard --file scenario.txt --save-only

# Format de sortie personnalisé
storycore roger-wizard --file histoire.txt --format detailed
```

#### Exemple d'Extraction
```
🤖 Roger Wizard - Data Extraction Assistant

📄 Analyzing file: mon_histoire.txt
📊 Text length: 15432 characters

🎯 Estimated Extractions:
   Characters: ~8
   Locations: ~5
   World Elements: ~4

⏳ Starting intelligent extraction...

✅ Extraction complete!
📝 Summary: In a world where magic flows through ancient crystals, young apprentice Elara discovers a hidden power that could change the fate of her village forever...

👥 Characters: 7 extracted
🏰 Locations: 4 extracted
🌍 World Elements: 3 extracted
📊 Confidence: 8.2/10

💾 Files Created:
   • character_definitions.json - Extracted character data
   • world_building.json - World and location data
   • roger_extraction_report.json - Complete extraction report
```

#### Métriques de Qualité
- **Précision d'extraction** : taux de reconnaissance des entités
- **Cohérence** : relations logiques entre éléments extraits
- **Complétude** : couverture des attributs importants
- **Confiance** : score de fiabilité des données extraites

### 👻 Ghost Tracker Advisor (`storycore ghost-tracker-wizard`) - NOUVEAU

Assistant IA avancé qui analyse votre projet vidéo storyboard de manière complète et fournit des conseils avisés pour l'amélioration.

#### Fonctionnalités
- **Analyse complète du projet** : storytelling, cinématographie, rythme, personnages
- **Évaluation des assets multimédias** : images, sons, vidéos générés
- **Analyse de qualité** basée sur les métriques des tests existants
- **Détection des défauts** dans les prompts et générations
- **Conseils d'optimisation** pour améliorer la production
- **Rapport détaillé** avec score global et recommandations priorisées

#### Analyse Multimédia
Le Ghost Tracker analyse automatiquement :
- **Images générées** : qualité visuelle, cohérence stylistique, netteté
- **Assets audio** : présence de voix, musique, effets sonores
- **Contenu vidéo** : opportunités de génération de séquences
- **Cohérence globale** : intégration des personnages, style visuel, spécifications techniques

#### Utilisation
```bash
# Analyse complète du projet
storycore ghost-tracker-wizard

# Analyse ciblée sur certains aspects
storycore ghost-tracker-wizard --focus storytelling cinematography

# Conseil rapide sur une question spécifique
storycore ghost-tracker-wizard --quick-advice "How to improve character development?"

# Rapport simplifié
storycore ghost-tracker-wizard --format summary

# Rapport minimal
storycore ghost-tracker-wizard --report-only
```

#### Métriques de Qualité Analysées
- **Images** : PSNR, SSIM, netteté, cohérence stylistique (basé sur tests existants)
- **Audio** : niveaux, qualité d'enregistrement, mixage
- **Vidéo** : fluidité, cohérence colorimétrique, standards techniques
- **Prompts** : spécificité, cohérence, techniques avancées utilisées

#### Exemple de Rapport Détaillé
```
👻 Ghost Tracker Wizard - AI Project Advisor

🎯 Analysis Complete - Score: 7.8/10.0

📁 Project: Mon Projet Video
🕒 Analyzed: 2026-01-21 14:25:30
📊 Insights: 12

🎯 Assessment: Good - Minor improvements suggested

✅ Project Strengths:
   • Storytelling foundation appears solid
   • Cinematography planning is well-developed
   • Character development is comprehensive

⚠️  Key Areas for Improvement:
   • No Visual References Generated
   • Audio Assets Missing
   • Video Assets Opportunity

🔍 Detailed Analysis:

📋 Multimedia Quality:
   ⚠️ No Visual References Generated
      Visual references are crucial for consistent production.
      💡 Actions:
         • Run Shot Reference Wizard to generate visual references
         • Create reference images for each planned shot
         • Ensure consistent style and lighting across references

📋 Multimedia Quality:
   ⚠️ Audio Assets Missing
      No audio assets found. Consider adding voice, music, and sound effects.
      💡 Actions:
         • Generate voiceovers using Voice Generation Wizard
         • Add background music appropriate to the mood
         • Include sound effects for key actions

📝 Key Recommendations:
   1. Run Shot Reference Wizard to generate visual references
   2. Generate voiceovers using Voice Generation Wizard
   3. Add background music appropriate to the mood
   4. Ensure characters appear in appropriate shots

🚀 Immediate Next Steps:
   1. Run the Shot Planning Wizard to create shot specifications
   2. Run the Shot Reference Wizard to generate visual references
   3. Run the Character Wizard to create detailed character profiles
   4. Run the World Builder Wizard

📄 Complete analysis saved to: ghost_tracker_report.json
   Use this file to review all insights and track improvements
```

### 🎬 Wizard de Référence de Shots (`storycore shot-reference-wizard`) - NOUVEAU

Assistant pour générer des images de référence visuelle pour chaque shot en utilisant ComfyUI.

#### Utilisation

```bash
# Génération complète pour tous les shots
storycore shot-reference-wizard

# Shots spécifiques avec style personnalisé
storycore shot-reference-wizard --shots shot_001 shot_003 --style storyboard --quality high

# Aperçu des prompts avant génération
storycore shot-reference-wizard --preview --shots shot_001

# Mode batch pour traitement accéléré
storycore shot-reference-wizard --batch --style cinematic
```

#### Styles Disponibles
- `cinematic` - Style cinématographique professionnel (défaut)
- `storyboard` - Style ligne claire, adapté aux storyboards
- `realistic` - Photographie hyper-réaliste
- `concept_art` - Style artistique conceptuel
- `technical` - Style technique et précis

#### Niveaux de Qualité
- `draft` - 512x288, 15 étapes, pour itération rapide
- `standard` - 768x432, 25 étapes, qualité équilibrée (défaut)
- `high` - 1024x576, 35 étapes, haute qualité
- `maximum` - 1536x864, 50 étapes, qualité maximale

#### Exemple de Génération

```
🎬 Shot Reference Wizard for project: /path/to/project

📋 Loading shot specifications...
   Found 5 shots to process

🎨 Configuration:
   Style: cinematic
   Quality: standard
   Shots to process: 5

🚀 Starting image generation...
   [1/5] Processing shot_001...
   ✅ shot_001: Generated successfully
   [2/5] Processing shot_002...
   ✅ shot_002: Generated successfully
   ...

📊 Generation Results

Total shots processed: 5
Successful generations: 5
Failed generations: 0
Total time: 127.50 seconds
Average time per shot: 25.50 seconds

📁 Images saved to: /path/to/project/shot_references
📋 Generation summary: /path/to/project/shot_references_summary.json

🚀 Next steps:
   • View reference images in your sequence editor
   • Use images for shot visualization and planning
   • Re-run with different styles for variations
   • Integrate with video editing software
```

#### Structure des Images Générées

```
project/
├── shot_references/
│   ├── shot_001_reference.png    # Image pour le shot 1
│   ├── shot_002_reference.png    # Image pour le shot 2
│   └── ...
└── shot_references_summary.json  # Résumé de génération
```

#### Métadonnées des Images

Chaque image est accompagnée de métadonnées complètes :

```json
{
  "shot_id": "shot_001",
  "success": true,
  "image_path": "shot_references/shot_001_reference.png",
  "prompt_used": "close-up, character face and expression, eye level camera view...",
  "generation_time": 25.5,
  "metadata": {
    "style": "cinematic",
    "quality": "standard",
    "shot_spec": {
      "shot_type": "CU",
      "camera_angle": "eye-level",
      "camera_movement": "static",
      "purpose": "emotional"
    }
  }
}
```

#### Intégration avec l'Éditeur

Les images de référence sont automatiquement :

1. **Générées** avec les bonnes dimensions cinématiques (16:9)
2. **Nommées** selon l'ID des shots pour un tri facile
3. **Métadonnées** incluses pour retrouver les spécifications originales
4. **Compatibles** avec les principaux logiciels de montage (DaVinci Resolve, Premiere, etc.)

## Système de Validation Amélioré

### Niveaux de Sévérité

1. **Info** (ℹ️) - Information générale
2. **Warning** (⚠️) - Suggestion d'amélioration
3. **Error** (❌) - Bloque la progression
4. **Critical** (🚨) - Erreur critique

### Messages d'Erreur Intelligents

Les messages d'erreur incluent maintenant des suggestions contextuelles :

```
❌ Project name contains invalid characters (< > : " / \ | ? *)
💡 Suggestion: Use only letters, numbers, spaces, hyphens, and underscores

❌ Field 'duration' requires 'format' to be filled first
💡 Suggestion: Fill in the 'format' field first

⚠️ For horror genre, consider using 'dark', 'tense', or 'frightening' tones
💡 Suggestion: Try 'dark' or 'tense' for better horror atmosphere
```

### Validation Croisée

Le système valide les relations entre champs :

- **Format → Durée** : La durée doit être compatible avec le format choisi
- **Genre → Ton** : Suggestions de tons appropriés selon le genre
- **Personnages → Dialogue** : Cohérence des voix dans les scènes

## Meilleures Pratiques

### 1. Préparation
- **Définir clairement** vos objectifs avant de lancer un wizard
- **Préparer vos idées** principales (thème, personnages, conflit)
- **Choisir le bon wizard** pour votre besoin spécifique

### 2. Utilisation Interactive
- **Lire attentivement** les invites et options
- **Utiliser les suggestions** du système de validation
- **Sauvegarder régulièrement** votre progression

### 3. Optimisation
- **Commencer simple** puis enrichir itérativement
- **Utiliser la génération automatique** comme base, puis personnaliser
- **Tester différentes combinaisons** de paramètres

### 4. Organisation
- **Nommer clairement** vos projets et fichiers
- **Utiliser des dossiers** logiques pour l'organisation
- **Documenter vos choix** créatifs

## Intégration Technique

### API Python

```python
from wizard.enhanced_validation import validate_wizard_form
from wizard.dialogue_wizard import generate_quick_dialogue

# Validation de formulaire
result = validate_wizard_form("character_wizard", form_data)
if not result.is_valid:
    for error in result.errors:
        print(f"❌ {error.message}")
        if error.suggested_fix:
            print(f"💡 {error.suggested_fix}")

# Génération de dialogue
scene = generate_quick_dialogue(
    characters=["Alice", "Bob"],
    topic="résolution de conflit",
    tone="dramatic"
)
```

### Interface Web

Les wizards sont conçus pour s'intégrer facilement avec les interfaces web :

```typescript
import { validateWizardForm } from '@/services/validation';
import { generateDialogue } from '@/services/dialogueWizard';

const result = await validateWizardForm('character_wizard', formData);
if (!result.is_valid) {
    // Afficher les erreurs avec suggestions
    showValidationErrors(result.errors);
}
```

## Dépannage

### Problèmes Courants

#### Bouton "Complete" Désactivé
**Cause** : Champs requis non remplis
**Solution** : Vérifier tous les champs marqués comme requis

#### Erreurs de Validation Persistantes
**Cause** : Données incompatibles entre champs
**Solution** : Suivre les suggestions de correction

#### Génération qui Échoue
**Cause** : Paramètres trop restrictifs
**Solution** : Assouplir les contraintes ou utiliser des valeurs par défaut

### Commandes de Diagnostic

```bash
# Vérifier l'état des wizards
storycore --help | grep wizard

# Tester la génération rapide
storycore dialogue-wizard --quick --characters Test1 Test2 --topic test

# Vérifier les logs
tail -f logs/storycore.log
```

## Développement et Extension

### Ajouter un Nouveau Wizard

1. **Créer le module** dans `src/wizard/`
2. **Ajouter le handler CLI** dans `src/cli/handlers/`
3. **Définir les règles de validation** dans `enhanced_validation.py`
4. **Ajouter les tests** correspondants
5. **Mettre à jour la documentation**

### Structure Recommandée

```
src/wizard/
├── nouveau_wizard.py           # Logique principale
├── test_nouveau_wizard.py      # Tests unitaires
└── ...

src/cli/handlers/
└── nouveau_wizard.py           # Interface CLI

documentation/guides/
└── NOUVEAU_WIZARD_GUIDE.md     # Documentation utilisateur
```

## Historique des Versions

### v2.1.0 - Améliorations Majeures
- ✅ **Wizard de Dialogue** - Nouveau wizard spécialisé
- ✅ **Système de Validation** - Messages intelligents et suggestions
- ✅ **Architecture Modulaire** - Meilleure maintenabilité
- ✅ **Tests Complets** - Couverture de test à 100%

### v2.0.0 - Refonte Complète
- ✅ Interface utilisateur améliorée
- ✅ Validation côté client
- ✅ Intégration API améliorée
- ✅ Documentation complète

### v1.5.0 - Fonctionnalités Avancées
- ✅ Génération automatique d'histoires
- ✅ Profils de personnages avancés
- ✅ Export multi-formats

## Support et Contribution

### Signaler un Problème
1. Vérifier la documentation existante
2. Tester avec les commandes de diagnostic
3. Ouvrir une issue avec les logs complets

### Contribuer
1. Respecter les standards de code
2. Ajouter des tests pour toute nouvelle fonctionnalité
3. Mettre à jour la documentation
4. Suivre le processus de revue de code

---

## 🤖 Assistant StoryCore - Interface Conversationnelle

L'Assistant StoryCore est une interface conversationnelle avancée qui permet d'interagir naturellement avec tous les wizards et d'automatiser les workflows complexes.

### Fonctionnalités Principales

#### Interface Chat Intelligente
- **Compréhension naturelle** : "Analyze my project", "Run Ghost Tracker", etc.
- **Suggestions contextuelles** : Boutons d'actions basés sur l'état du projet
- **Historique de conversation** : Suivi des interactions avec timestamps
- **Analyse automatique** : Évaluation du projet au chargement

#### Upload de Fichiers Intégré
- **Bouton d'upload** 📄 dans la zone de saisie
- **Traitement automatique** avec Roger Data Extractor
- **Validation intelligente** des fichiers (type, taille)
- **Feedback en temps réel** pendant l'extraction

#### Workflow Guidé
- **Suggestions automatiques** après chaque action
- **Chaînage intelligent** des wizards (Character → Dialogue → Shot Planning)
- **Analyse prédictive** des besoins du projet
- **Recommandations personnalisées** basées sur les données extraites

### Utilisation de l'Assistant

#### Commandes Naturelles
```
"Analyze my project"          → Analyse complète du projet
"Run Ghost Tracker"           → Lance l'analyseur IA avancé
"Create characters"           → Ouvre le Character Wizard
"What wizards should I run?"  → Recommandations personnalisées
```

#### Upload de Documents
1. **Clic sur 📄** à côté de la zone de saisie
2. **Sélectionner un fichier** texte (.txt, .md, .story, .novel, .doc, .docx)
3. **Traitement automatique** avec Roger Wizard
4. **Intégration transparente** des données extraites
5. **Suggestions d'actions** suivantes

#### Exemple de Session
```
👋 Hello! I'm your StoryCore Assistant...

User: 📄 Uploaded file: my_story.txt (45.2 KB)

Assistant: 🤖 Processing "my_story.txt" with Roger Data Extractor...
         ✅ File processed successfully!
         📊 7 characters, 4 locations, 3 world elements extracted

         [Run Character Wizard] [World Builder] [Ghost Tracker]

User: Run Character Wizard

Assistant: 🚀 Launching Character Wizard...
         ✅ Character Wizard completed successfully!
         📄 Check the results in your project directory.

         [Create Dialogue] [Shot Planning] [Ghost Tracker]
```

### Avantages de l'Assistant

#### Productivité Accrue
- **Traitement parallèle** : Analyse + suggestions simultanées
- **Mémorisation contextuelle** : Compréhension de l'historique
- **Actions en un clic** : Interface directe vers tous les wizards
- **Feedback immédiat** : Résultats et erreurs affichés instantanément

#### Accessibilité
- **Pas de terminal** : Tout dans l'interface graphique
- **Guidage intuitif** : Suggestions adaptées au contexte
- **Apprentissage progressif** : Interface s'adapte à l'usage
- **Support multilingue** : Compréhension naturelle du langage

#### Intégration
- **API complète** : Tous les wizards accessibles programmatiquement
- **État persistant** : Mémorisation des préférences utilisateur
- **Synchronisation** : État cohérent entre interface et fichiers
- **Extensibilité** : Architecture modulaire pour nouveaux wizards

### Guides "Comment Faire" - Apprentissage Avancé

#### 🎵 Comment Maîtriser la Production Audio avec SonicCrafter

**🎯 Pro Tips pour un Sound Design Professionnel :**

1. **Layer Your Audio** : Combinez voice overs avec ambiances subtiles et cues musicaux
2. **Mood Consistency** : Utilisez le même mood category sur les shots liés pour un flow émotionnel
3. **Timing is Everything** : Les voice overs devraient durer 60-80% de la durée du shot pour un pacing naturel
4. **SFX Categories** : Focus sur le Foley (sons pratiques) pour le réalisme, les effets pour l'emphase
5. **Music Hierarchy** : Musique d'ambiance à 20-30% volume, SFX à 40-60%, voix à 70-90%

**🔧 Techniques Avancées :**
- Exportez les scripts voice over séparément pour enregistrement professionnel
- Utilisez les exports de music cues pour collaboration avec compositeurs
- Focus sur des shots spécifiques avec --shots pour itération raffinée
- Combinez avec Ghost Tracker pour optimisation complète du projet

**💡 Workflow Exemple :**
1. Lancez SonicCrafter sur votre storyboard
2. Examinez les scripts voice over et cues musicaux générés
3. Enregistrez les voice overs dans un environnement calme
4. Mixez les éléments avec un logiciel audio professionnel
5. Exportez les fichiers audio finaux synchronisés avec la vidéo

#### 👻 Comment Utiliser les Métriques de Qualité avec Ghost Tracker

**📊 Comprendre les Métriques de Ghost Tracker :**

**Métriques de Coverage :**
- **Voice Coverage** : % de shots avec narration (visez 60-80%)
- **SFX Coverage** : % de shots avec effets sonores (visez 70-90%)
- **Music Coverage** : % de shots avec musique d'ambiance (visez 40-60%)

**Scores de Qualité :**
- **Average Confidence** : Fiabilité de nos suggestions IA
- **Overall Quality** : Score combiné pour la santé du projet

**🎯 Stratégies d'Optimisation :**

1. **Low Coverage Areas** : Lancez des wizards spécialisés pour combler les gaps
2. **High Confidence** : Utilisez tel quel ou ajustements mineurs
3. **Low Confidence** : Examinez et personnalisez les suggestions

**🔍 Features d'Analyse Approfondie :**
- **Multimedia Quality** : Scores PSNR/SSIM des tests d'images
- **Audio Quality** : Niveaux et standards de mixage
- **Prompt Optimization** : Efficacité des prompts AI
- **Consistency Checks** : Cohérence inter-projets

**💡 Pro Tip** : Lancez Ghost Tracker après changements majeurs pour suivre l'amélioration !

#### 🤖 Comment Extraire des Données Comme un Pro avec Roger

**🎯 Techniques d'Extraction de Données Avancées :**

**Optimisation par Type de Fichier :**
- **Histoires** : Extrayez personnages, plot, world-building
- **Scripts** : Focus sur dialogue et relations de personnages
- **World Lore** : Extrayez règles, cultures, magie systems
- **LLM Outputs** : Parsez le contenu généré AI pour structuration

**Focus Areas pour Précision :**
- **Characters Only** : --focus characters pour préparation casting
- **Locations Only** : --focus world_building pour design de plateau
- **Plot Only** : --focus plot pour structure story
- **Combined** : Laissez Roger analyser tout automatiquement

**📈 Amélioration de Qualité :**
- **Longer Files** : Meilleure extraction (minimum 1000 mots)
- **Clear Structure** : Chapitre breaks, noms de personnages aident l'accuracy
- **Rich Descriptions** : Settings détaillés améliorent l'extraction world-building
- **Consistent Naming** : Même noms character/location partout

**🔧 Workflow d'Intégration :**
1. Extrayez données avec Roger depuis votre matériel source
2. Examinez et raffinez les éléments extraits
3. Utilisez Character Wizard pour enrichir les traits de personnalité
4. Lancez World Builder pour settings immersifs
5. Créez des shots avec contexte enrichi

**💡 Expert Tip** : Utilisez --preview d'abord pour voir le potentiel d'extraction avant processing complet !

## 📋 Liste Complète des Wizards

| Wizard | Icône | Description | Configuration Requise | Données Générées |
|--------|-------|-------------|----------------------|------------------|
| **Project Init** | 📁 | Initialisation de projet | Aucune | Structure projet |
| **Character Creation** | 👤 | Création de personnages | LLM | Profils détaillés |
| **Dialogue Wizard** | 💬 | Génération de dialogues | LLM | Scènes dialoguées |
| **World Building** | 🌍 | Construction d'univers | LLM | Éléments de monde |
| **Shot Planning** | 🎥 | Planification cinématographique | Aucune | Shots techniques |
| **Shot References** | 🖼️ | Images de référence | ComfyUI | Visuels de shots |
| **Scene Generator** | 🎬 | Génération de scènes | LLM + ComfyUI | Séquences complètes |
| **Storyboard Creator** | 📋 | Création de storyboard | LLM + ComfyUI | Panneaux visuels |
| **Style Transfer** | 🎨 | Transfert de style | ComfyUI | Images stylisées |
| **Ghost Tracker** | 👻 | Analyse IA avancée | LLM | Rapports détaillés |
| **Roger Data Extractor** | 🤖 | Extraction de texte | Aucune | Données structurées |
| **SonicCrafter** | 🎵 | Design sonore complet | Aucune | Plans audio pro |
| **EditForge** | 🎬 | Montage automatique | Aucune | Plans vidéo pro |
| **ViralForge** | 🚀 | Campagnes marketing viral | Aucune | Contenu promotionnel |
| **PanelForge** | 🎭 | BD vers cinéma | Aucune | Plans séquence pro |

### 🎭 PanelForge (`storycore comic-to-sequence-wizard`) - NOUVEAU

Assistant révolutionnaire qui transforme les images de planches de bandes dessinées en séquences cinématographiques professionnelles. Analyse automatiquement les panels, extrait les éléments narratifs et génère des plans de caméra complets pour la production vidéo.

#### Fonctionnalités
- **Analyse intelligente de panels** : Détection automatique des cases et contenu
- **Extraction narrative** : Personnages, dialogues, effets sonores, émotions
- **Conversion cinématographique** : Angles de caméra, mouvements, durées optimisées
- **Génération de storyboard** : Séquences visuelles complètes
- **Support multi-formats BD** : American Comics, Manga, European Comics, etc.
- **Plans de montage** : Shots planning compatibles avec les logiciels professionnels

#### Styles de BD Supportés
- **American Comics** : Marvel, DC - Grilles régulières 4-6 panels
- **Manga** : Japonais - Lecture verticale, expressions exagérées
- **European Comics** : Tintin, etc. - Mise en page artistique
- **Graphic Novels** : Formats longs avec narration sophistiquée
- **Web Comics** : Formats variés adaptés au numérique

#### Analyse Automatique
- **Détection de panels** : Algorithmes de vision pour identifier les cases
- **Extraction de contenu** : Texte, personnages, actions, émotions
- **Analyse narrative** : Progression story, thèmes, atmosphère
- **Inférence cinématographique** : Angles caméra, mouvements, timing

#### Utilisation

```bash
# Transformation complète d'une planche BD
storycore comic-to-sequence-wizard image.jpg --title "Amazing Comic" --page 1 --style american_comics

# Aperçu avant transformation
storycore comic-to-sequence-wizard image.jpg --preview

# Transformation avec exports détaillés
storycore comic-to-sequence-wizard image.jpg --export-shot-planning --export-storyboard --format detailed

# Transformation avec seuil de confiance
storycore comic-to-sequence-wizard image.jpg --confidence-threshold 8.0

# Format de sortie minimal
storycore comic-to-sequence-wizard image.jpg --format minimal
```

#### Exemple de Transformation Complète

```
🎭 PanelForge - Comic to Sequence Wizard

📖 Analyzing comic page: amazing_comic_page1.jpg
🎨 Detected style: American Comics

🔍 Analyzing panel layout and content...
   📊 Panels detected: 5
   👥 Characters identified: 3
   💬 Dialogue extracted: 4 segments
   🔊 Sound effects: 6 elements

🎬 Converting panels to cinematic shots...
   ✅ Generated 5 cinematic shots
   ✅ Inferred camera angles and movements
   ✅ Calculated optimal shot durations

📋 Generating storyboard sequence...
   ✅ Created complete storyboard with 5 panels
   ✅ Added visual notes and technical details

📁 Generating supporting assets...
   ✅ Created shot planning JSON
   ✅ Generated storyboard data

✅ Comic transformation completed!
   🎭 Panels analyzed: 5
   🎬 Shots generated: 5
   👥 Characters identified: 3
   📊 Confidence score: 8.2/10
   ⏱️ Processing time: 12.3s

📋 Comic Sequence Analysis:
   Layout: Multi-panel grid
   Overall Mood: Dramatic
   Story Progression: Classic hero's journey: establishment → conflict → climax
   Key Themes: heroism, conflict, camaraderie

🎭 Detected Comic Panels:
   1. Panel 1: Establishing shot - city street
      👥 Characters: Hero
      📷 Angle: Long shot
      🎭 Mood: Neutral
   2. Panel 2: Close-up of character face
      👥 Characters: Hero
      💬 Dialogue: "This ends now!"
      📷 Angle: Close-up
      🎭 Mood: Determined
   3. Panel 3: Action sequence beginning
      👥 Characters: Hero, Villain
      🔊 SFX: POW!, BAM!
      📷 Angle: Medium shot
      🎭 Mood: Intense
   4. Panel 4: Dialogue exchange
      👥 Characters: Hero, Villain
      💬 Dialogue: "You can't stop me!"
      📷 Angle: Medium close-up
      🎭 Mood: Tense
   5. Panel 5: Climactic moment - splash panel
      👥 Characters: All characters
      💬 Dialogue: "For justice!"
      🌟 Splash Panel (large, dramatic)
      📷 Angle: Wide shot
      🎭 Mood: Epic

🎬 Generated Cinematic Shots:
   1. Wide establishing shot (5.0s)
      📷 Camera: Long shot | Movement: Pan
      📝 Description: Establishing shot - city street featuring Hero with neutral atmosphere
      👁️ Visual Notes: Standard cinematic composition
   2. Close-up (3.5s)
      📷 Camera: Close-up | Movement: Static
      📝 Description: Close-up of character face featuring Hero with determined atmosphere
      💬 Dialogue: "This ends now!"
      👁️ Visual Notes: Camera angle: close_up
   3. Medium shot (4.2s)
      📷 Camera: Medium shot | Movement: Pan
      📝 Description: Action sequence beginning featuring Hero, Villain with intense atmosphere
      🔊 SFX: POW!, BAM!
      👁️ Visual Notes: Standard cinematic composition
   4. Medium close-up (3.8s)
      📷 Camera: Medium close-up | Movement: Static
      📝 Description: Dialogue exchange featuring Hero, Villain with tense atmosphere
      💬 Dialogue: "You can't stop me!"
      👁️ Visual Notes: Camera angle: medium_close_up
   5. Wide establishing shot (6.0s)
      📷 Camera: Wide shot | Movement: Static
      📝 Description: Climactic moment - splash panel featuring All characters with epic atmosphere
      💬 Dialogue: "For justice!"
      👁️ Visual Notes: Large, impactful composition - use wide lens

📁 Generated Assets:
   • comic_derived_shot_planning.json - Cinematic shot planning data
   • comic_derived_storyboard.json - Visual storyboard sequence

💾 Files Created/Updated:
   • comic_to_sequence_result.json - Complete transformation specification
   • project.json - Updated with comic analysis metadata

✅ Comic to sequence transformation completed successfully!
   Use the generated shot planning and storyboard data in your video production workflow.
   The cinematic shots can be directly imported into editing software like DaVinci Resolve or Premiere Pro.
```

#### Métriques de Qualité d'Analyse
- **Confidence Score** : Fiabilité globale de l'analyse (0-10)
- **Panel Detection** : Précision de la détection des cases
- **Character Recognition** : Taux d'identification des personnages
- **Content Extraction** : Qualité de l'extraction texte/émotions

#### Formats d'Images Supportés
- **Extensions** : JPG, JPEG, PNG, BMP, TIFF, WebP
- **Taille maximale** : 50MB
- **Résolution** : Recommandée 2000px+ de largeur
- **Qualité** : Images haute résolution pour meilleure analyse

#### Exports Professionnels

**Shot Planning JSON** :
```json
{
  "shot_planning": {
    "title": "Amazing Comic - Page 1",
    "derived_from": "comic_to_sequence",
    "shot_lists": [
      {
        "shot_id": "shot_panel_1",
        "description": "Establishing shot - city street featuring Hero",
        "shot_type": {"code": "LS", "name": "Long shot"},
        "camera": {
          "angle": "long_shot",
          "movement": {"type": "pan", "description": "Pan movement"}
        },
        "timing": {"duration_seconds": 5.0, "purpose": "establishment"},
        "derived_from": "comic_panel_analysis"
      }
    ]
  }
}
```

**Storyboard JSON** :
```json
{
  "storyboard": {
    "title": "Amazing Comic - Page 1",
    "panels": [
      {
        "panel_id": "storyboard_shot_panel_1",
        "shot_number": 1,
        "description": "Establishing shot - city street featuring Hero",
        "camera_angle": "long_shot",
        "shot_type": "Wide establishing shot",
        "duration": 5.0,
        "source_panel": "panel_1"
      }
    ]
  }
}
```

#### Intégration avec l'Écosystème
- **Shot Planning** : Les plans générés s'intègrent directement
- **EditForge** : Utilise les shots pour créer des montages
- **SonicCrafter** : Génère l'audio basé sur les effets extraits
- **Ghost Tracker** : Analyse la qualité de la transformation

---

### 🎵 SonicCrafter (`storycore audio-production-wizard`) - NOUVEAU

## 🔧 Architecture Technique

### Classes Principales

#### Wizard Base Classes
```python
class BaseWizard:
    """Classe de base pour tous les wizards"""
    def analyze_and_generate(self, project_data: Dict) -> Dict:
        """Méthode principale d'analyse et génération"""

class ExtractionWizard(BaseWizard):
    """Spécialisé dans l'extraction de données"""

class GenerationWizard(BaseWizard):
    """Spécialisé dans la génération de contenu"""
```

#### Service Layer
```typescript
class WizardService {
    // Lancement de wizards depuis l'interface
    launchWizard(wizardId: string, projectPath: string, options: any): Promise<Result>

    // Validation des prérequis
    validateRequirements(wizardId: string, config: Config): boolean

    // Intégration avec l'assistant
    processWithAssistant(message: string, context: Context): Promise<Response>
}
```

#### UI Components
```typescript
// Assistant principal
<StoryCoreAssistant />

// Modals de wizards
<CharacterWizardModal />
<RogerWizardModal />
<GhostTrackerModal />

// Services d'intégration
<WizardLauncher />
<ConfigurationProvider />
```

### Patterns de Conception

#### Strategy Pattern
Chaque wizard implémente une stratégie spécifique :
- **Roger** : Extraction et structuration
- **Ghost Tracker** : Analyse et recommandations
- **Character Wizard** : Génération créative

#### Observer Pattern
L'assistant observe les changements de projet :
- **Auto-analyse** au chargement
- **Suggestions dynamiques** basées sur l'état
- **Mise à jour en temps réel** des recommandations

#### Factory Pattern
Création dynamique des wizards :
```python
def create_wizard(wizard_type: str) -> BaseWizard:
    wizards = {
        'roger': RogerWizard(),
        'ghost_tracker': GhostTrackerWizard(),
        'character': CharacterWizard(),
    }
    return wizards[wizard_type]
```

### Intégration API

#### Endpoints REST
```
POST /api/wizards/{wizardId}/launch
POST /api/assistant/message
POST /api/files/upload
GET  /api/project/analysis
```

#### WebSocket Events
```
wizard:progress     # Progression du wizard
assistant:message   # Nouveau message assistant
file:processed      # Fichier traité avec succès
project:updated     # Données projet mises à jour
```

### Gestion d'État

#### Zustand Stores
```typescript
// État global de l'application
useAppStore: {
    project: ProjectData
    currentWizard: string | null
    assistantMessages: Message[]
}

// État de l'assistant
useAssistantStore: {
    isTyping: boolean
    suggestions: Suggestion[]
    fileProcessing: boolean
}

// État des wizards
useWizardStore: {
    activeWizard: WizardDefinition
    wizardState: any
    results: any
}
```

### Validation et Sécurité

#### Validation de Fichiers
- **Types autorisés** : .txt, .md, .story, .novel, .doc, .docx
- **Taille maximale** : 10MB
- **Contenu sécurisé** : Analyse statique avant traitement
- **Encodage** : Support UTF-8, Latin-1 fallback

#### Sanitisation des Données
- **Échappement HTML** dans les interfaces
- **Validation JSON** pour les données extraites
- **Limites de taille** pour tous les champs
- **Filtres de sécurité** sur les contenus générés

## 📚 Guides Spécialisés

### Pour les Écrivains
- [Extraction de Manuscrits](./writing-manuscript-extraction.md)
- [Conversion Histoire → Storyboard](./story-to-storyboard.md)
- [Analyse de Cohérence Narrative](./narrative-consistency.md)

### Pour les Développeurs
- [API des Wizards](./wizard-api-reference.md)
- [Extension des Wizards](./extending-wizards.md)
- [Intégration Assistant](./assistant-integration.md)

### Pour les Artistes
- [Génération de Personnages](./character-visualization.md)
- [Création de Mondes](./world-building-visual.md)
- [Style Transfer Avancé](./advanced-style-transfer.md)

## 🔮 Évolutions Futures

### IA Avancée
- **Compréhension contextuelle** améliorée
- **Apprentissage des préférences** utilisateur
- **Suggestions prédictives** basées sur l'historique
- **Génération multi-modale** (texte + image + audio)

### Collaboration
- **Partage de projets** entre utilisateurs
- **Review collaboratif** des extractions
- **Workflows d'équipe** avec rôles définis
- **Intégration git** pour le versioning

### Performance
- **Traitement parallèle** des gros fichiers
- **Cache intelligent** des analyses
- **Optimisation GPU** pour les générations
- **Streaming** pour les longs processus

### Nouveaux Wizards
- **Video Editor Wizard** - Montage automatique
- **Audio Designer Wizard** - Création de bandes son
- **Marketing Wizard** - Génération de contenu promotionnel
- **Analytics Wizard** - Métriques de performance

---

*Pour plus de détails techniques, voir le code source dans `src/wizard/` et `creative-studio-ui/src/components/`*