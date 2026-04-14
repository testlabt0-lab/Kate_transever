import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { logActivity } from '@/lib/activity';

// دالة للحصول على يوم الأسبوع بالعربية
function getArabicWeekDay(date: Date): string {
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return days[date.getDay()];
}

// GET - جلب جميع الشحنات
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const deliveryStatus = searchParams.get('deliveryStatus');
    const farmer = searchParams.get('farmer');
    const agent = searchParams.get('agent');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const includeIsolated = searchParams.get('includeIsolated') === 'true';

    const where: Prisma.ShipmentWhereInput = {};

    // فلترة حسب التاريخ
    if (date) {
      where.date = {
        gte: new Date(date + 'T00:00:00.000Z'),
        lt: new Date(date + 'T23:59:59.999Z'),
      };
    } else if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = new Date(dateFrom + 'T00:00:00.000Z');
      }
      if (dateTo) {
        where.date.lte = new Date(dateTo + 'T23:59:59.999Z');
      }
    }

    // فلترة حسب حالة التسليم
    if (deliveryStatus && deliveryStatus !== 'ALL') {
      where.items = {
        some: {
          deliveryStatus: deliveryStatus as 'PENDING' | 'RECEIVED' | 'IN_TRANSIT' | 'DELIVERED',
        },
      };
    }

    // فلترة حسب المزارع
    if (farmer) {
      where.items = {
        ...where.items,
        some: {
          ...(where.items as { some: Prisma.ShipmentItemWhereInput })?.some || {},
          farmer: { name: { contains: farmer } },
        },
      };
    }

    // فلترة حسب الوكيل
    if (agent) {
      where.items = {
        ...where.items,
        some: {
          ...(where.items as { some: Prisma.ShipmentItemWhereInput })?.some || {},
          agent: { name: { contains: agent } },
        },
      };
    }

    const shipments = await db.shipment.findMany({
      where,
      include: {
        user: { select: { id: true, username: true } },
        transporter: { select: { id: true, name: true, phone: true } },
        deliveryPerson: { select: { id: true, name: true, phone: true } },
        items: {
          include: {
            farmer: { select: { id: true, name: true } },
            agent: { select: { id: true, name: true } },
            khatDetails: {
              include: {
                khatType: { select: { id: true, name: true, feePerPiece: true } }
              }
            },
          },
        },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });

    // حساب الإحصائيات
    const shipmentsWithStats = shipments.map((shipment) => {
      let totalPieces = 0;
      let totalFee = 0;
      let isolatedCount = 0;

      for (const item of shipment.items) {
        totalPieces += item.totalPieces;
        totalFee += item.totalFee;
        if (item.isIsolated) isolatedCount++;
      }

      // تحديد حالة التسليم العامة
      let overallDeliveryStatus: 'PENDING' | 'RECEIVED' | 'IN_TRANSIT' | 'DELIVERED' = 'PENDING';
      const statuses = shipment.items.map(i => i.deliveryStatus);

      if (statuses.every(s => s === 'DELIVERED')) {
        overallDeliveryStatus = 'DELIVERED';
      } else if (statuses.some(s => s === 'IN_TRANSIT')) {
        overallDeliveryStatus = 'IN_TRANSIT';
      } else if (statuses.some(s => s === 'RECEIVED')) {
        overallDeliveryStatus = 'RECEIVED';
      }

      return {
        ...shipment,
        totalPieces,
        totalFee,
        isolatedCount,
        farmersCount: new Set(shipment.items.map((i) => i.farmerId)).size,
        agentsCount: new Set(shipment.items.map((i) => i.agentId)).size,
        overallDeliveryStatus,
      };
    });

    return NextResponse.json({ shipments: shipmentsWithStats });
  } catch (error) {
    console.error('Error fetching shipments:', error);
    return NextResponse.json({ error: 'فشل في تحميل الشحنات' }, { status: 500 });
  }
}

