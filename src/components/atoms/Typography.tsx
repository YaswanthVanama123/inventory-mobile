import React from 'react';
import {Text as RNText, TextProps as RNTextProps, StyleSheet} from 'react-native';
import {theme} from '../../theme';

export interface TypographyProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'small' | 'caption';
  color?: string;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right';
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  color = theme.colors.gray[900],
  weight = 'normal',
  align = 'left',
  style,
  ...props
}) => {
  return (
    <RNText
      {...props}
      style={[
        styles[variant],
        {
          color,
          fontWeight: theme.typography.fontWeights[weight],
          textAlign: align,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  h1: {
    fontSize: theme.typography.fontSizes.xxxxl,
    lineHeight: theme.typography.fontSizes.xxxxl * theme.typography.lineHeights.tight,
    fontWeight: theme.typography.fontWeights.bold,
  },
  h2: {
    fontSize: theme.typography.fontSizes.xxxl,
    lineHeight: theme.typography.fontSizes.xxxl * theme.typography.lineHeights.tight,
    fontWeight: theme.typography.fontWeights.bold,
  },
  h3: {
    fontSize: theme.typography.fontSizes.xxl,
    lineHeight: theme.typography.fontSizes.xxl * theme.typography.lineHeights.tight,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  h4: {
    fontSize: theme.typography.fontSizes.xl,
    lineHeight: theme.typography.fontSizes.xl * theme.typography.lineHeights.normal,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  body: {
    fontSize: theme.typography.fontSizes.md,
    lineHeight: theme.typography.fontSizes.md * theme.typography.lineHeights.normal,
  },
  small: {
    fontSize: theme.typography.fontSizes.sm,
    lineHeight: theme.typography.fontSizes.sm * theme.typography.lineHeights.normal,
  },
  caption: {
    fontSize: theme.typography.fontSizes.xs,
    lineHeight: theme.typography.fontSizes.xs * theme.typography.lineHeights.normal,
  },
});
