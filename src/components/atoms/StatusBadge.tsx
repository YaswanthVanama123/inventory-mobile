import React from 'react';
import {View, StyleSheet, ViewStyle, TextStyle} from 'react-native';
import {Typography} from './Typography';
import {theme} from '../../theme';
import {
  getInvoiceStatusColors,
  getPaymentStatusColors,
  getStockStatusColors,
  getOrderStatusColors,
  getFetchStatusColors,
  getGeneralStatusColors,
} from '../../theme/status';

export type StatusType = 'invoice' | 'payment' | 'stock' | 'order' | 'fetch' | 'general';

export interface StatusBadgeProps {
  /**
   * The status value to display (e.g., 'paid', 'pending', 'completed')
   */
  status: string;

  /**
   * The type of status, determines which color palette to use
   */
  type: StatusType;

  /**
   * Size variant of the badge
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Custom container style
   */
  style?: ViewStyle;

  /**
   * Custom text style
   */
  textStyle?: TextStyle;
}

/**
 * StatusBadge - Reusable status indicator component
 *
 * Automatically applies correct colors based on status type and value.
 * Provides consistent styling across all status indicators in the app.
 *
 * @example
 * <StatusBadge status="paid" type="invoice" />
 * <StatusBadge status="overdue" type="payment" size="sm" />
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type,
  size = 'md',
  style,
  textStyle,
}) => {
  // Get colors based on type
  const getColors = () => {
    switch (type) {
      case 'invoice':
        return getInvoiceStatusColors(status);
      case 'payment':
        return getPaymentStatusColors(status);
      case 'stock':
        return getStockStatusColors(status);
      case 'order':
        return getOrderStatusColors(status);
      case 'fetch':
        return getFetchStatusColors(status);
      case 'general':
        return getGeneralStatusColors(status);
      default:
        return getGeneralStatusColors(status);
    }
  };

  const colors = getColors();

  // Capitalize first letter for display
  const displayText = status
    ? status.charAt(0).toUpperCase() + status.slice(1)
    : '';

  const containerStyle = [
    styles.container,
    styles[`container_${size}`],
    {backgroundColor: colors.bgColor},
    style,
  ];

  const textVariant = size === 'sm' ? 'caption' : size === 'lg' ? 'small' : 'caption';

  return (
    <View style={containerStyle}>
      <Typography
        variant={textVariant}
        weight="semibold"
        color={colors.color}
        style={textStyle}>
        {displayText}
      </Typography>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    borderRadius: theme.borderRadius.md,
  },
  container_sm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  container_md: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  container_lg: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
});
