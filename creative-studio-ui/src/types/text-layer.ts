export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | 'lighter' | 'bolder';
  fontStyle: 'normal' | 'italic' | 'oblique';
  textDecoration: 'none' | 'underline' | 'line-through';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  color: string;
  backgroundColor: string;
  textShadow: string;
  letterSpacing: number;
  lineHeight: number;
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export interface TextAnimation {
  id: string;
  name: string;
  type: 'fade' | 'slide' | 'scale' | 'rotate' | 'bounce' | 'typewriter' | 'glow';
  duration: number;
  delay: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  direction?: 'left' | 'right' | 'up' | 'down';
  intensity?: number;
}

export interface TextLayer {
  id: string;
  text: string;
  style: TextStyle;
  animation?: TextAnimation;
  position: { x: number; y: number };
  size: { width: number; height: number };
  startTime?: number; // in seconds
  duration?: number; // in seconds
}
