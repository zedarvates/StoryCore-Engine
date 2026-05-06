/**
 * Pagination Service
 * 
 * Requirements: 91
 * Level: 🟡 HAUTE
 * 
 * Generic pagination service for backend queries
 */

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

export class PaginationService {
  /**
   * Paginate array data
   */
  static paginate<T>(
    data: T[],
    options: PaginationOptions = {}
  ): PaginatedResult<T> {
    const {
      page = 1,
      limit = 20,
      sortBy,
      sortOrder = 'asc',
      search,
      filters,
    } = options;

    let filteredData = [...data];

    // Apply search filter
    if (search) {
      filteredData = filteredData.filter((item) =>
        this.matchesSearch(item, search)
      );
    }

    // Apply filters
    if (filters) {
      filteredData = filteredData.filter((item) =>
        this.matchesFilters(item, filters)
      );
    }

    // Apply sorting
    if (sortBy) {
      filteredData.sort((a, b) =>
        this.compareValues(a, b, sortBy, sortOrder)
      );
    }

    // Calculate pagination
    const total = filteredData.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    // Slice data for current page
    const paginatedData = filteredData.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      sort: sortBy ? { field: sortBy, order: sortOrder } : undefined,
    };
  }

  /**
   * Create pagination metadata for API responses
   */
  static createMetadata(
    page: number,
    limit: number,
    total: number
  ) {
    const totalPages = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    };
  }

  /**
   * Generate pagination links for HATEOAS
   */
  static generateLinks(
    baseUrl: string,
    page: number,
    limit: number,
    total: number
  ) {
    const totalPages = Math.ceil(total / limit);
    const links: Record<string, string> = {};

    links.self = `${baseUrl}?page=${page}&limit=${limit}`;

    if (page > 1) {
      links.prev = `${baseUrl}?page=${page - 1}&limit=${limit}`;
      links.first = `${baseUrl}?page=1&limit=${limit}`;
    }

    if (page < totalPages) {
      links.next = `${baseUrl}?page=${page + 1}&limit=${limit}`;
      links.last = `${baseUrl}?page=${totalPages}&limit=${limit}`;
    }

    return links;
  }

  /**
   * Check if item matches search query
   */
  private static matchesSearch<T>(item: T, search: string): boolean {
    const searchLower = search.toLowerCase();
    const itemStr = JSON.stringify(item).toLowerCase();
    return itemStr.includes(searchLower);
  }

  /**
   * Check if item matches all filters
   */
  private static matchesFilters<T>(
    item: T,
    filters: Record<string, any>
  ): boolean {
    return Object.entries(filters).every(([key, value]) => {
      const itemValue = this.getNestedValue(item, key);

      if (Array.isArray(value)) {
        return value.includes(itemValue);
      }

      if (typeof value === 'object' && value !== null) {
        if (value.min !== undefined && itemValue < value.min) return false;
        if (value.max !== undefined && itemValue > value.max) return false;
        return true;
      }

      return itemValue === value;
    });
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current ? current[key] : undefined;
    }, obj);
  }

  /**
   * Compare two values for sorting
   */
  private static compareValues(
    a: any,
    b: any,
    key: string,
    order: 'asc' | 'desc'
  ): number {
    const aValue = this.getNestedValue(a, key);
    const bValue = this.getNestedValue(b, key);

    if (aValue === bValue) return 0;

    const comparison = aValue < bValue ? -1 : 1;
    return order === 'asc' ? comparison : -comparison;
  }
}

/**
 * Database pagination helper
 */
export class DatabasePagination {
  /**
   * Generate SQL LIMIT OFFSET clause
   */
  static generateLimitOffset(page: number, limit: number): string {
    const offset = (page - 1) * limit;
    return `LIMIT ${limit} OFFSET ${offset}`;
  }

  /**
   * Generate MongoDB skip/limit
   */
  static generateMongoSkipLimit(page: number, limit: number) {
    const skip = (page - 1) * limit;
    return { skip, limit };
  }

  /**
   * Calculate optimal page size based on item size
   */
  static calculateOptimalLimit(
    avgItemSize: number,
    maxResponseSize: number = 1024 * 1024 // 1MB default
  ): number {
    return Math.floor(maxResponseSize / avgItemSize);
  }
}
