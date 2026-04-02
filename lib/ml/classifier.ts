/**
 * CercaFungo — Classificatore specie (Stage 2)
 *
 * Dopo il rilevamento generico YOLO, questo modulo classifica
 * la specie specifica del fungo rilevato. In fase di sviluppo
 * restituisce risultati mock basati sul database specie locale.
 */

import { ClassificationResult, Detection } from './types';
import { getSpeciesById, searchSpecies } from '../species/database';

/**
 * Classifica la specie di un fungo rilevato.
 * In produzione usera un modello di classificazione fine-grained.
 */
export async function classifyDetection(
  detection: Detection
): Promise<ClassificationResult | null> {
  // TODO: Inferenza modello classificazione reale
  // Per ora restituisce un risultato mock plausibile

  await new Promise((resolve) => setTimeout(resolve, 100));

  const mockMappings: Record<
    string,
    { speciesId: string; confidence: number }
  > = {
    Porcino: { speciesId: 'boletus-edulis', confidence: 0.85 },
    Chiodino: { speciesId: 'armillaria-mellea', confidence: 0.78 },
    Finferlo: { speciesId: 'cantharellus-cibarius', confidence: 0.82 },
    'Amanita muscaria': { speciesId: 'amanita-muscaria', confidence: 0.91 },
    'Fungo generico': { speciesId: 'boletus-edulis', confidence: 0.35 },
  };

  const mapping = mockMappings[detection.label];
  if (!mapping) return null;

  const species = getSpeciesById(mapping.speciesId);
  if (!species) return null;

  const allSpecies = searchSpecies('');
  const alternatives = allSpecies
    .filter((s) => s.id !== mapping.speciesId)
    .slice(0, 3)
    .map((s) => ({
      speciesId: s.id,
      commonName: s.italianName,
      confidence: Math.max(0.05, mapping.confidence - 0.2 - Math.random() * 0.3),
    }))
    .sort((a, b) => b.confidence - a.confidence);

  return {
    speciesId: species.id,
    commonName: species.italianName,
    scientificName: species.scientificName,
    confidence: mapping.confidence * detection.confidence,
    alternatives,
    toxicityWarning: species.edibility === 'tossico' || species.edibility === 'mortale',
  };
}

/**
 * Batch classify: classifica piu rilevamenti in parallelo.
 */
export async function classifyDetections(
  detections: Detection[]
): Promise<Map<string, ClassificationResult>> {
  const results = new Map<string, ClassificationResult>();

  const classifications = await Promise.all(
    detections.map(async (det) => ({
      id: det.id,
      result: await classifyDetection(det),
    }))
  );

  for (const { id, result } of classifications) {
    if (result) {
      results.set(id, result);
    }
  }

  return results;
}
