export const typography = {
  fontSizes: {
    xs: 10,     
    sm: 12,     
    md: 14,     
    lg: 15,     
    xl: 16,     
    xxl: 17,    
    xxxl: 20,   
    xxxxl: 24,  
  },

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
export type FontSizeKey = keyof typeof typography.fontSizes;
export type FontWeightKey = keyof typeof typography.fontWeights;
export type LineHeightKey = keyof typeof typography.lineHeights;
