import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import {useTheme} from '../../contexts/ThemeContext';
import {SearchIcon} from '../icons/SearchIcon';
import {Typography} from '../atoms/Typography';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Shows a spinner in place of the search icon while a request is in flight. */
  loading?: boolean;
  onClear?: () => void;
  autoFocus?: boolean;
  editable?: boolean;
  style?: StyleProp<ViewStyle>;
  returnKeyType?: 'search' | 'done' | 'go';
  onSubmitEditing?: () => void;
}

/**
 * Reusable search input used across screens that search via the BACKEND.
 * Pair the value with `useDebounce` and feed the debounced text into the
 * screen's fetch params — do NOT filter already-fetched data in memory.
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  loading = false,
  onClear,
  autoFocus = false,
  editable = true,
  style,
  returnKeyType = 'search',
  onSubmitEditing,
}) => {
  const theme = useTheme();

  const handleClear = () => {
    onChangeText('');
    onClear?.();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.white,
          borderColor: theme.colors.gray[200],
        },
        style,
      ]}>
      <View style={styles.icon}>
        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.gray[400]} />
        ) : (
          <SearchIcon size={18} color={theme.colors.gray[400]} />
        )}
      </View>
      <TextInput
        style={[
          styles.input,
          {
            color: theme.colors.gray[900],
            fontSize: theme.typography.roles.sideheading.fontSize,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.gray[400]}
        value={value}
        onChangeText={onChangeText}
        autoFocus={autoFocus}
        editable={editable}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        autoCorrect={false}
        autoCapitalize="none"
        allowFontScaling={false}
      />
      {value.length > 0 && (
        <TouchableOpacity
          style={styles.clear}
          onPress={handleClear}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Typography variant="caption" color={theme.colors.gray[500]}>
            ✕
          </Typography>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  icon: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  clear: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
