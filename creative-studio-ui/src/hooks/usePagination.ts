/**
 * usePagination Hook
 * 
 * A reusable pagination hook for managing paginated data in list components.
 * Provides efficient memory usage by only keeping the current page in memory.
 * 
 * @module hooks/usePagination
 */

import { useState, useMemo, useCallback, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface PaginationState {
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Whether there is a previous page */
  hasPrev: boolean;
  /** Index of the first item on the current page */
  startIndex: number;
  /** Index of the last item on the current page */
  endIndex: number;
}

export interface UsePaginationOptions<T> {
  /** Items to paginate */
  items: T[];
  /** Number of items per page (default: 10) */
  pageSize?: number;
  /** Initial page number (default: 1) */
  initialPage?: number;
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
  /** Whether to reset to page 1 when items change */
  resetOnItemsChange?: boolean;
}

export interface UsePaginationReturn<T> {
  /** Items on the current page */
  paginatedItems: T[];
  /** Pagination state */
  pagination: PaginationState;
  /** Go to a specific page */
  goToPage: (page: number) => void;
  /** Go to the next page */
  nextPage: () => void;
  /** Go to the previous page */
  prevPage: () => void;
  /** Go to the first page */
  firstPage: () => void;
  /** Go to the last page */
  lastPage: () => void;
  /** Change the page size */
  setPageSize: (size: number) => void;
  /** Reset to the first page */
  reset: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100] as const;

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * A reusable pagination hook for managing paginated data.
 * 
 * @example
 * ```tsx
 * function MyListComponent({ items }) {
 *   const { paginatedItems, pagination, nextPage, prevPage } = usePagination({
 *     items,
 *     pageSize: 10,
 *   });
 * 
 *   return (
 *     <div>
 *       {paginatedItems.map(item => <Item key={item.id} item={item} />)}
 *       <div>
 *         <button onClick={prevPage} disabled={!pagination.hasPrev}>Previous</button>
 *         <span>Page {pagination.page} of {pagination.totalPages}</span>
 *         <button onClick={nextPage} disabled={!pagination.hasNext}>Next</button>
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePagination<T>({
  items,
  pageSize = DEFAULT_PAGE_SIZE,
  initialPage = 1,
  onPageChange,
  resetOnItemsChange = true,
}: UsePaginationOptions<T>): UsePaginationReturn<T> {
  const [page, setPage] = useState(initialPage);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  // Track previous items length to detect changes
  const [prevItemsLength, setPrevItemsLength] = useState(items.length);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(items.length / currentPageSize);
  }, [items.length, currentPageSize]);

  // Reset to page 1 when items change (if enabled)
  useEffect(() => {
    if (resetOnItemsChange && items.length !== prevItemsLength && page > 1) {
      setPage(1);
    }
    setPrevItemsLength(items.length);
  }, [items.length, resetOnItemsChange, page, prevItemsLength]);

  // Ensure page is within bounds
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // Calculate pagination state
  const pagination: PaginationState = useMemo(() => {
    const total = items.length;
    const startIndex = (page - 1) * currentPageSize;
    const endIndex = Math.min(startIndex + currentPageSize, total);

    return {
      page,
      pageSize: currentPageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      startIndex,
      endIndex,
    };
  }, [page, currentPageSize, items.length, totalPages]);

  // Get paginated items
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * currentPageSize;
    return items.slice(start, start + currentPageSize);
  }, [items, page, currentPageSize]);

  // Navigation functions
  const goToPage = useCallback((newPage: number) => {
    const validPage = Math.max(1, Math.min(newPage, totalPages));
    setPage(validPage);
    onPageChange?.(validPage);
  }, [totalPages, onPageChange]);

  const nextPage = useCallback(() => {
    if (pagination.hasNext) {
      goToPage(page + 1);
    }
  }, [page, pagination.hasNext, goToPage]);

  const prevPage = useCallback(() => {
    if (pagination.hasPrev) {
      goToPage(page - 1);
    }
  }, [page, pagination.hasPrev, goToPage]);

  const firstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  const lastPage = useCallback(() => {
    goToPage(totalPages);
  }, [goToPage, totalPages]);

  const setPageSize = useCallback((size: number) => {
    setCurrentPageSize(size);
    // Recalculate page to keep the first visible item in view
    const newTotalPages = Math.ceil(items.length / size);
    const newPage = Math.min(page, newTotalPages);
    setPage(Math.max(1, newPage));
  }, [items.length, page]);

  const reset = useCallback(() => {
    setPage(1);
    onPageChange?.(1);
  }, [onPageChange]);

  return {
    paginatedItems,
    pagination,
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    setPageSize,
    reset,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get page numbers to display in pagination controls
 * Shows first page, last page, current page, and surrounding pages
 */
export function getPageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 5
): (number | 'ellipsis')[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [];
  const halfVisible = Math.floor(maxVisible / 2);
  let startPage = Math.max(1, currentPage - halfVisible);
  const endPage = Math.min(totalPages, startPage + maxVisible - 1);

  // Adjust start if we're near the end
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  // Add first page and ellipsis if needed
  if (startPage > 1) {
    pages.push(1);
    if (startPage > 2) {
      pages.push('ellipsis');
    }
  }

  // Add visible pages
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  // Add ellipsis and last page if needed
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pages.push('ellipsis');
    }
    pages.push(totalPages);
  }

  return pages;
}

/**
 * Calculate pagination info text
 */
export function getPaginationInfo(pagination: PaginationState): string {
  const { page, totalPages, total, startIndex, endIndex } = pagination;
  
  if (total === 0) {
    return 'No items';
  }

  return `Showing ${startIndex + 1}-${endIndex} of ${total} (Page ${page} of ${totalPages})`;
}

// Export constants for external use
export { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS };
