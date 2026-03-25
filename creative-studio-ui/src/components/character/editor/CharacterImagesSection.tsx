import React, { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Grid3X3, Eye, Box, Loader2, Download, Trash2 } from 'lucide-react';
import { assetCreatorService } from '@/services/assetCreatorService';
import { notificationService } from '@/services/NotificationService';
import { useAppStore } from '@/stores/useAppStore'; // Corrected store import
import { downloadAndSaveImage } from '@/services/imageStorageService';
import type { Character, ReferenceImageData, SheetImageData } from '@/types/character';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import './CharacterImagesSection.css';

interface CharacterImagesSectionProps {
  characterId: string;
  characterName: string;
  character?: Character;
  id?: string;
  onImagesUpdate?: (updates: { 
    reference_images: ReferenceImageData[]; 
    reference_sheet_images: SheetImageData[];
  }) => void;
}

interface CharacterImage {
  id: number;
  url: string;
  type: 'reference' | 'reference_sheet';
  timestamp: string; // ISO String
  panel?: string;
  filename?: string;
}

/**
 * Builds a detailed prompt for character generation
 */
function buildCharacterPrompt(character: Character | undefined, outfits: string[]): string {
  if (!character) return 'a high quality character portrait';

  const parts: string[] = [];
  if (character.name) parts.push(`Character name: ${character.name}`);
  
  if (character.visual_identity) {
    const v = character.visual_identity;
    if (v.hair_color) parts.push(`Hair: ${v.hair_color} ${v.hair_style || ''}`.trim());
    if (v.eye_color) parts.push(`Eyes: ${v.eye_color}`);
    if (v.ethnicity) parts.push(`Ethnicity/Origin: ${v.ethnicity}`);
    if (v.skin_tone) parts.push(`Skin tone: ${v.skin_tone}`);
    if (v.height) parts.push(`Height: ${v.height}`);
    if (v.build) parts.push(`Build: ${v.build}`);
    if (v.distinctive_features?.length) parts.push(`Features: ${v.distinctive_features.join(', ')}`);
    if (v.color_palette?.length) parts.push(`Colors: ${v.color_palette.join(', ')}`);
    if (v.age_range) parts.push(`Age: ${v.age_range}`);
    if (v.clothing_style) parts.push(`Clothing: ${v.clothing_style}`);
  }
  
  if (outfits.length) parts.push(`Outfits: ${outfits.join(', ')}`);
  
  // Add quality and style keywords
  parts.push("photorealistic, high detailed skin textures, award winning cinematography, 8k resolution, realistic lighting, sharp focus, masterpiece, NOT a silhouette, detailed facial features");
  
  return parts.join('. ');
}

/**
 * Workflow builder for Flux Turbo
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
        "filename_prefix": params.prompt.includes('front') ? `ref_${params.seed}` : `sheet_${params.seed}`,
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
      "inputs": { "clip_name": "qwen_3_4b.safetensors", "type": "lumina2", "device": "default" },
      "class_type": "CLIPLoader",
      "_meta": { "title": "Load CLIP" }
    },
    "57:29": {
      "inputs": { "vae_name": "ae.safetensors" },
      "class_type": "VAELoader",
      "_meta": { "title": "Load VAE" }
    },
    "57:33": {
      "inputs": { "conditioning": ["57:27", 0] },
      "class_type": "ConditioningZeroOut",
      "_meta": { "title": "ConditioningZeroOut" }
    },
    "57:8": {
      "inputs": { "samples": ["57:3", 0], "vae": ["57:29", 0] },
      "class_type": "VAEDecode",
      "_meta": { "title": "VAE Decode" }
    },
    "57:28": {
      "inputs": { "unet_name": "z_image_turbo_bf16.safetensors", "weight_dtype": "default" },
      "class_type": "UNETLoader",
      "_meta": { "title": "Load Diffusion Model" }
    },
    "57:27": {
      "inputs": { "text": ["58", 0], "clip": ["57:30", 0] },
      "class_type": "CLIPTextEncode",
      "_meta": { "title": "CLIP Text Encode (Prompt)" }
    },
    "57:13": {
      "inputs": { "width": params.width, "height": params.height, "batch_size": 1 },
      "class_type": "EmptySD3LatentImage",
      "_meta": { "title": "EmptySD3LatentImage" }
    },
    "57:3": {
      "inputs": {
        "seed": seed, "steps": params.steps, "cfg": params.cfgScale,
        "sampler_name": "res_multistep", "scheduler": "simple", "denoise": 1,
        "model": ["57:11", 0], "positive": ["57:27", 0], "negative": ["57:33", 0], "latent_image": ["57:13", 0]
      },
      "class_type": "KSampler",
      "_meta": { "title": "KSampler" }
    },
    "57:11": {
      "inputs": { "shift": 3, "model": ["57:28", 0] },
      "class_type": "ModelSamplingAuraFlow",
      "_meta": { "title": "ModelSamplingAuraFlow" }
    }
  };
}

/**
 * Workflow builder for IP-Adapter Character Sheet (SDXL)
 */
