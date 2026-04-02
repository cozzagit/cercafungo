/**
 * CercaFungo — Scheda dettaglio specie
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows, typography } from '@/components/ui/theme';
import { Card } from '@/components/ui/Card';
import { Badge, edibilityToBadgeVariant, edibilityLabel } from '@/components/ui/Badge';
import {
  getSpeciesById,
  getConfusionSpecies,
  getSeasonLabel,
} from '@/lib/species/database';
import type { MushroomSpecies } from '@/lib/species/data';

export default function SpeciesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const species = useMemo(() => getSpeciesById(id), [id]);
  const confusionSpecies = useMemo(
    () => (species ? getConfusionSpecies(species.id) : []),
    [species]
  );

  if (!species) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>🔍</Text>
        <Text style={styles.errorTitle}>Specie non trovata</Text>
        <Text style={styles.errorText}>
          La specie richiesta non e presente nel database.
        </Text>
      </View>
    );
  }

  const isToxic =
    species.edibility === 'tossico' || species.edibility === 'mortale';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero section */}
      <View style={[styles.hero, { backgroundColor: isToxic ? '#2C0B0E' : colors.forestDark }]}>
        <Text style={styles.heroIcon}>
          {isToxic ? '☠️' : species.edibility === 'non_commestibile' ? '🚫' : '🍄'}
        </Text>
        <Text style={styles.heroName}>{species.italianName}</Text>
        <Text style={styles.heroScientific}>{species.scientificName}</Text>
        <Text style={styles.heroFamily}>{species.family}</Text>
        <View style={styles.heroBadge}>
          <Badge
            label={edibilityLabel(species.edibility)}
            variant={edibilityToBadgeVariant(species.edibility)}
            size="md"
          />
        </View>
      </View>

      {/* Avviso tossicita */}
      {isToxic && (
        <View style={styles.toxicWarning}>
          <Ionicons name="warning" size={22} color={colors.danger} />
          <View style={styles.toxicWarningContent}>
            <Text style={styles.toxicWarningTitle}>
              {species.edibility === 'mortale'
                ? 'FUNGO MORTALE'
                : 'FUNGO TOSSICO'}
            </Text>
            <Text style={styles.toxicWarningText}>
              {species.edibility === 'mortale'
                ? 'Questo fungo puo causare la morte. Non raccogliere, non toccare, non consumare in nessun caso.'
                : 'Questo fungo provoca avvelenamento. Non raccogliere e non consumare.'}
            </Text>
          </View>
        </View>
      )}

      {/* Descrizione */}
      <View style={styles.section}>
        <SectionTitle icon="document-text" title="Descrizione" />
        <Card variant="elevated" padding="lg">
          <Text style={styles.description}>{species.edibilityNote}</Text>
        </Card>
      </View>

      {/* Caratteristiche */}
      <View style={styles.section}>
        <SectionTitle icon="leaf" title="Caratteristiche" />
        <Card variant="elevated" padding="lg">
          <CharacteristicRow label="Cappello" value={species.capDescription} />
          <View style={styles.divider} />
          <CharacteristicRow label="Gambo" value={species.stemDescription} />
          <View style={styles.divider} />
          <CharacteristicRow label="Carne" value={species.fleshDescription} />
          <View style={styles.divider} />
          <CharacteristicRow label="Sporata" value={species.sporeColor} />
        </Card>
      </View>

      {/* Habitat e stagione */}
      <View style={styles.section}>
        <SectionTitle icon="earth" title="Dove e quando" />
        <Card variant="elevated" padding="lg">
          <Text style={styles.infoLabel}>HABITAT</Text>
          <View style={styles.tagRow}>
            {species.habitat.map((h) => (
              <Badge key={h} label={h} variant="info" size="sm" />
            ))}
          </View>

          <Text style={[styles.infoLabel, { marginTop: spacing.lg }]}>
            STAGIONE
          </Text>
          <View style={styles.tagRow}>
            <Badge
              label={`${getSeasonLabel(species.season.start)} - ${getSeasonLabel(species.season.end)}`}
              variant="neutral"
              size="sm"
            />
            <Badge
              label={`Picco: ${getSeasonLabel(species.season.peak)}`}
              variant="info"
              size="sm"
            />
          </View>

          <Text style={[styles.infoLabel, { marginTop: spacing.lg }]}>
            ALTITUDINE
          </Text>
          <Text style={styles.altitudeText}>
            {species.altitude[0]} - {species.altitude[1]} m s.l.m.
          </Text>
        </Card>
      </View>

      {/* Specie simili (confusione) */}
      {confusionSpecies.length > 0 && (
        <View style={styles.section}>
          <SectionTitle icon="swap-horizontal" title="Attenzione: specie simili" />
          {confusionSpecies.map((cs) => (
            <TouchableOpacity
              key={cs.id}
              style={styles.confusionCard}
              onPress={() => router.push(`/species/${cs.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.confusionLeft}>
                <Text style={styles.confusionIcon}>
                  {cs.edibility === 'tossico' || cs.edibility === 'mortale'
                    ? '⚠️'
                    : '🍄'}
                </Text>
                <View>
                  <Text style={styles.confusionName}>{cs.italianName}</Text>
                  <Text style={styles.confusionScientific}>
                    {cs.scientificName}
                  </Text>
                </View>
              </View>
              <Badge
                label={edibilityLabel(cs.edibility)}
                variant={edibilityToBadgeVariant(cs.edibility)}
                size="sm"
              />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Note */}
      <View style={styles.section}>
        <SectionTitle icon="bulb" title="Note del cercatore" />
        <Card
          variant="filled"
          padding="lg"
          style={{ backgroundColor: colors.porcinoLight + '20' }}
        >
          <Text style={styles.notes}>{species.funFact}</Text>
        </Card>
      </View>

      {/* Spacer fondo */}
      <View style={{ height: spacing['4xl'] }} />
    </ScrollView>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={18} color={colors.forest} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function CharacteristicRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.charRow}>
      <Text style={styles.charLabel}>{label}</Text>
      <Text style={styles.charValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scrollContent: {
    paddingBottom: spacing['6xl'],
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
  },
  heroIcon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  heroName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
  },
  heroScientific: {
    fontSize: 16,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.6)',
    marginTop: spacing.xs,
  },
  heroFamily: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginTop: spacing.xxs,
  },
  heroBadge: {
    marginTop: spacing.lg,
  },

  // Toxic warning
  toxicWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.dangerBg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.danger,
  },
  toxicWarningContent: {
    flex: 1,
  },
  toxicWarningTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.danger,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  toxicWarningText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.danger,
  },

  // Sections
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.forest,
  },

  // Description
  description: {
    ...typography.body,
    lineHeight: 24,
  },

  // Characteristics
  charRow: {
    paddingVertical: spacing.sm,
  },
  charLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  charValue: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.primary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.light,
  },

  // Info
  infoLabel: {
    ...typography.label,
    fontSize: 11,
    marginBottom: spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  altitudeText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.forest,
  },

  // Confusion species
  confusionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  confusionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  confusionIcon: {
    fontSize: 24,
  },
  confusionName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  confusionScientific: {
    fontSize: 11,
    fontStyle: 'italic',
    color: colors.text.tertiary,
  },

  // Notes
  notes: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.bark,
    fontWeight: '500',
  },

  // Error
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['4xl'],
    backgroundColor: colors.cream,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  errorTitle: {
    ...typography.heading,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
});
