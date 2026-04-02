/**
 * CercaFungo — Camera view con VisionCamera
 *
 * Wrapper attorno a react-native-vision-camera che gestisce
 * permessi, focus, zoom e connessione al frame processor ML.
 * In fase dev mostra un placeholder simulato.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../ui/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CameraViewProps {
  isActive: boolean;
  onFrameProcessed?: () => void;
  zoom?: number;
  flash?: boolean;
}

export function CameraView({
  isActive,
  zoom = 1,
  flash = false,
}: CameraViewProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    // In produzione: richiedere permesso fotocamera tramite VisionCamera
    // const permission = await Camera.requestCameraPermission();
    // setHasPermission(permission === 'granted');
    setHasPermission(true); // Mock per dev
  }, []);

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.porcino} />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionCard}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>
            Fotocamera necessaria
          </Text>
          <Text style={styles.permissionText}>
            CercaFungo ha bisogno della fotocamera per rilevare i funghi
            nel sottobosco. Abilita i permessi nelle impostazioni.
          </Text>
        </View>
      </View>
    );
  }

  // In produzione qui ci sara il componente <Camera> di VisionCamera.
  // Per ora mostriamo un placeholder che simula la vista fotocamera.
  return (
    <View style={styles.container}>
      {/* Sfondo simulato foresta */}
      <View style={styles.forestBg}>
        <View style={styles.forestGradientTop} />
        <View style={styles.forestGradientBottom} />

        {/* Pattern sottobosco */}
        <View style={styles.forestPattern}>
          {Array.from({ length: 12 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.forestDot,
                {
                  left: `${10 + (i % 4) * 25}%` as unknown as number,
                  top: `${20 + Math.floor(i / 4) * 30}%` as unknown as number,
                  opacity: 0.15 + Math.random() * 0.2,
                  width: 20 + Math.random() * 40,
                  height: 20 + Math.random() * 40,
                },
              ]}
            />
          ))}
        </View>

        {/* Indicatore zoom */}
        {zoom > 1 && (
          <View style={styles.zoomIndicator}>
            <Text style={styles.zoomText}>{zoom.toFixed(1)}x</Text>
          </View>
        )}

        {/* Indicatore flash */}
        {flash && (
          <View style={styles.flashIndicator}>
            <Text style={styles.flashText}>⚡</Text>
          </View>
        )}

        {/* Centro mirino */}
        <View style={styles.crosshair}>
          <View style={[styles.crosshairLine, styles.crosshairH]} />
          <View style={[styles.crosshairLine, styles.crosshairV]} />
        </View>

        {/* Label dev mode */}
        {!isActive && (
          <View style={styles.pausedOverlay}>
            <Text style={styles.pausedText}>SCANNER IN PAUSA</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.soil,
  },
  forestBg: {
    flex: 1,
    backgroundColor: '#1A3008',
    position: 'relative',
  },
  forestGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  forestGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  forestPattern: {
    ...StyleSheet.absoluteFillObject,
  },
  forestDot: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#2D5016',
  },
  zoomIndicator: {
    position: 'absolute',
    top: spacing['3xl'],
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  zoomText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  flashIndicator: {
    position: 'absolute',
    top: spacing['3xl'],
    right: spacing.lg,
    backgroundColor: 'rgba(198, 139, 62, 0.6)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashText: {
    fontSize: 18,
  },
  crosshair: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 40,
    height: 40,
    marginLeft: -20,
    marginTop: -20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  crosshairH: {
    width: 40,
    height: 1,
  },
  crosshairV: {
    width: 1,
    height: 40,
  },
  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pausedText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },

  // Permission
  permissionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['4xl'],
  },
  permissionIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  permissionTitle: {
    ...typography.subtitle,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  permissionText: {
    ...typography.body,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
});
