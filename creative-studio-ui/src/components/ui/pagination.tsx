/**
 * Pagination Component
 * 
 * A reusable pagination UI component for navigating through paginated data.
 * Works with the usePagination hook for seamless integration.
 * 
 * @module components/ui/pagination
 */

import React from 'react';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  MoreHorizontal 
} from 'lucide-react';
import type { PaginationState } from '@/hooks/usePagination';
import { getPageNumbers, PAGE_SIZE_OPTIONS } from '@/hooks/usePagination';

// ============================================================================
// Types
// ============================================================================

export interface PaginationProps {
  /** Pagination state from usePagination hook */
  pagination: PaginationState;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange?: (size: number) => void;
  /** Available page size options */
  pageSizeOptions?: readonly number[];
  /** Whether to show page size selector */
  showPageSizeSelector?: boolean;
  /** Whether to show page info text */
  showPageInfo?: boolean;
  /** Whether to show quick navigation (first/last) */
  showQuickNavigation?: boolean;
  /** Maximum visible page numbers */
  maxVisiblePages?: number;
  /** Additional CSS class names */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether pagination is disabled */
  disabled?: boolean;
}

export interface PaginationCompactProps {
  /** Pagination state from usePagination hook */
  pagination: PaginationState;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Additional CSS class names */
  className?: string;
  /** Whether pagination is disabled */
  disabled?: boolean;
}

// ============================================================================
// Styles
// ============================================================================

const baseStyles = {
  container: 'flex items-center justify-between gap-4',
  navigation: 'flex items-center gap-1',
  pageInfo: 'text-sm text-muted-foreground',
  pageSizeSelector: 'flex items-center gap-2',
  pageButton: 'h-8 w-8 p-0',
  pageButtonActive: 'bg-primary text-primary-foreground hover:bg-primary/90',
  ellipsis: 'flex h-8 w-8 items-center justify-center text-muted-foreground',
};

const sizeVariants = {
  sm: {
    button: 'h-7 w-7 text-xs',
    icon: 'h-3 w-3',
    text: 'text-xs',
  },
  md: {
    button: 'h-8 w-8 text-sm',
    icon: 'h-4 w-4',
    text: 'text-sm',
  },
  lg: {
    button: 'h-10 w-10 text-base',
    icon: 'h-5 w-5',
    text: 'text-base',
  },
};

// ============================================================================
// Main Pagination Component
// ============================================================================

