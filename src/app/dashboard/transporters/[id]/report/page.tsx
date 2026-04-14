'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowRight,
  Users,
  Package,
  Leaf,
  Truck,
  Loader2,
  Calendar,
  Phone,
  Share2,
  FileText,
  Clock,
  MessageCircle,
  Send,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

interface KhatTypeData {
  name: string;
  pieces: number;
}

interface FarmerReport {
  id: string;
  name: string;
  fullName: string | null;
  phone: string | null;
  totalPieces: number;
  khatTypes: KhatTypeData[];
  shipmentsCount: number;
}

interface ReportData {
  transporter: {
    id: string;
    name: string;
    phone: string | null;
  };
  summary: {
    totalFarmers: number;
    totalPieces: number;
    totalShipments: number;
    totalAgents: number;
  };
  khatTypesSummary: KhatTypeData[];
  farmers: FarmerReport[];
}

interface User {
  id: string;
  username: string;
  role: string;
}

export default function TransporterReportPage() {
  const params = useParams();
  const router = useRouter();
  const transporterId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('session_token');
    if (userData && token) {
      setUser(JSON.parse(userData));
    } else {
      window.location.href = '/login';
    }
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (dateFrom) queryParams.append('dateFrom', dateFrom);
      if (dateTo) queryParams.append('dateTo', dateTo);

      const res = await fetch(`/api/transporters/${transporterId}/report?${queryParams.toString()}`);
      const data = await res.json();
      setReport(data);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  }, [transporterId, dateFrom, dateTo]);

  useEffect(() => {
    if (user) loadReport();
  }, [user, loadReport]);

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const setToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setDateFrom(today);
    setDateTo(today);
  };

  const setThisWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    setDateFrom(startOfWeek.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
  };

  const setThisMonth = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setDateFrom(startOfMonth.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ar-YE').format(num);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ar-YE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <DashboardLayout userRole={user.role as 'ADMIN' | 'WORKER'} username={user.username} onLogout={handleLogout}>
      <div className="space-y-4 sm:space-y-6">
        {/* الرأس */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard/transporters')}
              className="h-9 w-9"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">تقرير الموصل</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                قائمة المزارعين والكميات المنقولة
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : report ? (
          <>
            {/* معلومات الموصل */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center flex-shrink-0">
                    <Truck className="h-7 w-7 sm:h-8 sm:w-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold">{report.transporter.name}</h2>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-muted-foreground">
                      {report.transporter.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          <span>{report.transporter.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* فلترة التاريخ */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  فلترة حسب التاريخ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">من تاريخ</Label>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">إلى تاريخ</Label>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-2 flex items-end gap-2">
                      <Button size="sm" variant="outline" onClick={setToday} className="flex-1">
                        اليوم
                      </Button>
                      <Button size="sm" variant="outline" onClick={setThisWeek} className="flex-1">
                        الأسبوع
                      </Button>
                      <Button size="sm" variant="outline" onClick={setThisMonth} className="flex-1">
                        الشهر
                      </Button>
                      {(dateFrom || dateTo) && (
                        <Button size="sm" variant="ghost" onClick={clearFilters}>
                          مسح
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* بطاقات الإحصائيات */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                    <span className="text-xs sm:text-sm text-muted-foreground">المزارعين</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold mt-1">{report.summary.totalFarmers}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                    <span className="text-xs sm:text-sm text-muted-foreground">الشحنات</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold mt-1">{report.summary.totalShipments}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2">
                    <Leaf className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                    <span className="text-xs sm:text-sm text-muted-foreground">الحبات</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold mt-1">
                    {formatNumber(report.summary.totalPieces)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                    <span className="text-xs sm:text-sm text-muted-foreground">الوكلاء</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold mt-1">{report.summary.totalAgents}</p>
                </CardContent>
              </Card>
            </div>

            {/* ملخص أنواع القات */}
            {report.khatTypesSummary.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-emerald-600" />
                    ملخص أنواع القات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {report.khatTypesSummary.map((khat, index) => (
                      <Badge key={index} variant="secondary" className="text-sm py-1.5 px-3">
                        {khat.name}: <span className="font-bold mr-1">{formatNumber(khat.pieces)} حبة</span>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* زر المشاركة */}
            <Button
              onClick={() => setShowShareDialog(true)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Share2 className="h-4 w-4" />
              مشاركة مع الموصل
            </Button>

            {/* جدول المزارعين */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  تفاصيل المزارعين ({report.farmers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 sm:p-4">
                {report.farmers.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    لا توجد شحنات مسجلة
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-right font-semibold">المزارع</TableHead>
                          <TableHead className="text-center font-semibold">الشحنات</TableHead>
                          <TableHead className="text-center font-semibold">الحبات</TableHead>
                          <TableHead className="text-center font-semibold">أنواع القات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.farmers.map((farmer, index) => (
                          <TableRow key={farmer.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                            <TableCell className="font-medium">{farmer.name}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{farmer.shipmentsCount}</Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {formatNumber(farmer.totalPieces)}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-wrap justify-center gap-1">
                                {farmer.khatTypes.map((khat, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {khat.name}: {formatNumber(khat.pieces)}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}

                        {/* صف الإجمالي */}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell className="font-bold">الإجمالي</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="default" className="bg-emerald-600">
                              {report.summary.totalShipments}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-bold">
                            {formatNumber(report.summary.totalPieces)}
                          </TableCell>
                          <TableCell className="text-center">-</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              لم يتم العثور على بيانات الموصل
            </CardContent>
          </Card>
        )}

        {/* نافذة المشاركة */}
        <TransporterShareDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          reportData={report}
        />
      </div>
    </DashboardLayout>
  );
}

// نافذة المشاركة للموصل
function TransporterShareDialog({
  open,
  onOpenChange,
  reportData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportData: ReportData | null;
}) {
  const [dateOption, setDateOption] = useState<'today' | 'custom' | 'none'>('today');
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [includeKhatSummary, setIncludeKhatSummary] = useState(true);
  const [includeFarmerDetails, setIncludeFarmerDetails] = useState(true);
  const [copied, setCopied] = useState(false);

  const formatNumber = (num: number) => new Intl.NumberFormat('ar-YE').format(num);

  const formatDisplayDate = () => {
    switch (dateOption) {
      case 'today':
        return new Date().toLocaleDateString('ar-SA', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      case 'custom':
        if (customDate) {
          return new Date(customDate).toLocaleDateString('ar-SA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        }
        return '';
      case 'none':
        return '';
    }
  };

  const generateReportText = (): string => {
    if (!reportData) return '';

    const lines: string[] = [];

    // العنوان
    lines.push('═══════════════════════════════');
    lines.push('🚚 تقرير شحنة القات');
    lines.push('═══════════════════════════════');
    lines.push('');

    // معلومات الموصل
    lines.push(`👤 الموصل: ${reportData.transporter.name}`);
    if (reportData.transporter.phone) {
      lines.push(`📱 الهاتف: ${reportData.transporter.phone}`);
    }
    lines.push('');

    // التاريخ
    if (dateOption !== 'none') {
      lines.push(`📅 التاريخ: ${formatDisplayDate()}`);
      lines.push('');
    }

    // ملخص عام
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 ملخص الشحنة');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push(`👥 عدد المزارعين: ${reportData.summary.totalFarmers} مزارع`);
    lines.push(`📦 عدد الشحنات: ${reportData.summary.totalShipments} شحنة`);
    lines.push(`📦 إجمالي الحبات: ${formatNumber(reportData.summary.totalPieces)} حبة`);
    lines.push('');

    // ملخص أنواع القات
    if (includeKhatSummary && reportData.khatTypesSummary.length > 0) {
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      lines.push('📋 ملخص أنواع القات');
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      reportData.khatTypesSummary.forEach((khat) => {
        lines.push(`• ${khat.name}: ${formatNumber(khat.pieces)} حبة`);
      });
      lines.push('');
    }

    // تفاصيل المزارعين
    if (includeFarmerDetails && reportData.farmers.length > 0) {
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      lines.push('👨‍🌾 تفاصيل المزارعين');
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      for (const farmer of reportData.farmers) {
        const khatDetails = farmer.khatTypes.map(k => `${k.name}: ${formatNumber(k.pieces)}`).join('، ');
        lines.push(`• ${farmer.name}`);
        lines.push(`  📦 ${formatNumber(farmer.totalPieces)} حبة (${khatDetails})`);
      }
      lines.push('');
    }

    lines.push('═══════════════════════════════');
    lines.push('🚚 نظام توصيل القات');
    lines.push('═══════════════════════════════');

    return lines.join('\n');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateReportText());
      setCopied(true);
      toast.success('تم نسخ التقرير!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('فشل في نسخ التقرير');
    }
  };

  const shareWhatsApp = (phone?: string) => {
    const text = encodeURIComponent(generateReportText());
    const phoneNumber = phone || reportData?.transporter.phone;

    let url = '';
    if (phoneNumber) {
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      url = `https://wa.me/${cleanPhone}?text=${text}`;
    } else {
      url = `https://wa.me/?text=${text}`;
    }

    window.open(url, '_blank');
  };

  const shareTelegram = (phone?: string) => {
    const text = encodeURIComponent(generateReportText());
    const phoneNumber = phone || reportData?.transporter.phone;

    let url = '';
    if (phoneNumber) {
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      url = `https://t.me/+${cleanPhone}?text=${text}`;
    } else {
      url = `https://t.me/share/url?url=&text=${text}`;
    }

    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Share2 className="h-5 w-5 text-emerald-600" />
            مشاركة مع الموصل
          </DialogTitle>
          <DialogDescription>
            اختر خيارات المشاركة (بدون أجرة)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* خيار التاريخ */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              التاريخ
            </Label>
            <RadioGroup value={dateOption} onValueChange={(v) => setDateOption(v as 'today' | 'custom' | 'none')}>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="today" id="today" />
                <Label htmlFor="today" className="text-sm">تاريخ اليوم</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="text-sm">اختيار تاريخ محدد</Label>
              </div>
              {dateOption === 'custom' && (
                <Input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="mt-2 mr-6"
                />
              )}
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="none" id="none" />
                <Label htmlFor="none" className="text-sm">بدون تاريخ</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* خيارات المحتوى */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">محتوى التقرير</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="khat-summary"
                  checked={includeKhatSummary}
                  onCheckedChange={(checked) => setIncludeKhatSummary(checked as boolean)}
                />
                <Label htmlFor="khat-summary" className="text-sm">
                  ملخص أنواع القات
                </Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="farmer-details"
                  checked={includeFarmerDetails}
                  onCheckedChange={(checked) => setIncludeFarmerDetails(checked as boolean)}
                />
                <Label htmlFor="farmer-details" className="text-sm">
                  تفاصيل المزارعين
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* معاينة */}
          {reportData && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <Label className="text-xs text-muted-foreground">معاينة الملخص</Label>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  👥 {formatNumber(reportData.summary.totalFarmers)} مزارع
                </Badge>
                <Badge variant="secondary">
                  📦 {formatNumber(reportData.summary.totalPieces)} حبة
                </Badge>
                <Badge variant="secondary">
                  🚚 {reportData.summary.totalShipments} شحنة
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ✓ بدون أجرة أو عمولة
              </p>
            </div>
          )}

          {/* أزرار المشاركة */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
            <Button
              variant="outline"
              className="gap-2 bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900 border-green-200 dark:border-green-800"
              onClick={() => shareWhatsApp()}
            >
              <MessageCircle className="h-4 w-4 text-green-600" />
              <span className="text-xs sm:text-sm">واتساب</span>
            </Button>

            <Button
              variant="outline"
              className="gap-2 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950 dark:hover:bg-sky-900 border-sky-200 dark:border-sky-800"
              onClick={() => shareTelegram()}
            >
              <Send className="h-4 w-4 text-sky-600" />
              <span className="text-xs sm:text-sm">تليجرام</span>
            </Button>

            <Button
              variant="outline"
              className="gap-2"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className="text-xs sm:text-sm">نسخ</span>
            </Button>
          </div>

          {/* إرسال مباشر للموصل */}
          {reportData?.transporter.phone && (
            <div className="flex gap-2">
              <Button
                variant="default"
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                onClick={() => shareWhatsApp(reportData.transporter.phone!)}
              >
                <MessageCircle className="h-4 w-4" />
                إرسال للموصل واتساب
              </Button>
              <Button
                variant="default"
                className="flex-1 gap-2 bg-sky-600 hover:bg-sky-700"
                onClick={() => shareTelegram(reportData.transporter.phone!)}
              >
                <Send className="h-4 w-4" />
                إرسال للموصل تليجرام
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
