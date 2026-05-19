import {colors} from './colors';
import {darkColors} from './darkColors';
import {spacing} from './spacing';
import {typography} from './typography';
import {status} from './status';

export type ThemeMode = 'light' | 'dark';

const baseTokens = {
  spacing,
  typography,
  status,
  borderRadius: {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 20,
    full: 9999,
  },
  animation: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
};

const lightShadows = {
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
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  xl: {
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 10,
  },
};

const darkShadows = {
  none: lightShadows.none,
  xs: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
};

export const lightTheme = {
  mode: 'light' as ThemeMode,
  colors,
  shadows: lightShadows,
  ...baseTokens,
};

export const darkTheme = {
  mode: 'dark' as ThemeMode,
  colors: darkColors,
  shadows: darkShadows,
  ...baseTokens,
};

// Backwards-compat default. Files that still `import {theme}` get the light theme;
// they won't react to mode changes until migrated to useTheme().
export const theme = lightTheme;

export type Theme = typeof lightTheme;
export {colors, spacing, typography, status};
export * from './status';
