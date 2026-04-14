'use server';

import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

const SESSION_COOKIE_NAME = 'session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // أسبوع واحد

export interface SessionUser {
  id: string;
  username: string;
  role: Role;
}

/**
 * إنشاء جلسة للمستخدم
 */
export async function createSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE * 1000);

  // إنشاء رمز جلسة بسيط
  const sessionToken = Buffer.from(`${userId}:${Date.now()}`).toString('base64');

  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

/**
 * حذف الجلسة
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * الحصول على المستخدم الحالي
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  try {
    const decoded = Buffer.from(sessionToken, 'base64').toString();
    const [userId] = decoded.split(':');

    if (!userId) {
      return null;
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true },
    });

    return user;
  } catch {
    return null;
  }
}

/**
 * التحقق من صحة بيانات الدخول
 */
export async function verifyCredentials(
  username: string,
  password: string
): Promise<SessionUser | null> {
  const user = await db.user.findUnique({
    where: { username },
  });

  if (!user) {
    return null;
  }

  const isValidPassword = await bcrypt.compare(password, user.password);

  if (!isValidPassword) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role,
  };
}

/**
 * التحقق من صلاحيات المستخدم
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  return user;
}

/**
 * التحقق من أن المستخدم Admin
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();

  if (user.role !== Role.ADMIN) {
    throw new Error('FORBIDDEN');
  }

  return user;
}
