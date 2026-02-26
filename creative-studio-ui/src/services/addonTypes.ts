/**
 * Add-on Types - Shared type definitions for the add-on system
 * 
 * This file contains type definitions used by both AddonManager and FileSystemService
 * to avoid circular dependencies.
 */

/**
 * Add-on configuration structure
 */
export interface AddonConfig {
  [addonId: string]: {
    enabled: boolean;
    settings?: Record<string, unknown>;
  };
}

/**
 * Add-on action definition
 */
export interface AddonAction {
  id: string;
  name: string;
  description?: string;
  icon?: React.ReactNode | string;
  handler?: () => Promise<void> | void;
}

/**
 * Add-on information
 */
export interface AddonInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: 'ui' | 'processing' | 'export' | 'integration' | 'utility' | 'character' | 'world' | 'story';
  dependencies?: string[];
  enabled: boolean;
  builtin: boolean;
  status: 'active' | 'inactive' | 'error' | 'loading';
  errorMessage?: string;
  icon?: string;
  tags?: string[];
}

/**
 * Add-on setting definition
 */
export interface AddonSetting {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea';
  defaultValue: unknown;
  description?: string;
  options?: Array<{ label: string; value: unknown }>;
  min?: number;
  max?: number;
  validation?: (value: unknown) => boolean;
}

/**
 * Add-on settings definition map
 */
export interface AddonSettingsDefinition {
  [addonId: string]: AddonSetting[];
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'version' | 'status' | 'category';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  sort: {
    by: string;
    order: string;
  };
}

/**
 * Marketplace addon info
 */
export interface MarketplaceAddon {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  category: string;
  rating: number;
  downloads: number;
  price: string;
}

/**
 * External add-on manifest
 */
export interface AddonManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  permissions: string[];
  entryPoint: string;
  dependencies?: Record<string, string>;
}