/**
 * CercaFungo — Wrapper per l'inferenza YOLO di rilevamento funghi
 *
 * Questo modulo fornisce l'interfaccia per il modello di object detection.
 * In fase di sviluppo restituisce dati mock; in produzione verra collegato
 * al modello TFLite/CoreML reale tramite il frame processor di VisionCamera.
 */

import {
  Detection,
  DetectorConfig,
  DetectorState,
  FrameResult,
  ModelStatus,
} from './types';
import { MIN_CONFIDENCE_THRESHOLD } from '../constants';

const DEFAULT_CONFIG: DetectorConfig = {
  confidenceThreshold: MIN_CONFIDENCE_THRESHOLD,
  maxDetections: 10,
  enableNMS: true,
  nmsIoUThreshold: 0.45,
};

let currentState: DetectorState = {
  status: 'not_loaded',
  config: { ...DEFAULT_CONFIG },
  lastFrame: null,
  fps: 0,
  error: null,
};

/**
 * Inizializza il modello di rilevamento.
 * In produzione scarichera e carichera il modello TFLite/CoreML.
 */
export async function initializeDetector(
  config?: Partial<DetectorConfig>
): Promise<void> {
  try {
    currentState = {
      ...currentState,
      status: 'loading',
      config: { ...DEFAULT_CONFIG, ...config },
      error: null,
    };

    // TODO: Caricare modello reale
    // await loadTFLiteModel(modelPath);
    await new Promise((resolve) => setTimeout(resolve, 500));

    currentState = {
      ...currentState,
      status: 'ready',
    };
  } catch (error) {
    currentState = {
      ...currentState,
      status: 'error',
      error:
        error instanceof Error
          ? error.message
          : 'Errore caricamento modello',
    };
    throw error;
  }
}

/**
 * Rilascia le risorse del modello.
 */
export async function releaseDetector(): Promise<void> {
  currentState = {
    ...currentState,
    status: 'not_loaded',
    lastFrame: null,
    fps: 0,
  };
}

/**
 * Restituisce lo stato corrente del detector.
 */
export function getDetectorState(): DetectorState {
  return { ...currentState };
}

/**
 * Aggiorna la configurazione del detector a runtime.
 */
export function updateConfig(config: Partial<DetectorConfig>): void {
  currentState = {
    ...currentState,
    config: { ...currentState.config, ...config },
  };
}

/**
 * Genera un ID univoco per un rilevamento.
 */
function generateDetectionId(): string {
  return `det_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Mock: simula un rilevamento realistico.
 * Verra sostituito dall'inferenza reale del modello.
 */
export function generateMockDetections(): FrameResult {
  const startTime = performance.now();

  const mockLabels = [
    'Porcino',
    'Chiodino',
    'Finferlo',
    'Fungo generico',
    'Amanita muscaria',
  ];

  const numDetections = Math.random() > 0.6 ? Math.floor(Math.random() * 3) + 1 : 0;

  const detections: Detection[] = [];

  for (let i = 0; i < numDetections; i++) {
    const confidence = 0.3 + Math.random() * 0.65;
    if (confidence < currentState.config.confidenceThreshold) continue;

    detections.push({
      id: generateDetectionId(),
      label: mockLabels[Math.floor(Math.random() * mockLabels.length)],
      confidence,
      boundingBox: {
        x: 0.1 + Math.random() * 0.6,
        y: 0.3 + Math.random() * 0.4,
        width: 0.08 + Math.random() * 0.15,
        height: 0.08 + Math.random() * 0.15,
      },
      timestamp: Date.now(),
    });
  }

  const inferenceTimeMs = performance.now() - startTime;

  const result: FrameResult = {
    detections,
    inferenceTimeMs,
    frameSize: { width: 1920, height: 1080 },
  };

  currentState = {
    ...currentState,
    lastFrame: result,
  };

  return result;
}

/**
 * Applica Non-Maximum Suppression per eliminare bounding box sovrapposti.
 */
export function applyNMS(
  detections: Detection[],
  iouThreshold: number = 0.45
): Detection[] {
  if (detections.length === 0) return [];

  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const kept: Detection[] = [];

  for (const det of sorted) {
    let shouldKeep = true;

    for (const keptDet of kept) {
      const iou = calculateIoU(det.boundingBox, keptDet.boundingBox);
      if (iou > iouThreshold) {
        shouldKeep = false;
        break;
      }
    }

    if (shouldKeep) {
      kept.push(det);
    }
  }

  return kept;
}

/**
 * Calcola Intersection over Union tra due bounding box.
 */
function calculateIoU(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);

  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  const union = areaA + areaB - intersection;

  return union > 0 ? intersection / union : 0;
}