/**
 * Full-featured pagination component with page size selector and navigation.
 * 
 * @example
 * ```tsx
 * function MyList({ items }) {
 *   const { paginatedItems, pagination, goToPage, setPageSize } = usePagination({ items });
 *   
 *   return (
 *     <div>
 *       {paginatedItems.map(item => <Item key={item.id} item={item} />)}
 *       <Pagination
 *         pagination={pagination}
 *         onPageChange={goToPage}
 *         onPageSizeChange={setPageSize}
 *         showPageSizeSelector
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function Pagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  showPageSizeSelector = true,
  showPageInfo = true,
  showQuickNavigation = true,
  maxVisiblePages = 5,
  className = '',
  size = 'md',
  disabled = false,
}: PaginationProps): React.ReactElement {
  const { page, totalPages, total, hasNext, hasPrev } = pagination;
  const pageNumbers = getPageNumbers(page, totalPages, maxVisiblePages);
  const sizeStyles = sizeVariants[size];

  // Don't render if there's nothing to paginate
  if (total === 0 || totalPages <= 1) {
    return null;
  }

  return (
    <div className={`${baseStyles.container} ${className}`}>
      {/* Page Info */}
      {showPageInfo && (
        <div className={`${baseStyles.pageInfo} ${sizeStyles.text}`}>
          {pagination.startIndex + 1}-{pagination.endIndex} of {total}
        </div>
      )}

      {/* Page Navigation */}
      <nav className={baseStyles.navigation} aria-label="Pagination">
        {/* First Page */}
        {showQuickNavigation && (
          <Button
            variant="outline"
            size="icon"
            className={`${sizeStyles.button}`}
            onClick={() => onPageChange(1)}
            disabled={disabled || !hasPrev}
            aria-label="First page"
          >
            <ChevronsLeft className={sizeStyles.icon} />
          </Button>
        )}

        {/* Previous Page */}
        <Button
          variant="outline"
          size="icon"
          className={sizeStyles.button}
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || !hasPrev}
          aria-label="Previous page"
        >
          <ChevronLeft className={sizeStyles.icon} />
        </Button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((pageNum, index) => {
            if (pageNum === 'ellipsis') {
              return (
                <span key={`ellipsis-${index}`} className={baseStyles.ellipsis}>
                  <MoreHorizontal className={sizeStyles.icon} />
                </span>
              );
            }

            const isActive = pageNum === page;
            return (
              <Button
                key={pageNum}
                variant={isActive ? 'default' : 'outline'}
                size="icon"
                className={`${sizeStyles.button} ${isActive ? baseStyles.pageButtonActive : ''}`}
                onClick={() => onPageChange(pageNum)}
                disabled={disabled}
                aria-label={`Page ${pageNum}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {pageNum}
              </Button>
            );
          })}
        </div>

        {/* Next Page */}
        <Button
          variant="outline"
          size="icon"
          className={sizeStyles.button}
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || !hasNext}
          aria-label="Next page"
        >
          <ChevronRight className={sizeStyles.icon} />
        </Button>

        {/* Last Page */}
        {showQuickNavigation && (
          <Button
            variant="outline"
            size="icon"
            className={sizeStyles.button}
            onClick={() => onPageChange(totalPages)}
            disabled={disabled || !hasNext}
            aria-label="Last page"
          >
            <ChevronsRight className={sizeStyles.icon} />
          </Button>
        )}
      </nav>

      {/* Page Size Selector */}
      {showPageSizeSelector && onPageSizeChange && (
        <div className={baseStyles.pageSizeSelector}>
          <span className={`${baseStyles.pageInfo} ${sizeStyles.text}`}>Per page:</span>
          <Select
            value={String(pagination.pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
            disabled={disabled}
          >
            <SelectTrigger className={`w-auto ${sizeStyles.text}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Compact Pagination Component
// ============================================================================

/**
 * Compact pagination component for simple navigation.
 * Only shows previous/next buttons and current page info.
 * 
 * @example
 * ```tsx
 * <PaginationCompact
 *   pagination={pagination}
 *   onPageChange={goToPage}
 * />
 * ```
 */
export function PaginationCompact({
  pagination,
  onPageChange,
  className = '',
  disabled = false,
}: PaginationCompactProps): React.ReactElement {
  const { page, totalPages, total, hasNext, hasPrev } = pagination;

  // Don't render if there's nothing to paginate
  if (total === 0 || totalPages <= 1) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={disabled || !hasPrev}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Previous
      </Button>
      
      <span className="text-sm text-muted-foreground px-2">
        {page} / {totalPages}
      </span>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={disabled || !hasNext}
        aria-label="Next page"
      >
        Next
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}

// ============================================================================
// Pagination Info Component
// ============================================================================

export interface PaginationInfoProps {
  pagination: PaginationState;
  className?: string;
}

/**
 * Displays pagination information text.
 */
export function PaginationInfo({ pagination, className = '' }: PaginationInfoProps): React.ReactElement {
  const { page, totalPages, total, startIndex, endIndex } = pagination;

  if (total === 0) {
    return <span className={`text-sm text-muted-foreground ${className}`}>No items</span>;
  }

  return (
    <span className={`text-sm text-muted-foreground ${className}`}>
      Showing {startIndex + 1}-{endIndex} of {total}
      {totalPages > 1 && ` (Page ${page} of ${totalPages})`}
    </span>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default Pagination;
