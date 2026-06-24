import {useCallback, useRef} from 'react';
import {useFocusEffect} from '@react-navigation/native';

/**
 * Re-runs `refetch` every time a navigator screen REGAINS focus — but skips the
 * very first focus, since screens already load their data on mount. This keeps
 * tab data fresh after a create/delete/sync done on another screen, without
 * needing to kill and reopen the app.
 *
 * Only works for screens rendered inside a React Navigation navigator (tabs /
 * stacks). Modal screens toggled by a `visible` prop should keep reloading via
 * their `visible` effect instead.
 */
export function useRefetchOnFocus(refetch: () => void) {
  // Read the latest callback via a ref so the focus subscription stays stable
  // and always calls the current closure (latest state).
  const cbRef = useRef(refetch);
  cbRef.current = refetch;
  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      cbRef.current?.();
    }, []),
  );
}

export default useRefetchOnFocus;
