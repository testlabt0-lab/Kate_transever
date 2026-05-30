'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShareShipmentAgentDialog } from "@/components/share-shipment-agent-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Trash2,
  Share2,
  Search,
  Package,
  Users,
  Loader2,
  CheckCircle,
  User,
  X,
  DollarSign,
  Leaf,
  Printer,
  Clock,
  Truck,
  Filter,
  RotateCcw,
  AlertTriangle,
  Calendar,
  CalendarDays,
  Save,
  Edit2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PrintReceipt } from '@/components/print/print-receipt';

// ==================== Types ====================

type DeliveryStatus = 'PENDING' | 'RECEIVED' | 'IN_TRANSIT' | 'DELIVERED';

// أيام الأسبوع بالعربية
const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function getArabicWeekDay(date: Date): string {
  return ARABIC_DAYS[date.getDay()];
}

function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

interface Farmer {
  id: string;
  name: string;
  phone: string | null;
}

interface Agent {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
}

interface KhatType {
  id: string;
  name: string;
  feePerPiece: number;
}

interface KhatDetailInput {
  khatTypeId: string;
  khatTypeName: string;
  pieces: number;
  feePerPiece: number;
  totalFee: number;
}

interface ShipmentItemInput {
  id?: string; // للعناصر المحفوظة
  farmerId: string;
  farmerName: string;
  farmerAlias: string;
  agentId: string;
  khatDetails: KhatDetailInput[];
  numberOfBags: number;
  notes?: string;
}

interface KhatDetail {
  id: string;
  khatTypeId: string;
  pieces: number;
  feePerPiece: number;
  totalFee: number;
}

interface ShipmentItem {
  id: string;
  farmerAlias: string | null;
  notes: string | null;
  totalPieces: number;
  totalFee: number;
  numberOfBags: number;
  deliveryStatus: DeliveryStatus;
  receivedBy: string | null;
  receivedAt: string | null;
  isIsolated: boolean;
  isolatedAt: string | null;
  isolationReason: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  farmer: { id: string; name: string };
  agent: { id: string; name: string };
  khatDetails: KhatDetail[];
}

interface Shipment {
  id: string;
  date: string;
  weekDay: string | null;
  status: 'PENDING' | 'DELIVERED';
  notes: string | null;
  user: { id: string; username: string };
  transporter?: { id: string; name: string; phone?: string } | null;
  deliveryPerson?: { id: string; name: string; phone?: string } | null;
  items: ShipmentItem[];
  totalPieces: number;
  totalFee: number;
  farmersCount: number;
  agentsCount: number;
  overallDeliveryStatus: DeliveryStatus;
  isolatedCount?: number;
}

interface Payment {
  id: string;
  amount: number;
  direction: 'FROM_AGENT' | 'TO_AGENT';
  description: string | null;
  date: string;
  agent: { id: string; name: string };
}

interface User {
  id: string;
  username: string;
  role: string;
}

interface IsolatedReminder {
  id: string;
  shipmentItemId: string;
  remindAt: string;
  intervalHours: number;
  isActive: boolean;
  reminderCount: number;
  lastRemindedAt: string | null;
  shipmentItem: {
    id: string;
    totalPieces: number;
    totalFee: number;
    farmer: { name: string };
    agent: { name: string };
    shipment: {
      id: string;
      date: string;
      weekDay: string | null;
    };
  };
}

// ==================== Main Component ====================

