import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx';

// تصدير البيانات بصيغ متعددة (CSV, Excel, PDF)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'excel'; // csv, excel, pdf
    const type = searchParams.get('type') || 'general'; // general, shipments, farmers, agents, khat-types
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const period = searchParams.get('period') || 'all';
    const farmerId = searchParams.get('farmerId');
    const agentId = searchParams.get('agentId');
    const transporterId = searchParams.get('transporterId');
    const deliveryPersonId = searchParams.get('deliveryPersonId');

    // حساب نطاق التاريخ
    const now = new Date();
    let dateFrom: Date | undefined;
    let dateTo: Date | undefined = now;

    if (period === 'day') {
      dateFrom = new Date(now.setHours(0, 0, 0, 0));
    } else if (period === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      dateFrom = weekStart;
    } else if (period === 'month') {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'year') {
      dateFrom = new Date(now.getFullYear(), 0, 1);
    }

    if (from) dateFrom = new Date(from);
    if (to) dateTo = new Date(to);

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (dateFrom) dateFilter.gte = dateFrom;
    if (dateTo) dateFilter.lte = dateTo;

    // بناء فلتر الشحنات
    const shipmentWhere: Record<string, unknown> = {};
    if (Object.keys(dateFilter).length > 0) {
      shipmentWhere.date = dateFilter;
    }
    if (transporterId) {
      shipmentWhere.transporterId = transporterId;
    }
    if (deliveryPersonId) {
      shipmentWhere.deliveryPersonId = deliveryPersonId;
    }

    // جلب البيانات
    const shipments = await db.shipment.findMany({
      where: shipmentWhere,
      include: {
        user: { select: { id: true, username: true } },
        transporter: { select: { id: true, name: true } },
        deliveryPerson: { select: { id: true, name: true } },
        items: {
          where: farmerId || agentId ? {
            OR: [
              farmerId ? { farmerId } : {},
              agentId ? { agentId } : {}
            ].filter(o => Object.keys(o).length > 0)
          } : undefined,
          include: {
            farmer: { select: { id: true, name: true, fullName: true } },
            agent: { select: { id: true, name: true, phone: true, balance: true } },
            khatDetails: {
              include: {
                khatType: { select: { id: true, name: true, feePerPiece: true } }
              }
            }
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    const khatTypesList = await db.khatType.findMany();
    const khatTypesMap = new Map(khatTypesList.map(kt => [kt.id, kt]));

    const expenses = await db.expense.findMany({
      where: Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {},
      orderBy: { date: 'desc' }
    });

    const agents = await db.agent.findMany();
    const farmers = await db.farmer.findMany();

    // تنسيق البيانات
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('ar-YE').format(amount) + ' ريال';
    };

    // إعداد البيانات حسب النوع
    let exportData: Record<string, unknown>[] = [];
    let headers: string[] = [];
    let sheetName = 'التقرير';
    let fileName = 'تقرير';

    if (type === 'shipments') {
      sheetName = 'الشحنات';
      fileName = 'تقرير_الشحنات';
      headers = ['التاريخ', 'المزارع', 'الوكيل', 'نوع القات', 'الحبات', 'أجرة الحبة', 'الأجرة الكلية', 'الناقل', 'الموصل', 'الحالة'];

      shipments.forEach(shipment => {
        shipment.items.forEach(item => {
          if (item.khatDetails.length > 0) {
            item.khatDetails.forEach(kd => {
              const khatType = khatTypesMap.get(kd.khatTypeId);
              exportData.push({
                'التاريخ': formatDate(shipment.date),
                'المزارع': item.farmerAlias || item.farmer.name,
                'الوكيل': item.agent.name,
                'نوع القات': khatType?.name || 'غير معروف',
                'الحبات': kd.pieces,
                'أجرة الحبة': kd.feePerPiece,
                'الأجرة الكلية': kd.totalFee,
                'الناقل': shipment.transporter?.name || '-',
                'الموصل': shipment.deliveryPerson?.name || '-',
                'الحالة': shipment.status === 'DELIVERED' ? 'تم التسليم' : 'معلقة'
              });
            });
          } else {
            exportData.push({
              'التاريخ': formatDate(shipment.date),
              'المزارع': item.farmerAlias || item.farmer.name,
              'الوكيل': item.agent.name,
              'نوع القات': '-',
              'الحبات': item.totalPieces,
              'أجرة الحبة': '-',
              'الأجرة الكلية': item.totalFee,
              'الناقل': shipment.transporter?.name || '-',
              'الموصل': shipment.deliveryPerson?.name || '-',
              'الحالة': shipment.status === 'DELIVERED' ? 'تم التسليم' : 'معلقة'
            });
          }
        });
      });
    } else if (type === 'farmers') {
      sheetName = 'المزارعين';
      fileName = 'تقرير_المزارعين';
      headers = ['المزارع', 'الاسم الكامل', 'الهاتف', 'عدد الشحنات', 'إجمالي الحبات', 'إجمالي الأجور'];

      // حساب إحصائيات المزارعين
      const farmerStats: Record<string, { pieces: number; fees: number; shipments: Set<string> }> = {};
      shipments.forEach(shipment => {
        shipment.items.forEach(item => {
          if (!farmerStats[item.farmerId]) {
            farmerStats[item.farmerId] = { pieces: 0, fees: 0, shipments: new Set() };
          }
          const itemPieces = item.khatDetails.reduce((sum, kd) => sum + kd.pieces, 0);
          const itemFees = item.khatDetails.reduce((sum, kd) => sum + kd.totalFee, 0);
          farmerStats[item.farmerId].pieces += itemPieces;
          farmerStats[item.farmerId].fees += itemFees;
          farmerStats[item.farmerId].shipments.add(shipment.id);
        });
      });

      farmers.forEach(farmer => {
        const stats = farmerStats[farmer.id] || { pieces: 0, fees: 0, shipments: new Set() };
        exportData.push({
          'المزارع': farmer.name,
          'الاسم الكامل': farmer.fullName || '-',
          'الهاتف': farmer.phone || '-',
          'عدد الشحنات': stats.shipments.size,
          'إجمالي الحبات': stats.pieces,
          'إجمالي الأجور': stats.fees
        });
      });
    } else if (type === 'agents') {
      sheetName = 'الوكلاء';
      fileName = 'تقرير_الوكلاء';
      headers = ['الوكيل', 'الهاتف', 'عدد الشحنات', 'إجمالي الحبات', 'إجمالي الأجور', 'الرصيد'];

      // حساب إحصائيات الوكلاء
      const agentStats: Record<string, { pieces: number; fees: number; shipments: Set<string> }> = {};
      shipments.forEach(shipment => {
        shipment.items.forEach(item => {
          if (!agentStats[item.agentId]) {
            agentStats[item.agentId] = { pieces: 0, fees: 0, shipments: new Set() };
          }
          const itemPieces = item.khatDetails.reduce((sum, kd) => sum + kd.pieces, 0);
          const itemFees = item.khatDetails.reduce((sum, kd) => sum + kd.totalFee, 0);
          agentStats[item.agentId].pieces += itemPieces;
          agentStats[item.agentId].fees += itemFees;
          agentStats[item.agentId].shipments.add(shipment.id);
        });
      });

      agents.forEach(agent => {
        const stats = agentStats[agent.id] || { pieces: 0, fees: 0, shipments: new Set() };
        exportData.push({
          'الوكيل': agent.name,
          'الهاتف': agent.phone || '-',
          'عدد الشحنات': stats.shipments.size,
          'إجمالي الحبات': stats.pieces,
          'إجمالي الأجور': stats.fees,
          'الرصيد': agent.balance
        });
      });
    } else if (type === 'khat-types') {
      sheetName = 'أنواع القات';
      fileName = 'تقرير_أنواع_القات';
      headers = ['النوع', 'إجمالي الحبات', 'إجمالي الأجور', 'أجرة الحبة', 'النسبة'];

      // حساب إحصائيات أنواع القات
      const khatStats: Record<string, { pieces: number; fees: number }> = {};
      let totalPieces = 0;
      shipments.forEach(shipment => {
        shipment.items.forEach(item => {
          item.khatDetails.forEach(kd => {
            const khatType = khatTypesMap.get(kd.khatTypeId);
            const khatName = khatType?.name || 'غير معروف';
            if (!khatStats[khatName]) {
              khatStats[khatName] = { pieces: 0, fees: 0 };
            }
            khatStats[khatName].pieces += kd.pieces;
            khatStats[khatName].fees += kd.totalFee;
            totalPieces += kd.pieces;
          });
        });
      });

      Object.entries(khatStats).forEach(([name, stats]) => {
        exportData.push({
          'النوع': name,
          'إجمالي الحبات': stats.pieces,
          'إجمالي الأجور': stats.fees,
          'أجرة الحبة': stats.pieces > 0 ? stats.fees / stats.pieces : 0,
          'النسبة': totalPieces > 0 ? ((stats.pieces / totalPieces) * 100).toFixed(1) + '%' : '0%'
        });
      });
    } else {
      // التقرير العام
      sheetName = 'الملخص';
      fileName = 'تقرير_عام_شامل';

      // ملخص
      const totalPieces = shipments.reduce((sum, s) =>
        sum + s.items.reduce((is, i) =>
          is + i.khatDetails.reduce((ks, kd) => ks + kd.pieces, 0), 0), 0);
      const totalFees = shipments.reduce((sum, s) =>
        sum + s.items.reduce((is, i) =>
          is + i.khatDetails.reduce((ks, kd) => ks + kd.totalFee, 0), 0), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const totalAgentDebts = agents.reduce((sum, a) => sum + Math.max(0, a.balance), 0);

      // ورقة الملخص
      exportData = [
        { 'البند': 'عدد الشحنات', 'القيمة': shipments.length },
        { 'البند': 'إجمالي الحبات', 'القيمة': totalPieces },
        { 'البند': 'إجمالي الأجور', 'القيمة': totalFees },
        { 'البند': 'إجمالي المصاريف', 'القيمة': totalExpenses },
        { 'البند': 'صافي الربح', 'القيمة': totalFees - totalExpenses },
        { 'البند': 'ديون الوكلاء', 'القيمة': totalAgentDebts },
      ];
    }

    // التصدير حسب الصيغة
    if (format === 'csv') {
      // تصدير CSV
      const csvHeaders = Object.keys(exportData[0] || {});
      const csvRows = [
        csvHeaders.join(','),
        ...exportData.map(row =>
          csvHeaders.map(h => {
            const val = row[h];
            if (typeof val === 'string' && val.includes(',')) {
              return `"${val}"`;
            }
            return val;
          }).join(',')
        )
      ];
      const csvContent = '\uFEFF' + csvRows.join('\n'); // BOM for Arabic support

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}.csv"`,
        },
      });
    } else if (format === 'pdf') {
      // تصدير PDF كـ HTML للطباعة
      const htmlContent = generatePDFHtml(exportData, {
        title: fileName.replace(/_/g, ' '),
        period: period === 'all' ? 'جميع الفترات' :
                period === 'day' ? 'اليوم' :
                period === 'week' ? 'هذا الأسبوع' :
                period === 'month' ? 'هذا الشهر' : 'هذه السنة',
        dateFrom: dateFrom ? formatDate(dateFrom) : '',
        dateTo: dateTo ? formatDate(dateTo) : '',
      });

      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="${fileName}.html"`,
        },
      });
    } else {
      // تصدير Excel (الافتراضي)
      const wb = XLSX.utils.book_new();

      // الورقة الرئيسية
      const ws = XLSX.utils.json_to_sheet(exportData);

      // ضبط عرض الأعمدة
      const colWidths = Object.keys(exportData[0] || {}).map(key => ({
        wch: Math.max(key.length * 1.5, 15)
      }));
      ws['!cols'] = colWidths;

      // RTL support
      ws['!dir'] = 'rtl';

      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // إضافة ورقة المصاريف للتقرير العام
      if (type === 'general' && expenses.length > 0) {
        const expensesData = expenses.map(e => ({
          'الوصف': e.description,
          'المبلغ': e.amount,
          'الفئة': e.category === 'SUPPLIES' ? 'مستلزمات' : e.category === 'SALARY' ? 'رواتب' : 'أخرى',
          'التاريخ': formatDate(e.date)
        }));
        const wsExpenses = XLSX.utils.json_to_sheet(expensesData);
        wsExpenses['!dir'] = 'rtl';
        XLSX.utils.book_append_sheet(wb, wsExpenses, 'المصاريف');
      }

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${fileName}_${new Date().toISOString().split('T')[0]}.xlsx"`,
          'Access-Control-Expose-Headers': 'Content-Disposition',
        },
      });
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ error: 'فشل في تصدير البيانات' }, { status: 500 });
  }
}

