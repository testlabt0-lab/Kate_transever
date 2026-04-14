'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Settings as SettingsIcon,
  Bell,
  Printer,
  Palette,
  Database,
  Globe,
  Clock,
  Truck,
  DollarSign,
  Volume2,
  Moon,
  Sun,
  Monitor,
  Save,
  RotateCcw,
  Download,
  Upload,
  Trash2,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Types
interface User {
  id: string;
  username: string;
  role: string;
}

interface Settings {
  id: string;
  companyName?: string;
  currency: string;
  timezone: string;
  language: string;
  theme: string;
  primaryColor: string;
  fontSize: string;
  compactMode: boolean;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  reminderSoundEnabled: boolean;
  isolatedItemsAlerts: boolean;
  deliveryReminders: boolean;
  printAuto: boolean;
  printHeader?: string;
  printFooter?: string;
  printShowLogo: boolean;
  autoSaveShipments: boolean;
  defaultDeliveryPerson?: string;
  requireDeliveryConfirm: boolean;
  autoCalculateFee: boolean;
  feeRounding: string;
  autoBackup: boolean;
  backupInterval: number;
  lastBackupAt?: string;
}

const TIMEZONES = [
  { value: 'Asia/Aden', label: 'عدن (GMT+3)' },
  { value: 'Asia/Riyadh', label: 'الرياض (GMT+3)' },
  { value: 'Asia/Dubai', label: 'دبي (GMT+4)' },
  { value: 'Africa/Cairo', label: 'القاهرة (GMT+2)' },
  { value: 'Asia/Amman', label: 'عمان (GMT+3)' },
  { value: 'Asia/Beirut', label: 'بيروت (GMT+3)' },
];

