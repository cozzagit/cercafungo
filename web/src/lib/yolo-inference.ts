/**
 * YOLOv8 inference engine using ONNX Runtime Web.
 *
 * Model: YOLOv8n single-class detector ("fungo")
 * Input: [1, 3, 640, 640] — NCHW, float32, normalized 0-1
 * Output: [1, 5, 8400] — 4 bbox coords (cx, cy, w, h) + 1 class score per anchor
 */

import type { InferenceSession, Tensor } from 'onnxruntime-web';

// ── Types ──────────────────────────────────────────────────────

export interface Detection {
  /** Bounding box in original image coords [x, y, width, height] */
  bbox: [number, number, number, number];
  /** Confidence score 0-1 */
  confidence: number;
  /** Label string */
  label: string;
}

export interface InferenceResult {
  detections: Detection[];
  inferenceTimeMs: number;
}

export interface YoloEngineOptions {
  confidenceThreshold?: number;
  iouThreshold?: number;
  maxDetections?: number;
}

/**
 * Scanner operating modes:
 * - 'standard'  : default thresholds, balanced precision/recall (proximity detection)
 * - 'extended'  : lower thresholds, optimised for 5-10m range in open meadows/sottobosco
 * - 'morchella' : minimum thresholds, tuned for the distinctive honeycomb shape at distance
 */
export type ScannerMode = 'standard' | 'extended' | 'morchella';

export interface ScannerModeConfig {
  confidenceThreshold: number;
  iouThreshold: number;
  maxDetections: number;
  label: string;
  hint: string;
}

// ── Constants ──────────────────────────────────────────────────

const MODEL_INPUT_SIZE = 640;
const DEFAULT_CONFIDENCE_THRESHOLD = 0.25;
const DEFAULT_IOU_THRESHOLD = 0.45;
const DEFAULT_MAX_DETECTIONS = 20;
const CLASS_LABEL = 'Fungo';

// ── Scanner mode configuration ─────────────────────────────────

const SCANNER_MODE_CONFIGS: Record<ScannerMode, ScannerModeConfig> = {
  standard: {
    confidenceThreshold: 0.25,
    iouThreshold: 0.45,
    maxDetections: 20,
    label: 'Standard',
    hint: 'Rilevamento standard — fungo ravvicinato',
  },
  extended: {
    confidenceThreshold: 0.15,
    iouThreshold: 0.35,
    maxDetections: 30,
    label: 'Lungo Raggio',
    hint: 'Ottimizzato per detection 5-10m',
  },
  morchella: {
    confidenceThreshold: 0.12,
    iouThreshold: 0.30,
    maxDetections: 30,
    label: 'Morchella',
    hint: 'Cerca morchelle — forma a nido d\'ape',
  },
};

let currentMode: ScannerMode = 'standard';

/**
 * Switch the active scanner mode. Subsequent calls to runInference
 * without explicit options will use the new mode's thresholds.
 */
export function setScannerMode(mode: ScannerMode): void {
  currentMode = mode;
}

/**
 * Return the currently active scanner mode.
 */
export function getScannerMode(): ScannerMode {
  return currentMode;
}

/**
 * Return the full config object for a given mode (or the active mode if omitted).
 */
export function getScannerModeConfig(mode?: ScannerMode): ScannerModeConfig {
  return SCANNER_MODE_CONFIGS[mode ?? currentMode];
}

/**
 * Return YoloEngineOptions derived from the current (or specified) mode.
 * Explicit values in the options argument always win over the mode defaults.
 */
export function getModeOptions(mode?: ScannerMode, overrides?: YoloEngineOptions): YoloEngineOptions {
  const cfg = SCANNER_MODE_CONFIGS[mode ?? currentMode];
  return {
    confidenceThreshold: overrides?.confidenceThreshold ?? cfg.confidenceThreshold,
    iouThreshold: overrides?.iouThreshold ?? cfg.iouThreshold,
    maxDetections: overrides?.maxDetections ?? cfg.maxDetections,
  };
}

// ── Engine ─────────────────────────────────────────────────────

let session: InferenceSession | null = null;
let ort: typeof import('onnxruntime-web') | null = null;

/**
 * Dynamically import onnxruntime-web (avoids SSR issues).
 */
async function getOrt(): Promise<typeof import('onnxruntime-web')> {
  if (ort) return ort;
  ort = await import('onnxruntime-web');

  // Configure WASM paths — use CDN for the WASM backend files
  ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/';

  return ort;
}

/**
 * Load the ONNX model from the given URL.
 * Returns true if loaded successfully, false otherwise.
 */
