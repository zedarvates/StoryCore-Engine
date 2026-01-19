# Bibliothèque de Prompts d'Images - StoryCore-Engine

## Vue d'ensemble
Cette bibliothèque fournit des prompts textuels optimisés pour générer les assets visuels nécessaires à tous les niveaux du pipeline StoryCore-Engine. Ces prompts sont conçus pour être utilisés avec ComfyUI et garantir la cohérence visuelle via le Master Coherence Sheet.

---

## 1. ASSETS DE BASE - MASTER COHERENCE SHEET (3x3)

### 1.1 Grille de Cohérence Visuelle Complète
```
A 3x3 grid layout showing consistent visual DNA for [PROJECT_NAME]. 
Style: [GENRE/STYLE]. Color palette: [PRIMARY_COLORS]. 
Lighting: [LIGHTING_TYPE]. Composition: professional cinematic framing.
Each panel shows the same scene from slightly different angles maintaining 
perfect style consistency, color harmony, and atmospheric coherence.
High quality, sharp details, 4K resolution.
```

### 1.2 Grille de Personnage Principal
```
Character design sheet, 3x3 grid layout. [CHARACTER_DESCRIPTION]: 
[AGE], [GENDER], [DISTINCTIVE_FEATURES]. 
Style: [ART_STYLE]. Multiple angles: front view, 3/4 view, side profile, 
back view, close-up face, full body, action pose, emotional expression, 
detail shot. Consistent lighting, same costume, identical color palette.
Professional character concept art quality.
```

### 1.3 Grille d'Environnement
```
Environment design sheet, 3x3 grid. [LOCATION_TYPE]: [DESCRIPTION].
Time of day: [TIME]. Weather: [CONDITIONS]. Atmosphere: [MOOD].
Multiple views: wide establishing shot, medium shot, close detail, 
different angles showing depth and spatial relationships.
Consistent lighting and color grading throughout all panels.
Cinematic composition, photorealistic quality.
```

---

## 2. ASSETS PAR GENRE - TEMPLATES PRÉDÉFINIS

### 2.1 Science-Fiction
```
Sci-fi scene, [SPECIFIC_ELEMENT]. Futuristic technology, neon lighting,
cyberpunk aesthetic OR clean minimalist future OR dystopian industrial.
Color palette: electric blues, neon purples, chrome metallics.
Advanced technology visible, holographic interfaces, sleek architecture.
Cinematic lighting with volumetric fog, 4K quality, sharp focus.
```

### 2.2 Fantasy Médiéval
```
Medieval fantasy scene, [SPECIFIC_ELEMENT]. 
Magic atmosphere, mystical lighting, [CASTLE/FOREST/VILLAGE].
Color palette: rich earth tones, magical glows, deep shadows.
Fantasy elements: [DRAGONS/MAGIC/CREATURES], medieval architecture,
torchlight and natural lighting. Epic cinematic composition,
painterly quality with sharp details.
```

### 2.3 Horreur / Thriller
```
Horror atmosphere, [SPECIFIC_ELEMENT]. Dark moody lighting,
deep shadows with strategic highlights. Unsettling composition.
Color palette: desaturated with accent colors [RED/GREEN/BLUE].
Atmospheric fog, dramatic contrast, tension in framing.
Cinematic horror aesthetic, high contrast, sharp where needed,
mysterious shadows. Professional thriller cinematography.
```

### 2.4 Romance / Drame
```
Romantic/dramatic scene, [SPECIFIC_ELEMENT]. Soft natural lighting,
warm color palette: golden hour tones, soft pastels, intimate atmosphere.
Emotional composition, shallow depth of field, bokeh background.
Cinematic romance aesthetic, professional color grading,
film-like quality with gentle contrast.
```

### 2.5 Action / Aventure
```
Dynamic action scene, [SPECIFIC_ELEMENT]. High energy composition,
dramatic lighting with strong directional light. Motion implied.
Color palette: bold saturated colors, high contrast.
Epic scale, wide cinematic framing OR intense close-up.
Sharp focus on action, motion blur where appropriate,
professional action cinematography quality.
```

### 2.6 Animation / Cartoon
```
Animated style scene, [SPECIFIC_ELEMENT]. 
[2D HAND-DRAWN / 3D CGI / STOP-MOTION] aesthetic.
Vibrant color palette, clear readable shapes, appealing design.
Consistent art style, clean lines, professional animation quality.
Lighting appropriate to animation style, sharp and clear details.
```

---

## 3. ASSETS PAR ÉLÉMENT DE SCÈNE

