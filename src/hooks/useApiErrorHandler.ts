import {useCallback} from 'react';
import {useAuth} from '../contexts/AuthContext';

/**
 * Hook to handle API errors, especially token expiration
 * Returns a function that checks for token expiration and logs out if needed
 */
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
