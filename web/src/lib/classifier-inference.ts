/**
 * CercaFungo — Species Classifier (Stage 2)
 *
 * EfficientNet-B0 classifier running on ONNX Runtime Web.
 * Takes a cropped mushroom image (from detector bbox) and predicts the species.
 *
 * Input: [1, 3, 224, 224] — NCHW, float32, ImageNet-normalized
 * Output: [1, num_classes] — logits per class
 */

import type { InferenceSession, Tensor } from 'onnxruntime-web';

// ── Types ──────────────────────────────────────────────────────

export interface ClassificationResult {
  /** Top predicted species ID (matches config.yaml / species-data.ts) */
  speciesId: string;
  /** Confidence 0-1 for the top prediction */
  confidence: number;
  /** Top-3 predictions with confidence */
  top3: { speciesId: string; confidence: number }[];
  /** Inference time in ms */
  inferenceTimeMs: number;
}

// ── Constants ──────────────────────────────────────────────────

const CLASSIFIER_INPUT_SIZE = 224;

/** ImageNet normalization values */
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

// ── State ──────────────────────────────────────────────────────

let classifierSession: InferenceSession | null = null;
let classNames: string[] = [];

// ── Engine ─────────────────────────────────────────────────────

async function getOrt(): Promise<typeof import('onnxruntime-web')> {
  const ort = await import('onnxruntime-web');
  ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/';
  return ort;
}

/**
 * Load the classifier ONNX model and class names.
 */
export async function loadClassifier(
  modelUrl: string,
  classNamesInput: string[],
): Promise<boolean> {
  try {
    const ortModule = await getOrt();
    classifierSession = await ortModule.InferenceSession.create(modelUrl, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
    classNames = classNamesInput;
    console.log(`[Classifier] Loaded: ${classNames.length} classes`);
    return true;
  } catch (err) {
    console.error('[Classifier] Failed to load:', err);
    classifierSession = null;
    return false;
  }
}

export function isClassifierLoaded(): boolean {
  return classifierSession !== null && classNames.length > 0;
}

/**
 * Classify a cropped mushroom image.
 *
 * @param cropCanvas — Canvas containing the cropped mushroom region
 */
export async function classifyMushroom(
  cropCanvas: HTMLCanvasElement,
): Promise<ClassificationResult | null> {
  if (!classifierSession || classNames.length === 0) return null;

  const ortModule = await getOrt();
  const startTime = performance.now();

  // Preprocess: resize to 224x224, normalize with ImageNet stats
  const inputTensor = preprocessCrop(ortModule, cropCanvas);

  // Run inference
  const inputName = classifierSession.inputNames[0];
  const feeds: Record<string, Tensor> = { [inputName]: inputTensor };
  const results = await classifierSession.run(feeds);

  // Parse output logits
  const outputName = classifierSession.outputNames[0];
  const logits = results[outputName].data as Float32Array;

  // Softmax
  const probs = softmax(logits);

  // Top-3
  const indexed = Array.from(probs).map((p, i) => ({ idx: i, prob: p }));
  indexed.sort((a, b) => b.prob - a.prob);
  const top3 = indexed.slice(0, 3).map((item) => ({
    speciesId: classNames[item.idx] ?? 'sconosciuto',
    confidence: item.prob,
  }));

  const inferenceTimeMs = performance.now() - startTime;

  return {
    speciesId: top3[0].speciesId,
    confidence: top3[0].confidence,
    top3,
    inferenceTimeMs,
  };
}

/**
 * Crop a detection from the video frame and classify it.
 * Convenience method that combines crop + classify.
 */
export async function classifyDetection(
  video: HTMLVideoElement,
  bbox: [number, number, number, number],
): Promise<ClassificationResult | null> {
  if (!classifierSession) return null;

  const [x, y, w, h] = bbox;

  // Create crop canvas from the video
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = Math.max(1, Math.round(w));
  cropCanvas.height = Math.max(1, Math.round(h));

  const ctx = cropCanvas.getContext('2d');
  if (!ctx) return null;

  // Draw the cropped region from the video
  ctx.drawImage(
    video,
    Math.max(0, x), Math.max(0, y), w, h,
    0, 0, cropCanvas.width, cropCanvas.height,
  );

  return classifyMushroom(cropCanvas);
}

// ── Preprocessing ──────────────────────────────────────────────

function preprocessCrop(
  ortModule: typeof import('onnxruntime-web'),
  canvas: HTMLCanvasElement,
): Tensor {
  // Resize to 224x224
  const resizeCanvas = document.createElement('canvas');
  resizeCanvas.width = CLASSIFIER_INPUT_SIZE;
  resizeCanvas.height = CLASSIFIER_INPUT_SIZE;
  const ctx = resizeCanvas.getContext('2d', { willReadFrequently: true })!;

  // Center crop resize (maintain aspect ratio)
  const srcW = canvas.width;
  const srcH = canvas.height;
  const scale = Math.max(
    CLASSIFIER_INPUT_SIZE / srcW,
    CLASSIFIER_INPUT_SIZE / srcH,
  );
  const scaledW = srcW * scale;
  const scaledH = srcH * scale;
  const offsetX = (CLASSIFIER_INPUT_SIZE - scaledW) / 2;
  const offsetY = (CLASSIFIER_INPUT_SIZE - scaledH) / 2;

  ctx.drawImage(canvas, offsetX, offsetY, scaledW, scaledH);
  const resizedData = ctx.getImageData(0, 0, CLASSIFIER_INPUT_SIZE, CLASSIFIER_INPUT_SIZE);

  // Convert to NCHW float32 with ImageNet normalization
  const pixels = resizedData.data;
  const totalPixels = CLASSIFIER_INPUT_SIZE * CLASSIFIER_INPUT_SIZE;
  const float32Data = new Float32Array(3 * totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    const rgbaIdx = i * 4;
    float32Data[i] = (pixels[rgbaIdx] / 255.0 - MEAN[0]) / STD[0];
    float32Data[totalPixels + i] = (pixels[rgbaIdx + 1] / 255.0 - MEAN[1]) / STD[1];
    float32Data[2 * totalPixels + i] = (pixels[rgbaIdx + 2] / 255.0 - MEAN[2]) / STD[2];
  }

  return new ortModule.Tensor('float32', float32Data, [1, 3, CLASSIFIER_INPUT_SIZE, CLASSIFIER_INPUT_SIZE]);
}

function softmax(logits: Float32Array): Float32Array {
  const maxVal = Math.max(...logits);
  const exps = new Float32Array(logits.length);
  let sum = 0;
  for (let i = 0; i < logits.length; i++) {
    exps[i] = Math.exp(logits[i] - maxVal);
    sum += exps[i];
  }
  for (let i = 0; i < logits.length; i++) {
    exps[i] /= sum;
  }
  return exps;
}

/**
 * Release the classifier session.
 */
export async function disposeClassifier(): Promise<void> {
  if (classifierSession) {
    await classifierSession.release();
    classifierSession = null;
    classNames = [];
  }
}
