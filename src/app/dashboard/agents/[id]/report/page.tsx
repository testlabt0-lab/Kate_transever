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
  DollarSign,
  Loader2,
  Calendar,
  Phone,
  FileText,
  Share2,
  FileSpreadsheet,
  Clock,
  Send,
} from 'lucide-react';
import { ShareReportDialog } from '@/components/share-report-dialog';

interface Agent {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
}

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
  totalFee: number;
  totalBags: number;
  khatTypes: KhatTypeData[];
  lastShipment: string | null;
  shipmentsCount: number;
}

interface ReportData {
  agent: Agent;
  summary: {
    totalFarmers: number;
    totalPieces: number;
    totalFee: number;
    totalBags: number;
    totalShipments: number;
    totalDebt: number;
  };
  khatTypesSummary: KhatTypeData[];
  farmers: FarmerReport[];
  filters: {
    dateFrom: string | null;
    dateTo: string | null;
  };
}

interface User {
  id: string;
  username: string;
  role: string;
}

export default function AgentReportPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

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

      const res = await fetch(`/api/agents/${agentId}/report?${queryParams.toString()}`);
      const data = await res.json();
      setReport(data);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  }, [agentId, dateFrom, dateTo]);

  useEffect(() => {
    if (user) loadReport();
  }, [user, loadReport]);

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // تعيين فترات زمنية سريعة
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

  // تنسيق التاريخ
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ar-YE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // تنسيق العملة
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-YE').format(amount) + ' ريال';
  };

  // تنسيق الأرقام
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ar-YE').format(num);
  };

  // تصدير Excel
  const exportToExcel = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (dateFrom) queryParams.append('dateFrom', dateFrom);
      if (dateTo) queryParams.append('dateTo', dateTo);

      const res = await fetch(`/api/agents/${agentId}/export?${queryParams.toString()}`);
      const blob = await res.blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `تقرير_${report?.agent.name}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  // تحضير بيانات المشاركة
  const getShareReportData = () => {
    if (!report) return null;

    return {
      agent: report.agent,
      summary: {
        totalFarmers: report.summary.totalFarmers,
        totalPieces: report.summary.totalPieces,
        totalBags: report.summary.totalBags,
        totalFee: report.summary.totalFee,
        totalDebt: report.summary.totalDebt,
      },
      khatTypesSummary: report.khatTypesSummary,
      farmers: report.farmers.map(f => ({
        name: f.name,
        pieces: f.totalPieces,
        bags: f.totalBags,
        khatTypes: f.khatTypes,
        fee: f.totalFee,
      })),
      date: new Date().toISOString(),
    };
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
      <div className="space-y-4 sm:space-y-6 print:p-0">
        {/* الرأس */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard/agents')}
              className="h-9 w-9"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">تقرير الوكيل</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                عرض تفصيلي لشحنات الوكيل والمزارعين
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
            {/* معلومات الوكيل */}
            <Card className="print:shadow-none print:border-0">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-7 w-7 sm:h-8 sm:w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold">{report.agent.name}</h2>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-muted-foreground">
                      {report.agent.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          <span>{report.agent.phone}</span>
                        </div>
                      )}
                      {report.agent.balance > 0 && (
                        <Badge variant="destructive">
                          ديون: {formatCurrency(report.agent.balance)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* فلترة التاريخ */}
            <Card className="print:hidden">
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
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
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
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    <span className="text-xs sm:text-sm text-muted-foreground">العدل</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold mt-1">
                    {formatNumber(report.summary.totalBags)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                    <span className="text-xs sm:text-sm text-muted-foreground">الأجرة</span>
                  </div>
                  <p className="text-lg sm:text-xl font-bold mt-1">{formatCurrency(report.summary.totalFee)}</p>
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

            {/* الديون السابقة */}
            {report.summary.totalDebt > 0 && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">ديون سابقة غير مسددة</p>
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        أجرة شحنات سابقة لم يتم تسديدها
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
                        {formatCurrency(report.summary.totalDebt)}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        الإجمالي الكلي: {formatCurrency(report.summary.totalFee + report.summary.totalDebt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* أزرار المشاركة */}
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button
                onClick={() => setShowShareDialog(true)}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Share2 className="h-4 w-4" />
                مشاركة التقرير
              </Button>

              <Button
                variant="outline"
                onClick={exportToExcel}
                className="gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                تصدير Excel
              </Button>

              {report.agent.phone && (
                <>
                  <Button
                    variant="outline"
                    className="gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                    onClick={() => {
                      const text = `📱 تقرير شحنة الوكيل: ${report.agent.name}\n📦 إجمالي الحبات: ${formatNumber(report.summary.totalPieces)}\n💰 الأجرة: ${formatCurrency(report.summary.totalFee)}`;
                      window.open(`https://wa.me/${report.agent.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                  >
                    <Send className="h-4 w-4" />
                    واتساب مباشر
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200"
                    onClick={() => {
                      const text = `📱 تقرير شحنة الوكيل: ${report.agent.name}\n📦 إجمالي الحبات: ${formatNumber(report.summary.totalPieces)}\n💰 الأجرة: ${formatCurrency(report.summary.totalFee)}`;
                      window.open(`https://t.me/+${report.agent.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                  >
                    <Send className="h-4 w-4" />
                    تليجرام مباشر
                  </Button>
                </>
              )}
            </div>

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
                    لا توجد شحنات مسجلة{dateFrom || dateTo ? ' في الفترة المحددة' : ''}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-right font-semibold">المزارع</TableHead>
                          <TableHead className="text-center font-semibold">الشحنات</TableHead>
                          <TableHead className="text-center font-semibold">الحبات</TableHead>
                          <TableHead className="text-center font-semibold">العدل</TableHead>
                          <TableHead className="text-center font-semibold hidden sm:table-cell">أنواع القات</TableHead>
                          <TableHead className="text-center font-semibold">الأجرة</TableHead>
                          <TableHead className="text-center font-semibold hidden md:table-cell">آخر إرسال</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.farmers.map((farmer, index) => (
                          <TableRow key={farmer.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center flex-shrink-0">
                                  <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <span>{farmer.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{farmer.shipmentsCount}</Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {formatNumber(farmer.totalPieces)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {farmer.totalBags}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center hidden sm:table-cell">
                              <div className="flex flex-wrap justify-center gap-1">
                                {farmer.khatTypes.slice(0, 3).map((khat, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {khat.name}: {formatNumber(khat.pieces)}
                                  </Badge>
                                ))}
                                {farmer.khatTypes.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{farmer.khatTypes.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-medium text-amber-600">
                              {formatCurrency(farmer.totalFee)}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground hidden md:table-cell">
                              <div className="flex items-center justify-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(farmer.lastShipment)}
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
                          <TableCell className="text-center font-bold">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 font-bold">
                              {formatNumber(report.summary.totalBags)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center hidden sm:table-cell">-</TableCell>
                          <TableCell className="text-center font-bold text-amber-600">
                            {formatCurrency(report.summary.totalFee)}
                          </TableCell>
                          <TableCell className="text-center hidden md:table-cell">-</TableCell>
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
              لم يتم العثور على بيانات الوكيل
            </CardContent>
          </Card>
        )}

        {/* نافذة المشاركة */}
        <ShareReportDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          reportData={getShareReportData()}
          loading={loading}
        />
      </div>
    </DashboardLayout>
  );
}
