'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { Detection, ScannerMode } from '@/lib/yolo-inference';
import { getScannerModeConfig } from '@/lib/yolo-inference';
import {
  requestCameraAccess,
  getCameraCapabilities,
  toggleFlash,
  setZoom,
  captureSnapshot,
  stopCamera,
  type CameraCapabilities,
} from '@/lib/camera-utils';
import {
  LookalikeComparison,
  shouldShowLookalikes,
} from '@/components/scanner/lookalike-comparison';
import { SafetyBanner } from '@/components/scanner/safety-banner';
import { SPECIES_DATABASE } from '@/lib/species-data';
import { saveScan, createThumbnail } from '@/lib/scan-store';
import type { ClassificationResult } from '@/lib/classifier-inference';

// ── Types ──────────────────────────────────────────────────────

interface SavedDetection {
  id: string;
  timestamp: Date;
  confidence: number;
  label: string;
  imageUrl: string | null;
}

type ScannerState =
  | 'loading'
  | 'permission-needed'
  | 'permission-denied'
  | 'camera-error'
  | 'running'
  | 'model-missing';

// ── Component ──────────────────────────────────────────────────

export default function ScannerPage() {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastInferenceTime = useRef<number>(0);
  const inferenceRunning = useRef<boolean>(false);

  // State
  const [state, setState] = useState<ScannerState>('loading');
  const [capabilities, setCapabilities] = useState<CameraCapabilities | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [classifierReady, setClassifierReady] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [totalDetections, setTotalDetections] = useState(0);
  const [savedDetections, setSavedDetections] = useState<SavedDetection[]>([]);
  const [fps, setFps] = useState(0);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('cercafungo_disclaimer_accepted') !== 'true';
  });
  const [showLookalikeOverlay, setShowLookalikeOverlay] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [scannerMode, setScannerModeState] = useState<ScannerMode>('standard');

  // ── Camera setup ─────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    try {
      setState('loading');
      const stream = await requestCameraAccess();
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const caps = getCameraCapabilities(stream);
      setCapabilities(caps);

      setState('running');
    } catch (err) {
      console.error('Camera error:', err);
      if (err instanceof Error && err.message.includes('permessi')) {
        setState('permission-denied');
      } else {
        setState('camera-error');
      }
    }
  }, []);

  // ── Model loading ────────────────────────────────────────────

  const loadModelAsync = useCallback(async () => {
    if (modelLoaded || modelLoading) return;
    setModelLoading(true);

    try {
      const { loadModel, isModelLoaded } = await import('@/lib/yolo-inference');

      if (isModelLoaded()) {
        setModelLoaded(true);
        setModelLoading(false);
        setDemoMode(false);
        return;
      }

      const success = await loadModel('/models/mushroom-detector.onnx');
      setModelLoaded(success);
      setDemoMode(!success);

      if (!success) {
        console.warn('[Scanner] Detector not found — demo mode');
      }

      // Load classifier (stage 2) if available
      try {
        const { loadClassifier } = await import('@/lib/classifier-inference');
        const classNamesRes = await fetch('/models/class_names.json');
        if (classNamesRes.ok) {
          const names: string[] = await classNamesRes.json();
          const clsOk = await loadClassifier('/models/mushroom-classifier.onnx', names);
          setClassifierReady(clsOk);
          if (clsOk) console.log('[Scanner] Classifier loaded:', names.length, 'species');
        }
      } catch {
        console.log('[Scanner] Classifier not available yet — detection only');
      }
    } catch (err) {
      console.error('[Scanner] Model loading failed:', err);
      setDemoMode(true);
    } finally {
      setModelLoading(false);
    }
  }, [modelLoaded, modelLoading]);

  // ── Inference loop ───────────────────────────────────────────

  const runDetectionLoop = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }

    // Resize canvas to match video display size
    const displayWidth = video.clientWidth;
    const displayHeight = video.clientHeight;
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animFrameRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Throttle inference to ~8 FPS (125ms interval)
    const now = performance.now();
    const INFERENCE_INTERVAL_MS = 125;

    if (
      modelLoaded &&
      !inferenceRunning.current &&
      now - lastInferenceTime.current > INFERENCE_INTERVAL_MS
    ) {
      inferenceRunning.current = true;
      lastInferenceTime.current = now;

      try {
        const { captureFrame } = await import('@/lib/camera-utils');
        const { runInference, getModeOptions, getScannerMode } = await import('@/lib/yolo-inference');

        const imageData = captureFrame(video, 640, 640);
        if (imageData) {
          const result = await runInference(
            imageData,
            video.videoWidth,
            video.videoHeight,
            getModeOptions(getScannerMode())
          );

          if (result.detections.length > 0) {
            // Run classifier on top detection if available
            let classifiedDetections = result.detections;
            if (classifierReady && video) {
              try {
                const { classifyDetection } = await import('@/lib/classifier-inference');
                const topDet = result.detections.reduce((a, b) => a.confidence > b.confidence ? a : b);
                const cls = await classifyDetection(video, topDet.bbox);
                if (cls && cls.confidence > 0.15) {
                  setClassification(cls);
                  // Find Italian name from species database
                  const species = SPECIES_DATABASE.find(s => s.id === cls.speciesId);
                  const label = species
                    ? `${species.italianName} ${Math.round(cls.confidence * 100)}%`
                    : `${cls.speciesId} ${Math.round(cls.confidence * 100)}%`;
                  // Update top detection label with species name
                  classifiedDetections = result.detections.map(d =>
                    d === topDet ? { ...d, label } : d
                  );
                } else {
                  setClassification(null);
                }
              } catch {
                // Classifier failed — keep generic label
              }
            }

            setDetections(classifiedDetections);
            setTotalDetections((prev) => prev + result.detections.length);

            // Vibrate on high-confidence detection
            const highConf = result.detections.some((d) => d.confidence > 0.75);
            if (highConf && navigator.vibrate) {
              navigator.vibrate(100);
            }
          } else {
            setDetections([]);
            setClassification(null);
          }

          if (result.inferenceTimeMs > 0) {
            setFps(Math.round(1000 / result.inferenceTimeMs));
          }
        }
      } catch (err) {
        console.error('[Scanner] Inference error:', err);
      } finally {
        inferenceRunning.current = false;
      }
    }

    // Draw bounding boxes (scale from video resolution to display resolution)
    if (detections.length > 0) {
      const scaleX = displayWidth / video.videoWidth;
      const scaleY = displayHeight / video.videoHeight;

      for (const det of detections) {
        const [x, y, w, h] = det.bbox;
        const dx = x * scaleX;
        const dy = y * scaleY;
        const dw = w * scaleX;
        const dh = h * scaleY;

        // Color based on confidence
        const color = getConfidenceColor(det.confidence);
        const alpha = 0.3 + det.confidence * 0.4;

        // Pulsing effect via slight size variation
        const pulse = Math.sin(now / 300) * 2;

        // Draw filled background
        ctx.fillStyle = color.replace('1)', `${alpha * 0.2})`);
        ctx.fillRect(dx - pulse, dy - pulse, dw + pulse * 2, dh + pulse * 2);

        // Draw border with rounded corners
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        drawRoundedRect(ctx, dx - pulse, dy - pulse, dw + pulse * 2, dh + pulse * 2, 8);
        ctx.stroke();

        // Corner accents
        const cornerLen = Math.min(20, dw * 0.2, dh * 0.2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = color;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(dx, dy + cornerLen);
        ctx.lineTo(dx, dy);
        ctx.lineTo(dx + cornerLen, dy);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(dx + dw - cornerLen, dy);
        ctx.lineTo(dx + dw, dy);
        ctx.lineTo(dx + dw, dy + cornerLen);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(dx, dy + dh - cornerLen);
        ctx.lineTo(dx, dy + dh);
        ctx.lineTo(dx + cornerLen, dy + dh);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(dx + dw - cornerLen, dy + dh);
        ctx.lineTo(dx + dw, dy + dh);
        ctx.lineTo(dx + dw, dy + dh - cornerLen);
        ctx.stroke();

        // Label background
        const label = `${det.label} ${Math.round(det.confidence * 100)}%`;
        ctx.font = 'bold 14px Inter, system-ui, sans-serif';
        const textWidth = ctx.measureText(label).width;
        const labelHeight = 24;
        const labelY = dy > labelHeight + 4 ? dy - labelHeight - 4 : dy + dh + 4;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(dx, labelY, textWidth + 16, labelHeight, 4);
        ctx.fill();

        // Label text
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, dx + 8, labelY + labelHeight / 2);
      }
    }

    // Draw scanning line animation (subtle)
    if (modelLoaded) {
      const scanY = (now / 20) % displayHeight;
      const gradient = ctx.createLinearGradient(0, scanY - 2, 0, scanY + 2);
      gradient.addColorStop(0, 'rgba(74, 124, 46, 0)');
      gradient.addColorStop(0.5, 'rgba(74, 124, 46, 0.4)');
      gradient.addColorStop(1, 'rgba(74, 124, 46, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, scanY - 2, displayWidth, 4);
    }

    animFrameRef.current = requestAnimationFrame(runDetectionLoop);
  }, [modelLoaded, detections]);

  // ── Lifecycle ────────────────────────────────────────────────

  useEffect(() => {
    startCamera();
    loadModelAsync();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (streamRef.current) {
        stopCamera(streamRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start detection loop once camera is running
  useEffect(() => {
    if (state === 'running') {
      animFrameRef.current = requestAnimationFrame(runDetectionLoop);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [state, runDetectionLoop]);

  // ── Actions ──────────────────────────────────────────────────

  const handleFlashToggle = async () => {
    if (!streamRef.current || !capabilities?.hasFlash) return;
    const newState = await toggleFlash(streamRef.current, !flashOn);
    setFlashOn(newState);
  };

  const handleZoomChange = async (value: number) => {
    setZoomLevel(value);
    if (streamRef.current) {
      await setZoom(streamRef.current, value);
    }
  };

  const handleModeChange = async (mode: ScannerMode) => {
    const { setScannerMode } = await import('@/lib/yolo-inference');
    setScannerMode(mode);
    setScannerModeState(mode);
  };

  const handleCapture = async () => {
    if (!videoRef.current) return;

    const blob = await captureSnapshot(videoRef.current);
    const imageUrl = blob ? URL.createObjectURL(blob) : null;

    const topDet = detections.length > 0
      ? detections.reduce((best, d) => (d.confidence > best.confidence ? d : best))
      : null;

    const saved: SavedDetection = {
      id: `det-${Date.now()}`,
      timestamp: new Date(),
      confidence: topDet?.confidence ?? 0,
      label: topDet?.label ?? 'Nessun rilevamento',
      imageUrl,
    };

    setSavedDetections((prev) => [saved, ...prev]);
    setShowBottomSheet(true);

    // Persist to scan-store (thumbnail + GPS for ML feedback)
    const thumbnail = await createThumbnail(videoRef.current);

    // Resolve species: prefer classifier result, fallback to label matching
    const matchedSpecies = classification
      ? SPECIES_DATABASE.find(s => s.id === classification.speciesId)
      : topDet
        ? SPECIES_DATABASE.find(
            (s) =>
              s.italianName.toLowerCase() === topDet.label.toLowerCase() ||
              s.id === topDet.label.toLowerCase().replace(/\s+/g, '-'),
          )
        : undefined;

    // Grab GPS if available
    let lat: number | null = null;
    let lng: number | null = null;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 }),
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        // GPS not available — fine
      }
    }

    saveScan({
      detectedLabel: topDet?.label ?? 'Nessun rilevamento',
      confidence: topDet?.confidence ?? 0,
      speciesId: matchedSpecies?.id ?? null,
      scannerMode: scannerMode,
      thumbnail,
      lat,
      lng,
    });

    // Auto-show lookalike panel if the detected species has dangerous lookalikes
    if (matchedSpecies && shouldShowLookalikes(matchedSpecies, topDet?.confidence)) {
      setShowLookalikeOverlay(true);
    }

    // Vibrate feedback
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
  };

  // ── Render helpers ───────────────────────────────────────────

  const topDetection = useMemo(
    () =>
      detections.length > 0
        ? detections.reduce((best, d) => (d.confidence > best.confidence ? d : best))
        : null,
    [detections],
  );

  // Resolve the top detection to a Species entry for lookalike lookup.
  // Prefer classifier result (by speciesId), fallback to label text matching.
  const topDetectionSpecies = useMemo(() => {
    if (classification) {
      return SPECIES_DATABASE.find(s => s.id === classification.speciesId) ?? null;
    }
    if (!topDetection) return null;
    const label = topDetection.label.toLowerCase();
    return (
      SPECIES_DATABASE.find(
        (s) =>
          s.italianName.toLowerCase() === label ||
          s.id === label.replace(/\s+/g, '-'),
      ) ?? null
    );
  }, [topDetection, classification]);

  // Pre-compute whether lookalike panel should show (used in multiple render spots)
  const showLookalikes = useMemo(
    () => topDetectionSpecies ? shouldShowLookalikes(topDetectionSpecies, topDetection?.confidence) : false,
    [topDetectionSpecies, topDetection],
  );

  // ── Error / Permission states ────────────────────────────────

  if (state === 'permission-needed' || state === 'permission-denied') {
    return (
      <div className="fixed inset-0 bg-bark-900 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-6">📸</div>
          <h1 className="text-2xl font-bold text-white mb-3">
            Accesso Fotocamera
          </h1>
          <p className="text-bark-300 mb-6">
            {state === 'permission-denied'
              ? 'Hai negato l\'accesso alla fotocamera. Vai nelle impostazioni del browser per abilitarla.'
              : 'CercaFungo ha bisogno della fotocamera per identificare i funghi.'}
          </p>
          <button
            onClick={startCamera}
            className="bg-forest-600 hover:bg-forest-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Riprova
          </button>
          <Link
            href="/"
            className="block mt-4 text-bark-400 hover:text-white text-sm transition-colors"
          >
            Torna alla home
          </Link>
        </div>
      </div>
    );
  }

  if (state === 'camera-error') {
    return (
      <div className="fixed inset-0 bg-bark-900 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-6">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-3">
            Errore Fotocamera
          </h1>
          <p className="text-bark-300 mb-6">
            Non riusciamo ad accedere alla fotocamera. Assicurati che nessun&apos;altra app la stia usando.
          </p>
          <button
            onClick={startCamera}
            className="bg-forest-600 hover:bg-forest-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Riprova
          </button>
          <Link
            href="/"
            className="block mt-4 text-bark-400 hover:text-white text-sm transition-colors"
          >
            Torna alla home
          </Link>
        </div>
      </div>
    );
  }

  // ── Main scanner UI ──────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none">
      {/* Camera video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />

      {/* Detection overlay canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 10 }}
      />

      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 z-20 px-4 pt-[env(safe-area-inset-top,12px)]"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
          paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)',
          paddingBottom: '32px',
        }}
      >
        <div className="flex items-center justify-between mt-2">
          {/* Back button */}
          <Link
            href="/"
            className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          {/* Title */}
          <div className="flex items-center gap-2">
            <span className="text-lg">🍄</span>
            <span className="text-white font-semibold text-sm">CercaFungo Scanner</span>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-3">
            {/* FPS counter */}
            {modelLoaded && (
              <span className="text-xs text-white/60 font-mono">{fps} FPS</span>
            )}

            {/* Classifier badge */}
            {classifierReady && (
              <span className="text-[10px] text-forest-400 font-semibold bg-forest-400/15 px-1.5 py-0.5 rounded">
                AI ID
              </span>
            )}

            {/* Model status */}
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                modelLoaded
                  ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]'
                  : modelLoading
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-red-400'
              }`}
              title={modelLoaded ? 'Modello caricato' : modelLoading ? 'Caricamento...' : 'Modello non caricato'}
            />
          </div>
        </div>

        {/* Mode selector chips */}
        <div className="mt-3 flex items-center gap-2">
          {(
            [
              { mode: 'standard', icon: '🍄' },
              { mode: 'extended', icon: '🔭' },
              { mode: 'morchella', icon: '🌿' },
            ] as { mode: ScannerMode; icon: string }[]
          ).map(({ mode, icon }) => {
            const cfg = getScannerModeConfig(mode);
            const isActive = scannerMode === mode;
            return (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold
                  transition-all duration-200 border ${
                    isActive
                      ? 'bg-forest-600 border-forest-500 text-white shadow-[0_0_12px_rgba(74,124,46,0.4)] scale-105'
                      : 'bg-white/5 border-white/15 text-white/60 hover:bg-white/10 hover:text-white/80 hover:border-white/25'
                  }`}
              >
                <span>{icon}</span>
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active mode hint */}
        <div className="mt-2 px-1">
          <p className="text-white/50 text-xs italic">
            {getScannerModeConfig(scannerMode).hint}
          </p>
        </div>

        {/* Model status banner */}
        {!modelLoaded && !modelLoading && (
          <div className="mt-3 bg-amber-500/20 border border-amber-500/40 rounded-xl px-4 py-3">
            <div className="flex items-start gap-3">
              <span className="text-amber-400 text-lg mt-0.5">⚠️</span>
              <div>
                <p className="text-amber-200 text-sm font-semibold">
                  Modello non caricato
                </p>
                <p className="text-amber-200/70 text-xs mt-1">
                  Il file <code className="bg-black/30 px-1 rounded">mushroom-detector.onnx</code> non
                  e stato trovato in <code className="bg-black/30 px-1 rounded">/models/</code>.
                  {' '}Addestra il modello con la ML pipeline e copialo in{' '}
                  <code className="bg-black/30 px-1 rounded">web/public/models/</code>.
                </p>
                {demoMode && (
                  <p className="text-amber-200/50 text-xs mt-1">
                    La fotocamera funziona — il rilevamento si attivera una volta caricato il modello.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {modelLoading && (
          <div className="mt-3 bg-forest-500/20 border border-forest-500/40 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-forest-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-forest-200 text-sm">Caricamento modello ONNX...</p>
            </div>
          </div>
        )}
      </div>

      {/* Detection counter badge */}
      {totalDetections > 0 && (
        <div className="absolute top-[calc(env(safe-area-inset-top,12px)+64px)] right-4 z-20">
          <div className="bg-forest-600/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {totalDetections} rilevament{totalDetections === 1 ? 'o' : 'i'}
          </div>
        </div>
      )}

      {/* Current detection info bar */}
      {topDetection && (
        <div
          className="absolute left-4 right-4 z-20 animate-fade-in-up"
          style={{ top: 'calc(env(safe-area-inset-top, 12px) + 100px)' }}
        >
          <div className="bg-black/60 backdrop-blur-md rounded-2xl px-4 py-3 flex items-center gap-3 border border-white/10">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0 animate-pulse"
              style={{
                backgroundColor: getConfidenceColorHex(topDetection.confidence),
                boxShadow: `0 0 8px ${getConfidenceColorHex(topDetection.confidence)}60`,
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{topDetection.label}</p>
              <p className="text-white/60 text-xs">
                Confidenza: {Math.round(topDetection.confidence * 100)}%
              </p>
            </div>
            {/* Mini confidence bar */}
            <div className="flex flex-col items-end gap-1">
              <div
                className="text-lg font-bold"
                style={{ color: getConfidenceColorHex(topDetection.confidence) }}
              >
                {Math.round(topDetection.confidence * 100)}%
              </div>
              <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round(topDetection.confidence * 100)}%`,
                    backgroundColor: getConfidenceColorHex(topDetection.confidence),
                  }}
                />
              </div>
            </div>
          {/* Top-3 species predictions */}
          {classification && classification.top3.length > 1 && (
            <div className="mt-2 flex gap-1.5 flex-wrap">
              {classification.top3.map((pred, i) => {
                const sp = SPECIES_DATABASE.find(s => s.id === pred.speciesId);
                if (!sp || pred.confidence < 0.05) return null;
                const isDangerous = sp.edibility === 'tossico' || sp.edibility === 'mortale';
                return (
                  <div
                    key={pred.speciesId}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      i === 0
                        ? isDangerous
                          ? 'bg-red-600/90 text-white'
                          : 'bg-forest-600/90 text-white'
                        : 'bg-white/15 text-white/80'
                    }`}
                  >
                    {isDangerous && <span className="text-[10px]">{sp.edibility === 'mortale' ? '☠' : '⚠'}</span>}
                    <span>{sp.italianName}</span>
                    <span className="opacity-60">{Math.round(pred.confidence * 100)}%</span>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)',
          paddingTop: '48px',
        }}
      >
        {/* Zoom slider */}
        {capabilities?.hasZoom && capabilities.zoomRange && (
          <div className="px-8 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-white/50 text-xs">1x</span>
              <input
                type="range"
                min={capabilities.zoomRange.min}
                max={capabilities.zoomRange.max}
                step={capabilities.zoomRange.step}
                value={zoomLevel}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-white/20 rounded-full appearance-none
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:shadow-lg"
              />
              <span className="text-white/50 text-xs">
                {capabilities.zoomRange.max.toFixed(0)}x
              </span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-around px-8">
          {/* Flash toggle */}
          <button
            onClick={handleFlashToggle}
            disabled={!capabilities?.hasFlash}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              capabilities?.hasFlash
                ? flashOn
                  ? 'bg-amber-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
                : 'bg-white/5 text-white/20 cursor-not-allowed'
            }`}
            aria-label="Flash"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {flashOn ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              ) : (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  <line x1="2" y1="2" x2="22" y2="22" strokeWidth={2} />
                </>
              )}
            </svg>
          </button>

          {/* Capture button — with confidence ring feedback */}
          <button
            onClick={handleCapture}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center
              active:scale-90 transition-all duration-150 relative"
            aria-label="Cattura"
          >
            {/* Animated confidence ring */}
            {topDetection && (
              <div
                className="absolute inset-[-4px] rounded-full border-4 animate-pulse"
                style={{
                  borderColor: getConfidenceColorHex(topDetection.confidence),
                  animationDuration: '1.5s',
                }}
              />
            )}
            <div
              className={`w-16 h-16 rounded-full transition-colors duration-300 ${
                topDetection
                  ? topDetection.confidence > 0.75
                    ? 'bg-green-500 shadow-lg shadow-green-500/40'
                    : topDetection.confidence > 0.5
                    ? 'bg-amber-500 shadow-lg shadow-amber-500/40'
                    : 'bg-red-400 shadow-lg shadow-red-400/40'
                  : 'bg-white/90'
              }`}
            />
          </button>

          {/* Saved detections / gallery */}
          <button
            onClick={() => setShowBottomSheet(!showBottomSheet)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              savedDetections.length > 0
                ? 'bg-forest-600/80 text-white'
                : 'bg-white/10 text-white/70'
            }`}
            aria-label="Catture salvate"
          >
            {savedDetections.length > 0 ? (
              <span className="text-sm font-bold">{savedDetections.length}</span>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Safety disclaimer overlay */}
      {showDisclaimer && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-end justify-center p-4 pb-20">
          <div className="bg-bark-800 border border-amber-500/30 rounded-2xl p-6 max-w-lg w-full animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">⚠️</span>
              <h2 className="text-xl font-bold text-amber-400">Avvertenza Importante</h2>
            </div>
            <div className="space-y-3 text-sm text-bark-200">
              <p>
                <strong className="text-amber-300">CercaFungo NON sostituisce un esperto micologo.</strong>
              </p>
              <p>
                L&apos;identificazione tramite AI puo contenere errori. <strong className="text-red-400">
                Non raccogliere ne consumare MAI funghi basandoti esclusivamente su questa app.</strong>
              </p>
              <p>
                Porta sempre i funghi raccolti a un <strong className="text-white">centro micologico ASL</strong> per
                la verifica prima del consumo.
              </p>
              <p className="text-bark-400 text-xs">
                L&apos;utilizzo di questa app e a tuo rischio e pericolo.
                CercaFungo declina ogni responsabilita per identificazioni errate.
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.setItem('cercafungo_disclaimer_accepted', 'true');
                setShowDisclaimer(false);
              }}
              className="mt-5 w-full bg-forest-600 hover:bg-forest-700 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              Ho capito, procedi
            </button>
          </div>
        </div>
      )}

      {/* Bottom sheet — saved detections */}
      {showBottomSheet && (
        <div className="absolute inset-0 z-40" onClick={() => setShowBottomSheet(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Sheet */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-bark-800/95 backdrop-blur-xl rounded-t-3xl
              max-h-[60vh] overflow-hidden animate-fade-in-up"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-bark-600 rounded-full" />
            </div>

            <div className="px-4 pb-2 flex items-center justify-between">
              <h3 className="text-white font-semibold text-lg">Catture</h3>
              <span className="text-bark-400 text-sm">{savedDetections.length} elementi</span>
            </div>

            <div className="overflow-y-auto max-h-[45vh] px-4 pb-4">
              {savedDetections.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-4xl block mb-3">📷</span>
                  <p className="text-bark-400 text-sm">
                    Nessuna cattura ancora. Premi il pulsante per salvare un rilevamento.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedDetections.map((det) => {
                    const detSpecies = SPECIES_DATABASE.find(
                      (s) =>
                        s.italianName.toLowerCase() === det.label.toLowerCase() ||
                        s.id === det.label.toLowerCase().replace(/\s+/g, '-')
                    );
                    const hasLookalikeDanger =
                      detSpecies && shouldShowLookalikes(detSpecies, det.confidence);

                    return (
                      <div key={det.id} className="space-y-1.5">
                        <div className="flex items-center gap-3 bg-bark-700/60 rounded-xl p-3">
                          {/* Thumbnail */}
                          {det.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={det.imageUrl}
                              alt="Cattura"
                              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-bark-600 flex items-center justify-center flex-shrink-0">
                              <span>🍄</span>
                            </div>
                          )}

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm truncate">{det.label}</p>
                            <p className="text-bark-400 text-xs">
                              {det.timestamp.toLocaleTimeString('it-IT')}
                            </p>
                          </div>

                          {/* Confidence */}
                          {det.confidence > 0 && (
                            <div
                              className="text-sm font-bold flex-shrink-0"
                              style={{ color: getConfidenceColorHex(det.confidence) }}
                            >
                              {Math.round(det.confidence * 100)}%
                            </div>
                          )}
                        </div>

                        {/* Lookalike warning button for this saved detection */}
                        {hasLookalikeDanger && detSpecies && (
                          <button
                            onClick={() => {
                              setShowBottomSheet(false);
                              setShowLookalikeOverlay(true);
                            }}
                            className={`
                              w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold
                              transition-colors
                              ${detSpecies.edibility === 'mortale' || detSpecies.edibility === 'tossico'
                                ? 'bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600/30'
                                : 'bg-orange-500/20 border border-orange-400/40 text-orange-300 hover:bg-orange-500/30'
                              }
                            `}
                          >
                            <span>
                              {detSpecies.edibility === 'mortale' ? '☠️' : '⚠️'}
                            </span>
                            <span>
                              Sosia pericolosi — verifica sicurezza
                            </span>
                            <svg className="w-3.5 h-3.5 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Lookalike comparison overlay ────────────────────────────
          Shows after a capture when the detected species has dangerous lookalikes.
          Rendered as a scrollable bottom-anchored panel on top of the camera feed.  */}
      {showLookalikeOverlay && topDetectionSpecies && (
        <div className="absolute inset-0 bg-black/70 flex items-end" style={{ zIndex: 45 }}>
          <div
            className="w-full bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto animate-fade-in-up"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)' }}
          >
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2 sticky top-0 bg-white border-b border-gray-100 z-10">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔍</span>
                <span className="font-bold text-bark-800 text-sm">Analisi sicurezza</span>
              </div>
              <button
                onClick={() => setShowLookalikeOverlay(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
                aria-label="Chiudi"
              >
                ✕
              </button>
            </div>

            <div className="px-4 pt-3 pb-4 space-y-4">
              {/* Detection summary */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg"
                  style={{ backgroundColor: getConfidenceColorHex(topDetection?.confidence ?? 0) + '22' }}
                >
                  🍄
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-bark-800 text-sm">{topDetectionSpecies.italianName}</p>
                  <p className="text-xs text-bark-400 italic">{topDetectionSpecies.scientificName}</p>
                </div>
                {topDetection && (
                  <div
                    className="text-sm font-bold flex-shrink-0"
                    style={{ color: getConfidenceColorHex(topDetection.confidence) }}
                  >
                    {Math.round(topDetection.confidence * 100)}%
                  </div>
                )}
              </div>

              {/* Safety banner */}
              <SafetyBanner
                variant={
                  topDetectionSpecies.edibility === 'mortale' ||
                  topDetectionSpecies.edibility === 'tossico'
                    ? 'red'
                    : 'amber'
                }
              />

              {/* Lookalike comparison */}
              <LookalikeComparison
                detectedSpecies={topDetectionSpecies}
                confidence={topDetection?.confidence}
                onUnsure={() => setShowLookalikeOverlay(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Lookalike warning badge — visible while scanning when high-danger species detected */}
      {topDetectionSpecies &&
        showLookalikes &&
        !showLookalikeOverlay && (
          <div className="absolute left-4 right-4 animate-fade-in-up" style={{ bottom: '120px', zIndex: 25 }}>
            <button
              onClick={() => setShowLookalikeOverlay(true)}
              className={`
                w-full flex items-center gap-3 rounded-2xl px-4 py-3 border text-left transition-all active:scale-98
                ${topDetectionSpecies.edibility === 'mortale' || topDetectionSpecies.edibility === 'tossico'
                  ? 'bg-red-600/95 border-red-400 text-white'
                  : 'bg-orange-500/95 border-orange-400 text-white'
                }
              `}
            >
              <span className="text-xl flex-shrink-0">
                {topDetectionSpecies.edibility === 'mortale' ? '☠️' : '⚠️'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">Sosia pericolosi rilevati</p>
                <p className="text-xs opacity-85 mt-0.5">
                  {topDetectionSpecies.confusableWith.length} specie simili con pericolo —{' '}
                  tocca per verificare
                </p>
              </div>
              <svg className="w-5 h-5 flex-shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

      {/* Loading overlay */}
      {state === 'loading' && (
        <div className="absolute inset-0 z-30 bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-3 border-forest-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/70 text-sm">Accesso alla fotocamera...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Utility functions ────────────────────────────────────────

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.75) return 'rgba(74, 222, 128, 1)'; // green
  if (confidence >= 0.5) return 'rgba(251, 191, 36, 1)'; // amber
  return 'rgba(248, 113, 113, 1)'; // red
}

function getConfidenceColorHex(confidence: number): string {
  if (confidence >= 0.75) return '#4ade80';
  if (confidence >= 0.5) return '#fbbf24';
  return '#f87171';
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
