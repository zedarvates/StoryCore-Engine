import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsPDF } from 'jspdf';
import type { Project } from '@/types';
import {
  ConversationExportService,
  type ExportOptions,
} from '../ConversationExportService';
import { ProjectExportService } from '../projectExportService';

// Notifications are outside the export boundary and start background timers.
// Keep the PDF implementation real so these tests exercise its text path.
vi.mock('../NotificationService', () => ({
  notificationService: { success: vi.fn() },
}));

const literalText = '<b>literal</b> ${7*7} {{7*7}} <%=7*7%>';

function projectFixture(): Project {
  return {
    id: 'pdf-security-project',
    schema_version: '1.0',
    project_name: 'PDF security control',
    shots: [{
      id: 'shot-1',
      title: 'Ordinary scene',
      description: literalText,
      duration: 5,
      position: 0,
      prompt: '',
      startTime: 0,
      name: 'Ordinary scene',
    }],
    assets: [],
    capabilities: {
      grid_generation: true,
      promotion_engine: true,
      qa_engine: true,
      autofix_engine: true,
    },
    generation_status: { grid: 'done', promotion: 'done' },
  };
}

function readPDF(blob: Blob): Promise<string> {
  expect(blob.type).toBe('application/pdf');
  expect(blob.size).toBeGreaterThan(100);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

const options: ExportOptions = {
  format: 'pdf',
  includeTimestamps: true,
  includeMetadata: true,
  anonymize: false,
  title: 'Conversation export control',
  author: 'Test author',
};

describe('PDF exports keep user content on the text API', () => {
  let htmlSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    ConversationExportService.getInstance().destroy();
    ProjectExportService.getInstance().clearProgressCallback();
    vi.mocked(URL.createObjectURL).mockClear();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    htmlSpy = vi.spyOn(jsPDF.API, 'html').mockImplementation(() => {
      throw new Error('PDF text exports must not enter the HTML renderer');
    });
  });

  afterEach(() => {
    ConversationExportService.getInstance().destroy();
    ProjectExportService.getInstance().clearProgressCallback();
    vi.restoreAllMocks();
  });

  it('exports a real project PDF preserving prose, markup and template delimiters literally', async () => {
    const progress = vi.fn();
    const service = ProjectExportService.getInstance();
    service.setProgressCallback(progress);

    const result = await service.exportPDF(projectFixture());

    expect(result).toEqual({ success: true, filePath: 'pdf_security_control_report.pdf' });
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0];
    expect(blob).toBeInstanceOf(Blob);
    const pdf = await readPDF(blob as Blob);
    expect(pdf.startsWith('%PDF-')).toBe(true);
    expect(pdf).toContain('%%EOF');
    expect(pdf).toContain('Ordinary scene');
    expect(pdf).toContain(literalText);
    expect(htmlSpy).not.toHaveBeenCalled();
    expect(progress).toHaveBeenLastCalledWith(100, 'Export complete');
  });

  it('retains validation errors without generating a PDF for an empty project', async () => {
    const result = await ProjectExportService.getInstance().exportPDF({
      ...projectFixture(),
      shots: [],
    });

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Validation failed');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(htmlSpy).not.toHaveBeenCalled();
  });

  // This service currently has no UI consumer; cover its existing public API
  // without presenting it as a live application entry point.
  it('exports a real conversation PDF with metadata and literal user text', async () => {
    const service = ConversationExportService.getInstance();
    const id = service.saveConversation([{
      id: 'message-1',
      type: 'user',
      content: literalText,
      timestamp: new Date('2026-10-29T12:00:00Z'),
    }], 'Saved conversation');

    const pdf = await readPDF(await service.exportConversation(id, options));

    expect(pdf.startsWith('%PDF-')).toBe(true);
    expect(pdf).toContain('%%EOF');
    expect(pdf).toContain('Conversation export control');
    expect(pdf).toContain('Test author');
    expect(pdf).toContain(literalText);
    expect(htmlSpy).not.toHaveBeenCalled();
  });

  it('preserves conversation anonymization without dropping assistant prose', async () => {
    const service = ConversationExportService.getInstance();
    const timestamp = new Date('2026-10-29T12:00:00Z');
    const id = service.saveConversation([
      { id: 'user', type: 'user', content: 'private-user-content', timestamp },
      { id: 'assistant', type: 'assistant', content: 'Public assistant prose', timestamp },
    ], 'Anonymization control');

    const pdf = await readPDF(await service.exportConversation(id, { ...options, anonymize: true }));

    expect(pdf).not.toContain('private-user-content');
    expect(pdf).toContain('Public assistant prose');
    expect(htmlSpy).not.toHaveBeenCalled();
  });

  it('retains the missing conversation error', async () => {
    await expect(ConversationExportService.getInstance().exportConversation('missing', options))
      .rejects.toThrow('Conversation not found');
    expect(htmlSpy).not.toHaveBeenCalled();
  });
});
