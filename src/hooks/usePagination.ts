import { useState, useCallback } from 'react';

export interface PaginationState {
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
}

export interface UsePaginationReturn {
  pagination: PaginationState;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
  setTotal: (total: number) => void;
  reset: () => void;
}

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

export const usePagination = (options: UsePaginationOptions = {}): UsePaginationReturn => {
  const { initialPage = 1, initialPageSize = 25 } = options;

  const [pagination, setPagination] = useState<PaginationState>({
    page: initialPage,
    pageSize: initialPageSize,
    totalPages: 0,
    total: 0,
  });

  const goToPage = useCallback((page: number) => {
    setPagination(prev => ({
      ...prev,
      page: Math.max(1, Math.min(page, prev.totalPages || 1)),
    }));
  }, []);

  const nextPage = useCallback(() => {
    setPagination(prev => ({
      ...prev,
      page: Math.min(prev.page + 1, prev.totalPages || 1),
    }));
  }, []);

  const previousPage = useCallback(() => {
    setPagination(prev => ({
      ...prev,
      page: Math.max(prev.page - 1, 1),
    }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setPagination(prev => ({
      ...prev,
      pageSize,
      page: 1, // Reset to first page when page size changes
      totalPages: Math.ceil(prev.total / pageSize),
    }));
  }, []);

  const setTotal = useCallback((total: number) => {
    setPagination(prev => ({
      ...prev,
      total,
      totalPages: Math.ceil(total / prev.pageSize),
    }));
  }, []);

  const reset = useCallback(() => {
    setPagination({
      page: initialPage,
      pageSize: initialPageSize,
      totalPages: 0,
      total: 0,
    });
  }, [initialPage, initialPageSize]);

  return {
    pagination,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    setTotal,
    reset,
  };
};