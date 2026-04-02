/**
 * CercaFungo — Barra visuale di confidenza rilevamento
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import {
  colors,
  spacing,
  borderRadius,
} from './theme';
import {
  HIGH_CONFIDENCE_THRESHOLD,
  MEDIUM_CONFIDENCE_THRESHOLD,
} from '@/lib/constants';

interface ConfidenceBarProps {
  confidence: number; // 0-1
  showLabel?: boolean;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export function ConfidenceBar({
  confidence,
  showLabel = true,
  showPercentage = true,
  size = 'md',
  style,
}: ConfidenceBarProps) {
  const percentage = Math.round(confidence * 100);
  const barColor = getConfidenceColor(confidence);
  const bgColor = getConfidenceBgColor(confidence);
  const label = getConfidenceLabel(confidence);

  const barHeight = size === 'sm' ? 4 : size === 'md' ? 6 : 8;

  return (
    <View style={[styles.container, style]}>
      {(showLabel || showPercentage) && (
        <View style={styles.labelRow}>
          {showLabel && (
            <Text style={[styles.label, { color: barColor }]}>{label}</Text>
          )}
          {showPercentage && (
            <Text style={[styles.percentage, { color: barColor }]}>
              {percentage}%
            </Text>
          )}
        </View>
      )}
      <View
        style={[
          styles.track,
          { height: barHeight, backgroundColor: bgColor },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${percentage}%`,
              height: barHeight,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

/**
 * Indicatore compatto di confidenza (solo pallino colorato + percentuale).
 */
export function ConfidenceDot({
  confidence,
  style,
}: {
  confidence: number;
  style?: ViewStyle;
}) {
  const percentage = Math.round(confidence * 100);
  const dotColor = getConfidenceColor(confidence);

  return (
    <View style={[styles.dotContainer, style]}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[styles.dotText, { color: dotColor }]}>{percentage}%</Text>
    </View>
  );
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) return colors.confidence.high;
  if (confidence >= MEDIUM_CONFIDENCE_THRESHOLD) return colors.confidence.medium;
  return colors.confidence.low;
}

function getConfidenceBgColor(confidence: number): string {
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) return colors.confidence.highBg;
  if (confidence >= MEDIUM_CONFIDENCE_THRESHOLD) return colors.confidence.mediumBg;
  return colors.confidence.lowBg;
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) return 'Alta';
  if (confidence >= MEDIUM_CONFIDENCE_THRESHOLD) return 'Media';
  return 'Bassa';
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  percentage: {
    fontSize: 12,
    fontWeight: '700',
  },
  track: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: borderRadius.full,
  },

  // Dot variant
  dotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
