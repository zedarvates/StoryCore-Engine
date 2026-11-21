
/**
 * Media Search Panel Component - Adobe Premiere Style Media Intelligence
 * Search and find media assets using natural language
 */

import React, { useState, useCallback } from 'react';
import { mediaSearchService, type SearchResult, type SearchRequest, type AssetType } from '../../../services/mediaSearchService';
import styles from './MediaSearchPanel.module.css';

interface MediaSearchPanelProps {
  projectId?: string;
  onAssetSelect?: (asset: SearchResult) => void;
}

export const MediaSearchPanel: React.FC<MediaSearchPanelProps> = ({
  projectId,
  onAssetSelect
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<'semantic' | 'keyword' | 'hybrid'>('hybrid');
  const [assetTypes, setAssetTypes] = useState<AssetType[]>(['image', 'video', 'audio']);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const request: SearchRequest = {
        query,
        projectId,
        assetTypes,
        searchMode,
        limit: 20
      };

      const searchResults = await mediaSearchService.search(request);
      setResults(Array.isArray(searchResults) ? searchResults : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [query, projectId, assetTypes, searchMode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const toggleAssetType = (type: AssetType) => {
    setAssetTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'video': return '🎬';
      case 'image': return '🖼️';
      case 'audio': return '🎵';
      default: return '📁';
    }
  };

  const handleAssetClick = (asset: SearchResult) => {
    if (onAssetSelect) {
      onAssetSelect(asset);
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>🔍 Media Intelligence</h3>
        <p>Recherchez vos assets par langage naturel</p>
      </div>

      <div className={styles.searchBox}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ex: 'Trouver des vidéos avec dialogue', 'Images de coucher de soleil'..."
          className={styles.searchInput}
        />
        <button
          onClick={handleSearch}
          disabled={isLoading || !query.trim()}
          className={styles.searchButton}
        >
          {isLoading ? '🔄' : '🔍'}
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Mode de recherche:</label>
          <select
            value={searchMode}
            onChange={(e) => setSearchMode(e.target.value as typeof searchMode)}
            className={styles.select}
          >
            <option value="hybrid">🔀 Hybride (Recommandé)</option>
            <option value="semantic">🧠 Sémantique</option>
            <option value="keyword">🔤 Mots-clés</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Types d'assets:</label>
          <div className={styles.typeButtons}>
            {(['image', 'video', 'audio'] as AssetType[]).map(type => (
              <button
                key={type}
                onClick={() => toggleAssetType(type)}
                className={`${styles.typeButton} ${assetTypes.includes(type) ? styles.active : ''}`}
              >
                {type === 'image' && '🖼️'}
                {type === 'video' && '🎬'}
                {type === 'audio' && '🎵'}
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          ⚠️ {error}
        </div>
      )}

      <div className={styles.results}>
        {results.length === 0 && !isLoading && query && (
          <div className={styles.noResults}>
            <p>Aucun résultat trouvé pour "{query}"</p>
            <p className={styles.tip}>💡 Essayez: "vidéos de nature", "images avec ciel bleu"</p>
          </div>
        )}

        {results.map((result) => (
          <div
            key={result.assetId}
            className={styles.resultCard}
            onClick={() => handleAssetClick(result)}
          >
            <div className={styles.resultIcon}>
              {getAssetIcon(result.assetType)}
            </div>
            <div className={styles.resultInfo}>
              <div className={styles.resultName}>{result.fileName}</div>
              <div className={styles.resultMeta}>
                <span className={styles.resultType}>{result.assetType}</span>
                <span className={styles.resultScore}>
                  {Math.round(result.similarityScore * 100)}% match
                </span>
              </div>
              {typeof result.highlightedText === 'string' && result.highlightedText && (
                <div className={styles.resultHighlight}>
                  {result.highlightedText.split(/\*\*(.*?)\*\*/g).map((part, index) =>
                    index % 2 ? <mark key={`${index}:${part}`}>{part}</mark> : part
                  )}
                </div>
              )}
            </div>
            <div className={styles.resultMatch}>
              <span className={`${styles.matchBadge} ${styles[result.matchType]}`}>
                {result.matchType}
              </span>
            </div>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Recherche en cours...</p>
        </div>
      )}

      <div className={styles.tips}>
        <h4>💡 Exemples de recherches:</h4>
        <ul>
          <li>"Vidéos avec dialogue et émotion"</li>
          <li>"Images de coucher de soleil"</li>
          <li>"Musique calme et apaisante"</li>
          <li>"Scènes d'action intenses"</li>
        </ul>
      </div>
    </div>
  );
};

export default MediaSearchPanel;

