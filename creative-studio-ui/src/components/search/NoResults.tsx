import React, { useMemo } from 'react';
import { Search, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import { getSearchService } from '../../services/search/SearchService';

export interface NoResultsProps {
  query: string;
  onSuggestionClick?: (suggestion: string) => void;
}

export const NoResults: React.FC<NoResultsProps> = ({
  query,
  onSuggestionClick
}) => {
  const suggestions = useMemo(() => {
    const searchService = getSearchService();
    return searchService.getAlternativeSuggestions(query);
  }, [query]);

  return (
    <motion.div
      className="no-results"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <div className="no-results-icon">
        <Search size={48} />
      </div>

      <h3>No results found</h3>
      
      {query && (
        <p className="search-query">
          No shots match your search for <strong>"{query}"</strong>
        </p>
      )}

      {suggestions.length > 0 && (
        <div className="suggestions-section">
          <div className="suggestions-header">
            <Lightbulb size={18} />
            <span>Suggestions</span>
          </div>

          <ul className="suggestions-list">
            {suggestions.map((suggestion, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {suggestion.includes('"') ? (
                  <span dangerouslySetInnerHTML={{ __html: suggestion }} />
                ) : (
                  <span>{suggestion}</span>
                )}
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      <div className="tips-section">
        <h4>Search Tips</h4>
        <ul className="tips-list">
          <li>Check your spelling</li>
          <li>Try different keywords</li>
          <li>Use more general terms</li>
          <li>Try searching in specific fields (title, tags, type)</li>
          <li>Use advanced filters for more precise results</li>
        </ul>
      </div>

      <style jsx>{`
        .no-results {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 3rem 2rem;
          text-align: center;
        }

        .no-results-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 96px;
          height: 96px;
          margin-bottom: 1.5rem;
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 50%;
          color: var(--text-tertiary, #999);
        }

        .no-results h3 {
          margin: 0 0 0.5rem 0;
          font-size: 24px;
          font-weight: 600;
          color: var(--text-primary, #333);
        }

        .search-query {
          margin: 0 0 2rem 0;
          font-size: 16px;
          color: var(--text-secondary, #666);
        }

        .search-query strong {
          color: var(--text-primary, #333);
        }

        .suggestions-section {
          width: 100%;
          max-width: 600px;
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: var(--bg-info, #e7f3ff);
          border-radius: 8px;
          text-align: left;
        }

        .suggestions-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          font-size: 16px;
          font-weight: 600;
          color: var(--primary-color, #007bff);
        }

        .suggestions-list {
          margin: 0;
          padding-left: 1.5rem;
          list-style: disc;
        }

        .suggestions-list li {
          margin-bottom: 0.5rem;
          font-size: 14px;
          color: var(--text-primary, #333);
          line-height: 1.5;
        }

        .suggestions-list li:last-child {
          margin-bottom: 0;
        }

        .tips-section {
          width: 100%;
          max-width: 600px;
          padding: 1.5rem;
          background: white;
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 8px;
          text-align: left;
        }

        .tips-section h4 {
          margin: 0 0 1rem 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary, #333);
        }

        .tips-list {
          margin: 0;
          padding-left: 1.5rem;
          list-style: disc;
        }

        .tips-list li {
          margin-bottom: 0.5rem;
          font-size: 14px;
          color: var(--text-secondary, #666);
          line-height: 1.5;
        }

        .tips-list li:last-child {
          margin-bottom: 0;
        }

        @media (max-width: 768px) {
          .no-results {
            padding: 2rem 1rem;
          }

          .no-results-icon {
            width: 72px;
            height: 72px;
          }

          .no-results-icon :global(svg) {
            width: 36px;
            height: 36px;
          }

          .no-results h3 {
            font-size: 20px;
          }

          .search-query {
            font-size: 14px;
          }
        }
      `}</style>
    </motion.div>
  );
};
