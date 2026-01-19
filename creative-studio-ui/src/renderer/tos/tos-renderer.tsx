/**
 * TOS Dialog Renderer Entry Point
 * 
 * Initializes the React application for the TOS dialog window.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import TOSDialog from './TOSDialog';
import './TOSDialog.css';

/**
 * Initialize the TOS dialog React application
 */
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <TOSDialog />
    </React.StrictMode>
  );
} else {
  console.error('Failed to find root element for TOS dialog');
}
