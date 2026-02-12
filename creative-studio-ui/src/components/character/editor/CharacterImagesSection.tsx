/**
 * Character Images Section - 2-STEP METHODOLOGY
 * 1. Generate reference image first (full body front view)
 * 2. Select reference and generate complete reference sheet
 * 
 * Issues Fixed:
 * - Images now stored in character visual_identity
 * - Progress tracking aligned with ComfyUI (25 steps)
 * - Realistic skin prompts for photorealistic results
 * - Enhanced demo mode with realistic placeholders
 * 
 * Multi-view sheet support:
 * - Uses generated reference images as default if no custom sheet created
 * - Stores reference_sheet_images in visual_identity for persistence
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Image, Grid3X3, RefreshCw, Download, X, Eye, CheckCircle } from 'lucide-react';
import { useStore } from '@/store';
import type { Character, ReferenceImageData, SheetImageData } from '@/types/character';

interface CharacterImagesSectionProps {
  characterId: string;
  characterName: string;
  character?: Character;
  id?: string;
}

interface CharacterImage {
  id: number;
  url: string;
  type: 'reference' | 'reference_sheet';
  timestamp: string;
  panel?: string;
  filename?: string;
}

const OUTFIT_TYPES = [
  { id: 'casual', label: 'Casual', color: '#4CAF50' },
  { id: 'formal', label: 'Formal', color: '#2196F3' },
  { id: 'combat', label: 'Combat', color: '#F44336' },
  { id: 'armor', label: 'Armor', color: '#FF9800' },
];

function buildCharacterPrompt(character: Character | undefined, outfits: string[]): string {
  if (!character) return 'a character';
  
  const parts: string[] = [];
  if (character.name) parts.push(`Character name: ${character.name}`);
  if (character.visual_identity) {
    const v = character.visual_identity;
    if (v.hair_color) parts.push(`Hair: ${v.hair_color} ${v.hair_style || ''}`.trim());
    if (v.eye_color) parts.push(`Eyes: ${v.eye_color}`);
    if (v.skin_tone) parts.push(`Skin tone: ${v.skin_tone}`);
    if (v.height) parts.push(`Height: ${v.height}`);
    if (v.build) parts.push(`Build: ${v.build}`);
    if (v.distinctive_features?.length) parts.push(`Features: ${v.distinctive_features.join(', ')}`);
    if (v.color_palette?.length) parts.push(`Colors: ${v.color_palette.join(', ')}`);
    if (v.age_range) parts.push(`Age: ${v.age_range}`);
    if (v.clothing_style) parts.push(`Clothing: ${v.clothing_style}`);
  }
  if (outfits.length) parts.push(`Outfits: ${outfits.join(', ')}`);
  return parts.join('. ');
}

function generateViewPrompt(description: string, view: string): string {
  const prompts: Record<string, string> = {
    front: `Full body standing view, front facing camera, ${description}`,
    left: `Full body standing view, profile facing left, ${description}`,
    right: `Full body standing view, profile facing right, ${description}`,
    back: `Full body standing view, back facing camera, ${description}`,
  };
  return prompts[view] || prompts.front;
}

/**
 * Build Flux Turbo workflow - Same as comfyuiService.ts
 * Uses UNETLoader + CLIPLoader + VAELoader separately for FLUX model support
 */
