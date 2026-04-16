import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as bcrypt from 'bcrypt';
import { signToken } from '@/lib/tokens';

const ENDPOINT_ID = `V2-${Date.now()}`;

console.log(`\n🟣 V2 LOGIN ENDPOINT LOADED: ${ENDPOINT_ID}`);

export async function POST(request: NextRequest) {
  console.log(`\n🟣 V2 REQUEST - Endpoint: ${ENDPOINT_ID}`);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: 'Invalid JSON',
      endpoint: ENDPOINT_ID,
    }, { status: 400 });
  }

  const { username, password } = body;
  const cleanUsername = typeof username === 'string' ? username.trim() : '';
  const cleanPassword = typeof password === 'string' ? password.trim() : '';

  console.log(`🟣 V2 - username: "${cleanUsername}", password length: ${cleanPassword.length}`);

  if (!cleanUsername || !cleanPassword) {
    return NextResponse.json({
      success: false,
      error: 'بيانات الدخول مطلوبة',
      endpoint: ENDPOINT_ID,
    }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { username: cleanUsername }
  });

  console.log(`🟣 V2 - User found: ${user ? user.username : 'null'}`);

  if (!user) {
    return NextResponse.json({
      success: false,
      error: 'بيانات الدخول غير صحيحة',
      endpoint: ENDPOINT_ID,
    }, { status: 401 });
  }

  const isValid = await bcrypt.compare(cleanPassword, user.password);
  console.log(`🟣 V2 - Password valid: ${isValid}`);

  if (!isValid) {
    return NextResponse.json({
      success: false,
      error: 'بيانات الدخول غير صحيحة',
      endpoint: ENDPOINT_ID,
    }, { status: 401 });
  }

  const token = signToken(user.id);

  return NextResponse.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    },
    endpoint: ENDPOINT_ID,
  }, { status: 200 });
}
