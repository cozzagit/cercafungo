'use client';

/**
 * AddFindingModal — Modal/bottom-sheet for adding a new mushroom finding.
 *
 * Features:
 * - Species searchable dropdown (from SPECIES_DATABASE + free text)
 * - GPS auto-detect + manual lat/lng input
 * - Date picker (default today)
 * - Confidence slider
 * - Notes textarea
 * - Optional photo upload (base64)
 */

import { useState, useCallback, useRef } from 'react';
import { SPECIES_DATABASE } from '@/lib/species-data';
import type { NewFinding } from '@/lib/findings-store';

// ── Types ──────────────────────────────────────────────────────────

interface AddFindingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (finding: NewFinding) => void;
  /** Pre-fill coordinates (from map click or GPS) */
  prefilledLat?: number;
  prefilledLng?: number;
}

// ── Species list for dropdown ─────────────────────────────────────

interface SpeciesOption {
  id: string;
  display: string;
  scientific: string;
  edibility: 'commestibile' | 'tossico' | 'sconosciuto';
}

const SPECIES_OPTIONS: SpeciesOption[] = SPECIES_DATABASE.map((s) => ({
  id: s.id,
  display: s.italianName,
  scientific: s.scientificName,
  edibility:
    s.edibility === 'ottimo' ||
    s.edibility === 'buono' ||
    s.edibility === 'commestibile'
      ? 'commestibile'
      : s.edibility === 'tossico' || s.edibility === 'mortale'
      ? 'tossico'
      : 'sconosciuto',
}));

// ── Helpers ───────────────────────────────────────────────────────

