import React, {useMemo} from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {useTheme} from '../../contexts/ThemeContext';
import {Theme} from '../../theme';
import {useBreakpoint, BreakpointInfo} from '../../utils/breakpoints';

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
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
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
      activeOpacity={0.85}>
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
const makeStyles = (theme: Theme, bp: BreakpointInfo) => {
  // Scale buttons up a little on big screens so they don't look tiny, but
  // CAP full-width buttons so they stop stretching edge-to-edge on Mac/iPad.
  const padScale = bp.isWide ? 1.35 : bp.isDesktop ? 1.18 : 1;
  const fontScale = bp.isWide ? 1.22 : bp.isDesktop ? 1.12 : 1;
  // Largest a "full width" button is allowed to grow to on big screens; it
  // fills its container on phones (undefined cap) and centers when capped.
  const fullMaxWidth = bp.isWide ? 560 : bp.isDesktop ? 480 : undefined;
  const sz = theme.typography.fontSizes;
  const r = (n: number) => Math.round(n);

  return StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: bp.isMobile ? theme.borderRadius.md : theme.borderRadius.lg,
      gap: theme.spacing.sm,
    },
    button_primary: {
      backgroundColor: theme.colors.primary[600],
      ...theme.shadows.sm,
    },
    button_secondary: {
      backgroundColor: theme.colors.accent[50],
      borderWidth: 1,
      borderColor: theme.colors.accent[200],
    },
    button_outline: {
      backgroundColor: theme.colors.transparent,
      borderWidth: 1.5,
      borderColor: theme.colors.primary[600],
    },
    button_ghost: {
      backgroundColor: theme.colors.transparent,
    },
    button_danger: {
      backgroundColor: theme.colors.error[600],
      ...theme.shadows.sm,
    },
    button_sm: {
      paddingVertical: r(10 * padScale),
      paddingHorizontal: r(16 * padScale),
    },
    button_md: {
      paddingVertical: r(13 * padScale),
      paddingHorizontal: r(theme.spacing.lg * padScale),
    },
    button_lg: {
      paddingVertical: r(16 * padScale),
      paddingHorizontal: r(theme.spacing.xl * padScale),
    },
    fullWidth: {
      width: '100%',
      maxWidth: fullMaxWidth,
      alignSelf: fullMaxWidth ? 'center' : 'auto',
    },
    disabled: {
      opacity: 0.4,
    },
    text: {
      fontWeight: theme.typography.fontWeights.semibold,
      letterSpacing: 0.1,
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
      fontSize: r(sz.sm * fontScale),
    },
    text_md: {
      fontSize: r(sz.md * fontScale),
    },
    text_lg: {
      fontSize: r(sz.lg * fontScale),
    },
  });
};