### 3.1 Personnages

#### Personnage Héroïque
```
Heroic character, [DESCRIPTION]. Confident pose, strong silhouette,
clear readable design. [COSTUME_DETAILS]. Professional character design,
cinematic lighting highlighting features, sharp focus on face and details.
Background: [ENVIRONMENT], slightly blurred for depth.
```

#### Personnage Antagoniste
```
Antagonist character, [DESCRIPTION]. Imposing presence, distinctive design,
[THREATENING/MYSTERIOUS/ELEGANT] demeanor. [COSTUME_DETAILS].
Dramatic lighting emphasizing character traits, strong composition.
Professional villain design, cinematic quality.
```

#### Personnage de Soutien
```
Supporting character, [DESCRIPTION]. Approachable design, clear personality,
[FRIENDLY/WISE/COMIC] presence. [COSTUME_DETAILS].
Natural lighting, warm atmosphere, professional character art quality.
```

### 3.2 Environnements

#### Intérieur - Résidentiel
```
Interior residential space, [ROOM_TYPE]. [TIME_OF_DAY] lighting through windows,
[MODERN/VINTAGE/RUSTIC] decor style. Lived-in atmosphere with [DETAILS].
Color palette: [COLORS]. Realistic materials and textures,
cinematic interior photography quality, sharp architectural details.
```

#### Intérieur - Commercial/Public
```
Interior public space, [LOCATION_TYPE]. [BUSY/EMPTY] atmosphere,
[MODERN/HISTORIC] architecture. Appropriate lighting for space type,
clear spatial layout, professional details. Cinematic composition,
architectural photography quality.
```

#### Extérieur - Nature
```
Natural outdoor environment, [LANDSCAPE_TYPE]. [TIME_OF_DAY], [WEATHER].
[FOREST/MOUNTAIN/BEACH/DESERT] landscape with [SPECIFIC_FEATURES].
Natural lighting, atmospheric perspective, rich environmental details.
Cinematic landscape photography quality, sharp foreground, depth in background.
```

#### Extérieur - Urbain
```
Urban environment, [CITY_TYPE]. [MODERN/HISTORIC] architecture,
[BUSY_STREET/QUIET_ALLEY/PLAZA]. [TIME_OF_DAY] lighting,
urban atmosphere with [PEOPLE/VEHICLES/DETAILS].
Cinematic urban photography, sharp architectural details, depth and scale.
```

### 3.3 Objets et Props

#### Objet Clé / MacGuffin
```
Hero object close-up, [OBJECT_DESCRIPTION]. Dramatic lighting highlighting
importance, shallow depth of field, sharp focus on object details.
[MATERIAL_TYPE] with realistic textures. Cinematic product photography style,
professional lighting setup, high detail capture.
```

#### Props d'Ambiance
```
Environmental props, [ITEMS_DESCRIPTION]. Contextual placement in scene,
appropriate scale and lighting. Realistic materials and wear.
Supporting the main scene without distraction, professional set dressing quality.
```

---

## 4. ASSETS PAR TYPE DE PLAN CINÉMATOGRAPHIQUE

### 4.1 Establishing Shot (Plan d'Établissement)
```
Wide establishing shot, [LOCATION]. Epic scale showing full environment,
clear spatial relationships, [TIME_OF_DAY] lighting. Atmospheric depth,
foreground/midground/background layers. Cinematic wide-angle composition,
professional cinematography, sharp details throughout depth of field.
```

### 4.2 Wide Shot (Plan Large)
```
Wide shot, [SUBJECT] in [ENVIRONMENT]. Full figure visible with environmental
context, balanced composition. [LIGHTING_TYPE], clear subject placement.
Cinematic framing, professional blocking, appropriate depth of field.
```

### 4.3 Medium Shot (Plan Moyen)
```
Medium shot, [SUBJECT] from waist up. Clear facial expressions and gestures,
environmental context visible. [LIGHTING_SETUP], focused composition.
Cinematic portrait framing, professional lighting, sharp focus on subject.
```

### 4.4 Close-Up (Gros Plan)
```
Close-up shot, [SUBJECT]'s face/object. Emotional detail visible,
shallow depth of field, dramatic lighting emphasizing features.
Intimate framing, professional portrait cinematography,
sharp focus on eyes/key details.
```

### 4.5 Extreme Close-Up (Très Gros Plan)
```
Extreme close-up, [SPECIFIC_DETAIL]. Macro-level detail, texture visible,
dramatic lighting revealing micro-details. Abstract composition possible,
professional macro photography quality, razor-sharp focus.
```

