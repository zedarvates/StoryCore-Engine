/**
 * Generate placeholder images as data URIs to avoid CSP violations
 */

export function generatePlaceholderDataUrl(
  width: number,
  height: number,
  text: string,
  backgroundColor = '#1a1a2e',
  textColor = '#6366f1'
): string {
  // Create a canvas element
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Draw border
  ctx.strokeStyle = textColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // Draw text
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Calculate font size based on canvas size
  const fontSize = Math.min(width, height) / 10;
  ctx.font = `${fontSize}px sans-serif`;
  
  // Wrap text if needed
  const maxWidth = width * 0.8;
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);

  // Draw lines
  const lineHeight = fontSize * 1.2;
  const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;
  
  lines.forEach((line, index) => {
    ctx.fillText(line, width / 2, startY + index * lineHeight);
  });

  // Convert to data URL
  return canvas.toDataURL('image/png');
}

// Cache for generated placeholders
const placeholderCache = new Map<string, string>();

export function getCachedPlaceholder(
  width: number,
  height: number,
  text: string
): string {
  const key = `${width}x${height}:${text}`;
  
  if (!placeholderCache.has(key)) {
    placeholderCache.set(key, generatePlaceholderDataUrl(width, height, text));
  }
  
  return placeholderCache.get(key)!;
}

// Clear cache if it gets too large
export function clearPlaceholderCache(): void {
  placeholderCache.clear();
}
