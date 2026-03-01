import React from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import {Typography} from '../atoms/Typography';
import {theme} from '../../theme';

export interface StatCardProps {
  /**
   * Card title/label
   */
  title: string;

  /**
   * Main value to display
   */
  value: string | number;

  /**
   * Optional subtitle/description
   */
  subtitle?: string;

  /**
   * Optional icon element
   */
  icon?: React.ReactNode;

  /**
   * Background color of the card
   */
  backgroundColor?: string;

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Custom container style
   */
  style?: ViewStyle;
}

/**
 * StatCard - Reusable statistics card component
 *
 * Provides consistent styling for stat cards across all dashboard and summary screens.
 * Displays title, value, optional subtitle, and optional icon.
 *
 * @example
 * <StatCard
 *   title="Total Revenue"
 *   value="$45.2K"
 *   subtitle="+12.5%"
 *   icon={<DollarIcon size={20} color="#ffffff" />}
 *   backgroundColor="#3b82f6"
 * />
 */
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  backgroundColor = theme.colors.primary[600],
  size = 'md',
  style,
}) => {
  const containerStyle = [
    styles.container,
    styles[`container_${size}`],
    {backgroundColor},
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

const styles = StyleSheet.create({
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
    lineHeight: undefined, // Let it auto-calculate
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
