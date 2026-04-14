import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT - تأكيد استلام عنصر من الشحنة أو تحييد عنصر
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shipmentId } = await params;
    const body = await request.json();
    const { itemId, receivedBy, deliveryStatus, isIsolate, isolationReason, isolatedBy, isResolve, resolutionNotes } = body;

    if (!shipmentId) {
      return NextResponse.json({
        success: false,
        error: 'معرف الشحنة مطلوب'
      }, { status: 400 });
    }

    // التحقق من وجود الشحنة
    const shipment = await db.shipment.findUnique({
      where: { id: shipmentId },
      include: { items: true },
    });

    if (!shipment) {
      return NextResponse.json({
        success: false,
        error: 'الشحنة غير موجودة'
      }, { status: 404 });
    }

    // تحييد عنصر (لم يصل)
    if (isIsolate && itemId) {
      const item = await db.shipmentItem.findFirst({
        where: { id: itemId, shipmentId },
      });

      if (!item) {
        return NextResponse.json({
          success: false,
          error: 'العنصر غير موجود في هذه الشحنة'
        }, { status: 404 });
      }

      // تحديث العنصر إلى محايد
      const updatedItem = await db.shipmentItem.update({
        where: { id: itemId },
        data: {
          isIsolated: true,
          isolatedAt: new Date(),
          isolationReason: isolationReason || 'لم يصل',
          isolatedBy: isolatedBy || null,
          deliveryStatus: 'PENDING', // إعادة للحالة المعلقة
        },
      });

      // إنشاء تذكير دوري للعنصر المحايد
      const remindAt = new Date();
      remindAt.setHours(remindAt.getHours() + 4); // أول تذكير بعد 4 ساعات

      await db.isolatedItemReminder.create({
        data: {
          shipmentItemId: itemId,
          remindAt,
          intervalHours: 4,
          isActive: true,
          notes: isolationReason || 'عنصر لم يصل - يرجى التأكد منه',
        },
      });

      return NextResponse.json({
        success: true,
        item: updatedItem,
        message: 'تم تحييد العنصر وإنشاء تذكير دوري'
      });
    }

    // حل مشكلة عنصر محايد
    if (isResolve && itemId) {
      const item = await db.shipmentItem.findFirst({
        where: { id: itemId, shipmentId },
      });

      if (!item) {
        return NextResponse.json({
          success: false,
          error: 'العنصر غير موجود في هذه الشحنة'
        }, { status: 404 });
      }

      // تحديث العنصر إلى محلول
      const updatedItem = await db.shipmentItem.update({
        where: { id: itemId },
        data: {
          isIsolated: false,
          resolvedAt: new Date(),
          resolutionNotes: resolutionNotes || null,
          deliveryStatus: deliveryStatus || 'DELIVERED',
          receivedBy: receivedBy || item.receivedBy,
          receivedAt: new Date(),
        },
      });

      // إيقاف التذكيرات
      await db.isolatedItemReminder.updateMany({
        where: { shipmentItemId: itemId, isActive: true },
        data: { isActive: false },
      });

      return NextResponse.json({
        success: true,
        item: updatedItem,
        message: 'تم حل المشكلة وإيقاف التذكيرات'
      });
    }

    // إذا كان تحديث عنصر معين
    if (itemId) {
      const item = await db.shipmentItem.findFirst({
        where: { id: itemId, shipmentId },
      });

      if (!item) {
        return NextResponse.json({
          success: false,
          error: 'العنصر غير موجود في هذه الشحنة'
        }, { status: 404 });
      }

      // تحديث حالة التسليم للعنصر
      const updatedItem = await db.shipmentItem.update({
        where: { id: itemId },
        data: {
          deliveryStatus: deliveryStatus || 'DELIVERED',
          receivedBy: receivedBy || null,
          receivedAt: receivedBy ? new Date() : null,
        },
      });

      return NextResponse.json({
        success: true,
        item: updatedItem,
        message: 'تم تحديث حالة الاستلام'
      });
    }

    // تحديث جميع عناصر الشحنة
    if (receivedBy) {
      const updatedItems = await db.shipmentItem.updateMany({
        where: { shipmentId, isIsolated: false }, // فقط العناصر غير المحايدة
        data: {
          deliveryStatus: deliveryStatus || 'DELIVERED',
          receivedBy,
          receivedAt: new Date(),
        },
      });

      // التحقق إذا كانت جميع العناصر مسلمة
      const allItems = await db.shipmentItem.findMany({
        where: { shipmentId },
      });

      const allDelivered = allItems.every(
        item => item.deliveryStatus === 'DELIVERED' || item.isIsolated
      );

      if (allDelivered) {
        await db.shipment.update({
          where: { id: shipmentId },
          data: { status: 'DELIVERED' },
        });
      }

      return NextResponse.json({
        success: true,
        count: updatedItems.count,
        message: 'تم تأكيد استلام جميع العناصر'
      });
    }

    return NextResponse.json({
      success: false,
      error: 'بيانات غير كافية'
    }, { status: 400 });

  } catch (error) {
    console.error('Error confirming shipment:', error);
    return NextResponse.json({
      success: false,
      error: 'حدث خطأ أثناء تأكيد الاستلام'
    }, { status: 500 });
  }
}

// GET - جلب تفاصيل حالة التسليم لعناصر الشحنة
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shipmentId } = await params;

    if (!shipmentId) {
      return NextResponse.json({
        success: false,
        error: 'معرف الشحنة مطلوب'
      }, { status: 400 });
    }

    const items = await db.shipmentItem.findMany({
      where: { shipmentId },
      select: {
        id: true,
        farmerAlias: true,
        totalPieces: true,
        totalFee: true,
        deliveryStatus: true,
        receivedBy: true,
        receivedAt: true,
        isIsolated: true,
        isolatedAt: true,
        isolationReason: true,
        resolvedAt: true,
        resolutionNotes: true,
        isolatedBy: true,
        farmer: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true } },
      },
    });

    // إحصائيات الحالة
    const stats = {
      total: items.length,
      pending: items.filter(i => i.deliveryStatus === 'PENDING' && !i.isIsolated).length,
      received: items.filter(i => i.deliveryStatus === 'RECEIVED').length,
      inTransit: items.filter(i => i.deliveryStatus === 'IN_TRANSIT').length,
      delivered: items.filter(i => i.deliveryStatus === 'DELIVERED').length,
      isolated: items.filter(i => i.isIsolated).length,
      resolved: items.filter(i => i.resolvedAt).length,
    };

    return NextResponse.json({
      success: true,
      items,
      stats
    });

  } catch (error) {
    console.error('Error fetching shipment delivery status:', error);
    return NextResponse.json({
      success: false,
      error: 'حدث خطأ أثناء جلب بيانات التسليم'
    }, { status: 500 });
  }
}
