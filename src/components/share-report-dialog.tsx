'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle,
  Send,
  Copy,
  Printer,
  Check,
  Calendar,
  DollarSign,
  FileText,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface KhatTypeSummary {
  name: string;
  pieces: number;
}

interface FarmerDetail {
  name: string;
  pieces: number;
  khatTypes: { name: string; pieces: number }[];
  fee: number;
}

interface ReportData {
  agent: {
    name: string;
    phone: string | null;
    balance: number;
  };
  summary: {
    totalFarmers: number;
    totalPieces: number;
    totalFee: number;
    totalDebt: number;
  };
  khatTypesSummary: KhatTypeSummary[];
  farmers: FarmerDetail[];
  date: string;
}

interface ShareReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportData: ReportData | null;
  loading?: boolean;
}

type DateOption = 'today' | 'custom' | 'none';
type FeeOption = 'none' | 'shipment' | 'full';

export function ShareReportDialog({
  open,
  onOpenChange,
  reportData,
  loading = false,
}: ShareReportDialogProps) {
  const [dateOption, setDateOption] = useState<DateOption>('today');
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [feeOption, setFeeOption] = useState<FeeOption>('shipment');
  const [includeDebt, setIncludeDebt] = useState(true);
  const [includeKhatSummary, setIncludeKhatSummary] = useState(true);
  const [includeFarmerDetails, setIncludeFarmerDetails] = useState(true);
  const [copied, setCopied] = useState(false);

  // تنسيق التاريخ
  const formatDisplayDate = () => {
    switch (dateOption) {
      case 'today':
        return new Date().toLocaleDateString('ar-SA', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      case 'custom':
        if (customDate) {
          return new Date(customDate).toLocaleDateString('ar-SA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        }
        return '';
      case 'none':
        return '';
    }
  };

  // تنسيق الأرقام
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ar-YE').format(num);
  };

  // توليد نص التقرير
  const generateReportText = (): string => {
    if (!reportData) return '';

    const lines: string[] = [];

    // العنوان
    lines.push('═══════════════════════════════');
    lines.push('📦 تقرير شحنة القات');
    lines.push('═══════════════════════════════');
    lines.push('');

    // التاريخ
    if (dateOption !== 'none') {
      lines.push(`📅 التاريخ: ${formatDisplayDate()}`);
      lines.push('');
    }

    // معلومات الوكيل
    lines.push(`👤 الوكيل: ${reportData.agent.name}`);
    if (reportData.agent.phone) {
      lines.push(`📱 الهاتف: ${reportData.agent.phone}`);
    }
    lines.push('');

    // الملخص العام
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 ملخص الشحنة');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push(`👥 عدد المزارعين: ${formatNumber(reportData.summary.totalFarmers)} مزارع`);
    lines.push(`📦 إجمالي الحبات: ${formatNumber(reportData.summary.totalPieces)} حبة`);
    lines.push('');

    // ملخص أنواع القات
    if (includeKhatSummary && reportData.khatTypesSummary.length > 0) {
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      lines.push('📋 ملخص أنواع القات');
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      reportData.khatTypesSummary.forEach((khat) => {
        lines.push(`• ${khat.name}: ${formatNumber(khat.pieces)} حبة`);
      });
      lines.push('');
    }

    // الأجرة
    if (feeOption !== 'none') {
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      lines.push('💰 الأجرة المالية');
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      if (feeOption === 'shipment') {
        lines.push(`💵 أجرة الشحنة: ${formatNumber(reportData.summary.totalFee)} ريال`);
      } else if (feeOption === 'full') {
        lines.push(`💵 أجرة الشحنة: ${formatNumber(reportData.summary.totalFee)} ريال`);
        if (includeDebt && reportData.summary.totalDebt > 0) {
          lines.push(`📊 ديون سابقة: ${formatNumber(reportData.summary.totalDebt)} ريال`);
          lines.push(`🔢 الإجمالي الكلي: ${formatNumber(reportData.summary.totalFee + reportData.summary.totalDebt)} ريال`);
        }
      }
      lines.push('');
    }

    // تفاصيل المزارعين
    if (includeFarmerDetails && reportData.farmers.length > 0) {
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      lines.push('👨‍🌾 تفاصيل المزارعين');
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      reportData.farmers.forEach((farmer, index) => {
        const khatDetails = farmer.khatTypes.map(k => `${k.name}: ${formatNumber(k.pieces)}`).join('، ');
        lines.push(`${index + 1}. ${farmer.name}`);
        lines.push(`   📦 ${formatNumber(farmer.pieces)} حبة (${khatDetails})`);
        if (feeOption !== 'none') {
          lines.push(`   💰 ${formatNumber(farmer.fee)} ريال`);
        }
      });
      lines.push('');
    }

    // التذييل
    lines.push('═══════════════════════════════');
    lines.push('🚚 نظام توصيل القات');
    lines.push('═══════════════════════════════');

    return lines.join('\n');
  };

  // نسخ النص
  const handleCopy = async () => {
    const text = generateReportText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('تم نسخ التقرير!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('فشل في نسخ التقرير');
    }
  };

  // مشاركة واتساب
  const shareWhatsApp = (phone?: string) => {
    const text = encodeURIComponent(generateReportText());
    const phoneNumber = phone || reportData?.agent.phone;

    let url = '';
    if (phoneNumber) {
      // تنظيف رقم الهاتف
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      url = `https://wa.me/${cleanPhone}?text=${text}`;
    } else {
      url = `https://wa.me/?text=${text}`;
    }

    window.open(url, '_blank');
  };

  // مشاركة تليجرام
  const shareTelegram = (phone?: string) => {
    const text = encodeURIComponent(generateReportText());
    const phoneNumber = phone || reportData?.agent.phone;

    let url = '';
    if (phoneNumber) {
      // تليجرام يستخدم username أو رقم الهاتف
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      url = `https://t.me/+${cleanPhone}?text=${text}`;
    } else {
      url = `https://t.me/share/url?url=&text=${text}`;
    }

    window.open(url, '_blank');
  };

  // مشاركة عامة
  const shareGeneral = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `تقرير شحنة - ${reportData?.agent.name}`,
          text: generateReportText(),
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  // طباعة
  const handlePrint = () => {
    const text = generateReportText();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>تقرير شحنة - ${reportData?.agent.name}</title>
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
                padding: 20px;
                direction: rtl;
                line-height: 1.8;
                white-space: pre-wrap;
                font-size: 14px;
              }
            </style>
          </head>
          <body>${text}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-emerald-600" />
            مشاركة التقرير
          </DialogTitle>
          <DialogDescription>
            اختر خيارات المشاركة المناسبة
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="space-y-5 py-4">
            {/* خيار التاريخ */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                التاريخ
              </Label>
              <RadioGroup value={dateOption} onValueChange={(v) => setDateOption(v as DateOption)}>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="today" id="today" />
                  <Label htmlFor="today" className="text-sm">تاريخ اليوم</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="text-sm">اختيار تاريخ محدد</Label>
                </div>
                {dateOption === 'custom' && (
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="mt-2 mr-6"
                  />
                )}
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none" className="text-sm">بدون تاريخ</Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* خيار الأجرة */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                الأجرة المالية
              </Label>
              <RadioGroup value={feeOption} onValueChange={(v) => setFeeOption(v as FeeOption)}>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="none" id="fee-none" />
                  <Label htmlFor="fee-none" className="text-sm">بدون أجرة</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="shipment" id="fee-shipment" />
                  <Label htmlFor="fee-shipment" className="text-sm">أجرة الشحنة فقط</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="full" id="fee-full" />
                  <Label htmlFor="fee-full" className="text-sm">الأجرة الكاملة مع الديون</Label>
                </div>
              </RadioGroup>

              {feeOption === 'full' && reportData && reportData.summary.totalDebt > 0 && (
                <div className="flex items-center space-x-2 space-x-reverse mr-4 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                  <Checkbox
                    id="include-debt"
                    checked={includeDebt}
                    onCheckedChange={(checked) => setIncludeDebt(checked as boolean)}
                  />
                  <Label htmlFor="include-debt" className="text-sm">
                    تضمين الديون السابقة ({formatNumber(reportData.summary.totalDebt)} ريال)
                  </Label>
                </div>
              )}
            </div>

            <Separator />

            {/* خيارات المحتوى */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">محتوى التقرير</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="khat-summary"
                    checked={includeKhatSummary}
                    onCheckedChange={(checked) => setIncludeKhatSummary(checked as boolean)}
                  />
                  <Label htmlFor="khat-summary" className="text-sm">
                    ملخص أنواع القات
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="farmer-details"
                    checked={includeFarmerDetails}
                    onCheckedChange={(checked) => setIncludeFarmerDetails(checked as boolean)}
                  />
                  <Label htmlFor="farmer-details" className="text-sm">
                    تفاصيل المزارعين
                  </Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* معاينة الملخص */}
            {reportData && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <Label className="text-xs text-muted-foreground">معاينة الملخص</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    👥 {formatNumber(reportData.summary.totalFarmers)} مزارع
                  </Badge>
                  <Badge variant="secondary">
                    📦 {formatNumber(reportData.summary.totalPieces)} حبة
                  </Badge>
                  {feeOption !== 'none' && (
                    <Badge variant="secondary">
                      💰 {formatNumber(reportData.summary.totalFee)} ريال
                    </Badge>
                  )}
                  {feeOption === 'full' && includeDebt && reportData.summary.totalDebt > 0 && (
                    <Badge variant="outline" className="text-amber-600">
                      ديون: {formatNumber(reportData.summary.totalDebt)} ريال
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* أزرار المشاركة */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <Button
                variant="outline"
                className="gap-2 bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900 border-green-200 dark:border-green-800"
                onClick={() => shareWhatsApp()}
              >
                <MessageCircle className="h-4 w-4 text-green-600" />
                <span className="text-xs sm:text-sm">واتساب</span>
              </Button>

              <Button
                variant="outline"
                className="gap-2 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950 dark:hover:bg-sky-900 border-sky-200 dark:border-sky-800"
                onClick={() => shareTelegram()}
              >
                <Send className="h-4 w-4 text-sky-600" />
                <span className="text-xs sm:text-sm">تليجرام</span>
              </Button>

              <Button
                variant="outline"
                className="gap-2"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="text-xs sm:text-sm">نسخ</span>
              </Button>

              <Button
                variant="outline"
                className="gap-2"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4" />
                <span className="text-xs sm:text-sm">طباعة</span>
              </Button>
            </div>

            {/* إرسال مباشر للوكيل */}
            {reportData?.agent.phone && (
              <div className="flex gap-2">
                <Button
                  variant="default"
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                  onClick={() => shareWhatsApp(reportData.agent.phone!)}
                >
                  <MessageCircle className="h-4 w-4" />
                  إرسال للوكيل واتساب
                </Button>
                <Button
                  variant="default"
                  className="flex-1 gap-2 bg-sky-600 hover:bg-sky-700"
                  onClick={() => shareTelegram(reportData.agent.phone!)}
                >
                  <Send className="h-4 w-4" />
                  إرسال للوكيل تليجرام
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
