/**
 * CercaFungo — Card rilevamento nel bottom sheet dello scanner
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows, typography } from '../ui/theme';
import { Badge, edibilityToBadgeVariant, edibilityLabel } from '../ui/Badge';
import { ConfidenceBar, ConfidenceDot } from '../ui/ConfidenceBar';
import type { Detection } from '@/lib/ml/types';
import type { ClassificationResult } from '@/lib/ml/types';

interface DetectionCardProps {
  detection: Detection;
  classification: ClassificationResult | null;
  onSave: () => void;
  onDismiss: () => void;
  onViewSpecies: (speciesId: string) => void;
}

export function DetectionCard({
  detection,
  classification,
  onSave,
  onDismiss,
  onViewSpecies,
}: DetectionCardProps) {
  return (
    <View style={styles.container}>
      {/* Handle */}
      <View style={styles.handleBar} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>
            {classification?.commonName ?? detection.label}
          </Text>
          {classification && (
            <Text style={styles.scientificName}>
              {classification.scientificName}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={onDismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={20} color={colors.text.tertiary} />
        </TouchableOpacity>
      </View>

      {/* Confidenza */}
      <View style={styles.confidenceSection}>
        <ConfidenceBar
          confidence={classification?.confidence ?? detection.confidence}
          size="md"
        />
      </View>

      {/* Badge commestibilita */}
      {classification && (
        <View style={styles.badgeRow}>
          <Badge
            label={edibilityLabel(
              classification.toxicityWarning ? 'tossico' : 'commestibile'
            )}
            variant={
              classification.toxicityWarning
                ? 'toxic'
                : edibilityToBadgeVariant('commestibile')
            }
          />
        </View>
      )}

      {/* Avviso tossicita */}
      {classification?.toxicityWarning && (
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={18} color={colors.danger} />
          <Text style={styles.warningText}>
            Attenzione! Questa specie potrebbe essere tossica o mortale.
            Non raccogliere e non consumare senza verifica di un esperto micologo.
          </Text>
        </View>
      )}

      {/* Alternative */}
      {classification && classification.alternatives.length > 0 && (
        <View style={styles.alternativesSection}>
          <Text style={styles.sectionLabel}>POTREBBE ANCHE ESSERE</Text>
          {classification.alternatives.map((alt, index) => (
            <TouchableOpacity
              key={alt.speciesId}
              style={styles.alternativeRow}
              onPress={() => onViewSpecies(alt.speciesId)}
              activeOpacity={0.7}
            >
              <Text style={styles.alternativeName}>{alt.commonName}</Text>
              <ConfidenceDot confidence={alt.confidence} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Azioni */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={onSave}
          activeOpacity={0.7}
        >
          <Ionicons name="bookmark" size={18} color={colors.white} />
          <Text style={styles.saveButtonText}>Salva ritrovamento</Text>
        </TouchableOpacity>
        {classification && (
          <TouchableOpacity
            style={styles.detailButton}
            onPress={() => onViewSpecies(classification.speciesId)}
            activeOpacity={0.7}
          >
            <Ionicons name="book" size={18} color={colors.forest} />
            <Text style={styles.detailButtonText}>Scheda specie</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/**
 * Stato vuoto: nessun rilevamento.
 */
export function EmptyDetectionCard() {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.handleBar} />
      <View style={styles.emptyContent}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="search" size={28} color={colors.mossMuted} />
        </View>
        <Text style={styles.emptyTitle}>Nessun fungo rilevato</Text>
        <Text style={styles.emptySubtitle}>
          Punta la fotocamera verso il sottobosco a 2-5 metri di distanza
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing.xl,
    paddingBottom: spacing['3xl'],
    ...shadows.xl,
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: colors.border.light,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    ...typography.subtitle,
    color: colors.text.primary,
  },
  scientificName: {
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.text.tertiary,
    marginTop: spacing.xxs,
  },
  dismissButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Confidence
  confidenceSection: {
    marginBottom: spacing.md,
  },

  // Badge
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  // Warning
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.dangerBg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    marginBottom: spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.danger,
    fontWeight: '500',
  },

  // Alternatives
  alternativesSection: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  alternativeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  alternativeName: {
    fontSize: 14,
    color: colors.text.secondary,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.forest,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  detailButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cream,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  detailButtonText: {
    color: colors.forest,
    fontSize: 14,
    fontWeight: '600',
  },

  // Empty state
  emptyContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing.xl,
    paddingBottom: spacing['3xl'],
    ...shadows.xl,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.heading,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    textAlign: 'center',
    maxWidth: 260,
  },
});
