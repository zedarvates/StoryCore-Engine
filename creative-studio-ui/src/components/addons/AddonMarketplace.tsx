/**
 * AddonMarketplace Component
 * Page principale du marketplace d'add-ons
 */

import React, { useEffect, useState } from 'react';
import { useAddonStore, selectFilteredAddons } from '../../stores/addonStore';
import { AddonCard } from './AddonCard';
import { AddonDetailsModal } from './AddonDetailsModal';

export const AddonMarketplace: React.FC = () => {
  const {
    addons,
    selectedAddon,
    categories,
    types,
    loading,
    error,
    searchQuery,
    selectedCategory,
    selectedType,
    selectedStatus,
    fetchAddons,
    fetchAddonDetails,
    fetchCategories,
    fetchTypes,
    enableAddon,
    disableAddon,
    searchAddons,
    filterByCategory,
    filterByType,
    filterByStatus,
    clearError,
  } = useAddonStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'author'>('name');

  useEffect(() => {
    fetchAddons();
    fetchCategories();
    fetchTypes();
  }, []);

  const handleAddonSelect = async (addonName: string) => {
    await fetchAddonDetails(addonName);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    searchAddons(e.target.value);
  };

  const handleClearFilters = () => {
    filterByCategory(null);
    filterByType(null);
    filterByStatus(null);
    searchAddons('');
  };

  // Sort addons
  const sortedAddons = [...addons].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'author':
        return a.author.localeCompare(b.author);
      case 'date':
        // Assuming newer versions are "newer"
        return b.version.localeCompare(a.version);
      default:
        return 0;
    }
  });

  const hasActiveFilters = selectedCategory || selectedType || selectedStatus || searchQuery;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Add-on Marketplace
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Discover and install add-ons to extend StoryCore functionality
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-red-600 dark:text-red-400">⚠️</span>
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              ×
            </button>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search add-ons..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full px-4 py-3 pl-12 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            />
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              🔍
            </span>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter */}
            <select
              value={selectedCategory || ''}
              onChange={(e) => filterByCategory(e.target.value || null)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {Object.entries(categories).map(([key, cat]) => (
                <option key={key} value={key}>
                  {cat.name} ({cat.count})
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={selectedType || ''}
              onChange={(e) => filterByType(e.target.value || null)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              {Object.entries(types).map(([key, type]) => (
                <option key={key} value={key}>
                  {type.icon} {type.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus || ''}
              onChange={(e) => filterByStatus(e.target.value || null)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
              <option value="error">Error</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Sort by Name</option>
              <option value="author">Sort by Author</option>
              <option value="date">Sort by Version</option>
            </select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                Clear Filters
              </button>
            )}

            {/* Refresh */}
            <button
              onClick={() => fetchAddons()}
              disabled={loading}
              className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Loading...' : '🔄 Refresh'}
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mb-6 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>
            Showing <strong className="text-gray-900 dark:text-white">{sortedAddons.length}</strong> add-ons
          </span>
          {hasActiveFilters && (
            <span className="text-blue-600 dark:text-blue-400">
              (filtered)
            </span>
          )}
        </div>

        {/* Loading State */}
        {loading && addons.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading add-ons...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && sortedAddons.length === 0 && (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">📦</span>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No add-ons found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {hasActiveFilters
                ? 'Try adjusting your filters or search query'
                : 'No add-ons are currently installed'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Addons Grid */}
        {!loading && sortedAddons.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedAddons.map((addon) => (
              <AddonCard
                key={addon.name}
                addon={addon}
                onSelect={() => handleAddonSelect(addon.name)}
                onEnable={() => enableAddon(addon.name)}
                onDisable={() => disableAddon(addon.name)}
              />
            ))}
          </div>
        )}

        {/* Details Modal */}
        <AddonDetailsModal
          addon={selectedAddon}
          isOpen={isModalOpen}
          onClose={handleModalClose}
        />
      </div>
    </div>
  );
};
