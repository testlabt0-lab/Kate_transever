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
  Phone,
  Loader2,
  Search,
  Package,
  Users,
  Leaf,
  Truck,
  FileText,
  Share2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DeliveryPerson {
  id: string;
  name: string;
  phone: string | null;
  createdAt: string;
  stats?: {
    totalShipments: number;
    totalPieces: number;
    totalBags: number;
    totalFarmers: number;
  };
}

interface User {
  id: string;
  username: string;
  role: string;
}

export default function DeliveryPersonsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [deliveryPersons, setDeliveryPersons] = useState<DeliveryPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<DeliveryPerson | null>(null);
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

  const loadDeliveryPersons = useCallback(async () => {
    try {
      const res = await fetch('/api/delivery-persons?includeStats=true');
      const data = await res.json();
      setDeliveryPersons(data.data || []);
    } catch (error) {
      console.error('Error loading delivery persons:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadDeliveryPersons();
  }, [user, loadDeliveryPersons]);

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
  };

  const filteredPersons = deliveryPersons.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone?.includes(searchQuery)
  );

  const openAddDialog = () => {
    setFormData({ name: '', phone: '' });
    setShowAddDialog(true);
  };

  const openEditDialog = (person: DeliveryPerson) => {
    setSelectedPerson(person);
    setFormData({ name: person.name, phone: person.phone || '' });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (person: DeliveryPerson) => {
    setSelectedPerson(person);
    setShowDeleteDialog(true);
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/delivery-persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setDeliveryPersons([...deliveryPersons, data.data]);
        setShowAddDialog(false);
      } else {
        alert(data.error || 'فشل في إضافة الموصل');
      }
    } catch {
      alert('حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedPerson || !formData.name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/delivery-persons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedPerson.id, ...formData }),
      });
      const data = await res.json();
      if (data.success) {
        setDeliveryPersons(deliveryPersons.map((p) => (p.id === selectedPerson.id ? data.data : p)));
        setShowEditDialog(false);
        setSelectedPerson(null);
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
    if (!selectedPerson) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/delivery-persons?id=${selectedPerson.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDeliveryPersons(deliveryPersons.filter((p) => p.id !== selectedPerson.id));
        setShowDeleteDialog(false);
        setSelectedPerson(null);
      } else {
        alert(data.error || 'فشل في الحذف');
      }
    } catch {
      alert('حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;

  return (
    <DashboardLayout userRole={user.role as 'ADMIN' | 'WORKER'} username={user.username} onLogout={handleLogout}>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">إدارة الموصلين</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">إضافة وتعديل وحذف الموصلين</p>
          </div>
          <Button onClick={openAddDialog} className="bg-emerald-600 hover:bg-emerald-700 gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" /> إضافة موصل
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="البحث عن موصل..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-9" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Card><CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2"><Truck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" /><span className="text-xs sm:text-sm text-muted-foreground">عدد الموصلين</span></div>
            <p className="text-xl sm:text-2xl font-bold mt-1">{deliveryPersons.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2"><Package className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" /><span className="text-xs sm:text-sm text-muted-foreground">إجمالي الشحنات</span></div>
            <p className="text-xl sm:text-2xl font-bold mt-1">{deliveryPersons.reduce((sum, p) => sum + (p.stats?.totalShipments || 0), 0)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2"><Leaf className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" /><span className="text-xs sm:text-sm text-muted-foreground">إجمالي الحبات</span></div>
            <p className="text-xl sm:text-2xl font-bold mt-1">{deliveryPersons.reduce((sum, p) => sum + (p.stats?.totalPieces || 0), 0)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" /><span className="text-xs sm:text-sm text-muted-foreground">إجمالي المزارعين</span></div>
            <p className="text-xl sm:text-2xl font-bold mt-1">{deliveryPersons.reduce((sum, p) => sum + (p.stats?.totalFarmers || 0), 0)}</p>
          </CardContent></Card>
        </div>

        {loading ? <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div> :
          filteredPersons.length === 0 ? <Card><CardContent className="py-8 text-center text-muted-foreground">{searchQuery ? 'لا توجد نتائج' : 'لا يوجد موصلين'}</CardContent></Card> :
          <div className="space-y-2">
            {filteredPersons.map((person) => (
              <Card key={person.id}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                          <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-sm sm:text-base truncate">{person.name}</h3>
                          {person.phone && <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground"><Phone className="h-3 w-3" /><span className="truncate">{person.phone}</span></div>}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-4">
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          الشحنات: {person.stats?.totalShipments || 0}
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          الحبات: {person.stats?.totalPieces || 0}
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          العدل: {person.stats?.totalBags || 0}
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          المزارعين: {person.stats?.totalFarmers || 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/delivery-persons/${person.id}/report`)} className="h-8 w-8 sm:h-9 sm:w-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" title="تقرير الموصل"><FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(person)} className="h-8 w-8 sm:h-9 sm:w-9"><Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(person)} className="h-8 w-8 sm:h-9 sm:w-9 text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        }

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>إضافة موصل جديد</DialogTitle><DialogDescription>أدخل بيانات الموصل الجديد</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>اسم الموصل *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="أدخل اسم الموصل" /></div>
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
            <DialogHeader><DialogTitle>تعديل الموصل</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>اسم الموصل *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="أدخل اسم الموصل" /></div>
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
            <AlertDialogHeader><AlertDialogTitle>تأكيد الحذف</AlertDialogTitle><AlertDialogDescription>هل أنت متأكد من حذف الموصل &quot;{selectedPerson?.name}&quot;؟ لا يمكن التراجع.</AlertDialogDescription></AlertDialogHeader>
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
