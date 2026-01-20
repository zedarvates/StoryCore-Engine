import type { Shot } from '../../types';
import type { SearchCriteria, SearchOperator, SearchFilter } from '../../types/gridEditorAdvanced';

/**
 * SearchService - Advanced search and filtering for shots
 * 
 * Supports:
 * - Real-time search (<200ms)
 * - Multiple search fields (name, tags, duration, type, status)
 * - Logical operators (AND, OR, NOT)
 * - Saved filters
 * - Predefined filters
 */
export class SearchService {
  private shots: Shot[];
  private savedFilters: Map<string, SearchFilter>;

  constructor(shots: Shot[] = []) {
    this.shots = shots;
    this.savedFilters = new Map();
  }

  /**
   * Update the shots collection
   */
  updateShots(shots: Shot[]): void {
    this.shots = shots;
  }

  /**
   * Perform a simple search across all fields
   */
  search(query: string): Shot[] {
    if (!query.trim()) {
      return this.shots;
    }

    const lowerQuery = query.toLowerCase().trim();
    
    return this.shots.filter(shot => {
      return (
        shot.title.toLowerCase().includes(lowerQuery) ||
        shot.description?.toLowerCase().includes(lowerQuery) ||
        this.matchTags(shot, lowerQuery) ||
        this.matchType(shot, lowerQuery) ||
        this.matchStatus(shot, lowerQuery)
      );
    });
  }

  /**
   * Perform an advanced search with criteria and logical operators
   */
  advancedSearch(criteria: SearchCriteria[]): Shot[] {
    if (criteria.length === 0) {
      return this.shots;
    }

    return this.shots.filter(shot => {
      return this.evaluateCriteria(shot, criteria);
    });
  }

  /**
   * Evaluate search criteria with logical operators
   */
  private evaluateCriteria(shot: Shot, criteria: SearchCriteria[]): boolean {
    if (criteria.length === 0) return true;
    if (criteria.length === 1) return this.matchCriterion(shot, criteria[0]);

    // Group criteria by operator
    const andGroups: SearchCriteria[][] = [];
    const orGroups: SearchCriteria[][] = [];
    const notGroups: SearchCriteria[] = [];

    let currentAndGroup: SearchCriteria[] = [];
    let currentOrGroup: SearchCriteria[] = [];

    for (let i = 0; i < criteria.length; i++) {
      const criterion = criteria[i];
      const nextOperator = i < criteria.length - 1 ? criteria[i + 1].operator : undefined;

      if (criterion.operator === 'NOT') {
        notGroups.push(criterion);
      } else if (nextOperator === 'AND' || nextOperator === undefined) {
        currentAndGroup.push(criterion);
        if (nextOperator === undefined || i === criteria.length - 1) {
          andGroups.push([...currentAndGroup]);
          currentAndGroup = [];
        }
      } else if (nextOperator === 'OR') {
        currentOrGroup.push(criterion);
        if (i === criteria.length - 1) {
          orGroups.push([...currentOrGroup]);
        }
      }
    }

    // Evaluate NOT criteria (must all be false)
    for (const criterion of notGroups) {
      if (this.matchCriterion(shot, criterion)) {
        return false;
      }
    }

    // Evaluate AND groups (at least one group must have all criteria match)
    let andResult = andGroups.length === 0;
    for (const group of andGroups) {
      const groupResult = group.every(c => this.matchCriterion(shot, c));
      if (groupResult) {
        andResult = true;
        break;
      }
    }

    // Evaluate OR groups (at least one criterion must match)
    let orResult = orGroups.length === 0;
    for (const group of orGroups) {
      const groupResult = group.some(c => this.matchCriterion(shot, c));
      if (groupResult) {
        orResult = true;
        break;
      }
    }

    return andResult && orResult;
  }

  /**
   * Match a single criterion against a shot
   */
  private matchCriterion(shot: Shot, criterion: SearchCriteria): boolean {
    const { field, value } = criterion;
    const lowerValue = value.toLowerCase().trim();

    switch (field) {
      case 'title':
        return shot.title.toLowerCase().includes(lowerValue);
      
      case 'description':
        return shot.description?.toLowerCase().includes(lowerValue) ?? false;
      
      case 'tags':
        return this.matchTags(shot, lowerValue);
      
      case 'duration':
        return this.matchDuration(shot.duration, value);
      
      case 'type':
        return this.matchType(shot, lowerValue);
      
      case 'status':
        return this.matchStatus(shot, lowerValue);
      
      default:
        return false;
    }
  }

  /**
   * Match tags
   */
  private matchTags(shot: Shot, query: string): boolean {
    const tags = shot.metadata?.tags as string[] | undefined;
    return tags?.some(tag => tag.toLowerCase().includes(query)) ?? false;
  }

  /**
   * Match type
   */
  private matchType(shot: Shot, query: string): boolean {
    const type = shot.metadata?.type as string | undefined;
    return type?.toLowerCase().includes(query) ?? false;
  }

  /**
   * Match status
   */
  private matchStatus(shot: Shot, query: string): boolean {
    const status = shot.metadata?.status as string | undefined;
    return status?.toLowerCase().includes(query) ?? false;
  }

