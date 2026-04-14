import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as bcrypt from 'bcrypt';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const ts = Date.now();
  const id = `X-${ts}-${Math.random().toString(36).slice(2, 5)}`;

  console.log(`\n${'★'.repeat(20)}\n[${id}] X-AUTH POST\n${'★'.repeat(20)}`);

  try {
    const body = await request.json();
    const u = (body.u || body.username || '').trim();
    const p = (body.p || body.password || '').trim();

    console.log(`[${id}] u="${u}" p=${p.length} chars`);

    if (!u || !p) {
      return NextResponse.json({ ok: false, error: 'مطلوب', id, ts }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const user = await db.user.findUnique({ where: { username: u } });
    console.log(`[${id}] user=${user ? user.username : 'null'}`);

    if (!user) {
      return NextResponse.json({ ok: false, error: 'بيانات غير صحيحة', id, ts }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    const valid = await bcrypt.compare(p, user.password);
    console.log(`[${id}] valid=${valid}`);

    if (!valid) {
      return NextResponse.json({ ok: false, error: 'بيانات غير صحيحة', id, ts }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
    console.log(`[${id}] ✓ SUCCESS`);

    return NextResponse.json({
      ok: true,
      token,
      user: { id: user.id, username: user.username, role: user.role },
      id, ts
    }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (e) {
    console.error(`[${id}] ERROR:`, e);
    return NextResponse.json({ ok: false, error: 'خطأ', id, ts }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
