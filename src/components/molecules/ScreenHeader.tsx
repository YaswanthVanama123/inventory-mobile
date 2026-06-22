import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Typography} from '../atoms/Typography';
import {ArrowLeftIcon} from '../icons';
import {useTheme} from '../../contexts/ThemeContext';

interface ScreenHeaderProps {
  title?: string;
  canGoBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
}

// Custom navigation header used in place of the native stack header. It applies
// exactly ONE status-bar inset (via useSafeAreaInsets) so the title/back button
// don't get the inflated/double top margin the native header shows on Android
// edge-to-edge — and it stays consistent with iOS.
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({title, canGoBack, onBack, right}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top,
          backgroundColor: theme.colors.white,
          borderBottomColor: theme.colors.gray[200],
        },
      ]}>
      <View style={styles.bar}>
        <View style={styles.side}>
          {canGoBack ? (
            <TouchableOpacity
              onPress={onBack}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              style={styles.backBtn}
              activeOpacity={0.7}>
              <ArrowLeftIcon size={24} color={theme.colors.gray[900]} />
            </TouchableOpacity>
          ) : null}
        </View>
        <Typography variant="sideheading" weight="bold" numberOfLines={1} style={styles.title}>
          {title}
        </Typography>
        <View style={styles.side}>{right}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {borderBottomWidth: 1},
  bar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  side: {minWidth: 44, alignItems: 'center', justifyContent: 'center'},
  backBtn: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  title: {flex: 1, textAlign: 'center'},
});
