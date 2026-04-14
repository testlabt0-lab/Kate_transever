'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  FileText,
  Loader2,
  Search,
  DollarSign,
  Calendar,
  Filter,
  TrendingUp,
  Eye,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Package,
  CreditCard,
  Printer,
  Download,
  FileDown,
  RotateCcw,
  ArrowUpDown,
  Building2,
  Phone,
} from 'lucide-react';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string | null;
  status: 'DRAFT' | 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED';
  customerId: string | null;
  customerType: string | null;
  customerName: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  notes: string | null;
  items: InvoiceItem[];
  createdAt: string;
}

interface User {
  id: string;
  username: string;
  role: string;
}

interface Stats {
  totalInvoices: number;
  totalAmount: number;
  totalPaid: number;
  totalRemaining: number;
  pendingCount: number;
  paidCount: number;
  overdueCount: number;
  draftCount: number;
}

const statusLabels: Record<string, string> = {
  DRAFT: 'مسودة',
  PENDING: 'معلقة',
  PAID: 'مدفوعة',
  PARTIAL: 'مدفوعة جزئياً',
  OVERDUE: 'متأخرة',
  CANCELLED: 'ملغاة',
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  PARTIAL: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
};

const statusIcons: Record<string, React.ReactNode> = {
  DRAFT: <FileText className="h-3.5 w-3.5" />,
  PENDING: <Clock className="h-3.5 w-3.5" />,
  PAID: <CheckCircle className="h-3.5 w-3.5" />,
  PARTIAL: <CreditCard className="h-3.5 w-3.5" />,
  OVERDUE: <AlertCircle className="h-3.5 w-3.5" />,
  CANCELLED: <Trash2 className="h-3.5 w-3.5" />,
};

