import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET - تقرير الوكيل الشامل
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // معاملات الفلترة
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const shipmentId = searchParams.get('shipmentId');

    // جلب معلومات الوكيل
    const agent = await db.agent.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        balance: true,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'الوكيل غير موجود' }, { status: 404 });
    }

    // بناء شرط الفلترة
    const whereClause: Prisma.ShipmentItemWhereInput = {
      agentId: id,
    };

    // فلترة حسب الشحنة المحددة
    if (shipmentId) {
      whereClause.shipmentId = shipmentId;
    }

    // فلترة حسب التاريخ
    if (dateFrom || dateTo) {
      whereClause.shipment = {};
      if (dateFrom) {
        whereClause.shipment.date = {
          ...((whereClause.shipment.date as Prisma.DateTimeFilter) || {}),
          gte: new Date(dateFrom + 'T00:00:00.000Z'),
        };
      }
      if (dateTo) {
        whereClause.shipment.date = {
          ...((whereClause.shipment.date as Prisma.DateTimeFilter) || {}),
          lte: new Date(dateTo + 'T23:59:59.999Z'),
        };
      }
    }

    // جلب جميع عناصر الشحنات للوكيل
    const shipmentItems = await db.shipmentItem.findMany({
      where: whereClause,
      include: {
        farmer: {
          select: { id: true, name: true, fullName: true, phone: true },
        },
        shipment: {
          select: { id: true, date: true, status: true },
        },
        khatDetails: {
          include: {
            khatType: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // تجميع البيانات حسب المزارعين
    const farmersMap = new Map<
      string,
      {
        id: string;
        name: string;
        fullName: string | null;
        phone: string | null;
        totalPieces: number;
        totalFee: number;
        khatTypes: Map<string, { name: string; pieces: number }>;
        lastShipment: Date | null;
        shipmentsCount: number;
        shipments: Array<{
          id: string;
          date: Date;
          pieces: number;
          fee: number;
          khatDetails: Array<{ name: string; pieces: number }>;
        }>;
      }
    >();

    // إحصائيات عامة
    let totalPieces = 0;
    let totalFee = 0;
    let totalBags = 0;

    // ملخص أنواع القات الكلي
    const khatTypesSummaryMap = new Map<string, { name: string; pieces: number }>();

    for (const item of shipmentItems) {
      totalPieces += item.totalPieces;
      totalFee += item.totalFee;
      totalBags += item.numberOfBags || 1;

      const farmerId = item.farmerId;

      if (!farmersMap.has(farmerId)) {
        farmersMap.set(farmerId, {
          id: farmerId,
          name: item.farmer.name,
          fullName: item.farmer.fullName,
          phone: item.farmer.phone,
          totalPieces: 0,
          totalFee: 0,
          totalBags: 0,
          khatTypes: new Map(),
          lastShipment: null,
          shipmentsCount: 0,
          shipments: [],
        });
      }

      const farmerData = farmersMap.get(farmerId)!;
      farmerData.totalPieces += item.totalPieces;
      farmerData.totalFee += item.totalFee;
      farmerData.totalBags += item.numberOfBags || 1;
      farmerData.shipmentsCount += 1;

      // تحديث آخر شحنة
      if (!farmerData.lastShipment || new Date(item.shipment.date) > farmerData.lastShipment) {
        farmerData.lastShipment = new Date(item.shipment.date);
      }

      // تجميع أنواع القات
      for (const detail of item.khatDetails) {
        const khatName = detail.khatType.name;
        if (!farmerData.khatTypes.has(khatName)) {
          farmerData.khatTypes.set(khatName, { name: khatName, pieces: 0 });
        }
        farmerData.khatTypes.get(khatName)!.pieces += detail.pieces;

        // إضافة لملخص أنواع القات الكلي
        if (!khatTypesSummaryMap.has(khatName)) {
          khatTypesSummaryMap.set(khatName, { name: khatName, pieces: 0 });
        }
        khatTypesSummaryMap.get(khatName)!.pieces += detail.pieces;
      }

      // إضافة تفاصيل الشحنة
      farmerData.shipments.push({
        id: item.shipment.id,
        date: new Date(item.shipment.date),
        pieces: item.totalPieces,
        fee: item.totalFee,
        bags: item.numberOfBags || 1,
        khatDetails: item.khatDetails.map((d) => ({
          name: d.khatType.name,
          pieces: d.pieces,
        })),
      });
    }

    // تحويل البيانات إلى مصفوفة
    const farmers = Array.from(farmersMap.values())
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
      .map((farmer) => ({
        id: farmer.id,
        name: farmer.name,
        fullName: farmer.fullName,
        phone: farmer.phone,
        totalPieces: farmer.totalPieces,
        totalFee: farmer.totalFee,
        totalBags: farmer.totalBags,
        khatTypes: Array.from(farmer.khatTypes.values()),
        lastShipment: farmer.lastShipment?.toISOString().split('T')[0] || null,
        shipmentsCount: farmer.shipmentsCount,
        shipments: farmer.shipments
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map((s) => ({
            ...s,
            date: s.date.toISOString().split('T')[0],
          })),
      }));

    // ملخص أنواع القات
    const khatTypesSummary = Array.from(khatTypesSummaryMap.values())
      .sort((a, b) => b.pieces - a.pieces);

    // حساب الديون السابقة (الرصيد الحالي - أجرة الشحنة الحالية)
    const previousDebt = agent.balance - totalFee;

    // توليد نص المشاركة
    const shareText = generateShareText(agent, farmers, khatTypesSummary, totalPieces, totalFee, totalBags, previousDebt, dateFrom, dateTo, shipmentId);

    // بيانات للتصدير
    const excelData = generateExcelData(agent, farmers, khatTypesSummary, totalPieces, totalFee, totalBags, previousDebt);

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        phone: agent.phone,
        balance: agent.balance,
      },
      summary: {
        totalFarmers: farmers.length,
        totalPieces,
        totalFee,
        totalBags,
        totalShipments: shipmentItems.length,
        totalDebt: previousDebt > 0 ? previousDebt : 0,
      },
      khatTypesSummary,
      farmers,
      shareText,
      excelData,
      filters: {
        dateFrom,
        dateTo,
        shipmentId,
      },
    });
  } catch (error) {
    console.error('Error generating agent report:', error);
    return NextResponse.json({ error: 'فشل في توليد التقرير' }, { status: 500 });
  }
}

