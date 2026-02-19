import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import type { Character } from '@/types/character';
import { useCharacterManager } from '@/hooks/useCharacterManager';
import { BasicIdentitySection } from './editor/BasicIdentitySection';
import { AppearanceSection } from './editor/AppearanceSection';
import { PersonalitySection } from './editor/PersonalitySection';
import { BackgroundSection } from './editor/BackgroundSection';
import { RelationshipsSection } from './editor/RelationshipsSection';
import { CharacterImagesSection } from './editor/CharacterImagesSection';
import { PromptsManager } from '../common/PromptsManager';
import { buildVisualPromptForCharacter } from '@/lib/promptUtils';
import './CharacterEditor.css';

/**
 * Props for the CharacterEditor component
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 7.1, 7.2
 */
export interface CharacterEditorProps {
  /** ID of the character to edit */
  characterId: string;

  /** Handler called when editor is closed */
  onClose: () => void;

  /** Optional handler called after successful save */
  onSave?: (character: Character) => void;

  /** Optional handler called after successful deletion */
  onDelete?: (characterId: string) => void;
}

type TabId = 'identity' | 'appearance' | 'personality' | 'background' | 'relationships' | 'images' | 'prompts';

interface ValidationErrors {
  [key: string]: string[];
}

/**
 * CharacterEditor Component
 * 
 * Modal interface for editing existing characters with tabbed sections,
 * validation, unsaved changes detection, and dependency checking.
 * 
 * Requirements:
 * - Req 2.1: Opens when user clicks on character
 * - Req 2.2: Displays all character fields in editable form
 * - Req 2.3: Validates changes before saving
 * - Req 2.4: Displays specific error messages
 * - Req 2.5: Updates store and persistence on save
 * - Req 2.6: Discards unsaved changes on cancel
 * - Req 7.1: Checks dependencies before deletion
 * - Req 7.2: Displays warning for dependencies
 */
