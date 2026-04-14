'use client';

import { ReactNode, useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, X, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface PrintReportProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose?: () => void;
  showPreview?: boolean;
}

export function PrintReport({
  title,
  subtitle,
  children,
  onClose,
  showPreview = true,
}: PrintReportProps) {
  const [printing, setPrinting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // تنسيق التاريخ بالعربية
  const formatDate = (date: Date = new Date()) => {
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // تنسيق الوقت
  const formatTime = (date: Date = new Date()) => {
    return date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // الطباعة
  const handlePrint = () => {
    setPrinting(true);

    // إنشاء نافذة طباعة جديدة
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      setPrinting(false);
      return;
    }

    // الحصول على محتوى التقرير
    const content = contentRef.current?.innerHTML || '';

    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            max-width: 210mm;
            margin: 0 auto;
            font-size: 12px;
            line-height: 1.6;
            color: #333;
            direction: rtl;
          }

          .print-header {
            text-align: center;
            border-bottom: 2px solid #10b981;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }

          .print-logo {
            font-size: 24px;
            font-weight: bold;
            color: #10b981;
            margin-bottom: 5px;
          }

          .print-title {
            font-size: 18px;
            font-weight: bold;
            color: #333;
          }

          .print-subtitle {
            font-size: 14px;
            color: #666;
            margin-top: 5px;
          }

          .print-meta {
            display: flex;
            justify-content: space-between;
            padding: 10px 15px;
            background: #f5f5f5;
            border-radius: 5px;
            margin-bottom: 20px;
            font-size: 11px;
          }

          .print-content {
            margin-bottom: 20px;
          }

          .print-section {
            margin-bottom: 15px;
          }

          .print-section-title {
            font-weight: bold;
            font-size: 14px;
            color: #333;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #eee;
          }

          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }

          .print-table th,
          .print-table td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: right;
          }

          .print-table th {
            background: #f0fdf4;
            font-weight: bold;
            color: #065f46;
          }

          .print-table tr:nth-child(even) {
            background: #f9fafb;
          }

          .print-total {
            background: #10b981;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            font-size: 14px;
          }

          .print-footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px dashed #ddd;
            font-size: 10px;
            color: #666;
          }

          .print-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px dotted #eee;
          }

          .print-row:last-child {
            border-bottom: none;
          }

          .print-label {
            color: #666;
          }

          .print-value {
            font-weight: 500;
          }

          .print-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 10px;
          }

          .print-badge-success {
            background: #d1fae5;
            color: #065f46;
          }

          .print-badge-warning {
            background: #fef3c7;
            color: #92400e;
          }

          .print-badge-info {
            background: #dbeafe;
            color: #1e40af;
          }

          /* إخفاء العناصر غير المرغوبة في الطباعة */
          .no-print {
            display: none !important;
          }

          /* تحسينات الطباعة */
          @media print {
            body {
              padding: 0;
              max-width: none;
            }

            .print-header {
              page-break-after: avoid;
            }

            .print-section {
              page-break-inside: avoid;
            }

            .print-table {
              page-break-inside: auto;
            }

            .print-table tr {
              page-break-inside: avoid;
            }
          }

          /* أنماط مخصصة للمحتوى */
          .grid {
            display: grid;
          }

          .grid-cols-2 {
            grid-template-columns: repeat(2, 1fr);
          }

          .grid-cols-3 {
            grid-template-columns: repeat(3, 1fr);
          }

          .gap-2 {
            gap: 0.5rem;
          }

          .gap-4 {
            gap: 1rem;
          }

          .p-2 {
            padding: 0.5rem;
          }

          .p-4 {
            padding: 1rem;
          }

          .mb-2 {
            margin-bottom: 0.5rem;
          }

          .mb-4 {
            margin-bottom: 1rem;
          }

          .font-bold {
            font-weight: bold;
          }

          .text-center {
            text-align: center;
          }

          .text-emerald-600 {
            color: #059669;
          }

          .text-gray-500 {
            color: #6b7280;
          }

          .bg-emerald-50 {
            background: #ecfdf5;
          }

          .bg-gray-50 {
            background: #f9fafb;
          }

          .rounded {
            border-radius: 0.25rem;
          }

          .border {
            border: 1px solid #e5e7eb;
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <div class="print-logo">🌿 نظام تصدير القات</div>
          <div class="print-title">${title}</div>
          ${subtitle ? `<div class="print-subtitle">${subtitle}</div>` : ''}
        </div>

        <div class="print-meta">
          <div>التاريخ: ${formatDate()}</div>
          <div>الوقت: ${formatTime()}</div>
        </div>

        <div class="print-content">
          ${content}
        </div>

        <div class="print-footer">
          <p>نظام تصدير القات - تم إنشاء هذا التقرير تلقائياً</p>
          <p>© ${new Date().getFullYear()} جميع الحقوق محفوظة</p>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    setPrinting(false);
  };

  // إضافة أنماط الطباعة للصفحة الحالية
  useEffect(() => {
    // إنشاء عنصر style لأنماط الطباعة
    const styleId = 'print-report-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = `
        @media print {
          body * {
            visibility: hidden;
          }

          .print-area,
          .print-area * {
            visibility: visible;
          }

          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }

          .no-print {
            display: none !important;
          }
        }
      `;
      document.head.appendChild(styleElement);
    }

    return () => {
      // لا نحذف الأنماط لأنها قد تكون مطلوبة لمكونات أخرى
    };
  }, []);

  // إذا لم نكن في وضع المعاينة، نعرض الأزرار فقط
  if (!showPreview) {
    return (
      <div className="print-buttons no-print flex gap-2">
        <Button
          onClick={handlePrint}
          disabled={printing}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Printer className="h-4 w-4" />
          طباعة التقرير
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex-shrink-0 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-emerald-600" />
              معاينة التقرير
            </CardTitle>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4">
          {/* محتوى التقرير */}
          <div
            ref={contentRef}
            className="border rounded-lg p-4 bg-white dark:bg-gray-900 shadow-sm"
            dir="rtl"
          >
            {/* رأس التقرير */}
            <div className="text-center border-b pb-4 mb-4">
              <div className="text-xl font-bold text-emerald-600 mb-1">
                🌿 نظام تصدير القات
              </div>
              <div className="font-medium text-lg">{title}</div>
              {subtitle && (
                <div className="text-muted-foreground text-sm mt-1">
                  {subtitle}
                </div>
              )}
            </div>

            {/* معلومات التقرير */}
            <div className="flex justify-between text-sm bg-muted/50 p-3 rounded mb-4">
              <div>
                <span className="text-muted-foreground">التاريخ: </span>
                <span className="font-medium">{formatDate()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">الوقت: </span>
                <span className="font-medium">{formatTime()}</span>
              </div>
            </div>

            <Separator className="my-4" />

            {/* محتوى مخصص */}
            <div className="print-section">{children}</div>
          </div>
        </CardContent>

        {/* أزرار الإجراءات */}
        <div className="flex-shrink-0 border-t p-4 bg-muted/30 flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            إلغاء
          </Button>
          <Button
            onClick={handlePrint}
            disabled={printing}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            <Printer className="h-4 w-4" />
            {printing ? 'جاري التحضير...' : 'طباعة التقرير'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// مكونات مساعدة لتنسيق التقرير
export function PrintSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="font-bold text-sm mb-2 pb-1 border-b text-emerald-700">
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function PrintRow({
  label,
  value,
  className = '',
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex justify-between py-1 border-b border-dotted ${className}`}>
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function PrintTotal({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-emerald-600 text-white p-3 rounded flex justify-between font-bold mt-4">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
