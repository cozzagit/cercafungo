/**
 * CercaFungo — Tipi per il sistema ML di rilevamento funghi
 */

/** Bounding box normalizzata (0-1) relativa al frame */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Risultato singolo rilevamento dal modello YOLO */
export interface Detection {
  /** ID univoco del rilevamento */
  id: string;
  /** Classe rilevata (es. "fungo", "porcino", "amanita") */
  label: string;
  /** Confidenza 0-1 */
  confidence: number;
  /** Bounding box normalizzata */
  boundingBox: BoundingBox;
  /** Timestamp rilevamento */
  timestamp: number;
}

/** Risultato classificazione dettagliata (stage 2) */
export interface ClassificationResult {
  /** ID specie dal database */
  speciesId: string;
  /** Nome comune italiano */
  commonName: string;
  /** Nome scientifico */
  scientificName: string;
  /** Confidenza classificazione 0-1 */
  confidence: number;
  /** Top-3 specie candidate */
  alternatives: Array<{
    speciesId: string;
    commonName: string;
    confidence: number;
  }>;
  /** Avviso tossicita */
  toxicityWarning: boolean;
}

/** Risultato completo di un frame processato */
export interface FrameResult {
  /** Lista rilevamenti nel frame */
  detections: Detection[];
  /** Tempo di inferenza in ms */
  inferenceTimeMs: number;
  /** Dimensioni frame originale */
  frameSize: {
    width: number;
    height: number;
  };
}

/** Stato del modello ML */
export type ModelStatus =
  | 'not_loaded'
  | 'downloading'
  | 'loading'
  | 'ready'
  | 'error';

/** Configurazione del detector */
export interface DetectorConfig {
  /** Soglia minima di confidenza */
  confidenceThreshold: number;
  /** Numero massimo di rilevamenti per frame */
  maxDetections: number;
  /** Abilita NMS (Non-Maximum Suppression) */
  enableNMS: boolean;
  /** Soglia IoU per NMS */
  nmsIoUThreshold: number;
}

/** Stato completo del sistema di rilevamento */
export interface DetectorState {
  status: ModelStatus;
  config: DetectorConfig;
  lastFrame: FrameResult | null;
  fps: number;
  error: string | null;
}
