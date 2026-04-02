/**
 * CercaFungo — Scanner tab (schermata principale)
 *
 * Vista fotocamera con rilevamento funghi in tempo reale,
 * overlay bounding box e card risultati.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated as RNAnimated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView } from '@/components/scanner/CameraView';
import { DetectionOverlay } from '@/components/scanner/DetectionOverlay';
import { ScannerControls } from '@/components/scanner/ScannerControls';
import {
  DetectionCard,
  EmptyDetectionCard,
} from '@/components/scanner/DetectionCard';
import { colors, spacing, typography, shadows } from '@/components/ui/theme';
import { generateMockDetections } from '@/lib/ml/detector';
import { classifyDetection } from '@/lib/ml/classifier';
import type { Detection } from '@/lib/ml/types';
import type { ClassificationResult } from '@/lib/ml/types';
import { saveFinding } from '@/lib/storage/findings';
import { getCurrentLocation } from '@/lib/location/tracker';
import { incrementTotalScans } from '@/lib/storage/settings';
import { getSpeciesById } from '@/lib/species/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ScannerScreen() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [flash, setFlash] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [selectedDetection, setSelectedDetection] = useState<Detection | null>(
    null
  );
  const [classification, setClassification] =
    useState<ClassificationResult | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animazione pulsante scanning
  const scanPulse = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (isScanning) {
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(scanPulse, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          RNAnimated.timing(scanPulse, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanPulse.setValue(0);
    }
  }, [isScanning]);

  // Mock scanning loop
  useEffect(() => {
    if (isScanning) {
      scanIntervalRef.current = setInterval(() => {
        const result = generateMockDetections();
        setDetections(result.detections);

        if (result.detections.length > 0 && !selectedDetection) {
          // Seleziona automaticamente il rilevamento con confidenza piu alta
          const best = result.detections.reduce((a, b) =>
            a.confidence > b.confidence ? a : b
          );
          handleSelectDetection(best);
        }
      }, 2000);
    } else {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    }

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [isScanning, selectedDetection]);

  const handleSelectDetection = useCallback(async (detection: Detection) => {
    setSelectedDetection(detection);
    const result = await classifyDetection(detection);
    setClassification(result);
  }, []);

  const handleToggleScan = useCallback(() => {
    setIsScanning((prev) => !prev);
    if (!isScanning) {
      setSelectedDetection(null);
      setClassification(null);
      setDetections([]);
    }
  }, [isScanning]);

  const handleToggleFlash = useCallback(() => {
    setFlash((prev) => !prev);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.5, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.5, 1));
  }, []);

  const handleCapture = useCallback(async () => {
    incrementTotalScans();
    // In produzione: cattura frame e forza classificazione
    if (!isScanning) {
      const result = generateMockDetections();
      setDetections(result.detections);
      if (result.detections.length > 0) {
        const best = result.detections.reduce((a, b) =>
          a.confidence > b.confidence ? a : b
        );
        handleSelectDetection(best);
      }
    }
  }, [isScanning, handleSelectDetection]);

  const handleSaveFinding = useCallback(async () => {
    if (!selectedDetection || !classification) return;

    try {
      const location = await getCurrentLocation();

      const speciesData = getSpeciesById(classification.speciesId);
      await saveFinding({
        speciesId: classification.speciesId,
        commonName: classification.commonName,
        scientificName: classification.scientificName,
        confidence: classification.confidence,
        latitude: location?.latitude ?? 46.17,
        longitude: location?.longitude ?? 9.87,
        altitude: location?.altitude,
        edibility: speciesData?.edibility ?? (classification.toxicityWarning ? 'tossico' : 'commestibile'),
      });

      // Reset dopo salvataggio
      setSelectedDetection(null);
      setClassification(null);
    } catch (error) {
      console.error('[CercaFungo] Errore salvataggio:', error);
    }
  }, [selectedDetection, classification]);

  const handleDismissDetection = useCallback(() => {
    setSelectedDetection(null);
    setClassification(null);
  }, []);

  const handleViewSpecies = useCallback(
    (speciesId: string) => {
      router.push(`/species/${speciesId}`);
    },
    [router]
  );

  const scanOpacity = scanPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.15],
  });

  return (
    <View style={styles.container}>
      {/* Camera */}
      <CameraView isActive={isScanning} zoom={zoom} flash={flash} />

      {/* Detection overlay */}
      <DetectionOverlay
        detections={detections}
        frameWidth={1920}
        frameHeight={1080}
      />

      {/* Scanning animation overlay */}
      {isScanning && (
        <RNAnimated.View
          style={[styles.scanOverlay, { opacity: scanOpacity }]}
          pointerEvents="none"
        />
      )}

      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>CercaFungo</Text>
          {isScanning && (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>
        {detections.length > 0 && (
          <Text style={styles.detectionCount}>
            {detections.length} rilevament{detections.length === 1 ? 'o' : 'i'}
          </Text>
        )}
      </SafeAreaView>

      {/* Controls */}
      <ScannerControls
        isScanning={isScanning}
        flash={flash}
        zoom={zoom}
        onToggleScan={handleToggleScan}
        onToggleFlash={handleToggleFlash}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onCapture={handleCapture}
      />

      {/* Bottom sheet: detection result o empty state */}
      {selectedDetection && classification ? (
        <View style={styles.bottomSheet}>
          <DetectionCard
            detection={selectedDetection}
            classification={classification}
            onSave={handleSaveFinding}
            onDismiss={handleDismissDetection}
            onViewSpecies={handleViewSpecies}
          />
        </View>
      ) : isScanning ? null : (
        <View style={styles.bottomSheet}>
          <EmptyDetectionCard />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.soil,
  },

  // Scan overlay
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.forest,
  },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(39, 174, 96, 0.3)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: colors.safe,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.safe,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.safe,
    letterSpacing: 1,
  },
  detectionCount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginTop: spacing.xs,
  },

  // Bottom sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
