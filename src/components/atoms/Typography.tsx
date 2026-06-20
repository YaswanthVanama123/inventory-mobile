import React, {useMemo} from 'react';
import {Text as RNText, TextProps as RNTextProps, StyleSheet, useWindowDimensions} from 'react-native';
import {useTheme} from '../../contexts/ThemeContext';
import {Theme} from '../../theme';
import {getBreakpoint} from '../../utils/breakpoints';

export interface TypographyProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'small' | 'caption';
  color?: string;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right';
  responsive?: boolean;
}

const fontScaleByBreakpoint = (width: number): number => {
  const bp = getBreakpoint(width);
  if (bp === 'xl') return 1.36;
  if (bp === 'lg') return 1.24;
  if (bp === 'md') return 1.12;
  return 1;
};

const headingBoostByBreakpoint = (width: number): number => {
  const bp = getBreakpoint(width);
  if (bp === 'xl') return 1.08;
  if (bp === 'lg') return 1.05;
  if (bp === 'md') return 1.02;
  return 1;
};

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  color,
  weight = 'normal',
  align = 'left',
  responsive = true,
  style,
  ...props
}) => {
  const theme = useTheme();
  const {width} = useWindowDimensions();
  const fontScale = responsive ? fontScaleByBreakpoint(width) : 1;
  const headingBoost = responsive ? headingBoostByBreakpoint(width) : 1;
  const styles = useMemo(
    () => makeStyles(theme, fontScale, headingBoost),
    [theme, fontScale, headingBoost],
  );
  const resolvedColor = color ?? theme.colors.gray[900];
  return (
    <RNText
      {...props}
      style={[
        styles[variant],
        {
          color: resolvedColor,
          fontWeight: theme.typography.fontWeights[weight],
          textAlign: align,
        },
        style,
      ]}
    />
  );
};

const makeStyles = (theme: Theme, fontScale: number, headingBoost: number) => {
  const sz = theme.typography.fontSizes;
  const headingScale = fontScale * headingBoost;
  const h1Size = Math.round(sz.xxxxl * headingScale);
  const h2Size = Math.round(sz.xxxl * headingScale);
  const h3Size = Math.round(sz.xxl * headingScale);
  const h4Size = Math.round(sz.xl * headingScale);
  const bodySize = Math.round(sz.md * fontScale);
  const smallSize = Math.round(sz.sm * fontScale);
  const captionSize = Math.round(sz.xs * fontScale);

  return StyleSheet.create({
    h1: {
      fontSize: h1Size,
      lineHeight: h1Size * 1.15,
      fontWeight: theme.typography.fontWeights.bold,
      letterSpacing: headingScale > 1.2 ? -0.7 : -0.5,
    },
    h2: {
      fontSize: h2Size,
      lineHeight: h2Size * 1.18,
      fontWeight: theme.typography.fontWeights.bold,
      letterSpacing: headingScale > 1.2 ? -0.6 : -0.4,
    },
    h3: {
      fontSize: h3Size,
      lineHeight: h3Size * 1.22,
      fontWeight: theme.typography.fontWeights.semibold,
      letterSpacing: headingScale > 1.2 ? -0.4 : -0.3,
    },
    h4: {
      fontSize: h4Size,
      lineHeight: h4Size * 1.28,
      fontWeight: theme.typography.fontWeights.semibold,
      letterSpacing: -0.2,
    },
    body: {
      fontSize: bodySize,
      lineHeight: bodySize * 1.45,
      letterSpacing: -0.1,
    },
    small: {
      fontSize: smallSize,
      lineHeight: smallSize * 1.45,
    },
    caption: {
      fontSize: captionSize,
      lineHeight: captionSize * 1.4,
      letterSpacing: 0.2,
    },
  });
};
