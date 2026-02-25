import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {theme} from '../../theme';
import {AlertCircleIcon} from '../icons';

export interface ErrorAlertProps {
  message: string;
  style?: ViewStyle;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({message, style}) => {
  if (!message) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <AlertCircleIcon size={20} color={theme.colors.error[600]} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error[50],
    borderColor: theme.colors.error[200],
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: 8,
  },
  message: {
    flex: 1,
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.error[800],
  },
});
