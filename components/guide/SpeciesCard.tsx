/**
 * CercaFungo — Card per la lista specie nella guida
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows, typography } from '../ui/theme';
import { Badge, edibilityToBadgeVariant, edibilityLabel } from '../ui/Badge';
import type { MushroomSpecies } from '@/lib/species/data';
import { getSeasonLabel } from '@/lib/species/database';

interface SpeciesCardProps {
  species: MushroomSpecies;
  onPress: () => void;
}

export function SpeciesCard({ species, onPress }: SpeciesCardProps) {
  const icon = getSpeciesIcon(species.edibility);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Icona/immagine placeholder */}
      <View style={[styles.imageContainer, { backgroundColor: getIconBg(species.edibility) }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      {/* Info */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.commonName} numberOfLines={1}>
            {species.italianName}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
        </View>

        <Text style={styles.scientificName} numberOfLines={1}>
          {species.scientificName}
        </Text>

        <View style={styles.metaRow}>
          <Badge
            label={edibilityLabel(species.edibility)}
            variant={edibilityToBadgeVariant(species.edibility)}
            size="sm"
          />
          <View style={styles.seasons}>
            <Text style={styles.seasonText}>
              {getSeasonLabel(species.season.start)} - {getSeasonLabel(species.season.end)}
            </Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {species.capDescription}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function getSpeciesIcon(edibility: string): string {
  switch (edibility) {
    case 'ottimo':
    case 'buono':
    case 'commestibile':
      return '🍄';
    case 'tossico':
      return '☠️';
    case 'mortale':
      return '💀';
    case 'non_commestibile':
      return '🚫';
    default:
      return '🍄';
  }
}

function getIconBg(edibility: string): string {
  switch (edibility) {
    case 'ottimo':
    case 'buono':
    case 'commestibile':
      return colors.safeBg;
    case 'tossico':
    case 'mortale':
      return colors.dangerBg;
    case 'non_commestibile':
      return colors.warningBg;
    default:
      return colors.creamDark;
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },

  // Image
  imageContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 28,
  },

  // Content
  content: {
    flex: 1,
    gap: spacing.xxs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commonName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
  },
  scientificName: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.text.tertiary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxs,
  },
  seasons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  seasonText: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text.secondary,
    marginTop: spacing.xxs,
  },
});
