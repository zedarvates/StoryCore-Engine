# Prompt Library Analysis and Expansion Plan

## Executive Summary

Analysis of existing StoryCore-Engine project structure reveals significant opportunities to expand the prompt library with content that aligns with the wizard workflow and existing type definitions.

## Current Library Status

### ✅ What We Have (24 prompts across 5 categories)

1. **Master Coherence Sheets** (3 prompts)
   - Coherence grid, Character grid, Environment grid

2. **Genre Templates** (6 prompts)
   - Sci-Fi, Fantasy, Horror, Romance, Action, Animation

3. **Shot Types** (7 prompts)
   - Establishing, Wide, Medium, Close-up, Extreme Close-up, Over-shoulder, POV

4. **Lighting Conditions** (4 prompts)
   - Golden hour, Blue hour, Night moonlight, Night artificial

5. **Scene Elements** (4 prompts)
   - Hero character, Villain character, Interior residential, Exterior nature

## Gap Analysis

### Missing from Library vs. Wizard Types

#### 1. **Missing Genres** (8 genres not covered)
From `wizard.ts` Genre type:
- ❌ Drama
- ❌ Comedy
- ❌ Thriller (different from Horror)
- ❌ Documentary
- ❌ Mystery
- ❌ Adventure
- ❌ Historical
- ❌ Musical
- ❌ Western

#### 2. **Missing Visual Styles** (11 styles not covered)
From `wizard.ts` VisualStyle type:
- ❌ Realistic
- ❌ Stylized
- ❌ Anime (we have Animation, but not specifically Anime style)
- ❌ Comic-book
- ❌ Noir
- ❌ Vintage
- ❌ Futuristic
- ❌ Watercolor
- ❌ Oil-painting
- ❌ Minimalist
- ❌ Surreal

#### 3. **Missing Mood/Atmosphere Prompts** (10 moods not covered)
From `wizard.ts` Mood type:
- ❌ Dark
- ❌ Light
- ❌ Serious
- ❌ Playful
- ❌ Tense
- ❌ Calm
- ❌ Energetic
- ❌ Melancholic
- ❌ Hopeful
- ❌ Mysterious

#### 4. **Missing Camera Angles** (6 angles not covered)
From `wizard.ts` CameraAngle type:
- ❌ Eye-level
- ❌ High-angle
- ❌ Low-angle
- ❌ Dutch-angle
- ❌ Birds-eye
- ❌ Worms-eye

#### 5. **Missing Camera Movements** (8 movements not covered)
From `wizard.ts` CameraMovement type:
- ❌ Static
- ❌ Pan
- ❌ Tilt
- ❌ Dolly
- ❌ Track
- ❌ Zoom
- ❌ Handheld
- ❌ Crane

#### 6. **Missing Transitions** (5 transitions not covered)
From `wizard.ts` Transition type:
- ❌ Cut
- ❌ Fade
- ❌ Dissolve
- ❌ Wipe
- ❌ Match-cut

#### 7. **Missing Time of Day** (6 times not covered)
From `wizard.ts` TimeOfDay type:
- ❌ Dawn
- ❌ Morning
- ❌ Afternoon
- ❌ Evening
- ✅ Night (partially covered)
- ❌ Unspecified

#### 8. **Missing Universe Types** (5 types not covered)
From `wizard.ts` UniverseType:
- ❌ Realistic
- ❌ Fantasy (have genre, need universe type)
- ❌ Sci-fi (have genre, need universe type)
- ❌ Historical
- ❌ Alternate

#### 9. **Missing Color Palette Presets** (6 presets from Step2)
From `Step2_GenreStyle.tsx`:
- ❌ Warm-sunset
- ❌ Cool-ocean
- ❌ Monochrome
- ❌ Forest-green
- ❌ Royal-purple
- ❌ Fire-red

#### 10. **Missing Template-Based Prompts**
From `TemplateSystem.ts` built-in templates:
- ❌ Action Short Film specific prompts
- ❌ Drama Feature specific prompts
- ❌ Sci-Fi Series Episode specific prompts
- ❌ Documentary Short specific prompts
- ❌ Fantasy Feature specific prompts
- ❌ Horror Short specific prompts