// توليد نص المشاركة للواتساب
function generateShareText(
  agent: { name: string; phone: string | null },
  farmers: Array<{
    name: string;
    totalPieces: number;
    totalFee: number;
    totalBags: number;
    khatTypes: Array<{ name: string; pieces: number }>;
    shipmentsCount: number;
  }>,
  khatTypesSummary: Array<{ name: string; pieces: number }>,
  totalPieces: number,
  totalFee: number,
  totalBags: number,
  previousDebt: number,
  dateFrom: string | null,
  dateTo: string | null,
  shipmentId: string | null
): string {
  const lines: string[] = [];

  // العنوان
  lines.push('═══════════════════════════════');
  lines.push('📦 تقرير شحنة القات');
  lines.push('═══════════════════════════════');
  lines.push('');

  // معلومات الوكيل
  lines.push(`👤 الوكيل: ${agent.name}`);
  if (agent.phone) {
    lines.push(`📱 الهاتف: ${agent.phone}`);
  }
  lines.push('');

  // الفترة الزمنية
  if (dateFrom || dateTo) {
    const period = [];
    if (dateFrom) period.push(`من ${dateFrom}`);
    if (dateTo) period.push(`إلى ${dateTo}`);
    lines.push(`📅 الفترة: ${period.join(' ')}`);
    lines.push('');
  }

  if (shipmentId) {
    lines.push(`🚚 الشحنة: ${shipmentId.substring(0, 8)}...`);
    lines.push('');
  }

  // ملخص عام
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('📊 ملخص الشحنة');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(`👥 عدد المزارعين: ${farmers.length} مزارع`);
  lines.push(`📦 إجمالي الحبات: ${formatNumber(totalPieces)} حبة`);
  lines.push(`🎒 إجمالي العدل: ${formatNumber(totalBags)} عدلة`);
  lines.push('');

  // ملخص أنواع القات
  if (khatTypesSummary.length > 0) {
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('📋 ملخص أنواع القات');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    khatTypesSummary.forEach((khat) => {
      lines.push(`• ${khat.name}: ${formatNumber(khat.pieces)} حبة`);
    });
    lines.push('');
  }

  // الأجرة
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('💰 الأجرة المالية');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(`💵 أجرة الشحنة: ${formatNumber(totalFee)} ريال`);
  if (previousDebt > 0) {
    lines.push(`📊 ديون سابقة: ${formatNumber(previousDebt)} ريال`);
    lines.push(`🔢 الإجمالي الكلي: ${formatNumber(totalFee + previousDebt)} ريال`);
  }
  lines.push('');

  // تفاصيل المزارعين
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('👨‍🌾 تفاصيل المزارعين');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const farmer of farmers) {
    const khatDetails = farmer.khatTypes.map(k => `${k.name}: ${formatNumber(k.pieces)}`).join('، ');
    lines.push(`• ${farmer.name}`);
    lines.push(`  📦 ${formatNumber(farmer.totalPieces)} حبة | 🎒 ${farmer.totalBags} عدلة`);
    lines.push(`  🌿 (${khatDetails})`);
    lines.push(`  💰 ${formatNumber(farmer.totalFee)} ريال`);
  }

  lines.push('');
  lines.push('═══════════════════════════════');
  lines.push('🚚 نظام توصيل القات');
  lines.push('═══════════════════════════════');

  return lines.join('\n');
}

