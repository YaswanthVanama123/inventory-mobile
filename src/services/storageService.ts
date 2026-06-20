import EncryptedStorage from 'react-native-encrypted-storage';

const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  REMEMBER_ME: 'remember_me',
  SAVED_CREDENTIALS: 'saved_credentials',
};

class StorageService {
  async setAuthToken(token: string): Promise<void> {
    try {
      await EncryptedStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    } catch (error) {
      console.error('Error storing auth token:', error);
      throw error;
    }
  }
  async getAuthToken(): Promise<string | null> {
    try {
      return await EncryptedStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch (error) {
      console.error('Error retrieving auth token:', error);
      return null;
    }
  }
  async removeAuthToken(): Promise<void> {
    await this.safeRemove(STORAGE_KEYS.AUTH_TOKEN, 'auth token');
  }
  async setUserData(user: any): Promise<void> {
    try {
      await EncryptedStorage.setItem(
        STORAGE_KEYS.USER_DATA,
        JSON.stringify(user),
      );
    } catch (error) {
      console.error('Error storing user data:', error);
      throw error;
    }
  }
  async getUserData(): Promise<any | null> {
    try {
      const data = await EncryptedStorage.getItem(STORAGE_KEYS.USER_DATA);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error retrieving user data:', error);
      return null;
    }
  }
  async removeUserData(): Promise<void> {
    await this.safeRemove(STORAGE_KEYS.USER_DATA, 'user data');
  }
  async setRememberMe(remember: boolean): Promise<void> {
    try {
      await EncryptedStorage.setItem(
        STORAGE_KEYS.REMEMBER_ME,
        JSON.stringify(remember),
      );
    } catch (error) {
      console.error('Error storing remember me preference:', error);
      throw error;
    }
  }
  async getRememberMe(): Promise<boolean> {
    try {
      const data = await EncryptedStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
      return data ? JSON.parse(data) : false;
    } catch (error) {
      console.error('Error retrieving remember me preference:', error);
      return false;
    }
  }
  async setSavedCredentials(credentials: {
    username: string;
    password: string;
  }): Promise<void> {
    try {
      await EncryptedStorage.setItem(
        STORAGE_KEYS.SAVED_CREDENTIALS,
        JSON.stringify(credentials),
      );
    } catch (error) {
      console.error('Error storing credentials:', error);
      throw error;
    }
  }
  async getSavedCredentials(): Promise<{
    username: string;
    password: string;
  } | null> {
    try {
      const data = await EncryptedStorage.getItem(
        STORAGE_KEYS.SAVED_CREDENTIALS,
      );
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error retrieving credentials:', error);
      return null;
    }
  }
  async removeSavedCredentials(): Promise<void> {
    await this.safeRemove(STORAGE_KEYS.SAVED_CREDENTIALS, 'credentials');
  }
  // Removing a key that was never written makes RNEncryptedStorage throw
  // ("An error occured while removing value"). Only remove when present, and
  // never let a benign removal failure bubble up to the caller.
  private async safeRemove(key: string, label: string): Promise<void> {
    try {
      const existing = await EncryptedStorage.getItem(key);
      if (existing != null) {
        await EncryptedStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Skipped removing ${label} (nothing to remove):`, error);
    }
  }
  async clearAll(): Promise<void> {
    try {
      await EncryptedStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }
}
export default new StorageService();
