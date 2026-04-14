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
  Leaf,
  Loader2,
  Search,
  Package,
  DollarSign,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface KhatType {
  id: string;
  name: string;
  feePerPiece: number;
  createdAt: string;
}

interface User {
  id: string;
  username: string;
  role: string;
}

export default function KhatManagementPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [khatTypes, setKhatTypes] = useState<KhatType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedKhatType, setSelectedKhatType] = useState<KhatType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    feePerPiece: '',
  });

  // التحقق من المستخدم
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      window.location.href = '/';
    }
  }, []);

  // تحميل أنواع القات
  const loadKhatTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/khat-types');
      const data = await res.json();
      setKhatTypes(data.khatTypes || []);
    } catch (error) {
      console.error('Error loading khat types:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadKhatTypes();
    }
  }, [user, loadKhatTypes]);

  // تسجيل الخروج
  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  // تصفية أنواع القات حسب البحث
  const filteredKhatTypes = khatTypes.filter((khatType) =>
    khatType.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // فتح حوار الإضافة
  const openAddDialog = () => {
    setFormData({ name: '', feePerPiece: '' });
    setShowAddDialog(true);
  };

  // فتح حوار التعديل
  const openEditDialog = (khatType: KhatType) => {
    setSelectedKhatType(khatType);
    setFormData({
      name: khatType.name,
      feePerPiece: khatType.feePerPiece.toString(),
    });
    setShowEditDialog(true);
  };

  // فتح حوار الحذف
  const openDeleteDialog = (khatType: KhatType) => {
    setSelectedKhatType(khatType);
    setShowDeleteDialog(true);
  };

  // إضافة نوع قات
  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'خطأ', description: 'اسم النوع مطلوب', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/khat-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          feePerPiece: parseFloat(formData.feePerPiece) || 0,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setKhatTypes([...khatTypes, data.khatType]);
        setShowAddDialog(false);
        setFormData({ name: '', feePerPiece: '' });
        toast({ title: 'تم', description: 'تم إضافة نوع القات بنجاح' });
      } else {
        toast({ title: 'خطأ', description: data.error || 'فشل في إضافة نوع القات', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error adding khat type:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ في الاتصال', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // تعديل نوع قات
  const handleEdit = async () => {
    if (!selectedKhatType || !formData.name.trim()) {
      toast({ title: 'خطأ', description: 'اسم النوع مطلوب', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/khat-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedKhatType.id,
          name: formData.name,
          feePerPiece: parseFloat(formData.feePerPiece) || 0,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setKhatTypes(khatTypes.map((k) =>
          k.id === selectedKhatType.id ? data.khatType : k
        ));
        setShowEditDialog(false);
        setSelectedKhatType(null);
        toast({ title: 'تم', description: 'تم تعديل نوع القات بنجاح' });
      } else {
        toast({ title: 'خطأ', description: data.error || 'فشل في تعديل نوع القات', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error updating khat type:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ في الاتصال', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // حذف نوع قات
  const handleDelete = async () => {
    if (!selectedKhatType) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/khat-types?id=${selectedKhatType.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        setKhatTypes(khatTypes.filter((k) => k.id !== selectedKhatType.id));
        setShowDeleteDialog(false);
        setSelectedKhatType(null);
        toast({ title: 'تم', description: 'تم حذف نوع القات بنجاح' });
      } else {
        toast({ title: 'خطأ', description: data.error || 'فشل في حذف نوع القات', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error deleting khat type:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ في الاتصال', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // تنسيق العملة
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-YE').format(amount) + ' ريال';
  };

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
        {/* العنوان */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">تسيير القات</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              إدارة أنواع القات وأجرة التوصيل لكل حبة
            </p>
          </div>
          <Button
            onClick={openAddDialog}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            إضافة نوع
          </Button>
        </div>

        {/* البحث */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث عن نوع القات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9"
          />
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Leaf className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                <span className="text-xs sm:text-sm text-muted-foreground">عدد الأنواع</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold mt-1">{khatTypes.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                <span className="text-xs sm:text-sm text-muted-foreground">متوسط الأجرة</span>
              </div>
              <p className="text-lg sm:text-xl font-bold mt-1">
                {khatTypes.length > 0
                  ? formatCurrency(khatTypes.reduce((sum, k) => sum + k.feePerPiece, 0) / khatTypes.length)
                  : '0 ريال'
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* قائمة أنواع القات */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : filteredKhatTypes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد أنواع قات حالياً. أضف نوعاً جديداً للبدء.'}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredKhatTypes.map((khatType) => (
              <Card key={khatType.id} className="overflow-hidden">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center flex-shrink-0">
                          <Leaf className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-sm sm:text-base truncate">{khatType.name}</h3>
                          <div className="flex items-center gap-1 text-xs sm:text-sm text-amber-600 font-medium">
                            <DollarSign className="h-3 w-3" />
                            <span>أجرة الحبة: {formatCurrency(khatType.feePerPiece)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(khatType)}
                        className="h-8 w-8 sm:h-9 sm:w-9"
                      >
                        <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(khatType)}
                        className="h-8 w-8 sm:h-9 sm:w-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* حوار الإضافة */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة نوع قات جديد</DialogTitle>
              <DialogDescription>أدخل بيانات نوع القات الجديد</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">اسم النوع *</Label>
                <Input
                  id="add-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: برعي، حيماني، بقي..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-fee">أجرة التوصيل لكل حبة (ريال)</Label>
                <Input
                  id="add-fee"
                  type="number"
                  step="0.01"
                  value={formData.feePerPiece}
                  onChange={(e) => setFormData({ ...formData, feePerPiece: e.target.value })}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">هذا المبلغ سيُضرب في عدد الحبات لحساب الأجرة</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                إلغاء
              </Button>
              <Button
                onClick={handleAdd}
                disabled={!formData.name.trim() || submitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                إضافة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* حوار التعديل */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>تعديل نوع القات</DialogTitle>
              <DialogDescription>تعديل بيانات نوع القات</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">اسم النوع *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: برعي، حيماني، بقي..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-fee">أجرة التوصيل لكل حبة (ريال)</Label>
                <Input
                  id="edit-fee"
                  type="number"
                  step="0.01"
                  value={formData.feePerPiece}
                  onChange={(e) => setFormData({ ...formData, feePerPiece: e.target.value })}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">هذا المبلغ سيُضرب في عدد الحبات لحساب الأجرة</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                إلغاء
              </Button>
              <Button
                onClick={handleEdit}
                disabled={!formData.name.trim() || submitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                حفظ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* حوار تأكيد الحذف */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف نوع القات "{selectedKhatType?.name}"؟
                <br />
                <span className="text-red-600 text-sm">لا يمكن التراجع عن هذا الإجراء.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
