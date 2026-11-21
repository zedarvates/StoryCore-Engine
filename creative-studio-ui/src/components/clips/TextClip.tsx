import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Type, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Palette, Settings, Play, Pause } from 'lucide-react';

import { TextStyle, TextAnimation } from '../../types/text-layer';

interface TextClipProps {
  text: string;
  style: TextStyle;
  animation?: TextAnimation;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isSelected: boolean;
  isPlaying: boolean;
  currentTime: number;
  onTextChange: (text: string) => void;
  onStyleChange: (style: Partial<TextStyle>) => void;
  onAnimationChange: (animation?: TextAnimation) => void;
  onPositionChange: (position: { x: number; y: number }) => void;
  onSizeChange: (size: { width: number; height: number }) => void;
  onSelect: () => void;
}

const FONT_FAMILIES = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Impact',
  'Comic Sans MS',
  'Courier New',
  'Lucida Console',
  'System UI',
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Source Sans Pro'
];

const TEXT_ANIMATIONS: Omit<TextAnimation, 'duration' | 'delay'>[] = [
  { id: 'none', name: 'No Animation', type: 'fade', easing: 'linear' },
  { id: 'fade-in', name: 'Fade In', type: 'fade', easing: 'ease-in' },
  { id: 'slide-left', name: 'Slide from Left', type: 'slide', direction: 'left', easing: 'ease-out' },
  { id: 'slide-right', name: 'Slide from Right', type: 'slide', direction: 'right', easing: 'ease-out' },
  { id: 'slide-up', name: 'Slide from Bottom', type: 'slide', direction: 'up', easing: 'ease-out' },
  { id: 'slide-down', name: 'Slide from Top', type: 'slide', direction: 'down', easing: 'ease-out' },
  { id: 'scale-in', name: 'Scale In', type: 'scale', easing: 'ease-out', intensity: 0.5 },
  { id: 'bounce-in', name: 'Bounce In', type: 'bounce', easing: 'ease-out' },
  { id: 'rotate-in', name: 'Rotate In', type: 'rotate', easing: 'ease-out', intensity: 180 },
  { id: 'typewriter', name: 'Typewriter', type: 'typewriter', easing: 'linear' },
  { id: 'glow', name: 'Glow Effect', type: 'glow', easing: 'ease-in-out' }
];