## Bibliothèque Folder Structure Analysis

### Existing Structure (Empty but Organized)
```
Bibliothèque/
├── ASSETS PAR GENRE/
│   ├── Action Aventure/
│   ├── Animation -Cartoon/
│   ├── Fantasy Médiéval/
│   ├── Horreur -Thriller/
│   ├── Romance -Drame/
│   ├── Science-Fiction/
│   ├── ASSETS PAR MOMENT NARRATIF/
│   ├── ASSETS PAR TYPE DE PLAN CINÉMATOGRAPHIQUE/
│   ├── Environnements/
│   ├── Objets et Props/
│   ├── Personnage Antagoniste/
│   ├── Personnage de Soutien/
│   └── Personnage Héroïque/
├── Grille d'Environnement/
├── Grille de Cohérence Visuelle/
└── Grille de Personnage/
```

**Observation**: The folder structure is well-organized but completely empty. This suggests the user intended to organize assets by:
- Genre categories
- Narrative moments
- Cinematographic shot types
- Character types (Hero, Villain, Supporting)
- Environments and props

## Recommended Expansion Plan

### Phase 1: Critical Gaps (High Priority)

#### A. Complete Genre Coverage (+9 prompts)
Create prompts for missing genres:
1. Drama
2. Comedy
3. Thriller
4. Documentary
5. Mystery
6. Adventure
7. Historical
8. Musical
9. Western

#### B. Visual Style Prompts (+11 prompts)
Create a new category for visual styles:
1. Realistic
2. Stylized
3. Anime
4. Comic-book
5. Noir
6. Vintage
7. Futuristic
8. Watercolor
9. Oil-painting
10. Minimalist
11. Surreal

#### C. Camera Angles (+6 prompts)
Create a new category for camera angles:
1. Eye-level
2. High-angle
3. Low-angle
4. Dutch-angle
5. Birds-eye
6. Worms-eye

#### D. Camera Movements (+8 prompts)
Create a new category for camera movements:
1. Static
2. Pan
3. Tilt
4. Dolly
5. Track
6. Zoom
7. Handheld
8. Crane

### Phase 2: Enhanced Coverage (Medium Priority)

#### E. Mood/Atmosphere Prompts (+10 prompts)
Create a new category for mood modifiers:
1. Dark
2. Light
3. Serious
4. Playful
5. Tense
6. Calm
7. Energetic
8. Melancholic
9. Hopeful
10. Mysterious

#### F. Time of Day Variations (+6 prompts)
Expand lighting category:
1. Dawn
2. Morning
3. Afternoon
4. Evening
5. Night (enhance existing)
6. Unspecified/Timeless

#### G. Transition Effects (+5 prompts)
Create a new category for transitions:
1. Cut
2. Fade
3. Dissolve
4. Wipe
5. Match-cut

### Phase 3: Advanced Features (Lower Priority)

#### H. Color Palette Presets (+6 prompts)
Create visual reference prompts for color palettes:
1. Warm-sunset
2. Cool-ocean
3. Monochrome
4. Forest-green
5. Royal-purple
6. Fire-red

#### I. Universe Type Modifiers (+5 prompts)
Create world-building context prompts:
1. Realistic universe
2. Fantasy universe
3. Sci-fi universe
4. Historical universe
5. Alternate universe

#### J. Character Archetypes (+3 prompts)
Expand character prompts:
1. Supporting character
2. Background character
3. Ensemble cast

## Total Expansion Summary

| Phase | Category | New Prompts | Priority |
|-------|----------|-------------|----------|
| 1A | Genres | 9 | HIGH |
| 1B | Visual Styles | 11 | HIGH |
| 1C | Camera Angles | 6 | HIGH |
| 1D | Camera Movements | 8 | HIGH |
| 2E | Mood/Atmosphere | 10 | MEDIUM |
| 2F | Time of Day | 6 | MEDIUM |
| 2G | Transitions | 5 | MEDIUM |
| 3H | Color Palettes | 6 | LOW |
| 3I | Universe Types | 5 | LOW |
| 3J | Character Archetypes | 3 | LOW |
| **TOTAL** | **10 categories** | **69 prompts** | - |

