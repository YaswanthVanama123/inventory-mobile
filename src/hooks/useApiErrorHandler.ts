import {useCallback} from 'react';
import {useAuth} from '../contexts/AuthContext';

export const useApiErrorHandler = () => {
  const {logout} = useAuth();

  const handleApiError = useCallback(
    async (error: any) => {
      const isTokenExpired =
        error?.message?.includes('401') ||
        error?.message?.includes('Token expired') ||
        error?.message?.includes('TOKEN_EXPIRED') ||
        error?.status === 401;
      if (isTokenExpired) {
        console.log('[Auth] Token expired - logging out automatically');
        await logout();
        return true;
      }
      return false;
    },
    [logout],
  );
  return {handleApiError};
};