const PRIMARY_COLORS = [
  { value: 'emerald', label: 'زمردي', color: 'bg-emerald-500' },
  { value: 'blue', label: 'أزرق', color: 'bg-blue-500' },
  { value: 'purple', label: 'بنفسجي', color: 'bg-purple-500' },
  { value: 'rose', label: 'وردي', color: 'bg-rose-500' },
  { value: 'amber', label: 'كهرماني', color: 'bg-amber-500' },
  { value: 'teal', label: 'فيروزي', color: 'bg-teal-500' },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      window.location.href = '/';
      return;
    }
    setUser(JSON.parse(userData));
    setLoading(false);
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data.settings);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({ title: 'خطأ', description: 'فشل في تحميل الإعدادات', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (user) loadSettings();
  }, [user]);

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'تم الحفظ', description: 'تم حفظ الإعدادات بنجاح' });
        // Apply theme if changed
        if (settings.theme) {
          document.documentElement.classList.remove('light', 'dark');
          if (settings.theme === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.classList.add(isDark ? 'dark' : 'light');
          } else {
            document.documentElement.classList.add(settings.theme);
          }
        }
      } else {
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('هل أنت متأكد من إعادة تعيين جميع الإعدادات؟')) return;

    try {
      const res = await fetch('/api/settings?action=reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        toast({ title: 'تم', description: 'تم إعادة تعيين الإعدادات' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في إعادة التعيين', variant: 'destructive' });
    }
  };

  const updateSetting = (key: keyof Settings, value: any) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
  };

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  if (loading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <DashboardLayout userRole={user?.role as 'ADMIN' | 'WORKER'} username={user?.username || ''} onLogout={handleLogout}>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <SettingsIcon className="h-6 w-6 text-emerald-600" />
              الإعدادات
            </h1>
            <p className="text-sm text-muted-foreground">تخصيص وإدارة إعدادات النظام</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 me-2" />
              إعادة تعيين
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Save className="h-4 w-4 me-2" />}
              حفظ الإعدادات
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full">
            <TabsTrigger value="general" className="text-xs sm:text-sm">
              <Globe className="h-4 w-4 me-1" />
              عام
            </TabsTrigger>
            <TabsTrigger value="appearance" className="text-xs sm:text-sm">
              <Palette className="h-4 w-4 me-1" />
              المظهر
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm">
              <Bell className="h-4 w-4 me-1" />
              الإشعارات
            </TabsTrigger>
            <TabsTrigger value="shipments" className="text-xs sm:text-sm">
              <Truck className="h-4 w-4 me-1" />
              الشحنات
            </TabsTrigger>
            <TabsTrigger value="backup" className="text-xs sm:text-sm">
              <Database className="h-4 w-4 me-1" />
              النسخ الاحتياطي
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">إعدادات عامة</CardTitle>
                <CardDescription>إعدادات الشركة والعملة واللغة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>اسم الشركة/المؤسسة</Label>
                    <Input
                      value={settings.companyName || ''}
                      onChange={(e) => updateSetting('companyName', e.target.value)}
                      placeholder="أدخل اسم الشركة"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>العملة</Label>
                    <Input
                      value={settings.currency}
                      onChange={(e) => updateSetting('currency', e.target.value)}
                      placeholder="ريال"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>المنطقة الزمنية</Label>
                    <Select value={settings.timezone} onValueChange={(v) => updateSetting('timezone', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>اللغة</Label>
                    <Select value={settings.language} onValueChange={(v) => updateSetting('language', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">العربية</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">المظهر</CardTitle>
                <CardDescription>تخصيص مظهر الواجهة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Theme */}
                <div className="space-y-3">
                  <Label>السمة</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div
                      className={`flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer transition-all ${settings.theme === 'light' ? 'border-emerald-500 bg-emerald-50' : 'hover:bg-muted'}`}
                      onClick={() => updateSetting('theme', 'light')}
                    >
                      <Sun className="h-6 w-6 text-amber-500" />
                      <span className="text-sm">فاتح</span>
                    </div>
                    <div
                      className={`flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer transition-all ${settings.theme === 'dark' ? 'border-emerald-500 bg-emerald-50' : 'hover:bg-muted'}`}
                      onClick={() => updateSetting('theme', 'dark')}
                    >
                      <Moon className="h-6 w-6 text-indigo-500" />
                      <span className="text-sm">داكن</span>
                    </div>
                    <div
                      className={`flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer transition-all ${settings.theme === 'system' ? 'border-emerald-500 bg-emerald-50' : 'hover:bg-muted'}`}
                      onClick={() => updateSetting('theme', 'system')}
                    >
                      <Monitor className="h-6 w-6 text-gray-500" />
                      <span className="text-sm">تلقائي</span>
                    </div>
                  </div>
                </div>

                {/* Primary Color */}
                <div className="space-y-3">
                  <Label>اللون الأساسي</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRIMARY_COLORS.map((color) => (
                      <div
                        key={color.value}
                        className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-all ${settings.primaryColor === color.value ? 'border-emerald-500' : 'hover:bg-muted'}`}
                        onClick={() => updateSetting('primaryColor', color.value)}
                      >
                        <div className={`h-5 w-5 rounded-full ${color.color}`} />
                        <span className="text-sm">{color.label}</span>
                        {settings.primaryColor === color.value && (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div className="space-y-2">
                  <Label>حجم الخط</Label>
                  <Select value={settings.fontSize} onValueChange={(v) => updateSetting('fontSize', v)}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">صغير</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="large">كبير</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Compact Mode */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>الوضع المدمج</Label>
                    <p className="text-xs text-muted-foreground">تقليل المسافات لعرض المزيد</p>
                  </div>
                  <Switch
                    checked={settings.compactMode}
                    onCheckedChange={(v) => updateSetting('compactMode', v)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  الإشعارات والتنبيهات
                </CardTitle>
                <CardDescription>إدارة الإشعارات والأصوات</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-blue-500" />
                    <div>
                      <Label>تفعيل الإشعارات</Label>
                      <p className="text-xs text-muted-foreground">إظهار الإشعارات على الشاشة</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.notificationsEnabled}
                    onCheckedChange={(v) => updateSetting('notificationsEnabled', v)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Volume2 className="h-5 w-5 text-purple-500" />
                    <div>
                      <Label>تفعيل الصوت</Label>
                      <p className="text-xs text-muted-foreground">تشغيل صوت عند الإشعارات</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.soundEnabled}
                    onCheckedChange={(v) => updateSetting('soundEnabled', v)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-amber-500" />
                    <div>
                      <Label>صوت التذكيرات</Label>
                      <p className="text-xs text-muted-foreground">تشغيل صوت للتذكيرات والمؤقتات</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.reminderSoundEnabled}
                    onCheckedChange={(v) => updateSetting('reminderSoundEnabled', v)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <div>
                      <Label>تنبيهات العناصر المحايدة</Label>
                      <p className="text-xs text-muted-foreground">تنبيه عند وجود عناصر لم تصل</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.isolatedItemsAlerts}
                    onCheckedChange={(v) => updateSetting('isolatedItemsAlerts', v)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-emerald-500" />
                    <div>
                      <Label>تذكيرات التسليم</Label>
                      <p className="text-xs text-muted-foreground">تذكير بمواعيد التسليم</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.deliveryReminders}
                    onCheckedChange={(v) => updateSetting('deliveryReminders', v)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shipments Settings */}
          <TabsContent value="shipments" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">إعدادات الشحنات</CardTitle>
                <CardDescription>إعدادات إنشاء وتعديل الشحنات</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Save className="h-5 w-5 text-blue-500" />
                    <div>
                      <Label>الحفظ التلقائي</Label>
                      <p className="text-xs text-muted-foreground">حفظ التغييرات تلقائياً بدون ضغط زر الحفظ</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.autoSaveShipments}
                    onCheckedChange={(v) => updateSetting('autoSaveShipments', v)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-amber-500" />
                    <div>
                      <Label>حساب الأجرة تلقائياً</Label>
                      <p className="text-xs text-muted-foreground">حساب الأجرة بناءً على عدد الحبات</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.autoCalculateFee}
                    onCheckedChange={(v) => updateSetting('autoCalculateFee', v)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <div>
                      <Label>طلب تأكيد التسليم</Label>
                      <p className="text-xs text-muted-foreground">طلب تأكيد عند تسليم الشحنة</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.requireDeliveryConfirm}
                    onCheckedChange={(v) => updateSetting('requireDeliveryConfirm', v)}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>تقريب الأجرة</Label>
                  <Select value={settings.feeRounding} onValueChange={(v) => updateSetting('feeRounding', v)}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون تقريب</SelectItem>
                      <SelectItem value="up">تقريب للأعلى</SelectItem>
                      <SelectItem value="down">تقريب للأدنى</SelectItem>
                      <SelectItem value="nearest">تقريب لأقرب رقم</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  إعدادات الطباعة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>طباعة تلقائية</Label>
                    <p className="text-xs text-muted-foreground">طباعة الإيصال تلقائياً بعد الحفظ</p>
                  </div>
                  <Switch
                    checked={settings.printAuto}
                    onCheckedChange={(v) => updateSetting('printAuto', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>إظهار الشعار</Label>
                    <p className="text-xs text-muted-foreground">إظهار الشعار في الإيصالات المطبوعة</p>
                  </div>
                  <Switch
                    checked={settings.printShowLogo}
                    onCheckedChange={(v) => updateSetting('printShowLogo', v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>ترويسة الطباعة</Label>
                  <Input
                    value={settings.printHeader || ''}
                    onChange={(e) => updateSetting('printHeader', e.target.value)}
                    placeholder="نص يظهر في أعلى الإيصال"
                  />
                </div>

                <div className="space-y-2">
                  <Label>تذييل الطباعة</Label>
                  <Input
                    value={settings.printFooter || ''}
                    onChange={(e) => updateSetting('printFooter', e.target.value)}
                    placeholder="نص يظهر في أسفل الإيصال"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backup Settings */}
          <TabsContent value="backup" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">النسخ الاحتياطي</CardTitle>
                <CardDescription>إدارة النسخ الاحتياطي للبيانات</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-blue-500" />
                    <div>
                      <Label>النسخ الاحتياطي التلقائي</Label>
                      <p className="text-xs text-muted-foreground">إنشاء نسخة احتياطية تلقائياً</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.autoBackup}
                    onCheckedChange={(v) => updateSetting('autoBackup', v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>فترة النسخ الاحتياطي (بالأيام)</Label>
                  <Input
                    type="number"
                    value={settings.backupInterval}
                    onChange={(e) => updateSetting('backupInterval', parseInt(e.target.value) || 7)}
                    min={1}
                    max={30}
                    className="w-full sm:w-32"
                  />
                </div>

                {settings.lastBackupAt && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      <span className="text-muted-foreground">آخر نسخة احتياطية:</span>
                      {' '}
                      {new Date(settings.lastBackupAt).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                )}

                <Separator />

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    تصدير البيانات
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" />
                    استيراد البيانات
                  </Button>
                  <Button variant="outline" className="gap-2 text-red-600">
                    <Trash2 className="h-4 w-4" />
                    حذف جميع البيانات
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">ملاحظة مهمة</p>
                    <p className="mt-1">النسخ الاحتياطي التلقائي يتم حفظه محلياً. ننصح بتصدير البيانات دورياً وحفظها في مكان آمن.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
