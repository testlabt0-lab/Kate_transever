'use server';

import { redirect } from 'next/navigation';
import { createSession, deleteSession, verifyCredentials } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export interface LoginState {
  error?: string;
  success?: boolean;
}

/**
 * Server Action لتسجيل الدخول
 */
export async function login(
  prevState: LoginState | undefined,
  formData: FormData
): Promise<LoginState> {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  // التحقق من البيانات
  if (!username || !password) {
    return { error: 'يرجى إدخال اسم المستخدم وكلمة المرور' };
  }

  // التحقق من صحة البيانات
  const user = await verifyCredentials(username, password);

  if (!user) {
    return { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
  }

  // إنشاء الجلسة
  await createSession(user.id);

  revalidatePath('/');
  redirect('/dashboard');
}

/**
 * Server Action لتسجيل الخروج
 */
export async function logout(): Promise<void> {
  await deleteSession();
  revalidatePath('/');
  redirect('/login');
}
