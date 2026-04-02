/**
 * CercaFungo — Badge component per etichette commestibilita/stagione
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, typography } from './theme';
import type { Edibility } from '@/lib/constants';

type BadgeVariant = 'edible' | 'toxic' | 'deadly' | 'caution' | 'neutral' | 'info';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
}

const VARIANT_STYLES: Record<
  BadgeVariant,
  { bg: string; text: string; border: string }
> = {
  edible: { bg: colors.safeBg, text: colors.safe, border: colors.safe },
  toxic: { bg: colors.dangerBg, text: colors.danger, border: colors.danger },
  deadly: { bg: '#2C0B0E', text: '#FF4757', border: '#FF4757' },
  caution: { bg: colors.warningBg, text: colors.warning, border: colors.warning },
  neutral: { bg: colors.creamDark, text: colors.text.secondary, border: colors.border.medium },
  info: { bg: '#E8F0FE', text: '#1A73E8', border: '#1A73E8' },
};

export function Badge({
  label,
  variant = 'neutral',
  size = 'md',
  style,
}: BadgeProps) {
  const variantStyle = VARIANT_STYLES[variant];

  return (
    <View
      style={[
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        {
          backgroundColor: variantStyle.bg,
          borderColor: variantStyle.border,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          size === 'sm' ? styles.textSm : styles.textMd,
          { color: variantStyle.text },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * Helper: mappa Edibility al BadgeVariant corretto.
 */
export function edibilityToBadgeVariant(edibility: Edibility): BadgeVariant {
  switch (edibility) {
    case 'ottimo':
    case 'buono':
    case 'commestibile':
      return 'edible';
    case 'tossico':
      return 'toxic';
    case 'mortale':
      return 'deadly';
    case 'non_commestibile':
      return 'neutral';
    default:
      return 'neutral';
  }
}

/**
 * Helper: etichetta italiana per Edibility.
 */
export function edibilityLabel(edibility: Edibility): string {
  switch (edibility) {
    case 'ottimo':
      return 'Ottimo commestibile';
    case 'buono':
      return 'Buon commestibile';
    case 'commestibile':
      return 'Commestibile';
    case 'tossico':
      return 'Tossico';
    case 'mortale':
      return 'MORTALE';
    case 'non_commestibile':
      return 'Non commestibile';
    default:
      return edibility;
  }
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  sm: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
  },
  md: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  text: {
    fontWeight: '600',
  },
  textSm: {
    fontSize: 10,
    lineHeight: 14,
  },
  textMd: {
    fontSize: 12,
    lineHeight: 16,
  },
});
