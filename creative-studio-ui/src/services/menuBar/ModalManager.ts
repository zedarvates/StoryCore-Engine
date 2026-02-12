/**
 * ModalManager - Centralized modal management for menu bar
 * 
 * Manages modal lifecycle including:
 * - Modal registration and component mapping
 * - Opening and closing modals
 * - Tracking active modals
 * - Passing props to modal components
 * 
 * Requirements: 1.1, 1.4, 1.5, 2.10, 6.2, 6.3
 */

import React from 'react';

export interface ModalConfig {
  id: string;
  component: React.ComponentType<any>;
  props?: Record<string, unknown>;
}

export interface ModalState {
  id: string;
  props?: Record<string, unknown>;
}

type ModalListener = (activeModals: Set<string>) => void;

/**
 * ModalManager class
 * 
 * Provides centralized modal management with:
 * - Registration of modal components
 * - Opening/closing modals with props
 * - Tracking active modals
 * - State change notifications
 */
export class ModalManager {
  private modalComponents: Map<string, React.ComponentType<any>>;
  private activeModals: Map<string, ModalState>;
  private listeners: Set<ModalListener>;

  constructor() {
    this.modalComponents = new Map();
    this.activeModals = new Map();
    this.listeners = new Set();
  }

  /**
   * Register a modal component
   * 
   * @param id - Unique identifier for the modal
   * @param component - React component to render
   */
  registerModal(id: string, component: React.ComponentType<any>): void {
    this.modalComponents.set(id, component);
  }

  /**
   * Unregister a modal component
   * 
   * @param id - Modal identifier to unregister
   */
  unregisterModal(id: string): void {
    this.modalComponents.delete(id);
    this.activeModals.delete(id);
    this.notifyListeners();
  }

  /**
   * Open a modal
   * 
   * @param id - Modal identifier
   * @param props - Props to pass to the modal component
   * @throws Error if modal is not registered
   */
  openModal(id: string, props?: Record<string, unknown>): void {
    if (!this.modalComponents.has(id)) {
      throw new Error(`Modal "${id}" is not registered`);
    }

    this.activeModals.set(id, { id, props });
    this.notifyListeners();
  }

  /**
   * Close a modal
   * 
   * @param id - Modal identifier to close
   */
  closeModal(id: string): void {
    this.activeModals.delete(id);
    this.notifyListeners();
  }

  /**
   * Close all modals
   */
  closeAll(): void {
    this.activeModals.clear();
    this.notifyListeners();
  }

  /**
   * Check if a modal is open
   * 
   * @param id - Modal identifier
   * @returns true if modal is open
   */
  isOpen(id: string): boolean {
    return this.activeModals.has(id);
  }

  /**
   * Get all active modal IDs
   * 
   * @returns Set of active modal IDs
   */
  getActiveModals(): Set<string> {
    return new Set(this.activeModals.keys());
  }

  /**
   * Get modal component by ID
   * 
   * @param id - Modal identifier
   * @returns Modal component or undefined
   */
  getModalComponent(id: string): React.ComponentType<any> | undefined {
    return this.modalComponents.get(id);
  }

  /**
   * Get modal state (props) by ID
   * 
   * @param id - Modal identifier
   * @returns Modal state or undefined
   */
  getModalState(id: string): ModalState | undefined {
    return this.activeModals.get(id);
  }

  /**
   * Subscribe to modal state changes
   * 
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  subscribe(listener: ModalListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    const activeModalIds = this.getActiveModals();
    this.listeners.forEach(listener => listener(activeModalIds));
  }

  /**
   * Get all registered modal IDs
   * 
   * @returns Array of registered modal IDs
   */
  getRegisteredModals(): string[] {
    return Array.from(this.modalComponents.keys());
  }

  /**
   * Clear all registrations and active modals
   * Useful for cleanup or testing
   */
  reset(): void {
    this.modalComponents.clear();
    this.activeModals.clear();
    this.listeners.clear();
  }
}

// Singleton instance for global use
export const modalManager = new ModalManager();

