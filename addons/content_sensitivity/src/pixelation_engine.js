/**
 * PixelationEngine — Content Sensitivity Addon
 * 
 * Implémente la pixelisation automatique des zones sensibles d'une image.
 * 
 * Deux stratégies selon l'environnement :
 *   - Node.js (main process Electron) : librairie `sharp` pour le traitement des fichiers
 *   - Browser/Renderer (Canvas API)   : HTMLCanvasElement pour les data-URLs / Blob
 *
 * Niveaux de pixelisation :
 *   - 'low'    : blockSize = 8px  (flou léger, contenu encore devinable)
 *   - 'medium' : blockSize = 16px (censure standard)
 *   - 'high'   : blockSize = 32px (censure agressive, contenu illisible)
 */

'use strict';

const path = require('path');

// ─── Détection d'environnement ────────────────────────────────────────────────

/** Retourne true si on est dans le processus Node.js principal (Electron main). */
function isNodeContext() {
  return typeof window === 'undefined';
}

/** Tente de charger sharp, retourne null si non disponible. */
function tryLoadSharp() {
  try {
    return require('sharp');
  } catch {
    return null;
  }
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const BLOCK_SIZES = {
  low:    8,
  medium: 16,
  high:   32,
};

// Zones prédéfinies à censurer (ratio, relatif à la taille de l'image).
// Peut être enrichi par détection IA (via une API future).
const PRESET_SENSITIVE_REGIONS = {
  /** Censure toute l'image */
  full:   (w, h) => [{ x: 0, y: 0, width: w, height: h }],
  /** Censure la moitié supérieure (visage généralement) */
  face:   (w, h) => [{ x: Math.floor(w * 0.15), y: 0, width: Math.floor(w * 0.7), height: Math.floor(h * 0.45) }],
  /** Censure la zone centrale (corps) */
  body:   (w, h) => [{ x: Math.floor(w * 0.1), y: Math.floor(h * 0.25), width: Math.floor(w * 0.8), height: Math.floor(h * 0.55) }],
};

// ─── Implémentation Node.js / Sharp ───────────────────────────────────────────

/**
 * Pixelise une image sur disque ou un buffer.
 * @param {string|Buffer} input    Chemin absolu vers l'image ou Buffer PNG/JPEG
 * @param {object}        options
 * @param {'low'|'medium'|'high'} options.level      Niveau de pixelisation
 * @param {Array<{x,y,width,height}>} [options.regions] Zones à pixeliser. Si absent → image entière.
 * @param {string}        [options.outputPath]  Si fourni, sauvegarde le résultat sur disque.
 * @returns {Promise<Buffer>} Buffer de l'image pixelisée (PNG)
 */
async function pixelateWithSharp(input, options = {}) {
  const sharp = tryLoadSharp();
  if (!sharp) {
    throw new Error('[PixelationEngine] sharp n\'est pas disponible dans cet environnement.');
  }

  const { level = 'medium', regions, outputPath } = options;
  const blockSize = BLOCK_SIZES[level] ?? BLOCK_SIZES.medium;

  // Charger l'image
  const image = sharp(input);
  const metadata = await image.metadata();
  const { width, height } = metadata;

  // Déterminer les zones
  const zonesToPixelate = regions
    ? regions
    : PRESET_SENSITIVE_REGIONS.full(width, height);

  // Construire les composites : chaque zone est pixelisée séparément
  // en réduisant puis re-agrandissant (effet mosaïque)
  const composites = [];

  for (const region of zonesToPixelate) {
    // Clamp les valeurs pour rester dans les limites de l'image
    const rx = Math.max(0, Math.min(region.x, width - 1));
    const ry = Math.max(0, Math.min(region.y, height - 1));
    const rw = Math.max(1, Math.min(region.width, width - rx));
    const rh = Math.max(1, Math.min(region.height, height - ry));

    // Calculer la taille réduite (effet pixel)
    const smallW = Math.max(1, Math.round(rw / blockSize));
    const smallH = Math.max(1, Math.round(rh / blockSize));

    // Extraire la région → réduire → agrandir → réinjecter
    const pixelatedRegionBuffer = await sharp(input)
      .extract({ left: rx, top: ry, width: rw, height: rh })
      .resize(smallW, smallH, { kernel: sharp.kernel.nearest }) // réduction brutale
      .resize(rw, rh,     { kernel: sharp.kernel.nearest }) // re-agrandissement (effet mosaïque)
      .png()
      .toBuffer();

    composites.push({
      input: pixelatedRegionBuffer,
      top: ry,
      left: rx,
    });
  }

  // Appliquer tous les overlays pixelisés
  const resultPipeline = sharp(input).composite(composites).png();

  if (outputPath) {
    await resultPipeline.toFile(outputPath);
    console.log(`[PixelationEngine] Image sauvegardée : ${outputPath}`);
  }

  return resultPipeline.toBuffer();
}

// ─── Implémentation Canvas API (Renderer / Browser) ───────────────────────────

/**
 * Pixelise une image dans un contexte browser/renderer (Electron renderer process).
 * @param {string}        input    data-URL (base64) ou URL de l'image
 * @param {object}        options
 * @param {'low'|'medium'|'high'} options.level
 * @param {Array<{x,y,width,height}>} [options.regions]
 * @returns {Promise<string>} data-URL PNG de l'image pixelisée
 */
function pixelateWithCanvas(input, options = {}) {
  return new Promise((resolve, reject) => {
    const { level = 'medium', regions } = options;
    const blockSize = BLOCK_SIZES[level] ?? BLOCK_SIZES.medium;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;

      // Canvas principal
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Déterminer les zones
      const zonesToPixelate = regions
        ? regions
        : PRESET_SENSITIVE_REGIONS.full(w, h);

      for (const region of zonesToPixelate) {
        const rx = Math.max(0, Math.min(Math.round(region.x), w - 1));
        const ry = Math.max(0, Math.min(Math.round(region.y), h - 1));
        const rw = Math.max(1, Math.min(Math.round(region.width),  w - rx));
        const rh = Math.max(1, Math.min(Math.round(region.height), h - ry));

        // Canvas temporaire pour la zone réduite
        const tmpCanvas = document.createElement('canvas');
        const smallW = Math.max(1, Math.round(rw / blockSize));
        const smallH = Math.max(1, Math.round(rh / blockSize));
        tmpCanvas.width  = smallW;
        tmpCanvas.height = smallH;

        const tmpCtx = tmpCanvas.getContext('2d');
        // Désactiver l'antialiasing pour l'effet pixel dur
        tmpCtx.imageSmoothingEnabled = false;
        tmpCtx.drawImage(canvas, rx, ry, rw, rh, 0, 0, smallW, smallH);

        // Re-dessiner avec pixelisation (agrandissement sans antialiasing)
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tmpCanvas, 0, 0, smallW, smallH, rx, ry, rw, rh);
      }

      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = (err) => reject(new Error(`[PixelationEngine] Impossible de charger l'image : ${err}`));
    img.src = input;
  });
}

