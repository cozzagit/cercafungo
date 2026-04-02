/**
 * CercaFungo — Frame Processor per VisionCamera
 *
 * Plugin per processare i frame della fotocamera in tempo reale
 * e restituire i rilevamenti dei funghi. Quando il modello ML reale
 * sara integrato, questo file fara da bridge tra VisionCamera e il modello.
 */

import type { FrameResult, DetectorConfig } from './types';

/**
 * Interfaccia per il plugin nativo del frame processor.
 * In produzione questo sara implementato in Swift/Kotlin.
 */
export interface FrameProcessorPlugin {
  /** Processa un singolo frame e restituisce i rilevamenti */
  detectMushrooms(frame: unknown): FrameResult;
  /** Aggiorna la configurazione a runtime */
  updateConfig(config: Partial<DetectorConfig>): void;
}

/**
 * Crea la funzione frame processor per VisionCamera.
 *
 * Uso:
 * ```tsx
 * const frameProcessor = useFrameProcessor((frame) => {
 *   'worklet';
 *   const result = processFrame(frame);
 *   // gestisci risultati...
 * }, []);
 * ```
 *
 * TODO: Implementare il plugin nativo
 * - iOS: Swift plugin con CoreML
 * - Android: Kotlin plugin con TFLite
 */
export function createFrameProcessorPlugin(): FrameProcessorPlugin | null {
  // Il plugin nativo verra registrato al build time
  // Per ora restituiamo null — lo scanner usera il mock detector
  try {
    // In produzione:
    // return VisionCameraProxy.initFrameProcessorPlugin('detectMushrooms');
    return null;
  } catch {
    console.warn(
      '[CercaFungo] Frame processor plugin non disponibile. Usando mock detector.'
    );
    return null;
  }
}

/**
 * Dimensioni raccomandate per il frame processor in base al dispositivo.
 * Frame piu piccoli = inferenza piu veloce, ma meno precisione.
 */
export const RECOMMENDED_FRAME_SIZES = {
  low: { width: 320, height: 240 },    // ~15 FPS su device base
  medium: { width: 640, height: 480 },  // ~10 FPS su device medio
  high: { width: 1280, height: 720 },   // ~5 FPS su device top
} as const;