**Current Library**: 24 prompts  
**After Expansion**: 93 prompts  
**Growth**: +287%

## Integration Strategy

### 1. Update Library Structure
```
library/
├── 01-master-coherence/ (existing - 3 prompts)
├── 02-genres/ (expand from 6 to 15 prompts)
├── 03-shot-types/ (existing - 7 prompts)
├── 04-lighting/ (expand from 4 to 10 prompts)
├── 05-scene-elements/ (existing - 4 prompts)
├── 06-visual-styles/ (NEW - 11 prompts)
├── 07-camera-angles/ (NEW - 6 prompts)
├── 08-camera-movements/ (NEW - 8 prompts)
├── 09-mood-atmosphere/ (NEW - 10 prompts)
├── 10-transitions/ (NEW - 5 prompts)
├── 11-color-palettes/ (NEW - 6 prompts)
├── 12-universe-types/ (NEW - 5 prompts)
└── 13-character-archetypes/ (NEW - 3 prompts)
```

### 2. Update index.json
Add new categories and update prompt counts.

### 3. Wizard Integration Points

#### Step 2 (Genre & Style)
- Link genre selection to genre prompts
- Link visual style selection to visual style prompts
- Link color palette to color palette prompts
- Link mood selection to mood/atmosphere prompts

#### Step 3 (World Building)
- Link universe type to universe type prompts
- Link time period to historical/era prompts

#### Step 4 (Characters)
- Link character roles to character archetype prompts

#### Step 6 (Scene Breakdown)
- Link time of day to lighting prompts

#### Step 7 (Shot Planning)
- Link shot types to shot type prompts
- Link camera angles to camera angle prompts
- Link camera movements to camera movement prompts
- Link transitions to transition prompts

### 4. PromptLibraryService Enhancements

Add methods for:
- `getPromptsByGenre(genre: Genre): Promise<Prompt[]>`
- `getPromptsByVisualStyle(style: VisualStyle): Promise<Prompt[]>`
- `getPromptsByMood(mood: Mood): Promise<Prompt[]>`
- `getPromptsByCameraAngle(angle: CameraAngle): Promise<Prompt[]>`
- `getPromptsByCameraMovement(movement: CameraMovement): Promise<Prompt[]>`
- `getPromptsByTransition(transition: Transition): Promise<Prompt[]>`
- `combinePrompts(prompts: Prompt[]): string` - Merge multiple prompts intelligently

### 5. ComfyUI Backend Integration

Each prompt should include:
- `comfyui_workflow_id`: Reference to specific ComfyUI workflow
- `comfyui_parameters`: Default parameters for the workflow
- `comfyui_conditioning`: Layer-aware conditioning instructions

## Next Steps

1. **Immediate**: Create Phase 1 prompts (34 new prompts)
2. **Short-term**: Create Phase 2 prompts (21 new prompts)
3. **Long-term**: Create Phase 3 prompts (14 new prompts)
4. **Integration**: Update wizard components to use new prompts
5. **Testing**: Validate prompt quality with ComfyUI backend
6. **Documentation**: Update user guides with new prompt categories

## Benefits of Expansion

1. **Complete Coverage**: All wizard types will have corresponding prompts
2. **Better UX**: Users can select from comprehensive options
3. **Consistency**: Prompts align with Data Contract v1 schema
4. **Flexibility**: Mix and match prompts for custom results
5. **Scalability**: Easy to add more prompts in the future
6. **Professional**: Matches industry-standard cinematography terminology

## Conclusion

The current library is a solid foundation with 24 prompts, but expanding to 93 prompts will provide complete coverage of all wizard features and cinematographic options. This expansion aligns perfectly with the existing type system and will significantly enhance the user experience.

**Recommendation**: Proceed with Phase 1 expansion immediately (34 prompts) to cover critical gaps in genres, visual styles, camera angles, and camera movements.
