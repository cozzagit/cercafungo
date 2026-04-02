/**
 * CercaFungo — Profilo tab
 *
 * Statistiche di raccolta, impostazioni e info app.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows, typography } from '@/components/ui/theme';
import { Card } from '@/components/ui/Card';
import { getStats } from '@/lib/storage/findings';
import {
  isHapticEnabled,
  setHapticEnabled,
  isSoundEnabled,
  setSoundEnabled,
  isAutoSaveEnabled,
  setAutoSaveEnabled,
  isGpsTrackingEnabled,
  setGpsTrackingEnabled,
  getConfidenceThreshold,
  setConfidenceThreshold,
  getTotalScans,
  getTotalDistanceKm,
} from '@/lib/storage/settings';

interface StatCardData {
  icon: string;
  label: string;
  value: string;
  color: string;
}

export default function ProfileScreen() {
  const [stats, setStats] = useState({
    totalFindings: 0,
    uniqueSpecies: 0,
    edibleCount: 0,
    toxicCount: 0,
  });
  const [totalScans, setTotalScans] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);

  // Settings
  const [haptic, setHaptic] = useState(true);
  const [sound, setSound] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [gpsTracking, setGpsTracking] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const dbStats = await getStats();
      setStats(dbStats);
    } catch {
      // DB potrebbe non essere inizializzato al primo avvio
    }

    setTotalScans(getTotalScans());
    setDistanceKm(getTotalDistanceKm());
    setHaptic(isHapticEnabled());
    setSound(isSoundEnabled());
    setAutoSave(isAutoSaveEnabled());
    setGpsTracking(isGpsTrackingEnabled());
  };

  const statCards: StatCardData[] = [
    {
      icon: '🍄',
      label: 'Ritrovamenti',
      value: String(stats.totalFindings),
      color: colors.forest,
    },
    {
      icon: '📚',
      label: 'Specie trovate',
      value: String(stats.uniqueSpecies),
      color: colors.porcino,
    },
    {
      icon: '✅',
      label: 'Commestibili',
      value: String(stats.edibleCount),
      color: colors.safe,
    },
    {
      icon: '☠️',
      label: 'Tossici evitati',
      value: String(stats.toxicCount),
      color: colors.danger,
    },
  ];

  const handleToggleHaptic = (value: boolean) => {
    setHaptic(value);
    setHapticEnabled(value);
  };

  const handleToggleSound = (value: boolean) => {
    setSound(value);
    setSoundEnabled(value);
  };

  const handleToggleAutoSave = (value: boolean) => {
    setAutoSave(value);
    setAutoSaveEnabled(value);
  };

  const handleToggleGps = (value: boolean) => {
    setGpsTracking(value);
    setGpsTrackingEnabled(value);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header profilo */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>🍄</Text>
          </View>
          <Text style={styles.username}>Cercatore</Text>
          <Text style={styles.region}>Valtellina, Lombardia</Text>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {statCards.map((stat, index) => (
            <View key={index} style={styles.statCardWrapper}>
              <Card variant="elevated" padding="md">
                <Text style={styles.statIcon}>{stat.icon}</Text>
                <Text style={[styles.statValue, { color: stat.color }]}>
                  {stat.value}
                </Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </Card>
            </View>
          ))}
        </View>

        {/* Attivita */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attivita</Text>
          <Card variant="elevated" padding="lg">
            <View style={styles.activityRow}>
              <Ionicons name="scan-outline" size={20} color={colors.moss} />
              <Text style={styles.activityLabel}>Scansioni totali</Text>
              <Text style={styles.activityValue}>{totalScans}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.activityRow}>
              <Ionicons name="walk-outline" size={20} color={colors.moss} />
              <Text style={styles.activityLabel}>Distanza percorsa</Text>
              <Text style={styles.activityValue}>
                {distanceKm.toFixed(1)} km
              </Text>
            </View>
          </Card>
        </View>

        {/* Impostazioni */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Impostazioni</Text>
          <Card variant="elevated" padding="lg">
            <SettingRow
              icon="phone-portrait-outline"
              label="Feedback aptico"
              subtitle="Vibrazione al rilevamento"
              value={haptic}
              onToggle={handleToggleHaptic}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="volume-high-outline"
              label="Suoni"
              subtitle="Suono al rilevamento"
              value={sound}
              onToggle={handleToggleSound}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="bookmark-outline"
              label="Salvataggio automatico"
              subtitle="Salva ritrovamenti automaticamente"
              value={autoSave}
              onToggle={handleToggleAutoSave}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="navigate-outline"
              label="Tracciamento GPS"
              subtitle="Registra il percorso durante la cerca"
              value={gpsTracking}
              onToggle={handleToggleGps}
            />
          </Card>
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informazioni</Text>
          <Card variant="elevated" padding="lg">
            <TouchableOpacity style={styles.infoRow} activeOpacity={0.7}>
              <View style={styles.infoLeft}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={colors.moss}
                />
                <Text style={styles.infoLabel}>Info sull'app</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.text.tertiary}
              />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.infoRow} activeOpacity={0.7}>
              <View style={styles.infoLeft}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={colors.moss}
                />
                <Text style={styles.infoLabel}>Privacy</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.text.tertiary}
              />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.infoRow} activeOpacity={0.7}>
              <View style={styles.infoLeft}>
                <Ionicons
                  name="help-circle-outline"
                  size={20}
                  color={colors.moss}
                />
                <Text style={styles.infoLabel}>Aiuto e supporto</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.text.tertiary}
              />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="warning" size={16} color={colors.warning} />
          <Text style={styles.disclaimerText}>
            CercaFungo e uno strumento di supporto. Non sostituisce MAI il
            parere di un micologo esperto. Non consumare funghi senza
            verifica professionale.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>CercaFungo v1.0.0</Text>
          <Text style={styles.footerText}>
            Fatto con amore in Valtellina 🏔️
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({
  icon,
  label,
  subtitle,
  value,
  onToggle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  value: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={20} color={colors.moss} />
        <View style={styles.settingText}>
          <Text style={styles.settingLabel}>{label}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{
          false: colors.border.medium,
          true: colors.mossLight,
        }}
        thumbColor={value ? colors.forest : colors.creamDark}
      />
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

  // Profile header
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    backgroundColor: colors.forest,
    borderBottomLeftRadius: borderRadius['2xl'],
    borderBottomRightRadius: borderRadius['2xl'],
    ...shadows.lg,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarEmoji: {
    fontSize: 36,
  },
  username: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
  },
  region: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    marginTop: spacing.xxs,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    marginTop: -spacing['2xl'],
    gap: spacing.md,
  },
  statCardWrapper: {
    width: '47%',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.tertiary,
    marginTop: spacing.xxs,
  },

  // Section
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing['2xl'],
  },
  sectionTitle: {
    ...typography.label,
    color: colors.text.tertiary,
    marginBottom: spacing.md,
    paddingLeft: spacing.xs,
  },

  // Activity
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  activityLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
  },
  activityValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.forest,
  },

  // Settings
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  settingSubtitle: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 1,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoLabel: {
    fontSize: 15,
    color: colors.text.primary,
  },

  // Common
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.light,
    marginVertical: spacing.xs,
  },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing['3xl'],
    backgroundColor: colors.warningBg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.bark,
    fontWeight: '500',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    gap: spacing.xxs,
  },
  footerText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
});
