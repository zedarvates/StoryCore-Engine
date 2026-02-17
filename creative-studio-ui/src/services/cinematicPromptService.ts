/**
 * Cinematic Prompt Service
 * Logic for enhancing simple prompts into professional cinematic descriptions.
 */

export const CINEMATIC_KEYWORDS = {
    lighting: [
        'volumetric lighting', 'rim lighting', 'chiaroscuro', 'soft bokeh',
        'golden hour', 'neon noir', 'cinematic fog', 'dramatic shadows'
    ],
    camera: [
        'anamorphic lens', '35mm film grain', 'shallow depth of field',
        'panavision', 'ultra-wide angle', 'low angle heroic shot'
    ],
    quality: [
        '8k resolution', 'masterpiece', 'highly detailed texture',
        'photorealistic', 'unreal engine 5 render style'
    ]
};

/**
 * Enhances a simple prompt by adding cinematic keywords.
 */
export function enhancePrompt(basicPrompt: string, mood: string = 'neutral'): string {
    if (!basicPrompt) return '';

    const randomLighting = CINEMATIC_KEYWORDS.lighting[Math.floor(Math.random() * CINEMATIC_KEYWORDS.lighting.length)];
    const randomCamera = CINEMATIC_KEYWORDS.camera[Math.floor(Math.random() * CINEMATIC_KEYWORDS.camera.length)];

    let enhanced = `${basicPrompt}. `;
    enhanced += `Cinematic style, ${randomLighting}, ${randomCamera}, 8k, highly detailed. `;

    // Add mood specific keywords
    if (mood === 'tense') enhanced += 'High contrast, sharp shadows, anxious atmosphere. ';
    if (mood === 'romantic') enhanced += 'Soft focus, warm tones, intimate lighting. ';
    if (mood === 'epic') enhanced += 'Grand scale, majestic composition, brilliant light. ';

    return enhanced;
}

/**
 * Returns a camera movement instruction for the prompt.
 */
export function getCameraPrompt(movement: string): string {
    return `Camera movement: ${movement}. `;
}
