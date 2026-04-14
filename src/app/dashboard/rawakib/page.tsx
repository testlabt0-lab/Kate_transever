'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
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
  Package,
  Plus,
  ShoppingCart,
  Users,
  TrendingDown,
  TrendingUp,
  Loader2,
  Trash2,
  DollarSign,
  CreditCard,
  Banknote,
  Leaf,
  AlertTriangle,
  CheckCircle,
  Clock,
  History,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ==================== Types ====================

type RawakibSize = 'LARGE' | 'MEDIUM' | 'SMALL';

interface InventoryItem {
  id: string;
  size: RawakibSize;
  totalPurchased: number;
  totalDistributed: number;
  remaining: number;
}

interface PurchaseItem {
  id: string;
  size: RawakibSize;
  quantity: number;
  pricePerPiece: number;
  totalCost: number;
  notes: string | null;
}

interface Purchase {
  id: string;
  date: string;
  supplierName: string | null;
  notes: string | null;
  totalQuantity: number;
  totalCost: number;
  items: PurchaseItem[];
  createdAt: string;
}

interface DistributionItem {
  id: string;
  size: RawakibSize;
  quantity: number;
  pricePerPiece: number;
  totalCost: number;
  notes: string | null;
}

interface Distribution {
  id: string;
  date: string;
  farmerId: string;
  paymentType: 'CASH' | 'CREDIT';
  notes: string | null;
  totalQuantity: number;
  totalCost: number;
  isPaid: boolean;
  paidAt: string | null;
  createdAt: string;
  farmer: { id: string; name: string; phone: string | null };
  items: DistributionItem[];
}

interface Farmer {
  id: string;
  name: string;
  phone: string | null;
}

interface User {
  id: string;
  username: string;
  role: string;
}

// ==================== Main Component ====================

