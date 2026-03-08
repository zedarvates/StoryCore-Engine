import { Project, Character } from '@/types';

export interface CinematicAdvice {
    id: string;
    level: 'info' | 'warning' | 'success';
    text: string;
    actionLabel?: string;
    actionValue?: unknown;
}

export interface ShotSegment {
    id: string;
    title: string;
    prompt: string;
    duration: number;
    startTime: number;
    motionIntensity: number;
    cameraMovement?: string;
    sfxPrompt?: string;
}

export class CinematicAdviceService {
    /**
     * Generates a list of intelligent advice for a specific segment.
     */
    public static getAdvice(
        segment: ShotSegment,
        allSegments: ShotSegment[],
        project: Project | null,
        characters: Character[],
        workingContext: string
    ): CinematicAdvice[] {
        const advice: CinematicAdvice[] = [];

        // 1. Basic Prompt Analysis
        if (segment.prompt.length < 30) {
            advice.push({
                id: 'prompt_length',
                level: 'warning',
                text: "Description concise. Précisez l'éclairage (ex: 'Golden hour') ou la texture (ex: 'Grain 35mm') pour plus de réalisme.",
                actionLabel: 'Enrichir par IA'
            });
        }

        // 2. Character Awareness
        const detectedCharacters = characters.filter(c => 
            segment.prompt.toLowerCase().includes(c.name.toLowerCase())
        );
        
        if (detectedCharacters.length === 0 && characters.length > 0) {
            advice.push({
                id: 'character_check',
                level: 'info',
                text: `Conseil : Si un personnage est présent, utilisez son nom exact (${characters.map(c => c.name).join(', ')}) pour la cohérence visuelle.`,
            });
        } else if (detectedCharacters.length > 0) {
            advice.push({
                id: 'character_found',
                level: 'success',
                text: `Cohérence : Le personnage "${detectedCharacters[0].name}" a été identifié dans ce plan.`
            });
        }

        // 3. Technical Terms Check
        const techTerms = ['zoom', 'travelling', 'gros plan', 'wide shot', 'low angle', 'high angle', 'bokeh', 'anamorphic'];
        const hasTechTerm = techTerms.some(term => segment.prompt.toLowerCase().includes(term));
        if (!hasTechTerm) {
            advice.push({
                id: 'tech_terms',
                level: 'info',
                text: "Utilisez des termes techniques de caméra (ex: 'Gros plan', 'Low angle') pour mieux guider l'IA.",
            });
        }

        // 4. Motion/Camera Logic
        if (segment.motionIntensity > 8 && segment.cameraMovement === 'fixed') {
            advice.push({
                id: 'speed_mismatch',
                level: 'warning',
                text: "Intensité élevée mais caméra fixe. Envisagez un 'Zoom In' ou 'Pan' pour accompagner l'action.",
            });
        }

        // 5. Pacing Context
        const prevSegment = allSegments.find(s => s.startTime + s.duration === segment.startTime);
        if (prevSegment) {
            if (prevSegment.cameraMovement === segment.cameraMovement && segment.cameraMovement !== 'fixed') {
                advice.push({
                    id: 'pacing_repetition',
                    level: 'info',
                    text: "Mouvement identique au plan précédent. Variez pour garder le montage dynamique.",
                });
            }
        }

        // 6. Working Context (Style Recall)
        if (workingContext && workingContext.toLowerCase().includes('neon') && !segment.prompt.toLowerCase().includes('neon')) {
            advice.push({
                id: 'style_recall',
                level: 'warning',
                text: "Attention : Votre protocole projet mentionne un style 'Neon'. Pensez à l'inclure ici.",
            });
        }

        if (segment.prompt.toLowerCase().includes('explosion') && !segment.sfxPrompt) {
            advice.push({
                id: 'sfx_explosion',
                level: 'warning',
                text: "Action explosive détectée ! N'oubliez pas d'ajouter une description SFX pour l'ambiance sonore.",
            });
        }

        // 8. Visual Composition
        const compositionTerms = ['centered', 'thirds', 'symmetric', 'leading lines', 'asymmetric', 'depth of field', 'shallow focus', 'wide angle'];
        if (!compositionTerms.some(term => segment.prompt.toLowerCase().includes(term))) {
            advice.push({
                id: 'composition_tip',
                level: 'info',
                text: "Astuce : Précisez la composition (ex: 'Shallow focus', 'Centered') pour un rendu plus professionnel.",
            });
        }

        // 9. Lighting Harmony Context
        if (project?.metadata?.style === 'Noir' || (project?.metadata?.vibe as string)?.includes('dark')) {
            if (!segment.prompt.toLowerCase().includes('shadow') && !segment.prompt.toLowerCase().includes('contrast')) {
                advice.push({
                    id: 'noir_lighting',
                    level: 'warning',
                    text: "Cohérence Directoriale : Pour le style 'Noir', forcez le contraste (ex: 'Deep shadows', 'High contrast').",
                    actionLabel: 'Enrichir par IA'
                });
            }
        }

        // 10. Motion Consistency
        if (segment.duration < 1.5 && segment.motionIntensity < 3) {
            advice.push({
                id: 'static_short',
                level: 'info',
                text: "Plan très court et statique. Est-ce un 'jump cut' volontaire ?",
            });
        }

        // 11. Character Limits
        const charNames = characters.map(c => c.name.toLowerCase());
        const mentionedCount = charNames.filter(name => segment.prompt.toLowerCase().includes(name)).length;
        if (mentionedCount > 2) {
            advice.push({
                id: 'char_limit',
                level: 'warning',
                text: "Attention : Plus de 2 personnages détectés. La cohérence physique peut se dégrader lors de la génération.",
            });
        }

        // 12. Soundscape Complexity (Hollywood Foley)
        if (segment.prompt.toLowerCase().includes('water') || segment.prompt.toLowerCase().includes('rain') || segment.prompt.toLowerCase().includes('ocean')) {
            if (!segment.sfxPrompt?.toLowerCase().includes('ambience') && !segment.sfxPrompt?.toLowerCase().includes('subtle')) {
                advice.push({
                    id: 'soundscape_layering',
                    level: 'info',
                    text: "Conseil Niveau Pro : Vos visuels impliquent de l'eau. Ajoutez 'Subtle water lapping' ou 'Low frequency underwater hum' pour plus de profondeur.",
                });
            }
        }

        return advice;
    }

