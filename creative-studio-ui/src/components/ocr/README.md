# OCR Text Scanner Component

A feature inspired by CapCut's text scanning functionality for extracting and editing text from images.

## Features

- **Text Recognition**: Uses Tesseract.js for accurate OCR
- **Multi-language Support**: 12 languages (English, French, Spanish, German, Italian, Portuguese, Chinese, Japanese, Korean, Arabic, Russian)
- **Visual Highlighting**: Shows detected text regions on the image
- **Confidence Filtering**: Filter results by confidence level
- **Inline Editing**: Edit extracted text directly in the UI
- **Export Options**: Copy to clipboard or export to file

## Installation

```bash
npm install tesseract.js
```

## Usage

### Basic Usage with OCRButton

```tsx
import { OCRButton } from '@/components/ocr';

function ImageEditor({ imageUrl }) {
  const handleTextExtracted = (text, blocks) => {
    console.log('Extracted text:', text);
    console.log('Text blocks:', blocks);
  };

  return (
    <OCRButton 
      imageSource={imageUrl}
      onTextExtracted={handleTextExtracted}
      label="Scan Text"
    />
  );
}
```

### Using the Hook

```tsx
import { useOCRScanner } from '@/components/ocr';

function MyComponent() {
  const { 
    openScanner, 
    text, 
    blocks, 
    isScanning,
    progress 
  } = useOCRScanner({
    onTextExtracted: (text) => console.log(text)
  });

  return (
    <button onClick={() => openScanner(imageUrl)}>
      Scan Image
    </button>
  );
}
```

### Quick Scan Button

For quick text extraction without the full dialog:

```tsx
import { QuickScanButton } from '@/components/ocr';

<QuickScanButton 
  imageSource={imageUrl}
  onScanComplete={(text) => console.log(text)}
/>
```

## Components

### OCRTextScannerDialog

Full-featured dialog for OCR scanning and text editing.

Props:
- `isOpen`: boolean - Dialog visibility
- `onClose`: () => void - Close callback
- `imageSource`: Image source (string, HTMLImageElement, HTMLCanvasElement, Blob, File)
- `onTextExtracted`: (text: string, blocks: TextBlock[]) => void
- `onTextEdited`: (blocks: TextBlock[]) => void

### OCRButton

Button component that opens the OCR dialog.

Props:
- `imageSource`: Image source
- `onTextExtracted`: Callback when text is extracted
- `onTextEdited`: Callback when text is edited
- `variant`: Button variant ('default' | 'outline' | 'ghost' | 'secondary')
- `size`: Button size ('default' | 'sm' | 'lg' | 'icon')
- `label`: Button label text
- `iconOnly`: Show only the icon

### QuickScanButton

Minimal button for quick scanning with auto-copy.

## Types

```typescript
interface TextBlock {
  id: string;
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  lines: TextLine[];
  fontSize?: number;
}

interface OCRResult {
  text: string;
  blocks: TextBlock[];
  confidence: number;
  imageWidth: number;
  imageHeight: number;
  processingTime: number;
}
```

## Integration Example

The OCR scanner is integrated into the `ImagePreviewPanel` component:

```tsx
// In ImagePreviewPanel.tsx
import { OCRButton } from '../ocr';

// In the card footer
<OCRButton
  imageSource={optimizedImageUrl}
  label="Scan Text"
  variant="outline"
  size="sm"
/>
```

## Supported Languages

| Code | Language |
|------|----------|
| eng | English |
| fra | French |
| spa | Spanish |
| deu | German |
| ita | Italian |
| por | Portuguese |
| chi_sim | Chinese (Simplified) |
| chi_tra | Chinese (Traditional) |
| jpn | Japanese |
| kor | Korean |
| ara | Arabic |
| rus | Russian |