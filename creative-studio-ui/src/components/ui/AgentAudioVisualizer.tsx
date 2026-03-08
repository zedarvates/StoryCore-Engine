import React, { useEffect, useState, useMemo, useRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { VoiceTextService } from '@/services/VoiceTextService';

// Derived from livekit-agent-starter-react styles
export const agentAudioVisualizerBarElementVariants = cva(
  [
    'rounded-full transition-all duration-75 ease-linear',
    'bg-purple-500/20 data-[highlighted=true]:bg-purple-500',
    'dark:bg-purple-500/30 dark:data-[highlighted=true]:bg-purple-400'
  ],
  {
    variants: {
      size: {
        icon: 'w-[4px] min-h-[4px]',
        sm: 'w-[8px] min-h-[8px]',
        md: 'w-[16px] min-h-[16px]',
        lg: 'w-[32px] min-h-[32px]',
        xl: 'w-[64px] min-h-[64px]',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export const agentAudioVisualizerBarVariants = cva('relative flex items-center justify-center', {
  variants: {
    size: {
      icon: 'h-[24px] gap-[2px]',
      sm: 'h-[56px] gap-[4px]',
      md: 'h-[112px] gap-[8px]',
      lg: 'h-[224px] gap-[16px]',
      xl: 'h-[448px] gap-[32px]',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export type AgentState = 'disconnected' | 'connecting' | 'listening' | 'thinking' | 'speaking';

export interface AgentAudioVisualizerProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof agentAudioVisualizerBarVariants> {
  state?: AgentState;
  barCount?: number;
}

/**
 * A bar-style audio visualizer that responds to voice volume and LLM state.
 * Adapts livekit UI style for standard AudioContext and VoiceTextService.
 */
export function AgentAudioVisualizer({
  size = 'md',
  state = 'disconnected',
  barCount = 5,
  className,
  ...props
}: AgentAudioVisualizerProps) {
  const [volume, setVolume] = useState<number>(0);
  const [highlightedIndices, setHighlightedIndices] = useState<number[]>([]);
  const animationFrameId = useRef<number | null>(null);

  // Hook into VoiceTextService for real-time volume
  useEffect(() => {
    let isActive = true;
    const voiceService = VoiceTextService.getInstance();
    
    const tickVolume = () => {
      if (!isActive) return;
      
      if (state === 'listening' || state === 'speaking') {
        // volume level is 0 - 100
        const vl = voiceService.getVolumeLevel();
        // convert to 0 - 1
        setVolume(Math.min(1, Math.max(0.05, vl / 100)));
      } else {
        setVolume(0.05); // Idle base 5% height
      }

      animationFrameId.current = requestAnimationFrame(tickVolume);
    };

    tickVolume();

    return () => {
      isActive = false;
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [state]);

  // Handle highlighted indices based on agent state (like the LiveKit animator)
  useEffect(() => {
    let index = 0;
    let sequence: number[][] = [[]];
    let interval = 1000;
    let isActive = true;

    // Generate sequences mimicking 'useAgentAudioVisualizerBarAnimator'
    if (state === 'thinking') {
      const center = Math.floor(barCount / 2);
      sequence = [[center], [-1]];
      interval = 150;
    } else if (state === 'connecting') {
      sequence = [];
      for (let x = 0; x < barCount; x++) {
        sequence.push([x, barCount - 1 - x]);
      }
      interval = 2000 / barCount;
    } else if (state === 'listening' || state === 'speaking') {
      // Highlights all bars rapidly during active audio
      sequence = [new Array(barCount).fill(0).map((_, i) => i)];
      interval = 100;
    } else {
      sequence = [[]];
      interval = 1000;
    }

    let startTime = performance.now();
    let runnerId: number;

    const runSequence = (time: number) => {
      if (!isActive) return;
      if (time - startTime >= interval) {
        index = (index + 1) % sequence.length;
        setHighlightedIndices(sequence[index] ?? []);
        startTime = time;
      }
      runnerId = requestAnimationFrame(runSequence);
    };

    runnerId = requestAnimationFrame(runSequence);

    return () => {
      isActive = false;
      cancelAnimationFrame(runnerId);
    };
  }, [state, barCount]);

  // Simulate multiband from a single volume (since we only expose 1 volume level currently)
  // For standard livekit, we'd have N bands. Here we create fake EQ variance around the main volume.
  const bands = useMemo(() => {
    if (state !== 'speaking' && state !== 'listening') {
      return new Array(barCount).fill(0.05);
    }
    
    return Array.from({ length: barCount }).map((_, i) => {
      // Add slight fake variance based on index position so it looks like EQ bars
      const variance = Math.sin(Date.now() / 100 + i) * 0.2; 
      let val = volume + variance * volume;
      val = Math.max(0.1, Math.min(1.0, val));
      return val;
    });
  }, [volume, barCount, state]);

  return (
    <div
      data-state={state}
      className={cn(agentAudioVisualizerBarVariants({ size }), className)}
      {...props}
    >
      {bands.map((band, idx) => (
        <div
          key={idx}
          data-highlighted={highlightedIndices.includes(idx)}
          style={{ height: `${band * 100}%` }}
          className={cn(agentAudioVisualizerBarElementVariants({ size }))}
        />
      ))}
    </div>
  );
}