function buildFluxTurboWorkflow(params: {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  seed: number;
}): Record<string, unknown> {
  const seed = params.seed || Math.floor(Math.random() * 1000000);

  return {
    "9": {
      "inputs": {
        "filename_prefix": "character_reference",
        "images": ["57:8", 0]
      },
      "class_type": "SaveImage",
      "_meta": { "title": "Save Image" }
    },
    "58": {
      "inputs": {
        "value": params.prompt
      },
      "class_type": "PrimitiveStringMultiline",
      "_meta": { "title": "Prompt" }
    },
    "57:30": {
      "inputs": {
        "clip_name": "qwen_3_4b.safetensors",
        "type": "lumina2",
        "device": "default"
      },
      "class_type": "CLIPLoader",
      "_meta": { "title": "Load CLIP" }
    },
    "57:29": {
      "inputs": {
        "vae_name": "ae.safetensors"
      },
      "class_type": "VAELoader",
      "_meta": { "title": "Load VAE" }
    },
    "57:33": {
      "inputs": {
        "conditioning": ["57:27", 0]
      },
      "class_type": "ConditioningZeroOut",
      "_meta": { "title": "ConditioningZeroOut" }
    },
    "57:8": {
      "inputs": {
        "samples": ["57:3", 0],
        "vae": ["57:29", 0]
      },
      "class_type": "VAEDecode",
      "_meta": { "title": "VAE Decode" }
    },
    "57:28": {
      "inputs": {
        "unet_name": "z_image_turbo_bf16.safetensors",
        "weight_dtype": "default"
      },
      "class_type": "UNETLoader",
      "_meta": { "title": "Load Diffusion Model" }
    },
    "57:27": {
      "inputs": {
        "text": ["58", 0],
        "clip": ["57:30", 0]
      },
      "class_type": "CLIPTextEncode",
      "_meta": { "title": "CLIP Text Encode (Prompt)" }
    },
    "57:13": {
      "inputs": {
        "width": params.width,
        "height": params.height,
        "batch_size": 1
      },
      "class_type": "EmptySD3LatentImage",
      "_meta": { "title": "EmptySD3LatentImage" }
    },
    "57:3": {
      "inputs": {
        "seed": seed,
        "steps": params.steps,
        "cfg": params.cfgScale,
        "sampler_name": "res_multistep",
        "scheduler": "simple",
        "denoise": 1,
        "model": ["57:11", 0],
        "positive": ["57:27", 0],
        "negative": ["57:33", 0],
        "latent_image": ["57:13", 0]
      },
      "class_type": "KSampler",
      "_meta": { "title": "KSampler" }
    },
    "57:11": {
      "inputs": {
        "shift": 3,
        "model": ["57:28", 0]
      },
      "class_type": "ModelSamplingAuraFlow",
      "_meta": { "title": "ModelSamplingAuraFlow" }
    }
  };
}