function todayIso(): string {
  const now = new Date();
  // Format: YYYY-MM-DDTHH:MM
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Component ──────────────────────────────────────────────────────

export default function AddFindingModal({
  isOpen,
  onClose,
  onSave,
  prefilledLat,
  prefilledLng,
}: AddFindingModalProps) {
  // Species search
  const [speciesQuery, setSpeciesQuery] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesOption | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Location
  const [lat, setLat] = useState<string>(prefilledLat?.toFixed(5) ?? '');
  const [lng, setLng] = useState<string>(prefilledLng?.toFixed(5) ?? '');
  const [altitude, setAltitude] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  // Other fields
  const [date, setDate] = useState(todayIso());
  const [confidence, setConfidence] = useState(80);
  const [notes, setNotes] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
  const [photoLoading, setPhotoLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Species search ─────────────────────────────────────────────

  const filteredSpecies = SPECIES_OPTIONS.filter(
    (s) =>
      s.display.toLowerCase().includes(speciesQuery.toLowerCase()) ||
      s.scientific.toLowerCase().includes(speciesQuery.toLowerCase())
  ).slice(0, 8);

  const handleSpeciesSelect = (s: SpeciesOption) => {
    setSelectedSpecies(s);
    setSpeciesQuery(s.display);
    setShowDropdown(false);
  };

  // ── GPS ───────────────────────────────────────────────────────

  const handleGpsDetect = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('GPS non disponibile su questo dispositivo');
      return;
    }
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(5));
        setLng(pos.coords.longitude.toFixed(5));
        if (pos.coords.altitude != null) {
          setAltitude(Math.round(pos.coords.altitude).toString());
        }
        setGpsLoading(false);
      },
      (err) => {
        setGpsError(
          err.code === 1
            ? 'Permesso GPS negato. Inserisci le coordinate manualmente.'
            : 'Impossibile ottenere la posizione GPS.'
        );
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // ── Photo ─────────────────────────────────────────────────────

  const handlePhotoChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setPhotoLoading(true);
      try {
        const base64 = await fileToBase64(file);
        // Resize to max 800px to keep localStorage reasonable
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = (height * maxDim) / width;
              width = maxDim;
            } else {
              width = (width * maxDim) / height;
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          setPhotoDataUrl(canvas.toDataURL('image/jpeg', 0.8));
          setPhotoLoading(false);
        };
        img.onerror = () => {
          setPhotoDataUrl(base64);
          setPhotoLoading(false);
        };
        img.src = base64;
      } catch {
        setPhotoLoading(false);
      }
    },
    []
  );

  // ── Validate & Save ───────────────────────────────────────────

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!speciesQuery.trim()) errs.species = 'Inserisci il nome della specie';
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || latNum < 35 || latNum > 48) {
      errs.lat = 'Latitudine non valida (Italy: 35–48)';
    }
    if (isNaN(lngNum) || lngNum < 6 || lngNum > 19) {
      errs.lng = 'Longitudine non valida (Italy: 6–19)';
    }
    if (!date) errs.date = 'Inserisci la data';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    const finding: NewFinding = {
      date: new Date(date).toISOString(),
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      altitude: altitude ? parseInt(altitude, 10) : undefined,
      speciesName: selectedSpecies?.display ?? speciesQuery.trim(),
      scientificName: selectedSpecies?.scientific,
      speciesId: selectedSpecies?.id,
      edibility: selectedSpecies?.edibility ?? 'sconosciuto',
      confidence,
      notes: notes.trim() || undefined,
      photoDataUrl,
    };

    onSave(finding);
    setSaving(false);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setSpeciesQuery('');
    setSelectedSpecies(null);
    setLat(prefilledLat?.toFixed(5) ?? '');
    setLng(prefilledLng?.toFixed(5) ?? '');
    setAltitude('');
    setDate(todayIso());
    setConfidence(80);
    setNotes('');
    setPhotoDataUrl(undefined);
    setErrors({});
    setGpsError('');
  };

  if (!isOpen) return null;

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bark-900/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative bg-cream-50 w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-bark-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cream-300">
          <div>
            <h2 className="text-lg font-bold text-bark-800 font-[family-name:var(--font-playfair)]">
              Nuovo Ritrovamento
            </h2>
            <p className="text-xs text-bark-400 mt-0.5">Segna dove hai trovato il fungo</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-cream-200 hover:bg-cream-300 text-bark-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5">

          {/* Species */}
          <div className="relative">
            <label className="block text-xs font-semibold text-bark-600 mb-1.5 uppercase tracking-wide">
              Specie *
            </label>
            <input
              type="text"
              value={speciesQuery}
              onChange={(e) => {
                setSpeciesQuery(e.target.value);
                setSelectedSpecies(null);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Es. Porcino, Gallinaccio..."
              className={`w-full px-3 py-2.5 bg-white border rounded-xl text-bark-800 text-sm placeholder:text-bark-300 outline-none transition-all ${
                errors.species
                  ? 'border-red-400 ring-1 ring-red-400'
                  : 'border-cream-400 focus:border-forest-500 focus:ring-1 focus:ring-forest-500'
              }`}
            />
            {errors.species && (
              <p className="text-red-500 text-xs mt-1">{errors.species}</p>
            )}

            {/* Dropdown */}
            {showDropdown && speciesQuery.length > 0 && filteredSpecies.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-cream-300 rounded-xl shadow-xl z-10 overflow-hidden">
                {filteredSpecies.map((s) => (
                  <button
                    key={s.id}
                    onMouseDown={() => handleSpeciesSelect(s)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-cream-100 text-left transition-colors"
                  >
                    <div>
                      <div className="text-sm font-semibold text-bark-800">{s.display}</div>
                      <div className="text-xs text-bark-400 italic">{s.scientific}</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${
                        s.edibility === 'commestibile'
                          ? 'bg-green-100 text-green-700'
                          : s.edibility === 'tossico'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {s.edibility}
                    </span>
                  </button>
                ))}
                {/* Free text option */}
                <button
                  onMouseDown={() => {
                    setSelectedSpecies(null);
                    setShowDropdown(false);
                  }}
                  className="w-full px-3 py-2.5 hover:bg-cream-100 text-left text-xs text-bark-400 border-t border-cream-200 transition-colors"
                >
                  Usa &ldquo;{speciesQuery}&rdquo; come nome personalizzato
                </button>
              </div>
            )}
          </div>

          {/* GPS coordinates */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-bark-600 uppercase tracking-wide">
                Posizione *
              </label>
              <button
                onClick={handleGpsDetect}
                disabled={gpsLoading}
                className="flex items-center gap-1.5 text-xs bg-forest-600 hover:bg-forest-700 disabled:opacity-50 text-white px-3 py-1 rounded-lg font-semibold transition-colors"
              >
                {gpsLoading ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Rilevamento...
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06z" />
                    </svg>
                    GPS Attuale
                  </>
                )}
              </button>
            </div>

            {gpsError && (
              <p className="text-amber-600 text-xs mb-2">{gpsError}</p>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <input
                  type="number"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="Lat (es. 46.17)"
                  step="0.00001"
                  className={`w-full px-2 py-2 bg-white border rounded-xl text-bark-800 text-xs placeholder:text-bark-300 outline-none transition-all ${
                    errors.lat
                      ? 'border-red-400 ring-1 ring-red-400'
                      : 'border-cream-400 focus:border-forest-500 focus:ring-1 focus:ring-forest-500'
                  }`}
                />
                {errors.lat && <p className="text-red-500 text-[10px] mt-0.5">{errors.lat}</p>}
              </div>
              <div className="col-span-1">
                <input
                  type="number"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="Lng (es. 9.87)"
                  step="0.00001"
                  className={`w-full px-2 py-2 bg-white border rounded-xl text-bark-800 text-xs placeholder:text-bark-300 outline-none transition-all ${
                    errors.lng
                      ? 'border-red-400 ring-1 ring-red-400'
                      : 'border-cream-400 focus:border-forest-500 focus:ring-1 focus:ring-forest-500'
                  }`}
                />
                {errors.lng && <p className="text-red-500 text-[10px] mt-0.5">{errors.lng}</p>}
              </div>
              <div className="col-span-1">
                <input
                  type="number"
                  value={altitude}
                  onChange={(e) => setAltitude(e.target.value)}
                  placeholder="Alt (m)"
                  min={0}
                  max={4800}
                  className="w-full px-2 py-2 bg-white border border-cream-400 rounded-xl text-bark-800 text-xs placeholder:text-bark-300 outline-none focus:border-forest-500 focus:ring-1 focus:ring-forest-500 transition-all"
                />
              </div>
            </div>
            <p className="text-[10px] text-bark-400 mt-1">
              Latitudine · Longitudine · Altitudine opzionale
            </p>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-bark-600 mb-1.5 uppercase tracking-wide">
              Data e Ora *
            </label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`w-full px-3 py-2.5 bg-white border rounded-xl text-bark-800 text-sm outline-none transition-all ${
                errors.date
                  ? 'border-red-400 ring-1 ring-red-400'
                  : 'border-cream-400 focus:border-forest-500 focus:ring-1 focus:ring-forest-500'
              }`}
            />
          </div>

          {/* Confidence */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-bark-600 uppercase tracking-wide">
                Confidenza identificazione
              </label>
              <span
                className={`text-sm font-bold ${
                  confidence >= 70
                    ? 'text-green-600'
                    : confidence >= 40
                    ? 'text-amber-600'
                    : 'text-red-500'
                }`}
              >
                {confidence}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={confidence}
              onChange={(e) => setConfidence(parseInt(e.target.value, 10))}
              className="w-full accent-forest-600 h-1.5"
            />
            <div className="flex justify-between text-[10px] text-bark-400 mt-0.5">
              <span>Incerto</span>
              <span>Certo al 100%</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-bark-600 mb-1.5 uppercase tracking-wide">
              Note
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Es. Tre esemplari sotto i larici, zona nord..."
              rows={3}
              className="w-full px-3 py-2.5 bg-white border border-cream-400 rounded-xl text-bark-800 text-sm placeholder:text-bark-300 outline-none resize-none focus:border-forest-500 focus:ring-1 focus:ring-forest-500 transition-all"
            />
          </div>

          {/* Photo */}
          <div>
            <label className="block text-xs font-semibold text-bark-600 mb-1.5 uppercase tracking-wide">
              Foto (opzionale)
            </label>
            {photoDataUrl ? (
              <div className="relative rounded-xl overflow-hidden h-36">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoDataUrl}
                  alt="Anteprima foto"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setPhotoDataUrl(undefined)}
                  className="absolute top-2 right-2 w-7 h-7 bg-bark-900/70 hover:bg-bark-900 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={photoLoading}
                className="w-full h-24 border-2 border-dashed border-cream-400 hover:border-forest-500 rounded-xl flex flex-col items-center justify-center gap-2 text-bark-400 hover:text-forest-600 transition-colors"
              >
                {photoLoading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                    <span className="text-xs font-medium">Scatta o carica foto</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 pt-2 flex gap-3 border-t border-cream-200 bg-cream-50 sticky bottom-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-cream-200 hover:bg-cream-300 text-bark-700 font-semibold rounded-xl text-sm transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-forest-600 hover:bg-forest-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Salvataggio...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Salva Ritrovamento
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
