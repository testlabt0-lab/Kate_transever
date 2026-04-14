import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET - تقرير الموصل الشامل (بدون أجرة)
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

    // جلب معلومات الموصل
    const transporter = await db.transporter.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });

    if (!transporter) {
      return NextResponse.json({ error: 'الموصل غير موجود' }, { status: 404 });
    }

    // بناء شرط الفلترة
    const whereClause: Prisma.ShipmentWhereInput = {
      transporterId: id,
    };

    // فلترة حسب الشحنة المحددة
    if (shipmentId) {
      whereClause.id = shipmentId;
    }

    // فلترة حسب التاريخ
    if (dateFrom || dateTo) {
      whereClause.date = {};
      if (dateFrom) {
        whereClause.date.gte = new Date(dateFrom + 'T00:00:00.000Z');
      }
      if (dateTo) {
        whereClause.date.lte = new Date(dateTo + 'T23:59:59.999Z');
      }
    }

    // جلب جميع الشحنات للموصل
    const shipments = await db.shipment.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            farmer: {
              select: { id: true, name: true, fullName: true, phone: true },
            },
            agent: {
              select: { id: true, name: true },
            },
            khatDetails: {
              include: {
                khatType: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // تجميع البيانات
    const farmersMap = new Map<
      string,
      {
        id: string;
        name: string;
        fullName: string | null;
        phone: string | null;
        totalPieces: number;
        khatTypes: Map<string, { name: string; pieces: number }>;
        shipmentsCount: number;
      }
    >();

    const khatTypesSummaryMap = new Map<string, { name: string; pieces: number }>();
    const agentsSet = new Set<string>();

    let totalPieces = 0;
    let totalShipments = shipments.length;

    for (const shipment of shipments) {
      for (const item of shipment.items) {
        totalPieces += item.totalPieces;

        // إضافة الوكيل
        agentsSet.add(item.agent.name);

        // تجميع المزارعين
        const farmerId = item.farmerId;
        if (!farmersMap.has(farmerId)) {
          farmersMap.set(farmerId, {
            id: farmerId,
            name: item.farmer.name,
            fullName: item.farmer.fullName,
            phone: item.farmer.phone,
            totalPieces: 0,
            khatTypes: new Map(),
            shipmentsCount: 0,
          });
        }

        const farmerData = farmersMap.get(farmerId)!;
        farmerData.totalPieces += item.totalPieces;
        farmerData.shipmentsCount += 1;

        // تجميع أنواع القات للمزارع
        for (const detail of item.khatDetails) {
          const khatName = detail.khatType.name;

          // للمزارع
          if (!farmerData.khatTypes.has(khatName)) {
            farmerData.khatTypes.set(khatName, { name: khatName, pieces: 0 });
          }
          farmerData.khatTypes.get(khatName)!.pieces += detail.pieces;

          // للملخص الكلي
          if (!khatTypesSummaryMap.has(khatName)) {
            khatTypesSummaryMap.set(khatName, { name: khatName, pieces: 0 });
          }
          khatTypesSummaryMap.get(khatName)!.pieces += detail.pieces;
        }
      }
    }

    // تحويل البيانات
    const farmers = Array.from(farmersMap.values())
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
      .map((farmer) => ({
        id: farmer.id,
        name: farmer.name,
        fullName: farmer.fullName,
        phone: farmer.phone,
        totalPieces: farmer.totalPieces,
        khatTypes: Array.from(farmer.khatTypes.values()).sort((a, b) => b.pieces - a.pieces),
        shipmentsCount: farmer.shipmentsCount,
      }));

    const khatTypesSummary = Array.from(khatTypesSummaryMap.values()).sort(
      (a, b) => b.pieces - a.pieces
    );

    // تفاصيل الشحنات
    const shipmentsDetails = shipments.map((shipment) => {
      const shipmentFarmers = new Map<
        string,
        {
          name: string;
          pieces: number;
          khatTypes: { name: string; pieces: number }[];
        }
      >();

      let shipmentPieces = 0;
      const shipmentKhatTypes = new Map<string, { name: string; pieces: number }>();

      for (const item of shipment.items) {
        shipmentPieces += item.totalPieces;

        if (!shipmentFarmers.has(item.farmerId)) {
          shipmentFarmers.set(item.farmerId, {
            name: item.farmer.name,
            pieces: 0,
            khatTypes: [],
          });
        }

        const farmerData = shipmentFarmers.get(item.farmerId)!;
        farmerData.pieces += item.totalPieces;

        for (const detail of item.khatDetails) {
          const khatName = detail.khatType.name;

          // إضافة لنوع القات للمزارع
          const existingKhat = farmerData.khatTypes.find((k) => k.name === khatName);
          if (existingKhat) {
            existingKhat.pieces += detail.pieces;
          } else {
            farmerData.khatTypes.push({ name: khatName, pieces: detail.pieces });
          }

          // للشحنة ككل
          if (!shipmentKhatTypes.has(khatName)) {
            shipmentKhatTypes.set(khatName, { name: khatName, pieces: 0 });
          }
          shipmentKhatTypes.get(khatName)!.pieces += detail.pieces;
        }
      }

      return {
        id: shipment.id,
        date: shipment.date.toISOString().split('T')[0],
        totalPieces: shipmentPieces,
        farmersCount: shipmentFarmers.size,
        farmers: Array.from(shipmentFarmers.values()),
        khatTypes: Array.from(shipmentKhatTypes.values()),
      };
    });

    // توليد نص المشاركة (بدون أجرة)
    const shareText = generateTransporterShareText(
      transporter,
      farmers,
      khatTypesSummary,
      totalPieces,
      totalShipments,
      dateFrom,
      dateTo
    );

    return NextResponse.json({
      transporter: {
        id: transporter.id,
        name: transporter.name,
        phone: transporter.phone,
      },
      summary: {
        totalFarmers: farmers.length,
        totalPieces,
        totalShipments,
        totalAgents: agentsSet.size,
      },
      khatTypesSummary,
      farmers,
      shipments: shipmentsDetails,
      shareText,
      filters: {
        dateFrom,
        dateTo,
        shipmentId,
      },
    });
  } catch (error) {
    console.error('Error generating transporter report:', error);
    return NextResponse.json({ error: 'فشل في توليد التقرير' }, { status: 500 });
  }
}

