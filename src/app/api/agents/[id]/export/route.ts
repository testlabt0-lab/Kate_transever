import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx';

// GET - تصدير بيانات الوكيل إلى Excel
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // جلب بيانات الوكيل
    const agent = await db.agent.findUnique({
      where: { id },
      include: {
        shipmentItems: {
          include: {
            farmer: true,
            shipment: true,
            khatDetails: {
              include: {
                khatType: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        payments: {
          orderBy: {
            date: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'الوكيل غير موجود' }, { status: 404 });
    }

    // حساب الإحصائيات
    const totalShipments = agent.shipmentItems.length;
    const totalPieces = agent.shipmentItems.reduce((sum, item) => sum + item.totalPieces, 0);
    const totalFee = agent.shipmentItems.reduce((sum, item) => sum + item.totalFee, 0);

    // تجميع المزارعين الفريدين
    const farmersMap = new Map<string, {
      farmer: { id: string; name: string; fullName: string | null };
      shipmentsCount: number;
      totalPieces: number;
      totalFee: number;
      khatTypes: Map<string, number>;
      lastShipment: Date | null;
    }>();

    agent.shipmentItems.forEach(item => {
      const farmerId = item.farmerId;
      if (!farmersMap.has(farmerId)) {
        farmersMap.set(farmerId, {
          farmer: item.farmer,
          shipmentsCount: 0,
          totalPieces: 0,
          totalFee: 0,
          khatTypes: new Map(),
          lastShipment: null,
        });
      }

      const farmerData = farmersMap.get(farmerId)!;
      farmerData.shipmentsCount += 1;
      farmerData.totalPieces += item.totalPieces;
      farmerData.totalFee += item.totalFee;

      // تحديث آخر شحنة
      if (item.shipment?.date) {
        if (!farmerData.lastShipment || new Date(item.shipment.date) > farmerData.lastShipment) {
          farmerData.lastShipment = new Date(item.shipment.date);
        }
      }

      // تجميع أنواع القات
      item.khatDetails.forEach(detail => {
        const khatTypeName = detail.khatType?.name || 'غير محدد';
        const currentCount = farmerData.khatTypes.get(khatTypeName) || 0;
        farmerData.khatTypes.set(khatTypeName, currentCount + detail.pieces);
      });
    });

    // إنشاء ملف Excel
    const workbook = XLSX.utils.book_new();

    // ========== الصفحة الأولى: ملخص الإحصائيات ==========
    const summaryData: (string | number)[][] = [
      ['تقرير الوكيل', ''],
      ['تاريخ التقرير', formatDate(new Date())],
      ['', ''],
      ['معلومات الوكيل', ''],
      ['اسم الوكيل', agent.name],
      ['رقم الهاتف', agent.phone || 'غير متوفر'],
      ['الرصيد الحالي', agent.balance],
      ['تاريخ الإضافة', formatDate(agent.createdAt)],
      ['', ''],
      ['الإحصائيات العامة', ''],
      ['إجمالي الشحنات', totalShipments],
      ['إجمالي الحبات', totalPieces],
      ['إجمالي الأجرة', totalFee],
      ['عدد المزارعين', farmersMap.size],
      ['', ''],
      ['آخر المدفوعات', ''],
    ];

    // إضافة آخر المدفوعات
    agent.payments.slice(0, 5).forEach(payment => {
      summaryData.push([
        formatDate(payment.date),
        payment.amount,
      ]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

    // تعيين عرض الأعمدة
    summarySheet['!cols'] = [
      { wch: 25 },
      { wch: 30 },
    ];

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'ملخص الإحصائيات');

    // ========== الصفحة الثانية: جدول المزارعين التفصيلي ==========
    const farmersList = Array.from(farmersMap.values());

    // رأس الجدول
    const detailHeader = [
      'المزارع',
      'عدد الشحنات',
      'إجمالي الحبات',
      'أنواع القات',
      'إجمالي الأجرة',
      'آخر إرسال',
    ];

    // صفوف البيانات
    const detailRows = farmersList.map(f => [
      f.farmer.fullName || f.farmer.name,
      f.shipmentsCount,
      f.totalPieces,
      Array.from(f.khatTypes.entries())
        .map(([name, count]) => `${name}: ${count}`)
        .join(' | '),
      f.totalFee,
      f.lastShipment ? formatDate(f.lastShipment) : 'غير محدد',
    ]);

    // صف الإجمالي
    const totalRow = [
      'الإجمالي',
      farmersList.reduce((sum, f) => sum + f.shipmentsCount, 0),
      farmersList.reduce((sum, f) => sum + f.totalPieces, 0),
      '-',
      farmersList.reduce((sum, f) => sum + f.totalFee, 0),
      '-',
    ];

    const detailData = [detailHeader, ...detailRows, totalRow];
    const detailSheet = XLSX.utils.aoa_to_sheet(detailData);

    // تعيين عرض الأعمدة
    detailSheet['!cols'] = [
      { wch: 20 },  // المزارع
      { wch: 12 },  // عدد الشحنات
      { wch: 12 },  // إجمالي الحبات
      { wch: 30 },  // أنواع القات
      { wch: 15 },  // إجمالي الأجرة
      { wch: 15 },  // آخر إرسال
    ];

    // تعيين اتجاه RTL للصفحة
    detailSheet['!dir'] = 'rtl';

    // تنسيق خلايا الرأس
    const headerRange = XLSX.utils.decode_range(detailSheet['!ref'] || 'A1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!detailSheet[cellAddress]) continue;
      detailSheet[cellAddress].font = { bold: true };
      detailSheet[cellAddress].fill = {
        patternType: 'solid',
        fgColor: { rgb: 'E8F5E9' },
      };
    }

    // تنسيق صف الإجمالي
    const lastRowIndex = detailData.length - 1;
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: lastRowIndex, c: col });
      if (!detailSheet[cellAddress]) continue;
      detailSheet[cellAddress].font = { bold: true };
      detailSheet[cellAddress].fill = {
        patternType: 'solid',
        fgColor: { rgb: 'FFF3E0' },
      };
    }

    XLSX.utils.book_append_sheet(workbook, detailSheet, 'جدول المزارعين');

    // إنشاء الملف كـ Buffer
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    // إنشاء اسم الملف
    const fileName = `تقرير_الوكيل_${agent.name}_${formatDateForFileName(new Date())}.xlsx`;

    // إرجاع الملف
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Access-Control-Expose-Headers': 'Content-Disposition',
      },
    });
  } catch (error) {
    console.error('Error exporting agent:', error);
    return NextResponse.json({ error: 'فشل في تصدير البيانات' }, { status: 500 });
  }
}

// دوال مساعدة
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

function formatDateForFileName(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
