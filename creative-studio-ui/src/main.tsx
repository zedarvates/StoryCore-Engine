import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import { router } from './router';
import { InstallationWizardProvider } from './contexts/InstallationWizardContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InstallationWizardProvider>
      <RouterProvider router={router} />
    </InstallationWizardProvider>
  </StrictMode>
);
