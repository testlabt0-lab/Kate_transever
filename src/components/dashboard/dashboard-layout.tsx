'use client';

import { Sidebar } from './sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole?: 'ADMIN' | 'WORKER';
  username?: string;
  onLogout?: () => void;
}

export function DashboardLayout({ children, userRole = 'WORKER', username = 'مستخدم', onLogout }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background" dir="rtl">
      <Sidebar userRole={userRole as 'ADMIN' | 'WORKER'} username={username} onLogout={onLogout} />
      <main className="flex-1 flex flex-col min-h-screen">
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-3 sm:p-4 md:p-6 pb-24 md:pb-6 max-w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
