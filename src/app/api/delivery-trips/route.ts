import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - جلب الرحلات
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deliveryPersonId = searchParams.get('deliveryPersonId');
    const shipmentId = searchParams.get('shipmentId');
    const status = searchParams.get('status');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};

    if (deliveryPersonId) {
      where.deliveryPersonId = deliveryPersonId;
    }

    if (shipmentId) {
      where.shipmentId = shipmentId;
    }

    if (status) {
      where.status = status;
    }

    if (fromDate || toDate) {
      where.startTime = {};
      if (fromDate) {
        where.startTime.gte = new Date(fromDate);
      }
      if (toDate) {
        where.startTime.lte = new Date(toDate);
      }
    }

    const trips = await db.deliveryTrip.findMany({
      where,
      orderBy: { startTime: 'desc' },
      take: limit,
    });

    // حساب مدة كل رحلة
    const tripsWithDuration = trips.map((trip) => {
      let duration = null;
      if (trip.endTime) {
        duration = Math.round(
          (trip.endTime.getTime() - trip.startTime.getTime()) / 1000 / 60
        ); // بالدقائق
      }
      return {
        ...trip,
        duration,
      };
    });

    return NextResponse.json({
      success: true,
      data: tripsWithDuration,
      count: trips.length,
    });
  } catch (error) {
    console.error('خطأ في جلب الرحلات:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء جلب الرحلات' },
      { status: 500 }
    );
  }
}

// POST - إنشاء رحلة جديدة
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      deliveryPersonId,
      shipmentId,
      startLocation,
      notes,
    } = body;

    // التحقق من البيانات المطلوبة
    if (!deliveryPersonId) {
      return NextResponse.json(
        { success: false, error: 'معرف الموصل مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من وجود الموصل
    const deliveryPerson = await db.deliveryPerson.findUnique({
      where: { id: deliveryPersonId },
    });

    if (!deliveryPerson) {
      return NextResponse.json(
        { success: false, error: 'الموصل غير موجود' },
        { status: 404 }
      );
    }

    // التحقق من عدم وجود رحلة نشطة للموصل
    const activeTrip = await db.deliveryTrip.findFirst({
      where: {
        deliveryPersonId,
        status: 'IN_PROGRESS',
      },
    });

    if (activeTrip) {
      return NextResponse.json(
        { success: false, error: 'يوجد رحلة نشطة بالفعل لهذا الموصل', activeTrip },
        { status: 400 }
      );
    }

    const trip = await db.deliveryTrip.create({
      data: {
        deliveryPersonId,
        shipmentId: shipmentId || null,
        startLocation,
        notes,
        status: 'IN_PROGRESS',
      },
    });

    return NextResponse.json({
      success: true,
      data: trip,
      message: 'تم بدء الرحلة بنجاح',
    });
  } catch (error) {
    console.error('خطأ في إنشاء الرحلة:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء إنشاء الرحلة' },
      { status: 500 }
    );
  }
}

// PUT - تحديث رحلة
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      status,
      endLocation,
      distance,
      notes,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف الرحلة مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من وجود الرحلة
    const existingTrip = await db.deliveryTrip.findUnique({
      where: { id },
    });

    if (!existingTrip) {
      return NextResponse.json(
        { success: false, error: 'الرحلة غير موجودة' },
        { status: 404 }
      );
    }

    // إعداد بيانات التحديث
    const updateData: any = {};

    if (status) {
      updateData.status = status;

      // إذا تم إكمال الرحلة أو إلغاؤها، نحدد وقت النهاية
      if ((status === 'COMPLETED' || status === 'CANCELLED') && !existingTrip.endTime) {
        updateData.endTime = new Date();
      }
    }

    if (endLocation !== undefined) {
      updateData.endLocation = endLocation;
    }

    if (distance !== undefined) {
      updateData.distance = parseFloat(distance);
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const trip = await db.deliveryTrip.update({
      where: { id },
      data: updateData,
    });

    // حساب المدة
    let duration = null;
    if (trip.endTime) {
      duration = Math.round(
        (trip.endTime.getTime() - trip.startTime.getTime()) / 1000 / 60
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...trip, duration },
      message: 'تم تحديث الرحلة بنجاح',
    });
  } catch (error) {
    console.error('خطأ في تحديث الرحلة:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء تحديث الرحلة' },
      { status: 500 }
    );
  }
}
