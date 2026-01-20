/**
 * AlignmentGuides Component
 * 
 * Displays intelligent alignment guides when panels are close to each other
 * Exigence: 3.7
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AlignmentGuide } from '../../types/gridEditorAdvanced';

interface AlignmentGuidesProps {
  guides: AlignmentGuide[];
}

export const AlignmentGuides: React.FC<AlignmentGuidesProps> = ({ guides }) => {
  return (
    <svg
      className="alignment-guides"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000
      }}
    >
      <AnimatePresence>
        {guides.map((guide, index) => {
          if (guide.type === 'vertical') {
            return (
              <motion.line
                key={`v-guide-${index}`}
                x1={guide.position}
                y1={0}
                x2={guide.position}
                y2="100%"
                stroke="#00ff00"
                strokeWidth="2"
                strokeDasharray="5,5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            );
          } else {
            return (
              <motion.line
                key={`h-guide-${index}`}
                x1={0}
                y1={guide.position}
                x2="100%"
                y2={guide.position}
                stroke="#00ff00"
                strokeWidth="2"
                strokeDasharray="5,5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            );
          }
        })}
      </AnimatePresence>
    </svg>
  );
};
