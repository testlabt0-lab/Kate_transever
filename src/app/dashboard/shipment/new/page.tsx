'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Plus,
  Trash2,
  Package,
  User,
  Truck,
  Leaf,
  Calculator,
  ArrowRight,
} from 'lucide-react';

interface Farmer {
  id: string;
  name: string;
  fullName: string;
  phone?: string;
}

interface Agent {
  id: string;
  name: string;
  phone?: string;
}

interface Transporter {
  id: string;
  name: string;
  phone?: string;
}

interface KhatType {
  id: string;
  name: string;
  commissionRate: number;
}

interface ShipmentItem {
  id: string;
  khatTypeId: string;
  quantity: number;
  commission: number;
}

export default function NewShipmentPage() {
  const router = useRouter();

  // البيانات الأساسية
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [khatTypes, setKhatTypes] = useState<KhatType[]>([]);

  // حالة التحميل
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  // القيم المختارة
  const [selectedFarmer, setSelectedFarmer] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedTransporter, setSelectedTransporter] = useState<string>('');

  // عناصر الشحنة
  const [items, setItems] = useState<ShipmentItem[]>([]);
  const [newKhatType, setNewKhatType] = useState<string>('');
  const [newQuantity, setNewQuantity] = useState<string>('');

  // الأخطاء
  const [error, setError] = useState<string | null>(null);

  // المستخدم
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);

  // التحقق من المستخدم
  useEffect(() => {
    const loggedIn = localStorage.getItem('loggedIn');
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');

    if (loggedIn === 'true' && username) {
      setUser({ username, role: role || 'WORKER' });
    } else {
      window.location.href = '/';
    }
  }, []);

  // تحميل البيانات الأولية
  const loadData = useCallback(async () => {
    try {
      const [farmersRes, agentsRes, transportersRes, khatTypesRes] = await Promise.all([
        fetch('/api/farmers'),
        fetch('/api/agents'),
        fetch('/api/transporters'),
        fetch('/api/khat-types'),
      ]);

      const farmersData = await farmersRes.json();
      const agentsData = await agentsRes.json();
      const transportersData = await transportersRes.json();
      const khatTypesData = await khatTypesRes.json();

      setFarmers(farmersData.farmers || []);
      setAgents(agentsData.agents || []);
      setTransporters(transportersData.transporters || []);
      setKhatTypes(khatTypesData.khatTypes || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // حساب المجاميع
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCommission = items.reduce((sum, item) => sum + item.commission, 0);

  // إضافة عنصر جديد
  function handleAddItem() {
    if (!newKhatType || !newQuantity) {
      setError('يرجى اختيار نوع القات وإدخال الكمية');
      return;
    }

    const quantity = parseFloat(newQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      setError('يرجى إدخال كمية صحيحة');
      return;
    }

    const khatType = khatTypes.find((k) => k.id === newKhatType);
    if (!khatType) {
      setError('نوع القات غير موجود');
      return;
    }

    const commission = quantity * khatType.commissionRate;

    const newItem: ShipmentItem = {
      id: `${Date.now()}-${Math.random()}`,
      khatTypeId: newKhatType,
      quantity,
      commission,
    };

    setItems([...items, newItem]);
    setNewKhatType('');
    setNewQuantity('');
    setError(null);
  }

  // حذف عنصر
  function handleRemoveItem(id: string) {
    setItems(items.filter((item) => item.id !== id));
  }

  // حفظ الشحنة
  async function handleSave() {
    setError(null);

    if (!selectedFarmer) {
      setError('يرجى اختيار المزارع');
      return;
    }

    if (!selectedAgent) {
      setError('يرجى اختيار الوكيل');
      return;
    }

    if (!selectedTransporter) {
      setError('يرجى اختيار الشداد');
      return;
    }

    if (items.length === 0) {
      setError('يرجى إضافة عنصر واحد على الأقل');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          farmerId: selectedFarmer,
          agentId: selectedAgent,
          transporterId: selectedTransporter,
          items: items.map((item) => ({
            khatTypeId: item.khatTypeId,
            quantity: item.quantity,
            commission: item.commission,
          })),
          adlCount: items.length,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/dashboard/shipments');
      } else {
        setError(data.error || 'حدث خطأ أثناء حفظ الشحنة');
        setSaving(false);
      }
    } catch {
      setError('حدث خطأ في الاتصال');
      setSaving(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    router.replace('/');
  }

  // تنسيق العملة
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-YE').format(amount) + ' ريال';
  };

  if (loadingData || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* العنوان */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
            <Package className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">إضافة شحنة جديدة</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">أدخل بيانات الشحنة الجديدة</p>
          </div>
        </div>

        {/* الأخطاء */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* نموذج الشحنة */}
        <div className="grid gap-4 sm:gap-6">
          {/* اختيار المزارع */}
          <Card>
            <CardHeader className="p-3 sm:p-4 sm:pb-2">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                المزارع
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">اختر المزارع من القائمة</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
              <Select value={selectedFarmer} onValueChange={setSelectedFarmer}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المزارع..." />
                </SelectTrigger>
                <SelectContent>
                  {farmers.map((farmer) => (
                    <SelectItem key={farmer.id} value={farmer.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{farmer.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {farmer.fullName}
                          {farmer.phone && ` • ${farmer.phone}`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* اختيار الوكيل والشداد */}
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader className="p-3 sm:p-4 sm:pb-2">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  الوكيل
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الوكيل" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                        {agent.phone && ` (${agent.phone})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 sm:p-4 sm:pb-2">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                  الشداد
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                <Select value={selectedTransporter} onValueChange={setSelectedTransporter}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الشداد" />
                  </SelectTrigger>
                  <SelectContent>
                    {transporters.map((transporter) => (
                      <SelectItem key={transporter.id} value={transporter.id}>
                        {transporter.name}
                        {transporter.phone && ` (${transporter.phone})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* قسم أنواع القات */}
          <Card>
            <CardHeader className="p-3 sm:p-4 sm:pb-2">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Leaf className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                أنواع القات
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">أضف أنواع القات والكميات</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 space-y-4">
              {/* إضافة عنصر جديد */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-end">
                <div className="flex-1">
                  <Label className="text-xs sm:text-sm mb-1.5 sm:mb-2 block">نوع القات</Label>
                  <Select value={newKhatType} onValueChange={setNewKhatType}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      {khatTypes.map((khatType) => (
                        <SelectItem key={khatType.id} value={khatType.id}>
                          {khatType.name} (عمولة: {formatCurrency(khatType.commissionRate)}/كجم)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-28">
                  <Label className="text-xs sm:text-sm mb-1.5 sm:mb-2 block">الكمية (كجم)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    min="0"
                    step="0.5"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAddItem}
                  className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 sm:me-1" />
                  <span className="hidden sm:inline">إضافة</span>
                </Button>
              </div>

              <Separator />

              {/* قائمة العناصر المضافة */}
              {items.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-muted-foreground text-sm">
                  لم يتم إضافة أي عنصر بعد
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => {
                    const khatType = khatTypes.find((k) => k.id === item.khatTypeId);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-xs">
                            {khatType?.name}
                          </Badge>
                          <span className="text-xs sm:text-sm">
                            <span className="text-muted-foreground">الكمية:</span> <strong>{item.quantity} كجم</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="flex items-center gap-1 text-xs sm:text-sm font-medium text-emerald-600">
                            <Calculator className="h-3 w-3 sm:h-4 sm:w-4" />
                            {formatCurrency(item.commission)}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                            className="h-7 w-7 sm:h-8 sm:w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Separator />

              {/* المجموع */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">المجموع الكلي</p>
                  <p className="text-sm sm:text-lg font-bold text-emerald-600">
                    الكمية: {totalQuantity} كجم | العمولة: {formatCurrency(totalCommission)}
                  </p>
                </div>
                <Badge variant="default" className="bg-emerald-600 text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-2 self-end sm:self-auto">
                  {items.length} عناصر
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* أزرار الإجراءات */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/shipments')}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              <ArrowRight className="h-4 w-4 ml-2" />
              إلغاء
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 w-full sm:min-w-[140px]"
            >
              {saving ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Package className="me-2 h-4 w-4" />
                  حفظ الشحنة
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
