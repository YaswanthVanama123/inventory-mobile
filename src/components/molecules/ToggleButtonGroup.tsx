import React from 'react';
import {View, TouchableOpacity, Text, StyleSheet} from 'react-native';
import {theme} from '../../theme';

export interface ToggleOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface ToggleButtonGroupProps {
  options: ToggleOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const ToggleButtonGroup: React.FC<ToggleButtonGroupProps> = ({
  options,
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <View style={styles.container}>
      {options.map((option, index) => {
        const isActive = value === option.value;
        const isFirst = index === 0;
        const isLast = index === options.length - 1;

        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.button,
              isActive && styles.buttonActive,
              isFirst && styles.buttonFirst,
              isLast && styles.buttonLast,
            ]}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            activeOpacity={0.7}>
            <View style={styles.buttonContent}>
              {option.icon}
              <Text style={[styles.text, isActive && styles.textActive]}>
                {option.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.gray[200],
    borderRadius: theme.borderRadius.lg,
    padding: 4,
  },
  button: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonActive: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  buttonFirst: {
    borderTopLeftRadius: theme.borderRadius.md,
    borderBottomLeftRadius: theme.borderRadius.md,
  },
  buttonLast: {
    borderTopRightRadius: theme.borderRadius.md,
    borderBottomRightRadius: theme.borderRadius.md,
  },
  text: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.gray[600],
  },
  textActive: {
    color: theme.colors.primary[600],
    fontWeight: theme.typography.fontWeights.semibold,
  },
});
