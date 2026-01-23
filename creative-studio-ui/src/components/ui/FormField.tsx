/**
 * FormField Component
 *
 * Renders individual form fields based on configuration.
 * Supports all field types with consistent styling and behavior.
 */

import React from 'react';
import type { FormFieldProps } from '@/types/modal';

/**
 * Individual form field component
 */
export function FormField({ field, value, error, onChange, disabled }: FormFieldProps) {
  const baseInputClasses = `
    w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    ${error ? 'border-red-500' : 'border-gray-300'}
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
  `;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    onChange(event.target.value);
  };

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.checked);
  };

  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'url':
      case 'password':
        return (
          <input
            type={field.type}
            id={field.id}
            name={field.id}
            value={value as string || ''}
            placeholder={field.placeholder}
            onChange={handleChange}
            disabled={disabled}
            className={baseInputClasses}
            required={field.required}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            id={field.id}
            name={field.id}
            value={value as string || ''}
            placeholder={field.placeholder}
            onChange={handleChange}
            disabled={disabled}
            className={baseInputClasses}
            required={field.required}
          />
        );

      case 'textarea':
        return (
          <textarea
            id={field.id}
            name={field.id}
            value={value as string || ''}
            placeholder={field.placeholder}
            onChange={handleChange}
            disabled={disabled}
            className={`${baseInputClasses} min-h-[100px] resize-vertical`}
            required={field.required}
          />
        );

      case 'select':
        return (
          <select
            id={field.id}
            name={field.id}
            value={value as string || ''}
            onChange={handleChange}
            disabled={disabled}
            className={baseInputClasses}
            required={field.required}
          >
            <option value="">{field.placeholder || 'Select an option'}</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={field.id}
              name={field.id}
              checked={value as boolean || false}
              onChange={handleCheckboxChange}
              disabled={disabled}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor={field.id} className="text-sm text-gray-700">
              {field.label}
            </label>
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`${field.id}_${option.value}`}
                  name={field.id}
                  value={option.value}
                  checked={value === option.value}
                  onChange={handleChange}
                  disabled={disabled}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor={`${field.id}_${option.value}`} className="text-sm text-gray-700">
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <div className="text-red-500 text-sm">
            Unsupported field type: {field.type}
          </div>
        );
    }
  };

  // For checkbox, label is rendered inside the field
  if (field.type === 'checkbox') {
    return (
      <div className={`space-y-1 ${field.layout?.span ? `col-span-${field.layout.span}` : ''}`}>
        {renderField()}
        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${field.layout?.span ? `col-span-${field.layout.span}` : ''}`}>
      <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderField()}
      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}
    </div>
  );
}
