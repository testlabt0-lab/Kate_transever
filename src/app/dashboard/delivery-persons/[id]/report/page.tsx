'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  Truck,
  Users,
  Package,
  Leaf,
  Phone,
  Calendar,
  ArrowRight,
  Share2,
  MessageCircle,
  Copy,
  Check,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface FarmerData {
  farmer: { id: string; name: string; phone: string | null };
  totalPieces: number;
  totalBags: number;
  khatTypes: Array<{ name: string; pieces: number }>;
  shipmentCount: number;
  shipments: Array<{
    date: Date;
    agentName: string;
    pieces: number;
    bags: number;
    khatTypes: Array<{ name: string; pieces: number }>;
  }>;
}

interface ReportData {
  deliveryPerson: {
    id: string;
    name: string;
    phone: string | null;
  };
  summary: {
    totalFarmers: number;
    totalShipments: number;
    totalPieces: number;
    totalBags: number;
  };
  farmers: FarmerData[];
  shareText: string;
  filters: { dateFrom: string | null; dateTo: string | null };
}

interface User {
  id: string;
  username: string;
  role: string;
}

export default function DeliveryPersonReportPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportData | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      window.location.href = '/';
    }
  }, []);

  const loadReport = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (dateFrom) queryParams.append('dateFrom', dateFrom);
      if (dateTo) queryParams.append('dateTo', dateTo);

      const res = await fetch(`/api/delivery-persons/${params.id}/report?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setReport(data.data);
      } else {
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في تحميل التقرير', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [params.id, dateFrom, dateTo, toast]);

  useEffect(() => {
    if (user) loadReport();
  }, [user, loadReport]);

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const handleShareWhatsApp = () => {
    if (!report) return;
    const encodedText = encodeURIComponent(report.shareText);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const handleCopy = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report.shareText);
      setCopied(true);
      toast({ title: 'تم', description: 'تم نسخ التقرير' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'خطأ', description: 'فشل في النسخ', variant: 'destructive' });
    }
  };

  const setToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setDateFrom(today);
    setDateTo(today);
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/delivery-persons')} className="h-8 w-8">
              <ArrowRight className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">تقرير الموصل</h1>
              {report && (
                <p className="text-sm text-muted-foreground">{report.deliveryPerson.name}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopy} className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              نسخ
            </Button>
            <Button onClick={handleShareWhatsApp} className="bg-green-600 hover:bg-green-700 gap-2">
              <MessageCircle className="h-4 w-4" />
              واتساب
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : report ? (
          <>
            {/* Delivery Person Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{report.deliveryPerson.name}</h2>
                    {report.deliveryPerson.phone && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {report.deliveryPerson.phone}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Date Filter */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1 flex-1 min-w-[140px]">
                    <Label className="text-xs">من تاريخ</Label>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
                  </div>
                  <div className="space-y-1 flex-1 min-w-[140px]">
                    <Label className="text-xs">إلى تاريخ</Label>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
                  </div>
                  <Button variant="outline" onClick={setToday} className="h-9">اليوم</Button>
                  <Button variant="ghost" onClick={clearFilters} className="h-9">مسح</Button>
                </div>
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    <span className="text-sm text-muted-foreground">المزارعين</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{report.summary.totalFarmers}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-orange-600" />
                    <span className="text-sm text-muted-foreground">الشحنات</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{report.summary.totalShipments}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm text-muted-foreground">الحبات</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{report.summary.totalPieces}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    <span className="text-sm text-muted-foreground">العدل</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{report.summary.totalBags}</p>
                </CardContent>
              </Card>
            </div>

            {/* Farmers Table */}
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-base">تفاصيل المزارعين</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">المزارع</TableHead>
                        <TableHead className="text-xs">الشحنات</TableHead>
                        <TableHead className="text-xs">الحبات</TableHead>
                        <TableHead className="text-xs">العدل</TableHead>
                        <TableHead className="text-xs">أنواع القات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.farmers.map((farmer, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{farmer.farmer.name}</TableCell>
                          <TableCell>{farmer.shipmentCount}</TableCell>
                          <TableCell>{farmer.totalPieces}</TableCell>
                          <TableCell>{farmer.totalBags}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {farmer.khatTypes.map((kt, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {kt.name}: {kt.pieces}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {report.farmers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                            لا توجد بيانات
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              لم يتم العثور على بيانات
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
