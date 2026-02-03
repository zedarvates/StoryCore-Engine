import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ContentRenderer, detectContentFormat } from '../ContentRenderer';

describe('detectContentFormat', () => {
  describe('markdown detection', () => {
    it('should detect markdown headers', () => {
      expect(detectContentFormat('# Title')).toBe('markdown');
      expect(detectContentFormat('## Subtitle')).toBe('markdown');
      expect(detectContentFormat('### Section')).toBe('markdown');
      expect(detectContentFormat('#### Subsection')).toBe('markdown');
    });

    it('should detect markdown emphasis (bold)', () => {
      expect(detectContentFormat('**bold text**')).toBe('markdown');
      expect(detectContentFormat('__bold text__')).toBe('markdown');
      expect(detectContentFormat('Some **bold** text')).toBe('markdown');
    });

    it('should detect markdown emphasis (italic)', () => {
      expect(detectContentFormat('*italic text*')).toBe('markdown');
      expect(detectContentFormat('_italic text_')).toBe('markdown');
      expect(detectContentFormat('Some *italic* text')).toBe('markdown');
    });

    it('should detect markdown unordered lists', () => {
      expect(detectContentFormat('- list item')).toBe('markdown');
      expect(detectContentFormat('* list item')).toBe('markdown');
      expect(detectContentFormat('+ list item')).toBe('markdown');
      expect(detectContentFormat('  - indented item')).toBe('markdown');
    });

    it('should detect markdown ordered lists', () => {
      expect(detectContentFormat('1. first item')).toBe('markdown');
      expect(detectContentFormat('2. second item')).toBe('markdown');
      expect(detectContentFormat('  1. indented item')).toBe('markdown');
    });

    it('should detect markdown links', () => {
      expect(detectContentFormat('[link text](url)')).toBe('markdown');
      expect(detectContentFormat('Check [this link](https://example.com)')).toBe('markdown');
    });
  });

  describe('plaintext detection', () => {
    it('should return plaintext for no markdown', () => {
      expect(detectContentFormat('Just plain text')).toBe('plaintext');
      expect(detectContentFormat('Multiple lines\nof plain text')).toBe('plaintext');
    });

    it('should return plaintext for empty strings', () => {
      expect(detectContentFormat('')).toBe('plaintext');
      expect(detectContentFormat('   ')).toBe('plaintext');
    });

    it('should return plaintext for text with special characters but no markdown', () => {
      expect(detectContentFormat('Text with @ symbols')).toBe('plaintext');
      expect(detectContentFormat('Text with $ and %')).toBe('plaintext');
    });
  });

  describe('edge cases', () => {
    it('should handle mixed content', () => {
      const mixed = 'Plain text\n# Header\nMore text';
      expect(detectContentFormat(mixed)).toBe('markdown');
    });

    it('should handle false positives', () => {
      // Single asterisk not surrounded by matching pair
      expect(detectContentFormat('Price: $5 * 2 = $10')).toBe('plaintext');
    });
  });
});

describe('ContentRenderer', () => {
  describe('markdown rendering', () => {
    it('should render markdown headers correctly', () => {
      const content = '# Header 1\n## Header 2';
      const { container } = render(<ContentRenderer content={content} />);
      
      expect(container.querySelector('h1')).toHaveTextContent('Header 1');
      expect(container.querySelector('h2')).toHaveTextContent('Header 2');
    });

    it('should render markdown emphasis correctly', () => {
      const content = '**bold** and *italic*';
      const { container } = render(<ContentRenderer content={content} />);
      
      expect(container.querySelector('strong')).toHaveTextContent('bold');
      expect(container.querySelector('em')).toHaveTextContent('italic');
    });

    it('should render markdown lists correctly', () => {
      const content = '- item 1\n- item 2';
      const { container } = render(<ContentRenderer content={content} />);
      
      expect(container.querySelector('ul')).toBeInTheDocument();
      expect(container.querySelectorAll('li')).toHaveLength(2);
    });

    it('should apply markdown CSS class', () => {
      const content = '# Header';
      const { container } = render(<ContentRenderer content={content} />);
      
      expect(container.querySelector('.story-content-markdown')).toBeInTheDocument();
    });
  });

  describe('plain text rendering', () => {
    it('should preserve line breaks in plain text', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const { container } = render(<ContentRenderer content={content} />);
      
      const pre = container.querySelector('pre');
      expect(pre).toBeInTheDocument();
      expect(pre?.textContent).toBe(content);
    });

    it('should apply plaintext CSS class', () => {
      const content = 'Plain text content';
      const { container } = render(<ContentRenderer content={content} />);
      
      expect(container.querySelector('.story-content-plaintext')).toBeInTheDocument();
    });

    it('should preserve whitespace', () => {
      const content = 'Text with    multiple   spaces';
      const { container } = render(<ContentRenderer content={content} />);
      
      const pre = container.querySelector('pre');
      expect(pre?.textContent).toBe(content);
    });
  });

  describe('placeholder rendering', () => {
    it('should display placeholder for undefined content', () => {
      const { getByText } = render(<ContentRenderer content={undefined as any} />);
      expect(getByText(/No story content available/i)).toBeInTheDocument();
    });

    it('should display placeholder for null content', () => {
      const { getByText } = render(<ContentRenderer content={null as any} />);
      expect(getByText(/No story content available/i)).toBeInTheDocument();
    });

    it('should display placeholder for empty content', () => {
      const { getByText } = render(<ContentRenderer content="" />);
      expect(getByText(/Story content is empty/i)).toBeInTheDocument();
    });

    it('should display placeholder for whitespace-only content', () => {
      const { getByText } = render(<ContentRenderer content="   " />);
      expect(getByText(/Story content is empty/i)).toBeInTheDocument();
    });

    it('should apply placeholder CSS class for undefined', () => {
      const { container } = render(<ContentRenderer content={undefined as any} />);
      expect(container.querySelector('.story-content-placeholder')).toBeInTheDocument();
    });

    it('should apply empty CSS class for empty string', () => {
      const { container } = render(<ContentRenderer content="" />);
      expect(container.querySelector('.story-content-empty')).toBeInTheDocument();
    });
  });

  describe('CSS class application', () => {
    it('should apply custom className prop', () => {
      const content = '# Header';
      const { container } = render(<ContentRenderer content={content} className="custom-class" />);
      
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('should combine default and custom classes', () => {
      const content = 'Plain text';
      const { container } = render(<ContentRenderer content={content} className="custom-class" />);
      
      const element = container.querySelector('.story-content-plaintext');
      expect(element).toBeInTheDocument();
      expect(element?.classList.contains('custom-class')).toBe(true);
    });
  });
});
