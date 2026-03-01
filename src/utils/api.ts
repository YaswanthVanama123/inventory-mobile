import {API_BASE_URL} from '../config/api';

/**
 * Enhanced fetch wrapper that handles token expiration
 */
export const apiFetch = async (
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

  // Check for token expiration
  if (response.status === 401) {
    const data = await response.json();
    if (data.error?.code === 'TOKEN_EXPIRED') {
      // Emit token expiration event
      console.warn('[API] Token expired - redirecting to login');
      // You can add a global event emitter here if needed
    }
  }

  return response;
};

/**
 * Check if error is token expiration
 */
export const isTokenExpiredError = (error: any): boolean => {
  return (
    error?.status === 401 ||
    error?.error?.code === 'TOKEN_EXPIRED' ||
    error?.message?.includes('Token expired')
  );
};
