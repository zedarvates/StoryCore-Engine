import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextTemplates, TEXT_TEMPLATES } from '../TextTemplates';
import { useStore } from '../../store';

// Mock the store
vi.mock('../../store', () => ({
  useStore: vi.fn(),
}));

describe('TextTemplates', () => {
  const mockAddTextLayer = vi.fn();
  const mockOnTemplateApply = vi.fn();
  const shotId = 'test-shot-1';

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue(mockAddTextLayer);
  });

  it('renders all text templates', () => {
    render(<TextTemplates shotId={shotId} />);

    // Check that all templates are rendered
    TEXT_TEMPLATES.forEach((template) => {
      expect(screen.getByText(template.name)).toBeInTheDocument();
      expect(screen.getByText(template.description)).toBeInTheDocument();
    });
  });

  it('displays template count', () => {
    render(<TextTemplates shotId={shotId} />);

    expect(screen.getByText(`${TEXT_TEMPLATES.length} templates`)).toBeInTheDocument();
  });

  it('displays template previews with correct styling', () => {
    render(<TextTemplates shotId={shotId} />);

    TEXT_TEMPLATES.forEach((template) => {
      const previewElement = screen.getByText(template.preview);
      expect(previewElement).toBeInTheDocument();

      // Check font family
      if (template.style.font) {
        expect(previewElement).toHaveStyle({ fontFamily: template.style.font });
      }

      // Check color
      if (template.style.color) {
        expect(previewElement).toHaveStyle({ color: template.style.color });
      }

      // Check bold
      if (template.style.style?.bold) {
        expect(previewElement).toHaveStyle({ fontWeight: 'bold' });
      }

      // Check italic
      if (template.style.style?.italic) {
        expect(previewElement).toHaveStyle({ fontStyle: 'italic' });
      }
    });
  });

  it('displays animation badges for templates with animations', () => {
    render(<TextTemplates shotId={shotId} />);

    TEXT_TEMPLATES.forEach((template) => {
      if (template.style.animation) {
        expect(screen.getByText(template.style.animation.type)).toBeInTheDocument();
      }
    });
  });

  it('applies template when clicked', () => {
    render(<TextTemplates shotId={shotId} />);

    const firstTemplate = TEXT_TEMPLATES[0];
    const templateButton = screen.getByText(firstTemplate.name).closest('button');

    fireEvent.click(templateButton!);

    expect(mockAddTextLayer).toHaveBeenCalledTimes(1);
    expect(mockAddTextLayer).toHaveBeenCalledWith(
      shotId,
      expect.objectContaining({
        content: firstTemplate.preview,
        font: firstTemplate.style.font,
        fontSize: firstTemplate.style.fontSize,
        color: firstTemplate.style.color,
      })
    );
  });

  it('calls onTemplateApply callback when template is applied', () => {
    render(
      <TextTemplates shotId={shotId} onTemplateApply={mockOnTemplateApply} />
    );

    const firstTemplate = TEXT_TEMPLATES[0];
    const templateButton = screen.getByText(firstTemplate.name).closest('button');

    fireEvent.click(templateButton!);

    expect(mockOnTemplateApply).toHaveBeenCalledTimes(1);
    expect(mockOnTemplateApply).toHaveBeenCalledWith(firstTemplate);
  });

  it('creates text layer with correct default values', () => {
    render(<TextTemplates shotId={shotId} />);

    const boldTitleTemplate = TEXT_TEMPLATES.find((t) => t.id === 'title-bold');
    const templateButton = screen.getByText(boldTitleTemplate!.name).closest('button');

    fireEvent.click(templateButton!);

    expect(mockAddTextLayer).toHaveBeenCalledWith(
      shotId,
      expect.objectContaining({
        id: expect.stringContaining('text-'),
        content: boldTitleTemplate!.preview,
        font: 'Arial',
        fontSize: 72,
        color: '#ffffff',
        backgroundColor: 'transparent',
        alignment: 'center',
        position: { x: 50, y: 20 },
        startTime: 0,
        duration: 3,
        style: {
          bold: true,
          italic: false,
          underline: false,
        },
        animation: {
          type: 'fade-in',
          duration: 1.0,
          delay: 0,
          easing: 'ease-out',
        },
      })
    );
  });

  it('renders template with stroke style', () => {
    render(<TextTemplates shotId={shotId} />);

    const cinematicTemplate = TEXT_TEMPLATES.find((t) => t.id === 'title-cinematic');
    expect(screen.getByText(cinematicTemplate!.name)).toBeInTheDocument();
  });

  it('renders template with shadow style', () => {
    render(<TextTemplates shotId={shotId} />);

    const elegantTemplate = TEXT_TEMPLATES.find((t) => t.id === 'subtitle-elegant');
    expect(screen.getByText(elegantTemplate!.name)).toBeInTheDocument();
  });

  it('renders template with background color', () => {
    render(<TextTemplates shotId={shotId} />);

    const captionTemplate = TEXT_TEMPLATES.find((t) => t.id === 'caption-modern');
    expect(screen.getByText(captionTemplate!.name)).toBeInTheDocument();
  });

  it('displays hover effect on template buttons', () => {
    render(<TextTemplates shotId={shotId} />);

    const firstTemplate = TEXT_TEMPLATES[0];
    const templateButton = screen.getByText(firstTemplate.name).closest('button');

    expect(templateButton).toHaveClass('hover:border-blue-500');
    expect(templateButton).toHaveClass('hover:shadow-md');
  });

  it('renders all 8 predefined templates', () => {
    expect(TEXT_TEMPLATES).toHaveLength(8);

    const templateIds = TEXT_TEMPLATES.map((t) => t.id);
    expect(templateIds).toContain('title-bold');
    expect(templateIds).toContain('subtitle-elegant');
    expect(templateIds).toContain('caption-modern');
    expect(templateIds).toContain('title-cinematic');
    expect(templateIds).toContain('lower-third');
    expect(templateIds).toContain('typewriter-mono');
    expect(templateIds).toContain('title-minimal');
    expect(templateIds).toContain('title-bounce');
  });

  it('each template has required properties', () => {
    TEXT_TEMPLATES.forEach((template) => {
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('preview');
      expect(template).toHaveProperty('style');
      expect(template.style).toHaveProperty('font');
      expect(template.style).toHaveProperty('fontSize');
      expect(template.style).toHaveProperty('color');
    });
  });

  it('applies typewriter template with correct animation', () => {
    render(<TextTemplates shotId={shotId} />);

    const typewriterTemplate = TEXT_TEMPLATES.find((t) => t.id === 'typewriter-mono');
    const templateButton = screen.getByText(typewriterTemplate!.name).closest('button');

    fireEvent.click(templateButton!);

    expect(mockAddTextLayer).toHaveBeenCalledWith(
      shotId,
      expect.objectContaining({
        animation: {
          type: 'typewriter',
          duration: 2.0,
          delay: 0,
          easing: 'linear',
        },
      })
    );
  });

  it('applies lower third template with correct positioning', () => {
    render(<TextTemplates shotId={shotId} />);

    const lowerThirdTemplate = TEXT_TEMPLATES.find((t) => t.id === 'lower-third');
    const templateButton = screen.getByText(lowerThirdTemplate!.name).closest('button');

    fireEvent.click(templateButton!);

    expect(mockAddTextLayer).toHaveBeenCalledWith(
      shotId,
      expect.objectContaining({
        position: { x: 5, y: 75 },
        alignment: 'left',
        backgroundColor: 'rgba(0,120,215,0.9)',
      })
    );
  });

  it('applies bounce template with correct animation', () => {
    render(<TextTemplates shotId={shotId} />);

    const bounceTemplate = TEXT_TEMPLATES.find((t) => t.id === 'title-bounce');
    const templateButton = screen.getByText(bounceTemplate!.name).closest('button');

    fireEvent.click(templateButton!);

    expect(mockAddTextLayer).toHaveBeenCalledWith(
      shotId,
      expect.objectContaining({
        animation: {
          type: 'bounce',
          duration: 1.2,
          delay: 0,
          easing: 'ease-out',
        },
      })
    );
  });
});
