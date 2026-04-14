'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import {
  LayoutDashboard,
  Users,
  Truck,
  Package,
  Receipt,
  FileText,
  DollarSign,
  TrendingUp,
  Settings,
  LogOut,
  Leaf,
  Plus,
  Wallet,
  Menu,
  Eye,
  Bell,
  Calendar,
  History,
  Timer,
  Layers,
  BarChart3,
  CreditCard,
  Clock,
  MapPin,
} from 'lucide-react';

interface SidebarProps {
  userRole: 'ADMIN' | 'WORKER';
  username: string;
  onLogout?: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    title: 'لوحة التحكم',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-4 w-4 sm:h-5 sm:w-5" />,
  },
  {
    title: 'المراقبة',
    href: '/dashboard/monitoring',
    icon: <Eye className="h-4 w-4 sm:h-5 sm:w-5" />,
    adminOnly: true,
  },
  {
    title: 'مراجعة اليوم',
    href: '/dashboard/daily-review',
    icon: <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />,
  },
  {
    title: 'المؤقتات والمنبهات',
    href: '/dashboard/timers-reminders',
    icon: <Timer className="h-4 w-4 sm:h-5 sm:w-5" />,
  },
  {
    title: 'رواكب الميش',
    href: '/dashboard/rawakib',
    icon: <Layers className="h-4 w-4 sm:h-5 sm:w-5" />,
  },
  {
    title: 'الحضور',
    href: '/dashboard/attendance',
    icon: <Clock className="h-4 w-4 sm:h-5 sm:w-5" />,
    adminOnly: true,
  },
  {
    title: 'المزارعين',
    href: '/dashboard/farmers',
    icon: <Users className="h-4 w-4 sm:h-5 sm:w-5" />,
    adminOnly: true,
  },
  {
    title: 'الوكلاء',
    href: '/dashboard/agents',
    icon: <Users className="h-4 w-4 sm:h-5 sm:w-5" />,
    adminOnly: true,
  },
  {
    title: 'الناقلين',
    href: '/dashboard/transporters',
    icon: <Truck className="h-4 w-4 sm:h-5 sm:w-5" />,
    adminOnly: true,
  },
  {
    title: 'الموصلين',
    href: '/dashboard/delivery-persons',
    icon: <Truck className="h-4 w-4 sm:h-5 sm:w-5" />,
    adminOnly: true,
  },
  {
    title: 'تسيير القات',
    href: '/dashboard/khat-management',
    icon: <Leaf className="h-4 w-4 sm:h-5 sm:w-5" />,
  },
  {
    title: 'الشحنات',
    href: '/dashboard/shipments',
    icon: <Package className="h-4 w-4 sm:h-5 sm:w-5" />,
  },
  {
    title: 'التتبع',
    href: '/dashboard/tracking',
    icon: <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />,
    adminOnly: true,
  },
  {
    title: 'الحسابات',
    href: '/dashboard/accounts',
    icon: <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />,
  },
  {
    title: 'المصاريف',
    href: '/dashboard/expenses',
    icon: <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />,
  },
  {
    title: 'الفواتير',
    href: '/dashboard/invoices',
    icon: <FileText className="h-4 w-4 sm:h-5 sm:w-5" />,
    adminOnly: true,
  },
  {
    title: 'الديون',
    href: '/dashboard/debts',
    icon: <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />,
    adminOnly: true,
  },
  {
    title: 'التقارير',
    href: '/dashboard/reports',
    icon: <FileText className="h-4 w-4 sm:h-5 sm:w-5" />,
    adminOnly: true,
  },
  {
    title: 'الأرباح',
    href: '/dashboard/profits',
    icon: <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />,
    adminOnly: true,
  },
  {
    title: 'التحليلات',
    href: '/dashboard/analytics',
    icon: <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />,
    adminOnly: true,
  },
  {
    title: 'المعاملات',
    href: '/dashboard/transactions',
    icon: <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />,
    adminOnly: true,
  },
  {
    title: 'سجل النشاطات',
    href: '/dashboard/activity-logs',
    icon: <History className="h-4 w-4 sm:h-5 sm:w-5" />,
    adminOnly: true,
  },
  {
    title: 'الإعدادات',
    href: '/dashboard/settings',
    icon: <Settings className="h-4 w-4 sm:h-5 sm:w-5" />,
    adminOnly: true,
  },
];

function SidebarContent({
  userRole,
  username,
  onLogout,
  onNavigate,
}: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();

  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly && userRole !== 'ADMIN') {
      return false;
    }
    return true;
  });

  function handleLogout() {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('loggedIn');
      localStorage.removeItem('username');
      localStorage.removeItem('role');
      window.location.href = '/';
    }
  }

  const isItemActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-border">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
            <Leaf className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-base md:text-lg">نظام تصدير القات</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">إدارة المحاسبة</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-2 sm:p-3 border-b border-border flex gap-2">
        <Link href="/dashboard/shipment/new" onClick={onNavigate} className="flex-1">
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2 h-9 sm:h-10 text-xs sm:text-sm">
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            شحنة جديدة
          </Button>
        </Link>
        <LanguageToggle />
        <ThemeToggle />
        <NotificationBell userRole={userRole} />
      </div>

      {/* User Info */}
      <div className="p-3 sm:p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm sm:text-base">
              {username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-sm sm:text-base">{username}</p>
            <p className="text-xs text-muted-foreground">
              {userRole === 'ADMIN' ? 'مدير' : 'عامل'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 p-1.5 sm:p-2">
        <nav className="space-y-0.5 sm:space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = isItemActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {item.icon}
                {item.title}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 sm:p-4 border-t border-border">
        <Separator className="mb-3 sm:mb-4" />
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start gap-2 sm:gap-3 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 h-9 sm:h-10 text-xs sm:text-sm"
        >
          <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );
}

export function Sidebar({ userRole, username, onLogout }: SidebarProps) {
  const [open, setOpen] = useState(false);

  const handleNavigate = () => {
    setOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col h-screen w-56 lg:w-64 border-s border-border sticky top-0">
        <SidebarContent userRole={userRole} username={username} onLogout={onLogout} />
      </div>

      {/* Mobile Header & Sheet */}
      <div className="md:hidden">
        {/* Mobile Header */}
        <div className="fixed top-0 right-0 left-0 z-40 h-12 sm:h-14 bg-background/95 backdrop-blur border-b border-border flex items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-2">
            <div className="p-1 sm:p-1.5 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
              <Leaf className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="font-bold text-sm sm:text-base">نظام القات</span>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 sm:w-80 p-0">
              <SidebarContent
                userRole={userRole}
                username={username}
                onLogout={onLogout}
                onNavigate={handleNavigate}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  );
}
