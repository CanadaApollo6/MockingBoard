import { NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { isAdmin } from '@/lib/firebase/admin';
import { adminDb } from '@/lib/firebase/firebase-admin';

const DOC_PATH = 'config/draftDay';

/** Seconds per pick by round in the NFL Draft. */
function getPickSeconds(overall: number): number {
  if (overall <= 32) return 600; // Round 1: 10 min
  if (overall <= 64) return 420; // Round 2: 7 min
  return 300; // Rounds 3-7: 5 min
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.uid)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const doc = await adminDb.doc(DOC_PATH).get();
  const data = doc.data() ?? {};

  return NextResponse.json({
    mode: data.mode ?? 'countdown',
    currentPick: data.currentPick ?? 0,
    clockExpiresAt: data.clockExpiresAt?.toDate?.() ?? null,
  });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.uid)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();

  // Mode change
  if (body.mode) {
    const valid = ['countdown', 'live', 'complete'];
    if (!valid.includes(body.mode))
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

    await adminDb
      .doc(DOC_PATH)
      .set(
        { mode: body.mode, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
    return NextResponse.json({ ok: true, mode: body.mode });
  }

  // Start clock for a pick
  if (body.startClock) {
    const pick = body.pick as number;
    if (!pick || pick < 1)
      return NextResponse.json(
        { error: 'Invalid pick number' },
        { status: 400 },
      );

    const seconds = getPickSeconds(pick);
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + seconds * 1000));

    await adminDb.doc(DOC_PATH).set(
      {
        currentPick: pick,
        clockExpiresAt: expiresAt,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return NextResponse.json({ ok: true, pick, seconds });
  }

  // Pause / clear clock
  if (body.pauseClock) {
    await adminDb.doc(DOC_PATH).set(
      {
        clockExpiresAt: null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'No action specified' }, { status: 400 });
}
