/**
 * Template Marketplace Service
 * MI3: Template Marketplace - User template sharing
 */

import {
  Template,
  TemplateCollection,
  TemplateReview,
  MarketplaceSearchParams,
  TemplateUploadData,
} from '../types/template-marketplace';

interface MarketplaceAPIConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
}

class TemplateMarketplaceService {
  private config: MarketplaceAPIConfig;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(config?: Partial<MarketplaceAPIConfig>) {
    this.config = {
      baseUrl: 'https://api.storycore.io/marketplace',
      timeout: 30000,
      ...config,
    };
  }

  /**
   * Search templates with given parameters
   */
  async searchTemplates(params: MarketplaceSearchParams): Promise<{
    templates: Template[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const cacheKey = `search_${JSON.stringify(params)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const queryParams = new URLSearchParams({
        page: params.page.toString(),
        limit: params.limit.toString(),
        sortBy: params.sortBy || 'popular',
      });

      if (params.query) queryParams.set('q', params.query);
      if (params.price) queryParams.set('price', params.price);
      if (params.rating) queryParams.set('rating', params.rating.toString());
      if (params.categories?.length) {
        queryParams.set('categories', params.categories.join(','));
      }
      if (params.aspectRatios?.length) {
        queryParams.set('aspectRatios', params.aspectRatios.join(','));
      }
      if (params.resolutions?.length) {
        queryParams.set('resolutions', params.resolutions.join(','));
      }
      if (params.tags?.length) {
        queryParams.set('tags', params.tags.join(','));
      }

      const response = await fetch(
        `${this.config.baseUrl}/templates?${queryParams}`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      this.addToCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to search templates:', error);
      return { templates: [], totalCount: 0, hasMore: false };
    }
  }

  /**
   * Get template details by ID
   */
  async getTemplateById(id: string): Promise<Template | null> {
    const cacheKey = `template_${id}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${this.config.baseUrl}/templates/${id}`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`API error: ${response.status}`);
      }

      const template = await response.json();
      this.addToCache(cacheKey, template);
      return template;
    } catch (error) {
      console.error('Failed to get template:', error);
      return null;
    }
  }

  /**
   * Get featured templates
   */
  async getFeaturedTemplates(): Promise<Template[]> {
    const cacheKey = 'featured';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${this.config.baseUrl}/templates/featured`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
      const templates = await response.json();
      this.addToCache(cacheKey, templates);
      return templates;
    } catch (error) {
      console.error('Failed to get featured templates:', error);
      return [];
    }
  }

  /**
   * Get template collections
   */
  async getCollections(): Promise<TemplateCollection[]> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/collections`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get collections:', error);
      return [];
    }
  }

  /**
   * Get reviews for a template
   */
  async getTemplateReviews(templateId: string): Promise<TemplateReview[]> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/templates/${templateId}/reviews`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get reviews:', error);
      return [];
    }
  }

  /**
   * Download a template
   */
  async downloadTemplate(templateId: string): Promise<Blob | null> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/templates/${templateId}/download`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return await response.blob();
    } catch (error) {
      console.error('Failed to download template:', error);
      return null;
    }
  }

  /**
   * Purchase a template
   */
  async purchaseTemplate(templateId: string): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/templates/${templateId}/purchase`,
        {
          method: 'POST',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message };
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to purchase template:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * Upload a new template
   */
  async uploadTemplate(data: TemplateUploadData): Promise<{
    success: boolean;
    templateId?: string;
    error?: string;
  }> {
    try {
      const formData = new FormData();
      
      // Add template data
      formData.append('template', JSON.stringify(data.template));
      formData.append('isPublic', data.isPublic.toString());
      formData.append('license', data.license);
      formData.append('attributionRequired', data.attributionRequired.toString());
      
      if (data.price !== undefined) {
        formData.append('price', data.price.toString());
      }

      // Add files
      formData.append('thumbnail', data.thumbnail);
      if (data.preview) {
        formData.append('preview', data.preview);
      }
      if (data.documentation) {
        formData.append('documentation', data.documentation);
      }
      data.assets.forEach((asset, index) => {
        formData.append(`asset_${index}`, asset);
      });

      const response = await fetch(`${this.config.baseUrl}/templates`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message };
      }

      const result = await response.json();
      return { success: true, templateId: result.id };
    } catch (error) {
      console.error('Failed to upload template:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * Submit a review
   */
  async submitReview(
    templateId: string,
    review: Omit<TemplateReview, 'id' | 'templateId' | 'createdAt' | 'updatedAt'>
  ): Promise<TemplateReview | null> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/templates/${templateId}/reviews`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(review),
        }
      );

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to submit review:', error);
      return null;
    }
  }

  /**
   * Favorite/unfavorite a template
   */
  async toggleFavorite(templateId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/templates/${templateId}/favorite`,
        {
          method: 'POST',
          headers: this.getHeaders(),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      return false;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/json',
    };
    
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    
    return headers;
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): unknown | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private addToCache(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}

export const templateMarketplaceService = new TemplateMarketplaceService();
export default TemplateMarketplaceService;


