'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Users,
  Wallet,
  DollarSign,
  CreditCard,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ==================== أنواع البيانات ====================

interface Agent {
  id: string;
  name: string;
  phone?: string;
  balance: number;
}

interface Farmer {
  id: string;
  name: string;
  fullName?: string;
  phone?: string;
}

interface Payment {
  id: string;
  amount: number;
  direction: 'FROM_AGENT' | 'TO_AGENT';
  description: string | null;
  date: string;
  agent: { id: string; name: string };
}

interface ShipmentItem {
  id: string;
  totalFee: number;
  totalPieces: number;
  farmerAlias: string | null;
  farmer: { id: string; name: string };
  agent: { id: string; name: string };
  khatDetails: { pieces: number; feePerPiece: number; totalFee: number }[];
  shipment: { date: string };
}

// ==================== Tab حسابات الوكلاء ====================

function AgentsAccountsTab() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [shipmentItems, setShipmentItems] = useState<ShipmentItem[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDirection, setPaymentDirection] = useState<'FROM_AGENT' | 'TO_AGENT'>('FROM_AGENT');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // تحميل الوكلاء
  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await fetch('/api/agents');
        const data = await res.json();
        setAgents(data.agents || []);
      } catch (err) {
        console.error('Error loading agents:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAgents();
  }, []);

  // تحميل تفاصيل الوكيل
  const loadAgentDetails = useCallback(async (agentId: string) => {
    setLoadingDetails(true);
    try {
      const [paymentsRes, shipmentsRes] = await Promise.all([
        fetch(`/api/payments?agentId=${agentId}`),
        fetch('/api/shipments'),
      ]);

      const paymentsData = await paymentsRes.json();
      const shipmentsData = await shipmentsRes.json();

      setPayments(paymentsData.payments || []);

      // فلترة عناصر الشحنات الخاصة بالوكيل
      const allItems = shipmentsData.shipments?.flatMap((s: { items: ShipmentItem[] }) => s.items) || [];
      setShipmentItems(allItems.filter((item: ShipmentItem) => item.agent.id === agentId));
    } catch (err) {
      console.error('Error loading agent details:', err);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  // اختيار وكيل
  function handleSelectAgent(agent: Agent) {
    setSelectedAgent(agent);
    loadAgentDetails(agent.id);
  }

  // تسديد مبلغ
  async function handlePayment() {
    if (!selectedAgent || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({ title: 'خطأ', description: 'يرجى إدخال مبلغ صحيح', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          amount: parseFloat(paymentAmount),
          direction: paymentDirection,
          description: paymentDescription || null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // تحديث الرصيد
        const balanceChange = paymentDirection === 'FROM_AGENT' ? -parseFloat(paymentAmount) : parseFloat(paymentAmount);
        const updatedAgents = agents.map(a =>
          a.id === selectedAgent.id
            ? { ...a, balance: a.balance + balanceChange }
            : a
        );
        setAgents(updatedAgents);
        setSelectedAgent({ ...selectedAgent, balance: selectedAgent.balance + balanceChange });

        toast({ title: 'تم', description: 'تم تسجيل التسديد بنجاح' });
        setShowPaymentDialog(false);
        setPaymentAmount('');
        setPaymentDescription('');
        loadAgentDetails(selectedAgent.id);
      } else {
        toast({ title: 'خطأ', description: data.error || 'حدث خطأ', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ في الاتصال', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  const totalBalance = agents.reduce((sum, a) => sum + Math.max(0, a.balance), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* قائمة الوكلاء */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            حسابات الوكلاء
          </CardTitle>
          <CardDescription>
            إجمالي الأجرة المستحقة:
            <span className="font-bold text-red-600 ms-2">
              {totalBalance.toLocaleString()} ريال
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-right">عليه أجرة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow
                    key={agent.id}
                    className={`cursor-pointer hover:bg-muted/50 ${
                      selectedAgent?.id === agent.id ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                    }`}
                    onClick={() => handleSelectAgent(agent)}
                  >
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell>{agent.phone || '-'}</TableCell>
                    <TableCell>
                      <span className={agent.balance > 0 ? 'text-red-600 font-bold' : agent.balance < 0 ? 'text-green-600 font-bold' : ''}>
                        {agent.balance.toLocaleString()} ريال
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* تفاصيل الوكيل */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              {selectedAgent ? `تفاصيل: ${selectedAgent.name}` : 'اختر وكيلاً'}
            </span>
            {selectedAgent && (
              <Button
                onClick={() => setShowPaymentDialog(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <DollarSign className="h-4 w-4 me-1" />
                تسديد
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedAgent ? (
            <div className="text-center py-8 text-muted-foreground">
              اختر وكيلاً من القائمة لعرض التفاصيل
            </div>
          ) : (
            <div className="space-y-4">
              {/* الرصيد */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">الرصيد المستحق</span>
                  <span className={`text-2xl font-bold ${selectedAgent.balance > 0 ? 'text-red-600' : selectedAgent.balance < 0 ? 'text-green-600' : ''}`}>
                    {selectedAgent.balance.toLocaleString()} ريال
                  </span>
                </div>
                {selectedAgent.balance > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    هذا المبلغ أجرة توصيل مستحقة على الوكيل
                  </p>
                )}
              </div>

              <Separator />

              {/* سجل الشحنات */}
              <div>
                <h4 className="font-medium mb-3">سجل الشحنات</h4>
                {loadingDetails ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : shipmentItems.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">لا توجد شحنات</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {shipmentItems.slice(0, 10).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 bg-muted/30 rounded"
                      >
                        <div>
                          <p className="text-sm">{item.farmerAlias || item.farmer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.shipment.date).toLocaleDateString('ar-SA')}
                          </p>
                        </div>
                        <div className="text-left">
                          <p className="text-sm">{item.totalPieces} حبة</p>
                          <p className="text-sm font-medium text-amber-600">{item.totalFee.toLocaleString()} ريال</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* سجل التسديدات */}
              <div>
                <h4 className="font-medium mb-3">سجل التسديدات</h4>
                {payments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">لا توجد تسديدات</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-2 bg-muted/30 rounded"
                      >
                        <div>
                          <p className="text-sm">{payment.description || 'تسديد'}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(payment.date).toLocaleDateString('ar-SA')}
                          </p>
                        </div>
                        <Badge
                          className={
                            payment.direction === 'FROM_AGENT'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }
                        >
                          {payment.direction === 'FROM_AGENT' ? '-' : '+'}
                          {payment.amount.toLocaleString()} ريال
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* نافذة التسديد */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تسديد مبلغ</DialogTitle>
            <DialogDescription>
              {selectedAgent?.name} - الرصيد: {selectedAgent?.balance.toLocaleString()} ريال
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>نوع التسديد</Label>
              <Select value={paymentDirection} onValueChange={(v) => setPaymentDirection(v as 'FROM_AGENT' | 'TO_AGENT')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FROM_AGENT">الوكيل سدد أجرة</SelectItem>
                  <SelectItem value="TO_AGENT">رجعنا للوكيل مبلغ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>المبلغ (ريال)</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>ملاحظة (اختياري)</Label>
              <Input
                value={paymentDescription}
                onChange={(e) => setPaymentDescription(e.target.value)}
                placeholder="تسديد مبلغ..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handlePayment} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تسديد'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== Tab حسابات المزارعين ====================

function FarmersAccountsTab() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);

  // تحميل المزارعين
  useEffect(() => {
    async function loadFarmers() {
      try {
        const res = await fetch('/api/farmers');
        const data = await res.json();
        setFarmers(data.farmers || []);
      } catch (err) {
        console.error('Error loading farmers:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFarmers();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-green-600" />
          المزارعين (المرسلين)
        </CardTitle>
        <CardDescription>
          قائمة المزارعين المسجلين في النظام
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">الاسم الكامل</TableHead>
                <TableHead className="text-right">الهاتف</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {farmers.map((farmer) => (
                <TableRow key={farmer.id}>
                  <TableCell className="font-medium">{farmer.name}</TableCell>
                  <TableCell>{farmer.fullName || '-'}</TableCell>
                  <TableCell>{farmer.phone || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== الصفحة الرئيسية ====================

export default function AccountsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; username: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const localUser = localStorage.getItem('user');
        if (localUser) {
          setUser(JSON.parse(localUser));
        } else {
          router.replace('/');
        }
      } catch {
        router.replace('/');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  function handleLogout() {
    localStorage.removeItem('user');
    localStorage.removeItem('session_token');
    router.replace('/');
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <DashboardLayout userRole={user.role as 'ADMIN' | 'WORKER'} username={user.username} onLogout={handleLogout}>
      <div className="space-y-6">
        {/* العنوان */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
            <Wallet className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">إدارة الحسابات</h1>
            <p className="text-muted-foreground">حسابات الوكلاء والمزارعين</p>
          </div>
        </div>

        {/* التبويبات */}
        <Tabs defaultValue="agents" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="agents" className="gap-2">
              <Users className="h-4 w-4" />
              حسابات الوكلاء
            </TabsTrigger>
            <TabsTrigger value="farmers" className="gap-2">
              <Users className="h-4 w-4" />
              المزارعين
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="mt-6">
            <AgentsAccountsTab />
          </TabsContent>

          <TabsContent value="farmers" className="mt-6">
            <FarmersAccountsTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