export function CharacterEditor({
  characterId,
  onClose,
  onSave,
  onDelete,
}: CharacterEditorProps) {
  const project = useAppStore((state) => state.project);
  const characterManager = useCharacterManager();
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const unsavedDialogRef = React.useRef<HTMLDialogElement>(null);
  const deleteDialogRef = React.useRef<HTMLDialogElement>(null);
  const previousActiveElement = React.useRef<HTMLElement | null>(null);

  // Get the character
  const originalCharacter = characterManager.getCharacter(characterId);

  // State
  const [formData, setFormData] = useState<Partial<Character>>(originalCharacter || {});
  const [activeTab, setActiveTab] = useState<TabId>('identity');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [dependencies, setDependencies] = useState<any>(null);

  // Initialize form data when character loads
  useEffect(() => {
    if (originalCharacter) {
      const initialPrompts = originalCharacter.prompts || [];

      // If no prompts exist, suggest a base visual prompt
      if (initialPrompts.length === 0) {
        const basePrompt = buildVisualPromptForCharacter(originalCharacter);
        if (basePrompt) {
          initialPrompts.push(basePrompt);
        }
      }

      setFormData({
        ...originalCharacter,
        prompts: initialPrompts,
      });
    }
  }, [originalCharacter]);

  // Handle form field changes
  const handleFieldChange = (field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle nested field changes
  const handleNestedFieldChange = (section: string, field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section as keyof Character] as any),
        [field]: value,
      },
    }));
    setIsDirty(true);

    // Clear error for this field
    const errorKey = `${section}.${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  // Validate form data
  const validateForm = (): boolean => {
    const validationResult = characterManager.validateCharacter(formData);
    setErrors(validationResult.errors);
    return validationResult.valid;
  };

  // Handle save
  const handleSave = async () => {
    // Validate first
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      const updatedCharacter = await characterManager.updateCharacter(
        characterId,
        formData
      );

      setIsDirty(false);

      if (onSave) {
        onSave(updatedCharacter);
      }

      onClose();
    } catch (error) {
      console.error('Failed to save character:', error);
      setErrors({
        _general: [(error as Error).message || 'Failed to save character'],
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (isDirty) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  };

  // Confirm cancel with unsaved changes
  const confirmCancel = () => {
    setShowUnsavedWarning(false);
    setIsDirty(false);
    onClose();
  };

  // Handle delete
  const handleDelete = async () => {
    // Check dependencies first
    const deps = characterManager.checkDependencies(characterId);
    setDependencies(deps);

    // Always show confirmation dialog
    setShowDeleteConfirm(true);
  };

  // Perform deletion
  const performDelete = async () => {
    try {
      await characterManager.deleteCharacter(characterId);

      if (onDelete) {
        onDelete(characterId);
      }

      onClose();
    } catch (error) {
      console.error('Failed to delete character:', error);
      setErrors({
        _general: [(error as Error).message || 'Failed to delete character'],
      });
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  // Handle escape key - native dialog handles this automatically, but we keep for cleanup
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Native dialog handles escape automatically
        handleCancel();
      }
    };

    globalThis.addEventListener('keydown', handleEscape);
    return () => globalThis.removeEventListener('keydown', handleEscape);
  }, [isDirty]);

  // Open dialog when component mounts
  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      dialogRef.current.showModal();
    }
  }, []);

  // Handle unsaved warning dialog open
  useEffect(() => {
    if (showUnsavedWarning && unsavedDialogRef.current && !unsavedDialogRef.current.open) {
      unsavedDialogRef.current.showModal();
    } else if (!showUnsavedWarning && unsavedDialogRef.current?.open) {
      unsavedDialogRef.current.close();
    }
  }, [showUnsavedWarning]);

  // Handle delete dialog open
  useEffect(() => {
    if (showDeleteConfirm && deleteDialogRef.current && !deleteDialogRef.current.open) {
      deleteDialogRef.current.showModal();
    } else if (!showDeleteConfirm && deleteDialogRef.current?.open) {
      deleteDialogRef.current.close();
    }
  }, [showDeleteConfirm]);

  if (!originalCharacter) {
    return null;
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'identity', label: 'Identity' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'personality', label: 'Personality' },
    { id: 'background', label: 'Background' },
    { id: 'relationships', label: 'Relationships' },
    { id: 'images', label: 'Images' },
    { id: 'prompts', label: 'Prompts' },
  ];

  return (
    <>
      {/* Modal - Using native <dialog> element for WCAG compliance */}
      <dialog
        ref={dialogRef}
        className="character-editor"
        aria-labelledby="editor-title"
        onClose={() => {
          // Restore focus when dialog closes
          if (previousActiveElement.current) {
            previousActiveElement.current.focus();
          }
          handleCancel();
        }}
        onClick={(e) => {
          // Close on backdrop click (native dialog behavior)
          const rect = dialogRef.current?.getBoundingClientRect();
          if (rect && (
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom
          )) {
            handleCancel();
          }
        }}
      >
        {/* Header */}
        <div className="character-editor__header">
          <h2 id="editor-title" className="character-editor__title">
            Edit Character: {originalCharacter.name}
          </h2>
          <button
            className="character-editor__close"
            onClick={handleCancel}
            aria-label="Close editor"
          >
            <X />
          </button>
        </div>

        {/* General errors */}
        {errors._general && (
          <div className="character-editor__error-banner">
            {errors._general.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="character-editor__tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`character-editor__tab ${activeTab === tab.id ? 'character-editor__tab--active' : ''
                }`}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        <div className="character-editor__content">
          {activeTab === 'identity' && (
            <BasicIdentitySection
              data={formData}
              errors={errors}
              onChange={handleFieldChange}
              onNestedChange={handleNestedFieldChange}
              id="panel-identity"
            />
          )}

          {activeTab === 'appearance' && (
            <AppearanceSection
              data={formData.visual_identity || {}}
              errors={errors}
              onChange={(field, value) => handleNestedFieldChange('visual_identity', field, value)}
              characterName={formData.name || ''}
              archetype={formData.role?.archetype || ''}
              ageRange={formData.visual_identity?.age_range || ''}
              gender={formData.visual_identity?.gender || ''}
              id="panel-appearance"
            />
          )}

          {activeTab === 'personality' && (
            <PersonalitySection
              data={formData.personality || {}}
              errors={errors}
              onChange={(field, value) => handleNestedFieldChange('personality', field, value)}
              id="panel-personality"
            />
          )}

          {activeTab === 'background' && (
            <BackgroundSection
              data={formData.background || {}}
              errors={errors}
              onChange={(field, value) => handleNestedFieldChange('background', field, value)}
              id="panel-background"
            />
          )}

          {activeTab === 'relationships' && (
            <RelationshipsSection
              characterId={characterId}
              relationships={formData.relationships || []}
              errors={errors}
              onChange={(relationships) => handleFieldChange('relationships', relationships)}
              id="panel-relationships"
            />
          )}

          {activeTab === 'images' && (
            <CharacterImagesSection
              characterId={characterId}
              characterName={originalCharacter.name}
              character={formData as Character}
              id="panel-images"
            />
          )}


          {activeTab === 'prompts' && (
            <div className="character-editor__section">
              <PromptsManager
                prompts={formData.prompts || []}
                onUpdate={(newPrompts) => handleFieldChange('prompts', newPrompts)}
                entityName={formData.name || 'Character'}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="character-editor__footer">
          <button
            className="character-editor__button character-editor__button--delete"
            onClick={handleDelete}
            disabled={isSaving}
          >
            <Trash2 />
            Delete Character
          </button>

          <div className="character-editor__footer-actions">
            <button
              className="character-editor__button character-editor__button--secondary"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </button>

            <button
              className="character-editor__button character-editor__button--primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </dialog>

      {/* Unsaved changes warning - Using native <dialog> element for WCAG compliance */}
      <dialog
        ref={unsavedDialogRef}
        className="character-editor-dialog"
        aria-labelledby="unsaved-changes-title"
        aria-describedby="unsaved-changes-desc"
      >
        <div className="character-editor-dialog__header">
          <AlertTriangle className="character-editor-dialog__icon" />
          <h3 id="unsaved-changes-title">Unsaved Changes</h3>
        </div>
        <p id="unsaved-changes-desc">You have unsaved changes. Are you sure you want to discard them?</p>
        <div className="character-editor-dialog__actions">
          <button
            className="character-editor__button character-editor__button--secondary"
            onClick={() => setShowUnsavedWarning(false)}
          >
            Keep Editing
          </button>
          <button
            className="character-editor__button character-editor__button--danger"
            onClick={confirmCancel}
          >
            Discard Changes
          </button>
        </div>
      </dialog>

      {/* Delete confirmation - Using native <dialog> element for WCAG compliance */}
      <dialog
        ref={deleteDialogRef}
        className="character-editor-dialog"
        aria-labelledby="delete-character-title"
        aria-describedby="delete-character-desc"
      >
        <div className="character-editor-dialog__header">
          <AlertTriangle className="character-editor-dialog__icon character-editor-dialog__icon--danger" />
          <h3 id="delete-character-title">Delete Character</h3>
        </div>

        {dependencies && (dependencies.stories.length > 0 || dependencies.relationships.length > 0) ? (
          <>
            <p>This character is used in the following places:</p>

            {dependencies.stories.length > 0 && (
              <div className="character-editor-dialog__dependencies">
                <h4>Stories ({dependencies.stories.length}):</h4>
                <ul>
                  {dependencies.stories.map((story: any) => (
                    <li key={story.id}>{story.title || 'Untitled Story'}</li>
                  ))}
                </ul>
              </div>
            )}

            {dependencies.relationships.length > 0 && (
              <div className="character-editor-dialog__dependencies">
                <h4>Relationships ({dependencies.relationships.length}):</h4>
                <ul>
                  {dependencies.relationships.map((char: any) => (
                    <li key={char.character_id}>{char.name}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="character-editor-dialog__warning">
              Deleting this character will remove it from all stories and relationships.
              This action cannot be undone.
            </p>
          </>
        ) : (
          <p id="delete-character-desc">Are you sure you want to delete this character? This action cannot be undone.</p>
        )}

        <div className="character-editor-dialog__actions">
          <button
            className="character-editor__button character-editor__button--secondary"
            onClick={() => setShowDeleteConfirm(false)}
          >
            Cancel
          </button>
          <button
            className="character-editor__button character-editor__button--danger"
            onClick={performDelete}
          >
            Delete Character
          </button>
        </div>
      </dialog>
    </>
  );
}