// POST - إنشاء شحنة جديدة
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, notes, items, transporterId, deliveryPersonId, customDate } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'المستخدم مطلوب' }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, error: 'يجب إضافة عنصر واحد على الأقل' }, { status: 400 });
    }

    // التحقق من البيانات
    for (const item of items) {
      if (!item.farmerId || !item.agentId || !item.khatDetails || item.khatDetails.length === 0) {
        return NextResponse.json({ success: false, error: 'جميع حقول العناصر مطلوبة' }, { status: 400 });
      }
    }

    // تحديد التاريخ ويوم الأسبوع
    const shipmentDate = customDate ? new Date(customDate) : new Date();
    const weekDay = getArabicWeekDay(shipmentDate);

    // جلب أنواع القات
    const khatTypeIds = [...new Set(items.flatMap((i: { khatDetails: { khatTypeId: string }[] }) => i.khatDetails.map((k: { khatTypeId: string }) => k.khatTypeId)))];
    const khatTypes = await db.khatType.findMany({ where: { id: { in: khatTypeIds } } });
    const khatTypeMap = new Map(khatTypes.map((k) => [k.id, k]));

    // حساب الأجرة وتحديث أرصدة الوكلاء
    const agentBalanceUpdates = new Map<string, number>();
    const itemsData = [];

    for (const item of items) {
      let itemTotalPieces = 0;
      let itemTotalFee = 0;

      const khatDetailsData = [];

      for (const detail of item.khatDetails) {
        const khatType = khatTypeMap.get(detail.khatTypeId);
        if (!khatType) continue;

        const pieces = parseInt(detail.pieces) || 0;
        const totalFee = pieces * khatType.feePerPiece;

        khatDetailsData.push({
          khatTypeId: detail.khatTypeId,
          pieces,
          feePerPiece: khatType.feePerPiece,
          totalFee,
        });

        itemTotalPieces += pieces;
        itemTotalFee += totalFee;
      }

      itemsData.push({
        farmerId: item.farmerId,
        agentId: item.agentId,
        farmerAlias: item.farmerAlias || null,
        notes: item.notes || null,
        totalPieces: itemTotalPieces,
        totalFee: itemTotalFee,
        numberOfBags: parseInt(item.numberOfBags) || 1,
        khatDetails: { create: khatDetailsData },
      });

      // تحديث رصيد الوكيل (عليه الأجرة)
      agentBalanceUpdates.set(
        item.agentId,
        (agentBalanceUpdates.get(item.agentId) || 0) + itemTotalFee
      );
    }

    // تنفيذ المعاملة
    const shipment = await db.$transaction(async (tx) => {
      const newShipment = await tx.shipment.create({
        data: {
          userId,
          date: shipmentDate,
          weekDay,
          transporterId: transporterId || null,
          deliveryPersonId: deliveryPersonId || null,
          notes: notes || null,
          status: 'PENDING',
          items: { create: itemsData },
        },
        include: {
          transporter: true,
          deliveryPerson: true,
          items: {
            include: {
              farmer: true,
              agent: true,
              khatDetails: true,
            },
          },
        },
      });

      // تحديث أرصدة الوكلاء
      for (const [agentId, amount] of agentBalanceUpdates) {
        await tx.agent.update({
          where: { id: agentId },
          data: { balance: { increment: amount } },
        });
      }

      return newShipment;
    });

    // تسجيل النشاط
    const totalPieces = itemsData.reduce((sum, item) => sum + item.totalPieces, 0);
    const totalFee = itemsData.reduce((sum, item) => sum + item.totalFee, 0);

    await logActivity({
      action: 'CREATE',
      entityType: 'shipment',
      entityId: shipment.id,
      description: `إنشاء شحنة جديدة: ${itemsData.length} عناصر، ${totalPieces} حبة، إجمالي الأجرة: ${totalFee} ريال - ${weekDay}`,
      newData: {
        id: shipment.id,
        itemsCount: itemsData.length,
        totalPieces,
        totalFee,
        notes,
        transporterId,
        deliveryPersonId,
        weekDay,
      },
      userId,
    });

    return NextResponse.json({ success: true, shipment });
  } catch (error) {
    console.error('Error creating shipment:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ أثناء حفظ الشحنة' }, { status: 500 });
  }
}

