export const typography = {
  fontSizes: {
    xs: 10,      // Caption - very small text, labels
    sm: 12,      // Small - secondary text, metadata
    md: 14,      // Body - default text
    lg: 15,      // Large body - emphasized content
    xl: 16,      // H4 - card titles, section headers
    xxl: 17,     // H3 - modal titles, page sections
    xxxl: 20,    // H2 - important sections
    xxxxl: 24,   // H1 - main page titles
  },

  fontWeights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  lineHeights: {
    tight: 1.2,    // Tighter for headings
    normal: 1.4,   // Better for mobile readability (was 1.5)
    relaxed: 1.6,  // Slightly tighter (was 1.75)
  },
};

export type FontSizeKey = keyof typeof typography.fontSizes;
export type FontWeightKey = keyof typeof typography.fontWeights;
export type LineHeightKey = keyof typeof typography.lineHeights;
