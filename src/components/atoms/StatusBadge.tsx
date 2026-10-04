import React, {useMemo} from 'react';
import {View, StyleSheet, ViewStyle, TextStyle} from 'react-native';
import {Typography} from './Typography';
import {useTheme} from '../../contexts/ThemeContext';
import {Theme} from '../../theme';
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
  status: string;
  type: StatusType;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
}
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type,
  size = 'md',
  style,
  textStyle,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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
const makeStyles = (theme: Theme) => StyleSheet.create({
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
