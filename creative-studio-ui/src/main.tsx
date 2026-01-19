import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { InstallationWizardProvider } from './contexts/InstallationWizardContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InstallationWizardProvider>
      <App />
    </InstallationWizardProvider>
  </StrictMode>
);
