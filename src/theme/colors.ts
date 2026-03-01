export const colors = {
  // Primary colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Gray scale - WCAG Contrast Guidelines on White Background:
  // gray[400]: 3.2:1 - Use only for placeholders or disabled states
  // gray[500]: 4.6:1 - Minimum for normal text (AA compliant)
  // gray[600]+: 7+:1 - Preferred for body text (AAA compliant)
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8', // 3.2:1 - Placeholders only
    500: '#64748b', // 4.6:1 - Min for text
    600: '#475569', // 7.4:1 - Body text
    700: '#334155', // 10.7:1 - Headings
    800: '#1e293b', // 13.8:1 - High emphasis
    900: '#0f172a', // 16.1:1 - Maximum contrast
  },

  // Success
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },

  // Error
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },

  // Warning
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },

  // Info
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },

  // Special
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',

  // Semantic Text Colors (for accessibility)
  // Use these semantic names instead of direct gray values
  text: {
    primary: '#334155', // gray[700] - Main body text, AAA compliant
    secondary: '#64748b', // gray[500] - Supporting text, AA compliant
    tertiary: '#94a3b8', // gray[400] - Disabled/placeholder only
    inverse: '#ffffff', // White text on dark backgrounds
  },
};

export type ColorKey = keyof typeof colors;
