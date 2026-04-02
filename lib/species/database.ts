/**
 * CercaFungo — Funzioni di ricerca e lookup specie
 *
 * Tutte le funzioni operano sul SPECIES_DATABASE importato da data.ts
 * che usa l'interfaccia Species con campi: italianName, capDescription,
 * habitat (string[]), altitude ([min, max]), season ({ start, end, peak }),
 * confusableWith, edibility, ecc.
 */

import { SPECIES_DATABASE, type Species } from './data';

// ── Lookup singolo ──────────────────────────────────────────

export function getSpeciesById(id: string): Species | undefined {
  return SPECIES_DATABASE.find((s) => s.id === id);
}

// ── Ricerca full-text ───────────────────────────────────────

export function searchSpecies(query: string): Species[] {
  if (!query.trim()) return [...SPECIES_DATABASE];

  const q = query.toLowerCase().trim();

  return SPECIES_DATABASE.filter(
    (s) =>
      s.italianName.toLowerCase().includes(q) ||
      s.scientificName.toLowerCase().includes(q) ||
      s.alternativeNames.some((n) => n.toLowerCase().includes(q)) ||
      s.family.toLowerCase().includes(q) ||
      s.capDescription.toLowerCase().includes(q)
  );
}

// ── Filtri singoli ──────────────────────────────────────────

export function getSpeciesByEdibility(
  edibility: Species['edibility']
): Species[] {
  return SPECIES_DATABASE.filter((s) => s.edibility === edibility);
}

/**
 * Restituisce le specie la cui stagione copre il mese indicato (1-12).
 */
export function getSpeciesBySeason(month: number): Species[] {
  return SPECIES_DATABASE.filter((s) => {
    const { start, end } = s.season;
    // gestisce wrap (es. start=11, end=2 → nov-feb)
    if (start <= end) return month >= start && month <= end;
    return month >= start || month <= end;
  });
}

export function getSpeciesByHabitat(habitat: string): Species[] {
  const h = habitat.toLowerCase();
  return SPECIES_DATABASE.filter((s) =>
    s.habitat.some((hab) => hab.toLowerCase().includes(h))
  );
}

/**
 * Filtra specie che vivono a una data altitudine (m s.l.m.).
 */
export function getSpeciesForAltitude(altitude: number): Species[] {
  return SPECIES_DATABASE.filter(
    (s) => altitude >= s.altitude[0] && altitude <= s.altitude[1]
  );
}

// ── Filtri specifici ────────────────────────────────────────

/**
 * Tutti i porcini (gruppo Boletus edulis sensu lato).
 */
export function getPorciniSpecies(): Species[] {
  return SPECIES_DATABASE.filter(
    (s) =>
      s.family === 'Boletaceae' &&
      (s.edibility === 'ottimo' || s.edibility === 'buono') &&
      s.scientificName.startsWith('Boletus')
  );
}

/**
 * Specie tossiche e mortali — per avvisi di sicurezza.
 */
export function getDangerousSpecies(): Species[] {
  return SPECIES_DATABASE.filter(
    (s) => s.edibility === 'tossico' || s.edibility === 'mortale'
  );
}

// ── Sosia pericolosi ────────────────────────────────────────

/**
 * Restituisce le specie con cui una data specie puo essere confusa,
 * ordinate per livello di pericolo (mortale prima).
 */
export function getDangerousLookalikes(speciesId: string): Species[] {
  const species = getSpeciesById(speciesId);
  if (!species) return [];

  const dangerOrder: Record<string, number> = {
    mortale: 0,
    alto: 1,
    medio: 2,
    basso: 3,
  };

  return species.confusableWith
    .sort(
      (a, b) =>
        (dangerOrder[a.dangerLevel] ?? 9) -
        (dangerOrder[b.dangerLevel] ?? 9)
    )
    .map((c) => getSpeciesById(c.speciesId))
    .filter((s): s is Species => s !== undefined);
}

/**
 * Restituisce info di confusione tra due specie (se esiste).
 */
export function getConfusionInfo(
  speciesId: string,
  lookalikeId: string
): Species['confusableWith'][number] | undefined {
  const species = getSpeciesById(speciesId);
  if (!species) return undefined;
  return species.confusableWith.find((c) => c.speciesId === lookalikeId);
}

// ── Filtro combinato ────────────────────────────────────────

export interface SpeciesFilters {
  query?: string;
  edibility?: Species['edibility'];
  month?: number;
  habitat?: string;
  altitude?: number;
  size?: Species['typicalSize'];
  visibility?: Species['visibility'];
}

