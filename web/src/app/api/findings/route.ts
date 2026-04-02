import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { findings } from '@/db/schema';
import { z } from 'zod';

const FindingSchema = z.object({
  userId: z.string().uuid(),
  speciesId: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional(),
  confidence: z.number().min(0).max(1).optional(),
  photoUrl: z.string().url().optional(),
  notes: z.string().max(1000).optional(),
  foundAt: z.string().datetime(),
});

const BatchFindingsSchema = z.object({
  findings: z.array(FindingSchema).min(1).max(100),
});

/**
 * POST /api/findings
 * Sync findings from mobile app to server.
 * Accepts a batch of findings for efficient sync.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = BatchFindingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Dati non validi',
            details: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const values = parsed.data.findings.map((f) => ({
      userId: f.userId,
      speciesId: f.speciesId,
      latitude: f.latitude,
      longitude: f.longitude,
      altitude: f.altitude ?? null,
      confidence: f.confidence ?? null,
      photoUrl: f.photoUrl ?? null,
      notes: f.notes ?? null,
      foundAt: new Date(f.foundAt),
    }));

    const inserted = await db
      .insert(findings)
      .values(values)
      .returning({ id: findings.id });

    return NextResponse.json(
      {
        data: {
          synced: inserted.length,
          ids: inserted.map((r) => r.id),
        },
        meta: { version: 'v1' },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/findings error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Errore durante il salvataggio dei ritrovamenti',
        },
      },
      { status: 500 }
    );
  }
}