export function TextClip({
  text,
  style,
  animation,
  position,
  size,
  isSelected,
  isPlaying,
  currentTime,
  onTextChange,
  onStyleChange,
  onAnimationChange,
  onPositionChange,
  onSizeChange,
  onSelect
}: TextClipProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0 });

  const textRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Animation state
  const [animationProgress, setAnimationProgress] = useState(0);
  const [displayedText, setDisplayedText] = useState(text);

  // Handle text editing
  const handleTextEdit = useCallback(() => {
    setIsEditing(true);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 0);
  }, []);

  const handleTextSave = useCallback(() => {
    if (inputRef.current) {
      onTextChange(inputRef.current.value);
    }
    setIsEditing(false);
  }, [onTextChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  }, [handleTextSave]);

  // Handle dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target !== textRef.current) return;

    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    onSelect();
  }, [position, onSelect]);

  // Handle resizing
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({ width: size.width, height: size.height });
  }, [size]);

  // Global mouse events for dragging and resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        onPositionChange({ x: newX, y: newY });
      } else if (isResizing) {
        const deltaX = e.clientX - (position.x + size.width);
        const deltaY = e.clientY - (position.y + size.height);
        const newWidth = Math.max(50, resizeStart.width + deltaX);
        const newHeight = Math.max(30, resizeStart.height + deltaY);
        onSizeChange({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, position, size, onPositionChange, onSizeChange]);

  // Animation logic
  useEffect(() => {
    if (!animation || !isPlaying) {
      setAnimationProgress(0);
      setDisplayedText(text);
      return;
    }

    const startTime = animation.delay;
    const endTime = startTime + animation.duration;

    if (currentTime < startTime) {
      setAnimationProgress(0);
      if (animation.type === 'typewriter') {
        setDisplayedText('');
      }
    } else if (currentTime >= endTime) {
      setAnimationProgress(1);
      setDisplayedText(text);
    } else {
      const progress = (currentTime - startTime) / animation.duration;
      setAnimationProgress(progress);

      // Typewriter effect
      if (animation.type === 'typewriter') {
        const charCount = Math.floor(progress * text.length);
        setDisplayedText(text.substring(0, charCount));
      }
    }
  }, [animation, currentTime, isPlaying, text]);

  // Calculate animation transform
  const getAnimationTransform = (): React.CSSProperties => {
    if (!animation || animationProgress === 0) return {};

    const { type, direction, intensity = 1 } = animation;
    const progress = animationProgress;

    switch (type) {
      case 'fade':
        return { opacity: progress };

      case 'slide':
        const slideDistance = 100 * intensity;
        let translateX = 0, translateY = 0;
        switch (direction) {
          case 'left': translateX = -slideDistance * (1 - progress); break;
          case 'right': translateX = slideDistance * (1 - progress); break;
          case 'up': translateY = slideDistance * (1 - progress); break;
          case 'down': translateY = -slideDistance * (1 - progress); break;
        }
        return { transform: `translate(${translateX}px, ${translateY}px)` };

      case 'scale':
        const scale = 1 - ((1 - (intensity || 0.5)) * (1 - progress));
        return { transform: `scale(${scale})` };

      case 'rotate':
        const rotation = (intensity || 180) * (1 - progress);
        return { transform: `rotate(${rotation}deg)` };

      case 'bounce':
        const bounceProgress = 1 - progress;
        const bounce = Math.sin(bounceProgress * Math.PI * 2) * bounceProgress * 50;
        return { transform: `translateY(${bounce}px)` };

      case 'glow':
        const glowIntensity = progress * 10;
        return { textShadow: `0 0 ${glowIntensity}px ${style.color}` };

      default:
        return {};
    }
  };

  // Style object for the text element
  const textStyle: React.CSSProperties = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: size.width,
    height: size.height,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    textDecoration: style.textDecoration,
    textAlign: style.textAlign,
    color: style.color,
    backgroundColor: style.backgroundColor || 'transparent',
    textShadow: style.textShadow,
    letterSpacing: style.letterSpacing,
    lineHeight: style.lineHeight,
    textTransform: style.textTransform,
    border: isSelected ? '2px solid #7c3aed' : 'none',
    cursor: isEditing ? 'text' : 'move',
    padding: '8px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    userSelect: 'none',
    ...getAnimationTransform()
  };

  return (
    <>
      <div
        ref={textRef}
        style={textStyle}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleTextEdit}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
        className="text-clip"
      >
        {isEditing ? (
          <textarea
            ref={inputRef}
            defaultValue={text}
            onKeyDown={handleKeyDown}
            onBlur={handleTextSave}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'inherit',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              fontWeight: 'inherit',
              fontStyle: 'inherit',
              textAlign: 'inherit',
              resize: 'none'
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
            {displayedText || 'Double-click to edit text'}
          </div>
        )}
      </div>

      {/* Resize handle */}
      {isSelected && !isEditing && (
        <div
          style={{
            position: 'absolute',
            left: position.x + size.width - 10,
            top: position.y + size.height - 10,
            width: 20,
            height: 20,
            cursor: 'nw-resize',
            background: '#7c3aed',
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
          onMouseDown={handleResizeMouseDown}
        />
      )}

      {/* Control panel */}
      {isSelected && showControls && !isEditing && (
        <div className="text-clip-controls">
          <div className="control-group">
            <select
              value={style.fontFamily}
              onChange={(e) => onStyleChange({ fontFamily: e.target.value })}
              title="Font Family"
            >
              {FONT_FAMILIES.map(font => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>

            <input
              type="number"
              min="8"
              max="200"
              value={style.fontSize}
              onChange={(e) => onStyleChange({ fontSize: parseInt(e.target.value) })}
              title="Font Size"
            />

            <input
              type="color"
              value={style.color}
              onChange={(e) => onStyleChange({ color: e.target.value })}
              title="Text Color"
            />
          </div>

          <div className="control-group">
            <button
              className={style.fontWeight === 'bold' ? 'active' : ''}
              onClick={() => onStyleChange({ fontWeight: style.fontWeight === 'bold' ? 'normal' : 'bold' })}
              title="Bold"
            >
              <Bold size={16} />
            </button>

            <button
              className={style.fontStyle === 'italic' ? 'active' : ''}
              onClick={() => onStyleChange({ fontStyle: style.fontStyle === 'italic' ? 'normal' : 'italic' })}
              title="Italic"
            >
              <Italic size={16} />
            </button>

            <button
              className={style.textDecoration === 'underline' ? 'active' : ''}
              onClick={() => onStyleChange({ textDecoration: style.textDecoration === 'underline' ? 'none' : 'underline' })}
              title="Underline"
            >
              <Underline size={16} />
            </button>
          </div>

          <div className="control-group">
            <button
              className={style.textAlign === 'left' ? 'active' : ''}
              onClick={() => onStyleChange({ textAlign: 'left' })}
              title="Align Left"
            >
              <AlignLeft size={16} />
            </button>

            <button
              className={style.textAlign === 'center' ? 'active' : ''}
              onClick={() => onStyleChange({ textAlign: 'center' })}
              title="Align Center"
            >
              <AlignCenter size={16} />
            </button>

            <button
              className={style.textAlign === 'right' ? 'active' : ''}
              onClick={() => onStyleChange({ textAlign: 'right' })}
              title="Align Right"
            >
              <AlignRight size={16} />
            </button>
          </div>

          <div className="control-group">
            <select
              value={animation?.id || 'none'}
              onChange={(e) => {
                const selectedAnim = TEXT_ANIMATIONS.find(a => a.id === e.target.value);
                if (selectedAnim) {
                  onAnimationChange({
                    ...selectedAnim,
                    duration: 1.0,
                    delay: 0
                  });
                } else {
                  onAnimationChange(undefined);
                }
              }}
              title="Text Animation"
            >
              {TEXT_ANIMATIONS.map(anim => (
                <option key={anim.id} value={anim.id}>{anim.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </>
  );
}