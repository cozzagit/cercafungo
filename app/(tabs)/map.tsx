/**
 * CercaFungo — Mappa tab
 *
 * Mostra tutti i ritrovamenti salvati sulla mappa,
 * con filtri per commestibilita e range temporale.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows, typography } from '@/components/ui/theme';
import { FindingsMap } from '@/components/map/FindingsMap';
import { getAllFindings, type Finding } from '@/lib/storage/findings';

type TimeFilter = 'all' | 'today' | 'week' | 'month';
type EdibilityFilter = 'all' | 'commestibile' | 'tossico';

export default function MapScreen() {
  const router = useRouter();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [edibilityFilter, setEdibilityFilter] =
    useState<EdibilityFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  const loadFindings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllFindings(500);
      setFindings(data);
    } catch (error) {
      console.error('[CercaFungo] Errore caricamento ritrovamenti:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFindings();
  }, [loadFindings]);

  // Filtra i ritrovamenti
  const filteredFindings = findings.filter((f) => {
    // Filtro commestibilita
    if (
      edibilityFilter === 'commestibile' &&
      !['ottimo', 'buono', 'commestibile'].includes(f.edibility)
    )
      return false;
    if (
      edibilityFilter === 'tossico' &&
      f.edibility !== 'tossico' &&
      f.edibility !== 'mortale'
    )
      return false;

    // Filtro temporale
    if (timeFilter !== 'all') {
      const now = Date.now();
      const findingTime = new Date(f.createdAt).getTime();
      const diffMs = now - findingTime;
      const dayMs = 86400000;

      if (timeFilter === 'today' && diffMs > dayMs) return false;
      if (timeFilter === 'week' && diffMs > dayMs * 7) return false;
      if (timeFilter === 'month' && diffMs > dayMs * 30) return false;
    }

    return true;
  });

  const handleFindingPress = useCallback(
    (finding: Finding) => {
      router.push(`/finding/${finding.id}`);
    },
    [router]
  );

  return (
    <View style={styles.container}>
      {/* Mappa */}
      <FindingsMap
        findings={filteredFindings}
        onFindingPress={handleFindingPress}
      />

      {/* Header overlay */}
      <SafeAreaView edges={['top']} style={styles.headerOverlay}>
        <View style={styles.header}>
          <Text style={styles.title}>Mappa Ritrovamenti</Text>
          <TouchableOpacity
            style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
            onPress={() => setShowFilters(!showFilters)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="filter"
              size={18}
              color={showFilters ? colors.white : colors.forest}
            />
            <Text
              style={[
                styles.filterToggleText,
                showFilters && styles.filterToggleTextActive,
              ]}
            >
              Filtri
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pannello filtri */}
        {showFilters && (
          <View style={styles.filterPanel}>
            {/* Filtro tempo */}
            <Text style={styles.filterLabel}>PERIODO</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {(
                [
                  { key: 'all', label: 'Tutti' },
                  { key: 'today', label: 'Oggi' },
                  { key: 'week', label: 'Settimana' },
                  { key: 'month', label: 'Mese' },
                ] as const
              ).map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.filterChip,
                    timeFilter === key && styles.filterChipActive,
                  ]}
                  onPress={() => setTimeFilter(key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      timeFilter === key && styles.filterChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Filtro tipo */}
            <Text style={[styles.filterLabel, { marginTop: spacing.sm }]}>
              TIPO
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {(
                [
                  { key: 'all', label: 'Tutti', icon: '🍄' },
                  { key: 'commestibile', label: 'Commestibili', icon: '✅' },
                  { key: 'tossico', label: 'Tossici', icon: '☠️' },
                ] as const
              ).map(({ key, label, icon }) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.filterChip,
                    edibilityFilter === key && styles.filterChipActive,
                  ]}
                  onPress={() => setEdibilityFilter(key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      edibilityFilter === key && styles.filterChipTextActive,
                    ]}
                  >
                    {icon} {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Contatore risultati */}
        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {filteredFindings.length} ritrovament
            {filteredFindings.length === 1 ? 'o' : 'i'}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.heading,
    color: colors.text.primary,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    ...shadows.sm,
  },
  filterToggleActive: {
    backgroundColor: colors.forest,
  },
  filterToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.forest,
  },
  filterToggleTextActive: {
    color: colors.white,
  },

  // Filter panel
  filterPanel: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.md,
  },
  filterLabel: {
    ...typography.label,
    fontSize: 11,
    marginBottom: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  filterChipActive: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  filterChipTextActive: {
    color: colors.white,
  },

  // Count badge
  countBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    marginLeft: spacing.lg,
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
});
