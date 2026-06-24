import {useEffect, useState} from 'react';

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms of
 * no further changes. Use this to drive BACKEND search (pass the debounced
 * value into the fetch params) instead of filtering already-fetched data in
 * memory — so we hit the server at most once per pause in typing.
 */
export default function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
