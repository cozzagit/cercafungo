/**
 * Camera utility functions for the CercaFungo web scanner.
 * Handles camera access, flash toggle, and frame capture.
 * Optimized for mobile (iOS Safari + Android Chrome).
 */

export interface CameraCapabilities {
  hasFlash: boolean;
  hasZoom: boolean;
  zoomRange: { min: number; max: number; step: number } | null;
  facingMode: string;
}

/**
 * Request camera access, preferring the rear camera with max resolution.
 * Falls back to any available camera if rear is unavailable.
 */
export async function requestCameraAccess(): Promise<MediaStream> {
  // First try: rear camera with ideal high resolution
  const idealConstraints: MediaStreamConstraints = {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  };

  try {
    return await navigator.mediaDevices.getUserMedia(idealConstraints);
  } catch {
    // Fallback: any camera
    try {
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch (err) {
      throw new CameraError(
        'Impossibile accedere alla fotocamera. Verifica i permessi.',
        err instanceof Error ? err : undefined
      );
    }
  }
}

/**
 * Get the capabilities of the active video track.
 */
export function getCameraCapabilities(stream: MediaStream): CameraCapabilities {
  const track = stream.getVideoTracks()[0];
  if (!track) {
    return { hasFlash: false, hasZoom: false, zoomRange: null, facingMode: 'unknown' };
  }

  const capabilities = track.getCapabilities?.() as Record<string, unknown> | undefined;
  const settings = track.getSettings();

  let hasFlash = false;
  let hasZoom = false;
  let zoomRange: CameraCapabilities['zoomRange'] = null;

  if (capabilities) {
    // Flash / torch support
    hasFlash = Array.isArray((capabilities as Record<string, unknown>).torch)
      ? true
      : (capabilities as Record<string, unknown>).torch === true;

    // Zoom support
    const zoom = capabilities.zoom as { min?: number; max?: number; step?: number } | undefined;
    if (zoom && typeof zoom === 'object' && 'min' in zoom && 'max' in zoom) {
      hasZoom = true;
      zoomRange = {
        min: zoom.min ?? 1,
        max: zoom.max ?? 1,
        step: zoom.step ?? 0.1,
      };
    }
  }

  return {
    hasFlash,
    hasZoom,
    zoomRange,
    facingMode: (settings.facingMode as string) || 'unknown',
  };
}

/**
 * Toggle the flash/torch on the active video track.
 * Returns the new torch state.
 */
export async function toggleFlash(stream: MediaStream, enable: boolean): Promise<boolean> {
  const track = stream.getVideoTracks()[0];
  if (!track) return false;

  try {
    await track.applyConstraints({
      advanced: [{ torch: enable } as MediaTrackConstraintSet],
    });
    return enable;
  } catch {
    // Flash not supported or failed
    return false;
  }
}

/**
 * Set the zoom level on the active video track.
 */
export async function setZoom(stream: MediaStream, zoom: number): Promise<void> {
  const track = stream.getVideoTracks()[0];
  if (!track) return;

  try {
    await track.applyConstraints({
      advanced: [{ zoom } as MediaTrackConstraintSet],
    });
  } catch {
    // Zoom not supported
  }
}

/**
 * Capture the current frame from a video element as ImageData.
 * Uses an offscreen canvas for performance.
 */
export function captureFrame(
  video: HTMLVideoElement,
  targetWidth: number,
  targetHeight: number
): ImageData | null {
  if (video.readyState < 2) return null; // HAVE_CURRENT_DATA

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
  return ctx.getImageData(0, 0, targetWidth, targetHeight);
}

/**
 * Capture a full-resolution snapshot from the video for saving.
 * Returns a Blob (JPEG).
 */
export async function captureSnapshot(video: HTMLVideoElement): Promise<Blob | null> {
  if (video.readyState < 2) return null;

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      'image/jpeg',
      0.92
    );
  });
}

/**
 * Stop all tracks on a media stream.
 */
export function stopCamera(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}

/**
 * Custom error class for camera-related issues.
 */
export class CameraError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'CameraError';
  }
}
