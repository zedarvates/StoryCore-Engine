/**
 * Tests for usePagination Hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination, getPageNumbers, getPaginationInfo } from '../usePagination';

describe('usePagination Hook', () => {
  const mockItems = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));

  describe('Basic functionality', () => {
    it('should return paginated items correctly', () => {
      const { result } = renderHook(() => usePagination({ items: mockItems, pageSize: 10 }));

      expect(result.current.paginatedItems).toHaveLength(10);
      expect(result.current.paginatedItems[0].id).toBe(1);
      expect(result.current.paginatedItems[9].id).toBe(10);
    });

    it('should return correct pagination state', () => {
      const { result } = renderHook(() => usePagination({ items: mockItems, pageSize: 10 }));

      expect(result.current.pagination.page).toBe(1);
      expect(result.current.pagination.pageSize).toBe(10);
      expect(result.current.pagination.total).toBe(25);
      expect(result.current.pagination.totalPages).toBe(3);
      expect(result.current.pagination.hasNext).toBe(true);
      expect(result.current.pagination.hasPrev).toBe(false);
    });

    it('should use default page size of 10', () => {
      const { result } = renderHook(() => usePagination({ items: mockItems }));

      expect(result.current.pagination.pageSize).toBe(10);
    });
  });

  describe('Navigation', () => {
    it('should navigate to next page', () => {
      const { result } = renderHook(() => usePagination({ items: mockItems, pageSize: 10 }));

      act(() => {
        result.current.nextPage();
      });

      expect(result.current.pagination.page).toBe(2);
      expect(result.current.paginatedItems[0].id).toBe(11);
    });

    it('should navigate to previous page', () => {
      const { result } = renderHook(() => usePagination({ items: mockItems, pageSize: 10 }));
      
      // First go to page 2
      act(() => {
        result.current.goToPage(2);
      });

      expect(result.current.pagination.page).toBe(2);

      act(() => {
        result.current.prevPage();
      });

      expect(result.current.pagination.page).toBe(1);
    });

    it('should navigate to specific page', () => {
      const { result } = renderHook(() => usePagination({ items: mockItems, pageSize: 10 }));

      act(() => {
        result.current.goToPage(3);
      });

      expect(result.current.pagination.page).toBe(3);
      expect(result.current.paginatedItems).toHaveLength(5);
      expect(result.current.paginatedItems[0].id).toBe(21);
    });

    it('should navigate to first and last page', () => {
      const { result } = renderHook(() => usePagination({ items: mockItems, pageSize: 10 }));
      
      // First go to page 2
      act(() => {
        result.current.goToPage(2);
      });

      act(() => {
        result.current.firstPage();
      });

      expect(result.current.pagination.page).toBe(1);

      act(() => {
        result.current.lastPage();
      });

      expect(result.current.pagination.page).toBe(3);
    });

    it('should not go beyond page bounds', () => {
      const { result } = renderHook(() => usePagination({ items: mockItems, pageSize: 10 }));

      act(() => {
        result.current.goToPage(10);
      });

      expect(result.current.pagination.page).toBe(3);

      act(() => {
        result.current.goToPage(0);
      });

      expect(result.current.pagination.page).toBe(1);
    });

    it('should not call nextPage when on last page', () => {
      const { result } = renderHook(() => usePagination({ items: mockItems, pageSize: 10 }));
      
      // Go to last page
      act(() => {
        result.current.goToPage(3);
      });

      expect(result.current.pagination.hasNext).toBe(false);

      act(() => {
        result.current.nextPage();
      });

      expect(result.current.pagination.page).toBe(3);
    });

    it('should not call prevPage when on first page', () => {
      const { result } = renderHook(() => usePagination({ items: mockItems, pageSize: 10 }));

      expect(result.current.pagination.hasPrev).toBe(false);

      act(() => {
        result.current.prevPage();
      });

      expect(result.current.pagination.page).toBe(1);
    });
  });

  describe('Page size changes', () => {
    it('should change page size', () => {
      const { result } = renderHook(() => usePagination({ items: mockItems, pageSize: 10 }));

      act(() => {
        result.current.setPageSize(20);
      });

      expect(result.current.pagination.pageSize).toBe(20);
      expect(result.current.pagination.totalPages).toBe(2);
    });

    it('should adjust page when changing to smaller page size', () => {
      const { result } = renderHook(() => usePagination({ items: mockItems, pageSize: 20 }));
      
      // Go to page 2
      act(() => {
        result.current.goToPage(2);
      });

      expect(result.current.pagination.page).toBe(2);

      act(() => {
        result.current.setPageSize(10);
      });

      expect(result.current.pagination.pageSize).toBe(10);
      // Page should be adjusted to stay within bounds
      expect(result.current.pagination.page).toBeLessThanOrEqual(result.current.pagination.totalPages);
    });
  });

  describe('Reset behavior', () => {
    it('should reset to page 1 when items change by default', () => {
      const { result, rerender } = renderHook(
        ({ items }) => usePagination({ items }),
        { initialProps: { items: mockItems } }
      );

      act(() => {
        result.current.goToPage(2);
      });

      expect(result.current.pagination.page).toBe(2);

      // Simulate items change
      const newItems = [...mockItems, { id: 26, name: 'Item 26' }];
      rerender({ items: newItems });

      expect(result.current.pagination.page).toBe(1);
    });

    it('should not reset when resetOnItemsChange is false', () => {
      const { result, rerender } = renderHook(
        ({ items }) => usePagination({ items, resetOnItemsChange: false }),
        { initialProps: { items: mockItems } }
      );

      act(() => {
        result.current.goToPage(2);
      });

      expect(result.current.pagination.page).toBe(2);

      const newItems = [...mockItems, { id: 26, name: 'Item 26' }];
      rerender({ items: newItems });

      expect(result.current.pagination.page).toBe(2);
    });

    it('should reset to first page with reset function', () => {
      const { result } = renderHook(() => usePagination({ items: mockItems, pageSize: 10 }));

      act(() => {
        result.current.goToPage(2);
      });

      expect(result.current.pagination.page).toBe(2);

      act(() => {
        result.current.reset();
      });

      expect(result.current.pagination.page).toBe(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty items array', () => {
      const { result } = renderHook(() => usePagination({ items: [] }));

      expect(result.current.paginatedItems).toHaveLength(0);
      expect(result.current.pagination.total).toBe(0);
      expect(result.current.pagination.totalPages).toBe(0);
    });

    it('should handle items fewer than page size', () => {
      const smallItems = mockItems.slice(0, 5);
      const { result } = renderHook(() => usePagination({ items: smallItems, pageSize: 10 }));

      expect(result.current.paginatedItems).toHaveLength(5);
      expect(result.current.pagination.totalPages).toBe(1);
      expect(result.current.pagination.hasNext).toBe(false);
    });

    it('should handle exactly one page of items', () => {
      const exactItems = mockItems.slice(0, 10);
      const { result } = renderHook(() => usePagination({ items: exactItems, pageSize: 10 }));

      expect(result.current.pagination.totalPages).toBe(1);
      expect(result.current.pagination.hasNext).toBe(false);
    });
  });

  describe('onPageChange callback', () => {
    it('should call onPageChange when page changes', () => {
      const onPageChange = vi.fn();
      const { result } = renderHook(() =>
        usePagination({ items: mockItems, pageSize: 10, onPageChange })
      );

      act(() => {
        result.current.goToPage(2);
      });

      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('should call onPageChange when reset is called', () => {
      const onPageChange = vi.fn();
      const { result } = renderHook(() =>
        usePagination({ items: mockItems, pageSize: 10, onPageChange })
      );
      
      // First go to page 2
      act(() => {
        result.current.goToPage(2);
      });

      act(() => {
        result.current.reset();
      });

      expect(onPageChange).toHaveBeenCalledWith(1);
    });
  });
});

describe('getPageNumbers utility', () => {
  it('should return all pages when total is less than max visible', () => {
    const pages = getPageNumbers(1, 3, 5);
    expect(pages).toEqual([1, 2, 3]);
  });

  it('should show ellipsis for large page counts', () => {
    const pages = getPageNumbers(1, 10, 5);
    expect(pages).toEqual([1, 2, 3, 4, 5, 'ellipsis', 10]);
  });

  it('should show ellipsis at start when near end', () => {
    const pages = getPageNumbers(9, 10, 5);
    expect(pages).toEqual([1, 'ellipsis', 6, 7, 8, 9, 10]);
  });

  it('should show ellipsis at both ends when in middle', () => {
    const pages = getPageNumbers(5, 10, 5);
    // When on page 5, we show pages 3-7 (centered around 5)
    expect(pages).toEqual([1, 'ellipsis', 3, 4, 5, 6, 7, 'ellipsis', 10]);
  });
});

describe('getPaginationInfo utility', () => {
  it('should return correct info string', () => {
    const pagination = {
      page: 2,
      pageSize: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: true,
      startIndex: 10,
      endIndex: 20,
    };

    const info = getPaginationInfo(pagination);
    expect(info).toBe('Showing 11-20 of 25 (Page 2 of 3)');
  });

  it('should return "No items" for empty list', () => {
    const pagination = {
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
      startIndex: 0,
      endIndex: 0,
    };

    const info = getPaginationInfo(pagination);
    expect(info).toBe('No items');
  });
});