### 4.6 Over-the-Shoulder (Par-Dessus l'Épaule)
```
Over-the-shoulder shot, [CHARACTER_A] facing [CHARACTER_B/OBJECT].
Foreground character partially visible, focus on subject of attention.
Cinematic dialogue framing, professional depth staging, clear eyeline.
```

### 4.7 Point of View (POV - Subjective)
```
Point of view shot from [CHARACTER]'s perspective, seeing [WHAT_THEY_SEE].
First-person camera angle, immersive framing, [EMOTIONAL_CONTEXT].
Cinematic subjective camera work, appropriate lens distortion if needed.
```

---

## 5. ASSETS PAR MOMENT NARRATIF

### 5.1 Introduction / Ouverture
```
Opening scene, [SETTING]. Mysterious OR inviting atmosphere,
establishing mood and tone. [LIGHTING_TYPE] suggesting [GENRE].
Cinematic opening shot quality, professional color grading,
attention-grabbing composition.
```

### 5.2 Moment d'Action
```
Action moment, [SPECIFIC_ACTION]. Dynamic composition with implied motion,
dramatic lighting, high energy. [MOTION_BLUR/FREEZE_FRAME] as appropriate.
Intense color palette, high contrast, professional action cinematography.
```

### 5.3 Moment Émotionnel
```
Emotional moment, [CHARACTER] experiencing [EMOTION]. Intimate lighting,
composition emphasizing emotional state. Color palette supporting mood:
[WARM/COOL/DESATURATED]. Cinematic drama quality, subtle and powerful.
```

### 5.4 Révélation / Twist
```
Revelation moment, [WHAT_IS_REVEALED]. Dramatic lighting change,
composition emphasizing surprise/shock. Strategic use of shadows and highlights.
Cinematic plot twist framing, professional dramatic photography.
```

### 5.5 Climax
```
Climactic scene, [PEAK_MOMENT]. Maximum dramatic intensity,
bold lighting choices, powerful composition. Epic scale OR intimate intensity.
Color palette at full saturation/contrast. Professional climax cinematography,
memorable iconic framing.
```

### 5.6 Résolution / Conclusion
```
Resolution scene, [FINAL_STATE]. Peaceful OR bittersweet atmosphere,
balanced composition suggesting closure. [LIGHTING_TYPE] indicating resolution.
Cinematic ending quality, professional color grading, satisfying visual closure.
```

---

## 6. ASSETS PAR CONDITION D'ÉCLAIRAGE

### 6.1 Golden Hour (Heure Dorée)
```
Golden hour lighting, [SCENE]. Warm sunlight at [SUNRISE/SUNSET],
long soft shadows, golden color temperature. Magical atmosphere,
rim lighting on subjects. Professional golden hour cinematography,
rich warm tones, glowing highlights.
```

### 6.2 Blue Hour (Heure Bleue)
```
Blue hour lighting, [SCENE]. Cool twilight atmosphere, deep blue sky,
artificial lights beginning to glow. Balanced ambient and practical lights.
Cinematic twilight photography, rich blue tones, atmospheric depth.
```

### 6.3 Harsh Midday Sun
```
Midday sunlight, [SCENE]. Strong overhead sun, hard shadows,
high contrast. Bright highlights, deep shadows. [HOT/INTENSE] atmosphere.
Professional harsh light cinematography, managing extreme contrast.
```

### 6.4 Overcast / Soft Light
```
Overcast lighting, [SCENE]. Soft diffused light, minimal shadows,
even illumination. Muted color palette, gentle atmosphere.
Professional soft light cinematography, subtle tonal gradations.
```

### 6.5 Night - Moonlight
```
Moonlit night scene, [SCENE]. Cool blue moonlight, deep shadows,
mysterious atmosphere. Stars visible if appropriate. Selective lighting
on key elements. Cinematic night photography, professional low-light quality.
```

### 6.6 Night - Artificial Light
```
Night scene with artificial lighting, [SCENE]. [STREETLIGHTS/NEON/WINDOWS]
providing illumination. Warm artificial light against cool night shadows.
Urban night atmosphere. Professional night cinematography, rich colors in darkness.
```

### 6.7 Interior - Natural Window Light
```
Interior with window light, [SCENE]. Soft natural light streaming through windows,
gradient from bright to shadow. Atmospheric dust particles in light beams optional.
Cinematic interior natural light, professional quality, beautiful light falloff.
```

