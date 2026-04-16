import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as bcrypt from 'bcrypt';
import { signToken } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ts = Date.now();
  const id = `G-${ts}`;

  const { searchParams } = new URL(request.url);
  const pageId = searchParams.get('pageId') || 'none';
  const clientTime = searchParams.get('time') || '0';
  const username = (searchParams.get('u') || '').trim();
  const password = (searchParams.get('p') || '').trim();

  console.log(`\n${'='.repeat(50)}`);
  console.log(`[${id}] GET LOGIN REQUEST`);
  console.log(`[${id}] Page ID: ${pageId}`);
  console.log(`[${id}] Client Time: ${clientTime}`);
  console.log(`[${id}] Server Time: ${ts}`);
  console.log(`[${id}] Username: "${username}"`);
  console.log(`[${id}] Password: ${password.length} chars`);

  if (!username || !password) {
    console.log(`[${id}] MISSING CREDENTIALS`);
    return NextResponse.json({
      ok: false,
      error: 'بيانات مطلوبة',
      id, ts, pageId
    }, { headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const user = await db.user.findUnique({ where: { username } });
    console.log(`[${id}] DB User: ${user ? user.username : 'NULL'}`);

    if (!user) {
      console.log(`[${id}] USER NOT FOUND`);
      return NextResponse.json({
        ok: false,
        error: 'بيانات غير صحيحة',
        id, ts, pageId
      }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    const valid = await bcrypt.compare(password, user.password);
    console.log(`[${id}] Password valid: ${valid}`);

    if (!valid) {
      console.log(`[${id}] INVALID PASSWORD`);
      return NextResponse.json({
        ok: false,
        error: 'بيانات غير صحيحة',
        id, ts, pageId
      }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    const token = signToken(user.id);
    console.log(`[${id}] SUCCESS!`);

    return NextResponse.json({
      ok: true,
      token,
      user: { id: user.id, username: user.username, role: user.role },
      id, ts, pageId
    }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (e) {
    console.error(`[${id}] ERROR:`, e);
    return NextResponse.json({
      ok: false,
      error: 'خطأ في الخادم',
      id, ts, pageId
    }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