export async function loadModel(modelUrl: string): Promise<boolean> {
  try {
    const ortModule = await getOrt();

    session = await ortModule.InferenceSession.create(modelUrl, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });

    console.log('[YoloEngine] Model loaded successfully');
    console.log('[YoloEngine] Input names:', session.inputNames);
    console.log('[YoloEngine] Output names:', session.outputNames);
    return true;
  } catch (err) {
    console.error('[YoloEngine] Failed to load model:', err);
    session = null;
    return false;
  }
}

/**
 * Check if the model is loaded and ready.
 */
export function isModelLoaded(): boolean {
  return session !== null;
}

/**
 * Run inference on an ImageData frame.
 * The ImageData can be any size — it will be resized to 640x640.
 */
export async function runInference(
  imageData: ImageData,
  originalWidth: number,
  originalHeight: number,
  options?: YoloEngineOptions
): Promise<InferenceResult> {
  if (!session) {
    return { detections: [], inferenceTimeMs: 0 };
  }

  // Resolve thresholds: explicit options → active mode config → hardcoded defaults
  const modeOptions = getModeOptions(currentMode, options);
  const confidenceThreshold = modeOptions.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  const iouThreshold = modeOptions.iouThreshold ?? DEFAULT_IOU_THRESHOLD;
  const maxDetections = modeOptions.maxDetections ?? DEFAULT_MAX_DETECTIONS;

  const ortModule = await getOrt();
  const startTime = performance.now();

  // 1. Preprocess: resize to 640x640, normalize, convert to NCHW
  const inputTensor = preprocessImageData(ortModule, imageData);

  // 2. Run inference
  const inputName = session.inputNames[0];
  const feeds: Record<string, Tensor> = { [inputName]: inputTensor };
  const results = await session.run(feeds);

  // 3. Get output tensor
  const outputName = session.outputNames[0];
  const outputTensor = results[outputName];
  const outputData = outputTensor.data as Float32Array;
  const outputDims = outputTensor.dims as number[];

  // 4. Parse detections
  const rawDetections = parseYoloOutput(
    outputData,
    outputDims,
    confidenceThreshold,
    originalWidth,
    originalHeight
  );

  // 5. Apply NMS
  const finalDetections = applyNms(rawDetections, iouThreshold).slice(0, maxDetections);

  const inferenceTimeMs = performance.now() - startTime;

  return { detections: finalDetections, inferenceTimeMs };
}

/**
 * Preprocess ImageData into a NCHW float32 tensor [1, 3, 640, 640].
 * Resizes using an offscreen canvas, normalizes pixel values to 0-1.
 */
