# Search and Filtering Components

Comprehensive search and filtering system for shots with real-time search, logical operators, saved filters, and predefined filters.

## Components

### SearchBar

Basic search component with real-time filtering (<200ms response time).

**Features:**
- Real-time search across multiple fields
- Debounced input (configurable delay)
- Field-specific search (title, tags, duration, type, status)
- Results count display
- Clear button
- Advanced filters toggle

**Usage:**
```tsx
import { SearchBar } from './components/search/SearchBar';

<SearchBar
  shots={shots}
  onSearchResults={(results) => setFilteredShots(results)}
  placeholder="Search shots..."
  debounceMs={200}
  showAdvancedFilters={true}
/>
```

**Props:**
- `shots`: Array of shots to search
- `onSearchResults`: Callback with filtered results
- `placeholder`: Search input placeholder text
- `debounceMs`: Debounce delay in milliseconds (default: 200)
- `showAdvancedFilters`: Show/hide advanced filters toggle

### AdvancedSearch

Advanced search with logical operators (AND, OR, NOT) and multiple criteria.

**Features:**
- Multiple search criteria
- Logical operators (AND, OR, NOT)
- Field-specific search
- Dynamic criterion addition/removal
- Search tips and help
- Duration range queries (>5, <10, 5-10)

**Usage:**
```tsx
import { AdvancedSearch } from './components/search/AdvancedSearch';

<AdvancedSearch
  shots={shots}
  onSearchResults={(results) => setFilteredShots(results)}
  onClose={() => setShowAdvanced(false)}
/>
```

**Props:**
- `shots`: Array of shots to search
- `onSearchResults`: Callback with filtered results
- `onClose`: Optional callback to close the component

**Logical Operators:**
- **AND**: Both conditions must be true
- **OR**: At least one condition must be true
- **NOT**: Condition must be false

**Duration Queries:**
- `>5`: Greater than 5 seconds
- `<10`: Less than 10 seconds
- `>=5`: Greater than or equal to 5 seconds
- `<=10`: Less than or equal to 10 seconds
- `5-10`: Between 5 and 10 seconds

### SearchResultsNavigation

Navigate through search results with keyboard shortcuts and visual highlighting.

**Features:**
- Navigate between results (first, previous, next, last)
- Keyboard shortcuts (Arrow keys, Home, End)
- Current result display
- Result highlighting
- Result count

**Usage:**
```tsx
import { SearchResultsNavigation } from './components/search/SearchResultsNavigation';

<SearchResultsNavigation
  results={searchResults}
  currentIndex={currentIndex}
  onNavigate={(index) => setCurrentIndex(index)}
  onHighlight={(shotId) => highlightShot(shotId)}
/>
```

**Props:**
- `results`: Array of search results
- `currentIndex`: Current result index
- `onNavigate`: Callback when navigating to a result
- `onHighlight`: Callback to highlight a shot

**Keyboard Shortcuts:**
- `←`: Previous result
- `→`: Next result
- `Home`: First result
- `End`: Last result

### SavedFilters

Manage saved search filters for quick access.

**Features:**
- Save current search as filter
- Edit filter names
- Delete filters
- Apply saved filters
- Filter criteria count display

**Usage:**
```tsx
import { SavedFilters } from './components/search/SavedFilters';

<SavedFilters
  filters={savedFilters}
  onApplyFilter={(filter) => applyFilter(filter)}
  onSaveFilter={(filter) => saveFilter(filter)}
  onDeleteFilter={(id) => deleteFilter(id)}
  onUpdateFilter={(filter) => updateFilter(filter)}
  currentCriteria={currentSearchCriteria}
/>
```

**Props:**
- `filters`: Array of saved filters
- `onApplyFilter`: Callback to apply a filter
- `onSaveFilter`: Callback to save a new filter
- `onDeleteFilter`: Callback to delete a filter
- `onUpdateFilter`: Callback to update a filter
- `currentCriteria`: Current search criteria (for saving)

### PredefinedFilters

Quick access to common filter presets.

**Features:**
- Favorites: Shots marked as favorites
- Recent: Recently created or modified shots
- Unused: Shots not yet used
- With Errors: Shots with errors or issues
- Result count badges
- Visual icons and colors

**Usage:**
```tsx
import { PredefinedFilters } from './components/search/PredefinedFilters';

<PredefinedFilters
  shots={shots}
  onApplyFilter={(filterType, results) => {
    setActiveFilter(filterType);
    setFilteredShots(results);
  }}
/>
```

