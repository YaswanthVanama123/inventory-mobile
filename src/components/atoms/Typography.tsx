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
    fontSize: theme.typography.fontSizes.xxxxl,  // 28
    lineHeight: theme.typography.fontSizes.xxxxl * 1.2,  // Tighter for large headings
    fontWeight: theme.typography.fontWeights.bold,
  },
  h2: {
    fontSize: theme.typography.fontSizes.xxxl,  // 24
    lineHeight: theme.typography.fontSizes.xxxl * 1.25,
    fontWeight: theme.typography.fontWeights.bold,
  },
  h3: {
    fontSize: theme.typography.fontSizes.xxl,  // 20
    lineHeight: theme.typography.fontSizes.xxl * 1.3,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  h4: {
    fontSize: theme.typography.fontSizes.xl,  // 18
    lineHeight: theme.typography.fontSizes.xl * 1.35,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  body: {
    fontSize: theme.typography.fontSizes.md,  // 15
    lineHeight: theme.typography.fontSizes.md * 1.4,
  },
  small: {
    fontSize: theme.typography.fontSizes.sm,  // 13
    lineHeight: theme.typography.fontSizes.sm * 1.4,
  },
  caption: {
    fontSize: theme.typography.fontSizes.xs,  // 11
    lineHeight: theme.typography.fontSizes.xs * 1.4,
  },
});
