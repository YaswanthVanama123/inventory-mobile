import React, {useMemo} from 'react';
import {View, ViewProps, StyleSheet} from 'react-native';
import {useTheme} from '../../contexts/ThemeContext';
import {Theme} from '../../theme';

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
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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
const makeStyles = (theme: Theme) => StyleSheet.create({
  card: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  card_elevated: {
    backgroundColor: theme.colors.white,
    borderWidth: theme.mode === 'dark' ? 1 : StyleSheet.hairlineWidth,
    borderColor: theme.mode === 'dark' ? theme.colors.gray[200] : theme.colors.gray[200],
    ...theme.shadows.sm,
  },
  card_outlined: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
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
