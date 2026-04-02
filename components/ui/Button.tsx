/**
 * CercaFungo — Button component
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, shadows, typography } from './theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  haptic?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  haptic = true,
}: ButtonProps) {
  const handlePress = () => {
    if (disabled || loading) return;
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const containerStyles: ViewStyle[] = [
    styles.base,
    styles[`container_${variant}`],
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    style as ViewStyle,
  ].filter(Boolean) as ViewStyle[];

  const textStyles: TextStyle[] = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
    (disabled || loading) && styles.textDisabled,
    textStyle as TextStyle,
  ].filter(Boolean) as TextStyle[];

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={containerStyles}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.white : colors.forest}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          <Text style={textStyles}>{title}</Text>
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },

  // Variants
  container_primary: {
    backgroundColor: colors.forest,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  container_secondary: {
    backgroundColor: colors.porcino,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  container_outline: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.forest,
  },
  container_ghost: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
  },
  container_danger: {
    backgroundColor: colors.danger,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },

  // Sizes
  size_sm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 36,
  },
  size_md: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 44,
  },
  size_lg: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    minHeight: 52,
  },

  // Text
  text: {
    fontWeight: '600',
  },
  text_primary: {
    color: colors.white,
  },
  text_secondary: {
    color: colors.white,
  },
  text_outline: {
    color: colors.forest,
  },
  text_ghost: {
    color: colors.forest,
  },
  text_danger: {
    color: colors.white,
  },
  textDisabled: {
    opacity: 0.7,
  },

  // Text sizes
  textSize_sm: {
    fontSize: 13,
    lineHeight: 18,
  },
  textSize_md: {
    fontSize: 15,
    lineHeight: 20,
  },
  textSize_lg: {
    fontSize: 17,
    lineHeight: 22,
  },
});
