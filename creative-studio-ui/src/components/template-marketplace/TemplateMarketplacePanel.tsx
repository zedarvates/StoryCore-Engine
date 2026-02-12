/**
 * Template Marketplace Panel Component
 * MI3: Template Marketplace - User template sharing
 */

import React, { useState, useEffect } from 'react';
import { useTemplateMarketplaceStore } from '../../stores/templateMarketplaceStore';
import { templateMarketplaceService } from '../../services/TemplateMarketplaceService';
import { Template, TemplateCategory } from '../../types/template-marketplace';
import styles from './TemplateMarketplacePanel.module.css';

type SortOption = 'newest' | 'popular' | 'rating' | 'price-low' | 'price-high';

export const TemplateMarketplacePanel: React.FC = () => {
  const {
    marketplace,
    userLibrary,
    selectedTemplateId,
    isPanelOpen,
    isDetailViewOpen,
    isUploadModalOpen,
    searchTemplates,
    loadMoreTemplates,
    selectTemplate,
    openDetailView,
    closeDetailView,
    downloadTemplate,
    favoriteTemplate,
    unfavoriteTemplate,
    togglePanel,
    openUploadModal,
    closeUploadModal,
  } = useTemplateMarketplaceStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');

  // Load featured templates on mount
  useEffect(() => {
    templateMarketplaceService.getFeaturedTemplates().then((templates) => {
      useTemplateMarketplaceStore.setState((state) => ({
        marketplace: {
          ...state.marketplace,
          templates,
          featuredTemplates: templates.map((t) => t.id),
        },
      }));
    });
  }, []);

  // Search when filters change
  useEffect(() => {
    searchTemplates({
      query: searchQuery,
      categories: activeCategory === 'all' ? [] : [activeCategory as TemplateCategory],
      sortBy,
      price: priceFilter,
      page: 1,
    });
  }, [searchQuery, activeCategory, sortBy, priceFilter]);

  const handleTemplateClick = (template: Template) => {
    selectTemplate(template.id);
    openDetailView(template.id);
  };

  const handleDownload = async (templateId: string) => {
    await downloadTemplate(templateId);
  };

  const handleToggleFavorite = (templateId: string) => {
    if (userLibrary.favorites.includes(templateId)) {
      unfavoriteTemplate(templateId);
    } else {
      favoriteTemplate(templateId);
    }
  };

  const categories: { id: TemplateCategory | 'all'; label: string; icon: string }[] = [
    { id: 'all', label: 'All', icon: '📦' },
    { id: 'intro', label: 'Intro', icon: '🎬' },
    { id: 'transitions', label: 'Transitions', icon: '🔀' },
    { id: 'lower-thirds', label: 'Lower Thirds', icon: '🏷️' },
    { id: 'titles', label: 'Titles', icon: '✨' },
    { id: 'social-media', label: 'Social', icon: '📱' },
    { id: 'promotional', label: 'Promo', icon: '📢' },
  ];

  if (!isPanelOpen) {
    return (
      <button className={styles.toggleButton} onClick={togglePanel}>
        🛒 Marketplace
      </button>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>Template Marketplace</h3>
        <div className={styles.headerActions}>
          <button className={styles.uploadBtn} onClick={openUploadModal}>
            ⬆️ Upload
          </button>
          <button className={styles.closeButton} onClick={togglePanel}>
            ×
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {/* Search Bar */}
        <div className={styles.searchBar}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className={styles.searchInput}
          />
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className={styles.select}
          >
            <option value="popular">Most Popular</option>
            <option value="newest">Newest</option>
            <option value="rating">Highest Rated</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>

          <select
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value as 'all' | 'free' | 'paid')}
            className={styles.select}
          >
            <option value="all">All Prices</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {/* Categories */}
        <div className={styles.categories}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.categoryChip} ${
                activeCategory === cat.id ? styles.active : ''
              }`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <span className={styles.catIcon}>{cat.icon}</span>
              <span className={styles.catLabel}>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className={styles.templatesGrid}>
          {marketplace.templates.map((template) => (
            <div
              key={template.id}
              className={`${styles.templateCard} ${
                selectedTemplateId === template.id ? styles.selected : ''
              }`}
              onClick={() => handleTemplateClick(template)}
            >
              <div
                className={styles.templateThumb}
                style={{ backgroundImage: `url(${template.thumbnail})` }}
              >
                {template.isFeatured && (
                  <span className={styles.featuredBadge}>Featured</span>
                )}
                {template.pricing.type === 'free' && (
                  <span className={styles.freeBadge}>Free</span>
                )}
              </div>

              <div className={styles.templateInfo}>
                <h4 className={styles.templateName}>{template.name}</h4>
                <p className={styles.templateDesc}>{template.description}</p>
                <div className={styles.templateMeta}>
                  <span className={styles.author}>
                    by {template.author.displayName}
                  </span>
                  <div className={styles.stats}>
                    <span>⬇️ {template.statistics.downloads}</span>
                    <span>⭐ {template.statistics.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              <div className={styles.templateActions}>
                <button
                  className={`${styles.favBtn} ${
                    userLibrary.favorites.includes(template.id) ? styles.active : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(template.id);
                  }}
                >
                  {userLibrary.favorites.includes(template.id) ? '❤️' : '🤍'}
                </button>
                <button
                  className={styles.downloadBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(template.id);
                  }}
                >
                  {template.pricing.type === 'free' ? 'Download' : 
                   `$${template.pricing.price}`}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        {marketplace.hasMore && (
          <button
            className={styles.loadMoreBtn}
            onClick={loadMoreTemplates}
            disabled={marketplace.isLoading}
          >
            {marketplace.isLoading ? 'Loading...' : 'Load More'}
          </button>
        )}

        {/* User Library */}
        <div className={styles.librarySection}>
          <h4 className={styles.sectionTitle}>My Library</h4>
          <div className={styles.libraryStats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {userLibrary.purchasedTemplates.length}
              </span>
              <span className={styles.statLabel}>Purchased</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {userLibrary.downloadedTemplates.length}
              </span>
              <span className={styles.statLabel}>Downloaded</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {userLibrary.favorites.length}
              </span>
              <span className={styles.statLabel}>Favorites</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detail View Modal */}
      {isDetailViewOpen && selectedTemplateId && (
        <div className={styles.modal} onClick={closeDetailView}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={closeDetailView}>
              ×
            </button>
            <TemplateDetailView templateId={selectedTemplateId} />
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className={styles.modal} onClick={closeUploadModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Upload Template</h3>
              <button className={styles.modalClose} onClick={closeUploadModal}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>Template upload form would go here</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Template Detail View Component
const TemplateDetailView: React.FC<{ templateId: string }> = ({ templateId }) => {
  const { marketplace } = useTemplateMarketplaceStore();
  const template = marketplace.templates.find((t) => t.id === templateId);

  if (!template) return null;

  return (
    <div className={styles.detailView}>
      <div
        className={styles.detailThumb}
        style={{ backgroundImage: `url(${template.thumbnail})` }}
      />
      <div className={styles.detailContent}>
        <h2>{template.name}</h2>
        <p className={styles.detailDesc}>{template.description}</p>
        
        <div className={styles.detailMeta}>
          <span>by {template.author.displayName}</span>
          <span>⬇️ {template.statistics.downloads}</span>
          <span>⭐ {template.statistics.rating.toFixed(1)}</span>
        </div>

        <div className={styles.detailPricing}>
          {template.pricing.type === 'free' ? (
            <span className={styles.freeTag}>Free</span>
          ) : (
            <span className={styles.priceTag}>${template.pricing.price}</span>
          )}
        </div>

        <div className={styles.detailFeatures}>
          {template.features.map((feature) => (
            <div key={feature.id} className={styles.feature}>
              <span>✓ {feature.name}</span>
            </div>
          ))}
        </div>

        <div className={styles.detailActions}>
          <button className={styles.primaryBtn}>
            {template.pricing.type === 'free' ? 'Download' : 'Purchase'}
          </button>
          <button className={styles.secondaryBtn}>Add to Collection</button>
        </div>
      </div>
    </div>
  );
};

export default TemplateMarketplacePanel;
