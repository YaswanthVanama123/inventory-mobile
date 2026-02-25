import React, {createContext, useState, useContext, ReactNode, useEffect} from 'react';
import {User, AuthState} from '../types';
import authService from '../services/authService';

interface AuthContextType extends AuthState {
  login: (username: string, password: string, loginType: 'admin' | 'employee') => Promise<{success: boolean; error?: string}>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    loading: true,
  });

  useEffect(() => {
    // Check for stored auth token on app start
    // You can use AsyncStorage here
    checkAuthToken();
  }, []);

  const checkAuthToken = async () => {
    try {
      // TODO: Check AsyncStorage for token
      // const token = await AsyncStorage.getItem('authToken');
      // if (token) {
      //   // Validate token with backend
      // }
      setAuthState(prev => ({...prev, loading: false}));
    } catch (error) {
      setAuthState(prev => ({...prev, loading: false}));
    }
  };

  const login = async (
    username: string,
    password: string,
    loginType: 'admin' | 'employee',
  ): Promise<{success: boolean; error?: string}> => {
    try {
      const result =
        loginType === 'admin'
          ? await authService.loginAdmin(username, password)
          : await authService.loginEmployee(username, password);

      if (result.success && result.token && result.user) {
        // TODO: Store token in AsyncStorage
        // await AsyncStorage.setItem('authToken', result.token);

        setAuthState({
          user: result.user,
          token: result.token,
          isAuthenticated: true,
          loading: false,
        });

        return {success: true};
      }

      return {
        success: false,
        error: result.error || 'Login failed',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred',
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      // TODO: Clear AsyncStorage
      // await AsyncStorage.removeItem('authToken');

      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const setUser = (user: User | null) => {
    setAuthState(prev => ({
      ...prev,
      user,
      isAuthenticated: !!user,
    }));
  };

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
