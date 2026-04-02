import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { speciesSightings } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

/**
 * GET /api/heatmap
 * Returns aggregated sighting data for map heatmap display.
 * Query params:
 *   - species: species ID (optional, filters to one species)
 *   - month: month number 1-12 (optional)
 *   - year: year (optional)
 *   - minLat, maxLat, minLng, maxLng: bounding box (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const speciesId = searchParams.get('species');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const minLat = searchParams.get('minLat');
    const maxLat = searchParams.get('maxLat');
    const minLng = searchParams.get('minLng');
    const maxLng = searchParams.get('maxLng');

    const conditions = [];

    if (speciesId) {
      conditions.push(eq(speciesSightings.speciesId, speciesId));
    }
    if (month) {
      conditions.push(eq(speciesSightings.month, parseInt(month, 10)));
    }
    if (year) {
      conditions.push(eq(speciesSightings.year, parseInt(year, 10)));
    }
    if (minLat) {
      conditions.push(gte(speciesSightings.latitude, parseFloat(minLat)));
    }
    if (maxLat) {
      conditions.push(lte(speciesSightings.latitude, parseFloat(maxLat)));
    }
    if (minLng) {
      conditions.push(gte(speciesSightings.longitude, parseFloat(minLng)));
    }
    if (maxLng) {
      conditions.push(lte(speciesSightings.longitude, parseFloat(maxLng)));
    }

    const query = conditions.length > 0
      ? db.select().from(speciesSightings).where(and(...conditions)).limit(5000)
      : db.select().from(speciesSightings).limit(5000);

    const results = await query;

    return NextResponse.json({
      data: results.map((r) => ({
        speciesId: r.speciesId,
        lat: r.latitude,
        lng: r.longitude,
        month: r.month,
        year: r.year,
        count: r.count,
      })),
      meta: {
        total: results.length,
        version: 'v1',
      },
    });
  } catch (error) {
    console.error('GET /api/heatmap error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Errore durante il recupero dei dati heatmap',
        },
      },
      { status: 500 }
    );
  }
}