    /**
     * Analyzes a full sequence and provides structural advice.
     */
    public static getSequenceAdvice(
        segments: ShotSegment[],
        maxDuration: number
    ): CinematicAdvice[] {
        const advice: CinematicAdvice[] = [];
        const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);

        if (totalDuration > maxDuration) {
            advice.push({
                id: 'seq_duration',
                level: 'warning',
                text: `La séquence dépasse la limite de ${maxDuration}s. Certains plans seront tronqués.`,
            });
        }

        if (segments.length > 5 && totalDuration < 10) {
            advice.push({
                id: 'seq_fast_cuts',
                level: 'info',
                text: "Montage nerveux : Beaucoup de plans courts. Idéal pour l'action, risqué pour la narration.",
            });
        }

        // Logic for Mood Inconsistency
        const moods = segments.map(s => {
            const low = s.prompt.toLowerCase();
            if (low.includes('sad') || low.includes('melancholy')) return 'sad';
            if (low.includes('happy') || low.includes('joy')) return 'happy';
            if (low.includes('scary') || low.includes('dark')) return 'dark';
            return 'neutral';
        });

        const hasDark = moods.includes('dark');
        const hasHappy = moods.includes('happy');
        if (hasDark && hasHappy) {
            advice.push({
                id: 'mood_clash',
                level: 'warning',
                text: "Contraste émotionnel brutal détecté. Suggéré : Une 'Dissolve' lente pour adoucir la transition ou un 'Hard Cut' pour le choc.",
                actionLabel: 'Ajouter Transition'
            });
        }

        // Logical Flow: check camera movement continuity
        const rapidChanges = segments.some((s, i) => i > 0 && s.cameraMovement !== 'fixed' && segments[i-1].cameraMovement !== 'fixed' && s.cameraMovement !== segments[i-1].cameraMovement);
        if (rapidChanges && totalDuration < 8) {
             advice.push({
                id: 'motion_chaos',
                level: 'warning',
                text: "Chaos de mouvement : Trop de changements de direction caméra en peu de temps. Risque de mal de mer numérique.",
            });
        }

        return advice;
    }

    /**
     * Performs a global audit on project metadata.
     */
    public static getProjectAdvice(
        project: Project | null,
        characters: Character[]
    ): CinematicAdvice[] {
        const advice: CinematicAdvice[] = [];
        if (!project) return [];

        if (!project.metadata?.style) {
            advice.push({
                id: 'proj_style_missing',
                level: 'warning',
                text: "Style visuel non défini. L'IA risque d'être incohérente entre les plans.",
            });
        }

        if (characters.length > 0 && characters.every(c => !c.visual_identity?.generated_portrait)) {
            advice.push({
                id: 'proj_chars_blind',
                level: 'info',
                text: "Personnages sans portrait. Générez des Reference Sheets pour figer leur apparence.",
                actionLabel: 'Générer Sheets'
            });
        }

        const vibe = (project.metadata?.vibe as string) || '';
        if (vibe.length < 5) {
             advice.push({
                id: 'proj_vibe_weak',
                level: 'info',
                text: "Vibration thématique faible. Définissez une ambiance (ex: 'Techno-noir', 'Ethereal Pastels').",
            });
        }

        return advice;
    }

    /**
     * Analyzes the synergy between visual prompts and audio settings.
     */
    public static getAudioVisualAdvice(
        segments: ShotSegment[],
        tracks: any[] // Keeping any for now to avoid circular or missing imports from types, but properly handled
    ): CinematicAdvice[] {
        const advice: CinematicAdvice[] = [];
        
        const hasRain = segments.some(s => s.prompt.toLowerCase().includes('rain'));
        const hasRainSFX = segments.some(s => s.sfxPrompt?.toLowerCase().includes('rain'));
        
        if (hasRain && !hasRainSFX) {
            advice.push({
                id: 'rain_audio_missing',
                level: 'warning',
                text: "Espace sonore incomplet : Pluie détectée dans les visuels mais absente des SFX. Suggéré : 'Heavy rain ambience'.",
            });
        }

        const audioTrackCount = tracks.filter(t => t.type === 'audio').length;
        if (segments.length > 10 && audioTrackCount < 2) {
            advice.push({
                id: 'audio_layering',
                level: 'info',
                text: "Conseil de mixage : Votre séquence est longue. Envisagez une 2ème piste audio pour séparer l'ambiance des ponctuations SFX.",
            });
        }

        return advice;
    }
}
