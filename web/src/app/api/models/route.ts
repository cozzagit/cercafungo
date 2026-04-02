import { NextResponse } from 'next/server';

/**
 * GET /api/models
 * Returns the latest ML model version info and download URL.
 * The mobile app checks this endpoint to see if a newer model is available.
 */
export async function GET() {
  // Model version metadata — update when a new model is trained
  const latestModel = {
    version: '1.0.0',
    releaseDate: '2026-04-01',
    speciesCount: 48,
    accuracy: 0.89,
    modelSize: '45MB',
    downloadUrl: process.env.MODEL_STORAGE_URL
      ? `${process.env.MODEL_STORAGE_URL}/cercafungo-v1.0.0.tflite`
      : null,
    changelog: [
      'Modello iniziale con 48 specie alpine',
      'Ottimizzato per dispositivi mobili (TFLite)',
      'Supporto offline completo',
    ],
    minAppVersion: '1.0.0',
  };

  return NextResponse.json({
    data: latestModel,
    meta: { version: 'v1' },
  });
}
