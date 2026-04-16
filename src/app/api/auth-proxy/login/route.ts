import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as bcrypt from 'bcrypt';
import { signToken } from '@/lib/tokens';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const serverTime = Date.now();
  const responseId = `R-${serverTime}-${Math.random().toString(36).slice(2, 6)}`;

  console.log(`\n======= [${responseId}] NEW LOGIN REQUEST =======`);

  try {
    const body = await request.json();
    const clientTime = body._ts || 0;
    const username = (body.username || '').trim();
    const password = (body.password || '').trim();

    console.log(`[${responseId}] Client time: ${clientTime}`);
    console.log(`[${responseId}] Server time: ${serverTime}`);
    console.log(`[${responseId}] Username: "${username}"`);
    console.log(`[${responseId}] Password length: ${password.length}`);

    if (!username || !password) {
      console.log(`[${responseId}] MISSING CREDENTIALS`);
      return new NextResponse(JSON.stringify({
        success: false,
        error: 'بيانات الدخول مطلوبة',
        responseId,
        serverTime,
        clientTime
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'X-Response-ID': responseId,
        }
      });
    }

    console.log(`[${responseId}] Querying database...`);
    const user = await db.user.findUnique({
      where: { username }
    });

    console.log(`[${responseId}] User found: ${user ? user.username : 'NULL'}`);

    if (!user) {
      console.log(`[${responseId}] USER NOT FOUND`);
      return new NextResponse(JSON.stringify({
        success: false,
        error: 'بيانات الدخول غير صحيحة',
        responseId,
        serverTime,
        clientTime
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'X-Response-ID': responseId,
        }
      });
    }

    console.log(`[${responseId}] Comparing password...`);
    const valid = await bcrypt.compare(password, user.password);
    console.log(`[${responseId}] Password valid: ${valid}`);

    if (!valid) {
      console.log(`[${responseId}] INVALID PASSWORD`);
      return new NextResponse(JSON.stringify({
        success: false,
        error: 'بيانات الدخول غير صحيحة',
        responseId,
        serverTime,
        clientTime
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'X-Response-ID': responseId,
        }
      });
    }

    const token = signToken(user.id);
    console.log(`[${responseId}] SUCCESS!`);

    return new NextResponse(JSON.stringify({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      responseId,
      serverTime,
      clientTime
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'X-Response-ID': responseId,
      }
    });

  } catch (error) {
    console.error(`[${responseId}] ERROR:`, error);
    return new NextResponse(JSON.stringify({
      success: false,
      error: 'خطأ في الخادم',
      responseId,
      serverTime,
      details: error instanceof Error ? error.message : 'Unknown'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      }
    });
  }
}