### 6.8 Interior - Artificial Light
```
Interior with artificial lighting, [SCENE]. [PRACTICAL_LIGHTS] visible in scene,
warm interior atmosphere. Layered lighting with highlights and shadows.
Professional interior cinematography, realistic light behavior.
```

---

## 7. ASSETS PAR CONDITION MÉTÉOROLOGIQUE

### 7.1 Ensoleillé / Clair
```
Clear sunny weather, [SCENE]. Bright sunlight, clear sky [BLUE/SUNSET_COLORS],
crisp visibility. Vibrant colors, strong shadows. Professional clear weather
cinematography, sharp details, rich saturation.
```

### 7.2 Nuageux
```
Cloudy weather, [SCENE]. Overcast sky with cloud texture, diffused lighting,
muted color palette. Atmospheric mood, soft shadows. Cinematic overcast
photography, subtle tonal range.
```

### 7.3 Pluie
```
Rainy weather, [SCENE]. Rain visible [LIGHT_DRIZZLE/HEAVY_DOWNPOUR],
wet surfaces with reflections, overcast lighting. Water droplets, puddles.
Atmospheric rain cinematography, professional wet weather effects.
```

### 7.4 Orage
```
Storm weather, [SCENE]. Dark dramatic clouds, [LIGHTNING] illumination optional,
intense atmosphere. Wind-blown elements, dramatic lighting contrast.
Cinematic storm photography, powerful atmospheric conditions.
```

### 7.5 Brouillard / Brume
```
Foggy conditions, [SCENE]. Dense [FOG/MIST] reducing visibility,
atmospheric depth, mysterious mood. Soft diffused lighting, muted colors.
Cinematic fog photography, professional atmospheric effects, depth layers.
```

### 7.6 Neige
```
Snowy weather, [SCENE]. [FALLING_SNOW/SNOW_COVERED_GROUND], cold atmosphere,
soft diffused lighting. White balance for snow, blue shadows. Winter mood.
Professional snow cinematography, proper exposure for white snow.
```

---

## 8. ASSETS TECHNIQUES - EFFETS SPÉCIAUX

### 8.1 Particules et Atmosphère
```
Atmospheric particles, [SCENE]. [DUST/SMOKE/SPARKLES/EMBERS] floating in air,
visible in light beams. Adds depth and atmosphere. Cinematic particle effects,
professional integration with lighting.
```

### 8.2 Effets de Lumière
```
Light effects, [SCENE]. [LENS_FLARE/LIGHT_RAYS/GLOW/BOKEH] enhancing mood.
Realistic optical effects, professional cinematography light behavior.
Subtle and enhancing, not distracting.
```

### 8.3 Effets de Mouvement
```
Motion effects, [SCENE]. [MOTION_BLUR/SPEED_LINES/FREEZE_FRAME] showing
[ACTION]. Dynamic composition, professional motion capture cinematography.
Clear action reading despite motion effects.
```

### 8.4 Effets Magiques / Surnaturels
```
Magical effects, [SCENE]. [ENERGY/GLOW/PORTAL/TRANSFORMATION] with
[COLOR] magical light. Fantasy atmosphere, otherworldly quality.
Professional VFX integration, believable magical realism.
```

---

## 9. ASSETS PAR PALETTE DE COULEURS

### 9.1 Palette Chaude
```
Warm color palette scene, [SCENE]. Dominant colors: reds, oranges, yellows,
warm browns. [COZY/PASSIONATE/ENERGETIC] atmosphere. Professional color
grading, harmonious warm tones, cinematic quality.
```

### 9.2 Palette Froide
```
Cool color palette scene, [SCENE]. Dominant colors: blues, cyans, cool greens,
purples. [CALM/MYSTERIOUS/MELANCHOLIC] atmosphere. Professional color grading,
harmonious cool tones, cinematic quality.
```

### 9.3 Palette Monochrome
```
Monochromatic scene, [SCENE]. Single color family with tonal variations,
[COLOR] dominant throughout. Artistic unified look, professional monochrome
cinematography, rich tonal range within single hue.
```

### 9.4 Palette Complémentaire
```
Complementary color scheme, [SCENE]. [COLOR_1] and [COLOR_2] in opposition,
high visual impact, balanced composition. Professional color theory application,
cinematic complementary color grading.
```

### 9.5 Palette Désaturée
```
Desaturated color palette, [SCENE]. Muted colors, low saturation,
[REALISTIC/GRITTY/MELANCHOLIC] mood. Professional bleach bypass style OR
subtle desaturation, cinematic muted color grading.
```

