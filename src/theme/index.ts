import {colors} from './colors';
import {darkColors} from './darkColors';
import {brandColors} from './brandColors';
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

// Shadows are intentionally disabled app-wide (flat UI). Every token resolves
// to a no-op so existing `...theme.shadows.X` spreads keep working but render
// flat. To re-enable shadows, restore real values here.
const noShadow = {
  shadowColor: 'transparent',
  shadowOffset: {width: 0, height: 0},
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
};

const lightShadows = {
  none: noShadow,
  xs: noShadow,
  sm: noShadow,
  md: noShadow,
  lg: noShadow,
  xl: noShadow,
};

const darkShadows = lightShadows;

export const lightTheme = {
  mode: 'light' as ThemeMode,
  colors: {...colors, brand: brandColors},
  shadows: lightShadows,
  ...baseTokens,
};

export const darkTheme = {
  mode: 'dark' as ThemeMode,
  colors: {...darkColors, brand: brandColors},
  shadows: darkShadows,
  ...baseTokens,
};

// Backwards-compat default. Files that still `import {theme}` get the light theme;
// they won't react to mode changes until migrated to useTheme().
export const theme = lightTheme;

export type Theme = typeof lightTheme;
export {colors, spacing, typography, status, brandColors};
export * from './status';