function buildCharacterSheetWorkflow(params: {
  prompt: string;
  imageFilename: string;
  seed: number;
}): Record<string, unknown> {
  const seed = params.seed || Math.floor(Math.random() * 1000000);

  return {
    "1": {
      "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" },
      "class_type": "CheckpointLoaderSimple",
      "_meta": { "title": "Load Checkpoint" }
    },
    "2": {
      "inputs": { "text": `character sheet, front view, side view, back view, same character, white background, masterpiece, best quality, cinematic lighting, ${params.prompt}`, "clip": ["1", 1] },
      "class_type": "CLIPTextEncode",
      "_meta": { "title": "Positive Prompt" }
    },
    "3": {
      "inputs": { "text": "bad eyes, bad face, deformed, low quality, duplicate, logo, watermark", "clip": ["1", 1] },
      "class_type": "CLIPTextEncode",
      "_meta": { "title": "Negative Prompt" }
    },
    "4": {
      "inputs": { "width": 1024, "height": 1024, "batch_size": 1 },
      "class_type": "EmptyLatentImage",
      "_meta": { "title": "Empty Latent Image" }
    },
    "5": {
      "inputs": {
        "seed": seed, "steps": 30, "cfg": 7, "sampler_name": "dpmpp_2m", "scheduler": "karras", "denoise": 1,
        "model": ["8", 0], "positive": ["2", 0], "negative": ["3", 0], "latent_image": ["4", 0]
      },
      "class_type": "KSampler",
      "_meta": { "title": "KSampler" }
    },
    "6": {
      "inputs": { "samples": ["5", 0], "vae": ["1", 2] },
      "class_type": "VAEDecode",
      "_meta": { "title": "VAE Decode" }
    },
    "7": {
      "inputs": { "filename_prefix": "char_sheet", "images": ["6", 0] },
      "class_type": "SaveImage",
      "_meta": { "title": "Save Image" }
    },
    "8": {
      "inputs": {
        "weight": 0.85, "noise": 0, "ipadapter": ["9", 0], "clip_vision": ["10", 0],
        "image": ["11", 0], "model": ["1", 0]
      },
      "class_type": "IPAdapterApply",
      "_meta": { "title": "IPAdapter Apply" }
    },
    "9": {
      "inputs": { "ipadapter_name": "ip-adapter-plus_sdxl_vit-h.safetensors" },
      "class_type": "IPAdapterLoader",
      "_meta": { "title": "Load IPAdapter" }
    },
    "10": {
      "inputs": { "clip_name": "clip_vision_vit_h.safetensors" },
      "class_type": "CLIPVisionLoader",
      "_meta": { "title": "Load CLIP Vision" }
    },
    "11": {
      "inputs": { "image": params.imageFilename, "upload": "image" },
      "class_type": "LoadImage",
      "_meta": { "title": "Load Reference Image" }
    }
  };
}