export default function RawakibPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [stats, setStats] = useState({
    totalPurchased: 0,
    totalPurchasedCost: 0,
    totalDistributed: 0,
    totalDistributedCost: 0,
    totalCreditDebt: 0
  });

  // Dialogs
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showDistributionDialog, setShowDistributionDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedDistribution, setSelectedDistribution] = useState<Distribution | null>(null);

  // Purchase form
  const [purchaseSupplier, setPurchaseSupplier] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<{
    size: RawakibSize;
    quantity: string;
    pricePerPiece: string;
  }[]>([{ size: 'LARGE', quantity: '', pricePerPiece: '' }]);

  // Distribution form
  const [distributionFarmerId, setDistributionFarmerId] = useState('');
  const [distributionPaymentType, setDistributionPaymentType] = useState<'CASH' | 'CREDIT'>('CASH');
  const [distributionNotes, setDistributionNotes] = useState('');
  const [distributionItems, setDistributionItems] = useState<{
    size: RawakibSize;
    quantity: string;
    pricePerPiece: string;
  }[]>([{ size: 'LARGE', quantity: '', pricePerPiece: '' }]);

  // Saving
  const [saving, setSaving] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('overview');

  // Check user
  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('session_token');

    if (userData && token) {
      setUser(JSON.parse(userData));
    } else {
      window.location.href = '/';
    }
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [inventoryRes, purchasesRes, distributionsRes, farmersRes] = await Promise.all([
        fetch('/api/rawakib?action=inventory'),
        fetch('/api/rawakib?action=purchases'),
        fetch('/api/rawakib?action=distributions'),
        fetch('/api/farmers')
      ]);

      const inventoryData = await inventoryRes.json();
      const purchasesData = await purchasesRes.json();
      const distributionsData = await distributionsRes.json();
      const farmersData = await farmersRes.json();

      setInventory(inventoryData.inventory || []);
      setPurchases(purchasesData.purchases || []);
      setDistributions(distributionsData.distributions || []);
      setFarmers(farmersData.farmers || []);

      // Calculate stats
      const totalPurchased = (inventoryData.inventory || []).reduce((sum: number, i: InventoryItem) => sum + i.totalPurchased, 0);
      const totalDistributed = (inventoryData.inventory || []).reduce((sum: number, i: InventoryItem) => sum + i.totalDistributed, 0);

      setStats({
        totalPurchased,
        totalPurchasedCost: purchasesData.stats?.totalCost || 0,
        totalDistributed,
        totalDistributedCost: distributionsData.stats?.totalCost || 0,
        totalCreditDebt: distributionsData.stats?.totalCredit || 0
      });

    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: 'خطأ', description: 'فشل في تحميل البيانات', variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  // ==================== Helper Functions ====================

  const getSizeLabel = (size: RawakibSize) => {
    switch (size) {
      case 'LARGE': return 'كبيرة';
      case 'MEDIUM': return 'متوسطة';
      case 'SMALL': return 'صغيرة';
    }
  };

  const getSizeColor = (size: RawakibSize) => {
    switch (size) {
      case 'LARGE': return 'bg-emerald-100 text-emerald-700';
      case 'MEDIUM': return 'bg-blue-100 text-blue-700';
      case 'SMALL': return 'bg-amber-100 text-amber-700';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-YE').format(amount) + ' ريال';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // ==================== Purchase Handlers ====================

  const addPurchaseItem = () => {
    setPurchaseItems([...purchaseItems, { size: 'LARGE', quantity: '', pricePerPiece: '' }]);
  };

  const updatePurchaseItem = (index: number, field: string, value: string) => {
    const updated = [...purchaseItems];
    (updated[index] as any)[field] = value;
    setPurchaseItems(updated);
  };

  const removePurchaseItem = (index: number) => {
    if (purchaseItems.length > 1) {
      setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
    }
  };

  const handleSavePurchase = async () => {
    const validItems = purchaseItems.filter(item => item.quantity && item.pricePerPiece);
    if (validItems.length === 0) {
      toast({ title: 'خطأ', description: 'يجب إضافة عنصر واحد على الأقل', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/rawakib', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'purchase',
          data: {
            supplierName: purchaseSupplier || null,
            notes: purchaseNotes || null,
            items: validItems.map(item => ({
              size: item.size,
              quantity: parseInt(item.quantity),
              pricePerPiece: parseFloat(item.pricePerPiece)
            }))
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'تم', description: 'تم تسجيل عملية الشراء بنجاح' });
        resetPurchaseForm();
        setShowPurchaseDialog(false);
        loadData();
      } else {
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const resetPurchaseForm = () => {
    setPurchaseSupplier('');
    setPurchaseNotes('');
    setPurchaseItems([{ size: 'LARGE', quantity: '', pricePerPiece: '' }]);
  };

  // ==================== Distribution Handlers ====================

  const addDistributionItem = () => {
    setDistributionItems([...distributionItems, { size: 'LARGE', quantity: '', pricePerPiece: '' }]);
  };

  const updateDistributionItem = (index: number, field: string, value: string) => {
    const updated = [...distributionItems];
    (updated[index] as any)[field] = value;
    setDistributionItems(updated);
  };

  const removeDistributionItem = (index: number) => {
    if (distributionItems.length > 1) {
      setDistributionItems(distributionItems.filter((_, i) => i !== index));
    }
  };

  const handleSaveDistribution = async () => {
    if (!distributionFarmerId) {
      toast({ title: 'خطأ', description: 'يجب اختيار المزارع', variant: 'destructive' });
      return;
    }

    const validItems = distributionItems.filter(item => item.quantity && item.pricePerPiece);
    if (validItems.length === 0) {
      toast({ title: 'خطأ', description: 'يجب إضافة عنصر واحد على الأقل', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/rawakib', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'distribution',
          data: {
            farmerId: distributionFarmerId,
            paymentType: distributionPaymentType,
            notes: distributionNotes || null,
            isPaid: distributionPaymentType === 'CASH',
            items: validItems.map(item => ({
              size: item.size,
              quantity: parseInt(item.quantity),
              pricePerPiece: parseFloat(item.pricePerPiece)
            }))
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'تم', description: 'تم تسجيل التوزيع بنجاح' });
        resetDistributionForm();
        setShowDistributionDialog(false);
        loadData();
      } else {
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const resetDistributionForm = () => {
    setDistributionFarmerId('');
    setDistributionPaymentType('CASH');
    setDistributionNotes('');
    setDistributionItems([{ size: 'LARGE', quantity: '', pricePerPiece: '' }]);
  };

  const handlePayDebt = async (id: string) => {
    try {
      const res = await fetch('/api/rawakib', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pay-debt', id })
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'تم', description: 'تم تسديد الدين' });
        loadData();
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
    }
  };

  // ==================== Render ====================

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Calculate totals
  const purchaseTotal = purchaseItems.reduce((sum, item) => {
    const qty = parseInt(item.quantity) || 0;
    const price = parseFloat(item.pricePerPiece) || 0;
    return sum + (qty * price);
  }, 0);

  const distributionTotal = distributionItems.reduce((sum, item) => {
    const qty = parseInt(item.quantity) || 0;
    const price = parseFloat(item.pricePerPiece) || 0;
    return sum + (qty * price);
  }, 0);

  return (
    <DashboardLayout userRole={user.role as 'ADMIN' | 'WORKER'} username={user.username} onLogout={handleLogout}>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">رواكب الميش</h1>
            <p className="text-sm text-muted-foreground">إدارة شراء وتوزيع رواكب الميش</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setRefreshing(true); loadData(); }}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-emerald-600" />
                <span className="text-xs text-emerald-700">المشتريات</span>
              </div>
              <p className="text-xl font-bold text-emerald-700">{stats.totalPurchased}</p>
              <p className="text-xs text-emerald-600">{formatCurrency(stats.totalPurchasedCost)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-blue-700">التوزيعات</span>
              </div>
              <p className="text-xl font-bold text-blue-700">{stats.totalDistributed}</p>
              <p className="text-xs text-blue-600">{formatCurrency(stats.totalDistributedCost)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-600" />
                <span className="text-xs text-amber-700">المتبقي</span>
              </div>
              <p className="text-xl font-bold text-amber-700">
                {inventory.reduce((sum, i) => sum + i.remaining, 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-red-600" />
                <span className="text-xs text-red-700">الديون</span>
              </div>
              <p className="text-lg font-bold text-red-700">{formatCurrency(stats.totalCreditDebt)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950 dark:to-teal-900">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-teal-600" />
                <span className="text-xs text-teal-700">صافي</span>
              </div>
              <p className="text-lg font-bold text-teal-700">
                {formatCurrency(stats.totalPurchasedCost - stats.totalDistributedCost)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">المخزون</TabsTrigger>
            <TabsTrigger value="purchase">الشراء</TabsTrigger>
            <TabsTrigger value="distribution">التوزيع</TabsTrigger>
            <TabsTrigger value="debts">الديون</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">مخزون الرواكب</CardTitle>
                <CardDescription>الكميات المتوفرة حسب الحجم</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {inventory.map((item) => (
                    <Card key={item.id} className={`border-2 ${
                      item.remaining <= 10 ? 'border-red-300 bg-red-50' : 'border-emerald-300 bg-emerald-50'
                    }`}>
                      <CardContent className="p-4 text-center">
                        <Badge className={getSizeColor(item.size)}>
                          {getSizeLabel(item.size)}
                        </Badge>
                        <div className="mt-3">
                          <p className="text-3xl font-bold">{item.remaining}</p>
                          <p className="text-sm text-muted-foreground">متبقي</p>
                        </div>
                        <Separator className="my-3" />
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">مشتريات</p>
                            <p className="font-bold text-emerald-600">{item.totalPurchased}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">توزيعات</p>
                            <p className="font-bold text-blue-600">{item.totalDistributed}</p>
                          </div>
                        </div>
                        {item.remaining <= 10 && item.remaining > 0 && (
                          <div className="mt-3 flex items-center justify-center gap-1 text-amber-600 text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            <span>كمية قليلة</span>
                          </div>
                        )}
                        {item.remaining === 0 && (
                          <div className="mt-3 flex items-center justify-center gap-1 text-red-600 text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            <span>نفذ المخزون</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purchase Tab */}
          <TabsContent value="purchase" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  resetPurchaseForm();
                  setShowPurchaseDialog(true);
                }}
              >
                <Plus className="h-4 w-4 me-2" />
                شراء رواكب
              </Button>
            </div>

            {purchases.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد عمليات شراء</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>التاريخ</TableHead>
                          <TableHead>المورد</TableHead>
                          <TableHead>الأحجام</TableHead>
                          <TableHead>الكمية</TableHead>
                          <TableHead>التكلفة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchases.map((purchase) => (
                          <TableRow key={purchase.id}>
                            <TableCell>{formatDate(purchase.date)}</TableCell>
                            <TableCell>{purchase.supplierName || '-'}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {purchase.items.map((item, idx) => (
                                  <Badge key={idx} className={getSizeColor(item.size)}>
                                    {getSizeLabel(item.size)}: {item.quantity}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="font-bold">{purchase.totalQuantity}</TableCell>
                            <TableCell className="font-bold text-emerald-600">
                              {formatCurrency(purchase.totalCost)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Distribution Tab */}
          <TabsContent value="distribution" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  resetDistributionForm();
                  setShowDistributionDialog(true);
                }}
              >
                <Plus className="h-4 w-4 me-2" />
                توزيع رواكب
              </Button>
            </div>

            {distributions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد توزيعات</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>التاريخ</TableHead>
                          <TableHead>المزارع</TableHead>
                          <TableHead>الأحجام</TableHead>
                          <TableHead>الكمية</TableHead>
                          <TableHead>التكلفة</TableHead>
                          <TableHead>الدفع</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {distributions.map((dist) => (
                          <TableRow key={dist.id}>
                            <TableCell>{formatDate(dist.date)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                  <Leaf className="h-4 w-4 text-emerald-600" />
                                </div>
                                <span className="font-medium">{dist.farmer.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {dist.items.map((item, idx) => (
                                  <Badge key={idx} className={getSizeColor(item.size)}>
                                    {getSizeLabel(item.size)}: {item.quantity}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="font-bold">{dist.totalQuantity}</TableCell>
                            <TableCell className="font-bold text-blue-600">
                              {formatCurrency(dist.totalCost)}
                            </TableCell>
                            <TableCell>
                              {dist.paymentType === 'CASH' ? (
                                <Badge className="bg-emerald-100 text-emerald-700">
                                  <Banknote className="h-3 w-3 me-1" />
                                  نقداً
                                </Badge>
                              ) : (
                                <Badge className={dist.isPaid ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                                  <CreditCard className="h-3 w-3 me-1" />
                                  {dist.isPaid ? 'تم السداد' : 'دين'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedDistribution(dist);
                                    setShowDetailsDialog(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {dist.paymentType === 'CREDIT' && !dist.isPaid && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-emerald-600"
                                    onClick={() => handlePayDebt(dist.id)}
                                  >
                                    <DollarSign className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Debts Tab */}
          <TabsContent value="debts" className="mt-4 space-y-4">
            {distributions.filter(d => d.paymentType === 'CREDIT' && !d.isPaid).length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-emerald-500 opacity-50" />
                  <p>لا توجد ديون</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {distributions
                  .filter(d => d.paymentType === 'CREDIT' && !d.isPaid)
                  .map((dist) => (
                    <Card key={dist.id} className="border-red-200 bg-red-50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Leaf className="h-5 w-5 text-emerald-600" />
                              <span className="font-bold">{dist.farmer.name}</span>
                              {dist.farmer.phone && (
                                <span className="text-sm text-muted-foreground">
                                  ({dist.farmer.phone})
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {dist.items.map((item, idx) => (
                                <Badge key={idx} className={getSizeColor(item.size)}>
                                  {getSizeLabel(item.size)}: {item.quantity}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(dist.date)}
                            </p>
                          </div>
                          <div className="text-left">
                            <p className="text-xl font-bold text-red-600">
                              {formatCurrency(dist.totalCost)}
                            </p>
                            <Button
                              size="sm"
                              className="mt-2 bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handlePayDebt(dist.id)}
                            >
                              <DollarSign className="h-4 w-4 me-1" />
                              تسديد
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Purchase Dialog */}
        <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>شراء رواكب الميش</DialogTitle>
              <DialogDescription>إدخال عملية شراء جديدة</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اسم المورد (اختياري)</Label>
                  <Input
                    value={purchaseSupplier}
                    onChange={(e) => setPurchaseSupplier(e.target.value)}
                    placeholder="اسم المورد"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الإجمالي</Label>
                  <div className="p-2 bg-muted rounded-lg text-center">
                    <p className="font-bold text-emerald-600">{formatCurrency(purchaseTotal)}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>العناصر</Label>
                  <Button size="sm" variant="outline" onClick={addPurchaseItem}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {purchaseItems.map((item, index) => (
                  <div key={index} className="p-3 border rounded-lg space-y-3">
                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">الحجم</Label>
                        <Select
                          value={item.size}
                          onValueChange={(v) => updatePurchaseItem(index, 'size', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LARGE">كبيرة</SelectItem>
                            <SelectItem value="MEDIUM">متوسطة</SelectItem>
                            <SelectItem value="SMALL">صغيرة</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">الكمية</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updatePurchaseItem(index, 'quantity', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">سعر الحبة</Label>
                        <Input
                          type="number"
                          value={item.pricePerPiece}
                          onChange={(e) => updatePurchaseItem(index, 'pricePerPiece', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">الإجمالي</Label>
                        <div className="p-2 bg-muted rounded text-center text-sm font-bold">
                          {((parseInt(item.quantity) || 0) * (parseFloat(item.pricePerPiece) || 0)).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    {purchaseItems.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full text-red-600"
                        onClick={() => removePurchaseItem(index)}
                      >
                        <Trash2 className="h-4 w-4 me-1" />
                        حذف
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  placeholder="ملاحظات إضافية..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPurchaseDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSavePurchase} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حفظ'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Distribution Dialog */}
        <Dialog open={showDistributionDialog} onOpenChange={setShowDistributionDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>توزيع رواكب على المزارع</DialogTitle>
              <DialogDescription>تسجيل توزيع جديد</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>المزارع *</Label>
                  <Select value={distributionFarmerId} onValueChange={setDistributionFarmerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المزارع" />
                    </SelectTrigger>
                    <SelectContent>
                      {farmers.map((farmer) => (
                        <SelectItem key={farmer.id} value={farmer.id}>
                          {farmer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>طريقة الدفع</Label>
                  <Select
                    value={distributionPaymentType}
                    onValueChange={(v) => setDistributionPaymentType(v as 'CASH' | 'CREDIT')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">نقداً</SelectItem>
                      <SelectItem value="CREDIT">دين</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span>الإجمالي:</span>
                  <span className="font-bold text-lg">{formatCurrency(distributionTotal)}</span>
                </div>
                {distributionPaymentType === 'CREDIT' && (
                  <p className="text-sm text-red-600 mt-1">
                    سيتم احتساب المبلغ كدين على المزارع
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>العناصر</Label>
                  <Button size="sm" variant="outline" onClick={addDistributionItem}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {distributionItems.map((item, index) => {
                  const inv = inventory.find(i => i.size === item.size);
                  return (
                    <div key={index} className="p-3 border rounded-lg space-y-3">
                      <div className="grid grid-cols-4 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">الحجم</Label>
                          <Select
                            value={item.size}
                            onValueChange={(v) => updateDistributionItem(index, 'size', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="LARGE">كبيرة ({inv?.remaining || 0})</SelectItem>
                              <SelectItem value="MEDIUM">متوسطة ({inv?.remaining || 0})</SelectItem>
                              <SelectItem value="SMALL">صغيرة ({inv?.remaining || 0})</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">الكمية</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateDistributionItem(index, 'quantity', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">سعر الحبة</Label>
                          <Input
                            type="number"
                            value={item.pricePerPiece}
                            onChange={(e) => updateDistributionItem(index, 'pricePerPiece', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">الإجمالي</Label>
                          <div className="p-2 bg-muted rounded text-center text-sm font-bold">
                            {((parseInt(item.quantity) || 0) * (parseFloat(item.pricePerPiece) || 0)).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {distributionItems.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full text-red-600"
                          onClick={() => removeDistributionItem(index)}
                        >
                          <Trash2 className="h-4 w-4 me-1" />
                          حذف
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea
                  value={distributionNotes}
                  onChange={(e) => setDistributionNotes(e.target.value)}
                  placeholder="ملاحظات إضافية..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDistributionDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSaveDistribution} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'توزيع'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تفاصيل التوزيع</DialogTitle>
            </DialogHeader>
            {selectedDistribution && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">المزارع</Label>
                    <p className="font-medium">{selectedDistribution.farmer.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">التاريخ</Label>
                    <p className="font-medium">{formatDate(selectedDistribution.date)}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground mb-2">الأحجام</Label>
                  <div className="space-y-2">
                    {selectedDistribution.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                        <Badge className={getSizeColor(item.size)}>
                          {getSizeLabel(item.size)}
                        </Badge>
                        <div className="text-left">
                          <span className="font-medium">{item.quantity} حبة</span>
                          <span className="text-muted-foreground mx-1">×</span>
                          <span>{item.pricePerPiece}</span>
                          <span className="text-muted-foreground mx-1">=</span>
                          <span className="font-bold text-emerald-600">{formatCurrency(item.totalCost)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                  <span className="font-medium">الإجمالي</span>
                  <span className="font-bold text-xl text-emerald-600">
                    {formatCurrency(selectedDistribution.totalCost)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">طريقة الدفع:</span>
                  {selectedDistribution.paymentType === 'CASH' ? (
                    <Badge className="bg-emerald-100 text-emerald-700">
                      <Banknote className="h-3 w-3 me-1" />
                      نقداً
                    </Badge>
                  ) : (
                    <Badge className={selectedDistribution.isPaid ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                      <CreditCard className="h-3 w-3 me-1" />
                      {selectedDistribution.isPaid ? 'تم السداد' : 'دين'}
                    </Badge>
                  )}
                </div>

                {selectedDistribution.notes && (
                  <div>
                    <Label className="text-xs text-muted-foreground">ملاحظات</Label>
                    <p>{selectedDistribution.notes}</p>
                  </div>
                )}
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
