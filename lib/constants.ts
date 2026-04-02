/**
 * CercaFungo — Costanti globali
 */

/** Distanza massima rilevamento funghi (in metri) */
export const MAX_DETECTION_DISTANCE_M = 5;

/** Distanza minima rilevamento funghi (in metri) */
export const MIN_DETECTION_DISTANCE_M = 2;

/** Soglia minima di confidenza per mostrare un rilevamento (0-1) */
export const MIN_CONFIDENCE_THRESHOLD = 0.3;

/** Soglia confidenza alta */
export const HIGH_CONFIDENCE_THRESHOLD = 0.75;

/** Soglia confidenza media */
export const MEDIUM_CONFIDENCE_THRESHOLD = 0.5;

/** FPS target per il frame processor */
export const TARGET_FPS = 15;

/** Intervallo salvataggio posizione GPS durante scansione (ms) */
export const GPS_TRACKING_INTERVAL_MS = 5000;

/** Precisione GPS minima accettabile (metri) */
export const MIN_GPS_ACCURACY_M = 20;

/** Numero massimo di rilevamenti recenti da mostrare */
export const MAX_RECENT_DETECTIONS = 50;

/** Categorie di commestibilita */
export const EDIBILITY = {
  EXCELLENT: 'ottimo',
  GOOD: 'buono',
  EDIBLE: 'commestibile',
  INEDIBLE: 'non_commestibile',
  TOXIC: 'tossico',
  DEADLY: 'mortale',
} as const;

export type Edibility = (typeof EDIBILITY)[keyof typeof EDIBILITY];

/** Stagioni di raccolta */
export const SEASONS = {
  SPRING: 'primavera',
  SUMMER: 'estate',
  AUTUMN: 'autunno',
  WINTER: 'inverno',
} as const;

export type Season = (typeof SEASONS)[keyof typeof SEASONS];

/** Habitat comuni */
export const HABITATS = {
  CONIFEROUS: 'bosco_conifere',
  DECIDUOUS: 'bosco_latifoglie',
  MIXED: 'bosco_misto',
  MEADOW: 'prato',
  ALPINE: 'alpino',
} as const;

export type Habitat = (typeof HABITATS)[keyof typeof HABITATS];

/** Nomi tab per navigazione */
export const TAB_NAMES = {
  scanner: 'Scanner',
  map: 'Mappa',
  guide: 'Guida',
  profile: 'Profilo',
} as const;

/** Chiavi MMKV storage */
export const STORAGE_KEYS = {
  ONBOARDING_COMPLETED: 'onboarding_completed',
  HAPTIC_ENABLED: 'haptic_enabled',
  SOUND_ENABLED: 'sound_enabled',
  CONFIDENCE_THRESHOLD: 'confidence_threshold',
  AUTO_SAVE_FINDINGS: 'auto_save_findings',
  GPS_TRACKING: 'gps_tracking',
  TOTAL_SCANS: 'total_scans',
  TOTAL_DISTANCE_KM: 'total_distance_km',
} as const;

/** URL modello ML (placeholder) */
export const ML_MODEL_URL = 'https://models.cercafungo.app/v1/mushroom-detector.tflite';

/** Versione corrente del database SQLite */
export const DB_VERSION = 1;

/** Nome database SQLite */
export const DB_NAME = 'cercafungo.db';