function preprocessImageData(
  ortModule: typeof import('onnxruntime-web'),
  imageData: ImageData
): Tensor {
  // Resize to 640x640 using canvas
  const resizeCanvas = document.createElement('canvas');
  resizeCanvas.width = MODEL_INPUT_SIZE;
  resizeCanvas.height = MODEL_INPUT_SIZE;
  const ctx = resizeCanvas.getContext('2d', { willReadFrequently: true })!;

  // Create a temporary canvas with the source ImageData
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = imageData.width;
  srcCanvas.height = imageData.height;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.putImageData(imageData, 0, 0);

  // Draw resized (letterbox would be ideal, but stretch works for single-class detection)
  ctx.drawImage(srcCanvas, 0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  const resizedData = ctx.getImageData(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);

  // Convert RGBA HWC to RGB NCHW, normalized to 0-1
  const pixels = resizedData.data;
  const totalPixels = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE;
  const float32Data = new Float32Array(3 * totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    const rgbaIdx = i * 4;
    float32Data[i] = pixels[rgbaIdx] / 255.0;                     // R channel
    float32Data[totalPixels + i] = pixels[rgbaIdx + 1] / 255.0;   // G channel
    float32Data[2 * totalPixels + i] = pixels[rgbaIdx + 2] / 255.0; // B channel
  }

  return new ortModule.Tensor('float32', float32Data, [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE]);
}

/**
 * Parse YOLOv8 output tensor.
 *
 * YOLOv8 detection output shape: [1, 4+num_classes, 8400]
 * For single class: [1, 5, 8400]
 * Row 0-3: cx, cy, w, h (in 640x640 space)
 * Row 4: class score
 *
 * Note: YOLOv8 output is transposed compared to v5 — it's [batch, features, anchors]
 */
function parseYoloOutput(
  data: Float32Array,
  dims: number[],
  confidenceThreshold: number,
  originalWidth: number,
  originalHeight: number
): Detection[] {
  const detections: Detection[] = [];

  // dims could be [1, 5, 8400] or [1, 8400, 5]
  // YOLOv8 default is [1, 5, 8400] (features x anchors)
  let numAnchors: number;
  let numFeatures: number;
  let isTransposed: boolean;

  if (dims.length === 3) {
    if (dims[1] < dims[2]) {
      // [1, 5, 8400] — standard YOLOv8 format
      numFeatures = dims[1];
      numAnchors = dims[2];
      isTransposed = false;
    } else {
      // [1, 8400, 5] — transposed
      numAnchors = dims[1];
      numFeatures = dims[2];
      isTransposed = true;
    }
  } else {
    console.warn('[YoloEngine] Unexpected output dims:', dims);
    return [];
  }

  // Scale factors from 640x640 to original image size
  const scaleX = originalWidth / MODEL_INPUT_SIZE;
  const scaleY = originalHeight / MODEL_INPUT_SIZE;

  for (let i = 0; i < numAnchors; i++) {
    let cx: number, cy: number, w: number, h: number, score: number;

    if (isTransposed) {
      // [1, 8400, 5] layout
      const offset = i * numFeatures;
      cx = data[offset];
      cy = data[offset + 1];
      w = data[offset + 2];
      h = data[offset + 3];
      // For multi-class, find max score from index 4 onwards
      score = data[offset + 4];
      for (let c = 5; c < numFeatures; c++) {
        if (data[offset + c] > score) {
          score = data[offset + c];
        }
      }
    } else {
      // [1, 5, 8400] layout — features are in rows
      cx = data[0 * numAnchors + i];
      cy = data[1 * numAnchors + i];
      w = data[2 * numAnchors + i];
      h = data[3 * numAnchors + i];
      // For multi-class, find max score from row 4 onwards
      score = data[4 * numAnchors + i];
      for (let c = 5; c < numFeatures; c++) {
        if (data[c * numAnchors + i] > score) {
          score = data[c * numAnchors + i];
        }
      }
    }

    if (score < confidenceThreshold) continue;

    // Convert from center coords to top-left coords, scale to original image
    const x = (cx - w / 2) * scaleX;
    const y = (cy - h / 2) * scaleY;
    const bw = w * scaleX;
    const bh = h * scaleY;

    detections.push({
      bbox: [
        Math.max(0, x),
        Math.max(0, y),
        Math.min(bw, originalWidth - Math.max(0, x)),
        Math.min(bh, originalHeight - Math.max(0, y)),
      ],
      confidence: score,
      label: CLASS_LABEL,
    });
  }

  return detections;
}

/**
 * Apply Non-Maximum Suppression (NMS) to filter overlapping detections.
 */
function applyNms(detections: Detection[], iouThreshold: number): Detection[] {
  if (detections.length === 0) return [];

  // Sort by confidence descending
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const kept: Detection[] = [];
  const suppressed = new Set<number>();

  for (let i = 0; i < sorted.length; i++) {
    if (suppressed.has(i)) continue;
    kept.push(sorted[i]);

    for (let j = i + 1; j < sorted.length; j++) {
      if (suppressed.has(j)) continue;
      if (computeIou(sorted[i].bbox, sorted[j].bbox) > iouThreshold) {
        suppressed.add(j);
      }
    }
  }

  return kept;
}

/**
 * Compute Intersection over Union between two bounding boxes.
 * Boxes are [x, y, w, h] format.
 */
function computeIou(
  a: [number, number, number, number],
  b: [number, number, number, number]
): number {
  const ax1 = a[0], ay1 = a[1], ax2 = a[0] + a[2], ay2 = a[1] + a[3];
  const bx1 = b[0], by1 = b[1], bx2 = b[0] + b[2], by2 = b[1] + b[3];

  const interX1 = Math.max(ax1, bx1);
  const interY1 = Math.max(ay1, by1);
  const interX2 = Math.min(ax2, bx2);
  const interY2 = Math.min(ay2, by2);

  const interW = Math.max(0, interX2 - interX1);
  const interH = Math.max(0, interY2 - interY1);
  const interArea = interW * interH;

  const areaA = a[2] * a[3];
  const areaB = b[2] * b[3];
  const unionArea = areaA + areaB - interArea;

  return unionArea > 0 ? interArea / unionArea : 0;
}

/**
 * Release the ONNX session.
 */
export async function disposeModel(): Promise<void> {
  if (session) {
    await session.release();
    session = null;
  }
}
