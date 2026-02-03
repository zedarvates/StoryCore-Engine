export interface TextLayer {
  id: string;
  text: string;
  style: {
    fontFamily: string;
    fontSize: number;
    fontWeight: 'normal' | 'bold' | 'lighter';
    fontStyle: 'normal' | 'italic' | 'oblique';
    textDecoration: 'none' | 'underline' | 'line-through';
    textAlign: 'left' | 'center' | 'right';
    color: string;
    backgroundColor: string;
    textShadow: string;
    letterSpacing?: number;
    lineHeight?: number;
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  };
  position: { x: number; y: number };
  size: { width: number; height: number };
  isSelected?: boolean;
  animation?: {
    type: 'fade-in' | 'slide-in' | 'typing' | 'none';
    duration: number;
    delay?: number;
  };
}
