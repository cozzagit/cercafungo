/**
 * CercaFungo — Controlli scanner (zoom, flash, cattura)
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, shadows } from '../ui/theme';

interface ScannerControlsProps {
  isScanning: boolean;
  flash: boolean;
  zoom: number;
  onToggleScan: () => void;
  onToggleFlash: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCapture: () => void;
}

export function ScannerControls({
  isScanning,
  flash,
  zoom,
  onToggleScan,
  onToggleFlash,
  onZoomIn,
  onZoomOut,
  onCapture,
}: ScannerControlsProps) {
  const handleCapture = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onCapture();
  };

  const handleToggleScan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleScan();
  };

  return (
    <View style={styles.container}>
      {/* Riga superiore: flash e zoom */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={[styles.iconButton, flash && styles.iconButtonActive]}
          onPress={onToggleFlash}
          activeOpacity={0.7}
        >
          <Ionicons
            name={flash ? 'flash' : 'flash-off'}
            size={20}
            color={flash ? colors.porcino : colors.white}
          />
        </TouchableOpacity>

        <View style={styles.zoomControls}>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={onZoomOut}
            disabled={zoom <= 1}
            activeOpacity={0.7}
          >
            <Ionicons
              name="remove"
              size={18}
              color={zoom <= 1 ? 'rgba(255,255,255,0.3)' : colors.white}
            />
          </TouchableOpacity>
          <Text style={styles.zoomText}>{zoom.toFixed(1)}x</Text>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={onZoomIn}
            disabled={zoom >= 5}
            activeOpacity={0.7}
          >
            <Ionicons
              name="add"
              size={18}
              color={zoom >= 5 ? 'rgba(255,255,255,0.3)' : colors.white}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Riga inferiore: cattura e scan toggle */}
      <View style={styles.bottomRow}>
        {/* Placeholder sinistro per bilanciare */}
        <View style={styles.sideSlot} />

        {/* Pulsante cattura centrale */}
        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleCapture}
          activeOpacity={0.8}
        >
          <View style={styles.captureOuter}>
            <View style={styles.captureInner} />
          </View>
        </TouchableOpacity>

        {/* Toggle scan/pausa */}
        <View style={styles.sideSlot}>
          <TouchableOpacity
            style={[
              styles.scanToggle,
              isScanning ? styles.scanToggleActive : styles.scanTogglePaused,
            ]}
            onPress={handleToggleScan}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isScanning ? 'pause' : 'play'}
              size={22}
              color={colors.white}
            />
            <Text style={styles.scanToggleText}>
              {isScanning ? 'Pausa' : 'Scansiona'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: spacing['5xl'],
    paddingHorizontal: spacing.xl,
  },

  // Top row
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  iconButtonActive: {
    backgroundColor: 'rgba(198, 139, 62, 0.3)',
    borderColor: colors.porcino,
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    gap: spacing.sm,
  },
  zoomButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'center',
  },

  // Bottom row
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sideSlot: {
    width: 100,
    alignItems: 'center',
  },

  // Capture button
  captureButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.white,
  },

  // Scan toggle
  scanToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  scanToggleActive: {
    backgroundColor: 'rgba(39, 174, 96, 0.3)',
    borderColor: colors.safe,
  },
  scanTogglePaused: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  scanToggleText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});
