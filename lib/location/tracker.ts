/**
 * CercaFungo — GPS Tracker per sessioni di ricerca
 *
 * Traccia la posizione dell'utente durante la scansione per:
 * 1. Geolocalizzare i ritrovamenti
 * 2. Calcolare la distanza percorsa
 * 3. Mostrare il percorso sulla mappa
 */

import * as Location from 'expo-location';
import { GPS_TRACKING_INTERVAL_MS, MIN_GPS_ACCURACY_M } from '../constants';

export interface TrackPoint {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  timestamp: number;
}

export interface TrackingSession {
  startTime: number;
  endTime: number | null;
  points: TrackPoint[];
  distanceMeters: number;
  isActive: boolean;
}

let currentSession: TrackingSession | null = null;
let watchSubscription: Location.LocationSubscription | null = null;

/**
 * Richiede i permessi di localizzazione.
 * Restituisce true se i permessi sono stati concessi.
 */
export async function requestLocationPermission(): Promise<boolean> {
  const { status: foregroundStatus } =
    await Location.requestForegroundPermissionsAsync();

  if (foregroundStatus !== 'granted') {
    return false;
  }

  return true;
}

/**
 * Ottieni la posizione corrente.
 */
export async function getCurrentLocation(): Promise<TrackPoint | null> {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitude: location.coords.altitude,
      accuracy: location.coords.accuracy ?? 999,
      timestamp: location.timestamp,
    };
  } catch {
    console.warn('[CercaFungo] Impossibile ottenere posizione GPS');
    return null;
  }
}

/**
 * Avvia una sessione di tracking GPS.
 */
export async function startTracking(): Promise<boolean> {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) return false;

  // Ferma sessione precedente se attiva
  if (currentSession?.isActive) {
    await stopTracking();
  }

  currentSession = {
    startTime: Date.now(),
    endTime: null,
    points: [],
    distanceMeters: 0,
    isActive: true,
  };

  try {
    watchSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: GPS_TRACKING_INTERVAL_MS,
        distanceInterval: 5, // minimo 5 metri tra punti
      },
      (location) => {
        if (!currentSession?.isActive) return;

        const point: TrackPoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          altitude: location.coords.altitude,
          accuracy: location.coords.accuracy ?? 999,
          timestamp: location.timestamp,
        };

        // Ignora punti con accuratezza bassa
        if (point.accuracy > MIN_GPS_ACCURACY_M) return;

        // Calcola distanza dall'ultimo punto
        if (currentSession.points.length > 0) {
          const lastPoint =
            currentSession.points[currentSession.points.length - 1];
          const dist = haversineDistance(
            lastPoint.latitude,
            lastPoint.longitude,
            point.latitude,
            point.longitude
          );
          currentSession.distanceMeters += dist;
        }

        currentSession.points.push(point);
      }
    );

    return true;
  } catch {
    console.warn('[CercaFungo] Errore avvio tracking GPS');
    currentSession = null;
    return false;
  }
}

/**
 * Ferma la sessione di tracking.
 */
export async function stopTracking(): Promise<TrackingSession | null> {
  if (watchSubscription) {
    watchSubscription.remove();
    watchSubscription = null;
  }

  if (currentSession) {
    currentSession.isActive = false;
    currentSession.endTime = Date.now();
    const session = { ...currentSession };
    currentSession = null;
    return session;
  }

  return null;
}

/**
 * Ottieni la sessione corrente.
 */
export function getCurrentSession(): TrackingSession | null {
  return currentSession ? { ...currentSession } : null;
}

/**
 * Controlla se il tracking e attivo.
 */
export function isTracking(): boolean {
  return currentSession?.isActive ?? false;
}

/**
 * Calcola la distanza in metri tra due coordinate GPS (formula di Haversine).
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // raggio Terra in metri
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