  /**
   * Match duration with comparison operators
   */
  private matchDuration(duration: number, query: string): boolean {
    // Handle range queries (e.g., "5-10")
    if (query.includes('-')) {
      const [min, max] = query.split('-').map(s => parseFloat(s.trim()));
      if (!isNaN(min) && !isNaN(max)) {
        return duration >= min && duration <= max;
      }
    }
    
    // Handle comparison queries (e.g., ">5", "<10", ">=5", "<=10")
    const comparisonMatch = query.match(/^([<>]=?)\s*(\d+(?:\.\d+)?)$/);
    if (comparisonMatch) {
      const operator = comparisonMatch[1];
      const value = parseFloat(comparisonMatch[2]);
      
      if (!isNaN(value)) {
        switch (operator) {
          case '>': return duration > value;
          case '>=': return duration >= value;
          case '<': return duration < value;
          case '<=': return duration <= value;
        }
      }
    }
    
    // Handle exact match
    const exactValue = parseFloat(query);
    if (!isNaN(exactValue)) {
      return Math.abs(duration - exactValue) < 0.1;
    }
    
    return false;
  }

  /**
   * Save a filter for later use
   */
  saveFilter(filter: SearchFilter): void {
    this.savedFilters.set(filter.id, filter);
  }

  /**
   * Get a saved filter by ID
   */
  getSavedFilter(id: string): SearchFilter | undefined {
    return this.savedFilters.get(id);
  }

  /**
   * Get all saved filters
   */
  getAllSavedFilters(): SearchFilter[] {
    return Array.from(this.savedFilters.values());
  }

  /**
   * Delete a saved filter
   */
  deleteSavedFilter(id: string): boolean {
    return this.savedFilters.delete(id);
  }

  /**
   * Apply a saved filter
   */
  applySavedFilter(id: string): Shot[] {
    const filter = this.savedFilters.get(id);
    if (!filter) {
      return this.shots;
    }

    return this.advancedSearch(filter.criteria);
  }

  /**
   * Apply a predefined filter
   */
  applyPredefinedFilter(filterType: 'favorites' | 'recent' | 'unused' | 'errors'): Shot[] {
    switch (filterType) {
      case 'favorites':
        return this.shots.filter(shot => shot.metadata?.favorite === true);
      
      case 'recent':
        // Sort by creation/update time and return recent ones
        const sortedByTime = [...this.shots].sort((a, b) => {
          const timeA = (a.metadata?.updatedAt as number) || (a.metadata?.createdAt as number) || 0;
          const timeB = (b.metadata?.updatedAt as number) || (b.metadata?.createdAt as number) || 0;
          return timeB - timeA;
        });
        return sortedByTime.slice(0, 10); // Return 10 most recent
      
      case 'unused':
        return this.shots.filter(shot => shot.metadata?.used === false);
      
      case 'errors':
        return this.shots.filter(shot => shot.metadata?.hasErrors === true || shot.metadata?.status === 'error');
      
      default:
        return this.shots;
    }
  }

  /**
   * Get search suggestions based on query
   */
  getSuggestions(query: string): string[] {
    if (!query.trim()) {
      return [];
    }

    const lowerQuery = query.toLowerCase().trim();
    const suggestions = new Set<string>();

    // Suggest titles
    this.shots.forEach(shot => {
      if (shot.title.toLowerCase().includes(lowerQuery)) {
        suggestions.add(shot.title);
      }
    });

    // Suggest tags
    this.shots.forEach(shot => {
      const tags = shot.metadata?.tags as string[] | undefined;
      tags?.forEach(tag => {
        if (tag.toLowerCase().includes(lowerQuery)) {
          suggestions.add(tag);
        }
      });
    });

    // Suggest types
    this.shots.forEach(shot => {
      const type = shot.metadata?.type as string | undefined;
      if (type && type.toLowerCase().includes(lowerQuery)) {
        suggestions.add(type);
      }
    });

    return Array.from(suggestions).slice(0, 5); // Limit to 5 suggestions
  }

  /**
   * Get alternative search suggestions when no results found
   */
  getAlternativeSuggestions(query: string): string[] {
    const suggestions: string[] = [];

    // Suggest removing special characters
    if (/[^a-zA-Z0-9\s]/.test(query)) {
      suggestions.push(`Try searching without special characters: "${query.replace(/[^a-zA-Z0-9\s]/g, '')}"`);
    }

    // Suggest shorter query
    if (query.length > 20) {
      suggestions.push(`Try a shorter search term`);
    }

    // Suggest common fields
    suggestions.push(`Try searching in specific fields (title, tags, type, status)`);

    // Suggest checking spelling
    suggestions.push(`Check your spelling`);

    // Suggest using filters
    suggestions.push(`Try using advanced filters`);

    return suggestions.slice(0, 3);
  }
}

// Singleton instance
let searchServiceInstance: SearchService | null = null;

export function getSearchService(shots?: Shot[]): SearchService {
  if (!searchServiceInstance) {
    searchServiceInstance = new SearchService(shots);
  } else if (shots) {
    searchServiceInstance.updateShots(shots);
  }
  return searchServiceInstance;
}
