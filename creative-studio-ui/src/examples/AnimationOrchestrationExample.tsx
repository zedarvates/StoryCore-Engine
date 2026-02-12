/**
 * AnimationOrchestrationExample Component
 * 
 * Demonstrates animation orchestration to prevent visual conflicts.
 * Shows sequential, parallel, and staggered animation patterns.
 * 
 * Validates: Requirements 11.8
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  useAnimationOrchestrator,
  useSequentialAnimations,
  useParallelAnimations,
  useStaggeredAnimations,
} from '../hooks/useAnimationOrchestrator';

/**
 * Example of orchestrated animations
 */
export function AnimationOrchestrationExample() {
  const [status, setStatus] = useState('');
  const { executeAnimation, getStatus } = useAnimationOrchestrator();
  const { executeSequence } = useSequentialAnimations();
  const { executeParallel } = useParallelAnimations();
  const { executeStaggered } = useStaggeredAnimations(150);

  const [box1, setBox1] = useState({ x: 0, color: 'bg-blue-500' });
  const [box2, setBox2] = useState({ x: 0, color: 'bg-green-500' });
  const [box3, setBox3] = useState({ x: 0, color: 'bg-red-500' });

  const animateBox = async (
    boxId: number,
    setter: React.Dispatch<React.SetStateAction<any>>,
    distance: number
  ) => {
    return new Promise<void>((resolve) => {
      setter((prev: unknown) => ({ ...prev, x: distance }));
      setTimeout(() => {
        setter((prev: unknown) => ({ ...prev, x: 0 }));
        resolve();
      }, 500);
    });
  };

  const handleSequential = async () => {
    setStatus('Running sequential animations...');

    await executeSequence([
      {
        id: 'box1-seq',
        execute: () => animateBox(1, setBox1, 200),
      },
      {
        id: 'box2-seq',
        execute: () => animateBox(2, setBox2, 200),
      },
      {
        id: 'box3-seq',
        execute: () => animateBox(3, setBox3, 200),
      },
    ]);

    setStatus('Sequential animations complete!');
  };

  const handleParallel = async () => {
    setStatus('Running parallel animations...');

    await executeParallel([
      {
        id: 'box1-par',
        execute: () => animateBox(1, setBox1, 200),
      },
      {
        id: 'box2-par',
        execute: () => animateBox(2, setBox2, 200),
      },
      {
        id: 'box3-par',
        execute: () => animateBox(3, setBox3, 200),
      },
    ]);

    setStatus('Parallel animations complete!');
  };

  const handleStaggered = async () => {
    setStatus('Running staggered animations...');

    await executeStaggered([
      {
        id: 'box1-stag',
        execute: () => animateBox(1, setBox1, 200),
      },
      {
        id: 'box2-stag',
        execute: () => animateBox(2, setBox2, 200),
      },
      {
        id: 'box3-stag',
        execute: () => animateBox(3, setBox3, 200),
      },
    ]);

    setStatus('Staggered animations complete!');
  };

  const handleConflicting = async () => {
    setStatus('Running conflicting animations (orchestrator will manage)...');

    // Try to animate the same box multiple times
    // Orchestrator will queue them to prevent conflicts
    await Promise.all([
      executeAnimation('box1-conflict-1', () => animateBox(1, setBox1, 100)),
      executeAnimation('box1-conflict-2', () => animateBox(1, setBox1, 200)),
      executeAnimation('box1-conflict-3', () => animateBox(1, setBox1, 150)),
    ]);

    setStatus('Conflicting animations resolved!');
  };

  const updateStatus = () => {
    const orchestratorStatus = getStatus();
    setStatus(
      `Running: ${orchestratorStatus.running}, Queued: ${orchestratorStatus.queued}`
    );
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Animation Orchestration Demo</h2>
        <p className="text-gray-600">
          Demonstrates how the orchestrator manages multiple animations to
          prevent visual conflicts.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={handleSequential}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Sequential
          </button>
          <button
            onClick={handleParallel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Parallel
          </button>
          <button
            onClick={handleStaggered}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Staggered
          </button>
          <button
            onClick={handleConflicting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Conflicting (Managed)
          </button>
          <button
            onClick={updateStatus}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Check Status
          </button>
        </div>

        {status && (
          <div className="p-4 bg-blue-50 text-blue-800 rounded-lg">
            {status}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <motion.div
          animate={{ x: box1.x }}
          transition={{ duration: 0.5 }}
          className={`w-20 h-20 ${box1.color} rounded-lg`}
        />
        <motion.div
          animate={{ x: box2.x }}
          transition={{ duration: 0.5 }}
          className={`w-20 h-20 ${box2.color} rounded-lg`}
        />
        <motion.div
          animate={{ x: box3.x }}
          transition={{ duration: 0.5 }}
          className={`w-20 h-20 ${box3.color} rounded-lg`}
        />
      </div>

      <div className="p-4 bg-gray-100 rounded-lg space-y-2">
        <h3 className="font-semibold">How It Works</h3>
        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
          <li>
            <strong>Sequential:</strong> Animations run one after another
          </li>
          <li>
            <strong>Parallel:</strong> All animations run simultaneously
          </li>
          <li>
            <strong>Staggered:</strong> Animations start with a delay between
            each
          </li>
          <li>
            <strong>Conflicting:</strong> Orchestrator queues conflicting
            animations to prevent visual issues
          </li>
        </ul>
      </div>
    </div>
  );
}