// PUT - تحديث شحنة
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, notes, items, userId } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف الشحنة مطلوب' }, { status: 400 });
    }

    const existingShipment = await db.shipment.findUnique({
      where: { id },
      include: { items: { include: { khatDetails: true } } },
    });

    if (!existingShipment) {
      return NextResponse.json({ success: false, error: 'الشحنة غير موجودة' }, { status: 404 });
    }

    // تسجيل نشاط تأكيد إذا تم تغيير الحالة إلى DELIVERED
    if (status === 'DELIVERED' && existingShipment.status !== 'DELIVERED' && userId) {
      await logActivity({
        action: 'CONFIRM',
        entityType: 'shipment',
        entityId: id,
        description: `تأكيد تسليم الشحنة`,
        oldData: { status: existingShipment.status },
        newData: { status: 'DELIVERED' },
        userId,
      });
    }

    if (items && Array.isArray(items)) {
      // عكس الأرصدة القديمة
      const agentBalanceUpdates = new Map<string, number>();

      for (const oldItem of existingShipment.items) {
        agentBalanceUpdates.set(
          oldItem.agentId,
          (agentBalanceUpdates.get(oldItem.agentId) || 0) - oldItem.totalFee
        );
      }

      // حساب الجديد
      const khatTypeIds = [...new Set(items.flatMap((i: { khatDetails: { khatTypeId: string }[] }) => i.khatDetails.map((k: { khatTypeId: string }) => k.khatTypeId)))];
      const khatTypes = await db.khatType.findMany({ where: { id: { in: khatTypeIds } } });
      const khatTypeMap = new Map(khatTypes.map((k) => [k.id, k]));

      const itemsData = [];

      for (const item of items) {
        let itemTotalPieces = 0;
        let itemTotalFee = 0;

        const khatDetailsData = [];

        for (const detail of item.khatDetails) {
          const khatType = khatTypeMap.get(detail.khatTypeId);
          if (!khatType) continue;

          const pieces = parseInt(detail.pieces) || 0;
          const totalFee = pieces * khatType.feePerPiece;

          khatDetailsData.push({
            khatTypeId: detail.khatTypeId,
            pieces,
            feePerPiece: khatType.feePerPiece,
            totalFee,
          });

          itemTotalPieces += pieces;
          itemTotalFee += totalFee;
        }

        itemsData.push({
          shipmentId: id,
          farmerId: item.farmerId,
          agentId: item.agentId,
          farmerAlias: item.farmerAlias || null,
          notes: item.notes || null,
          totalPieces: itemTotalPieces,
          totalFee: itemTotalFee,
          numberOfBags: parseInt(item.numberOfBags) || 1,
        });

        agentBalanceUpdates.set(
          item.agentId,
          (agentBalanceUpdates.get(item.agentId) || 0) + itemTotalFee
        );
      }

      await db.$transaction(async (tx) => {
        // حذف العناصر القديمة
        await tx.shipmentItem.deleteMany({ where: { shipmentId: id } });

        // إنشاء العناصر الجديدة
        for (const itemData of itemsData) {
          const { shipmentId, ...data } = itemData;
          const originalItem = items.find(
            (i: { farmerId: string; agentId: string }) => i.farmerId === data.farmerId && i.agentId === data.agentId
          );

          const khatDetailsCreate = originalItem?.khatDetails?.map((d: { khatTypeId: string; pieces: number }) => {
            const khatType = khatTypeMap.get(d.khatTypeId);
            if (!khatType) return null;
            const pieces = parseInt(d.pieces) || 0;
            return {
              khatTypeId: d.khatTypeId,
              pieces,
              feePerPiece: khatType.feePerPiece,
              totalFee: pieces * khatType.feePerPiece,
            };
          }).filter(Boolean) || [];

          await tx.shipmentItem.create({
            data: {
              ...data,
              shipmentId: id,
              khatDetails: { create: khatDetailsCreate },
            },
          });
        }

        // تحديث الشحنة
        await tx.shipment.update({
          where: { id },
          data: {
            ...(status && { status: status as 'PENDING' | 'DELIVERED' }),
            ...(notes !== undefined && { notes: notes || null }),
          },
        });

        // تحديث الأرصدة
        for (const [agentId, amount] of agentBalanceUpdates) {
          if (amount !== 0) {
            await tx.agent.update({
              where: { id: agentId },
              data: { balance: { increment: amount } },
            });
          }
        }
      });

      // تسجيل نشاط التعديل
      if (userId) {
        await logActivity({
          action: 'UPDATE',
          entityType: 'shipment',
          entityId: id,
          description: `تعديل الشحنة: ${itemsData.length} عناصر`,
          userId,
        });
      }
    } else {
      await db.shipment.update({
        where: { id },
        data: {
          ...(status && { status: status as 'PENDING' | 'DELIVERED' }),
          ...(notes !== undefined && { notes: notes || null }),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating shipment:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 });
  }
}

// DELETE - حذف شحنة
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف الشحنة مطلوب' }, { status: 400 });
    }

    const shipment = await db.shipment.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!shipment) {
      return NextResponse.json({ success: false, error: 'الشحنة غير موجودة' }, { status: 404 });
    }

    const agentBalanceUpdates = new Map<string, number>();

    for (const item of shipment.items) {
      agentBalanceUpdates.set(
        item.agentId,
        (agentBalanceUpdates.get(item.agentId) || 0) - item.totalFee
      );
    }

    await db.$transaction(async (tx) => {
      await tx.shipment.delete({ where: { id } });

      for (const [agentId, amount] of agentBalanceUpdates) {
        if (amount !== 0) {
          await tx.agent.update({
            where: { id: agentId },
            data: { balance: { increment: amount } },
          });
        }
      }
    });

    // تسجيل النشاط
    if (userId) {
      await logActivity({
        action: 'DELETE',
        entityType: 'shipment',
        entityId: id,
        description: `حذف الشحنة: ${shipment.items.length} عناصر`,
        oldData: {
          itemsCount: shipment.items.length,
          totalPieces: shipment.items.reduce((sum, item) => sum + item.totalPieces, 0),
          totalFee: shipment.items.reduce((sum, item) => sum + item.totalFee, 0),
        },
        userId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting shipment:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 });
  }
}
