/**
 * Tests for useModalState hook
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useModalState } from '../useModalState';
import type { ModalSchema } from '@/types/modal';

const mockSchema: ModalSchema = {
  id: 'test-modal',
  title: 'Test Modal',
  fields: [
    { id: 'name', label: 'Name', type: 'text', required: true },
    { id: 'email', label: 'Email', type: 'email', required: true },
    { id: 'age', label: 'Age', type: 'number', defaultValue: 25 },
  ],
};

describe('useModalState', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useModalState(mockSchema));

    expect(result.current.isOpen).toBe(false);
    expect(result.current.data).toEqual({
      name: '',
      email: '',
      age: 25,
    });
    expect(result.current.errors).toEqual({});
    expect(result.current.loading).toEqual({ submit: false, connectionTest: false });
    expect(result.current.connectionStatus).toBe('idle');
  });

  it('should initialize with provided initial data', () => {
    const initialData = { name: 'John', email: 'john@example.com' };
    const { result } = renderHook(() => useModalState(mockSchema, initialData));

    expect(result.current.data).toEqual({
      name: 'John',
      email: 'john@example.com',
      age: 25, // default value preserved
    });
  });

  it('should open modal', () => {
    const { result } = renderHook(() => useModalState(mockSchema));

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('should open modal with data', () => {
    const { result } = renderHook(() => useModalState(mockSchema));

    act(() => {
      result.current.open({ name: 'Jane' });
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.data.name).toBe('Jane');
  });

  it('should close modal', () => {
    const { result } = renderHook(() => useModalState(mockSchema));

    act(() => {
      result.current.open();
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('should update single field', () => {
    const { result } = renderHook(() => useModalState(mockSchema));

    act(() => {
      result.current.updateField('name', 'Updated Name');
    });

    expect(result.current.data.name).toBe('Updated Name');
  });

  it('should update multiple fields', () => {
    const { result } = renderHook(() => useModalState(mockSchema));

    act(() => {
      result.current.updateFields({ name: 'New Name', age: 30 });
    });

    expect(result.current.data.name).toBe('New Name');
    expect(result.current.data.age).toBe(30);
  });

  it('should clear errors when updating field', () => {
    const { result } = renderHook(() => useModalState(mockSchema));

    act(() => {
      result.current.setValidationErrors({ name: 'Required' });
      result.current.updateField('name', 'Valid Name');
    });

    expect(result.current.errors.name).toBeUndefined();
  });

  it('should set validation errors', () => {
    const { result } = renderHook(() => useModalState(mockSchema));

    const errors = { name: 'Required', email: 'Invalid email' };
    act(() => {
      result.current.setValidationErrors(errors);
    });

    expect(result.current.errors).toEqual(errors);
  });

  it('should set loading states', () => {
    const { result } = renderHook(() => useModalState(mockSchema));

    act(() => {
      result.current.setLoadingState('submit', true);
      result.current.setLoadingState('connectionTest', true);
    });

    expect(result.current.loading.submit).toBe(true);
    expect(result.current.loading.connectionTest).toBe(true);
  });

  it('should reset form', () => {
    const { result } = renderHook(() => useModalState(mockSchema));

    act(() => {
      result.current.open();
      result.current.updateField('name', 'Changed');
      result.current.setValidationErrors({ name: 'Error' });
      result.current.setLoadingState('submit', true);
      result.current.reset();
    });

    expect(result.current.data.name).toBe('');
    expect(result.current.errors).toEqual({});
    expect(result.current.loading.submit).toBe(false);
    expect(result.current.connectionStatus).toBe('idle');
  });

  it('should reinitialize data when modal opens', () => {
    const { result } = renderHook(() => useModalState(mockSchema));

    act(() => {
      result.current.open({ name: 'Initial' });
      result.current.updateField('name', 'Modified');
      result.current.close();
      result.current.open({ name: 'New Initial' });
    });

    expect(result.current.data.name).toBe('New Initial');
  });
});