// توليد HTML للتصدير كـ PDF
function generatePDFHtml(
  data: Record<string, unknown>[],
  options: { title: string; period: string; dateFrom: string; dateTo: string }
): string {
  const headers = Object.keys(data[0] || {});

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      direction: rtl;
      padding: 20px;
      background: white;
      color: #333;
      font-size: 12px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #10b981;
    }
    .header h1 {
      color: #10b981;
      font-size: 24px;
      margin-bottom: 10px;
    }
    .header .meta {
      color: #666;
      font-size: 14px;
    }
    .info-bar {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      padding: 10px;
      background: #f8fafc;
      border-radius: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 10px;
      text-align: right;
      border-bottom: 1px solid #e2e8f0;
    }
    th {
      background: #10b981;
      color: white;
      font-weight: 600;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    tr:hover {
      background: #f1f5f9;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      color: #94a3b8;
      font-size: 12px;
    }
    .total-row {
      background: #10b981 !important;
      color: white;
      font-weight: bold;
    }
    .total-row td {
      border-bottom: none;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${options.title}</h1>
    <div class="meta">
      <div>الفترة: ${options.period}</div>
      ${options.dateFrom ? `<div>من: ${options.dateFrom}</div>` : ''}
      ${options.dateTo ? `<div>إلى: ${options.dateTo}</div>` : ''}
    </div>
  </div>

  <div class="info-bar no-print">
    <div>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
    <button onclick="window.print()" style="padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">طباعة</button>
  </div>

  <table>
    <thead>
      <tr>
        ${headers.map(h => `<th>${h}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${data.map((row, index) => `
        <tr class="${index === data.length - 1 && data.length > 5 ? 'total-row' : ''}">
          ${headers.map(h => `<td>${row[h] ?? '-'}</td>`).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>تم إنشاء هذا التقرير بواسطة نظام محاسبة القات</p>
    <p>جميع الحقوق محفوظة © ${new Date().getFullYear()}</p>
  </div>

  <script>
    // Auto print after load
    setTimeout(() => window.print(), 500);
  </script>
</body>
</html>
  `.trim();
}
