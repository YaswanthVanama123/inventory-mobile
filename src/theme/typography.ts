const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  xxxxl: 27,
};

const roles = {
  heading: {
    fontSize: fontSizes.xxxxl,
    lineHeight: Math.round(fontSizes.xxxxl * 1.18),
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: fontSizes.xxl,
    lineHeight: Math.round(fontSizes.xxl * 1.22),
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  sideheading: {
    fontSize: fontSizes.lg,
    lineHeight: Math.round(fontSizes.lg * 1.28),
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: fontSizes.md,
    lineHeight: Math.round(fontSizes.md * 1.45),
    fontWeight: '400' as const,
    letterSpacing: -0.1,
  },
  caption: {
    fontSize: fontSizes.sm,
    lineHeight: Math.round(fontSizes.sm * 1.4),
    fontWeight: '400' as const,
    letterSpacing: 0.1,
  },
};

export const typography = {
  fontSizes,
  roles,

  fontWeights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};

export type TextRole = keyof typeof roles;
export type FontSizeKey = keyof typeof typography.fontSizes;
export type FontWeightKey = keyof typeof typography.fontWeights;
export type LineHeightKey = keyof typeof typography.lineHeights;
