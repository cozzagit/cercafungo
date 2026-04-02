/**
 * CercaFungo — Impostazioni app (MMKV)
 *
 * Storage veloce key-value per preferenze utente e statistiche.
 */

import { MMKV } from 'react-native-mmkv';
import { STORAGE_KEYS, MIN_CONFIDENCE_THRESHOLD } from '../constants';

export const storage = new MMKV({
  id: 'cercafungo-settings',
});

// === Onboarding ===

export function isOnboardingCompleted(): boolean {
  return storage.getBoolean(STORAGE_KEYS.ONBOARDING_COMPLETED) ?? false;
}

export function setOnboardingCompleted(value: boolean): void {
  storage.set(STORAGE_KEYS.ONBOARDING_COMPLETED, value);
}

// === Haptic ===

export function isHapticEnabled(): boolean {
  return storage.getBoolean(STORAGE_KEYS.HAPTIC_ENABLED) ?? true;
}

export function setHapticEnabled(value: boolean): void {
  storage.set(STORAGE_KEYS.HAPTIC_ENABLED, value);
}

// === Sound ===

export function isSoundEnabled(): boolean {
  return storage.getBoolean(STORAGE_KEYS.SOUND_ENABLED) ?? true;
}

export function setSoundEnabled(value: boolean): void {
  storage.set(STORAGE_KEYS.SOUND_ENABLED, value);
}

// === Soglia Confidenza ===

export function getConfidenceThreshold(): number {
  return (
    storage.getNumber(STORAGE_KEYS.CONFIDENCE_THRESHOLD) ??
    MIN_CONFIDENCE_THRESHOLD
  );
}

export function setConfidenceThreshold(value: number): void {
  storage.set(STORAGE_KEYS.CONFIDENCE_THRESHOLD, Math.max(0, Math.min(1, value)));
}

// === Auto-save ===

export function isAutoSaveEnabled(): boolean {
  return storage.getBoolean(STORAGE_KEYS.AUTO_SAVE_FINDINGS) ?? true;
}

export function setAutoSaveEnabled(value: boolean): void {
  storage.set(STORAGE_KEYS.AUTO_SAVE_FINDINGS, value);
}

// === GPS Tracking ===

export function isGpsTrackingEnabled(): boolean {
  return storage.getBoolean(STORAGE_KEYS.GPS_TRACKING) ?? true;
}

export function setGpsTrackingEnabled(value: boolean): void {
  storage.set(STORAGE_KEYS.GPS_TRACKING, value);
}

// === Statistiche Sessione ===

export function getTotalScans(): number {
  return storage.getNumber(STORAGE_KEYS.TOTAL_SCANS) ?? 0;
}

export function incrementTotalScans(): void {
  storage.set(STORAGE_KEYS.TOTAL_SCANS, getTotalScans() + 1);
}

export function getTotalDistanceKm(): number {
  return storage.getNumber(STORAGE_KEYS.TOTAL_DISTANCE_KM) ?? 0;
}

export function addDistance(km: number): void {
  storage.set(STORAGE_KEYS.TOTAL_DISTANCE_KM, getTotalDistanceKm() + km);
}

// === Reset ===

export function resetAllSettings(): void {
  storage.clearAll();
}
