/**
 * CercaFungo — Marker personalizzato per i ritrovamenti sulla mappa
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../ui/theme';
import type { Finding } from '@/lib/storage/findings';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface FindingMarkerProps {
  finding: Finding;
  onPress: () => void;
}

export function FindingMarker({ finding, onPress }: FindingMarkerProps) {
  const markerColor = getMarkerColor(finding.edibility);
  const dateStr = format(new Date(finding.createdAt), 'd MMM yyyy, HH:mm', {
    locale: it,
  });

  return (
    <Marker
      coordinate={{
        latitude: finding.latitude,
        longitude: finding.longitude,
      }}
      onCalloutPress={onPress}
    >
      {/* Marker personalizzato */}
      <View style={styles.markerContainer}>
        <View style={[styles.marker, { backgroundColor: markerColor }]}>
          <Ionicons name="leaf" size={14} color={colors.white} />
        </View>
        <View style={[styles.markerTail, { borderTopColor: markerColor }]} />
      </View>

      {/* Callout (info bubble al tap) */}
      <Callout tooltip style={styles.calloutContainer}>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle} numberOfLines={1}>
            {finding.commonName}
          </Text>
          <Text style={styles.calloutScientific} numberOfLines={1}>
            {finding.scientificName}
          </Text>
          <View style={styles.calloutRow}>
            <View
              style={[styles.calloutDot, { backgroundColor: markerColor }]}
            />
            <Text style={styles.calloutConfidence}>
              {Math.round(finding.confidence * 100)}% confidenza
            </Text>
          </View>
          <Text style={styles.calloutDate}>{dateStr}</Text>
          <Text style={styles.calloutHint}>Tocca per dettagli</Text>
        </View>
      </Callout>
    </Marker>
  );
}

function getMarkerColor(edibility: string): string {
  switch (edibility) {
    case 'ottimo':
    case 'buono':
    case 'commestibile':
      return colors.safe;
    case 'tossico':
    case 'mortale':
      return colors.danger;
    case 'non_commestibile':
      return colors.warning;
    default:
      return colors.porcino;
  }
}

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    ...shadows.md,
  },
  markerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },

  // Callout
  calloutContainer: {
    width: 220,
  },
  callout: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.lg,
  },
  calloutTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xxs,
  },
  calloutScientific: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  calloutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  calloutDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  calloutConfidence: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  calloutDate: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  calloutHint: {
    fontSize: 11,
    color: colors.porcino,
    fontWeight: '600',
  },
});
