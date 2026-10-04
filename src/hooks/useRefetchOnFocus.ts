import {useCallback, useRef} from 'react';
import {useFocusEffect} from '@react-navigation/native';

export function useRefetchOnFocus(refetch: () => void) {
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
