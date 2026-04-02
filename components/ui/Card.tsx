/**
 * CercaFungo — Card component
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { colors, spacing, borderRadius, shadows } from './theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: keyof typeof spacing;
  style?: ViewStyle;
}

export function Card({
  children,
  onPress,
  variant = 'elevated',
  padding = 'lg',
  style,
}: CardProps) {
  const containerStyles: ViewStyle[] = [
    styles.base,
    styles[variant],
    { padding: spacing[padding] },
    style as ViewStyle,
  ].filter(Boolean) as ViewStyle[];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={containerStyles}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyles}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  elevated: {
    backgroundColor: colors.white,
    ...shadows.md,
  },
  outlined: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  filled: {
    backgroundColor: colors.cream,
  },
});
