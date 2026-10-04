import React, {useMemo} from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import {Typography} from '../atoms/Typography';
import {useTheme} from '../../contexts/ThemeContext';
import {Theme} from '../../theme';

export interface StatCardProps {
  title: string;

  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  backgroundColor?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  backgroundColor,
  size = 'md',
  style,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const resolvedBackgroundColor = backgroundColor ?? theme.colors.primary[600];
  const containerStyle = [
    styles.container,
    styles[`container_${size}`],
    {backgroundColor: resolvedBackgroundColor},
    style,
  ];
  const valueFontSize =
    size === 'sm'
      ? theme.typography.fontSizes.xl
      : size === 'lg'
      ? theme.typography.fontSizes.xxxxl
      : theme.typography.fontSizes.xxl;
  return (
    <View style={containerStyle}>
      <View style={styles.topRow}>
        <Typography variant="caption" style={styles.title}>
          {title}
        </Typography>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
      </View>
      <Typography
        variant="h2"
        weight="bold"
        style={[styles.value, {fontSize: valueFontSize}]}>
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="caption" style={styles.subtitle}>
          {subtitle}
        </Typography>
      )}
    </View>
  );
};
const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.xl,
    justifyContent: 'space-between',
    ...theme.shadows.md,
  },
  container_sm: {
    padding: theme.spacing.md,
    minHeight: 100,
  },
  container_md: {
    padding: theme.spacing.lg,
    minHeight: 140,
  },
  container_lg: {
    padding: theme.spacing.xl,
    minHeight: 180,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    color: '#ffffff',
    fontSize: theme.typography.fontSizes.xs,
    opacity: 0.95,
    fontWeight: '500',
  },
  value: {
    color: '#ffffff',
    lineHeight: undefined,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    color: '#ffffff',
    fontSize: theme.typography.fontSizes.xs,
    opacity: 0.9,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