// توليد بيانات Excel
function generateExcelData(
  agent: { name: string; phone: string | null },
  farmers: Array<{
    name: string;
    fullName: string | null;
    phone: string | null;
    totalPieces: number;
    totalFee: number;
    totalBags: number;
    khatTypes: Array<{ name: string; pieces: number }>;
    lastShipment: string | null;
    shipmentsCount: number;
  }>,
  khatTypesSummary: Array<{ name: string; pieces: number }>,
  totalPieces: number,
  totalFee: number,
  totalBags: number,
  previousDebt: number
): {
  headers: string[];
  rows: string[][];
  summary: string[];
} {
  // رؤوس الجدول
  const headers = [
    'المزارع',
    'إجمالي الحبات',
    'العدل',
    'أنواع القات',
    'إجمالي الأجرة',
    'عدد الشحنات',
    'آخر شحنة',
  ];

  // صفوف البيانات
  const rows = farmers.map((farmer) => [
    farmer.name,
    farmer.totalPieces.toString(),
    farmer.totalBags.toString(),
    farmer.khatTypes.map((k) => `${k.name}: ${k.pieces}`).join('، '),
    formatNumber(farmer.totalFee),
    farmer.shipmentsCount.toString(),
    farmer.lastShipment || '',
  ]);

  // ملخص
  const summary = [
    `الوكيل: ${agent.name}`,
    `هاتف الوكيل: ${agent.phone || 'غير محدد'}`,
    '',
    'ملخص أنواع القات:',
    ...khatTypesSummary.map(k => `  • ${k.name}: ${formatNumber(k.pieces)} حبة`),
    '',
    `عدد المزارعين: ${farmers.length}`,
    `إجمالي الحبات: ${formatNumber(totalPieces)}`,
    `إجمالي العدل: ${formatNumber(totalBags)}`,
    `أجرة الشحنة: ${formatNumber(totalFee)} ريال`,
  ];

  if (previousDebt > 0) {
    summary.push(`ديون سابقة: ${formatNumber(previousDebt)} ريال`);
    summary.push(`الإجمالي الكلي: ${formatNumber(totalFee + previousDebt)} ريال`);
  }

  return { headers, rows, summary };
}

// تنسيق الأرقام
function formatNumber(num: number): string {
  return num.toLocaleString('ar-YE');
}
