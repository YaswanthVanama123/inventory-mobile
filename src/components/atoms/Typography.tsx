import React, {useMemo} from 'react';
import {Text as RNText, TextProps as RNTextProps, StyleSheet} from 'react-native';
import {useTheme} from '../../contexts/ThemeContext';
import {Theme} from '../../theme';

export interface TypographyProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'small' | 'caption';
  color?: string;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right';
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  color,
  weight = 'normal',
  align = 'left',
  style,
  ...props
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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
const makeStyles = (theme: Theme) => StyleSheet.create({
  h1: {
    fontSize: theme.typography.fontSizes.xxxxl,
    lineHeight: theme.typography.fontSizes.xxxxl * 1.15,
    fontWeight: theme.typography.fontWeights.bold,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: theme.typography.fontSizes.xxxl,
    lineHeight: theme.typography.fontSizes.xxxl * 1.18,
    fontWeight: theme.typography.fontWeights.bold,
    letterSpacing: -0.4,
  },
  h3: {
    fontSize: theme.typography.fontSizes.xxl,
    lineHeight: theme.typography.fontSizes.xxl * 1.22,
    fontWeight: theme.typography.fontWeights.semibold,
    letterSpacing: -0.3,
  },
  h4: {
    fontSize: theme.typography.fontSizes.xl,
    lineHeight: theme.typography.fontSizes.xl * 1.28,
    fontWeight: theme.typography.fontWeights.semibold,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: theme.typography.fontSizes.md,
    lineHeight: theme.typography.fontSizes.md * 1.45,
    letterSpacing: -0.1,
  },
  small: {
    fontSize: theme.typography.fontSizes.sm,
    lineHeight: theme.typography.fontSizes.sm * 1.45,
  },
  caption: {
    fontSize: theme.typography.fontSizes.xs,
    lineHeight: theme.typography.fontSizes.xs * 1.4,
    letterSpacing: 0.2,
  },
});
