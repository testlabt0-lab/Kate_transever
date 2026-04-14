'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Printer, X } from 'lucide-react';

interface KhatDetail {
  khatTypeId: string;
  pieces: number;
  feePerPiece: number;
  totalFee: number;
  khatType?: { name: string };
}

interface ShipmentItem {
  id: string;
  farmerAlias: string | null;
  notes: string | null;
  totalPieces: number;
  totalFee: number;
  farmer: { id: string; name: string };
  agent: { id: string; name: string };
  khatDetails: KhatDetail[];
}

interface Shipment {
  id: string;
  date: string;
  status: string;
  notes?: string | null;
  items: ShipmentItem[];
}

interface PrintReceiptProps {
  shipment: Shipment;
  onClose: () => void;
}

export function PrintReceipt({ shipment, onClose }: PrintReceiptProps) {
  const [printing, setPrinting] = useState(false);

  // حساب الإجماليات
  let grandTotalPieces = 0;
  let grandTotalFee = 0;

  shipment.items?.forEach(item => {
    grandTotalPieces += item.totalPieces || 0;
    grandTotalFee += item.totalFee || 0;
  });

  const handlePrint = () => {
    setPrinting(true);

    // إنشاء نافذة طباعة جديدة
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      setPrinting(false);
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>إيصال شحنة</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            max-width: 80mm;
            margin: 0 auto;
            font-size: 12px;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #333;
            padding-bottom: 15px;
            margin-bottom: 15px;
          }
          .logo {
            font-size: 18px;
            font-weight: bold;
            color: #10b981;
            margin-bottom: 5px;
          }
          .title {
            font-size: 14px;
            font-weight: bold;
          }
          .info {
            margin-bottom: 15px;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 5px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .items {
            margin-bottom: 15px;
          }
          .item {
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 10px;
            margin-bottom: 10px;
          }
          .item-header {
            font-weight: bold;
            margin-bottom: 8px;
            padding-bottom: 5px;
            border-bottom: 1px dashed #ddd;
          }
          .khat-row {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            margin-bottom: 3px;
            padding-right: 10px;
          }
          .item-total {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            padding-top: 5px;
            border-top: 1px dashed #ddd;
            font-weight: bold;
          }
          .totals {
            border-top: 2px dashed #333;
            padding-top: 15px;
            margin-top: 15px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .grand-total {
            font-size: 16px;
            font-weight: bold;
            background: #10b981;
            color: white;
            padding: 10px;
            border-radius: 5px;
            text-align: center;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px dashed #ddd;
            font-size: 10px;
            color: #666;
          }
          .status {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 3px;
            font-size: 10px;
          }
          .status-pending {
            background: #fef3c7;
            color: #92400e;
          }
          .status-delivered {
            background: #d1fae5;
            color: #065f46;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🌿 نظام تصدير القات</div>
          <div class="title">إيصال شحنة</div>
        </div>

        <div class="info">
          <div class="info-row">
            <span>رقم الشحنة:</span>
            <span>#${shipment.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div class="info-row">
            <span>التاريخ:</span>
            <span>${new Date(shipment.date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <div class="info-row">
            <span>الوقت:</span>
            <span>${new Date(shipment.date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div class="info-row">
            <span>الحالة:</span>
            <span class="status ${shipment.status === 'DELIVERED' ? 'status-delivered' : 'status-pending'}">
              ${shipment.status === 'DELIVERED' ? 'تم التسليم' : 'قيد الانتظار'}
            </span>
          </div>
        </div>

        <div class="items">
          ${shipment.items?.map((item, index) => `
            <div class="item">
              <div class="item-header">
                ${index + 1}. ${item.farmer?.name || 'غير محدد'} ← ${item.agent?.name || 'غير محدد'}
                ${item.farmerAlias ? `(${item.farmerAlias})` : ''}
              </div>
              ${item.khatDetails?.map(kd => `
                <div class="khat-row">
                  <span>${kd.khatType?.name || 'نوع قات'}: ${kd.pieces} حبة</span>
                  <span>${kd.totalFee.toLocaleString()} ريال</span>
                </div>
              `).join('') || `<div class="khat-row"><span>إجمالي: ${item.totalPieces} حبة</span><span>${item.totalFee.toLocaleString()} ريال</span></div>`}
              <div class="item-total">
                <span>الإجمالي (${item.totalPieces} حبة):</span>
                <span>${item.totalFee?.toLocaleString() || 0} ريال</span>
              </div>
            </div>
          `).join('') || ''}
        </div>

        <div class="totals">
          <div class="total-row">
            <span>إجمالي الحبات:</span>
            <span>${grandTotalPieces.toLocaleString()} حبة</span>
          </div>
          <div class="grand-total">
            الإجمالي الكلي: ${grandTotalFee.toLocaleString()} ريال
          </div>
        </div>

        ${shipment.notes ? `
          <div class="info" style="margin-top: 15px; background: #fffbeb;">
            <div style="font-weight: bold; margin-bottom: 5px;">ملاحظات:</div>
            <div>${shipment.notes}</div>
          </div>
        ` : ''}

        <div class="footer">
          <p>شكراً لتعاملكم معنا</p>
          <p>نظام تصدير القات - ${new Date().toLocaleDateString('ar-SA')}</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    setPrinting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Printer className="h-5 w-5 text-emerald-600" />
              معاينة الإيصال
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Preview */}
          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 text-sm mb-4" dir="rtl">
            <div className="text-center border-b pb-3 mb-3">
              <div className="text-lg font-bold text-emerald-600">🌿 نظام تصدير القات</div>
              <div className="font-medium">إيصال شحنة</div>
            </div>

            <div className="space-y-1 text-sm mb-3 bg-white dark:bg-gray-800 p-2 rounded">
              <div className="flex justify-between">
                <span className="text-muted-foreground">رقم الشحنة:</span>
                <span className="font-medium">#{shipment.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">التاريخ:</span>
                <span>{new Date(shipment.date).toLocaleDateString('ar-SA')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الحالة:</span>
                <span className={shipment.status === 'DELIVERED' ? 'text-green-600' : 'text-yellow-600'}>
                  {shipment.status === 'DELIVERED' ? 'تم التسليم' : 'قيد الانتظار'}
                </span>
              </div>
            </div>

            {shipment.items?.map((item, index) => (
              <div key={index} className="border rounded p-2 mb-2 bg-white dark:bg-gray-800">
                <div className="font-medium text-sm mb-1">
                  {item.farmer?.name} ← {item.agent?.name}
                </div>
                {item.khatDetails?.length > 0 ? (
                  item.khatDetails.map((kd, kIndex) => (
                    <div key={kIndex} className="flex justify-between text-xs text-muted-foreground pr-2">
                      <span>نوع قات: {kd.pieces} حبة</span>
                      <span>{kd.totalFee?.toLocaleString()} ريال</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between text-xs text-muted-foreground pr-2">
                    <span>{item.totalPieces} حبة</span>
                    <span>{item.totalFee?.toLocaleString()} ريال</span>
                  </div>
                )}
                <div className="flex justify-between font-medium text-sm mt-1 pt-1 border-t">
                  <span>الإجمالي:</span>
                  <span className="text-emerald-600">{item.totalFee?.toLocaleString()} ريال</span>
                </div>
              </div>
            ))}

            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between mb-1">
                <span>إجمالي الحبات:</span>
                <span>{grandTotalPieces.toLocaleString()} حبة</span>
              </div>
              <div className="bg-emerald-600 text-white text-center py-2 rounded font-bold">
                الإجمالي الكلي: {grandTotalFee.toLocaleString()} ريال
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handlePrint}
              disabled={printing}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              <Printer className="h-4 w-4" />
              {printing ? 'جاري الطباعة...' : 'طباعة'}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              إلغاء
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
