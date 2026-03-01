import {colors} from './colors';
import {spacing} from './spacing';
import {typography} from './typography';
import {status} from './status';

export const theme = {
  colors,
  spacing,
  typography,
  status,
  borderRadius: {
    xs: 2,
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
    xxl: 24,
    full: 9999,
  },
  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: {width: 0, height: 0},
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    xs: {
      shadowColor: '#0f172a',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor: '#0f172a',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#0f172a',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#0f172a',
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.16,
      shadowRadius: 16,
      elevation: 8,
    },
    xl: {
      shadowColor: '#0f172a',
      shadowOffset: {width: 0, height: 12},
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 12,
    },
  },
  // Animation durations (in milliseconds)
  animation: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
};

export type Theme = typeof theme;

export {colors, spacing, typography, status};
export * from './status'; // Export helper functions
