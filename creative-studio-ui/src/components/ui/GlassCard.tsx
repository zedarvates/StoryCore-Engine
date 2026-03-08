import React from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'flat';
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, variant = 'default', intensity = 'medium', className, ...props }, ref) => {
    const intensityMap = {
      low: 'bg-white/5 backdrop-blur-sm border-white/5',
      medium: 'bg-white/10 backdrop-blur-md border-white/10',
      high: 'bg-white/20 backdrop-blur-lg border-white/20',
    };

    const variantMap = {
      default: 'glass-card',
      elevated: 'glass-panel',
      flat: 'bg-white/5 border border-white/10',
    };

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, cubicBezier: [0.4, 0, 0.2, 1] }}
        className={cn(
          'relative overflow-hidden rounded-2xl transition-all duration-300',
          intensityMap[intensity],
          variantMap[variant],
          className
        )}
        {...props}
      >
        {/* Inner shadow / Reflection effect */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/5 to-transparent" />
        
        <div className="relative z-10 p-6">
          {children}
        </div>

        {/* Glossy overlay on high intensity */}
        {intensity === 'high' && (
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/5 blur-3xl rounded-full pointer-events-none" />
        )}
      </motion.div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