export default function InvoicesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'remaining'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [stats, setStats] = useState<Stats>({
    totalInvoices: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalRemaining: 0,
    pendingCount: 0,
    paidCount: 0,
    overdueCount: 0,
    draftCount: 0,
  });

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerType: 'CUSTOMER',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: '',
    tax: '0',
    discount: '0',
    items: [{ description: '', quantity: '1', unitPrice: '' }],
  });

  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'CASH',
    notes: '',
  });

  // التحقق من المستخدم
  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('session_token');

    if (userData && token) {
      setUser(JSON.parse(userData));
    } else {
      window.location.href = '/login.html';
    }
  }, []);

  // تحميل الفواتير
  const loadInvoices = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterDateFrom) params.append('fromDate', filterDateFrom);
      if (filterDateTo) params.append('toDate', filterDateTo);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/invoices?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        let sortedInvoices = data.data || [];

        // ترتيب البيانات
        sortedInvoices.sort((a: Invoice, b: Invoice) => {
          let comparison = 0;
          if (sortBy === 'date') {
            comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          } else if (sortBy === 'amount') {
            comparison = a.total - b.total;
          } else if (sortBy === 'remaining') {
            comparison = a.remainingAmount - b.remainingAmount;
          }
          return sortOrder === 'desc' ? -comparison : comparison;
        });

        setInvoices(sortedInvoices);

        // حساب الإحصائيات
        const allInvoices = data.data || [];
        setStats({
          totalInvoices: allInvoices.length,
          totalAmount: allInvoices.reduce((sum: number, inv: Invoice) => sum + inv.total, 0),
          totalPaid: allInvoices.reduce((sum: number, inv: Invoice) => sum + inv.paidAmount, 0),
          totalRemaining: allInvoices.reduce((sum: number, inv: Invoice) => sum + inv.remainingAmount, 0),
          pendingCount: allInvoices.filter((inv: Invoice) => inv.status === 'PENDING' || inv.status === 'PARTIAL').length,
          paidCount: allInvoices.filter((inv: Invoice) => inv.status === 'PAID').length,
          overdueCount: allInvoices.filter((inv: Invoice) => inv.status === 'OVERDUE').length,
          draftCount: allInvoices.filter((inv: Invoice) => inv.status === 'DRAFT').length,
        });
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterDateFrom, filterDateTo, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    if (user) {
      loadInvoices();
    }
  }, [user, loadInvoices]);

  // تسجيل الخروج
  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
  };

  // تنسيق العملة
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-YE').format(amount) + ' ريال';
  };

  // تنسيق التاريخ
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // تنسيق التاريخ والوقت
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // إضافة عنصر جديد للفاتورة
  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: '1', unitPrice: '' }],
    });
  };

  // حذف عنصر من الفاتورة
  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index),
      });
    }
  };

  // تحديث عنصر
  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  // حساب الإجمالي الفرعي
  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + (quantity * price);
    }, 0);
  };

  // حساب الإجمالي الكلي
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = parseFloat(formData.tax) || 0;
    const discount = parseFloat(formData.discount) || 0;
    return subtotal + tax - discount;
  };

  // إضافة فاتورة
  const handleAdd = async () => {
    if (!formData.customerName.trim()) {
      alert('يرجى إدخال اسم العميل');
      return;
    }

    const validItems = formData.items.filter(item => item.description.trim() && parseFloat(item.unitPrice) > 0);
    if (validItems.length === 0) {
      alert('يرجى إضافة عنصر واحد على الأقل مع السعر');
      return;
    }

    setSubmitting(true);
    try {
      const items = validItems.map(item => ({
        description: item.description,
        quantity: parseFloat(item.quantity) || 1,
        unitPrice: parseFloat(item.unitPrice),
      }));

      const subtotal = calculateSubtotal();
      const total = calculateTotal();

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.customerName,
          customerType: formData.customerType,
          date: formData.date,
          dueDate: formData.dueDate || null,
          notes: formData.notes,
          items,
          subtotal,
          tax: parseFloat(formData.tax) || 0,
          discount: parseFloat(formData.discount) || 0,
          total,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setInvoices([data.data, ...invoices]);
        setShowAddDialog(false);
        setFormData({
          customerName: '',
          customerPhone: '',
          customerType: 'CUSTOMER',
          date: new Date().toISOString().split('T')[0],
          dueDate: '',
          notes: '',
          tax: '0',
          discount: '0',
          items: [{ description: '', quantity: '1', unitPrice: '' }],
        });
        loadInvoices();
      } else {
        alert(data.error || 'فشل في إضافة الفاتورة');
      }
    } catch (error) {
      console.error('Error adding invoice:', error);
      alert('حدث خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  };

  // عرض تفاصيل الفاتورة
  const openDetailsDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailsDialog(true);
  };

  // طباعة الفاتورة
  const openPrintDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPrintDialog(true);
  };

  // فتح حوار الدفع
  const openPaymentDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentData({
      amount: invoice.remainingAmount.toString(),
      method: 'CASH',
      notes: '',
    });
    setShowPaymentDialog(true);
  };

  // تسجيل دفعة للفاتورة
  const handleAddPayment = async () => {
    if (!selectedInvoice) return;

    const amount = parseFloat(paymentData.amount);
    if (!amount || amount <= 0) {
      alert('يرجى إدخال مبلغ صحيح');
      return;
    }

    if (amount > selectedInvoice.remainingAmount) {
      alert(`المبلغ يتجاوز المتبقي (${formatCurrency(selectedInvoice.remainingAmount)})`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedInvoice.id,
          paidAmount: selectedInvoice.paidAmount + amount,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setShowPaymentDialog(false);
        setSelectedInvoice(null);
        loadInvoices();
      } else {
        alert(data.error || 'فشل في تسجيل الدفعة');
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('حدث خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  };

  // طباعة المحتوى
  const handlePrint = () => {
    window.print();
  };

  // تصدير PDF
  const handleExportPDF = async (invoice: Invoice) => {
    try {
      // إنشاء محتوى HTML للطباعة
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
        return;
      }

      const printContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>فاتورة ${invoice.invoiceNumber}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
              padding: 20px;
              direction: rtl;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #10b981;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .header h1 {
              color: #10b981;
              margin: 0;
            }
            .invoice-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
            }
            .info-box {
              padding: 10px;
              background: #f5f5f5;
              border-radius: 8px;
              flex: 1;
              margin: 0 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: right;
            }
            th {
              background: #10b981;
              color: white;
            }
            .totals {
              margin-top: 20px;
              text-align: left;
            }
            .totals div {
              padding: 5px 0;
            }
            .grand-total {
              font-size: 1.2em;
              font-weight: bold;
              color: #10b981;
              border-top: 2px solid #10b981;
              padding-top: 10px;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #666;
              font-size: 0.9em;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>فاتورة</h1>
            <p>رقم الفاتورة: ${invoice.invoiceNumber}</p>
          </div>

          <div class="invoice-info">
            <div class="info-box">
              <strong>العميل:</strong> ${invoice.customerName}<br>
              <strong>التاريخ:</strong> ${formatDate(invoice.date)}<br>
              ${invoice.dueDate ? `<strong>تاريخ الاستحقاق:</strong> ${formatDate(invoice.dueDate)}<br>` : ''}
              <strong>الحالة:</strong> ${statusLabels[invoice.status]}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>الوصف</th>
                <th>الكمية</th>
                <th>السعر</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map((item, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>${item.unitPrice.toLocaleString('ar-YE')} ريال</td>
                  <td>${item.total.toLocaleString('ar-YE')} ريال</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div><strong>المجموع الفرعي:</strong> ${formatCurrency(invoice.subtotal)}</div>
            ${invoice.tax > 0 ? `<div><strong>الضريبة:</strong> ${formatCurrency(invoice.tax)}</div>` : ''}
            ${invoice.discount > 0 ? `<div><strong>الخصم:</strong> ${formatCurrency(invoice.discount)}</div>` : ''}
            <div class="grand-total"><strong>الإجمالي:</strong> ${formatCurrency(invoice.total)}</div>
            <div><strong>المدفوع:</strong> ${formatCurrency(invoice.paidAmount)}</div>
            <div style="color: red;"><strong>المتبقي:</strong> ${formatCurrency(invoice.remainingAmount)}</div>
          </div>

          <div class="footer">
            <p>شكراً لتعاملكم معنا</p>
            <p>تم إنشاء هذه الفاتورة بتاريخ ${formatDateTime(new Date().toISOString())}</p>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();

      // طباعة تلقائية
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('حدث خطأ أثناء تصدير الفاتورة');
    }
  };

  // مسح الفلاتر
  const clearFilters = () => {
    setFilterStatus('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearchQuery('');
    setSortBy('date');
    setSortOrder('desc');
  };

  // تبديل الترتيب
  const toggleSort = (field: 'date' | 'amount' | 'remaining') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const hasActiveFilters = filterStatus !== 'all' || filterDateFrom || filterDateTo || searchQuery;

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
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-emerald-600" />
              إدارة الفواتير
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              إنشاء وإدارة فواتير العملاء
            </p>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            فاتورة جديدة
          </Button>
        </div>

        {/* إحصائيات */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">إجمالي الفواتير</span>
                  <p className="text-lg sm:text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {stats.totalInvoices}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">إجمالي المبالغ</span>
                  <p className="text-sm sm:text-lg font-bold text-blue-700 dark:text-blue-300">
                    {formatCurrency(stats.totalAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm text-green-600 dark:text-green-400">المبالغ المدفوعة</span>
                  <p className="text-sm sm:text-lg font-bold text-green-700 dark:text-green-300">
                    {formatCurrency(stats.totalPaid)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-red-200 dark:bg-red-800 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm text-red-600 dark:text-red-400">المبالغ المتبقية</span>
                  <p className="text-sm sm:text-lg font-bold text-red-700 dark:text-red-300">
                    {formatCurrency(stats.totalRemaining)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* إحصائيات حسب الحالة */}
        <div className="grid grid-cols-4 gap-2">
          <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setFilterStatus(filterStatus === 'PENDING' ? 'all' : 'PENDING')}>
            <CardContent className="p-2 sm:p-3 text-center">
              <Clock className="h-4 w-4 mx-auto text-amber-600 mb-1" />
              <p className="text-xs text-amber-700 dark:text-amber-300">معلقة</p>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{stats.pendingCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setFilterStatus(filterStatus === 'PAID' ? 'all' : 'PAID')}>
            <CardContent className="p-2 sm:p-3 text-center">
              <CheckCircle className="h-4 w-4 mx-auto text-emerald-600 mb-1" />
              <p className="text-xs text-emerald-700 dark:text-emerald-300">مدفوعة</p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{stats.paidCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setFilterStatus(filterStatus === 'OVERDUE' ? 'all' : 'OVERDUE')}>
            <CardContent className="p-2 sm:p-3 text-center">
              <AlertCircle className="h-4 w-4 mx-auto text-red-600 mb-1" />
              <p className="text-xs text-red-700 dark:text-red-300">متأخرة</p>
              <p className="text-sm font-bold text-red-700 dark:text-red-300">{stats.overdueCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setFilterStatus(filterStatus === 'DRAFT' ? 'all' : 'DRAFT')}>
            <CardContent className="p-2 sm:p-3 text-center">
              <FileText className="h-4 w-4 mx-auto text-gray-600 mb-1" />
              <p className="text-xs text-gray-700 dark:text-gray-300">مسودات</p>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{stats.draftCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* البحث والفلترة */}
        <Card>
          <CardContent className="p-3 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث برقم الفاتورة أو اسم العميل..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="h-4 w-4 ml-2" />
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="DRAFT">مسودة</SelectItem>
                  <SelectItem value="PENDING">معلقة</SelectItem>
                  <SelectItem value="PAID">مدفوعة</SelectItem>
                  <SelectItem value="PARTIAL">مدفوعة جزئياً</SelectItem>
                  <SelectItem value="OVERDUE">متأخرة</SelectItem>
                  <SelectItem value="CANCELLED">ملغاة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 items-end">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">من تاريخ</Label>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">إلى تاريخ</Label>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="w-full sm:w-auto gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  مسح الفلاتر
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* جدول الفواتير */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : invoices.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{hasActiveFilters ? 'لا توجد نتائج مطابقة' : 'لا توجد فواتير مسجلة'}</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  مسح الفلاتر
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">رقم الفاتورة</TableHead>
                      <TableHead className="text-right">العميل</TableHead>
                      <TableHead
                        className="text-right cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSort('date')}
                      >
                        <div className="flex items-center gap-1">
                          التاريخ
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-right cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSort('amount')}
                      >
                        <div className="flex items-center gap-1">
                          المبلغ
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-right cursor-pointer hover:bg-muted/50 hidden md:table-cell"
                        onClick={() => toggleSort('remaining')}
                      >
                        <div className="flex items-center gap-1">
                          المتبقي
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <span className="text-emerald-600">{invoice.invoiceNumber}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                              <User className="h-4 w-4 text-emerald-600" />
                            </div>
                            <span className="font-medium">{invoice.customerName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(invoice.date)}
                          </div>
                        </TableCell>
                        <TableCell className="font-bold">
                          {formatCurrency(invoice.total)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className={invoice.remainingAmount > 0 ? 'text-red-600' : 'text-emerald-600'}>
                            {formatCurrency(invoice.remainingAmount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={`gap-1 ${statusColors[invoice.status]}`}>
                            {statusIcons[invoice.status]}
                            {statusLabels[invoice.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDetailsDialog(invoice)}
                              className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                              title="عرض التفاصيل"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleExportPDF(invoice)}
                              className="h-8 w-8 hover:bg-sky-50 hover:text-sky-600"
                              title="تصدير PDF"
                            >
                              <FileDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openPrintDialog(invoice)}
                              className="h-8 w-8 hover:bg-emerald-50 hover:text-emerald-600"
                              title="طباعة"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            {(invoice.status === 'PENDING' || invoice.status === 'PARTIAL' || invoice.status === 'OVERDUE') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openPaymentDialog(invoice)}
                                className="h-8 w-8 hover:bg-green-50 hover:text-green-600"
                                title="تسجيل دفعة"
                              >
                                <CreditCard className="h-4 w-4" />
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

        {/* ملخص */}
        {!loading && invoices.length > 0 && (
          <Card className="bg-muted/50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">
                  عرض {invoices.length} فاتورة
                </span>
                <div className="flex gap-4 text-sm">
                  <span className="text-emerald-600">
                    مدفوعة: {stats.paidCount}
                  </span>
                  <span className="text-amber-600">
                    معلقة: {stats.pendingCount}
                  </span>
                  <span className="text-red-600 font-bold">
                    متبقي: {formatCurrency(stats.totalRemaining)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* حوار إضافة فاتورة */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                إنشاء فاتورة جديدة
              </DialogTitle>
              <DialogDescription>أدخل بيانات الفاتورة</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* معلومات العميل */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">اسم العميل *</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="أدخل اسم العميل"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerType">نوع العميل</Label>
                  <Select
                    value={formData.customerType}
                    onValueChange={(v) => setFormData({ ...formData, customerType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CUSTOMER">عميل</SelectItem>
                      <SelectItem value="AGENT">وكيل</SelectItem>
                      <SelectItem value="FARMER">مزارع</SelectItem>
                      <SelectItem value="OTHER">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">تاريخ الفاتورة</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">تاريخ الاستحقاق (اختياري)</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>

              {/* عناصر الفاتورة */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">عناصر الفاتورة</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    إضافة عنصر
                  </Button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-2 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <Input
                          placeholder="وصف العنصر"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="الكمية"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          className="w-20"
                          min="1"
                        />
                        <Input
                          type="number"
                          placeholder="السعر"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                          className="w-28"
                          min="0"
                        />
                        {formData.items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* الضريبة والخصم */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax">الضريبة (ريال)</Label>
                    <Input
                      id="tax"
                      type="number"
                      value={formData.tax}
                      onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount">الخصم (ريال)</Label>
                    <Input
                      id="discount"
                      type="number"
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                      min="0"
                    />
                  </div>
                </div>

                {/* ملاحظات */}
                <div className="space-y-2">
                  <Label htmlFor="notes">ملاحظات</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="ملاحظات إضافية"
                  />
                </div>

                {/* الإجمالي */}
                <div className="space-y-2 p-4 bg-emerald-50 dark:bg-emerald-950 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">المجموع الفرعي</span>
                    <span>{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  {(parseFloat(formData.tax) > 0 || parseFloat(formData.discount) > 0) && (
                    <>
                      {parseFloat(formData.tax) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">الضريبة</span>
                          <span>{formatCurrency(parseFloat(formData.tax))}</span>
                        </div>
                      )}
                      {parseFloat(formData.discount) > 0 && (
                        <div className="flex justify-between text-sm text-emerald-600">
                          <span>الخصم</span>
                          <span>-{formatCurrency(parseFloat(formData.discount))}</span>
                        </div>
                      )}
                    </>
                  )}
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">الإجمالي</span>
                    <span className="text-lg font-bold text-emerald-600">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                إلغاء
              </Button>
              <Button
                onClick={handleAdd}
                disabled={!formData.customerName.trim() || calculateTotal() === 0 || submitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Plus className="h-4 w-4 ml-2" />
                )}
                إنشاء الفاتورة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* حوار تفاصيل الفاتورة */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                تفاصيل الفاتورة
              </DialogTitle>
              <DialogDescription>
                {selectedInvoice?.invoiceNumber}
              </DialogDescription>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-4">
                {/* معلومات الفاتورة */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">العميل</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                        <User className="h-4 w-4 text-emerald-600" />
                      </div>
                      <span className="font-medium">{selectedInvoice.customerName}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">الحالة</Label>
                    <div className="mt-1">
                      <Badge className={`gap-1 ${statusColors[selectedInvoice.status]}`}>
                        {statusIcons[selectedInvoice.status]}
                        {statusLabels[selectedInvoice.status]}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">تاريخ الفاتورة</Label>
                    <p className="font-medium">{formatDate(selectedInvoice.date)}</p>
                  </div>
                  {selectedInvoice.dueDate && (
                    <div>
                      <Label className="text-muted-foreground">تاريخ الاستحقاق</Label>
                      <p className={`font-medium ${selectedInvoice.status === 'OVERDUE' ? 'text-red-600' : ''}`}>
                        {formatDate(selectedInvoice.dueDate)}
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* عناصر الفاتورة */}
                <div>
                  <Label className="text-muted-foreground mb-2 block flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    عناصر الفاتورة ({selectedInvoice.items.length})
                  </Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedInvoice.items.map((item, index) => (
                      <div key={item.id || index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <span className="font-medium">{item.description}</span>
                            <div className="text-xs text-muted-foreground">
                              {item.quantity} × {formatCurrency(item.unitPrice)}
                            </div>
                          </div>
                        </div>
                        <span className="font-bold text-emerald-600">{formatCurrency(item.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* الملخص المالي */}
                <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المجموع الفرعي</span>
                    <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                  </div>
                  {selectedInvoice.tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الضريبة</span>
                      <span>{formatCurrency(selectedInvoice.tax)}</span>
                    </div>
                  )}
                  {selectedInvoice.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>الخصم</span>
                      <span>-{formatCurrency(selectedInvoice.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>الإجمالي</span>
                    <span>{formatCurrency(selectedInvoice.total)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-emerald-600">
                    <span>المدفوع</span>
                    <span>{formatCurrency(selectedInvoice.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between text-red-600 font-bold">
                    <span>المتبقي</span>
                    <span>{formatCurrency(selectedInvoice.remainingAmount)}</span>
                  </div>
                </div>

                {selectedInvoice.notes && (
                  <div>
                    <Label className="text-muted-foreground">ملاحظات</Label>
                    <p className="mt-1 p-2 bg-muted/30 rounded">{selectedInvoice.notes}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                إغلاق
              </Button>
              {selectedInvoice && (selectedInvoice.status === 'PENDING' || selectedInvoice.status === 'PARTIAL' || selectedInvoice.status === 'OVERDUE') && (
                <Button
                  onClick={() => {
                    setShowDetailsDialog(false);
                    if (selectedInvoice) openPaymentDialog(selectedInvoice);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  تسجيل دفعة
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedInvoice) handleExportPDF(selectedInvoice);
                }}
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                تصدير PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDetailsDialog(false);
                  if (selectedInvoice) openPrintDialog(selectedInvoice);
                }}
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                طباعة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* حوار تسجيل دفعة */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                تسجيل دفعة
              </DialogTitle>
              <DialogDescription>
                {selectedInvoice && (
                  <span>
                    الفاتورة: <strong>{selectedInvoice.invoiceNumber}</strong>
                    <br />
                    المتبقي: <strong className="text-red-600">{formatCurrency(selectedInvoice.remainingAmount)}</strong>
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="paymentAmount">مبلغ الدفعة (ريال) *</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  placeholder="0.00"
                  className="text-left"
                  dir="ltr"
                  min="0"
                  max={selectedInvoice?.remainingAmount}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">طريقة الدفع</Label>
                <Select
                  value={paymentData.method}
                  onValueChange={(v) => setPaymentData({ ...paymentData, method: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">نقداً</SelectItem>
                    <SelectItem value="BANK">تحويل بنكي</SelectItem>
                    <SelectItem value="CHECK">شيك</SelectItem>
                    <SelectItem value="OTHER">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentNotes">ملاحظات</Label>
                <Input
                  id="paymentNotes"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  placeholder="ملاحظات إضافية"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                إلغاء
              </Button>
              <Button
                onClick={handleAddPayment}
                disabled={!paymentData.amount || submitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 ml-2" />
                )}
                تسجيل الدفعة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* حوار طباعة الفاتورة */}
        <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-sky-600" />
                معاينة الطباعة
              </DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div id="print-content" className="space-y-4 p-4 bg-white border rounded-lg">
                {/* رأس الفاتورة */}
                <div className="text-center border-b pb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Building2 className="h-8 w-8 text-emerald-600" />
                    <h2 className="text-xl font-bold">فاتورة</h2>
                  </div>
                  <p className="text-lg font-bold text-emerald-600">{selectedInvoice.invoiceNumber}</p>
                  <p className="text-sm text-muted-foreground">تاريخ الطباعة: {formatDateTime(new Date().toISOString())}</p>
                </div>

                {/* معلومات الفاتورة */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">العميل</Label>
                    <p className="font-bold text-lg">{selectedInvoice.customerName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">الحالة</Label>
                    <div className="mt-1">
                      <Badge className={`gap-1 ${statusColors[selectedInvoice.status]}`}>
                        {statusIcons[selectedInvoice.status]}
                        {statusLabels[selectedInvoice.status]}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">تاريخ الفاتورة</Label>
                    <p className="font-medium">{formatDate(selectedInvoice.date)}</p>
                  </div>
                  {selectedInvoice.dueDate && (
                    <div>
                      <Label className="text-muted-foreground">تاريخ الاستحقاق</Label>
                      <p className={`font-medium ${selectedInvoice.status === 'OVERDUE' ? 'text-red-600' : ''}`}>
                        {formatDate(selectedInvoice.dueDate)}
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* عناصر الفاتورة */}
                <div>
                  <h3 className="font-bold mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    عناصر الفاتورة
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">#</TableHead>
                        <TableHead className="text-right">الوصف</TableHead>
                        <TableHead className="text-right">الكمية</TableHead>
                        <TableHead className="text-right">السعر</TableHead>
                        <TableHead className="text-right">الإجمالي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.items.map((item, index) => (
                        <TableRow key={item.id || index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="font-bold text-emerald-600">{formatCurrency(item.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* الملخص المالي */}
                <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-lg">
                    <span>المجموع الفرعي</span>
                    <span className="font-bold">{formatCurrency(selectedInvoice.subtotal)}</span>
                  </div>
                  {selectedInvoice.tax > 0 && (
                    <div className="flex justify-between text-lg">
                      <span>الضريبة</span>
                      <span className="font-bold">{formatCurrency(selectedInvoice.tax)}</span>
                    </div>
                  )}
                  {selectedInvoice.discount > 0 && (
                    <div className="flex justify-between text-lg text-emerald-600">
                      <span>الخصم</span>
                      <span className="font-bold">-{formatCurrency(selectedInvoice.discount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-xl font-bold">
                    <span>الإجمالي</span>
                    <span className="text-emerald-600">{formatCurrency(selectedInvoice.total)}</span>
                  </div>
                  <div className="flex justify-between text-lg text-emerald-600">
                    <span>المدفوع</span>
                    <span className="font-bold">{formatCurrency(selectedInvoice.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xl text-red-600 font-bold border-t pt-2">
                    <span>المتبقي</span>
                    <span>{formatCurrency(selectedInvoice.remainingAmount)}</span>
                  </div>
                </div>

                {selectedInvoice.notes && (
                  <div>
                    <Label className="text-muted-foreground">ملاحظات</Label>
                    <p className="mt-1 p-2 bg-gray-50 rounded">{selectedInvoice.notes}</p>
                  </div>
                )}

                {/* تذييل */}
                <div className="text-center text-muted-foreground text-sm border-t pt-4">
                  <p>شكراً لتعاملكم معنا</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPrintDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                طباعة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* أنماط الطباعة */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-content, #print-content * {
            visibility: visible;
          }
          #print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
