import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as bcrypt from 'bcrypt';

// API بسيط للاختبار
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body.username || '').trim();
    const password = String(body.password || '');

    console.log('=== LOGIN TEST ===');
    console.log('Username:', username);
    console.log('Password length:', password.length);

    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: 'يرجى إدخال اسم المستخدم وكلمة المرور',
        debug: { username: username || 'empty', passwordLength: password.length }
      }, { status: 400 });
    }

    // البحث عن المستخدم
    const user = await db.user.findUnique({
      where: { username },
    });

    console.log('User found:', user ? user.username : 'NOT FOUND');

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'المستخدم غير موجود',
        debug: { username, found: false }
      }, { status: 401 });
    }

    // مقارنة كلمة المرور
    const isValid = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isValid);

    if (!isValid) {
      return NextResponse.json({
        success: false,
        error: 'كلمة المرور غير صحيحة',
        debug: { username, passwordValid: false }
      }, { status: 401 });
    }

    // نجاح!
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      error: 'حدث خطأ: ' + String(error)
    }, { status: 500 });
  }
}

// GET endpoint للاختبار
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username') || 'admin';
  const password = searchParams.get('password') || 'admin123';

  // البحث عن المستخدم
  const user = await db.user.findUnique({
    where: { username },
  });

  if (!user) {
    return NextResponse.json({
      success: false,
      error: 'المستخدم غير موجود',
      debug: { username }
    });
  }

  const isValid = await bcrypt.compare(password, user.password);

  return NextResponse.json({
    username: user.username,
    role: user.role,
    passwordValid: isValid,
    storedHashPrefix: user.password.substring(0, 20) + '...'
  });
}
