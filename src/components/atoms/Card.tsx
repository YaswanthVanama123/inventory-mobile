import React from 'react';
import {View, ViewProps, StyleSheet} from 'react-native';
import {theme} from '../../theme';

export interface CardProps extends ViewProps {
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  variant = 'elevated',
  padding = 'md',
  style,
  children,
  ...props
}) => {
  return (
    <View
      {...props}
      style={[
        styles.card,
        styles[`card_${variant}`],
        padding !== 'none' && styles[`padding_${padding}`],
        style,
      ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
  },
  card_elevated: {
    backgroundColor: theme.colors.white,
    ...theme.shadows.sm,
  },
  card_outlined: {
    backgroundColor: theme.colors.white,
    borderWidth: 1.5,
    borderColor: theme.colors.gray[200],
  },
  card_filled: {
    backgroundColor: theme.colors.background.secondary,
  },
  padding_sm: {
    padding: theme.spacing.md,
  },
  padding_md: {
    padding: theme.spacing.lg,
  },
  padding_lg: {
    padding: theme.spacing.xl,
  },
});
