/**
 * ShotCreationDialog - Dialog for creating new shots manually
 * 
 * Features:
 * - Form with title, description, duration fields
 * - Field validation with error messages
 * - Submit handler that calls ProjectService
 * - Auto-selection of newly created shot
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.7
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { projectService } from '../../services/project/ProjectService';
import type { ShotInput } from '../../types/project';
import type { Shot } from '../../types';

export interface ShotCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (shot: Shot) => void;
  projectPath: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  duration?: string;
}

export const ShotCreationDialog: React.FC<ShotCreationDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  projectPath,
}) => {
  const [formData, setFormData] = useState<ShotInput>({
    title: '',
    description: '',
    duration: 5, // Default 5 seconds
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        description: '',
        duration: 5,
      });
      setErrors({});
      setSubmitError(null);
    }
  }, [isOpen]);

  // Validate form fields
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate title
    if (!formData.title || formData.title.trim() === '') {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
    }

    // Validate description
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    // Validate duration
    if (formData.duration <= 0) {
      newErrors.duration = 'Duration must be a positive number';
    } else if (formData.duration > 300) {
      newErrors.duration = 'Duration must be 300 seconds or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form field changes
  const handleChange = (field: keyof ShotInput, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
    
    // Clear submit error
    if (submitError) {
      setSubmitError(null);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Create shot using ProjectService
      const newShot = await projectService.createShot(projectPath, formData);
      
      // Call onSubmit callback with the created shot
      onSubmit(newShot);
      
      // Close dialog
      onClose();
    } catch (error) {
      console.error('Error creating shot:', error);
      setSubmitError(
        error instanceof Error 
          ? error.message 
          : 'Failed to create shot. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Create New Shot</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {/* Submit Error */}
          {submitError && (
            <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded text-red-200 text-sm">
              {submitError}
            </div>
          )}

          {/* Title Field */}
          <div className="mb-4">
            <label htmlFor="shot-title" className="block text-sm font-medium text-gray-300 mb-2">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              id="shot-title"
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border ${
                errors.title ? 'border-red-500' : 'border-gray-600'
              } rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Enter shot title"
              maxLength={100}
              disabled={isSubmitting}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-400">{errors.title}</p>
            )}
          </div>

          {/* Description Field */}
          <div className="mb-4">
            <label htmlFor="shot-description" className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="shot-description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border ${
                errors.description ? 'border-red-500' : 'border-gray-600'
              } rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none`}
              placeholder="Enter shot description (optional)"
              rows={3}
              maxLength={500}
              disabled={isSubmitting}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-400">{errors.description}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Duration Field */}
          <div className="mb-6">
            <label htmlFor="shot-duration" className="block text-sm font-medium text-gray-300 mb-2">
              Duration (seconds) <span className="text-red-400">*</span>
            </label>
            <input
              id="shot-duration"
              type="number"
              value={formData.duration}
              onChange={(e) => handleChange('duration', parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 bg-gray-700 border ${
                errors.duration ? 'border-red-500' : 'border-gray-600'
              } rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="5"
              min="0.1"
              max="300"
              step="0.1"
              disabled={isSubmitting}
            />
            {errors.duration && (
              <p className="mt-1 text-sm text-red-400">{errors.duration}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              Enter duration between 0.1 and 300 seconds
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Shot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
