import {useState, useEffect, useCallback, useRef} from 'react';

export interface ServerPageResult<T> {
  items: T[];
  total?: number;
  pages?: number;
  extra?: any;
}

interface UseServerPaginationOptions {
  pageSize?: number;
  /** Change this (search text / tab) to reset to page 1. */
  resetKey?: unknown;
  enabled?: boolean;
}

/**
 * Numbered server-side pagination for mobile: holds page + pageSize, fetches the
 * SINGLE current page (replacing the list, not appending), and exposes the state
 * the numbered <Pagination> control needs. Use `useServerList` instead when you
 * want infinite scroll.
 *
 * `fetchPage(page, limit)` must resolve to `{ items, total?, pages?, extra? }`.
 */
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
  // True only until the FIRST fetch (for the current enable) completes. Screens
  // should gate their full-screen spinner on this — NOT on `loading` — so that
  // debounced search / filter refetches don't unmount the list (and the search
  // box, dropping keyboard focus mid-typing).
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;

  // Reset to page 1 when the filter identity or page size changes.
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
        setItems(res.items || []);
        setTotal(res.total ?? (res.items ? res.items.length : 0));
        setTotalPages(res.pages || 1);
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
    // Full-screen-spinner gate: only true for the very first load, so search /
    // filter refetches never blank out the screen (keeps the search box focused).
    initialLoading: loading && !hasLoaded,
    refreshing,
    error,
    refresh,
    refetch,
  };
}

export default useServerPagination;