export default function ShipmentsPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [khatTypes, setKhatTypes] = useState<KhatType[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [deliveryPersons, setDeliveryPersons] = useState<{id: string; name: string; phone?: string}[]>([]);
  const [isolatedReminders, setIsolatedReminders] = useState<IsolatedReminder[]>([]);

  // New Shipment Dialog
  // Share Shipment Agent Dialog
  const [showShareAgentDialog, setShowShareAgentDialog] = useState(false);
  const [selectedShipmentForShare, setSelectedShipmentForShare] = useState<any>(null);
  const [selectedAgentForShare, setSelectedAgentForShare] = useState<string | null>(null);
  const [showSelectAgentDialog, setShowSelectAgentDialog] = useState(false);

  const [showNewShipment, setShowNewShipment] = useState(false);
  const [shipmentItems, setShipmentItems] = useState<ShipmentItemInput[]>([]);
  const [shipmentNotes, setShipmentNotes] = useState('');
  const [selectedDeliveryPersonId, setSelectedDeliveryPersonId] = useState<string>('');

  // Date selection
  const [showDateDialog, setShowDateDialog] = useState(false);
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [customDate, setCustomDate] = useState(getTodayDate());
  const [pendingShipmentItems, setPendingShipmentItems] = useState<ShipmentItemInput[]>([]);

  // Item Dialog
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [itemFarmerId, setItemFarmerId] = useState('');
  const [itemFarmerAlias, setItemFarmerAlias] = useState('');
  const [itemAgentId, setItemAgentId] = useState('');
  const [itemKhatDetails, setItemKhatDetails] = useState<KhatDetailInput[]>([]);
  const [itemNotes, setItemNotes] = useState('');
  const [itemNumberOfBags, setItemNumberOfBags] = useState<string>('1');

  // Search
  const [farmerSearch, setFarmerSearch] = useState('');
  const [agentSearch, setAgentSearch] = useState('');

  // Add Dialogs
  const [showAddFarmer, setShowAddFarmer] = useState(false);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [showAddKhatType, setShowAddKhatType] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAgentId, setPaymentAgentId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDirection, setPaymentDirection] = useState<'FROM_AGENT' | 'TO_AGENT'>('FROM_AGENT');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newFee, setNewFee] = useState('');
  const [adding, setAdding] = useState(false);

  // View
  const [showShipmentDetails, setShowShipmentDetails] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [showPrintReceipt, setShowPrintReceipt] = useState(false);
  const [printShipment, setPrintShipment] = useState<Shipment | null>(null);

  // Tab
  const [activeTab, setActiveTab] = useState('shipments');

  // Edit shipment mode
  const [editingShipmentId, setEditingShipmentId] = useState<string | null>(null);

  // Delivery Confirmation Dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmingShipment, setConfirmingShipment] = useState<Shipment | null>(null);
  const [confirmingItemId, setConfirmingItemId] = useState<string | null>(null);
  const [receivedByName, setReceivedByName] = useState('');
  const [confirming, setConfirming] = useState(false);

  // Isolation Dialog
  const [showIsolateDialog, setShowIsolateDialog] = useState(false);
  const [isolatingItem, setIsolatingItem] = useState<ShipmentItem | null>(null);
  const [isolatingShipment, setIsolatingShipment] = useState<Shipment | null>(null);
  const [isolationReason, setIsolationReason] = useState('');
  const [isolating, setIsolating] = useState(false);

  // Resolve Dialog
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolvingItem, setResolvingItem] = useState<ShipmentItem | null>(null);
  const [resolvingShipment, setResolvingShipment] = useState<Shipment | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  // Filters
  const [filterDeliveryStatus, setFilterDeliveryStatus] = useState<string>('ALL');
  const [searchFarmer, setSearchFarmer] = useState('');
  const [searchAgent, setSearchAgent] = useState('');
  const [searchDateFrom, setSearchDateFrom] = useState('');
  const [searchDateTo, setSearchDateTo] = useState('');

  // ==================== Effects ====================

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      window.location.href = '/';
      return;
    }
    setUser(JSON.parse(userData));
    setLoading(false);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterDeliveryStatus !== 'ALL') {
        params.append('deliveryStatus', filterDeliveryStatus);
      }
      if (searchFarmer) {
        params.append('farmer', searchFarmer);
      }
      if (searchAgent) {
        params.append('agent', searchAgent);
      }
      if (searchDateFrom) {
        params.append('dateFrom', searchDateFrom);
      }
      if (searchDateTo) {
        params.append('dateTo', searchDateTo);
      }

      const [farmersRes, agentsRes, khatTypesRes, shipmentsRes, paymentsRes, deliveryPersonsRes, remindersRes] = await Promise.all([
        fetch('/api/farmers'),
        fetch('/api/agents'),
        fetch('/api/khat-types'),
        fetch(`/api/shipments?${params.toString()}`),
        fetch('/api/payments'),
        fetch('/api/delivery-persons'),
        fetch('/api/isolated-reminders?activeOnly=true'),
      ]);

      const farmersData = await farmersRes.json();
      const agentsData = await agentsRes.json();
      const khatTypesData = await khatTypesRes.json();
      const shipmentsData = await shipmentsRes.json();
      const paymentsData = await paymentsRes.json();
      const deliveryPersonsData = await deliveryPersonsRes.json();
      const remindersData = await remindersRes.json();

      setFarmers(farmersData.farmers || []);
      setAgents(agentsData.agents || []);
      setKhatTypes(khatTypesData.khatTypes || []);
      setShipments(shipmentsData.shipments || []);
      setPayments(paymentsData.payments || []);
      setDeliveryPersons(deliveryPersonsData.data || []);
      setIsolatedReminders(remindersData.reminders || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: 'خطأ', description: 'فشل في تحميل البيانات', variant: 'destructive' });
    }
  }, [toast, filterDeliveryStatus, searchFarmer, searchAgent, searchDateFrom, searchDateTo]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  // ==================== Computed ====================

  const getItemTotal = (details: KhatDetailInput[]) => details.reduce((sum, d) => sum + d.totalFee, 0);
  const getItemPieces = (details: KhatDetailInput[]) => details.reduce((sum, d) => sum + d.pieces, 0);

  const getTotalPieces = () => shipmentItems.reduce((sum, item) => sum + getItemPieces(item.khatDetails), 0);
  const getTotalFee = () => shipmentItems.reduce((sum, item) => sum + getItemTotal(item.khatDetails), 0);

  // ==================== Handlers ====================

  const handleAddFarmer = async () => {
    if (!newName.trim()) {
      toast({ title: 'خطأ', description: 'الاسم مطلوب', variant: 'destructive' });
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/farmers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, phone: newPhone || null }),
      });
      const data = await res.json();
      if (data.success) {
        setFarmers([...farmers, data.farmer]);
        setItemFarmerId(data.farmer.id);
        setItemFarmerAlias(data.farmer.name);
        setNewName('');
        setNewPhone('');
        setShowAddFarmer(false);
        toast({ title: 'تم', description: 'تم إضافة المزارع' });
      } else {
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const handleAddAgent = async () => {
    if (!newName.trim()) {
      toast({ title: 'خطأ', description: 'الاسم مطلوب', variant: 'destructive' });
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, phone: newPhone || null }),
      });
      const data = await res.json();
      if (data.success) {
        setAgents([...agents, data.agent]);
        setItemAgentId(data.agent.id);
        setNewName('');
        setNewPhone('');
        setShowAddAgent(false);
        toast({ title: 'تم', description: 'تم إضافة الوكيل' });
      } else {
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const handleAddKhatType = async () => {
    if (!newName.trim()) {
      toast({ title: 'خطأ', description: 'الاسم مطلوب', variant: 'destructive' });
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/khat-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          feePerPiece: parseFloat(newFee) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setKhatTypes([...khatTypes, data.khatType]);
        setNewName('');
        setNewFee('');
        setShowAddKhatType(false);
        toast({ title: 'تم', description: 'تم إضافة نوع القات' });
      } else {
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const handlePayment = async () => {
    if (!paymentAgentId || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({ title: 'خطأ', description: 'جميع الحقول مطلوبة', variant: 'destructive' });
      return;
    }

    setAdding(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: paymentAgentId,
          amount: parseFloat(paymentAmount),
          direction: paymentDirection,
          description: paymentDescription || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'تم', description: 'تم تسجيل التسديد' });
        setPaymentAgentId('');
        setPaymentAmount('');
        setPaymentDescription('');
        setShowPayment(false);
        loadData();
      } else {
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const openAddItemDialog = () => {
    setEditingItemIndex(null);
    setItemFarmerId('');
    setItemFarmerAlias('');
    setItemAgentId('');
    setItemKhatDetails([]);
    setItemNotes('');
    setItemNumberOfBags('1');
    setFarmerSearch('');
    setAgentSearch('');
    setShowItemDialog(true);
  };

  const addKhatDetail = () => {
    setItemKhatDetails([
      ...itemKhatDetails,
      { khatTypeId: '', khatTypeName: '', pieces: 0, feePerPiece: 0, totalFee: 0 },
    ]);
  };

  const updateKhatDetail = (index: number, field: string, value: string | number) => {
    const updated = [...itemKhatDetails];

    if (field === 'khatTypeId') {
      const khatType = khatTypes.find((k) => k.id === value);
      updated[index] = {
        ...updated[index],
        khatTypeId: value as string,
        khatTypeName: khatType?.name || '',
        feePerPiece: khatType?.feePerPiece || 0,
        totalFee: (updated[index].pieces || 0) * (khatType?.feePerPiece || 0),
      };
    } else if (field === 'pieces') {
      const pieces = parseInt(value as string) || 0;
      updated[index] = {
        ...updated[index],
        pieces,
        totalFee: pieces * updated[index].feePerPiece,
      };
    }

    setItemKhatDetails(updated);
  };

  const removeKhatDetail = (index: number) => {
    setItemKhatDetails(itemKhatDetails.filter((_, i) => i !== index));
  };

  // حفظ العنصر محلياً أو في الشحنة الموجودة
  const handleSaveItem = async () => {
    if (!itemFarmerId) {
      toast({ title: 'خطأ', description: 'اختر المزارع', variant: 'destructive' });
      return;
    }
    if (!itemAgentId) {
      toast({ title: 'خطأ', description: 'اختر الوكيل', variant: 'destructive' });
      return;
    }
    const validDetails = itemKhatDetails.filter((d) => d.khatTypeId && d.pieces > 0);
    if (validDetails.length === 0) {
      toast({ title: 'خطأ', description: 'أضف نوع قات واحد على الأقل', variant: 'destructive' });
      return;
    }

    const farmer = farmers.find((f) => f.id === itemFarmerId);

    const newItem: ShipmentItemInput = {
      farmerId: itemFarmerId,
      farmerName: farmer?.name || '',
      farmerAlias: itemFarmerAlias || farmer?.name || '',
      agentId: itemAgentId,
      khatDetails: validDetails,
      numberOfBags: parseInt(itemNumberOfBags) || 1,
      notes: itemNotes || undefined,
    };

    // إذا كنا نعدل شحنة موجودة، احفظ مباشرة
    if (editingShipmentId) {
      try {
        const res = await fetch('/api/shipment-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shipmentId: editingShipmentId,
            ...newItem,
            khatDetails: validDetails.map(d => ({
              khatTypeId: d.khatTypeId,
              pieces: d.pieces,
            })),
          }),
        });
        const data = await res.json();
        if (data.success) {
          toast({ title: 'تم الحفظ تلقائياً', description: `تم إضافة العنصر للشحنة` });
          setShowItemDialog(false);
          loadData();
          // تحديث العناصر المحلية
          setShipmentItems([...shipmentItems, { ...newItem, id: data.item.id }]);
        } else {
          toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
        }
      } catch {
        toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
      }
    } else {
      // حفظ محلي
      if (editingItemIndex !== null) {
        const updated = [...shipmentItems];
        updated[editingItemIndex] = newItem;
        setShipmentItems(updated);
      } else {
        setShipmentItems([...shipmentItems, newItem]);
      }
      setShowItemDialog(false);
    }
  };

  const handleRemoveItem = async (index: number, itemId?: string) => {
    // إذا كان العنصر محفوظ في قاعدة البيانات
    if (editingShipmentId && itemId) {
      try {
        const res = await fetch(`/api/shipment-items?itemId=${itemId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          toast({ title: 'تم', description: 'تم حذف العنصر' });
          loadData();
          setShipmentItems(shipmentItems.filter((_, i) => i !== index));
        } else {
          toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
        }
      } catch {
        toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
      }
    } else {
      setShipmentItems(shipmentItems.filter((_, i) => i !== index));
    }
  };

  // فتح حوار اختيار التاريخ
  const openDateSelection = () => {
    if (shipmentItems.length === 0) {
      toast({ title: 'خطأ', description: 'يجب إضافة عنصر واحد على الأقل', variant: 'destructive' });
      return;
    }
    setPendingShipmentItems(shipmentItems);
    setCustomDate(getTodayDate());
    setUseCustomDate(false);
    setShowDateDialog(true);
  };

  // إنشاء الشحنة مع التاريخ
  const handleCreateShipment = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          notes: shipmentNotes || null,
          deliveryPersonId: selectedDeliveryPersonId || null,
          customDate: useCustomDate ? customDate : null,
          items: shipmentItems.map((item) => ({
            farmerId: item.farmerId,
            farmerAlias: item.farmerAlias,
            agentId: item.agentId,
            numberOfBags: item.numberOfBags,
            khatDetails: item.khatDetails.map((d) => ({
              khatTypeId: d.khatTypeId,
              pieces: d.pieces,
            })),
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        const weekDay = data.shipment.weekDay || getArabicWeekDay(new Date(data.shipment.date));
        toast({
          title: 'تم حفظ الشحنة',
          description: `${weekDay} - الأجرة: ${getTotalFee().toLocaleString()} ريال`,
        });
        setShipmentItems([]);
        setShipmentNotes('');
        setSelectedDeliveryPersonId('');
        setShowNewShipment(false);
        setShowDateDialog(false);
        setEditingShipmentId(null);
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

  const handleDeleteShipment = async (shipmentId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الشحنة؟')) return;

    try {
      const res = await fetch(`/api/shipments?id=${shipmentId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'تم', description: 'تم حذف الشحنة' });
        loadData();
      } else {
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
    }
  };

  // Handle delivery confirmation
  // ==================== Share Handlers ====================

  const handleShareToAgent = (shipment: Shipment) => {
    // Get unique agents from the shipment items
    const agentIds = Array.from(new Set(shipment.items.map(item => item.agent?.id || item.agentId).filter(Boolean)));

    if (agentIds.length === 0) {
      toast({ title: 'تنبيه', description: 'لا يوجد وكلاء في هذه الشحنة' });
      return;
    }

    if (agentIds.length === 1) {
      // Only one agent, skip selection
      setSelectedShipmentForShare(shipment);
      setSelectedAgentForShare(agentIds[0]);
      setShowShareAgentDialog(true);
    } else {
      // Multiple agents, show selection dialog
      setSelectedShipmentForShare(shipment);
      setShowSelectAgentDialog(true);
    }
  };

  const handleAgentSelectedForShare = (agentId: string) => {
    setSelectedAgentForShare(agentId);
    setShowSelectAgentDialog(false);
    setShowShareAgentDialog(true);
  };
  const handleConfirmDelivery = async () => {
    if (!confirmingShipment) return;
    if (!receivedByName.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم المستلم', variant: 'destructive' });
      return;
    }

    setConfirming(true);
    try {
      const res = await fetch(`/api/shipments/${confirmingShipment.id}/confirm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: confirmingItemId,
          receivedBy: receivedByName,
          deliveryStatus: 'DELIVERED',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'تم', description: 'تم تأكيد الاستلام بنجاح' });
        setShowConfirmDialog(false);
        setConfirmingShipment(null);
        setConfirmingItemId(null);
        setReceivedByName('');
        loadData();
      } else {
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
    } finally {
      setConfirming(false);
    }
  };

  // Handle item isolation
  const handleIsolateItem = async () => {
    if (!isolatingItem || !isolatingShipment) return;
    if (!isolationReason.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال سبب التحييد', variant: 'destructive' });
      return;
    }

    setIsolating(true);
    try {
      const res = await fetch(`/api/shipments/${isolatingShipment.id}/confirm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: isolatingItem.id,
          isIsolate: true,
          isolationReason: isolationReason,
          isolatedBy: user?.username,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'تم', description: 'تم تحييد العنصر وإنشاء تذكير دوري' });
        setShowIsolateDialog(false);
        setIsolatingItem(null);
        setIsolatingShipment(null);
        setIsolationReason('');
        loadData();
      } else {
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
    } finally {
      setIsolating(false);
    }
  };

  // Handle resolve isolated item
  const handleResolveItem = async () => {
    if (!resolvingItem || !resolvingShipment) return;

    setResolving(true);
    try {
      const res = await fetch(`/api/shipments/${resolvingShipment.id}/confirm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: resolvingItem.id,
          isResolve: true,
          resolutionNotes: resolutionNotes || 'تم إيجاد العنصر',
          deliveryStatus: 'DELIVERED',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'تم', description: 'تم حل المشكلة وإيقاف التذكيرات' });
        setShowResolveDialog(false);
        setResolvingItem(null);
        setResolvingShipment(null);
        setResolutionNotes('');
        loadData();
      } else {
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
    } finally {
      setResolving(false);
    }
  };

  // Open confirmation dialog
  const openConfirmDialog = (shipment: Shipment, itemId?: string) => {
    setConfirmingShipment(shipment);
    setConfirmingItemId(itemId || null);
    setReceivedByName('');
    setShowConfirmDialog(true);
  };

  // Open isolation dialog
  const openIsolateDialog = (shipment: Shipment, item: ShipmentItem) => {
    setIsolatingShipment(shipment);
    setIsolatingItem(item);
    setIsolationReason('');
    setShowIsolateDialog(true);
  };

  // Open resolve dialog
  const openResolveDialog = (shipment: Shipment, item: ShipmentItem) => {
    setResolvingShipment(shipment);
    setResolvingItem(item);
    setResolutionNotes('');
    setShowResolveDialog(true);
  };

  // Get delivery status display info
  const getDeliveryStatusInfo = (status: DeliveryStatus, isIsolated?: boolean) => {
    if (isIsolated) {
      return { label: 'محايد', color: 'bg-red-100 text-red-700', icon: AlertTriangle };
    }
    switch (status) {
      case 'PENDING':
        return { label: 'معلق', color: 'bg-gray-100 text-gray-700', icon: Clock };
      case 'RECEIVED':
        return { label: 'تم الاستلام', color: 'bg-sky-100 text-sky-700', icon: CheckCircle };
      case 'IN_TRANSIT':
        return { label: 'في الطريق', color: 'bg-orange-100 text-orange-700', icon: Truck };
      case 'DELIVERED':
        return { label: 'تم التسليم', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle };
      default:
        return { label: 'معلق', color: 'bg-gray-100 text-gray-700', icon: Clock };
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilterDeliveryStatus('ALL');
    setSearchFarmer('');
    setSearchAgent('');
    setSearchDateFrom('');
    setSearchDateTo('');
  };

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  // ==================== Render ====================

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const totalIsolated = shipments.reduce((sum, s) => sum + (s.isolatedCount || 0), 0);

  return (
    <DashboardLayout userRole={user.role as 'ADMIN' | 'WORKER'} username={user.username} onLogout={handleLogout}>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">تسيير القات</h1>
            <p className="text-sm text-muted-foreground">إدارة التوصيل والأجرة</p>
          </div>
          <div className="flex gap-2">
            {totalIsolated > 0 && (
              <Badge variant="destructive" className="h-9 px-3">
                <AlertTriangle className="h-4 w-4 me-1" />
                {totalIsolated} عنصر محايد
              </Badge>
            )}
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 h-9 sm:h-10"
              onClick={() => {
                setShipmentItems([]);
                setShipmentNotes('');
                setEditingShipmentId(null);
                setShowNewShipment(true);
              }}
            >
              <Plus className="h-4 w-4 me-2" />
              إضافة شحنة
            </Button>
          </div>
        </div>

        {/* ملخص */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">المزارعين</p>
                  <p className="text-lg font-bold">{farmers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-xs text-muted-foreground">الوكلاء</p>
                  <p className="text-lg font-bold">{agents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-xs text-muted-foreground">أنواع القات</p>
                  <p className="text-lg font-bold">{khatTypes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-xs text-muted-foreground">إجمالي الأجور</p>
                  <p className="text-lg font-bold">{shipments.reduce((sum, s) => sum + s.totalFee, 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* تنبيه العناصر المحايدة */}
        {isolatedReminders.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="font-medium text-red-700">عناصر محايدة تحتاج متابعة ({isolatedReminders.length})</span>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {isolatedReminders.map((reminder) => (
                  <div key={reminder.id} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                    <div>
                      <span className="font-medium">{reminder.shipmentItem.farmer.name}</span>
                      <span className="mx-2">→</span>
                      <span className="font-medium">{reminder.shipmentItem.agent.name}</span>
                      <span className="mx-2 text-muted-foreground">({reminder.shipmentItem.totalPieces} حبة)</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {reminder.shipmentItem.shipment.weekDay || getArabicWeekDay(new Date(reminder.shipmentItem.shipment.date))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="shipments">الشحنات</TabsTrigger>
            <TabsTrigger value="khatTypes">أنواع القات</TabsTrigger>
            <TabsTrigger value="farmers">المزارعين</TabsTrigger>
            <TabsTrigger value="agents">الوكلاء</TabsTrigger>
          </TabsList>

          {/* الشحنات */}
          <TabsContent value="shipments" className="mt-4 space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">الفلاتر</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs me-auto"
                    onClick={resetFilters}
                  >
                    <RotateCcw className="h-3 w-3 me-1" />
                    إعادة تعيين
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">حالة التسليم</Label>
                    <Select value={filterDeliveryStatus} onValueChange={setFilterDeliveryStatus}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="جميع الحالات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">الكل</SelectItem>
                        <SelectItem value="PENDING">معلق</SelectItem>
                        <SelectItem value="RECEIVED">تم الاستلام</SelectItem>
                        <SelectItem value="IN_TRANSIT">في الطريق</SelectItem>
                        <SelectItem value="DELIVERED">تم التسليم</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">المزارع</Label>
                    <Input
                      placeholder="اسم المزارع..."
                      value={searchFarmer}
                      onChange={(e) => setSearchFarmer(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">الوكيل</Label>
                    <Input
                      placeholder="اسم الوكيل..."
                      value={searchAgent}
                      onChange={(e) => setSearchAgent(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">من تاريخ</Label>
                    <Input
                      type="date"
                      value={searchDateFrom}
                      onChange={(e) => setSearchDateFrom(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">إلى تاريخ</Label>
                    <Input
                      type="date"
                      value={searchDateTo}
                      onChange={(e) => setSearchDateTo(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipments List */}
            <Card>
              <CardContent className="p-3 sm:p-4">
                {shipments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">لا توجد شحنات مسجلة</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {shipments.map((shipment) => {
                      const statusInfo = getDeliveryStatusInfo(shipment.overallDeliveryStatus);
                      const StatusIcon = statusInfo.icon;

                      return (
                        <div
                          key={shipment.id}
                          className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm sm:text-base">
                                  {new Date(shipment.date).toLocaleDateString('ar-SA')}
                                </span>
                                {shipment.weekDay && (
                                  <Badge variant="outline" className="text-xs">
                                    {shipment.weekDay}
                                  </Badge>
                                )}
                                <Badge className={statusInfo.color}>
                                  <StatusIcon className="h-3 w-3 me-1" />
                                  {statusInfo.label}
                                </Badge>
                                {shipment.isolatedCount && shipment.isolatedCount > 0 && (
                                  <Badge variant="destructive">
                                    <AlertTriangle className="h-3 w-3 me-1" />
                                    {shipment.isolatedCount} محايد
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                                <span className="me-3">👤 {shipment.user.username}</span>
                                <span className="me-3">📦 {shipment.totalPieces} حبة</span>
                                <span className="text-amber-600 font-medium">💰 أجرة: {shipment.totalFee.toLocaleString()} ريال</span>
                              </div>
                            </div>
                            <div className="flex gap-1 flex-wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleShareToAgent(shipment)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="مشاركة للوكيل"
                              >
                                <Share2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-sky-600"
                                title="طباعة إيصال"
                                onClick={() => {
                                  setPrintShipment(shipment);
                                  setShowPrintReceipt(true);
                                }}
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8"
                                title="عرض التفاصيل"
                                onClick={() => {
                                  setSelectedShipment(shipment);
                                  setShowShipmentDetails(true);
                                }}
                              >
                                <Search className="h-4 w-4" />
                              </Button>
                              {shipment.overallDeliveryStatus !== 'DELIVERED' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-emerald-600"
                                  title="تأكيد الاستلام"
                                  onClick={() => openConfirmDialog(shipment)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {shipment.status === 'PENDING' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-sky-600"
                                  title="إضافة عناصر"
                                  onClick={() => {
                                    setEditingShipmentId(shipment.id);
                                    setShipmentItems(shipment.items.map(item => ({
                                      id: item.id,
                                      farmerId: item.farmer.id,
                                      farmerName: item.farmer.name,
                                      farmerAlias: item.farmerAlias || item.farmer.name,
                                      agentId: item.agent.id,
                                      khatDetails: item.khatDetails.map(kd => ({
                                        khatTypeId: kd.khatTypeId,
                                        khatTypeName: khatTypes.find(kt => kt.id === kd.khatTypeId)?.name || '',
                                        pieces: kd.pieces,
                                        feePerPiece: kd.feePerPiece,
                                        totalFee: kd.totalFee,
                                      })),
                                      notes: item.notes || undefined,
                                    })));
                                    setShipmentNotes(shipment.notes || '');
                                    setShowNewShipment(true);
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              )}
                              {user.role === 'ADMIN' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-red-500"
                                  onClick={() => handleDeleteShipment(shipment.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* أنواع القات */}
          <TabsContent value="khatTypes" className="mt-4">
            <Card>
              <CardHeader className="p-3 sm:p-4 pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">أنواع القات وأجرة التوصيل</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewName('');
                      setNewFee('');
                      setShowAddKhatType(true);
                    }}
                  >
                    <Plus className="h-4 w-4 me-1" /> إضافة نوع
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                {khatTypes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">لا توجد أنواع قات</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">النوع</TableHead>
                        <TableHead className="text-xs">أجرة الحبة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {khatTypes.map((kt) => (
                        <TableRow key={kt.id}>
                          <TableCell className="text-sm font-medium">{kt.name}</TableCell>
                          <TableCell className="text-sm text-amber-600 font-medium">{kt.feePerPiece} ريال</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* المزارعين */}
          <TabsContent value="farmers" className="mt-4">
            <Card>
              <CardHeader className="p-3 sm:p-4 pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">المزارعين (المرسلين)</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewName('');
                      setNewPhone('');
                      setShowAddFarmer(true);
                    }}
                  >
                    <Plus className="h-4 w-4 me-1" /> إضافة
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                {farmers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">لا يوجد مزارعين</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">الاسم</TableHead>
                        <TableHead className="text-xs">الهاتف</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {farmers.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="text-sm font-medium">{f.name}</TableCell>
                          <TableCell className="text-sm">{f.phone || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* الوكلاء */}
          <TabsContent value="agents" className="mt-4">
            <Card>
              <CardHeader className="p-3 sm:p-4 pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">الوكلاء (المستلمين)</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPayment(true)}
                    >
                      <DollarSign className="h-4 w-4 me-1" /> تسديد
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewName('');
                        setNewPhone('');
                        setShowAddAgent(true);
                      }}
                    >
                      <Plus className="h-4 w-4 me-1" /> إضافة
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                {agents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">لا يوجد وكلاء</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">الاسم</TableHead>
                        <TableHead className="text-xs">الهاتف</TableHead>
                        <TableHead className="text-xs">الرصيد</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agents.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="text-sm font-medium">{a.name}</TableCell>
                          <TableCell className="text-sm">{a.phone || '-'}</TableCell>
                          <TableCell className={`text-sm font-medium ${a.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {a.balance.toLocaleString()} ريال
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ==================== Dialogs ==================== */}

        {/* New Shipment Dialog */}
        <Dialog open={showNewShipment} onOpenChange={(open) => {
          setShowNewShipment(open);
          if (!open) {
            setEditingShipmentId(null);
            setShipmentItems([]);
            setShipmentNotes('');
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingShipmentId ? 'تعديل الشحنة - الحفظ تلقائي' : 'شحنة جديدة'}
              </DialogTitle>
              <DialogDescription>
                {editingShipmentId
                  ? 'سيتم حفظ أي تغييرات تلقائياً عند إضافة أو تعديل العناصر'
                  : 'أضف عناصر الشحنة ثم اختر تاريخ الحفظ'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Items List */}
              {shipmentItems.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">المزارع</TableHead>
                        <TableHead className="text-xs">الوكيل</TableHead>
                        <TableHead className="text-xs">الحبات</TableHead>
                        <TableHead className="text-xs">الأجرة</TableHead>
                        <TableHead className="text-xs w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shipmentItems.map((item, index) => (
                        <TableRow key={item.id || index}>
                          <TableCell className="text-sm">{item.farmerAlias || item.farmerName}</TableCell>
                          <TableCell className="text-sm">{agents.find(a => a.id === item.agentId)?.name}</TableCell>
                          <TableCell className="text-sm">{getItemPieces(item.khatDetails)}</TableCell>
                          <TableCell className="text-sm text-amber-600 font-medium">{getItemTotal(item.khatDetails).toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => {
                                  setEditingItemIndex(index);
                                  setItemFarmerId(item.farmerId);
                                  setItemFarmerAlias(item.farmerAlias);
                                  setItemAgentId(item.agentId);
                                  setItemKhatDetails(item.khatDetails);
                                  setItemNotes(item.notes || '');
                                  setItemNumberOfBags(item.numberOfBags.toString());
                                  setShowItemDialog(true);
                                }}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-500"
                                onClick={() => handleRemoveItem(index, item.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Summary */}
              <div className="flex justify-between items-center bg-muted p-3 rounded-lg">
                <div>
                  <span className="text-sm text-muted-foreground me-4">إجمالي: {getTotalPieces()} حبة</span>
                  <span className="font-bold text-amber-600">{getTotalFee().toLocaleString()} ريال</span>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea
                  value={shipmentNotes}
                  onChange={(e) => setShipmentNotes(e.target.value)}
                  placeholder="ملاحظات إضافية..."
                  rows={2}
                />
              </div>

              {/* Delivery Person */}
              <div className="space-y-2">
                <Label>الموصل (اختياري)</Label>
                <Select value={selectedDeliveryPersonId} onValueChange={setSelectedDeliveryPersonId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الموصل" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryPersons.map((dp) => (
                      <SelectItem key={dp.id} value={dp.id}>{dp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add More Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={openAddItemDialog}
              >
                <Plus className="h-4 w-4 me-2" />
                إضافة مزيد من العناصر
              </Button>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewShipment(false)}>
                إلغاء
              </Button>
              {!editingShipmentId && (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={openDateSelection}
                  disabled={shipmentItems.length === 0 || saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Save className="h-4 w-4 me-2" />}
                  حفظ الشحنة
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Date Selection Dialog */}
        <Dialog open={showDateDialog} onOpenChange={setShowDateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                اختر تاريخ الحفظ
              </DialogTitle>
              <DialogDescription>
                هل تريد حفظ الشحنة بتاريخ اليوم أم تاريخ آخر؟
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted cursor-pointer" onClick={() => setUseCustomDate(false)}>
                <Checkbox checked={!useCustomDate} />
                <div>
                  <p className="font-medium">تاريخ اليوم</p>
                  <p className="text-sm text-muted-foreground">
                    {getArabicWeekDay(new Date())} - {new Date().toLocaleDateString('ar-SA')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted cursor-pointer" onClick={() => setUseCustomDate(true)}>
                <Checkbox checked={useCustomDate} />
                <div>
                  <p className="font-medium">تاريخ مخصص</p>
                  <p className="text-sm text-muted-foreground">اختر تاريخاً محدداً</p>
                </div>
              </div>

              {useCustomDate && (
                <div className="space-y-2 mr-8">
                  <Label>التاريخ</Label>
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                  />
                  {customDate && (
                    <p className="text-sm text-muted-foreground">
                      {getArabicWeekDay(new Date(customDate))}
                    </p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDateDialog(false)}>
                إلغاء
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleCreateShipment}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Save className="h-4 w-4 me-2" />}
                حفظ الشحنة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Item Dialog */}
        <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItemIndex !== null ? 'تعديل عنصر' : 'إضافة عنصر جديد'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Farmer & Agent */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>المزارع</Label>
                  <div className="flex gap-2">
                    <Select value={itemFarmerId} onValueChange={setItemFarmerId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="اختر المزارع" />
                      </SelectTrigger>
                      <SelectContent>
                        <Input
                          placeholder="بحث..."
                          value={farmerSearch}
                          onChange={(e) => setFarmerSearch(e.target.value)}
                          className="mb-2"
                        />
                        {farmers
                          .filter((f) => f.name.includes(farmerSearch))
                          .map((f) => (
                            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewName('');
                        setNewPhone('');
                        setShowAddFarmer(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="الاسم المرسل به (اختياري)"
                    value={itemFarmerAlias}
                    onChange={(e) => setItemFarmerAlias(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>الوكيل</Label>
                  <div className="flex gap-2">
                    <Select value={itemAgentId} onValueChange={setItemAgentId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="اختر الوكيل" />
                      </SelectTrigger>
                      <SelectContent>
                        <Input
                          placeholder="بحث..."
                          value={agentSearch}
                          onChange={(e) => setAgentSearch(e.target.value)}
                          className="mb-2"
                        />
                        {agents
                          .filter((a) => a.name.includes(agentSearch))
                          .map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewName('');
                        setNewPhone('');
                        setShowAddAgent(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Khat Details */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>تفاصيل القات</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addKhatDetail}
                  >
                    <Plus className="h-4 w-4 me-1" /> إضافة نوع
                  </Button>
                </div>

                {itemKhatDetails.length > 0 && (
                  <div className="space-y-2">
                    {itemKhatDetails.map((detail, index) => (
                      <div key={index} className="flex items-end gap-2 p-2 border rounded-lg">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">نوع القات</Label>
                          <Select
                            value={detail.khatTypeId}
                            onValueChange={(v) => updateKhatDetail(index, 'khatTypeId', v)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="اختر النوع" />
                            </SelectTrigger>
                            <SelectContent>
                              {khatTypes.map((kt) => (
                                <SelectItem key={kt.id} value={kt.id}>{kt.name} ({kt.feePerPiece} ريال)</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-24 space-y-1">
                          <Label className="text-xs">الحبات</Label>
                          <Input
                            type="number"
                            value={detail.pieces || ''}
                            onChange={(e) => updateKhatDetail(index, 'pieces', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="w-28 space-y-1">
                          <Label className="text-xs">الأجرة</Label>
                          <Input
                            value={detail.totalFee.toLocaleString()}
                            readOnly
                            className="h-9 bg-muted"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 text-red-500"
                          onClick={() => removeKhatDetail(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Number of Bags */}
              <div className="w-32 space-y-2">
                <Label>عدد العدل</Label>
                <Input
                  type="number"
                  value={itemNumberOfBags}
                  onChange={(e) => setItemNumberOfBags(e.target.value)}
                  min={1}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Input
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="ملاحظات إضافية..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowItemDialog(false)}>
                إلغاء
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveItem}>
                {editingShipmentId ? (
                  <>
                    <Save className="h-4 w-4 me-2" />
                    حفظ تلقائي
                  </>
                ) : (
                  editingItemIndex !== null ? 'تحديث' : 'إضافة'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Shipment Details Dialog */}
        <Dialog open={showShipmentDetails} onOpenChange={setShowShipmentDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                تفاصيل الشحنة
                {selectedShipment?.weekDay && (
                  <Badge variant="outline" className="ms-2">{selectedShipment.weekDay}</Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedShipment && new Date(selectedShipment.date).toLocaleDateString('ar-SA')}
              </DialogDescription>
            </DialogHeader>

            {selectedShipment && (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">المزارع</TableHead>
                      <TableHead className="text-xs">الوكيل</TableHead>
                      <TableHead className="text-xs">الحبات</TableHead>
                      <TableHead className="text-xs">الأجرة</TableHead>
                      <TableHead className="text-xs">الحالة</TableHead>
                      <TableHead className="text-xs w-20">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedShipment.items.map((item) => {
                      const itemStatus = getDeliveryStatusInfo(item.deliveryStatus, item.isIsolated);
                      const ItemIcon = itemStatus.icon;

                      return (
                        <TableRow key={item.id} className={item.isIsolated ? 'bg-red-50' : ''}>
                          <TableCell className="text-sm">{item.farmerAlias || item.farmer.name}</TableCell>
                          <TableCell className="text-sm">{item.agent.name}</TableCell>
                          <TableCell className="text-sm">{item.totalPieces}</TableCell>
                          <TableCell className="text-sm text-amber-600 font-medium">{item.totalFee.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge className={itemStatus.color}>
                              <ItemIcon className="h-3 w-3 me-1" />
                              {itemStatus.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {item.isIsolated ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-emerald-600"
                                  title="حل المشكلة"
                                  onClick={() => openResolveDialog(selectedShipment, item)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              ) : item.deliveryStatus !== 'DELIVERED' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-emerald-600"
                                    title="تأكيد التسليم"
                                    onClick={() => openConfirmDialog(selectedShipment, item.id)}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-red-600"
                                    title="حيّد العنصر"
                                    onClick={() => openIsolateDialog(selectedShipment, item)}
                                  >
                                    <AlertTriangle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Confirm Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>تأكيد الاستلام</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>اسم المستلم</Label>
                <Input
                  value={receivedByName}
                  onChange={(e) => setReceivedByName(e.target.value)}
                  placeholder="من استلم القات؟"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>إلغاء</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleConfirmDelivery} disabled={confirming}>
                {confirming ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
                تأكيد
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Isolate Dialog */}
        <Dialog open={showIsolateDialog} onOpenChange={setShowIsolateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                تحييد عنصر
              </DialogTitle>
              <DialogDescription>
                سيتم تحييد هذا العنصر وإنشاء تذكير دوري للمتابعة
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {isolatingItem && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p><strong>{isolatingItem.farmerAlias || isolatingItem.farmer.name}</strong> → <strong>{isolatingItem.agent.name}</strong></p>
                  <p className="text-muted-foreground">{isolatingItem.totalPieces} حبة - {isolatingItem.totalFee.toLocaleString()} ريال</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>سبب التحييد</Label>
                <Textarea
                  value={isolationReason}
                  onChange={(e) => setIsolationReason(e.target.value)}
                  placeholder="مثال: لم يصل، ضائع، الخ..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowIsolateDialog(false)}>إلغاء</Button>
              <Button variant="destructive" onClick={handleIsolateItem} disabled={isolating}>
                {isolating ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
                حيّد العنصر
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Resolve Dialog */}
        <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600">
                <CheckCircle className="h-5 w-5" />
                حل المشكلة
              </DialogTitle>
              <DialogDescription>
                تم إيجاد العنصر أو حل المشكلة
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {resolvingItem && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p><strong>{resolvingItem.farmerAlias || resolvingItem.farmer.name}</strong> → <strong>{resolvingItem.agent.name}</strong></p>
                  <p className="text-muted-foreground">{resolvingItem.totalPieces} حبة - {resolvingItem.totalFee.toLocaleString()} ريال</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>ملاحظات الحل (اختياري)</Label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="كيف تم حل المشكلة؟ أين ذهب العنصر؟"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResolveDialog(false)}>إلغاء</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleResolveItem} disabled={resolving}>
                {resolving ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
                تأكيد الحل
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Farmer Dialog */}
        <Dialog open={showAddFarmer} onOpenChange={setShowAddFarmer}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة مزارع جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الاسم</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="اسم المزارع" />
              </div>
              <div className="space-y-2">
                <Label>الهاتف (اختياري)</Label>
                <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="رقم الهاتف" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddFarmer(false)}>إلغاء</Button>
              <Button onClick={handleAddFarmer} disabled={adding}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
                إضافة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Agent Dialog */}
        <Dialog open={showAddAgent} onOpenChange={setShowAddAgent}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة وكيل جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الاسم</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="اسم الوكيل" />
              </div>
              <div className="space-y-2">
                <Label>الهاتف (اختياري)</Label>
                <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="رقم الهاتف" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddAgent(false)}>إلغاء</Button>
              <Button onClick={handleAddAgent} disabled={adding}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
                إضافة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Khat Type Dialog */}
        <Dialog open={showAddKhatType} onOpenChange={setShowAddKhatType}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة نوع قات جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الاسم</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="اسم النوع" />
              </div>
              <div className="space-y-2">
                <Label>أجرة الحبة</Label>
                <Input type="number" value={newFee} onChange={(e) => setNewFee(e.target.value)} placeholder="0" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddKhatType(false)}>إلغاء</Button>
              <Button onClick={handleAddKhatType} disabled={adding}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
                إضافة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={showPayment} onOpenChange={setShowPayment}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>تسديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الوكيل</Label>
                <Select value={paymentAgentId} onValueChange={setPaymentAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الوكيل" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} (رصيد: {a.balance.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>نوع التسديد</Label>
                <Select value={paymentDirection} onValueChange={(v) => setPaymentDirection(v as 'FROM_AGENT' | 'TO_AGENT')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FROM_AGENT">من الوكيل (سدد أجرة)</SelectItem>
                    <SelectItem value="TO_AGENT">للوكيل (رجعنا له مبلغ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>المبلغ</Label>
                <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>وصف (اختياري)</Label>
                <Input value={paymentDescription} onChange={(e) => setPaymentDescription(e.target.value)} placeholder="ملاحظات" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPayment(false)}>إلغاء</Button>
              <Button onClick={handlePayment} disabled={adding}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
                تسجيل
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Print Receipt */}
        {showPrintReceipt && printShipment && (
          <PrintReceipt
            shipment={printShipment}
            onClose={() => {
              setShowPrintReceipt(false);
              setPrintShipment(null);
            }}
          />
        )}

      {/* Share Agent Selection Dialog */}
      <Dialog open={showSelectAgentDialog} onOpenChange={setShowSelectAgentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>اختيار الوكيل للمشاركة</DialogTitle>
            <DialogDescription>
              يوجد أكثر من وكيل في هذه الشحنة، يرجى اختيار الوكيل الذي تريد مشاركة القائمة معه.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedShipmentForShare && Array.from(new Set(selectedShipmentForShare.items.map((item: any) => item.agent?.id || item.agentId).filter(Boolean))).map((agentId: any) => {
              const item = selectedShipmentForShare.items.find((i: any) => (i.agent?.id || i.agentId) === agentId);
              const agentName = item?.agentName || item?.agent?.name;
              return (
                <Button
                  key={agentId}
                  variant="outline"
                  className="w-full justify-start text-right h-12"
                  onClick={() => handleAgentSelectedForShare(agentId)}
                >
                  <Users className="h-4 w-4 me-3 text-muted-foreground" />
                  {agentName}
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Agent Dialog */}
      <ShareShipmentAgentDialog
        open={showShareAgentDialog}
        onOpenChange={setShowShareAgentDialog}
        shipment={selectedShipmentForShare}
        agentId={selectedAgentForShare}
      />
      </div>
    </DashboardLayout>
  );
}
