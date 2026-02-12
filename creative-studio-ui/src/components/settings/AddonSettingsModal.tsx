/**
 * AddonSettingsModal - Modal de configuration des paramètres d'un add-on
 *
 * Permet de configurer les paramètres spécifiques à chaque add-on
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { addonManager, AddonSetting } from '@/services/AddonManager';
import { Save, RotateCcw, X } from 'lucide-react';

export interface AddonSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  addonId: string;
  addonName: string;
}

export function AddonSettingsModal({ isOpen, onClose, addonId, addonName }: AddonSettingsModalProps) {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [settingsDefinition, setSettingsDefinition] = useState<AddonSetting[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen && addonId) {
      loadSettings();
    }
  }, [isOpen, addonId]);

  const loadSettings = () => {
    const definition = addonManager.getAddonSettingsDefinition(addonId);
    const currentSettings = addonManager.getAddonSettingsWithDefaults(addonId);

    setSettingsDefinition(definition);
    setSettings({ ...currentSettings });
    setHasChanges(false);
  };

  const handleSettingChange = (key: string, value: unknown) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      addonManager.updateAddonSettings(addonId, settings);
      setHasChanges(false);
      onClose();
    } catch (error) {
      console.error('Failed to save addon settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    loadSettings();
  };

  const renderSettingInput = (setting: AddonSetting) => {
    const value = settings[setting.key];

    switch (setting.type) {
      case 'boolean':
        return (
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
              className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">
              {setting.description || setting.label}
            </span>
          </label>
        );

      case 'number':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {setting.label}
            </label>
            <input
              type="number"
              value={value || ''}
              onChange={(e) => handleSettingChange(setting.key, parseFloat(e.target.value) || 0)}
              min={setting.min}
              max={setting.max}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {setting.description && (
              <p className="text-xs text-gray-500">{setting.description}</p>
            )}
          </div>
        );

      case 'text':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {setting.label}
            </label>
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleSettingChange(setting.key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {setting.description && (
              <p className="text-xs text-gray-500">{setting.description}</p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {setting.label}
            </label>
            <textarea
              value={value || ''}
              onChange={(e) => handleSettingChange(setting.key, e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {setting.description && (
              <p className="text-xs text-gray-500">{setting.description}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {setting.label}
            </label>
            <select
              value={value || ''}
              onChange={(e) => handleSettingChange(setting.key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {setting.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {setting.description && (
              <p className="text-xs text-gray-500">{setting.description}</p>
            )}
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-500">
            Type de paramètre non supporté: {setting.type}
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Paramètres - {addonName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto max-h-[60vh]">
          {settingsDefinition.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                Aucun paramètre configurable pour cet add-on.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {settingsDefinition.map(setting => (
                <div key={setting.key} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                  {renderSettingInput(setting)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Réinitialiser
          </Button>

          <Button
            variant="outline"
            onClick={onClose}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Annuler
          </Button>

          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Sauvegarder
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


