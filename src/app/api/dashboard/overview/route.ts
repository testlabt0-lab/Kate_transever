import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // التحقق من الـ token
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    // تاريخ اليوم
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // === 1. إحصائيات اليوم ===
    const todayShipments = await db.shipment.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        items: {
          include: {
            khatDetails: true,
          },
        },
      },
    });

    let todayTotalPieces = 0;
    let todayTotalFee = 0;

    todayShipments.forEach((shipment) => {
      shipment.items.forEach((item) => {
        todayTotalPieces += item.totalPieces || 0;
        todayTotalFee += item.totalFee || 0;
      });
    });

    // مصاريف اليوم
    const todayExpenses = await db.expense.aggregate({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      _sum: { amount: true },
    });

    // === 2. المزارعين الذين لم يرسلوا اليوم ===
    // جلب كل المزارعين النشطين (الذين أرسلوا من قبل)
    const allActiveFarmers = await db.farmer.findMany({
      where: {
        shipmentItems: {
          some: {},
        },
      },
      select: {
        id: true,
        name: true,
        fullName: true,
        phone: true,
      },
    });

    // جلب المزارعين الذين أرسلوا اليوم
    const farmersWhoSentToday = await db.shipmentItem.findMany({
      where: {
        shipment: {
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
      },
      select: {
        farmerId: true,
      },
      distinct: ['farmerId'],
    });

    const farmersWhoSentTodayIds = farmersWhoSentToday.map((item) => item.farmerId);

    // المزارعين الذين لم يرسلوا اليوم
    const farmersWhoDidNotSendToday = allActiveFarmers.filter(
      (farmer) => !farmersWhoSentTodayIds.includes(farmer.id)
    );

    // === 3. الشحنات المعلقة ===
    const pendingShipments = await db.shipment.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        items: {
          include: {
            farmer: { select: { name: true } },
            agent: { select: { name: true } },
            khatDetails: {
              include: {
                khatType: { select: { name: true } },
              },
            },
          },
        },
        user: { select: { username: true } },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    // === 4. آخر الشحنات المضافة ===
    const recentShipments = await db.shipment.findMany({
      include: {
        items: {
          include: {
            farmer: { select: { name: true } },
            agent: { select: { name: true } },
            khatDetails: {
              include: {
                khatType: { select: { name: true } },
              },
            },
          },
        },
        user: { select: { username: true } },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    // === 5. الوكلاء وأرصدتهم ===
    const agents = await db.agent.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        balance: true,
        _count: {
          select: { shipmentItems: true },
        },
      },
      orderBy: {
        balance: 'desc',
      },
    });

    // === 6. آخر النشاطات (من سجل النشاطات) ===
    const recentActivities = await db.activityLog.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // === 7. إحصائيات إضافية ===
    const [
      totalFarmers,
      totalAgents,
      totalTransporters,
      totalShipments,
      totalExpenses,
    ] = await Promise.all([
      db.farmer.count(),
      db.agent.count(),
      db.transporter.count(),
      db.shipment.count(),
      db.expense.aggregate({ _sum: { amount: true } }),
    ]);

    // إجمالي ديون الوكلاء
    const totalAgentDebts = await db.agent.aggregate({
      _sum: { balance: true },
    });

    // الشحنات المسلمة اليوم
    const deliveredToday = await db.shipment.count({
      where: {
        status: 'DELIVERED',
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    return NextResponse.json({
      // إحصائيات اليوم
      todayStats: {
        shipmentsCount: todayShipments.length,
        totalPieces: todayTotalPieces,
        totalFee: todayTotalFee,
        expenses: todayExpenses._sum.amount ?? 0,
        netProfit: todayTotalFee - (todayExpenses._sum.amount ?? 0),
        deliveredCount: deliveredToday,
      },
      // المزارعين الذين لم يرسلوا اليوم
      farmersWhoDidNotSendToday,
      // الشحنات المعلقة
      pendingShipments: pendingShipments.map((shipment) => ({
        id: shipment.id,
        date: shipment.date,
        createdAt: shipment.createdAt,
        notes: shipment.notes,
        items: shipment.items.map((item) => ({
          id: item.id,
          farmerName: item.farmer.name,
          agentName: item.agent.name,
          totalPieces: item.totalPieces,
          totalFee: item.totalFee,
          khatTypes: item.khatDetails.map((kd) => ({
            name: kd.khatType?.name || 'غير محدد',
            pieces: kd.pieces,
          })),
        })),
        createdBy: shipment.user?.username,
      })),
      // آخر الشحنات
      recentShipments: recentShipments.map((shipment) => ({
        id: shipment.id,
        date: shipment.date,
        status: shipment.status,
        createdAt: shipment.createdAt,
        notes: shipment.notes,
        items: shipment.items.map((item) => ({
          id: item.id,
          farmerName: item.farmer.name,
          agentName: item.agent.name,
          totalPieces: item.totalPieces,
          totalFee: item.totalFee,
          deliveryStatus: item.deliveryStatus,
        })),
        createdBy: shipment.user?.username,
      })),
      // الوكلاء
      agents: agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        phone: agent.phone,
        balance: agent.balance,
        shipmentsCount: agent._count.shipmentItems,
      })),
      // آخر النشاطات
      recentActivities: recentActivities.map((activity) => ({
        id: activity.id,
        action: activity.action,
        entityType: activity.entityType,
        description: activity.description,
        createdAt: activity.createdAt,
      })),
      // إحصائيات عامة
      generalStats: {
        totalFarmers,
        totalAgents,
        totalTransporters,
        totalShipments,
        totalExpenses: totalExpenses._sum.amount ?? 0,
        totalAgentDebts: totalAgentDebts._sum.balance ?? 0,
        pendingShipmentsCount: pendingShipments.length,
      },
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب البيانات' },
      { status: 500 }
    );
  }
}
