import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - تقرير الموصل (بدون معلومات الأجرة)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // جلب بيانات الموصل
    const deliveryPerson = await db.deliveryPerson.findUnique({
      where: { id },
    });

    if (!deliveryPerson) {
      return NextResponse.json(
        { success: false, error: 'الموصل غير موجود' },
        { status: 404 }
      );
    }

    // بناء فلتر التاريخ
    const dateFilter: { gte?: Date; lt?: Date } = {};
    if (dateFrom) {
      dateFilter.gte = new Date(dateFrom + 'T00:00:00.000Z');
    }
    if (dateTo) {
      dateFilter.lt = new Date(dateTo + 'T23:59:59.999Z');
    }

    // جلب الشحنات المرتبطة بالموصل
    const shipments = await db.shipment.findMany({
      where: {
        deliveryPersonId: id,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      },
      include: {
        items: {
          include: {
            farmer: { select: { id: true, name: true, phone: true } },
            agent: { select: { id: true, name: true } },
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

    // تجميع بيانات المزارعين
    const farmersMap = new Map<string, {
      farmer: { id: string; name: string; phone: string | null };
      totalPieces: number;
      totalBags: number;
      khatTypes: Map<string, { name: string; pieces: number }>;
      shipmentCount: number;
      shipments: Array<{
        date: Date;
        agentName: string;
        pieces: number;
        bags: number;
        khatTypes: Array<{ name: string; pieces: number }>;
      }>;
    }>();

    let totalPieces = 0;
    let totalBags = 0;

    for (const shipment of shipments) {
      for (const item of shipment.items) {
        const farmerId = item.farmerId;
        const itemPieces = item.totalPieces;
        const itemBags = item.numberOfBags || 1;

        totalPieces += itemPieces;
        totalBags += itemBags;

        if (!farmersMap.has(farmerId)) {
          farmersMap.set(farmerId, {
            farmer: item.farmer,
            totalPieces: 0,
            totalBags: 0,
            khatTypes: new Map(),
            shipmentCount: 0,
            shipments: [],
          });
        }

        const farmerData = farmersMap.get(farmerId)!;
        farmerData.totalPieces += itemPieces;
        farmerData.totalBags += itemBags;
        farmerData.shipmentCount += 1;

        // تجميع أنواع القات
        const itemKhatTypes: Array<{ name: string; pieces: number }> = [];
        for (const detail of item.khatDetails) {
          const khatName = detail.khatType.name;

          // تحديث إجمالي أنواع القات للمزارع
          if (!farmerData.khatTypes.has(khatName)) {
            farmerData.khatTypes.set(khatName, { name: khatName, pieces: 0 });
          }
          farmerData.khatTypes.get(khatName)!.pieces += detail.pieces;

          itemKhatTypes.push({ name: khatName, pieces: detail.pieces });
        }

        // إضافة تفاصيل الشحنة
        farmerData.shipments.push({
          date: shipment.date,
          agentName: item.agent.name,
          pieces: itemPieces,
          bags: itemBags,
          khatTypes: itemKhatTypes,
        });
      }
    }

    // تحويل البيانات إلى مصفوفة
    const farmers = Array.from(farmersMap.values()).map((f) => ({
      farmer: f.farmer,
      totalPieces: f.totalPieces,
      totalBags: f.totalBags,
      khatTypes: Array.from(f.khatTypes.values()),
      shipmentCount: f.shipmentCount,
      shipments: f.shipments,
    }));

    // إنشاء نص المشاركة (بدون أجرة)
    const dateRange = dateFrom || dateTo
      ? `الفترة: ${dateFrom || 'البداية'} إلى ${dateTo || 'النهاية'}`
      : '';

    let shareText = `📦 تقرير الموصل: ${deliveryPerson.name}\n`;
    if (dateRange) shareText += `📅 ${dateRange}\n`;
    if (deliveryPerson.phone) shareText += `📱 الهاتف: ${deliveryPerson.phone}\n`;
    shareText += `\n📊 الإجمالي:\n`;
    shareText += `• المزارعين: ${farmers.length}\n`;
    shareText += `• الشحنات: ${shipments.length}\n`;
    shareText += `• الحبات: ${totalPieces}\n`;
    shareText += `• العدل: ${totalBags}\n`;
    shareText += `\n📋 تفاصيل المزارعين:\n`;

    farmers.forEach((f, i) => {
      shareText += `\n${i + 1}. ${f.farmer.name}\n`;
      shareText += `   الحبات: ${f.totalPieces} | العدل: ${f.totalBags}\n`;
      if (f.khatTypes.length > 0) {
        f.khatTypes.forEach((kt) => {
          shareText += `   • ${kt.name}: ${kt.pieces} حبة\n`;
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        deliveryPerson: {
          id: deliveryPerson.id,
          name: deliveryPerson.name,
          phone: deliveryPerson.phone,
        },
        summary: {
          totalFarmers: farmers.length,
          totalShipments: shipments.length,
          totalPieces,
          totalBags,
        },
        farmers,
        shareText,
        filters: { dateFrom, dateTo },
      },
    });
  } catch (error) {
    console.error('Error generating delivery person report:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في إنشاء التقرير' },
      { status: 500 }
    );
  }
}
