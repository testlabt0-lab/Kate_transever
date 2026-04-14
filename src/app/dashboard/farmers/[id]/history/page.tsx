'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowRight,
  Loader2,
  Calendar,
  Package,
  User,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  Search,
  FileText,
  Users,
  Sprout,
  Phone,
} from 'lucide-react';

interface KhatDetail {
  khatType: { id: string; name: string; feePerPiece: number };
  pieces: number;
  feePerPiece: number;
  totalFee: number;
}

interface ShipmentItem {
  id: string;
  shipmentId: string;
  shipmentStatus: string;
  shipmentNotes: string | null;
  agent: { id: string; name: string; phone: string | null };
  farmerAlias: string | null;
  totalPieces: number;
  numberOfBags: number;
  totalFee: number;
  notes: string | null;
  receivedBy: string | null;
  receivedAt: string | null;
  deliveryStatus: string;
  createdBy: { id: string; username: string };
  createdAt: string;
  khatDetails: KhatDetail[];
}

interface DayHistory {
  date: string;
  dateISO: string;
  totalPieces: number;
  totalBags: number;
  totalFee: number;
  shipmentsCount: number;
  items: ShipmentItem[];
}

interface Stats {
  totalDays: number;
  totalPieces: number;
  totalBags: number;
  totalFee: number;
  totalShipments: number;
  agents: string[];
  deliveryStats: {
    pending: number;
    received: number;
    inTransit: number;
    delivered: number;
  };
}

interface Farmer {
  id: string;
  name: string;
  fullName: string | null;
  phone: string | null;
}

interface User {
  id: string;
  username: string;
  role: string;
}

