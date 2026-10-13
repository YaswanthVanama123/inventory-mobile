import {useCallback, useEffect, useRef} from 'react';
import {AppState} from 'react-native';
import {useFocusEffect, useIsFocused} from '@react-navigation/native';
import {useOptionalExtraScreens} from '../contexts/ExtraScreensContext';

export function useRefetchOnFocus(refetch: () => void) {
  const cbRef = useRef(refetch);
  cbRef.current = refetch;
  const isFirstFocus = useRef(true);
  const focused = useIsFocused();
  const focusedRef = useRef(focused);
  focusedRef.current = focused;
  const openKey = useOptionalExtraScreens()?.openKey ?? null;
  const lastOpenKey = useRef(openKey);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      cbRef.current?.();
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && focusedRef.current) {
        cbRef.current?.();
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (lastOpenKey.current && !openKey && focusedRef.current) {
      cbRef.current?.();
    }
    lastOpenKey.current = openKey;
  }, [openKey]);
}

export default useRefetchOnFocus;
