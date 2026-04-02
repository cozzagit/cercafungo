/**
 * CercaFungo — Dettaglio singolo ritrovamento
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows, typography } from '@/components/ui/theme';
import { Card } from '@/components/ui/Card';
import { Badge, edibilityToBadgeVariant, edibilityLabel } from '@/components/ui/Badge';
import { ConfidenceBar } from '@/components/ui/ConfidenceBar';
import { Button } from '@/components/ui/Button';
import {
  getFindingById,
  updateFindingNotes,
  deleteFinding,
  type Finding,
} from '@/lib/storage/findings';
import { getSpeciesById } from '@/lib/species/database';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function FindingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [finding, setFinding] = useState<Finding | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);

  useEffect(() => {
    loadFinding();
  }, [id]);

  const loadFinding = async () => {
    try {
      const data = await getFindingById(id);
      setFinding(data);
      setNotes(data?.notes ?? '');
    } catch (error) {
      console.error('[CercaFungo] Errore caricamento ritrovamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = useCallback(async () => {
    if (!finding) return;
    try {
      await updateFindingNotes(finding.id, notes);
      setEditingNotes(false);
    } catch (error) {
      console.error('[CercaFungo] Errore salvataggio note:', error);
    }
  }, [finding, notes]);

  const handleDelete = useCallback(() => {
    if (!finding) return;

    Alert.alert(
      'Elimina ritrovamento',
      'Sei sicuro di voler eliminare questo ritrovamento? L\'azione non e reversibile.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFinding(finding.id);
              router.back();
            } catch (error) {
              console.error(
                '[CercaFungo] Errore eliminazione:',
                error
              );
            }
          },
        },
      ]
    );
  }, [finding, router]);

  const handleViewSpecies = useCallback(() => {
    if (!finding) return;
    router.push(`/species/${finding.speciesId}`);
  }, [finding, router]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Caricamento...</Text>
      </View>
    );
  }

  if (!finding) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>🔍</Text>
        <Text style={styles.errorTitle}>Ritrovamento non trovato</Text>
      </View>
    );
  }

  const species = getSpeciesById(finding.speciesId);
  const dateStr = format(new Date(finding.createdAt), "EEEE d MMMM yyyy, HH:mm", {
    locale: it,
  });
  const isToxic =
    finding.edibility === 'tossico' || finding.edibility === 'mortale';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isToxic ? colors.danger : colors.forest }]}>
        <Text style={styles.headerIcon}>{isToxic ? '☠️' : '🍄'}</Text>
        <Text style={styles.headerName}>{finding.commonName}</Text>
        <Text style={styles.headerScientific}>
          {finding.scientificName}
        </Text>
        <Badge
          label={edibilityLabel(finding.edibility as any)}
          variant={edibilityToBadgeVariant(finding.edibility as any)}
          size="md"
          style={{ marginTop: spacing.md }}
        />
      </View>

      {/* Confidenza */}
      <View style={styles.section}>
        <Card variant="elevated" padding="lg">
          <Text style={styles.cardTitle}>Confidenza rilevamento</Text>
          <ConfidenceBar confidence={finding.confidence} size="lg" />
        </Card>
      </View>

      {/* Posizione */}
      <View style={styles.section}>
        <Card variant="elevated" padding="lg">
          <Text style={styles.cardTitle}>Posizione</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={18} color={colors.porcino} />
            <Text style={styles.locationText}>
              {finding.latitude.toFixed(5)}, {finding.longitude.toFixed(5)}
            </Text>
          </View>
          {finding.altitude !== null && (
            <View style={styles.locationRow}>
              <Ionicons name="trending-up" size={18} color={colors.porcino} />
              <Text style={styles.locationText}>
                {Math.round(finding.altitude)} m s.l.m.
              </Text>
            </View>
          )}
          <View style={styles.locationRow}>
            <Ionicons name="calendar" size={18} color={colors.porcino} />
            <Text style={styles.locationText}>{dateStr}</Text>
          </View>
        </Card>
      </View>

      {/* Note */}
      <View style={styles.section}>
        <Card variant="elevated" padding="lg">
          <View style={styles.noteHeader}>
            <Text style={styles.cardTitle}>Note personali</Text>
            {!editingNotes && (
              <TouchableOpacity onPress={() => setEditingNotes(true)}>
                <Ionicons name="pencil" size={18} color={colors.porcino} />
              </TouchableOpacity>
            )}
          </View>
          {editingNotes ? (
            <View style={styles.noteEditor}>
              <TextInput
                style={styles.noteInput}
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="Aggiungi note su questo ritrovamento..."
                placeholderTextColor={colors.text.tertiary}
                textAlignVertical="top"
              />
              <View style={styles.noteActions}>
                <Button
                  title="Annulla"
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    setNotes(finding.notes ?? '');
                    setEditingNotes(false);
                  }}
                />
                <Button
                  title="Salva"
                  variant="primary"
                  size="sm"
                  onPress={handleSaveNotes}
                />
              </View>
            </View>
          ) : (
            <Text style={styles.noteText}>
              {finding.notes || 'Nessuna nota. Tocca la matita per aggiungere.'}
            </Text>
          )}
        </Card>
      </View>

      {/* Azioni */}
      <View style={styles.section}>
        <Button
          title="Vedi scheda specie"
          variant="outline"
          fullWidth
          icon={<Ionicons name="book-outline" size={18} color={colors.forest} />}
          onPress={handleViewSpecies}
        />
        <View style={{ height: spacing.md }} />
        <Button
          title="Elimina ritrovamento"
          variant="ghost"
          fullWidth
          icon={<Ionicons name="trash-outline" size={18} color={colors.danger} />}
          textStyle={{ color: colors.danger }}
          onPress={handleDelete}
        />
      </View>
    </ScrollView>
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

  // Header
  header: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  headerName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
  },
  headerScientific: {
    fontSize: 14,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.6)',
    marginTop: spacing.xs,
  },

  // Section
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  cardTitle: {
    ...typography.label,
    fontSize: 11,
    marginBottom: spacing.md,
  },

  // Location
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  locationText: {
    fontSize: 14,
    color: colors.text.primary,
  },

  // Notes
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.secondary,
  },
  noteEditor: {
    gap: spacing.md,
  },
  noteInput: {
    backgroundColor: colors.cream,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.primary,
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  noteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },

  // Loading / Error
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.tertiary,
  },
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
  },
});
