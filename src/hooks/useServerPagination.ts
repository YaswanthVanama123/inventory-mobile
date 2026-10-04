import {useState, useEffect, useCallback, useRef} from 'react';

export interface ServerPageResult<T> {
  items: T[];
  total?: number;
  pages?: number;
  extra?: any;
}

interface UseServerPaginationOptions {
  pageSize?: number;
  resetKey?: unknown;
  enabled?: boolean;
}

export function useServerPagination<T>(
  fetchPage: (page: number, limit: number) => Promise<ServerPageResult<T>>,
  {pageSize = 20, resetKey, enabled = true}: UseServerPaginationOptions = {},
) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(pageSize);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [extra, setExtra] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadFlag, setReloadFlag] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;

  useEffect(() => {
    setPage(1);
  }, [resetKey, size]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setLoading(true);
    setError(null);
    Promise.resolve(fetchRef.current(page, size))
      .then(res => {
        if (!active) return;
        const resolvedTotal = res.total ?? (res.items ? res.items.length : 0);
        const resolvedPages = res.pages || 1;
        if (page > resolvedPages && resolvedTotal > 0) {
          setPage(resolvedPages);
          return;
        }
        setItems(res.items || []);
        setTotal(resolvedTotal);
        setTotalPages(resolvedPages);
        setExtra(res.extra ?? null);
      })
      .catch(e => {
        if (active) setError(e?.message || 'Failed to load data');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setRefreshing(false);
          setHasLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [page, size, resetKey, reloadFlag, enabled]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setReloadFlag(f => f + 1);
  }, []);
  const refetch = useCallback(() => setReloadFlag(f => f + 1), []);

  return {
    items,
    setItems,
    page,
    setPage,
    pageSize: size,
    setPageSize: setSize,
    total,
    totalPages,
    extra,
    loading,
    initialLoading: loading && !hasLoaded,
    refreshing,
    error,
    refresh,
    refetch,
  };
}

export default useServerPagination;