export function filterSpecies(filters: SpeciesFilters): Species[] {
  let results = [...SPECIES_DATABASE];

  if (filters.query?.trim()) {
    results = searchSpecies(filters.query).filter((s) => results.includes(s));
  }
  if (filters.edibility) {
    results = results.filter((s) => s.edibility === filters.edibility);
  }
  if (filters.month !== undefined) {
    results = results.filter((s) => {
      const { start, end } = s.season;
      if (start <= end) return filters.month! >= start && filters.month! <= end;
      return filters.month! >= start || filters.month! <= end;
    });
  }
  if (filters.habitat) {
    const h = filters.habitat.toLowerCase();
    results = results.filter((s) =>
      s.habitat.some((hab) => hab.toLowerCase().includes(h))
    );
  }
  if (filters.altitude !== undefined) {
    results = results.filter(
      (s) =>
        filters.altitude! >= s.altitude[0] &&
        filters.altitude! <= s.altitude[1]
    );
  }
  if (filters.size) {
    results = results.filter((s) => s.typicalSize === filters.size);
  }
  if (filters.visibility) {
    results = results.filter((s) => s.visibility === filters.visibility);
  }

  return results;
}

// ── Raggruppamenti ──────────────────────────────────────────

export function getSpeciesGroupedByEdibility(): Record<string, Species[]> {
  const groups: Record<string, Species[]> = {};
  for (const species of SPECIES_DATABASE) {
    if (!groups[species.edibility]) groups[species.edibility] = [];
    groups[species.edibility].push(species);
  }
  return groups;
}

// ── Statistiche ─────────────────────────────────────────────

export function getStats() {
  return {
    totale: SPECIES_DATABASE.length,
    commestibili: SPECIES_DATABASE.filter((s) =>
      ['ottimo', 'buono', 'commestibile'].includes(s.edibility)
    ).length,
    tossici: SPECIES_DATABASE.filter((s) => s.edibility === 'tossico').length,
    mortali: SPECIES_DATABASE.filter((s) => s.edibility === 'mortale').length,
    famiglie: [...new Set(SPECIES_DATABASE.map((s) => s.family))].length,
  };
}

// ── Etichette italiane ──────────────────────────────────────

export const EDIBILITY_LABELS: Record<Species['edibility'], string> = {
  ottimo: 'Ottimo commestibile',
  buono: 'Buon commestibile',
  commestibile: 'Commestibile',
  non_commestibile: 'Non commestibile',
  tossico: 'Tossico',
  mortale: 'MORTALE',
};

export const EDIBILITY_COLORS: Record<Species['edibility'], string> = {
  ottimo: '#27AE60',
  buono: '#2ECC71',
  commestibile: '#F39C12',
  non_commestibile: '#95A5A6',
  tossico: '#E67E22',
  mortale: '#C0392B',
};

export function getSeasonLabel(month: number): string {
  const labels: Record<number, string> = {
    1: 'Gennaio', 2: 'Febbraio', 3: 'Marzo', 4: 'Aprile',
    5: 'Maggio', 6: 'Giugno', 7: 'Luglio', 8: 'Agosto',
    9: 'Settembre', 10: 'Ottobre', 11: 'Novembre', 12: 'Dicembre',
  };
  return labels[month] ?? '';
}

/**
 * Etichette italiane per le stagioni (tipo stringa da constants.ts).
 */
export const SEASON_LABELS: Record<string, string> = {
  primavera: 'Primavera',
  estate: 'Estate',
  autunno: 'Autunno',
  inverno: 'Inverno',
};

/**
 * Etichette italiane per gli habitat (tipo stringa da constants.ts).
 */
export const HABITAT_LABELS: Record<string, string> = {
  bosco_conifere: 'Bosco di conifere',
  bosco_latifoglie: 'Bosco di latifoglie',
  bosco_misto: 'Bosco misto',
  prato: 'Prato',
  alpino: 'Alpino',
};

/**
 * Restituisce le specie confondibili con una data specie,
 * ordinate per livello di pericolo.
 */
export function getConfusionSpecies(speciesId: string): Species[] {
  const species = getSpeciesById(speciesId);
  if (!species) return [];

  const dangerOrder: Record<string, number> = {
    mortale: 0,
    alto: 1,
    medio: 2,
    basso: 3,
  };

  return species.confusableWith
    .sort(
      (a, b) =>
        (dangerOrder[a.dangerLevel] ?? 9) -
        (dangerOrder[b.dangerLevel] ?? 9)
    )
    .map((c) => getSpeciesById(c.speciesId))
    .filter((s): s is Species => s !== undefined);
}

/**
 * Restituisce tutte le specie del database.
 */
export function getAllSpecies(): Species[] {
  return [...SPECIES_DATABASE];
}
