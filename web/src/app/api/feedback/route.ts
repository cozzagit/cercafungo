import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { feedback } from '@/db/schema';
import { z } from 'zod';

const FeedbackSchema = z.object({
  userId: z.string().uuid(),
  findingId: z.string().uuid(),
  wasCorrect: z.boolean(),
  actualSpeciesId: z.string().optional(),
  photoUrl: z.string().url().optional(),
});

/**
 * POST /api/feedback
 * Submit user correction for active learning.
 * When a user indicates the AI identification was wrong,
 * they can provide the actual species and optionally a new photo.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = FeedbackSchema.safeParse(body);

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

    const { userId, findingId, wasCorrect, actualSpeciesId, photoUrl } = parsed.data;

    // If the identification was incorrect, actualSpeciesId should be provided
    if (!wasCorrect && !actualSpeciesId) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Se l\'identificazione e errata, fornire la specie corretta (actualSpeciesId)',
          },
        },
        { status: 400 }
      );
    }

    const [inserted] = await db
      .insert(feedback)
      .values({
        userId,
        findingId,
        wasCorrect,
        actualSpeciesId: actualSpeciesId ?? null,
        photoUrl: photoUrl ?? null,
      })
      .returning({ id: feedback.id });

    return NextResponse.json(
      {
        data: { id: inserted.id, message: 'Grazie per il feedback!' },
        meta: { version: 'v1' },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/feedback error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Errore durante il salvataggio del feedback',
        },
      },
      { status: 500 }
    );
  }
}