export function CharacterImagesSection({ characterId, characterName, character: propCharacter, onImagesUpdate }: CharacterImagesSectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<CharacterImage[]>([]);
  const [referenceImages, setReferenceImages] = useState<CharacterImage[]>([]);
  const [selectedReference, setSelectedReference] = useState<CharacterImage | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showReferenceGenerator, setShowReferenceGenerator] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');

  const store = useAppStore();
  const character = propCharacter || store.characters.find(c => c.character_id === characterId);

  useEffect(() => {
    if (character?.visual_identity) {
      const vi = character.visual_identity;
      if (vi.reference_images && vi.reference_images.length > 0) {
        const loaded: CharacterImage[] = vi.reference_images.map(img => ({
          id: parseInt(img.id) || Date.now(),
          url: img.url,
          type: img.type as 'reference' | 'reference_sheet',
          timestamp: new Date(img.created_at).toISOString(),
          panel: img.panel,
          filename: img.filename
        }));
        setReferenceImages(loaded);
        if (loaded.length > 0) setSelectedReference(loaded[0]);
      }
      if (vi.reference_sheet_images && vi.reference_sheet_images.length > 0) {
        const loaded: CharacterImage[] = vi.reference_sheet_images.map(img => ({
          id: parseInt(img.id) || Date.now(),
          url: img.url,
          type: 'reference_sheet',
          timestamp: new Date(img.created_at).toISOString(),
          panel: img.panel,
          filename: img.filename
        }));
        setImages(loaded);
      }
    }
  }, [character, characterId]);

  const saveImagesToCharacter = useCallback((refImages: CharacterImage[], sheetImages: CharacterImage[]) => {
    const reference_images = refImages.map(img => ({
      id: img.id.toString(),
      url: img.url,
      type: img.type,
      panel: img.panel || 'reference',
      created_at: new Date(img.timestamp).getTime(),
    }));

    const reference_sheet_images = sheetImages.map(img => ({
      id: img.id.toString(),
      url: img.url,
      panel: img.panel || 'front',
      created_at: new Date(img.timestamp).getTime(),
    }));

    if (onImagesUpdate) {
      onImagesUpdate({ reference_images, reference_sheet_images });
    } else if (characterId) {
      const existing = store.characters.find(c => c.character_id === characterId);
      if (existing) {
        const visual_identity = {
          ...existing.visual_identity,
          reference_images,
          reference_sheet_images,
        };
        store.updateProject({
          characters: store.characters.map(c => 
            c.character_id === characterId ? { ...c, visual_identity } : c
          )
        });
      }
    }
  }, [characterId, store, onImagesUpdate]);

  const findImagesInHistory = useCallback((obj: Record<string, unknown>, baseServerUrl: string): string[] => {
    const urls: string[] = [];
    const search = (item: unknown) => {
      if (!item || typeof item !== 'object') return;
      if (Array.isArray(item)) { item.forEach(search); return; }
      const record = item as Record<string, unknown>;
      if (record.filename && record.type) {
        urls.push(`${baseServerUrl}/view?filename=${encodeURIComponent(String(record.filename))}&type=${encodeURIComponent(String(record.type))}&subfolder=${encodeURIComponent(String(record.subfolder || ''))}`);
        return;
      }
      Object.keys(record).forEach(k => search(record[k]));
    };
    search(obj);
    return urls;
  }, []);

  const downloadImages = useCallback(async (serverUrl: string, promptId: string): Promise<string[]> => {
    try {
      const response = await fetch(`${serverUrl}/history/${promptId}`);
      if (response.ok) {
        const history = await response.json();
        const data = history[promptId];
        if (!data || !data.outputs) return findImagesInHistory(history as Record<string, unknown>, serverUrl);
        const urls: string[] = [];
        Object.values(data.outputs as Record<string, unknown>).forEach((output: unknown) => {
          interface ComfyImage {
            filename: string;
            type?: string;
            subfolder?: string;
          }
          const imgs = (output as { images?: ComfyImage[] }).images || (Array.isArray(output) ? output as ComfyImage[] : []);
          imgs.forEach((img: ComfyImage) => {
            if (img.filename) urls.push(`${serverUrl}/view?filename=${encodeURIComponent(img.filename)}&type=output&subfolder=${encodeURIComponent(img.subfolder || '')}`);
          });
        });
        return urls;
      }
    } catch (e) { 
      console.warn('[CharacterImagesSection] Failed to download images:', e); 
    }
    return [];
  }, [findImagesInHistory]);

  const waitForCompletion = useCallback(async (serverUrl: string, promptId: string): Promise<boolean> => {
    const maxAttempts = 60; // Increased to 2 minutes
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`${serverUrl}/history/${promptId}`);
        if (response.ok) {
          const status = await response.json();
          const pData = status[promptId];
          if (pData?.status?.completed === true || pData?.status === 'success') return true;
          if (pData?.status === 'failed') return false;
        }
      } catch (e) { console.warn(e); }
      await new Promise(r => setTimeout(r, 2000));
    }
    return false; // Actually return false on timeout
  }, []);

  const tryDirectFolderAccess = useCallback(async (serverUrl: string, promptId: string, prefix: string): Promise<string[]> => {
    const urls: string[] = [];
    const possible = [
      `${prefix}_0001.png`, 
      `${prefix}_0001.jpg`, 
      `ref_${promptId}_0001.png`,
      `sheet_${promptId}_0001.png`,
      `character_reference_0001.png`,
      `character_reference_0001_.png`
    ];
    for (const f of possible) {
      try {
        const url = `${serverUrl}/view?filename=${encodeURIComponent(f)}&type=output`;
        const res = await fetch(url, { method: 'HEAD' });
        if (res.ok) urls.push(url);
      } catch {
        // Silently fail as this is a fallback
      }
    }
    return urls;
  }, []);

  const generateMockPanel = useCallback((_desc: string, panel: string, title: string) => {
    const colors: Record<string, string> = { reference: '#e94560', front: '#00d4ff', left: '#4CAF50', right: '#FF9800', back: '#9C27B0' };
    return `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#1a1a2e"/><rect x="2" y="2" width="396" height="296" fill="#0f3460" stroke="${colors[panel] || '#00d4ff'}" stroke-width="2" rx="4"/><text x="200" y="130" fill="#aaa" font-family="Arial" font-size="14" text-anchor="middle">${title}</text><text x="200" y="155" fill="#666" font-family="Arial" font-size="11" text-anchor="middle">${characterName}</text></svg>`;
  }, [characterName]);

  const generateMockReference = useCallback(async (desc: string) => {
    const url = `data:image/svg+xml,${encodeURIComponent(generateMockPanel(desc, 'reference', 'Reference'))}`;
    const newRef: CharacterImage = { id: Date.now(), url, type: 'reference', timestamp: new Date().toISOString(), panel: 'reference' };
    setReferenceImages(prev => {
      const updated = [...prev, newRef];
      saveImagesToCharacter(updated, images);
      return updated;
    });
    setSelectedReference(newRef);
    setIsLoading(false);
  }, [images, saveImagesToCharacter, generateMockPanel]);

  const generateMockSheet = useCallback(async (desc: string) => {
    const views = ['front', 'left', 'right', 'back'];
    const newImgs: CharacterImage[] = views.map((v, i) => ({
      id: Date.now() + i,
      url: `data:image/svg+xml,${encodeURIComponent(generateMockPanel(desc, v, v))}`,
      type: 'reference_sheet',
      timestamp: new Date().toISOString(),
      panel: v
    }));
    setImages(prev => {
      const updated = [...prev, ...newImgs];
      saveImagesToCharacter(referenceImages, updated);
      return updated;
    });
    setIsLoading(false);
  }, [generateMockPanel, referenceImages, saveImagesToCharacter]);

  const handleGenerateReference = useCallback(async () => {
    setIsLoading(true);
    setGenerationProgress('Connecting to ComfyUI...');
    const prompt = buildCharacterPrompt(character, []);
    const serverUrl = 'http://localhost:8000';
    try {
      const workflow = buildFluxTurboWorkflow({ 
        prompt, 
        width: 1024, 
        height: 1024, 
        steps: 25, 
        cfgScale: 7, 
        seed: Math.floor(Math.random() * 1000000) 
      });

      const response = await fetch(`${serverUrl}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: workflow })
      });

      if (!response.ok) throw new Error('Failed to send prompt to ComfyUI');
      
      const result = await response.json();
      setGenerationStep('Generating in GPU...');
      
      const success = await waitForCompletion(serverUrl, result.prompt_id);
      if (!success) throw new Error('Generation failed in ComfyUI');

      setGenerationStep('Retrieving image...');
      let urls = await downloadImages(serverUrl, result.prompt_id);
      if (urls.length === 0) urls = await tryDirectFolderAccess(serverUrl, result.prompt_id, characterName);
      
      if (urls.length > 0) {
        const projectPath = store.project?.path;
        const newImgs: CharacterImage[] = [];
        
        for (let i = 0; i < urls.length; i++) {
          const idStr = `ref_${Date.now()}_${i}`;
          let displayUrl = urls[i];
          
          // Save locally if project is available
          if (projectPath) {
            const saveRes = await downloadAndSaveImage(
              urls[i],
              idStr,
              projectPath,
              'assets/images/characters/references'
            );
            if (saveRes.success && saveRes.localPath) {
              displayUrl = saveRes.localPath;
            }
          }
          
          newImgs.push({ 
            id: Date.now() + i, 
            url: displayUrl, 
            type: 'reference' as const, 
            timestamp: new Date().toISOString(), 
            panel: 'reference' 
          });
        }
        
        setReferenceImages(prev => {
          const updated = [...prev, ...newImgs];
          saveImagesToCharacter(updated, images);
          return updated;
        });
        setSelectedReference(newImgs[0]);
      } else {
        await generateMockReference(prompt);
      }
    } catch (_error) { 
      console.warn('[CharacterImagesSection] Falling back to mock reference:', _error);
      await generateMockReference(prompt); 
    }
    setIsLoading(false);
    setShowReferenceGenerator(false);
    
    function setGenerationStep(step: string) { setGenerationProgress(step); }
  }, [character, images, saveImagesToCharacter, waitForCompletion, downloadImages, tryDirectFolderAccess, characterName, generateMockReference, store.project?.path]);

  const handleGenerateSheet = useCallback(async () => {
    if (!selectedReference) return;
    setIsLoading(true);
    setGenerationProgress('Uploading reference...');
    
    const serverUrl = 'http://localhost:8000';
    const prompt = buildCharacterPrompt(character, []);
    
    try {
      // 1. Prepare image for ComfyUI
      let imageFilename = `ref_${Date.now()}.png`;
      
      // If the URL is already a ComfyUI view URL, we might extract the filename
      if (selectedReference.url.includes('filename=')) {
        const urlParams = new URLSearchParams(selectedReference.url.split('?')[1]);
        const existingFile = urlParams.get('filename');
        if (existingFile) imageFilename = existingFile;
      } else {
        // Otherwise try to upload the blob
        try {
          const blobRes = await fetch(selectedReference.url);
          const blob = await blobRes.blob();
          const formData = new FormData();
          formData.append('image', blob, imageFilename);
          
          const uploadRes = await fetch(`${serverUrl}/upload/image`, {
            method: 'POST',
            body: formData
          });
          
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            imageFilename = uploadData.name;
          }
        } catch (e) {
          console.warn('[CharacterImagesSection] Failed to upload image to ComfyUI, attempting direct name use:', e);
        }
      }
      
      setGenerationProgress('Synthesizing character sheet...');
      const workflow = buildCharacterSheetWorkflow({
        prompt,
        imageFilename,
        seed: Math.floor(Math.random() * 1000000)
      });
      
      const response = await fetch(`${serverUrl}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: workflow })
      });

      if (!response.ok) throw new Error('Failed to send prompt to ComfyUI');
      const result = await response.json();
      
      setGenerationProgress('Generating multi-view panels...');
      const success = await waitForCompletion(serverUrl, result.prompt_id);
      if (!success) throw new Error('Sheet generation failed in ComfyUI');

      setGenerationProgress('Retrieving sheet...');
      const urls = await downloadImages(serverUrl, result.prompt_id);
      
      if (urls.length > 0) {
        const projectPath = store.project?.path;
        const newImgs: CharacterImage[] = [];
        
        for (let i = 0; i < urls.length; i++) {
          const idStr = `sheet_${Date.now()}_${i}`;
          let displayUrl = urls[i];
          
          if (projectPath) {
            const saveRes = await downloadAndSaveImage(
              urls[i],
              idStr,
              projectPath,
              'assets/images/characters/sheets'
            );
            if (saveRes.success && saveRes.localPath) {
              displayUrl = saveRes.localPath;
            }
          }
          
          newImgs.push({ 
            id: Date.now() + i, 
            url: displayUrl, 
            type: 'reference_sheet' as const, 
            timestamp: new Date().toISOString(), 
            panel: i === 0 ? 'FRONT/SIDE/BACK' : `sheet_${i}`
          });
        }
        
        setImages(prev => {
          const updated = [...prev, ...newImgs];
          saveImagesToCharacter(referenceImages, updated);
          return updated;
        });
        notificationService.success('Character Sheet', 'Multi-view sheet successfully generated.');
      } else {
        await generateMockSheet(prompt);
      }
    } catch (_error) { 
      console.warn('[CharacterImagesSection] Falling back to mock sheet:', _error);
      await generateMockSheet(prompt); 
    }
    
    setIsLoading(false);
    setShowGenerator(false);
  }, [character, selectedReference, referenceImages, saveImagesToCharacter, waitForCompletion, downloadImages, generateMockSheet, store.project?.path]);

  const handleGeneratePantin = useCallback(async () => {
    if (!character) return;
    setIsLoading(true);
    try {
      const res = await assetCreatorService.generatePantin(character);
      if (res.success && res.script) {
        const blob = new Blob([res.script], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${character.name?.replace(/[^a-z0-9]/gi, '_') || 'character'}_pantin.py`;
        a.click();
        notificationService.success('3D Asset Generated', 'Blender script downloaded.');
      }
    } catch (_error) { 
      notificationService.error('3D Generation Failed', 'Error generating pantin script'); 
    }
    setIsLoading(false);
  }, [character]);

  const handleDeleteImage = useCallback((id: number, listType: 'reference' | 'images') => {
    if (listType === 'reference') {
      const filtered = referenceImages.filter(img => img.id !== id);
      setReferenceImages(filtered);
      if (selectedReference?.id === id) {
        setSelectedReference(filtered.length > 0 ? filtered[0] : null);
      }
      saveImagesToCharacter(filtered, images);
    } else {
      const filtered = images.filter(img => img.id !== id);
      setImages(filtered);
      saveImagesToCharacter(referenceImages, filtered);
    }
  }, [referenceImages, images, selectedReference, saveImagesToCharacter]);

  return (
    <div className="character-images-section">
      <div className="character-images-section__header">
        <div>
          <h2 className="character-images-section__title">Visual Identity Manifestation</h2>
          <p className="character-images-section__subtitle">Generate persistent reference assets for consistent AI production.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            className="btn-action-glow bg-rose-600 hover:bg-rose-700 font-bold"
            onClick={() => setShowReferenceGenerator(true)}
          >
            <Eye className="w-4 h-4 mr-2" /> 1. Generate Reference
          </Button>
          <Button 
            variant="secondary"
            className="btn-action-glow font-bold"
            onClick={() => setShowGenerator(true)}
            disabled={!selectedReference}
          >
            <Grid3X3 className="w-4 h-4 mr-2" /> 2. Generate Sheet
          </Button>
          <Button 
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/10 font-bold"
            onClick={handleGeneratePantin}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Box className="w-4 h-4 mr-2" />} 3D Prototype
          </Button>
        </div>
      </div>

      {isLoading && (
        <Card className="p-4 bg-primary/5 border-primary/20 flex items-center justify-center gap-4">
          <RefreshCw className="w-5 h-5 text-primary animate-spin" />
          <span className="text-sm font-bold uppercase tracking-widest text-primary/80">{generationProgress}</span>
        </Card>
      )}

      {/* Reference Img Grid */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Reference Portraits
        </h3>
        <div className="character-images-section__grid">
          {referenceImages.length > 0 ? (
            referenceImages.map(img => (
              <div 
                key={img.id} 
                className={cn(
                  "character-images-section__card group",
                  selectedReference?.id === img.id && "character-images-section__card--selected"
                )}
                onClick={() => setSelectedReference(img)}
              >
                <img src={img.url} alt="Character Reference" className="character-images-section__image" />
                <div className="character-images-section__badge">REF</div>
                <div className="character-images-section__card-overlay">
                  <Button 
                    size="icon" 
                    variant="destructive" 
                    className="h-8 w-8 rounded-full shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteImage(img.id, 'reference');
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="character-images-section__empty">
              <Eye className="w-10 h-10 mb-4 opacity-20" />
              <p className="text-sm font-bold uppercase">No Reference Images</p>
              <p className="text-xs opacity-60 mt-1">Generate a persistent reference portrait to begin.</p>
            </div>
          )}
        </div>
      </div>

      {/* Sheet Grid */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Character Production Sheets
        </h3>
        <div className="character-images-section__grid">
          {images.length > 0 ? (
            images.map(img => (
              <div key={img.id} className="character-images-section__card">
                <img src={img.url} alt="Character Sheet" className="character-images-section__image" />
                <Badge className="absolute top-2 left-2 bg-emerald-600/80 backdrop-blur-md border-none uppercase text-[10px]">
                  {img.panel || 'SHEET'}
                </Badge>
                <div className="character-images-section__card-overlay">
                   <Button 
                    size="icon" 
                    variant="destructive" 
                    className="h-8 w-8 rounded-full shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteImage(img.id, 'images');
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-lg">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="character-images-section__empty">
              <Grid3X3 className="w-10 h-10 mb-4 opacity-20" />
              <p className="text-sm font-bold uppercase">No Production Sheets</p>
              <p className="text-xs opacity-60 mt-1">Select a reference above and generate multi-view sheets.</p>
            </div>
          )}
        </div>
      </div>

      {showReferenceGenerator && (
        <GeneratorModal 
          title="Manifest Reference" 
          onClose={() => setShowReferenceGenerator(false)} 
          onGenerate={handleGenerateReference} 
          isLoading={isLoading} 
          progress={generationProgress} 
        />
      )}
      
      {showGenerator && (
        <GeneratorModal 
          title="Synthesize Sheet" 
          onClose={() => setShowGenerator(false)} 
          onGenerate={handleGenerateSheet} 
          isLoading={isLoading} 
          progress={generationProgress} 
        />
      )}
    </div>
  );
}

function GeneratorModal({ title, onClose, onGenerate, isLoading, progress }: { 
  title: string, 
  onClose: () => void, 
  onGenerate: () => void, 
  isLoading: boolean, 
  progress: string 
}) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[1000] p-4">
      <Card className="relative overflow-hidden w-full max-w-md bg-neutral-950 border-rose-500/30 shadow-[0_0_50px_rgba(225,29,72,0.15)] p-8 text-center space-y-8">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/10 blur-[80px] rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-rose-500/10 blur-[80px] rounded-full" />
        
        <div className="space-y-2 relative">
          <h3 className="text-lg font-black uppercase tracking-widest text-white">{title}</h3>
          <div className="h-0.5 w-12 bg-rose-600 mx-auto" />
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center gap-6 relative">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-2 border-rose-500/20" />
              <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-t-rose-600 animate-spin" />
              <RefreshCw className="absolute inset-0 m-auto w-8 h-8 text-rose-500/40 animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black uppercase tracking-widest text-rose-500">{progress || 'Processing...'}</p>
              <p className="text-[10px] text-muted-foreground italic">Quantum entanglement in progress.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 relative">
            <Button 
              onClick={onGenerate} 
              className="h-12 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest btn-action-glow"
            >
              Initiate Manifestation
            </Button>
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="text-muted-foreground hover:text-white hover:bg-white/5 uppercase text-xs font-bold tracking-widest"
            >
              Abort Mission
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

export default CharacterImagesSection;
