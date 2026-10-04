import React, {useMemo} from 'react';
import {View, StyleSheet, TouchableOpacity, ViewStyle} from 'react-native';
import {Typography} from '../atoms/Typography';
import {XIcon} from '../icons';
import {useTheme} from '../../contexts/ThemeContext';
import {Theme} from '../../theme';

export interface ModalHeaderProps {
  title: string;

  subtitle?: string;
  onClose: () => void;
  style?: ViewStyle;
  hideCloseButton?: boolean;
}
export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  subtitle,
  onClose,
  style,
  hideCloseButton = false,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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
const makeStyles = (theme: Theme) => StyleSheet.create({
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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
    marginRight: -8,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.gray[200],
    marginTop: theme.spacing.sm,
  },
});
