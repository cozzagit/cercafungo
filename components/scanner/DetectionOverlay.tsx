/**
 * CercaFungo — Overlay bounding box sui rilevamenti
 *
 * Disegna i rettangoli colorati sopra la vista fotocamera
 * dove il modello ha rilevato possibili funghi.
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import type { Detection } from '@/lib/ml/types';
import { colors, spacing, borderRadius } from '../ui/theme';
import {
  HIGH_CONFIDENCE_THRESHOLD,
  MEDIUM_CONFIDENCE_THRESHOLD,
} from '@/lib/constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DetectionOverlayProps {
  detections: Detection[];
  frameWidth: number;
  frameHeight: number;
}

export function DetectionOverlay({
  detections,
  frameWidth,
  frameHeight,
}: DetectionOverlayProps) {
  if (detections.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {detections.map((detection) => (
        <DetectionBox
          key={detection.id}
          detection={detection}
          frameWidth={frameWidth}
          frameHeight={frameHeight}
        />
      ))}
    </View>
  );
}

function DetectionBox({
  detection,
  frameWidth,
  frameHeight,
}: {
  detection: Detection;
  frameWidth: number;
  frameHeight: number;
}) {
  const { boundingBox, confidence, label } = detection;
  const boxColor = getBoxColor(confidence);

  // Animazione pulsante per il bordo
  const pulseOpacity = useSharedValue(1);

  React.useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // Converti coordinate normalizzate in pixel
  const left = boundingBox.x * SCREEN_WIDTH;
  const top = boundingBox.y * SCREEN_HEIGHT;
  const width = boundingBox.width * SCREEN_WIDTH;
  const height = boundingBox.height * SCREEN_HEIGHT;

  const percentage = Math.round(confidence * 100);

  return (
    <Animated.View
      style={[
        styles.box,
        animatedStyle,
        {
          left,
          top,
          width,
          height,
          borderColor: boxColor,
        },
      ]}
    >
      {/* Angoli stilizzati */}
      <View style={[styles.corner, styles.cornerTL, { borderColor: boxColor }]} />
      <View style={[styles.corner, styles.cornerTR, { borderColor: boxColor }]} />
      <View style={[styles.corner, styles.cornerBL, { borderColor: boxColor }]} />
      <View style={[styles.corner, styles.cornerBR, { borderColor: boxColor }]} />

      {/* Label */}
      <View style={[styles.label, { backgroundColor: boxColor }]}>
        <Text style={styles.labelText} numberOfLines={1}>
          {label} {percentage}%
        </Text>
      </View>
    </Animated.View>
  );
}

function getBoxColor(confidence: number): string {
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) return colors.confidence.high;
  if (confidence >= MEDIUM_CONFIDENCE_THRESHOLD) return colors.confidence.medium;
  return colors.confidence.low;
}

const CORNER_SIZE = 12;
const CORNER_WIDTH = 2.5;

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'dashed',
  },

  // Angoli
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderTopLeftRadius: 3,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderTopRightRadius: 3,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: 3,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: 3,
  },

  // Label
  label: {
    position: 'absolute',
    top: -22,
    left: -1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.xs,
  },
  labelText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