**Props:**
- `shots`: Array of shots to filter
- `onApplyFilter`: Callback with filter type and results

**Filter Types:**
- `favorites`: Shots with `metadata.favorite === true`
- `recent`: 10 most recently updated shots
- `unused`: Shots with `metadata.used === false`
- `errors`: Shots with `metadata.hasErrors === true` or `metadata.status === 'error'`

### NoResults

Display when no search results are found, with suggestions and tips.

**Features:**
- No results message
- Alternative search suggestions
- Search tips
- Responsive design

**Usage:**
```tsx
import { NoResults } from './components/search/NoResults';

{searchResults.length === 0 && (
  <NoResults
    query={searchQuery}
    onSuggestionClick={(suggestion) => setSearchQuery(suggestion)}
  />
)}
```

**Props:**
- `query`: Current search query
- `onSuggestionClick`: Optional callback when clicking a suggestion

## Services

### SearchService

Core search service with advanced filtering capabilities.

**Features:**
- Simple search across all fields
- Advanced search with criteria and operators
- Saved filter management
- Predefined filter application
- Search suggestions
- Alternative suggestions for no results

**Usage:**
```tsx
import { SearchService, getSearchService } from './services/search/SearchService';

// Get singleton instance
const searchService = getSearchService(shots);

// Simple search
const results = searchService.search('action');

// Advanced search
const results = searchService.advancedSearch([
  { field: 'title', value: 'action', operator: 'AND' },
  { field: 'duration', value: '>5', operator: 'AND' }
]);

// Save filter
searchService.saveFilter({
  id: 'filter-1',
  name: 'Long Action Shots',
  criteria: [
    { field: 'type', value: 'action', operator: 'AND' },
    { field: 'duration', value: '>10', operator: 'AND' }
  ],
  createdAt: Date.now()
});

// Apply saved filter
const results = searchService.applySavedFilter('filter-1');

// Apply predefined filter
const favorites = searchService.applyPredefinedFilter('favorites');

// Get suggestions
const suggestions = searchService.getSuggestions('act');

// Get alternative suggestions
const alternatives = searchService.getAlternativeSuggestions('xyz123');
```

## Types

### SearchCriteria

```typescript
interface SearchCriteria {
  field: 'title' | 'description' | 'tags' | 'duration' | 'type' | 'status';
  value: string;
  operator: 'AND' | 'OR' | 'NOT';
}
```

### SearchFilter

```typescript
interface SearchFilter {
  id: string;
  name: string;
  criteria: SearchCriteria[];
  createdAt: number;
}
```

### PredefinedFilter

```typescript
type PredefinedFilter = 'favorites' | 'recent' | 'unused' | 'errors';
```

## Performance

- **Search Response Time**: <200ms for real-time search
- **Debounce Delay**: 200ms (configurable)
- **Results Limit**: No limit (handles large datasets efficiently)
- **Memory Usage**: Minimal (uses efficient filtering algorithms)

## Accessibility

- **Keyboard Navigation**: Full keyboard support for all components
- **ARIA Labels**: Proper ARIA labels for screen readers
- **Focus Management**: Logical focus order
- **Keyboard Shortcuts**: Intuitive shortcuts for navigation

## Examples

See `src/examples/SearchExample.tsx` for a comprehensive example demonstrating all search features.

## Requirements Validation

This implementation satisfies the following requirements:

### Exigence 14.1: Real-time Search
✅ Search filters results in real-time (<200ms response)

### Exigence 14.2: Filter Display
✅ Displays only matching shots

### Exigence 14.3: Multiple Search Fields
✅ Supports search by: name, tags, duration, type, status

### Exigence 14.4: Logical Operators
✅ Supports AND, OR, NOT operators for combining criteria

### Exigence 14.5: Results Navigation
✅ Displays result count and allows navigation between results

### Exigence 14.6: Saved Filters
✅ Allows saving filters for reuse

### Exigence 14.7: Predefined Filters
✅ Provides predefined filters: Favorites, Recent, Unused, With Errors

### Exigence 14.8: No Results Suggestions
✅ Displays alternative search suggestions when no results found

## Future Enhancements

- Fuzzy search for typo tolerance
- Search history
- Filter templates
- Export/import filters
- Search analytics
- Advanced duration parsing (e.g., "5s", "1m30s")
- Regular expression support
- Search highlighting in results
- Bulk operations on search results
