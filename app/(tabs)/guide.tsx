/**
 * CercaFungo — Guida specie tab
 *
 * Enciclopedia ricercabile delle specie fungine con filtri
 * per commestibilita, stagione e habitat.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows, typography } from '@/components/ui/theme';
import { SpeciesCard } from '@/components/guide/SpeciesCard';
import { SpeciesFilter } from '@/components/guide/SpeciesFilter';
import { filterSpecies, getAllSpecies } from '@/lib/species/database';
import type { MushroomSpecies } from '@/lib/species/data';
import type { Edibility, Season } from '@/lib/constants';

export default function GuideScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEdibility, setSelectedEdibility] =
    useState<Edibility | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);

  // Mappa stagione a mese rappresentativo per il filtro
  const seasonToMonth = (season: Season | null): number | undefined => {
    if (!season) return undefined;
    switch (season) {
      case 'primavera': return 4;  // Aprile
      case 'estate': return 7;     // Luglio
      case 'autunno': return 10;   // Ottobre
      case 'inverno': return 1;    // Gennaio
      default: return undefined;
    }
  };

  const filteredSpecies = useMemo(() => {
    return filterSpecies({
      query: searchQuery,
      edibility: selectedEdibility ?? undefined,
      month: seasonToMonth(selectedSeason),
    });
  }, [searchQuery, selectedEdibility, selectedSeason]);

  const totalCount = getAllSpecies().length;

  const handleSpeciesPress = useCallback(
    (species: MushroomSpecies) => {
      router.push(`/species/${species.id}`);
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: MushroomSpecies }) => (
      <View style={styles.cardWrapper}>
        <SpeciesCard species={item} onPress={() => handleSpeciesPress(item)} />
      </View>
    ),
    [handleSpeciesPress]
  );

  const ListHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        {/* Filtri */}
        <SpeciesFilter
          selectedEdibility={selectedEdibility}
          selectedSeason={selectedSeason}
          onEdibilityChange={setSelectedEdibility}
          onSeasonChange={setSelectedSeason}
        />

        {/* Contatore risultati */}
        <View style={styles.resultCount}>
          <Text style={styles.resultCountText}>
            {filteredSpecies.length} specie
            {filteredSpecies.length < totalCount &&
              ` su ${totalCount}`}
          </Text>
        </View>
      </View>
    ),
    [selectedEdibility, selectedSeason, filteredSpecies.length, totalCount]
  );

  const ListEmpty = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyTitle}>Nessuna specie trovata</Text>
        <Text style={styles.emptySubtitle}>
          Prova a modificare i filtri o la ricerca
        </Text>
      </View>
    ),
    []
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Guida Funghi</Text>
          <Text style={styles.subtitle}>
            Enciclopedia delle specie della Valtellina
          </Text>
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons
              name="search"
              size={18}
              color={colors.text.tertiary}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Cerca per nome o famiglia..."
              placeholderTextColor={colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.text.tertiary}
                onPress={() => setSearchQuery('')}
              />
            )}
          </View>
        </View>

        {/* Lista specie */}
        <FlatList
          data={filteredSpecies}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          initialNumToRender={8}
          maxToRenderPerBatch={5}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  flex: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.forest,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: spacing.xxs,
  },

  // Search
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    padding: 0,
  },

  // List
  listContent: {
    paddingBottom: spacing['6xl'],
  },
  listHeader: {
    marginBottom: spacing.md,
  },
  cardWrapper: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  resultCount: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  resultCountText: {
    ...typography.caption,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing['6xl'],
    paddingHorizontal: spacing['3xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.heading,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
});
