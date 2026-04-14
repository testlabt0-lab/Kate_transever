'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Pencil,
  Trash2,
  UserCheck,
  Phone,
  Wallet,
  Loader2,
  Search,
  Package,
  FileText,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Agent {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
  createdAt: string;
  _count?: { shipments: number };
}

interface User {
  id: string;
  username: string;
  role: string;
}

export default function AgentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '' });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('session_token');
    if (userData && token) {
      setUser(JSON.parse(userData));
    } else {
      window.location.href = '/login.html';
    }
  }, []);

  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadAgents();
  }, [user, loadAgents]);

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
  };

  const filteredAgents = agents.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.phone?.includes(searchQuery)
  );

  const openAddDialog = () => {
    setFormData({ name: '', phone: '' });
    setShowAddDialog(true);
  };

  const openEditDialog = (agent: Agent) => {
    setSelectedAgent(agent);
    setFormData({ name: agent.name, phone: agent.phone || '' });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowDeleteDialog(true);
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setAgents([...agents, data.agent]);
        setShowAddDialog(false);
      } else {
        alert(data.error || 'فشل في إضافة الوكيل');
      }
    } catch {
      alert('حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedAgent || !formData.name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedAgent.id, ...formData }),
      });
      const data = await res.json();
      if (data.success) {
        setAgents(agents.map((a) => (a.id === selectedAgent.id ? data.agent : a)));
        setShowEditDialog(false);
        setSelectedAgent(null);
      } else {
        alert(data.error || 'فشل في التعديل');
      }
    } catch {
      alert('حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAgent) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/agents?id=${selectedAgent.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setAgents(agents.filter((a) => a.id !== selectedAgent.id));
        setShowDeleteDialog(false);
        setSelectedAgent(null);
      } else {
        alert(data.error || 'فشل في الحذف');
      }
    } catch {
      alert('حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('ar-YE').format(amount) + ' ريال';

  if (!user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;

  return (
    <DashboardLayout userRole={user.role as 'ADMIN' | 'WORKER'} username={user.username} onLogout={handleLogout}>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">إدارة الوكلاء</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">إضافة وتعديل وحذف الوكلاء</p>
          </div>
          <Button onClick={openAddDialog} className="bg-emerald-600 hover:bg-emerald-700 gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" /> إضافة وكيل
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="البحث عن وكيل..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-9" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
          <Card><CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2"><UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" /><span className="text-xs sm:text-sm text-muted-foreground">عدد الوكلاء</span></div>
            <p className="text-xl sm:text-2xl font-bold mt-1">{agents.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2"><Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" /><span className="text-xs sm:text-sm text-muted-foreground">إجمالي الديون</span></div>
            <p className="text-lg sm:text-xl font-bold mt-1">{formatCurrency(agents.reduce((sum, a) => sum + Math.abs(a.balance), 0))}</p>
          </CardContent></Card>
          <Card className="col-span-2 lg:col-span-1"><CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2"><Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" /><span className="text-xs sm:text-sm text-muted-foreground">إجمالي الشحنات</span></div>
            <p className="text-xl sm:text-2xl font-bold mt-1">{agents.reduce((sum, a) => sum + (a._count?.shipments || 0), 0)}</p>
          </CardContent></Card>
        </div>

        {loading ? <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div> :
          filteredAgents.length === 0 ? <Card><CardContent className="py-8 text-center text-muted-foreground">{searchQuery ? 'لا توجد نتائج' : 'لا يوجد وكلاء'}</CardContent></Card> :
          <div className="space-y-2">
            {filteredAgents.map((agent) => (
              <Card key={agent.id}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                          <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-sm sm:text-base truncate">{agent.name}</h3>
                          {agent.phone && <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground"><Phone className="h-3 w-3" /><span className="truncate">{agent.phone}</span></div>}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-4">
                        <span className={`text-xs sm:text-sm font-medium ${agent.balance < 0 ? 'text-red-600' : agent.balance > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>الرصيد: {formatCurrency(agent.balance)}</span>
                        <span className="text-xs sm:text-sm text-muted-foreground">الشحنات: {agent._count?.shipments || 0}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/agents/${agent.id}/report`)} className="h-8 w-8 sm:h-9 sm:w-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" title="تقرير الوكيل"><FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(agent)} className="h-8 w-8 sm:h-9 sm:w-9"><Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(agent)} className="h-8 w-8 sm:h-9 sm:w-9 text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        }

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>إضافة وكيل جديد</DialogTitle><DialogDescription>أدخل بيانات الوكيل الجديد</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>اسم الوكيل *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="أدخل اسم الوكيل" /></div>
              <div className="space-y-2"><Label>رقم الهاتف</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="أدخل رقم الهاتف (اختياري)" type="tel" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>إلغاء</Button>
              <Button onClick={handleAdd} disabled={!formData.name.trim() || submitting} className="bg-emerald-600 hover:bg-emerald-700">{submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}إضافة</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>تعديل الوكيل</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>اسم الوكيل *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="أدخل اسم الوكيل" /></div>
              <div className="space-y-2"><Label>رقم الهاتف</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="أدخل رقم الهاتف (اختياري)" type="tel" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>إلغاء</Button>
              <Button onClick={handleEdit} disabled={!formData.name.trim() || submitting} className="bg-emerald-600 hover:bg-emerald-700">{submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}حفظ</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>تأكيد الحذف</AlertDialogTitle><AlertDialogDescription>هل أنت متأكد من حذف الوكيل &quot;{selectedAgent?.name}&quot;؟ لا يمكن التراجع.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}حذف</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
