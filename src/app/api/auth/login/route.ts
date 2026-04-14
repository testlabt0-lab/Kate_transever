import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as bcrypt from 'bcrypt';

// دالة لإنشاء المستخدمين إذا لم يكونوا موجودين
async function ensureUsersExist() {
  const count = await db.user.count();

  if (count === 0) {
    const users = [
      { username: 'admin', password: 'admin123', role: 'ADMIN' },
      { username: 'test', password: 'test123', role: 'WORKER' },
      { username: 'user', password: 'user123', role: 'WORKER' },
    ];

    for (const u of users) {
      const hashedPassword = await bcrypt.hash(u.password, 10);
      await db.user.create({
        data: {
          username: u.username,
          password: hashedPassword,
          role: u.role as 'ADMIN' | 'WORKER',
        },
      });
    }
  }
}

export async function POST(request: NextRequest) {
  await ensureUsersExist();

  try {
    const body = await request.json();
    const username = (body.username || '').toString().trim().toLowerCase();
    const password = body.password || '';

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, role: user.role },
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء تسجيل الدخول' },
      { status: 500 }
    );
  }
}

export async function GET() {
  await ensureUsersExist();
  const count = await db.user.count();
  return NextResponse.json({ status: 'ok', users: count });
}
