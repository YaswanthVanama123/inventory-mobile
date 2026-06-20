import {useWindowDimensions, Platform} from 'react-native';

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl';

export const BREAKPOINTS = {
  sm: 0,
  md: 640,
  lg: 1024,
  xl: 1440,
} as const;

export const getBreakpoint = (width: number): Breakpoint => {
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  return 'sm';
};

export interface BreakpointInfo {
  bp: Breakpoint;
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
  isLandscape: boolean;
  scale: number;
  fontScale: number;
  contentMaxWidth: number;
  gutter: number;
  isMacOrPad: boolean;
}

export const useBreakpoint = (): BreakpointInfo => {
  const {width, height} = useWindowDimensions();
  const bp = getBreakpoint(width);
  const isMobile = bp === 'sm';
  const isTablet = bp === 'md';
  const isDesktop = bp === 'lg';
  const isWide = bp === 'xl';
  const isLandscape = width > height;
  const isMacOrPad = !isMobile;

  const scale = isWide ? 1.4 : isDesktop ? 1.25 : isTablet ? 1.1 : 1;
  const fontScale = isWide ? 1.36 : isDesktop ? 1.24 : isTablet ? 1.12 : 1;
  const contentMaxWidth = isWide ? 1240 : isDesktop ? 1080 : isTablet ? 760 : width;
  const gutter = isWide ? 48 : isDesktop ? 36 : isTablet ? 28 : 16;

  return {
    bp,
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    isLandscape,
    scale,
    fontScale,
    contentMaxWidth,
    gutter,
    isMacOrPad,
  };
};

export const responsive = <T,>(values: {sm?: T; md?: T; lg?: T; xl?: T; default: T}, bp: Breakpoint): T => {
  if (bp === 'xl' && values.xl !== undefined) return values.xl;
  if ((bp === 'xl' || bp === 'lg') && values.lg !== undefined) return values.lg;
  if ((bp === 'xl' || bp === 'lg' || bp === 'md') && values.md !== undefined) return values.md;
  if (values.sm !== undefined) return values.sm;
  return values.default;
};

export const isPadOrMac = (): boolean => {
  return Platform.OS === 'ios' || Platform.OS === 'macos' || Platform.OS === 'web';
};
