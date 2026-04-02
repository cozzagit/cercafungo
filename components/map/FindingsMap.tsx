/**
 * CercaFungo — Mappa ritrovamenti
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { colors, spacing, borderRadius, shadows, typography } from '../ui/theme';
import { FindingMarker } from './FindingMarker';
import type { Finding } from '@/lib/storage/findings';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Centro Valtellina (Sondrio)
const DEFAULT_REGION: Region = {
  latitude: 46.17,
  longitude: 9.87,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

interface FindingsMapProps {
  findings: Finding[];
  onFindingPress: (finding: Finding) => void;
  initialRegion?: Region;
}

export function FindingsMap({
  findings,
  onFindingPress,
  initialRegion = DEFAULT_REGION,
}: FindingsMapProps) {
  const region = useMemo(() => {
    if (findings.length === 0) return initialRegion;

    // Centra la mappa sui ritrovamenti
    const lats = findings.map((f) => f.latitude);
    const lons = findings.map((f) => f.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.02),
      longitudeDelta: Math.max((maxLon - minLon) * 1.5, 0.02),
    };
  }, [findings, initialRegion]);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton
        showsCompass
        mapType="terrain"
        customMapStyle={MAP_STYLE}
      >
        {findings.map((finding) => (
          <FindingMarker
            key={finding.id}
            finding={finding}
            onPress={() => onFindingPress(finding)}
          />
        ))}
      </MapView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.safe }]} />
          <Text style={styles.legendText}>Commestibile</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
          <Text style={styles.legendText}>Attenzione</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
          <Text style={styles.legendText}>Tossico</Text>
        </View>
      </View>

      {/* Empty state */}
      {findings.length === 0 && (
        <View style={styles.emptyOverlay}>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🗺️</Text>
            <Text style={styles.emptyTitle}>Nessun ritrovamento</Text>
            <Text style={styles.emptySubtitle}>
              I tuoi ritrovamenti appariranno qui sulla mappa.
              Inizia a scansionare il sottobosco!
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// Stile mappa personalizzato (toni naturali)
const MAP_STYLE = [
  {
    featureType: 'landscape.natural',
    elementType: 'geometry.fill',
    stylers: [{ color: '#E8E0D2' }],
  },
  {
    featureType: 'landscape.natural.terrain',
    elementType: 'geometry.fill',
    stylers: [{ color: '#D5CDB8' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry.fill',
    stylers: [{ color: '#C8DEB0' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry.fill',
    stylers: [{ color: '#A8C8E0' }],
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },

  // Legend
  legend: {
    position: 'absolute',
    bottom: spacing['3xl'],
    left: spacing.lg,
    flexDirection: 'row',
    gap: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    ...shadows.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.text.secondary,
  },

  // Empty
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['4xl'],
  },
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: spacing['2xl'],
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    ...shadows.lg,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.heading,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
});
