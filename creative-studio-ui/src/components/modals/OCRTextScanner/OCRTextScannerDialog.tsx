/**
 * OCR Text Scanner Dialog Component
 * 
 * A dialog for scanning and editing text from images, inspired by CapCut's text scanning feature.
 * Provides:
 * - Image loading and preview with text block highlighting
 * - Language selection for OCR
 * - Real-time OCR progress feedback
 * - Editable text blocks with inline editing
 * - Text styling options (font size, family)
 * - Copy to clipboard functionality
 * - Export edited text
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Scan, 
  Loader2, 
  Copy, 
  Check, 
  Download,
  Trash2,
  Edit3,
  Type,
  Languages,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  GripVertical
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  ocrService, 
  SUPPORTED_LANGUAGES, 
  type TextBlock, 
  type OCRResult, 
  type OCRProgress,
  type OCRLanguage 
} from '@/services/ocrService';

// ============================================================================
// Types
// ============================================================================

export interface OCRTextScannerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageSource: string | HTMLImageElement | HTMLCanvasElement | Blob | File | null;
  onTextExtracted?: (text: string, blocks: TextBlock[]) => void;
  onTextEdited?: (blocks: TextBlock[]) => void;
}

interface EditableTextBlock extends TextBlock {
  isEditing: boolean;
  originalText: string;
}

// ============================================================================
// Component
// ============================================================================

export function OCRTextScannerDialog({
  isOpen,
  onClose,
  imageSource,
  onTextExtracted,
  onTextEdited,
}: OCRTextScannerDialogProps) {
  const { toast } = useToast();
  
  // Refs
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // OCR State
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<OCRProgress>({ progress: 0, status: '' });
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<OCRLanguage>('eng');
  
  // Text blocks state
  const [textBlocks, setTextBlocks] = useState<EditableTextBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  
  // View state
  const [zoom, setZoom] = useState(1);
  const [showOverlay, setShowOverlay] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(50);
  const [activeTab, setActiveTab] = useState('scan');
  
  // Copy state
  const [copied, setCopied] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen && imageSource) {
      // Auto-scan when dialog opens
      handleScan();
    } else if (!isOpen) {
      // Reset state on close
      setOcrResult(null);
      setTextBlocks([]);
      setSelectedBlockId(null);
      setZoom(1);
      setActiveTab('scan');
    }
  }, [isOpen, imageSource]);

  // Update displayed blocks when confidence threshold changes
  useEffect(() => {
    if (ocrResult) {
      const filtered = ocrService.filterByConfidence(ocrResult.blocks, confidenceThreshold);
      setTextBlocks(filtered.map(block => ({
        ...block,
        isEditing: false,
        originalText: block.text,
      })));
    }
  }, [ocrResult, confidenceThreshold]);

  // Draw image and overlay when blocks or zoom change
  useEffect(() => {
    if (imageRef.current && canvasRef.current && showOverlay && textBlocks.length > 0) {
      drawOverlay();
    }
  }, [textBlocks, zoom, showOverlay, selectedBlockId]);

  /**
   * Draw text block overlay on canvas
   */
  const drawOverlay = useCallback(() => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !img.complete) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = img.naturalWidth * zoom;
    canvas.height = img.naturalHeight * zoom;
    
    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // Draw text block highlights
    textBlocks.forEach(block => {
      const x = block.bbox.x0 * zoom;
      const y = block.bbox.y0 * zoom;
      const width = (block.bbox.x1 - block.bbox.x0) * zoom;
      const height = (block.bbox.y1 - block.bbox.y0) * zoom;
      
      // Highlight color based on confidence
      const confidence = block.confidence;
      let color = 'rgba(59, 130, 246, 0.3)'; // Blue for high confidence
      if (confidence < 70) {
        color = 'rgba(234, 179, 8, 0.3)'; // Yellow for medium
      }
      if (confidence < 50) {
        color = 'rgba(239, 68, 68, 0.3)'; // Red for low
      }
      
      // Draw highlight
      ctx.fillStyle = color;
      ctx.fillRect(x, y, width, height);
      
      // Draw border for selected block
      if (block.id === selectedBlockId) {
        ctx.strokeStyle = 'rgba(59, 130, 246, 1)';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);
      }
      
      // Draw confidence badge
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(x, y - 20, 50, 20);
      ctx.fillStyle = 'white';
      ctx.font = '12px sans-serif';
      ctx.fillText(`${Math.round(confidence)}%`, x + 5, y - 6);
    });
  }, [textBlocks, zoom, selectedBlockId]);

  /**
   * Handle OCR scan
   */
  const handleScan = async () => {
    if (!imageSource) {
      toast({
        title: 'No Image',
        description: 'Please provide an image to scan',
        variant: 'destructive',
      });
      return;
    }
    
    setIsScanning(true);
    setScanProgress({ progress: 0, status: 'Initializing...' });
    
    try {
      const result = await ocrService.recognizeText(imageSource, {
        language: selectedLanguage,
        onProgress: (progress) => {
          setScanProgress(progress);
        },
      });
      
      setOcrResult(result);
      
      toast({
        title: 'Scan Complete',
        description: `Found ${result.blocks.length} text blocks in ${result.processingTime}ms`,
      });
      
      // Notify parent
      onTextExtracted?.(result.text, result.blocks);
      
      // Switch to edit tab after scanning
      setActiveTab('edit');
      
    } catch (error) {
      console.error('OCR scan failed:', error);
      toast({
        title: 'Scan Failed',
        description: error instanceof Error ? error.message : 'Failed to scan image',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  /**
   * Handle block selection
   */
  const handleBlockSelect = (blockId: string) => {
    setSelectedBlockId(blockId);
  };

  /**
   * Handle text edit
   */
  const handleTextEdit = (blockId: string, newText: string) => {
    setTextBlocks(prev => prev.map(block => 
      block.id === blockId 
        ? { ...block, text: newText }
        : block
    ));
  };

  /**
   * Toggle block editing mode
   */
  const toggleBlockEditing = (blockId: string) => {
    setTextBlocks(prev => prev.map(block => 
      block.id === blockId 
        ? { ...block, isEditing: !block.isEditing }
        : block
    ));
  };

  /**
   * Delete a text block
   */
  const handleDeleteBlock = (blockId: string) => {
    setTextBlocks(prev => prev.filter(block => block.id !== blockId));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  };

  /**
   * Reset block to original text
   */
  const handleResetBlock = (blockId: string) => {
    setTextBlocks(prev => prev.map(block => 
      block.id === blockId 
        ? { ...block, text: block.originalText }
        : block
    ));
  };

  /**
   * Copy all text to clipboard
   */
  const handleCopyAll = async () => {
    const allText = textBlocks.map(b => b.text).join('\n\n');
    try {
      await navigator.clipboard.writeText(allText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied!',
        description: 'All text copied to clipboard',
      });
    } catch {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy text to clipboard',
        variant: 'destructive',
      });
    }
  };

  /**
   * Export edited text
   */
  const handleExport = () => {
    const allText = textBlocks.map(b => b.text).join('\n\n');
    const blob = new Blob([allText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted-text.txt';
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Exported',
      description: 'Text exported successfully',
    });
  };

  /**
   * Apply edits and notify parent
   */
  const handleApplyEdits = () => {
    onTextEdited?.(textBlocks);
    toast({
      title: 'Changes Applied',
      description: 'Text changes have been applied',
    });
  };

  /**
   * Get image source URL
   */
  const getImageUrl = (): string | null => {
    if (!imageSource) return null;
    if (typeof imageSource === 'string') return imageSource;
    if (typeof imageSource === 'object') {
      if ('src' in imageSource && typeof imageSource.src === 'string') {
        return imageSource.src; // HTMLImageElement
      }
      if ('toDataURL' in imageSource && typeof imageSource.toDataURL === 'function') {
        return imageSource.toDataURL(); // HTMLCanvasElement
      }
      if (imageSource instanceof Blob) {
        return URL.createObjectURL(imageSource);
      }
    }
    return null;
  };

  const imageUrl = getImageUrl();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5 text-primary" />
            Text Scanner
          </DialogTitle>
          <DialogDescription>
            Scan and edit text from your image
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan" className="gap-1">
              <ImageIcon className="w-4 h-4" /> Scan
            </TabsTrigger>
            <TabsTrigger value="edit" className="gap-1" disabled={!ocrResult}>
              <Edit3 className="w-4 h-4" /> Edit Text
            </TabsTrigger>
          </TabsList>

          {/* Scan Tab */}
          <TabsContent value="scan" className="flex-1 overflow-hidden flex flex-col mt-4">
            {/* Language Selection */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm">Language:</Label>
              </div>
              <Select value={selectedLanguage} onValueChange={(v) => setSelectedLanguage(v as OCRLanguage)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.nativeName} ({lang.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                onClick={handleScan} 
                disabled={isScanning || !imageSource}
                className="ml-auto gap-2"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Scan className="w-4 h-4" />
                    Scan Text
                  </>
                )}
              </Button>
            </div>

            {/* Progress Bar */}
            {isScanning && (
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {scanProgress.status}
                  </span>
                  <span>{Math.round(scanProgress.progress)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${scanProgress.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Image Preview */}
            <div className="flex-1 relative border rounded-lg overflow-hidden bg-muted/20 min-h-[300px]">
              {imageUrl ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* Hidden image for reference */}
                  <img 
                    ref={imageRef}
                    src={imageUrl}
                    alt="Source"
                    className="hidden"
                    crossOrigin="anonymous"
                    onLoad={() => {
                      if (showOverlay && textBlocks.length > 0) {
                        drawOverlay();
                      }
                    }}
                  />
                  
                  {/* Display canvas with overlay or image */}
                  {showOverlay && textBlocks.length > 0 ? (
                    <canvas 
                      ref={canvasRef}
                      className="max-w-full max-h-full object-contain"
                      style={{ 
                        transform: `scale(${zoom})`,
                        transformOrigin: 'center'
                      }}
                    />
                  ) : (
                    <img 
                      src={imageUrl}
                      alt="Source"
                      className="max-w-full max-h-full object-contain"
                      style={{ 
                        transform: `scale(${zoom})`,
                        transformOrigin: 'center'
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No image loaded</p>
                  </div>
                </div>
              )}
            </div>

            {/* Zoom and Overlay Controls */}
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setZoom(z => Math.min(2, z + 0.1))}
                  disabled={zoom >= 2}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setZoom(1)}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
              
              <Separator orientation="vertical" className="h-6" />
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={showOverlay}
                  onCheckedChange={setShowOverlay}
                  id="show-overlay"
                />
                <Label htmlFor="show-overlay" className="text-sm flex items-center gap-1">
                  {showOverlay ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  Show Overlay
                </Label>
              </div>
            </div>

            {/* OCR Result Summary */}
            {ocrResult && (
              <div className="flex items-center gap-4 mt-4 p-3 bg-muted/30 rounded-lg">
                <Badge variant="secondary">
                  {textBlocks.length} text blocks
                </Badge>
                <Badge variant="secondary">
                  {Math.round(ocrResult.confidence)}% avg. confidence
                </Badge>
                <Badge variant="secondary">
                  {ocrResult.processingTime}ms
                </Badge>
              </div>
            )}
          </TabsContent>

          {/* Edit Tab */}
          <TabsContent value="edit" className="flex-1 overflow-hidden flex flex-col mt-4">
            {ocrResult ? (
              <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
                {/* Left: Image with selection */}
                <div className="border rounded-lg overflow-hidden bg-muted/20">
                  <div className="p-2 bg-muted/50 border-b flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">Image Preview</span>
                  </div>
                  <div className="relative h-[calc(100%-40px)] flex items-center justify-center">
                    {imageUrl && (
                      <canvas 
                        ref={canvasRef}
                        className="max-w-full max-h-full object-contain"
                        style={{ 
                          transform: `scale(${zoom})`,
                          transformOrigin: 'center'
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Right: Text blocks editor */}
                <div className="border rounded-lg overflow-hidden flex flex-col">
                  <div className="p-2 bg-muted/50 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Type className="w-4 h-4" />
                      <span className="text-sm font-medium">Text Blocks</span>
                      <Badge variant="secondary" className="text-xs">
                        {textBlocks.length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleCopyAll}
                        className="gap-1"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        Copy All
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleExport}
                        className="gap-1"
                      >
                        <Download className="w-4 h-4" />
                        Export
                      </Button>
                    </div>
                  </div>
                  
                  {/* Confidence Filter */}
                  <div className="p-3 border-b">
                    <div className="flex items-center gap-4">
                      <Label className="text-xs whitespace-nowrap">Min Confidence:</Label>
                      <Slider
                        value={[confidenceThreshold]}
                        onValueChange={([v]) => setConfidenceThreshold(v)}
                        min={0}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                      <span className="text-xs w-8">{confidenceThreshold}%</span>
                    </div>
                  </div>
                  
                  {/* Text Blocks List */}
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-2">
                      {textBlocks.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No text blocks found</p>
                          <p className="text-xs">Try adjusting the confidence threshold</p>
                        </div>
                      ) : (
                        textBlocks.map((block, index) => (
                          <div 
                            key={block.id}
                            className={`border rounded-lg overflow-hidden transition-all ${
                              selectedBlockId === block.id 
                                ? 'border-primary ring-2 ring-primary/20' 
                                : 'border-border hover:border-muted-foreground/50'
                            }`}
                            onClick={() => handleBlockSelect(block.id)}
                          >
                            {/* Block Header */}
                            <div className="flex items-center gap-2 p-2 bg-muted/30 cursor-pointer"
                                 onClick={() => toggleBlockEditing(block.id)}>
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                              <Badge variant="outline" className="text-xs">
                                #{index + 1}
                              </Badge>
                              <Badge 
                                variant={block.confidence >= 80 ? 'default' : block.confidence >= 60 ? 'secondary' : 'destructive'}
                                className="text-xs"
                              >
                                {Math.round(block.confidence)}%
                              </Badge>
                              {block.text !== block.originalText && (
                                <Badge variant="outline" className="text-xs text-yellow-600">
                                  Modified
                                </Badge>
                              )}
                              <div className="flex-1" />
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleResetBlock(block.id);
                                }}
                                disabled={block.text === block.originalText}
                              >
                                <RotateCcw className="w-3 h-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteBlock(block.id);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                              {block.isEditing ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                            
                            {/* Block Content */}
                            {block.isEditing && (
                              <div className="p-2 border-t">
                                <Textarea
                                  value={block.text}
                                  onChange={(e) => handleTextEdit(block.id, e.target.value)}
                                  placeholder="Edit text..."
                                  className="min-h-[80px] resize-none"
                                />
                                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                                  <span>{block.text.length} characters</span>
                                  <span>Font size: ~{block.fontSize}px</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Scan className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Scan an image first to edit text</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleApplyEdits}
            disabled={!ocrResult || textBlocks.length === 0}
            className="gap-2"
          >
            <Check className="w-4 h-4" />
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default OCRTextScannerDialog;