import {useState, useEffect} from 'react';
import screenPermissionService, {Screen} from '../services/screenPermissionService';
import {useAuth} from '../contexts/AuthContext';

export const useUserScreens = () => {
  const {token} = useAuth();
  const [userScreens, setUserScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadUserScreens();
    }
  }, [token]);

  const loadUserScreens = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const screens = await screenPermissionService.getMyScreens(token);
      console.log('[useUserScreens] Loaded screens:', screens?.length || 0);
      setUserScreens(Array.isArray(screens) ? screens : []);
      setError(null);
    } catch (err: any) {
      console.error('[useUserScreens] Error loading user screens:', err);
      setError(err.message || 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const hasAccessToScreen = (path: string) => {
    if (!path) return false;

    // Normalize paths for comparison (remove query params and trailing slashes)
    const normalizedPath = path.split('?')[0].replace(/\/$/, '');

    return userScreens.some(screen => {
      const screenPath = screen.path.split('?')[0].replace(/\/$/, '');

      // Exact match
      if (screenPath === normalizedPath) return true;

      // Child route match (e.g., /inventory/:id matches /inventory)
      if (normalizedPath.startsWith(screenPath + '/') && screenPath !== '') {
        return true;
      }

      return false;
    });
  };

  const hasAccessToAnyScreen = (paths: string[]) => {
    if (!paths || paths.length === 0) return false;
    return paths.some(path => hasAccessToScreen(path));
  };

  return {
    userScreens,
    loading,
    error,
    hasAccessToScreen,
    hasAccessToAnyScreen,
    refresh: loadUserScreens,
  };
};