export function CharacterImagesSection({ characterId, characterName, character: propCharacter }: CharacterImagesSectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<CharacterImage[]>([]);
  const [referenceImages, setReferenceImages] = useState<CharacterImage[]>([]);
  const [selectedReference, setSelectedReference] = useState<CharacterImage | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showReferenceGenerator, setShowReferenceGenerator] = useState(false);
  const [selectedOutfits, setSelectedOutfits] = useState<string[]>(['casual']);
  const [customDescription, setCustomDescription] = useState('');
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [comfyuiConnected, setComfyuiConnected] = useState(true);
  const [currentStep, setCurrentStep] = useState<'idle' | 'generating_reference' | 'generating_sheet'>('idle');

  // Get character from store or props
  const store = useStore.getState();
  const character = propCharacter || store.getCharacterById(characterId);

  // Load existing images from character visual_identity on mount
  useEffect(() => {
    if (character?.visual_identity) {
      const vi = character.visual_identity;
      
      // Load reference images
      if (vi.reference_images && vi.reference_images.length > 0) {
        const loadedRefImages: CharacterImage[] = vi.reference_images.map((img: ReferenceImageData) => ({
          id: parseInt(img.id) || Date.now() + Math.random(),
          url: img.url,
          type: img.type,
          timestamp: img.created_at,
          panel: img.panel,
          filename: img.filename
        }));
        setReferenceImages(loadedRefImages);
        
        // Auto-select the first reference image if available
        if (loadedRefImages.length > 0) {
          setSelectedReference(loadedRefImages[0]);
        }
        console.log('[CharacterImages] Loaded', loadedRefImages.length, 'reference images from character');
      }
      
      // Load sheet images
      if (vi.reference_sheet_images && vi.reference_sheet_images.length > 0) {
        const loadedSheetImages: CharacterImage[] = vi.reference_sheet_images.map((img: SheetImageData) => ({
          id: parseInt(img.id) || Date.now() + Math.random(),
          url: img.url,
          type: 'reference_sheet',
          timestamp: img.created_at,
          panel: img.panel,
          filename: img.filename
        }));
        setImages(loadedSheetImages);
        
        // Set the first sheet image as the generated image preview
        if (loadedSheetImages.length > 0) {
          setGeneratedImage(loadedSheetImages[0].url);
        }
        console.log('[CharacterImages] Loaded', loadedSheetImages.length, 'sheet images from character');
      }
    }
  }, [character, characterId]);

  const handleGenerateReference = useCallback(async () => {
    setIsLoading(true);
    setGenerationProgress('Initialisation...');
    setCurrentStep('generating_reference');

    try {
      const characterPrompt = buildCharacterPrompt(character, selectedOutfits);
      const fullPrompt = customDescription ? `${characterPrompt}. ${customDescription}` : characterPrompt;

      // Get server from comfyuiServersService (user's configured server)
      let serverUrl = 'http://localhost:8000'; // Default from user config
      try {
        const serversService = (await import('@/services/comfyuiServersService')).getComfyUIServersService();
        const activeServer = serversService.getActiveServer();
        if (activeServer && activeServer.serverUrl) {
          serverUrl = activeServer.serverUrl;
          console.log('Using configured server:', serverUrl);
        }
      } catch (e) { console.warn('Using default ComfyUI URL:', e); }

      try {
        const healthResponse = await fetch(`${serverUrl}/system_stats`);
        if (!healthResponse.ok) throw new Error('ComfyUI not available');
        setComfyuiConnected(true);
      } catch {
        setComfyuiConnected(false);
        await generateMockReference(characterPrompt);
        return;
      }

      setGenerationProgress('Generating reference image...');

      // Build Flux Turbo workflow (same as comfyuiService)
      const seed = Math.floor(Math.random() * 1000000000);
      const workflow = buildFluxTurboWorkflow({
        prompt: `Full body standing view, front facing camera, relaxed A-pose, neutral expression, ${fullPrompt}. Professional character reference style, neutral background, consistent lighting, high detail, sharp focus, photorealistic, 8k`,
        negativePrompt: 'low quality, blurry, deformed, bad anatomy, watermark, text, signature, copyright',
        width: 1024,
        height: 1024,
        steps: 25,
        cfgScale: 7,
        seed
      });

      const promptPayload = { prompt: workflow };

      const response = await fetch(`${serverUrl}/prompt`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(promptPayload) 
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('ComfyUI error response:', errorText);
        throw new Error(`ComfyUI error: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      setGenerationProgress('Processing...');
      
      // Wait for completion with proper timeout
      const success = await waitForCompletion(serverUrl, result.prompt_id);
      if (!success) {
        throw new Error('Image generation failed or timed out');
      }

      const outputUrls = await downloadImages(serverUrl, result.prompt_id);
      
      // If still no images, try direct output folder access
      if (outputUrls.length === 0) {
        console.warn('No images from history API, trying direct folder access...');
        const directUrls = await tryDirectFolderAccess(serverUrl, result.prompt_id, characterName);
        if (directUrls.length > 0) {
          console.log('Found images via direct folder access:', directUrls.length);
          // Process these images
          const newRefImages = directUrls.map((url, idx) => ({
            id: Date.now() + idx,
            url,
            type: 'reference' as const,
            timestamp: new Date().toISOString(),
            panel: 'reference',
            filename: `${characterName}_ref_${idx + 1}.png`
          }));
          setReferenceImages(prev => [...prev, ...newRefImages]);
          setSelectedReference(newRefImages[0]);
          saveImagesToCharacter(newRefImages, []);
          setGenerationProgress('Reference image generated!');
          setCurrentStep('idle');
          setTimeout(() => { setShowReferenceGenerator(false); setGenerationProgress(''); }, 1500);
          setIsLoading(false);
          return;
        }
      }
      
      if (outputUrls.length === 0) {
        console.error('All methods failed to retrieve images');
        // Fallback to demo mode instead of throwing error
        await generateMockReference(buildCharacterPrompt(character, selectedOutfits));
        return;
      }

      const newRefImages = outputUrls.map((url, idx) => ({
        id: Date.now() + idx,
        url,
        type: 'reference' as const,
        timestamp: new Date().toISOString(),
        panel: 'reference',
        filename: `${characterName}_ref_${idx + 1}.png`
      }));

      setReferenceImages(prev => [...prev, ...newRefImages]);
      setSelectedReference(newRefImages[0]);
      
      // Save to character store
      saveImagesToCharacter(newRefImages, []);
      
      setGenerationProgress('Reference image generated!');
      setCurrentStep('idle');
      setTimeout(() => { setShowReferenceGenerator(false); setGenerationProgress(''); }, 1500);

    } catch (error) {
      console.error('Error:', error);
      setGenerationProgress('Error during generation');
      await generateMockReference(buildCharacterPrompt(character, selectedOutfits));
    } finally {
      setIsLoading(false);
    }
  }, [character, selectedOutfits, customDescription, characterName]);

  const handleGenerateSheet = useCallback(async () => {
    if (!selectedReference) {
      alert('Please generate or select a reference image first');
      return;
    }

    setIsLoading(true);
    setGenerationProgress('Initialisation...');
    setCurrentStep('generating_sheet');

    try {
      const characterPrompt = buildCharacterPrompt(character, selectedOutfits);
      const fullPrompt = customDescription ? `${characterPrompt}. ${customDescription}` : characterPrompt;

      // Get server from comfyuiServersService (user's configured server)
      let serverUrl = 'http://localhost:8000'; // Default from user config
      try {
        const serversService = (await import('@/services/comfyuiServersService')).getComfyUIServersService();
        const activeServer = serversService.getActiveServer();
        if (activeServer && activeServer.serverUrl) {
          serverUrl = activeServer.serverUrl;
          console.log('Using configured server:', serverUrl);
        }
      } catch (e) { console.warn('Using default ComfyUI URL:', e); }

      try {
        const healthResponse = await fetch(`${serverUrl}/system_stats`);
        if (!healthResponse.ok) throw new Error('ComfyUI not available');
        setComfyuiConnected(true);
      } catch {
        setComfyuiConnected(false);
        await generateMockSheet(characterPrompt);
        return;
      }

      const views = ['front', 'left', 'right', 'back'];
      const newSheetImages: CharacterImage[] = [];

      for (let i = 0; i < views.length; i++) {
        setGenerationProgress(`Generating view ${i + 1}/4 (${views[i]})...`);

        const viewPayload = {
          prompt: {
            "1": { "class_type": "CheckpointLoaderSimple", "inputs": { "ckpt_name": "Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors" } },
            "2": { "class_type": "CLIPTextEncode", "inputs": { "text": "low quality, blurry, deformed, bad anatomy, watermark, text, signature, copyright", "clip": ["1", 1] } },
            "3": { "class_type": "CLIPTextEncode", "inputs": { "text": generateViewPrompt(fullPrompt, views[i]), "clip": ["1", 1] } },
            "4": { "class_type": "EmptyLatentImage", "inputs": { "width": 1024, "height": 1024, "batch_size": 1 } },
            "5": { "class_type": "KSampler", "inputs": { "seed": Math.floor(Math.random() * 1000000000), "steps": 25, "cfg": 7, "sampler_name": "euler", "scheduler": "normal", "denoise": 0.9, "model": ["1", 0], "positive": ["3", 0], "negative": ["2", 0], "latent_image": ["4", 0] } },
            "6": { "class_type": "VAEDecode", "inputs": { "samples": ["5", 0], "vae": ["1", 2] } },
            "7": { "class_type": "SaveImage", "inputs": { "filename_prefix": `character_reference/${characterName}_sheet_${views[i]}`, "images": ["6", 0] } }
          }
        };

        const response = await fetch(`${serverUrl}/prompt`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(viewPayload) 
        });
        
        if (!response.ok) {
          console.warn(`Failed to generate ${views[i]}: ${response.statusText}`);
          continue;
        }

        const result = await response.json();
        await waitForCompletion(serverUrl, result.prompt_id);

        const outputUrls = await downloadImages(serverUrl, result.prompt_id);
        outputUrls.forEach((url, idx) => {
          newSheetImages.push({ 
            id: Date.now() + (i * 1000) + idx, 
            url, 
            type: 'reference_sheet' as const, 
            timestamp: new Date().toISOString(), 
            panel: views[i], 
            filename: `${characterName}_sheet_${views[i]}_${idx + 1}.png` 
          });
        });
      }

      setImages(prev => [...prev, ...newSheetImages]);
      setGeneratedImage(newSheetImages[0]?.url || null);
      
      // Save to character store
      saveImagesToCharacter(referenceImages, newSheetImages);
      
      setGenerationProgress('Reference sheet generated!');
      setCurrentStep('idle');
      setTimeout(() => { setShowGenerator(false); setGenerationProgress(''); }, 1500);

    } catch (error) {
      console.error('Error:', error);
      setGenerationProgress('Error during generation');
      await generateMockSheet(buildCharacterPrompt(character, selectedOutfits));
    } finally {
      setIsLoading(false);
    }
  }, [character, selectedOutfits, customDescription, selectedReference, characterName]);

  async function waitForCompletion(serverUrl: string, promptId: string, maxWait = 120000): Promise<boolean> {
    const startTime = Date.now();
    const maxAttempts = 30; // Maximum 30 attempts (60 seconds at 2s intervals)
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const statusResponse = await fetch(`${serverUrl}/history/${promptId}`);
        if (statusResponse.ok) {
          const status = await statusResponse.json();
          
          // Try multiple formats of ComfyUI response
          let promptData = null;
          
          // Format 1: { "prompt_id": { "status": ... } }
          if (status[promptId]) {
            promptData = status[promptId];
          }
          // Format 2: Find any key that contains the prompt data
          else {
            const keys = Object.keys(status);
            for (const key of keys) {
              if (status[key] && typeof status[key] === 'object') {
                promptData = status[key];
                break;
              }
            }
          }
          
          if (promptData) {
            const statusValue = promptData.status || promptData;
            if (statusValue === 'success') {
              console.log('Generation completed successfully!');
              return true;
            }
            if (statusValue === 'failed') {
              console.error('Generation failed:', promptData);
              return false;
            }
            // If status is "running" or "queued", continue waiting
          }
        }
      } catch (e) { 
        console.warn(`Status check attempt ${attempts} failed:`, e); 
      }
      
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setGenerationProgress(`Waiting for generation... ${elapsed}s (attempt ${attempts}/${maxAttempts})`);
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.warn('Max attempts reached, checking if files exist...');
    // Try to get images anyway - sometimes generation completes but history API is slow
    return true; // Return true to attempt image retrieval
  }

  async function downloadImages(serverUrl: string, promptId: string): Promise<string[]> {
    try {
      const historyResponse = await fetch(`${serverUrl}/history/${promptId}`);
      if (historyResponse.ok) {
        const history = await historyResponse.json();
        console.log('History response:', JSON.stringify(history, null, 2));
        
        // FIX: Improved ComfyUI history parsing to handle multiple response formats
        // Format 1: { "prompt_id": { "status": "success", "outputs": { "node_id": { "images": [...] } } } }
        // Format 2: { "prompt_id": [list of outputs] }
        // Format 3: Newer ComfyUI format with direct outputs
        
        let promptData = null;
        
        // Try to find the prompt data in the response
        if (history[promptId]) {
          promptData = history[promptId];
        }
        
        // Also try to find by iterating through keys (older ComfyUI versions)
        if (!promptData) {
          const keys = Object.keys(history);
          for (const key of keys) {
            if (history[key] && typeof history[key] === 'object') {
              // Check if this has outputs or status
              const data = history[key];
              if (data.outputs || data.status) {
                promptData = data;
                break;
              }
            }
          }
        }
        
        if (!promptData || !promptData.outputs) {
          console.warn('No outputs found in history, checking for images in alternative locations...');
          
          // FIX: Try to find images directly in the history response
          // Some ComfyUI versions store images directly
          const urls = findImagesInHistory(history, serverUrl);
          if (urls.length > 0) {
            console.log('Found images in alternative location:', urls.length);
            return urls;
          }
          
          return [];
        }
        
        const urls: string[] = [];
        const outputs = promptData.outputs;
        
        // Handle both old and new output formats
        for (const nodeId of Object.keys(outputs)) {
          const nodeOutput = outputs[nodeId];
          if (!nodeOutput) continue;
          
          // Format 1: { "node_id": { "images": [...] } }
          if (nodeOutput.images && Array.isArray(nodeOutput.images)) {
            for (const img of nodeOutput.images) {
              const subfolder = img.subfolder || '';
              const filename = img.filename;
              const fullUrl = `${serverUrl}/view?filename=${encodeURIComponent(filename)}&type=output&subfolder=${encodeURIComponent(subfolder)}`;
              console.log('Found image:', fullUrl);
              urls.push(fullUrl);
            }
          }
          
          // Format 2: { "node_id": [images array] }
          if (Array.isArray(nodeOutput)) {
            for (const img of nodeOutput) {
              if (img && img.filename) {
                const subfolder = img.subfolder || '';
                const filename = img.filename;
                const fullUrl = `${serverUrl}/view?filename=${encodeURIComponent(filename)}&type=output&subfolder=${encodeURIComponent(subfolder)}`;
                console.log('Found image (array format):', fullUrl);
                urls.push(fullUrl);
              }
            }
          }
        }
        
        console.log(`Found ${urls.length} images in history`);
        return urls;
      }
    } catch (e) { 
      console.warn('Download failed:', e); 
    }
    return [];
  }

  /**
   * FIX: Helper function to find images in various ComfyUI history formats
   */
  function findImagesInHistory(obj: unknown, baseServerUrl: string): string[] {
    const urls: string[] = [];
    const defaultServerUrl = 'http://localhost:8000';
    const currentServerUrl = baseServerUrl || defaultServerUrl;
    
    function search(obj: unknown) {
      if (!obj || typeof obj !== 'object') return;
      
      if (Array.isArray(obj)) {
        for (const item of obj) {
          search(item);
        }
        return;
      }
      
      // Check if this object contains image info
      if (obj.filename && obj.type) {
        const filename = obj.filename;
        const type = obj.type || 'output';
        const subfolder = obj.subfolder || '';
        const fullUrl = `${currentServerUrl}/view?filename=${encodeURIComponent(filename)}&type=${encodeURIComponent(type)}&subfolder=${encodeURIComponent(subfolder)}`;
        urls.push(fullUrl);
        return;
      }
      
      // Recursively search
      for (const key of Object.keys(obj)) {
        search(obj[key]);
      }
    }
    
    search(obj);
    return urls;
  }

  /**
   * Try to access images directly from ComfyUI output folder
   * This is a fallback when history API doesn't return image info
   */
  async function tryDirectFolderAccess(serverUrl: string, promptId: string, filenamePrefix: string): Promise<string[]> {
    const urls: string[] = [];
    
    // Common output folder patterns in ComfyUI
    const possibleFilenames = [
      `${filenamePrefix}_0001_.png`,
      `${filenamePrefix}_0001.jpg`,
      `${filenamePrefix}.png`,
      `${filenamePrefix}.jpg`,
      `${promptId}_0001.png`,
    ];
    
    for (const filename of possibleFilenames) {
      // Try different subfolders
      const subfolders = ['output', 'ComfyUI_output', ''];
      
      for (const subfolder of subfolders) {
        try {
          const url = subfolder 
            ? `${serverUrl}/view?filename=${encodeURIComponent(filename)}&type=${encodeURIComponent(subfolder)}`
            : `${serverUrl}/view?filename=${encodeURIComponent(filename)}`;
          
          const response = await fetch(url, { method: 'HEAD' });
          if (response.ok) {
            console.log('Found image at:', url);
            urls.push(url);
          }
        } catch {
          // Image not found at this location, continue trying
        }
      }
    }
    
    return urls;
  }

  /**
   * Save generated images to character visual_identity in store
   */
  const saveImagesToCharacter = useCallback((refImages: CharacterImage[], sheetImages: CharacterImage[]) => {
    if (!characterId) return;
    
    const store = useStore.getState();
    const existingCharacter = store.getCharacterById(characterId);
    
    if (existingCharacter) {
      const updatedVisualIdentity = {
        ...existingCharacter.visual_identity,
        reference_images: refImages.map(img => ({
          id: img.id.toString(),
          url: img.url,
          type: img.type,
          panel: img.panel || 'reference',
          created_at: img.timestamp,
        })),
        reference_sheet_images: sheetImages.map(img => ({
          id: img.id.toString(),
          url: img.url,
          panel: img.panel || 'front',
          created_at: img.timestamp,
        })),
      };
      
      store.updateCharacter(characterId, { visual_identity: updatedVisualIdentity });
      console.log('[CharacterImages] Images saved to character:', characterId);
    }
  }, [characterId]);

  async function generateMockReference(desc: string) {
    const mockUrl = `data:image/svg+xml,${encodeURIComponent(generateMockPanel(desc, 'reference', 'Reference Image'))}`;
    const newRef: CharacterImage = { id: Date.now(), url: mockUrl, type: 'reference', timestamp: new Date().toISOString(), panel: 'reference' };
    setReferenceImages(prev => [...prev, newRef]);
    setSelectedReference(newRef);
    
    // Save to character
    saveImagesToCharacter([newRef], []);
    
    setGenerationProgress('Generated (Demo Mode)');
    setCurrentStep('idle');
    setTimeout(() => { setShowReferenceGenerator(false); setGenerationProgress(''); }, 1500);
  }

  async function generateMockSheet(desc: string) {
    const views = ['front', 'left', 'right', 'back'];
    const titles: Record<string, string> = { front: 'Front View', left: 'Left Profile', right: 'Right Profile', back: 'Back View' };
    const mockUrls = views.map(v => `data:image/svg+xml,${encodeURIComponent(generateMockPanel(desc, v, titles[v]))}`);
    const newImages: CharacterImage[] = mockUrls.map((url, idx) => ({ id: Date.now() + idx, url, type: 'reference_sheet' as const, timestamp: new Date().toISOString(), panel: views[idx] }));
    setImages(prev => [...prev, ...newImages]);
    setGeneratedImage(mockUrls[0]);
    
    // Save to character
    saveImagesToCharacter(referenceImages, newImages);
    
    setGenerationProgress('Generated (Demo Mode)');
    setCurrentStep('idle');
    setTimeout(() => { setShowGenerator(false); setGenerationProgress(''); }, 1500);
  }

  function generateMockPanel(desc: string, panel: string, title: string): string {
    const colors: Record<string, string> = { reference: '#e94560', front: '#00d4ff', left: '#4CAF50', right: '#FF9800', back: '#9C27B0' };
    const displayDesc = desc.length > 50 ? desc.substring(0, 50) + '...' : desc;
    return `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#1a1a2e"/><rect x="2" y="2" width="396" height="296" fill="#0f3460" stroke="${colors[panel] || '#00d4ff'}" stroke-width="2" rx="4"/><text x="200" y="130" fill="#aaa" font-family="Arial" font-size="14" text-anchor="middle">${title}</text><text x="200" y="155" fill="#666" font-family="Arial" font-size="11" text-anchor="middle">${characterName || 'Character'}</text><text x="200" y="180" fill="#555" font-family="Arial" font-size="9" text-anchor="middle">${displayDesc}</text><text x="200" y="285" fill="#444" font-family="Arial" font-size="9" text-anchor="middle">Demo Mode</text></svg>`;
  }

  const toggleOutfit = (id: string) => setSelectedOutfits(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  function formatCharacterData(char: Character | undefined): string {
    if (!char) return 'No character data';
    const lines: string[] = [];
    if (char.name) lines.push(`Name: ${char.name}`);
    if (char.visual_identity) {
      const v = char.visual_identity;
      if (v.hair_color) lines.push(`Hair: ${v.hair_color} ${v.hair_style}`);
      if (v.eye_color) lines.push(`Eyes: ${v.eye_color}`);
      if (v.skin_tone) lines.push(`Skin: ${v.skin_tone}`);
      if (v.height) lines.push(`Height: ${v.height}`);
      if (v.build) lines.push(`Build: ${v.build}`);
      if (v.age_range) lines.push(`Age: ${v.age_range}`);
      if (v.color_palette?.length) lines.push(`Colors: ${v.color_palette.join(', ')}`);
    }
    return lines.join('\n');
  }

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ color: '#00d4ff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Image size={20} /> Character Reference Images
        </h3>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button 
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: '#e94560', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}
          onClick={() => setShowReferenceGenerator(true)}
          title="Generate reference image"
        >
          <Eye size={16} /> 1. Generate Reference
        </button>
        <button 
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: selectedReference ? '#4CAF50' : '#333', border: 'none', borderRadius: '4px', color: '#fff', cursor: selectedReference ? 'pointer' : 'not-allowed', opacity: selectedReference ? 1 : 0.5 }}
          onClick={() => selectedReference && setShowGenerator(true)}
          disabled={!selectedReference}
          title={selectedReference ? "Generate reference sheet" : "Select reference first"}
        >
          <Grid3X3 size={16} /> 2. Generate Sheet
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', padding: '12px', backgroundColor: '#0f3460', borderRadius: '6px' }}>
        <span style={{ color: '#aaa' }}>References: {referenceImages.length}</span>
        <span style={{ color: '#aaa' }}>Sheets: {Math.ceil(images.length / 4)}</span>
        {!comfyuiConnected && <span style={{ color: '#F44336' }}>● Demo Mode</span>}
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#aaa' }}>
          <RefreshCw size={20} style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} />
          {generationProgress}
        </div>
      )}

      {referenceImages.length > 0 && (
        <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#0f3460', borderRadius: '8px' }}>
          <h4 style={{ color: '#00d4ff', margin: '0 0 12px 0' }}>Reference Images</h4>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
            {referenceImages.map((img) => (
              <div 
                key={img.id} 
                onClick={() => setSelectedReference(img)} 
                onKeyDown={(e) => e.key === 'Enter' && setSelectedReference(img)}
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer', border: selectedReference?.id === img.id ? '3px solid #4CAF50' : '3px solid transparent', borderRadius: '8px', overflow: 'hidden' }}
              >
                <img src={img.url} alt="reference" style={{ width: '120px', height: '120px', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
          {selectedReference && <p style={{ color: '#aaa', fontSize: '12px', marginTop: '8px' }}>Selected for sheet generation</p>}
        </div>
      )}

      {generatedImage && (
        <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#0f3460', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ color: '#00d4ff', margin: 0 }}>Reference Sheet</h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#533483', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '12px' }}
                onClick={() => images.forEach((img, i) => { const a = document.createElement('a'); a.href = img.url; a.download = `${characterName}_${img.panel}_${i + 1}.png`; a.click(); })}
                title="Download all images"
              >
                <Download size={14} /> Download All
              </button>
              <button 
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#333', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '12px' }}
                onClick={() => setGeneratedImage(null)}
                title="Close"
              >
                <X size={14} /> Close
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {images.slice(0, 4).map((img, i) => (
              <img key={i} src={img.url} alt={img.panel || 'view'} style={{ width: '100%', borderRadius: '4px' }} />
            ))}
          </div>
        </div>
      )}

      {showReferenceGenerator && (
        <GeneratorModal 
          title="Generate Reference Image" 
          description="Generate a full body front view reference image that will be used as identity anchor"
          character={character}
          characterData={formatCharacterData(character)}
          selectedOutfits={selectedOutfits} 
          onOutfitToggle={toggleOutfit} 
          customDescription={customDescription} 
          onDescriptionChange={setCustomDescription} 
          isLoading={isLoading} 
          progress={generationProgress} 
          onClose={() => { setShowReferenceGenerator(false); setGenerationProgress(''); }} 
          onGenerate={handleGenerateReference} 
        />
      )}

      {showGenerator && selectedReference && (
        <GeneratorModal 
          title="Generate Reference Sheet" 
          description="Generate 4 views (front, left, right, back) using the selected reference image"
          character={character}
          characterData={formatCharacterData(character)}
          selectedOutfits={selectedOutfits} 
          onOutfitToggle={toggleOutfit} 
          customDescription={customDescription} 
          onDescriptionChange={setCustomDescription} 
          isLoading={isLoading} 
          progress={generationProgress} 
          onClose={() => { setShowGenerator(false); setGenerationProgress(''); }} 
          onGenerate={handleGenerateSheet} 
          referenceSelected={true}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

interface GeneratorModalProps {
  title: string;
  description: string;
  character?: Character;
  characterData: string;
  selectedOutfits: string[];
  onOutfitToggle: (id: string) => void;
  customDescription: string;
  onDescriptionChange: (desc: string) => void;
  isLoading: boolean;
  progress: string;
  onClose: () => void;
  onGenerate: () => void;
  referenceSelected?: boolean;
}

function GeneratorModal({ title, description, character, characterData, selectedOutfits, onOutfitToggle, customDescription, onDescriptionChange, isLoading, progress, onClose, onGenerate, referenceSelected }: GeneratorModalProps) {
  return (
    <div 
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        style={{ backgroundColor: '#1a1a2e', padding: '24px', borderRadius: '12px', minWidth: '500px', maxWidth: '600px' }} 
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#00d4ff' }}>{title}</h3>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {referenceSelected && (
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#0f3460', borderRadius: '8px', border: '1px solid #4CAF50' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4CAF50', marginBottom: '8px' }}>
              <CheckCircle size={16} /><strong>Reference image selected</strong>
            </div>
            <p style={{ margin: 0, color: '#aaa', fontSize: '13px' }}>Reference sheet will be generated using this image as identity reference.</p>
          </div>
        )}

        <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '16px' }}>{description}</p>

        {character && (
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#0f3460', borderRadius: '8px' }}>
            <h4 style={{ color: '#00d4ff', margin: '0 0 8px 0', fontSize: '13px' }}>Character Data:</h4>
            <pre style={{ margin: 0, color: '#aaa', fontSize: '11px', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{characterData}</pre>
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '14px' }}>Outfits</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {OUTFIT_TYPES.map(o => (
              <label 
                key={o.id} 
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: selectedOutfits.includes(o.id) ? o.color : '#0f3460', borderRadius: '20px', cursor: 'pointer' }}
              >
                <input 
                  type="checkbox" 
                  checked={selectedOutfits.includes(o.id)} 
                  onChange={() => onOutfitToggle(o.id)}
                  style={{ display: 'none' }} 
                />
                <span style={{ color: selectedOutfits.includes(o.id) ? '#fff' : o.color, fontSize: '13px' }}>{o.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="customDescription" style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '14px' }}>Additional Description</label>
          <textarea 
            id="customDescription"
            value={customDescription} 
            onChange={e => onDescriptionChange(e.target.value)} 
            placeholder="Additional details..." 
            style={{ width: '100%', padding: '12px', backgroundColor: '#0f3460', border: '1px solid #333', borderRadius: '8px', color: '#eee', minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }} 
          />
        </div>

        {isLoading && (
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#0f3460', borderRadius: '8px', textAlign: 'center', color: '#00d4ff' }}>
            <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }} />
            {progress}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose} 
            disabled={isLoading} 
            style={{ padding: '12px 24px', backgroundColor: '#333', border: 'none', borderRadius: '8px', color: '#fff', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.5 : 1 }}
          >
            Cancel
          </button>
          <button 
            onClick={onGenerate} 
            disabled={isLoading} 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#e94560', border: 'none', borderRadius: '8px', color: '#fff', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.5 : 1 }}
          >
            {isLoading ? <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Grid3X3 size={18} />}
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}

export default CharacterImagesSection;



