export const typography = {
  fontSizes: {
    xs: 11,      // Caption - very small text, labels
    sm: 13,      // Small - secondary text, metadata
    md: 15,      // Body - default text (iOS standard)
    lg: 17,      // Large body - emphasized content
    xl: 18,      // H4 - card titles, section headers
    xxl: 20,     // H3 - modal titles, page sections
    xxxl: 24,    // H2 - important sections
    xxxxl: 28,   // H1 - main page titles (reduced from 40)
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
