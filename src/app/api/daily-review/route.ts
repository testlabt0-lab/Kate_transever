import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - جلب المراجعة اليومية للمزارعين
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // تحديد نطاق التاريخ
    const startDate = new Date(dateStr + 'T00:00:00.000Z');
    const endDate = new Date(dateStr + 'T23:59:59.999Z');

    // جلب جميع المزارعين
    const farmers = await db.farmer.findMany({
      orderBy: { name: 'asc' },
    });

    // جلب شحنات اليوم مع التفاصيل
    const todayShipments = await db.shipment.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: { select: { id: true, username: true } },
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
    });

    // إنشاء خريطة للمزارعين الذين أرسلوا اليوم
    const farmersTodayMap = new Map<string, {
      shipmentsCount: number;
      totalPieces: number;
      totalFee: number;
      agents: { id: string; name: string }[];
      users: { id: string; username: string }[];
      khatTypes: { name: string; pieces: number }[];
    }>();

    for (const shipment of todayShipments) {
      for (const item of shipment.items) {
        const existing = farmersTodayMap.get(item.farmerId) || {
          shipmentsCount: 0,
          totalPieces: 0,
          totalFee: 0,
          agents: [],
          users: [],
          khatTypes: [],
        };

        existing.shipmentsCount += 1;
        existing.totalPieces += item.totalPieces;
        existing.totalFee += item.totalFee;

        // إضافة الوكيل إذا لم يكن موجوداً
        if (!existing.agents.find(a => a.id === item.agentId)) {
          existing.agents.push({ id: item.agentId, name: item.agent.name });
        }

        // إضافة المستخدم إذا لم يكن موجوداً
        if (!existing.users.find(u => u.id === shipment.userId)) {
          existing.users.push({ id: shipment.userId, username: shipment.user.username });
        }

        // إضافة أنواع القات
        for (const kd of item.khatDetails) {
          const existingKhat = existing.khatTypes.find(k => k.name === kd.khatType?.name);
          if (existingKhat) {
            existingKhat.pieces += kd.pieces;
          } else if (kd.khatType) {
            existing.khatTypes.push({ name: kd.khatType.name, pieces: kd.pieces });
          }
        }

        farmersTodayMap.set(item.farmerId, existing);
      }
    }

    // جلب آخر تاريخ إرسال لكل مزارع لم يرسل اليوم
    const farmersNotToday = farmers.filter(f => !farmersTodayMap.has(f.id));
    const lastShipmentsMap = new Map<string, Date>();

    for (const farmer of farmersNotToday) {
      const lastItem = await db.shipmentItem.findFirst({
        where: { farmerId: farmer.id },
        include: { shipment: { select: { date: true } } },
        orderBy: { shipment: { date: 'desc' } },
        take: 1,
      });

      if (lastItem?.shipment?.date) {
        lastShipmentsMap.set(farmer.id, lastItem.shipment.date);
      }
    }

    // بناء النتيجة
    const farmersReview = farmers.map(farmer => {
      const todayData = farmersTodayMap.get(farmer.id);

      if (todayData) {
        return {
          id: farmer.id,
          name: farmer.name,
          phone: farmer.phone,
          sentToday: true,
          shipmentsCount: todayData.shipmentsCount,
          totalPieces: todayData.totalPieces,
          totalFee: todayData.totalFee,
          agents: todayData.agents,
          users: todayData.users,
          khatTypes: todayData.khatTypes,
          lastSentDate: null,
        };
      } else {
        const lastDate = lastShipmentsMap.get(farmer.id);
        return {
          id: farmer.id,
          name: farmer.name,
          phone: farmer.phone,
          sentToday: false,
          shipmentsCount: 0,
          totalPieces: 0,
          totalFee: 0,
          agents: [],
          users: [],
          khatTypes: [],
          lastSentDate: lastDate ? lastDate.toISOString() : null,
        };
      }
    });

    // الإحصائيات
    const stats = {
      totalFarmers: farmers.length,
      sentTodayCount: farmersTodayMap.size,
      notSentTodayCount: farmers.length - farmersTodayMap.size,
      sentPercentage: farmers.length > 0 ? Math.round((farmersTodayMap.size / farmers.length) * 100) : 0,
      totalPieces: Array.from(farmersTodayMap.values()).reduce((sum, d) => sum + d.totalPieces, 0),
      totalFee: Array.from(farmersTodayMap.values()).reduce((sum, d) => sum + d.totalFee, 0),
    };

    return NextResponse.json({
      farmers: farmersReview,
      stats,
      date: dateStr,
    });
  } catch (error) {
    console.error('Error fetching daily review:', error);
    return NextResponse.json({ error: 'فشل في تحميل المراجعة اليومية' }, { status: 500 });
  }
}
