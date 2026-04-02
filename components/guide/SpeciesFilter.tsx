/**
 * CercaFungo — Filtri per la guida specie
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { colors, spacing, borderRadius } from '../ui/theme';
import { EDIBILITY, SEASONS, type Edibility, type Season } from '@/lib/constants';
import { EDIBILITY_LABELS, SEASON_LABELS } from '@/lib/species/database';

interface SpeciesFilterProps {
  selectedEdibility: Edibility | null;
  selectedSeason: Season | null;
  onEdibilityChange: (value: Edibility | null) => void;
  onSeasonChange: (value: Season | null) => void;
}

export function SpeciesFilter({
  selectedEdibility,
  selectedSeason,
  onEdibilityChange,
  onSeasonChange,
}: SpeciesFilterProps) {
  return (
    <View style={styles.container}>
      {/* Commestibilita */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        <FilterChip
          label="Tutti"
          isSelected={selectedEdibility === null}
          onPress={() => onEdibilityChange(null)}
          color={colors.forest}
        />
        {Object.entries(EDIBILITY).map(([key, value]) => (
          <FilterChip
            key={key}
            label={EDIBILITY_LABELS[value]}
            isSelected={selectedEdibility === value}
            onPress={() =>
              onEdibilityChange(
                selectedEdibility === value ? null : value
              )
            }
            color={getEdibilityColor(value)}
          />
        ))}
      </ScrollView>

      {/* Stagioni */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {Object.entries(SEASONS).map(([key, value]) => (
          <FilterChip
            key={key}
            label={`${getSeasonIcon(value)} ${SEASON_LABELS[value]}`}
            isSelected={selectedSeason === value}
            onPress={() =>
              onSeasonChange(
                selectedSeason === value ? null : value
              )
            }
            color={colors.porcino}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function FilterChip({
  label,
  isSelected,
  onPress,
  color,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  color: string;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        isSelected
          ? { backgroundColor: color, borderColor: color }
          : { backgroundColor: colors.white, borderColor: colors.border.medium },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.chipText,
          { color: isSelected ? colors.white : colors.text.secondary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function getEdibilityColor(edibility: Edibility): string {
  switch (edibility) {
    case 'ottimo':
      return '#27AE60';
    case 'buono':
      return '#2ECC71';
    case 'commestibile':
      return colors.safe;
    case 'tossico':
      return colors.danger;
    case 'mortale':
      return '#8B0000';
    case 'non_commestibile':
      return colors.bark;
    default:
      return colors.forest;
  }
}

function getSeasonIcon(season: Season): string {
  switch (season) {
    case 'primavera':
      return '🌱';
    case 'estate':
      return '☀️';
    case 'autunno':
      return '🍂';
    case 'inverno':
      return '❄️';
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
