/**
 * Clipboard Indicator Component
 * 
 * Displays a visual indicator when clipboard contains shots
 * 
 * Requirements: 13.7
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClipboard } from '../../hooks/useClipboard';

export interface ClipboardIndicatorProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
  showDetails?: boolean;
}

export const ClipboardIndicator: React.FC<ClipboardIndicatorProps> = ({
  position = 'bottom-right',
  className = '',
  showDetails = true,
}) => {
  const { hasContent, count, operation, getSourceSequenceId, clipboardData } = useClipboard();

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  const operationIcon = operation === 'cut' ? '✂️' : '📋';
  const operationText = operation === 'cut' ? 'Cut' : 'Copied';
  const operationColor = operation === 'cut' ? 'bg-orange-600' : 'bg-blue-600';

  const sourceSequenceId = getSourceSequenceId();

  return (
    <AnimatePresence>
      {hasContent && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.2 }}
          className={`fixed ${positionClasses[position]} z-50 ${className}`}
        >
          <div className="bg-gray-800 dark:bg-gray-700 text-white rounded-lg shadow-lg overflow-hidden">
            {/* Header with operation indicator */}
            <div className={`${operationColor} px-4 py-2 flex items-center gap-2`}>
              <span className="text-xl">{operationIcon}</span>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {operationText} {count} {count === 1 ? 'shot' : 'shots'}
                </span>
                {showDetails && sourceSequenceId && (
                  <span className="text-xs opacity-80">
                    From: {sourceSequenceId}
                  </span>
                )}
              </div>
            </div>

            {/* Details section */}
            {showDetails && clipboardData && (
              <div className="px-4 py-2 bg-gray-900 dark:bg-gray-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Timestamp:</span>
                  <span className="text-gray-300">
                    {new Date(clipboardData.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-700">
                  <span className="text-gray-400">Press Ctrl+V to paste</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
