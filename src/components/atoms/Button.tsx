import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {theme} from '../../theme';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  style,
  textStyle,
  ...props
}) => {
  const buttonStyles = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
    textStyle,
  ];

  return (
    <TouchableOpacity
      {...props}
      style={buttonStyles}
      disabled={disabled || loading}
      activeOpacity={0.7}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? '#fff' : theme.colors.primary[600]}
        />
      ) : (
        <>
          {leftIcon}
          <Text style={textStyles}>{title}</Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.xl,
    gap: theme.spacing.sm,
  },
  button_primary: {
    backgroundColor: theme.colors.primary[600],
    ...theme.shadows.md,
  },
  button_secondary: {
    backgroundColor: theme.colors.accent[50],
    borderWidth: 1,
    borderColor: theme.colors.accent[200],
  },
  button_outline: {
    backgroundColor: theme.colors.transparent,
    borderWidth: 2,
    borderColor: theme.colors.primary[600],
  },
  button_ghost: {
    backgroundColor: theme.colors.transparent,
  },
  button_danger: {
    backgroundColor: theme.colors.error[600],
    ...theme.shadows.md,
  },
  button_sm: {
    paddingVertical: 13, // Minimum 44pt touch target (13 + ~18 line height + 13 = ~44px)
    paddingHorizontal: 20,
  },
  button_md: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  button_lg: {
    paddingVertical: 18,
    paddingHorizontal: theme.spacing.xl,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: theme.typography.fontWeights.semibold,
  },
  text_primary: {
    color: theme.colors.white,
  },
  text_secondary: {
    color: theme.colors.accent[700],
  },
  text_outline: {
    color: theme.colors.primary[600],
  },
  text_ghost: {
    color: theme.colors.primary[600],
  },
  text_danger: {
    color: theme.colors.white,
  },
  text_sm: {
    fontSize: theme.typography.fontSizes.sm,
  },
  text_md: {
    fontSize: theme.typography.fontSizes.md,
  },
  text_lg: {
    fontSize: theme.typography.fontSizes.lg,
  },
});
