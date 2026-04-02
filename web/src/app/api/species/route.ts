import { NextRequest, NextResponse } from 'next/server';
import { SPECIES_DATABASE } from '@/lib/species-data';

/**
 * GET /api/species
 * Returns the full species list for app sync.
 * Supports optional query params:
 *   - edibility: filter by edibility category
 *   - q: search by name
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const edibility = searchParams.get('edibility');
  const query = searchParams.get('q');

  let results = [...SPECIES_DATABASE];

  if (edibility) {
    results = results.filter((s) => s.edibility === edibility);
  }

  if (query) {
    const q = query.toLowerCase().trim();
    results = results.filter(
      (s) =>
        s.italianName.toLowerCase().includes(q) ||
        s.scientificName.toLowerCase().includes(q) ||
        s.alternativeNames.some((n) => n.toLowerCase().includes(q))
    );
  }

  return NextResponse.json({
    data: results,
    meta: {
      total: results.length,
      version: 'v1',
    },
  });
}