### 9.6 Palette Vibrante
```
Vibrant color palette, [SCENE]. High saturation, bold colors,
[ENERGETIC/FANTASTICAL/JOYFUL] atmosphere. Professional color grading,
balanced vibrant tones, cinematic saturated look.
```

---

## 10. ASSETS SPÉCIALISÉS - TRANSITIONS

### 10.1 Transition Temporelle
```
Time transition indicator, [SCENE]. Visual cues showing passage of time:
[CLOCK/CALENDAR/LIGHT_CHANGE/SEASONAL_SHIFT]. Clear temporal progression,
cinematic time-lapse aesthetic where appropriate.
```

### 10.2 Transition Spatiale
```
Location transition, [FROM_LOCATION] to [TO_LOCATION]. Visual bridge between
spaces, [MATCH_CUT_ELEMENT] OR [WIPE_DIRECTION]. Professional transition
cinematography, smooth visual flow.
```

### 10.3 Transition de Rêve / Flashback
```
Dream/flashback transition, [SCENE]. [SOFT_FOCUS/VIGNETTE/COLOR_SHIFT]
indicating memory or dream state. Ethereal quality, professional dream
sequence cinematography, clear visual distinction from reality.
```

---

## 11. VARIABLES DE PERSONNALISATION

### Variables à Remplacer dans les Prompts:

**Projet:**
- `[PROJECT_NAME]` - Nom du projet
- `[GENRE/STYLE]` - Genre et style artistique
- `[PRIMARY_COLORS]` - Palette de couleurs principale

**Personnage:**
- `[CHARACTER_DESCRIPTION]` - Description du personnage
- `[AGE]` - Âge
- `[GENDER]` - Genre
- `[DISTINCTIVE_FEATURES]` - Traits distinctifs
- `[COSTUME_DETAILS]` - Détails du costume
- `[EMOTION]` - Émotion exprimée

**Environnement:**
- `[LOCATION_TYPE]` - Type de lieu
- `[DESCRIPTION]` - Description détaillée
- `[TIME]` / `[TIME_OF_DAY]` - Moment de la journée
- `[CONDITIONS]` / `[WEATHER]` - Conditions météo
- `[MOOD]` - Ambiance

**Technique:**
- `[LIGHTING_TYPE]` / `[LIGHTING_SETUP]` - Type d'éclairage
- `[ART_STYLE]` - Style artistique
- `[SPECIFIC_ELEMENT]` - Élément spécifique
- `[COLORS]` - Couleurs spécifiques

---

## 12. MODIFICATEURS DE QUALITÉ

### À Ajouter à Tous les Prompts pour Garantir la Qualité:

**Qualité Générale:**
```
Professional quality, cinematic composition, 4K resolution, sharp focus,
high detail, proper exposure, color graded, film-like quality.
```

**Style Photographique:**
```
Shot on [CAMERA_TYPE], [LENS_MM]mm lens, f/[APERTURE], cinematic depth of field,
professional cinematography, [FILM_STOCK] aesthetic.
```

**Cohérence Master Sheet:**
```
Consistent with master coherence sheet, matching color palette, identical
lighting setup, same atmospheric conditions, visual DNA maintained.
```

---

## 13. ANTI-PATTERNS - À ÉVITER

### Éléments à NE PAS Inclure:
```
Avoid: blurry (unless intentional), low quality, amateur, distorted,
deformed, bad anatomy, bad proportions, watermark, signature, text overlay,
oversaturated (unless stylistic), underexposed (unless stylistic),
inconsistent lighting, style mixing, anachronistic elements.
```

---

## UTILISATION DANS LE PIPELINE STORYCORE-ENGINE

### Workflow d'Intégration:

1. **Sélection du Template** - Choisir le prompt de base selon le besoin
2. **Personnalisation** - Remplacer les variables par les valeurs du projet
3. **Ajout de Modificateurs** - Ajouter les modificateurs de qualité
4. **Génération Master Sheet** - Utiliser pour créer la grille 3x3 de cohérence
5. **Promotion de Panels** - Utiliser les prompts spécifiques pour chaque panel
6. **Validation QA** - Vérifier la cohérence avec le Master Coherence Sheet

### Exemple Complet:
```
[TEMPLATE DE BASE]
+ [VARIABLES PERSONNALISÉES]
+ [MODIFICATEURS DE QUALITÉ]
+ [RÉFÉRENCE MASTER SHEET]
= PROMPT FINAL OPTIMISÉ
```

---

*Cette bibliothèque est conçue pour être utilisée avec le système de Master Coherence Sheet de StoryCore-Engine, garantissant une cohérence visuelle parfaite à travers tous les assets générés.*
