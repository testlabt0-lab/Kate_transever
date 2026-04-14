'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, LogIn, Leaf } from 'lucide-react';

export default function HomePage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        localStorage.setItem('session_token', 'session_' + Date.now());
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/dashboard';
      } else {
        setError(data.error || 'بيانات الدخول غير صحيحة');
        setIsPending(false);
      }
    } catch {
      setError('حدث خطأ في الاتصال');
      setIsPending(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 p-4">
      {/* Logo */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-emerald-600 rounded-2xl shadow-lg mb-3">
          <Leaf className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-400">
          نظام تصدير القات
        </h1>
        <p className="text-sm text-muted-foreground mt-1">إدارة المحاسبة والشحنات</p>
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-sm sm:max-w-md shadow-xl border-0">
        <CardHeader className="space-y-1 text-center pb-2">
          <CardTitle className="text-xl sm:text-2xl font-bold">تسجيل الدخول</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            أدخل بيانات حسابك للوصول إلى لوحة التحكم
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4 pt-2">
            {error && (
              <Alert variant="destructive" className="text-xs sm:text-sm">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm">اسم المستخدم</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                required
                disabled={isPending}
                className="text-right h-10 sm:h-11"
                dir="rtl"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                disabled={isPending}
                className="text-right h-10 sm:h-11"
                dir="rtl"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>

          <CardFooter className="flex-col gap-4 pt-2">
            <Button
              type="submit"
              className="w-full h-10 sm:h-11 bg-emerald-600 hover:bg-emerald-700 text-sm sm:text-base"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                <>
                  <LogIn className="me-2 h-4 w-4" />
                  تسجيل الدخول
                </>
              )}
            </Button>

            {/* بيانات تجريبية */}
            <div className="text-center text-xs text-muted-foreground w-full bg-muted/50 rounded-lg p-3">
              <p className="font-medium mb-1">بيانات تجريبية:</p>
              <div className="flex justify-center gap-4">
                <span className="font-mono">admin / admin123</span>
                <span className="font-mono">test / test123</span>
              </div>
            </div>
          </CardFooter>
        </form>
      </Card>

      {/* Footer */}
      <p className="mt-6 text-xs text-muted-foreground text-center">
        © 2024 نظام تصدير القات - جميع الحقوق محفوظة
      </p>
    </div>
  );
}
