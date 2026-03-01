export const colors = {
  // Primary colors - Modern blue palette
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

  // Secondary/Accent - Modern purple for highlights
  accent: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
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

  // Success - Modern green
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Error - Modern red
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Warning - Modern amber
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Info
  info: {
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

  // Modern gradients for stat cards and backgrounds
  gradients: {
    blue: ['#667eea', '#764ba2'],
    purple: ['#a855f7', '#ec4899'],
    orange: ['#f59e0b', '#ef4444'],
    green: ['#10b981', '#059669'],
    teal: ['#14b8a6', '#0d9488'],
    pink: ['#ec4899', '#f43f5e'],
    indigo: ['#6366f1', '#8b5cf6'],
    cyan: ['#06b6d4', '#0891b2'],
  },

  // Special
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',

  // Semantic Text Colors (for accessibility)
  // Use these semantic names instead of direct gray values
  text: {
    primary: '#0f172a', // gray[900] - Maximum contrast for headings
    secondary: '#334155', // gray[700] - Body text, AAA compliant
    tertiary: '#64748b', // gray[500] - Supporting text, AA compliant
    disabled: '#94a3b8', // gray[400] - Disabled/placeholder only
    inverse: '#ffffff', // White text on dark backgrounds
  },

  // Background colors
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc', // gray[50]
    tertiary: '#f1f5f9', // gray[100]
  },
};

export type ColorKey = keyof typeof colors;
