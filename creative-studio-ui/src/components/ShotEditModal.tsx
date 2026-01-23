import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Shot } from '../types';
import { useStore } from '../store';

/**
 * ShotEditModal Component
 * 
 * Modal dialog for editing shot properties in detail.
 * Opened when a shot is double-clicked.
 * 
 * Features:
 * - Edit title, description, and duration
 * - Image upload/change
 * - Save and cancel actions
 * - Keyboard shortcuts (Esc to close, Ctrl+S to save)
 * 
 * Requirements: 2.4 (Double-click to edit modal)
 */

interface ShotEditModalProps {
  shot: Shot;
  isOpen: boolean;
  onClose: () => void;
}

export const ShotEditModal: React.FC<ShotEditModalProps> = ({ shot, isOpen, onClose }) => {
  const updateShot = useStore((state) => state.updateShot);
  
  const [title, setTitle] = useState(shot.title);
  const [description, setDescription] = useState(shot.description);
  const [duration, setDuration] = useState(shot.duration);
  const [image, setImage] = useState(shot.image || '');

  // Update local state when shot changes
  useEffect(() => {
    setTitle(shot.title);
    setDescription(shot.description);
    setDuration(shot.duration);
    setImage(shot.image || '');
  }, [shot]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, title, description, duration, image]);

  const handleSave = () => {
    updateShot(shot.id, {
      title,
      description,
      duration,
      image: image || undefined,
    });
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Edit Shot</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="shot-title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              id="shot-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter shot title"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="shot-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="shot-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter shot description"
            />
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="shot-duration" className="block text-sm font-medium text-gray-700 mb-1">
              Duration (seconds)
            </label>
            <input
              id="shot-duration"
              type="number"
              min="0.1"
              step="0.1"
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Format: {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</p>
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image
            </label>
            
            {/* Image preview */}
            {image && (
              <div className="mb-2 relative aspect-video bg-gray-100 rounded-md overflow-hidden">
                <img
                  src={image}
                  alt="Shot preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Image upload */}
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer">
                <div className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-center transition-colors">
                  {image ? 'Change Image' : 'Upload Image'}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              
              {image && (
                <button
                  onClick={() => setImage('')}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Position info (read-only) */}
          <div className="pt-4 border-t">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Position:</span> #{shot.position + 1}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              <span className="font-medium">ID:</span> {shot.id}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Save Changes
          </button>
          <div className="text-xs text-gray-500 ml-2">
            Ctrl+S to save, Esc to close
          </div>
        </div>
      </div>
    </div>
  );
};
