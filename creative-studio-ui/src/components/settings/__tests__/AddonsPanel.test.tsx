/**
 * Tests d'intégration pour AddonsPanel
 * 
 * Teste l'intégration entre l'interface utilisateur et les services de gestion des add-ons
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddonsPanel } from '../AddonsPanel';
import { addonManager } from '@/services/AddonManager';
import { fileSystemService } from '@/services/FileSystemService';
import { promises as fs } from 'fs';
import path from 'path';
import { vi } from 'vitest';

// Mock useToast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('AddonsPanel Integration Tests', () => {
  const testFile = 'test-addons-panel.json';

  beforeEach(async () => {
    // Nettoyer le fichier de test
    try {
      await fs.unlink(testFile);
    } catch {}

    // Réinitialiser le manager
    await addonManager.initialize();
  });

  afterEach(async () => {
    // Nettoyer le fichier de test
    try {
      await fs.unlink(testFile);
    } catch {}
  });

  it('should render and initialize add-ons', async () => {
    render(<AddonsPanel />);

    // Vérifier que le titre est affiché
    expect(screen.getByText('Gestion des Add-ons')).toBeInTheDocument();

    // Vérifier que les boutons d'export/import sont présents
    expect(screen.getByText('Exporter')).toBeInTheDocument();
    expect(screen.getByText('Importer')).toBeInTheDocument();

    // Attendre que les add-ons soient chargés
    await waitFor(() => {
      expect(screen.getByText('Casting Manager')).toBeInTheDocument();
    });
  });

  it('should export configuration when export button is clicked', async () => {
    render(<AddonsPanel />);

    // Attendre que les add-ons soient chargés
    await waitFor(() => {
      expect(screen.getByText('Casting Manager')).toBeInTheDocument();
    });

    // Cliquer sur le bouton Exporter
    const exportButton = screen.getByText('Exporter');
    fireEvent.click(exportButton);

    // Vérifier que le fichier a été créé
    const fileExists = await fileSystemService.fileExists(testFile);
    expect(fileExists).toBe(true);

    // Vérifier le contenu du fichier
    const config = await fileSystemService.readConfigFile(testFile);
    expect(config).toBeDefined();
  });

  it('should import configuration when import button is clicked', async () => {
    // Créer un fichier de configuration de test
    const testConfig = {
      'casting': {
        enabled: true,
        settings: { maxActorsPerScene: 10 }
      }
    };

    await fileSystemService.writeConfigFile(testFile, testConfig);

    render(<AddonsPanel />);

    // Attendre que les add-ons soient chargés
    await waitFor(() => {
      expect(screen.getByText('Casting Manager')).toBeInTheDocument();
    });

    // Cliquer sur le bouton Importer
    const importButton = screen.getByText('Importer');
    fireEvent.click(importButton);

    // Vérifier que la configuration a été importée
    const castingAddon = addonManager.getAddon('casting');
    expect(castingAddon?.enabled).toBe(true);

    const settings = addonManager.getAddonSettings('casting');
    expect(settings?.maxActorsPerScene).toBe(10);
  });

  it('should toggle add-on activation', async () => {
    render(<AddonsPanel />);

    // Attendre que les add-ons soient chargés
    await waitFor(() => {
      expect(screen.getByText('Casting Manager')).toBeInTheDocument();
    });

    // Trouver le bouton d'activation pour le casting
    const toggleButton = screen.getByText('Activer');
    fireEvent.click(toggleButton);

    // Attendre que l'add-on soit activé
    await waitFor(() => {
      expect(screen.getByText('Désactiver')).toBeInTheDocument();
    });

    // Vérifier que l'add-on est activé
    const castingAddon = addonManager.getAddon('casting');
    expect(castingAddon?.enabled).toBe(true);
  });

  it('should filter add-ons by search query', async () => {
    render(<AddonsPanel />);

    // Attendre que les add-ons soient chargés
    await waitFor(() => {
      expect(screen.getByText('Casting Manager')).toBeInTheDocument();
    });

    // Rechercher "Audio"
    const searchInput = screen.getByPlaceholderText('Rechercher des add-ons...');
    fireEvent.change(searchInput, { target: { value: 'Audio' } });

    // Vérifier que seul l'add-on audio est affiché
    expect(screen.getByText('Audio Production Suite')).toBeInTheDocument();
    expect(screen.queryByText('Casting Manager')).not.toBeInTheDocument();
  });

  it('should filter add-ons by category', async () => {
    render(<AddonsPanel />);

    // Attendre que les add-ons soient chargés
    await waitFor(() => {
      expect(screen.getByText('Casting Manager')).toBeInTheDocument();
    });

    // Filtrer par catégorie "Traitement"
    const processingButton = screen.getByText('Traitement');
    fireEvent.click(processingButton);

    // Vérifier que seuls les add-ons de traitement sont affichés
    expect(screen.getByText('Audio Production Suite')).toBeInTheDocument();
    expect(screen.getByText('Comic to Sequence Converter')).toBeInTheDocument();
    expect(screen.queryByText('Casting Manager')).not.toBeInTheDocument();
  });

  it('should handle export error gracefully', async () => {
    // Simuler une erreur d'écriture de fichier
    const originalWriteFile = fileSystemService.writeConfigFile;
    fileSystemService.writeConfigFile = async () => {
      throw new Error('Permission denied');
    };

    render(<AddonsPanel />);

    // Attendre que les add-ons soient chargés
    await waitFor(() => {
      expect(screen.getByText('Casting Manager')).toBeInTheDocument();
    });

    // Cliquer sur le bouton Exporter
    const exportButton = screen.getByText('Exporter');
    fireEvent.click(exportButton);

    // Restaurer la méthode originale
    fileSystemService.writeConfigFile = originalWriteFile;

    // Vérifier que l'erreur est gérée (pas de crash)
    expect(screen.getByText('Casting Manager')).toBeInTheDocument();
  });

  it('should handle import error gracefully', async () => {
    // Créer un fichier de configuration invalide
    await fs.writeFile(testFile, 'invalid json content', 'utf-8');

    render(<AddonsPanel />);

    // Attendre que les add-ons soient chargés
    await waitFor(() => {
      expect(screen.getByText('Casting Manager')).toBeInTheDocument();
    });

    // Cliquer sur le bouton Importer
    const importButton = screen.getByText('Importer');
    fireEvent.click(importButton);

    // Vérifier que l'erreur est gérée (pas de crash)
    expect(screen.getByText('Casting Manager')).toBeInTheDocument();
  });
});