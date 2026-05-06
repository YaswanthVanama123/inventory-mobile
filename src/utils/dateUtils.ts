/**
 * Date formatting utilities with Virginia US timezone (America/New_York)
 * All dates are automatically converted to Eastern Time (ET)
 */

const VIRGINIA_TIMEZONE = 'America/New_York';

/**
 * Format date to localized string in Virginia timezone
 * @param date - Date to format (string or Date object)
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export const formatDate = (
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string => {
  if (!date) return 'N/A';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: VIRGINIA_TIMEZONE,
      ...options,
    };

    return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
};

/**
 * Format date and time to localized string in Virginia timezone
 * @param date - Date to format (string or Date object)
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date and time string
 */
export const formatDateTime = (
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string => {
  if (!date) return 'N/A';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: VIRGINIA_TIMEZONE,
      ...options,
    };

    return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
  } catch (error) {
    console.error('DateTime formatting error:', error);
    return 'Invalid Date';
  }
};

/**
 * Format time only in Virginia timezone
 * @param date - Date to format (string or Date object)
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted time string
 */
export const formatTime = (
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string => {
  if (!date) return 'N/A';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    const defaultOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      timeZone: VIRGINIA_TIMEZONE,
      ...options,
    };

    return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
  } catch (error) {
    console.error('Time formatting error:', error);
    return 'Invalid Time';
  }
};

/**
 * Format date with full details including timezone abbreviation
 * @param date - Date to format (string or Date object)
 * @returns Formatted date string with timezone
 */
export const formatDateTimeFull = (
  date: string | Date | null | undefined
): string => {
  if (!date) return 'N/A';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      timeZone: VIRGINIA_TIMEZONE,
      timeZoneName: 'short',
    }).format(dateObj);
  } catch (error) {
    console.error('Full DateTime formatting error:', error);
    return 'Invalid Date';
  }
};

/**
 * Format date for display in lists (short format)
 * @param date - Date to format (string or Date object)
 * @returns Formatted date string
 */
export const formatDateShort = (
  date: string | Date | null | undefined
): string => {
  if (!date) return 'N/A';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    return new Intl.DateTimeFormat('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
      timeZone: VIRGINIA_TIMEZONE,
    }).format(dateObj);
  } catch (error) {
    console.error('Short date formatting error:', error);
    return 'Invalid Date';
  }
};

/**
 * Format date and time for display in lists (compact format)
 * @param date - Date to format (string or Date object)
 * @returns Formatted date and time string
 */
export const formatDateTimeShort = (
  date: string | Date | null | undefined
): string => {
  if (!date) return 'N/A';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    return new Intl.DateTimeFormat('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: VIRGINIA_TIMEZONE,
    }).format(dateObj);
  } catch (error) {
    console.error('Short DateTime formatting error:', error);
    return 'Invalid Date';
  }
};

/**
 * Get relative time string (e.g., "2 hours ago", "3 days ago")
 * Calculated based on Virginia timezone
 * @param date - Date to format (string or Date object)
 * @returns Relative time string
 */
export const formatRelativeTime = (
  date: string | Date | null | undefined
): string => {
  if (!date) return 'N/A';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();

    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInMinutes < 60)
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    if (diffInHours < 24)
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    if (diffInDays < 7)
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;

    return formatDate(dateObj);
  } catch (error) {
    console.error('Relative time formatting error:', error);
    return 'Invalid Date';
  }
};

/**
 * Legacy compatibility - converts date to Virginia timezone locale string
 * @deprecated Use formatDate or formatDateTime instead
 */
export const toVirginiaTime = (
  date: string | Date | null | undefined
): string => {
  if (!date) return 'N/A';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatDateTime(dateObj);
  } catch (error) {
    console.error('Virginia time conversion error:', error);
    return 'Invalid Date';
  }
};

export default {
  formatDate,
  formatDateTime,
  formatTime,
  formatDateTimeFull,
  formatDateShort,
  formatDateTimeShort,
  formatRelativeTime,
  toVirginiaTime,
  VIRGINIA_TIMEZONE,
};