// توليد نص المشاركة للموصل (بدون أجرة)
function generateTransporterShareText(
  transporter: { name: string; phone: string | null },
  farmers: Array<{
    name: string;
    totalPieces: number;
    khatTypes: Array<{ name: string; pieces: number }>;
    shipmentsCount: number;
  }>,
  khatTypesSummary: Array<{ name: string; pieces: number }>,
  totalPieces: number,
  totalShipments: number,
  dateFrom: string | null,
  dateTo: string | null
): string {
  const lines: string[] = [];

  // العنوان
  lines.push('═══════════════════════════════');
  lines.push('🚚 تقرير شحنة القات');
  lines.push('═══════════════════════════════');
  lines.push('');

  // معلومات الموصل
  lines.push(`👤 الموصل: ${transporter.name}`);
  if (transporter.phone) {
    lines.push(`📱 الهاتف: ${transporter.phone}`);
  }
  lines.push('');

  // التاريخ
  if (dateFrom || dateTo) {
    const period = [];
    if (dateFrom) period.push(`من ${dateFrom}`);
    if (dateTo) period.push(`إلى ${dateTo}`);
    lines.push(`📅 الفترة: ${period.join(' ')}`);
    lines.push('');
  }

  // ملخص عام
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('📊 ملخص الشحنة');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(`👥 عدد المزارعين: ${farmers.length} مزارع`);
  lines.push(`📦 عدد الشحنات: ${totalShipments} شحنة`);
  lines.push(`📦 إجمالي الحبات: ${formatNumber(totalPieces)} حبة`);
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

  // تفاصيل المزارعين
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('👨‍🌾 تفاصيل المزارعين');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const farmer of farmers) {
    const khatDetails = farmer.khatTypes.map(k => `${k.name}: ${formatNumber(k.pieces)}`).join('، ');
    lines.push(`• ${farmer.name}`);
    lines.push(`  📦 ${formatNumber(farmer.totalPieces)} حبة (${khatDetails})`);
  }

  lines.push('');
  lines.push('═══════════════════════════════');
  lines.push('🚚 نظام توصيل القات');
  lines.push('═══════════════════════════════');

  return lines.join('\n');
}

// تنسيق الأرقام
function formatNumber(num: number): string {
  return num.toLocaleString('ar-YE');
}
