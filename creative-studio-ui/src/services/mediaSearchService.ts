/**
 * Media Search Service - Frontend pour Media Intelligence
 * Recherche d'assets multimédias par langage naturel
 */

import { backendApiService } from './backendApiService';

export type AssetType = 'image' | 'video' | 'audio' | 'text';
export type SearchMode = 'semantic' | 'keyword' | 'hybrid' | 'similarity';

export interface AssetMetadata {
  assetId: string;
  assetType: AssetType;
  filePath: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  tags: string[];
  description: string;
  duration?: number;
  resolution?: { width: number; height: number };
  thumbnailUrl?: string;
}

export interface SearchResult {
  assetId: string;
  assetType: AssetType;
  filePath: string;
  fileName: string;
  similarityScore: number;
  matchType: 'semantic' | 'keyword' | 'hybrid';
  highlightedText?: string;
  previewUrl?: string;
  metadata: Record<string, unknown>;
}

export interface SearchRequest {
  query: string;
  projectId?: string;
  assetTypes?: AssetType[];
  searchMode?: SearchMode;
  limit?: number;
  similarityThreshold?: number;
}

export interface IndexStats {
  totalAssets: number;
  indexedAssets: number;
  indexSizeMb: number;
  lastIndexed?: string;
  assetTypeCounts: Record<string, number>;
}

export interface MediaSearchService {
  search(request: SearchRequest): Promise<SearchResult[]>;
  indexProject(projectId: string): Promise<{ indexedAssets: number; durationSeconds: number }>;
  addAsset(filePath: string, projectId: string, tags?: string[], description?: string): Promise<string>;
  removeAsset(assetId: string): Promise<boolean>;
  getAssetMetadata(assetId: string): Promise<AssetMetadata | null>;
  getIndexStats(): Promise<IndexStats>;
}

class MediaSearchServiceImpl implements MediaSearchService {
  private baseUrl = '/api/v1/media';
  private cache: Map<string, { results: SearchResult[]; timestamp: number }> = new Map();
  private cacheTTL = 10 * 60 * 1000; // 10 minutes

  async search(request: SearchRequest): Promise<SearchResult[]> {
    const cacheKey = `${request.query}:${request.projectId}:${request.searchMode}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log(`[MediaSearch] Cache hit for: ${request.query}`);
      return cached.results;
    }

    try {
      const response = await backendApiService.post<{ results: SearchResult[] }>(
        `${this.baseUrl}/search`,
        request
      );

      // Cache les résultats
      this.cache.set(cacheKey, {
        results: response.results,
        timestamp: Date.now()
      });

      return response.results;
    } catch (error) {
      console.error('[MediaSearch] Search failed:', error);
      // Fallback: recherche locale basique
      return this.localSearchFallback(request);
    }
  }

  async indexProject(projectId: string): Promise<{ indexedAssets: number; durationSeconds: number }> {
    try {
      const response = await backendApiService.post<{
        projectId: string;
        indexedAssets: number;
        durationSeconds: number;
        errors: string[];
      }>(`${this.baseUrl}/index`, { projectId });

      console.log(`[MediaSearch] Indexed ${response.indexedAssets} assets for project ${projectId}`);
      return {
        indexedAssets: response.indexedAssets,
        durationSeconds: response.durationSeconds
      };
    } catch (error) {
      console.error('[MediaSearch] Indexing failed:', error);
      throw error;
    }
  }

  async addAsset(
    filePath: string,
    projectId: string,
    tags?: string[],
    description?: string
  ): Promise<string> {
    try {
      const response = await backendApiService.post<{ assetId: string }>(
        `${this.baseUrl}/add`,
        { filePath, projectId, tags, description }
      );

      // Invalider le cache
      this.cache.clear();

      return response.assetId;
    } catch (error) {
      console.error('[MediaSearch] Add asset failed:', error);
      throw error;
    }
  }

  async removeAsset(assetId: string): Promise<boolean> {
    try {
      await backendApiService.delete(`${this.baseUrl}/${assetId}`);
      
      // Invalider le cache
      this.cache.clear();

      return true;
    } catch (error) {
      console.error('[MediaSearch] Remove asset failed:', error);
      return false;
    }
  }

  async getAssetMetadata(assetId: string): Promise<AssetMetadata | null> {
    try {
      return await backendApiService.get<AssetMetadata>(`${this.baseUrl}/${assetId}`);
    } catch (error) {
      console.error('[MediaSearch] Get metadata failed:', error);
      return null;
    }
  }

  async getIndexStats(): Promise<IndexStats> {
    try {
      return await backendApiService.get<IndexStats>(`${this.baseUrl}/stats`);
    } catch (error) {
      console.error('[MediaSearch] Get stats failed:', error);
      return {
        totalAssets: 0,
        indexedAssets: 0,
        indexSizeMb: 0,
        assetTypeCounts: {}
      };
    }
  }

  /**
   * Recherche locale basique (fallback)
   */
  private async localSearchFallback(request: SearchRequest): Promise<SearchResult[]> {
    // Implémentation simple de recherche par mots-clés
    const queryWords = request.query.toLowerCase().split(' ');
    
    //TODO: Intégrer avec le système d'assets existant
    console.log('[MediaSearch] Using local fallback search');
    
    return [];
  }

  /**
   * Vider le cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const mediaSearchService = new MediaSearchServiceImpl();

