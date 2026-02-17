/**
 * AddonsPanel - Panneau de gestion des add-ons
 *
 * Interface utilisateur pour activer/désactiver les add-ons
 */

import React, { useState, useEffect } from 'react';
import { addonManager, AddonInfo } from '@/services/AddonManager';
import {
  Puzzle,
  ToggleLeft,
  ToggleRight,
  Settings,
  AlertCircle,
  CheckCircle,
  Loader,
  Search,
  Filter,
  RefreshCw,
  Info,
  Save,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export interface AddonsPanelProps {
  className?: string;
  onOpenSettings?: (addonId: string, addonName: string) => void;
}

export function AddonsPanel({ className = '', onOpenSettings }: AddonsPanelProps) {
  const [addons, setAddons] = useState<AddonInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AddonInfo['category'] | 'all'>('all');
  const [togglingAddon, setTogglingAddon] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    initializeAddons();
  }, []);

  const initializeAddons = async () => {
    try {
      await addonManager.initialize();
      setAddons(addonManager.getAddons());
    } catch (error) {
      console.error('Failed to initialize add-ons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAddon = async (addonId: string) => {
    setTogglingAddon(addonId);

    try {
      const success = await addonManager.toggleAddon(addonId);
      if (success) {
        // Rafraîchir la liste
        setAddons(addonManager.getAddons());
      } else {
        console.error('Failed to toggle addon');
      }
    } catch (error) {
      console.error('Error toggling addon:', error);
    } finally {
      setTogglingAddon(null);
    }
  };

  /**
   * Exporte la configuration des add-ons vers un fichier
   */
  const handleExportConfig = async () => {
    try {
      await addonManager.saveToFile();
      toast({
        title: 'Succès',
        description: 'Configuration sauvegardée avec succès',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: `Échec de la sauvegarde: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  /**
   * Importe la configuration des add-ons depuis un fichier
   */
  const handleImportConfig = async () => {
    try {
      await addonManager.loadFromFile();
      // Rafraîchir la liste des add-ons
      setAddons(addonManager.getAddons());

      toast({
        title: 'Succès',
        description: 'Configuration restaurée avec succès',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: `Échec de la restauration: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  const filteredAddons = addons.filter(addon => {
    if (!addon) return false;

    const name = addon.name || '';
    const description = addon.description || '';

    const matchesSearch = searchQuery === '' ||
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      addon.tags?.some(tag => tag && tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || addon.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getStatusIcon = (addon: AddonInfo) => {
    switch (addon.status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'inactive':
        return <ToggleLeft className="w-4 h-4 text-gray-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'loading':
        return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <ToggleLeft className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (addon: AddonInfo) => {
    switch (addon.status) {
      case 'active':
        return 'Activé';
      case 'inactive':
        return 'Désactivé';
      case 'error':
        return 'Erreur';
      case 'loading':
        return 'Chargement...';
      default:
        return 'Inconnu';
    }
  };

  const getCategoryColor = (category: AddonInfo['category']) => {
    switch (category) {
      case 'ui':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-green-100 text-green-800';
      case 'export':
        return 'bg-purple-100 text-purple-800';
      case 'integration':
        return 'bg-orange-100 text-orange-800';
      case 'utility':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const categories: Array<{ value: AddonInfo['category'] | 'all', label: string }> = [
    { value: 'all', label: 'Tous' },
    { value: 'ui', label: 'Interface' },
    { value: 'processing', label: 'Traitement' },
    { value: 'export', label: 'Export' },
    { value: 'integration', label: 'Intégration' },
    { value: 'utility', label: 'Utilitaires' }
  ];

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-gray-600">Chargement des add-ons...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full overflow-hidden ${className}`}>
      <div className="p-6 flex flex-col h-full overflow-hidden">
        {/* Header - Fixed at top */}
        <div className="mb-6 flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <Puzzle className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Gestion des Add-ons</h2>
          </div>

          <p className="text-gray-600 mb-4">
            Activez ou désactivez les extensions pour personnaliser votre expérience StoryCore.
          </p>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher des add-ons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {categories.map(category => (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${selectedCategory === category.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {category.label}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={initializeAddons}
              className="flex items-center gap-2 flex-shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </Button>

            {/* Boutons d'export/import */}
            <div className="flex gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportConfig}
                className="flex items-center gap-2"
                title="Exporter la configuration"
              >
                <Save className="w-4 h-4" />
                Exporter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleImportConfig}
                className="flex items-center gap-2"
                title="Importer la configuration"
              >
                <Upload className="w-4 h-4" />
                Importer
              </Button>
            </div>
          </div>
        </div>

        {/* Stats - Fixed height */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 flex-shrink-0">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{addons.length}</p>
              </div>
              <Puzzle className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Activés</p>
                <p className="text-2xl font-bold text-green-600">
                  {addons.filter(a => a.enabled && a.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Désactivés</p>
                <p className="text-2xl font-bold text-gray-600">
                  {addons.filter(a => !a.enabled).length}
                </p>
              </div>
              <ToggleLeft className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Erreurs</p>
                <p className="text-2xl font-bold text-red-600">
                  {addons.filter(a => a.status === 'error').length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Add-ons List - Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="space-y-4 pb-4">
            {filteredAddons.length === 0 ? (
              <div className="text-center py-12">
                <Puzzle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Aucun add-on trouvé
                </h3>
                <p className="text-gray-600">
                  {searchQuery || selectedCategory !== 'all'
                    ? 'Essayez de modifier vos critères de recherche.'
                    : 'Aucun add-on n\'est disponible pour le moment.'}
                </p>
              </div>
            ) : (
              filteredAddons.map(addon => (
                <div
                  key={addon.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {addon.name}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(addon.category)}`}>
                          {addon.category}
                        </span>
                        {addon.builtin && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Intégré
                          </span>
                        )}
                      </div>

                      <p className="text-gray-600 mb-3">{addon.description}</p>

                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        <span>Version {addon.version}</span>
                        <span>Par {addon.author}</span>
                        {addon.tags && addon.tags.length > 0 && (
                          <div className="flex gap-1">
                            {addon.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="bg-gray-100 px-2 py-1 rounded text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {addon.errorMessage && (
                        <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-red-700 text-sm">{addon.errorMessage}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {getStatusIcon(addon)}
                        <span className="text-sm font-medium">{getStatusText(addon)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-6 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenSettings?.(addon.id, addon.name)}
                        className="flex items-center gap-2"
                        title="Paramètres de l'add-on"
                      >
                        <Settings className="w-4 h-4" />
                        Paramètres
                      </Button>

                      <Button
                        variant={addon.enabled ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleToggleAddon(addon.id)}
                        disabled={togglingAddon === addon.id || addon.status === 'loading'}
                        className={`flex items-center gap-2 ${addon.enabled
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-gray-600 hover:bg-gray-700'
                          }`}
                      >
                        {togglingAddon === addon.id ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : addon.enabled ? (
                          <ToggleRight className="w-4 h-4" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                        {addon.enabled ? 'Désactiver' : 'Activer'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Help Text - Fixed at bottom */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex-shrink-0">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">À propos des add-ons</h4>
              <p className="text-sm text-blue-700 mb-2">
                Les add-ons étendent les fonctionnalités de StoryCore. Les add-ons intégrés sont
                développés par l'équipe StoryCore et sont entièrement sécurisés.
              </p>
              <p className="text-sm text-blue-700">
                <strong>Note :</strong> Certains add-ons peuvent nécessiter un redémarrage de l'application
                pour être pleinement opérationnels.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
