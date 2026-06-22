// ─────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH FOR TEXT SIZING.
//
// `fontSizes` is the raw graded scale (xs → xxxxl). `roles` are the 5 semantic
// text types every UI text maps to, each derived from a point on that scale.
//
// Do NOT hardcode `fontSize: <number>` anywhere — reference one of these:
//   • <Typography variant="heading|subheading|sideheading|body|caption">
//   • StyleSheet:  fontSize: theme.typography.roles.body.fontSize
//                  ...or spread the role:  ...theme.typography.roles.body
//
// To resize the whole app, edit the numbers here and nowhere else.
// ─────────────────────────────────────────────────────────────────────────

// Raw graded type scale — every value distinct and increasing.
const fontSizes = {
  xs: 11, // tiny meta / overlines
  sm: 13, // captions, badges, timestamps
  md: 15, // body / default text, inputs
  lg: 16, // emphasized body, card titles
  xl: 18, // small headings
  xxl: 20, // section headings
  xxxl: 24, // large headings
  xxxxl: 27, // page / hero headings
};

// Semantic roles — what the rest of the app actually uses.
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
