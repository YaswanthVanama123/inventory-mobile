import React from 'react';
import {View, StyleSheet, TouchableOpacity, ViewStyle} from 'react-native';
import {Typography} from '../atoms/Typography';
import {XIcon} from '../icons';
import {theme} from '../../theme';

export interface ModalHeaderProps {
  /**
   * Main title text
   */
  title: string;

  /**
   * Optional subtitle/description text
   */
  subtitle?: string;

  /**
   * Callback when close button is pressed
   */
  onClose: () => void;

  /**
   * Optional custom container style
   */
  style?: ViewStyle;

  /**
   * Hide the close button
   */
  hideCloseButton?: boolean;
}

/**
 * ModalHeader - Reusable header component for modals and sheets
 *
 * Provides consistent styling for modal headers across the app.
 * Includes title, optional subtitle, and close button.
 *
 * @example
 * <ModalHeader
 *   title="Edit User"
 *   subtitle="Update user information"
 *   onClose={handleClose}
 * />
 */
export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  subtitle,
  onClose,
  style,
  hideCloseButton = false,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Typography variant="h3" weight="bold">
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="small"
              color={theme.colors.gray[500]}
              style={styles.subtitle}>
              {subtitle}
            </Typography>
          )}
        </View>
        {!hideCloseButton && (
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <XIcon size={24} color={theme.colors.gray[600]} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.divider} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.white,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  subtitle: {
    marginTop: theme.spacing.xs,
  },
  closeButton: {
    width: 44, // Minimum touch target
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8, // Compensate for visual alignment
    marginRight: -8,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.gray[200],
    marginTop: theme.spacing.sm,
  },
});
