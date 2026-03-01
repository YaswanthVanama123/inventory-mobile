import React from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import {Typography} from '../atoms/Typography';
import {theme} from '../../theme';

export type GradientColor = 'blue' | 'purple' | 'orange' | 'green' | 'teal' | 'pink' | 'indigo' | 'cyan';

export interface GradientStatCardProps {
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
   * Gradient color theme
   */
  gradientColor?: GradientColor;

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Custom container style
   */
  style?: ViewStyle;

  /**
   * Optional trend indicator (up/down)
   */
  trend?: 'up' | 'down' | 'neutral';
}

/**
 * GradientStatCard - Modern stat card with gradient-inspired colors
 *
 * Provides beautiful, modern stat cards for dashboards and summary screens.
 * Uses solid colors from gradient palettes for a clean, professional look.
 */
export const GradientStatCard: React.FC<GradientStatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  gradientColor = 'blue',
  size = 'md',
  style,
  trend,
}) => {
  const getGradientColor = () => {
    const colorMap: Record<GradientColor, string> = {
      blue: theme.colors.primary[600],
      purple: theme.colors.accent[600],
      orange: theme.colors.warning[600],
      green: theme.colors.success[600],
      teal: '#14b8a6',
      pink: '#ec4899',
      indigo: '#6366f1',
      cyan: '#06b6d4',
    };
    return colorMap[gradientColor];
  };

  const containerStyle = [
    styles.container,
    styles[`container_${size}`],
    {backgroundColor: getGradientColor()},
    style,
  ];

  const valueFontSize =
    size === 'sm'
      ? theme.typography.fontSizes.xl
      : size === 'lg'
      ? 32
      : theme.typography.fontSizes.xxxl;

  const getTrendIcon = () => {
    if (!trend || trend === 'neutral') return null;
    return trend === 'up' ? '↑' : '↓';
  };

  return (
    <View style={containerStyle}>
      {/* Decorative overlay */}
      <View style={styles.overlay} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Typography variant="caption" style={styles.title}>
            {title.toUpperCase()}
          </Typography>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
        </View>

        <Typography
          variant="h1"
          weight="bold"
          style={[styles.value, {fontSize: valueFontSize}]}>
          {value}
        </Typography>

        {subtitle && (
          <View style={styles.subtitleRow}>
            {trend && trend !== 'neutral' && (
              <Typography
                variant="caption"
                style={[
                  styles.trendIcon,
                  trend === 'up' ? styles.trendUp : styles.trendDown,
                ]}>
                {getTrendIcon()}
              </Typography>
            )}
            <Typography variant="caption" style={styles.subtitle}>
              {subtitle}
            </Typography>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.xxl,
    overflow: 'hidden',
    position: 'relative',
    ...theme.shadows.md,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: theme.borderRadius.xxl,
  },
  content: {
    justifyContent: 'space-between',
    zIndex: 1,
  },
  container_sm: {
    padding: theme.spacing.md,
    minHeight: 110,
  },
  container_md: {
    padding: 20,
    minHeight: 145,
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
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  value: {
    color: '#ffffff',
    lineHeight: undefined,
    marginBottom: theme.spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: '600',
  },
  trendIcon: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  trendUp: {
    color: 'rgba(255, 255, 255, 0.95)',
  },
  trendDown: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
});