// ─── API publique ──────────────────────────────────────────────────────────────

/**
 * Point d'entrée principal.
 * Choisit automatiquement l'implémentation selon l'environnement.
 *
 * @param {string|Buffer} input    Chemin fichier (Node) ou data-URL (Browser)
 * @param {object}        options
 * @param {'low'|'medium'|'high'}           options.level       Intensité de pixelisation
 * @param {'full'|'face'|'body'|Array}      [options.zone]      Zone à censurer ou tableau custom
 * @param {string}                          [options.outputPath] (Node seulement) chemin de sortie
 * @returns {Promise<string|Buffer>} data-URL (browser) ou Buffer PNG (Node)
 */
async function pixelate(input, options = {}) {
  const { level = 'medium', zone = 'full', outputPath } = options;

  // Résoudre les zones
  let regions = options.regions ?? null;
  if (!regions && typeof zone === 'string' && PRESET_SENSITIVE_REGIONS[zone]) {
    // Les dimensions ne sont pas connues ici → on passe null, chaque impl les calcule
    regions = null; // sera résolu par chaque implémentation avec PRESET_SENSITIVE_REGIONS[zone]
  } else if (Array.isArray(zone)) {
    regions = zone;
  }

  if (isNodeContext()) {
    return pixelateWithSharp(input, { level, regions, outputPath, zone });
  } else {
    return pixelateWithCanvas(input, { level, regions, zone });
  }
}

/**
 * Pixelise une image et retourne une data-URL, toujours (utile pour l'UI).
 * En Node, convertit le Buffer résultat en base64.
 *
 * @param {string|Buffer} input
 * @param {object}        options  - Mêmes options que `pixelate`
 * @returns {Promise<string>} data-URL `data:image/png;base64,...`
 */
async function pixelateToDataURL(input, options = {}) {
  if (isNodeContext()) {
    const buffer = await pixelateWithSharp(input, options);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  } else {
    return pixelateWithCanvas(input, options);
  }
}

/**
 * Pixelise un fichier image et le sauvegarde sur disque (Node seulement).
 * @param {string} inputPath   Chemin absolu vers le fichier source
 * @param {string} outputPath  Chemin absolu vers le fichier destination
 * @param {object} options     - level, zone, regions
 * @returns {Promise<void>}
 */
async function pixelateFile(inputPath, outputPath, options = {}) {
  if (!isNodeContext()) {
    throw new Error('[PixelationEngine] pixelateFile() nécessite le contexte Node.js.');
  }
  await pixelateWithSharp(inputPath, { ...options, outputPath });
}

/**
 * Détecte automatiquement les zones potentiellement sensibles dans une image.
 * Implémentation basique par heuristique (centre de l'image, ratio corps).
 * Peut être remplacé par une détection IA (NSFW.js, Nudenet, etc.)
 *
 * @param {number} width
 * @param {number} height
 * @param {'auto'|'face'|'body'|'full'} strategy
 * @returns {Array<{x, y, width, height}>}
 */
function detectSensitiveRegions(width, height, strategy = 'auto') {
  if (strategy === 'auto') {
    // Heuristique : censure le tiers central de l'image (zone corps)
    return [
      {
        x:      Math.floor(width  * 0.1),
        y:      Math.floor(height * 0.2),
        width:  Math.floor(width  * 0.8),
        height: Math.floor(height * 0.6),
      },
    ];
  }

  const preset = PRESET_SENSITIVE_REGIONS[strategy];
  if (preset) return preset(width, height);

  // Fallback : image entière
  return PRESET_SENSITIVE_REGIONS.full(width, height);
}

// ─── Export ───────────────────────────────────────────────────────────────────

module.exports = {
  pixelate,
  pixelateToDataURL,
  pixelateFile,
  detectSensitiveRegions,
  BLOCK_SIZES,
  PRESET_SENSITIVE_REGIONS,
};