export default function FarmerHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const farmerId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<DayHistory[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [farmer, setFarmer] = useState<Farmer | null>(null);

  // فلترة التاريخ
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // البحث
  const [searchQuery, setSearchQuery] = useState('');

  // التفاصيل
  const [selectedItem, setSelectedItem] = useState<ShipmentItem | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // الأيام المفتوحة
  const [openDays, setOpenDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('session_token');
    if (userData && token) {
      setUser(JSON.parse(userData));
    } else {
      window.location.href = '/login.html';
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/farmers/${farmerId}/history?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setHistory(data.history);
        setStats(data.stats);
        setFarmer(data.farmer);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  }, [farmerId, startDate, endDate]);

  useEffect(() => {
    if (user && farmerId) {
      loadHistory();
    }
  }, [user, farmerId, loadHistory]);

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-YE').format(amount) + ' ريال';
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDeliveryStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />معلق</Badge>;
      case 'RECEIVED':
        return <Badge variant="default" className="gap-1 bg-blue-600"><CheckCircle className="h-3 w-3" />تم الاستلام</Badge>;
      case 'IN_TRANSIT':
        return <Badge variant="default" className="gap-1 bg-amber-600"><Truck className="h-3 w-3" />في الطريق</Badge>;
      case 'DELIVERED':
        return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle className="h-3 w-3" />تم التسليم</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const toggleDay = (dateISO: string) => {
    const newOpenDays = new Set(openDays);
    if (newOpenDays.has(dateISO)) {
      newOpenDays.delete(dateISO);
    } else {
      newOpenDays.add(dateISO);
    }
    setOpenDays(newOpenDays);
  };

  // فلترة حسب البحث
  const filteredHistory = history.filter(day => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return day.items.some(item =>
      item.agent.name.toLowerCase().includes(query) ||
      item.farmerAlias?.toLowerCase().includes(query) ||
      item.createdBy.username.toLowerCase().includes(query) ||
      item.khatDetails.some(d => d.khatType.name.toLowerCase().includes(query))
    );
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <DashboardLayout
      userRole={user.role as 'ADMIN' | 'WORKER'}
      username={user.username}
      onLogout={handleLogout}
    >
      <div className="space-y-4 sm:space-y-6">
        {/* العنوان والرجوع */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard/farmers')}
              className="flex-shrink-0"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">سجل المزارع</h1>
              {farmer && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Sprout className="h-4 w-4" />
                  <span className="font-medium text-foreground">{farmer.name}</span>
                  {farmer.fullName && farmer.fullName !== farmer.name && (
                    <span className="text-sm">({farmer.fullName})</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* معلومات المزارع */}
        {farmer && (
          <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                    <Sprout className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">{farmer.name}</h2>
                    {farmer.fullName && farmer.fullName !== farmer.name && (
                      <p className="text-sm text-muted-foreground">{farmer.fullName}</p>
                    )}
                  </div>
                </div>
                {farmer.phone && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{farmer.phone}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* الفلترة والبحث */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">من تاريخ</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">إلى تاريخ</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">البحث</Label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث بالوكيل، النوع، المستخدم..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-9"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* الإحصائيات */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-4">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                  <span className="text-xs sm:text-sm text-muted-foreground">أيام الإرسال</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold mt-1">{stats.totalDays}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  <span className="text-xs sm:text-sm text-muted-foreground">إجمالي الحبات</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold mt-1">{stats.totalPieces.toLocaleString('ar-SA')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600" />
                  <span className="text-xs sm:text-sm text-muted-foreground">إجمالي العدل</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold mt-1">{stats.totalBags.toLocaleString('ar-SA')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  <span className="text-xs sm:text-sm text-muted-foreground">الشحنات</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold mt-1">{stats.totalShipments}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                  <span className="text-xs sm:text-sm text-muted-foreground">الوكلاء</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold mt-1">{stats.agents.length}</p>
              </CardContent>
            </Card>
            <Card className="col-span-2 lg:col-span-1">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  <span className="text-xs sm:text-sm text-muted-foreground">تم التسليم</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold mt-1 text-green-600">
                  {stats.deliveryStats.delivered}
                  <span className="text-sm text-muted-foreground font-normal mr-1">
                    / {history.reduce((sum, d) => sum + d.items.length, 0)}
                  </span>
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* حالة التسليم */}
        {stats && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-3">حالة التسليم</h3>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-gray-400"></div>
                  <span className="text-sm">معلق: {stats.deliveryStats.pending}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-600"></div>
                  <span className="text-sm">تم الاستلام: {stats.deliveryStats.received}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-600"></div>
                  <span className="text-sm">في الطريق: {stats.deliveryStats.inTransit}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-600"></div>
                  <span className="text-sm">تم التسليم: {stats.deliveryStats.delivered}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* قائمة الأيام */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : filteredHistory.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>لا يوجد سجل لهذا المزارع</p>
              {(startDate || endDate) && (
                <Button
                  variant="link"
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="mt-2"
                >
                  مسح الفلتر
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((day) => (
              <Collapsible
                key={day.dateISO}
                open={openDays.has(day.dateISO)}
                onOpenChange={() => toggleDay(day.dateISO)}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <CardTitle className="text-base sm:text-lg">{day.date}</CardTitle>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {day.items.length} عنصر • {day.shipmentsCount} شحنة
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-left">
                            <p className="font-bold text-sm sm:text-base">{day.totalPieces.toLocaleString('ar-SA')} حبة</p>
                            <p className="text-xs text-blue-600">{day.totalBags} عدلة</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">{formatCurrency(day.totalFee)}</p>
                          </div>
                          <ChevronDown className={`h-5 w-5 transition-transform ${openDays.has(day.dateISO) ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 px-4 pb-4">
                      <div className="space-y-2">
                        {day.items.map((item) => (
                          <Card
                            key={item.id}
                            className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => { setSelectedItem(item); setShowDetailsDialog(true); }}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-medium text-sm sm:text-base truncate">{item.agent.name}</h4>
                                      {getDeliveryStatusBadge(item.deliveryStatus)}
                                    </div>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                      {item.khatDetails.map(d => `${d.khatType.name}: ${d.pieces}`).join(' • ')}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-left flex-shrink-0">
                                  <p className="font-bold text-sm">{item.totalPieces} حبة</p>
                                  <p className="text-xs text-blue-600">{item.numberOfBags || 1} عدلة</p>
                                  <p className="text-xs text-muted-foreground">{formatCurrency(item.totalFee)}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}

        {/* ملخص */}
        {!loading && filteredHistory.length > 0 && stats && (
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">
                  عرض {filteredHistory.length} يوم
                </span>
                <div className="text-sm">
                  <span className="text-muted-foreground mr-2">الإجمالي:</span>
                  <span className="font-bold">{stats.totalPieces.toLocaleString('ar-SA')} حبة</span>
                  <span className="mx-2">•</span>
                  <span className="font-bold text-blue-600">{stats.totalBags.toLocaleString('ar-SA')} عدلة</span>
                  <span className="mx-2">•</span>
                  <span className="font-bold">{formatCurrency(stats.totalFee)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* حوار التفاصيل */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-600" />
                تفاصيل العنصر
              </DialogTitle>
            </DialogHeader>
            {selectedItem && (
              <div className="space-y-4 py-4">
                {/* معلومات الوكيل */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">الوكيل</h4>
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-purple-600" />
                    <span className="font-medium">{selectedItem.agent.name}</span>
                    {selectedItem.agent.phone && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">{selectedItem.agent.phone}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* حالة التسليم */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">حالة التسليم</h4>
                  <div className="flex items-center justify-between">
                    {getDeliveryStatusBadge(selectedItem.deliveryStatus)}
                    {selectedItem.receivedBy && (
                      <span className="text-sm text-muted-foreground">
                        استلم: {selectedItem.receivedBy}
                      </span>
                    )}
                  </div>
                  {selectedItem.receivedAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      وقت الاستلام: {formatDateTime(selectedItem.receivedAt)}
                    </p>
                  )}
                </div>

                {/* تفاصيل القات */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">أنواع القات</h4>
                  <div className="space-y-2">
                    {selectedItem.khatDetails.map((detail, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span>{detail.khatType.name}</span>
                        <div className="text-left">
                          <span className="font-medium">{detail.pieces} حبة</span>
                          <span className="text-muted-foreground mx-1">×</span>
                          <span className="text-muted-foreground">{detail.feePerPiece}</span>
                          <span className="text-muted-foreground mx-1">=</span>
                          <span className="font-medium text-emerald-600">{formatCurrency(detail.totalFee)}</span>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 border-t text-sm font-bold">
                      <span>الإجمالي</span>
                      <span>{selectedItem.totalPieces} حبة = {formatCurrency(selectedItem.totalFee)}</span>
                    </div>
                  </div>
                </div>

                {/* معلومات الشحنة */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">معلومات الشحنة</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">رقم الشحنة:</span>
                      <span className="font-mono text-xs">{selectedItem.shipmentId.slice(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">أدخل البيانات:</span>
                      <span className="font-medium">{selectedItem.createdBy.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">وقت الإدخال:</span>
                      <span>{formatDateTime(selectedItem.createdAt)}</span>
                    </div>
                    {selectedItem.farmerAlias && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">الاسم المرسل به:</span>
                        <span>{selectedItem.farmerAlias}</span>
                      </div>
                    )}
                    {selectedItem.notes && (
                      <div className="pt-2 border-t mt-2">
                        <span className="text-muted-foreground">ملاحظات: </span>
                        <span>{selectedItem.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
