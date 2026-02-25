import React from 'react';
import {
  TextInput as RNTextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps as RNTextInputProps,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import {theme} from '../../theme';

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  onRightIconPress?: () => void;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  containerStyle,
  inputStyle,
  onRightIconPress,
  ...props
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[styles.inputWrapper, error && styles.inputWrapperError]}>
        {leftIcon ? <View style={styles.leftIconWrapper}>{leftIcon}</View> : null}

        <RNTextInput
          {...props}
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
            inputStyle,
          ]}
          placeholderTextColor={theme.colors.gray[400]}
        />

        {rightIcon ? (
          onRightIconPress ? (
            <TouchableOpacity
              style={styles.rightIconWrapper}
              onPress={onRightIconPress}>
              {rightIcon}
            </TouchableOpacity>
          ) : (
            <View style={styles.rightIconWrapper}>{rightIcon}</View>
          )
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.gray[700],
    marginBottom: theme.spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    ...theme.shadows.sm,
  },
  inputWrapperError: {
    borderColor: theme.colors.error[500],
  },
  leftIconWrapper: {
    marginLeft: theme.spacing.md,
  },
  rightIconWrapper: {
    marginRight: theme.spacing.md,
    padding: theme.spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.fontSizes.md,
    color: theme.colors.gray[900],
  },
  inputWithLeftIcon: {
    paddingLeft: theme.spacing.sm,
  },
  inputWithRightIcon: {
    paddingRight: theme.spacing.xs,
  },
  error: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.error[600],
    marginTop: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
});
