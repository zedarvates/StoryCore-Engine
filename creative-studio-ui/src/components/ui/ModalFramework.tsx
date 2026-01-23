/**
 * ModalFramework Component
 *
 * Generic modal component that renders forms based on declarative schema configuration.
 * Integrates state management, validation, persistence, and connection testing.
 */

import React, { useCallback } from 'react';
import { Save, TestTube, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { ModalOverlay } from './ModalOverlay';
import { FormField } from './FormField';
import { useModalState } from '@/hooks/useModalState';
import { useModalValidation } from '@/hooks/useModalValidation';
import { useModalConnectionTest } from '@/hooks/useModalConnectionTest';
import { useModalPersistence } from '@/hooks/useModalPersistence';
import type { GenericModalProps } from '@/types/modal';

/**
 * Generic modal framework component
 */
export function ModalFramework({
  schema,
  isOpen,
  onClose,
  onSubmit,
  initialData,
  persistence,
}: GenericModalProps) {
  // State management
  const modalState = useModalState(schema, initialData);

  // Validation
  const { validate } = useModalValidation(schema);

  // Connection testing
  const { testConnection, getConnectionTestMessages } = useModalConnectionTest(schema);
  const connectionMessages = getConnectionTestMessages();

  // Persistence
  const { saveDraft } = useModalPersistence(schema, persistence);

  // Submit handler
  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();

    // Validate form
    const validationResult = validate(modalState.data);
    modalState.setValidationErrors(validationResult.errors);

    if (!validationResult.isValid) {
      return;
    }

    // Set loading state
    modalState.setLoadingState('submit', true);

    try {
      await onSubmit(modalState.data);
      modalState.close();
    } catch (error) {
      // Error handling is done by the parent component
    } finally {
      modalState.setLoadingState('submit', false);
    }
  }, [modalState, validate, onSubmit]);

  // Connection test handler
  const handleConnectionTest = useCallback(async () => {
    modalState.setLoadingState('connectionTest', true);
    modalState.setConnectionStatus('testing');

    try {
      const result = await testConnection(modalState.data);

      if (result.success) {
        modalState.setConnectionStatus('success');
      } else {
        modalState.setConnectionStatus('error');
      }
    } catch (error) {
      modalState.setConnectionStatus('error');
    } finally {
      modalState.setLoadingState('connectionTest', false);
    }
  }, [modalState, testConnection]);

  // Save draft handler
  const handleSaveDraft = useCallback(async () => {
    try {
      await saveDraft(modalState.data);
      // Could show a toast notification here
    } catch (error) {
      // Error handling for draft save
    }
  }, [modalState.data, saveDraft]);

  // Group fields by layout.group
  const groupedFields = schema.fields.reduce((groups, field) => {
    const group = field.layout?.group || 'default';
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(field);
    return groups;
  }, {} as Record<string, typeof schema.fields>);

  // Get modal size classes
  const getSizeClasses = () => {
    switch (schema.size) {
      case 'sm': return 'max-w-md';
      case 'lg': return 'max-w-4xl';
      case 'xl': return 'max-w-7xl';
      default: return 'max-w-2xl';
    }
  };

  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose}>
      <div className={`bg-white rounded-lg shadow-xl ${getSizeClasses()}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{schema.title}</h2>
        </div>

        {/* Description */}
        {schema.description && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-600">{schema.description}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {Object.entries(groupedFields).map(([groupName, fields]) => (
              <div key={groupName} className="space-y-4">
                {groupName !== 'default' && (
                  <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                    {groupName}
                  </h3>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fields.map(field => (
                    <FormField
                      key={field.id}
                      field={field}
                      value={modalState.data[field.id]}
                      error={modalState.errors[field.id]}
                      onChange={(value) => modalState.updateField(field.id, value)}
                      disabled={modalState.loading.submit}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Connection Test Section */}
          {schema.enableConnectionTest && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {modalState.connectionStatus === 'success' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {modalState.connectionStatus === 'error' && (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  {modalState.connectionStatus === 'testing' && (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  )}

                  <span className="text-sm font-medium text-gray-700">
                    Test de connexion
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleConnectionTest}
                  disabled={modalState.loading.connectionTest || modalState.loading.submit}
                  className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {modalState.loading.connectionTest ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                  <span>Tester</span>
                </button>
              </div>

              {modalState.connectionStatus === 'success' && (
                <div className="mt-2 text-sm text-green-600">
                  {connectionMessages.successMessage}
                </div>
              )}

              {modalState.connectionStatus === 'error' && (
                <div className="mt-2 text-sm text-red-600">
                  {connectionMessages.errorMessage}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={modalState.loading.submit}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>Sauvegarder brouillon</span>
              </button>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={modalState.loading.submit}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {schema.cancelLabel || 'Annuler'}
              </button>

              <button
                type="submit"
                disabled={modalState.loading.submit}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {modalState.loading.submit && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                <span>{schema.submitLabel || 'Soumettre'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
