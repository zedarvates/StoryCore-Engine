import type { Shot, Project } from '@/types';
import { generateId } from '@/utils/idGenerator';

/**
 * Service to export sequence plans to Markdown (.md) format.
 * Enables sharing, archiving, and editing plans in any text editor.
 */

export interface ExportOptions {
  includeThumbnails?: boolean;
  includeParameters?: boolean;
  includeCharacterDetails?: boolean;
  filename?: string;
}

/**
 * Generates a Markdown string from the project and its shots
 */
export function generateMarkdownPlan(project: Project | null, shots: Shot[]): string {
  const projectName = project?.project_name || 'Untitled Sequence';
  const description = project?.metadata?.description || 'No description provided.';
  const timestamp = new Date().toLocaleString();

  let md = `# Sequence Plan: ${projectName}\n\n`;
  md += `**Generated on:** ${timestamp}\n`;
  md += `**Project ID:** ${project?.id || generateId()}\n`;
  md += `**Description:** ${description}\n\n`;

  md += `## Technical Summary\n\n`;
  md += `- **Resolution:** ${project?.metadata?.resolution?.width || 1024}x${project?.metadata?.resolution?.height || 1024}\n`;
  md += `- **FPS:** ${project?.metadata?.fps || 24}\n`;
  md += `- **Format:** ${project?.metadata?.format || 'mp4'}\n`;
  md += `- **Total Shots:** ${shots.length}\n\n`;

  md += `## Shots Breakdown\n\n`;

  shots.sort((a, b) => (a.position || 0) - (b.position || 0)).forEach((shot, index) => {
    md += `### [${index + 1}] ${shot.name || `Shot ${shot.id.slice(0, 8)}`}\n\n`;
    
    md += `**Prompt:**\n> ${shot.prompt || '*No prompt provided*'}\n\n`;
    
    md += `- **Duration:** ${shot.duration || 120} frames (${Math.round((shot.duration || 120) / (project?.metadata?.fps || 24) * 10) / 10}s)\n`;
    md += `- **Status:** ${shot.generationStatus || 'pending'}\n`;

    if (shot.cinematography) {
      const framing = shot.cinematography.framing || 'N/A';
      const c = shot.cinematography as Record<string, unknown>;
      const angle = c.angle || c.cameraAngle || 'N/A';
      const movement = c.movement || c.cameraMovement || 'N/A';
      md += `- **Cinematography:** ${framing}, ${angle}, ${movement}\n`;
    }

    if (shot.visualStyle) {
      md += `- **Style:** ${shot.visualStyle.styleName || 'N/A'}\n`;
    }

    if (shot.parameters) {
      md += `\n**Parameters:**\n`;
      md += `\`\`\`json\n${JSON.stringify(shot.parameters, null, 2)}\n\`\`\`\n\n`;
    }

    if (shot.outputPath) {
      md += `**Result:** [View Rendered Shot](${shot.outputPath})\n\n`;
    }

    if (shot.referenceImages && shot.referenceImages.length > 0) {
      md += `**Reference Images:**\n`;
      shot.referenceImages.forEach(img => {
        md += `- ![Ref](${img.url})\n`;
      });
      md += '\n';
    }

    md += `---\n\n`;
  });

  md += `\n*End of Plan*\n`;

  return md;
}

/**
 * Triggers a browser download of the Markdown plan
 */
export function downloadMarkdownPlan(project: Project | null, shots: Shot[]): void {
  const mdContent = generateMarkdownPlan(project, shots);
  const blob = new Blob([mdContent], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  
  const filename = `${project?.project_name || 'sequence'}-plan-${new Date().toISOString().slice(0, 10)}.md`;
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates an HTML Storyboard from project and shots for visual sharing
 */
export function generateHtmlStoryboard(project: Project | null, shots: Shot[]): string {
  const projectName = project?.project_name || 'Untitled Sequence';
  const description = project?.metadata?.description || '';
  const dateStr = new Date().toLocaleDateString();

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Storyboard: ${projectName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f111a; color: #e2e8f0; margin: 0; padding: 40px; }
    h1 { color: #8b5cf6; font-size: 2.5em; margin-bottom: 5px; }
    .header { margin-bottom: 40px; border-bottom: 2px solid #1e1b4b; padding-bottom: 20px; }
    .meta { color: #94a3b8; font-size: 0.9em; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 30px; }
    .shot-card { background: #1e1b4b; border-radius: 12px; overflow: hidden; border: 1px solid #312e81; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
    .shot-header { background: #312e81; padding: 10px 15px; font-weight: bold; font-size: 0.9em; display: flex; justify-content: space-between; }
    .shot-img-placeholder { height: 168px; background: #0f111a; display: flex; align-items: center; justify-content: center; color: #475569; font-style: italic; overflow: hidden; }
    .shot-img-placeholder img { width: 100%; height: 100%; object-fit: cover; }
    .shot-body { padding: 15px; }
    .prompt { font-size: 0.85em; color: #cbd5e1; line-height: 1.5; margin-bottom: 10px; }
    .stats { font-size: 0.75em; color: #64748b; font-family: monospace; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${projectName}</h1>
    <div class="meta">
      <p>${description}</p>
      <p>Generated: ${dateStr} • ${shots.length} Shots</p>
    </div>
  </div>
  <div class="grid">
`;

  shots.sort((a, b) => (a.position || 0) - (b.position || 0)).forEach((shot, index) => {
    const defaultFrames = shot.duration || 120;
    const sTime = Math.round((defaultFrames / 24) * 10) / 10;
    
    html += `    <div class="shot-card">
      <div class="shot-header">
        <span>Shot ${index + 1}</span>
        <span>${defaultFrames}f (${sTime}s)</span>
      </div>
      <div class="shot-img-placeholder">
        ${shot.outputPath || shot.thumbnailUrl ? `<img src="${shot.outputPath || shot.thumbnailUrl}" alt="Shot ${index + 1}" />` : 'No Output Yet'}
      </div>
      <div class="shot-body">
        <div class="prompt">${shot.prompt || 'No Prompt'}</div>
        <div class="stats">Status: ${shot.generationStatus || 'Pending'}</div>
      </div>
    </div>\n`;
  });

  html += `  </div>\n</body>\n</html>`;
  return html;
}

export function downloadHtmlStoryboard(project: Project | null, shots: Shot[]): void {
  const htmlContent = generateHtmlStoryboard(project, shots);
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const filename = `${project?.project_name || 'storyboard'}-${new Date().toISOString().slice(0, 10)}.html`;
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const markdownExportService = {
  generateMarkdownPlan,
  downloadMarkdownPlan,
  generateHtmlStoryboard,
  downloadHtmlStoryboard
};
