import {useState, useEffect, useCallback, useRef} from 'react';

export interface ServerPageResult<T> {
  items: T[];
  total?: number;
  pages?: number;
}

interface UseServerListOptions {
  limit?: number;
  resetKey?: unknown;
  enabled?: boolean;
}

export function useServerList<T>(
  fetchPage: (page: number, limit: number) => Promise<ServerPageResult<T>>,
  {limit = 20, resetKey, enabled = true}: UseServerListOptions = {},
) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;

  const hasMore = items.length < total;

  const load = useCallback(
    async (pageNum: number, mode: 'initial' | 'more' | 'refresh') => {
      if (!enabled) return;
      try {
        if (mode === 'initial') setLoading(true);
        else if (mode === 'refresh') setRefreshing(true);
        else setLoadingMore(true);
        setError(null);
        const res = await fetchRef.current(pageNum, limit);
        const newItems = res.items || [];
        setTotal(res.total ?? newItems.length);
        setPage(pageNum);
        setItems(prev => (pageNum === 1 ? newItems : [...prev, ...newItems]));
      } catch (e: any) {
        setError(e?.message || 'Failed to load data');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [enabled, limit],
  );

  useEffect(() => {
    if (enabled) {
      load(1, 'initial');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, enabled]);

  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && !refreshing && items.length < total) {
      load(page + 1, 'more');
    }
  }, [loading, loadingMore, refreshing, items.length, total, page, load]);

  const refresh = useCallback(() => load(1, 'refresh'), [load]);
  const reload = useCallback(() => load(1, 'initial'), [load]);

  return {
    items,
    setItems,
    page,
    total,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    reload,
  };
}

export default useServerList;
