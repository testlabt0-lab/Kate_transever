import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - جلب مواقع الموصلين
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deliveryPersonId = searchParams.get('deliveryPersonId');
    const limit = parseInt(searchParams.get('limit') || '100');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    const where: any = {};

    if (deliveryPersonId) {
      where.deliveryPersonId = deliveryPersonId;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = new Date(fromDate);
      }
      if (toDate) {
        where.createdAt.lte = new Date(toDate);
      }
    }

    const locations = await db.deliveryLocation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: locations,
      count: locations.length,
    });
  } catch (error) {
    console.error('خطأ في جلب المواقع:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء جلب المواقع' },
      { status: 500 }
    );
  }
}

// POST - إضافة موقع جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      deliveryPersonId,
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      battery,
    } = body;

    // التحقق من البيانات المطلوبة
    if (!deliveryPersonId) {
      return NextResponse.json(
        { success: false, error: 'معرف الموصل مطلوب' },
        { status: 400 }
      );
    }

    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { success: false, error: 'خط العرض وخط الطول مطلوبان' },
        { status: 400 }
      );
    }

    // التحقق من صحة الإحداثيات
    if (latitude < -90 || latitude > 90) {
      return NextResponse.json(
        { success: false, error: 'خط العرض يجب أن يكون بين -90 و 90' },
        { status: 400 }
      );
    }

    if (longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { success: false, error: 'خط الطول يجب أن يكون بين -180 و 180' },
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

    const location = await db.deliveryLocation.create({
      data: {
        deliveryPersonId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : null,
        speed: speed ? parseFloat(speed) : null,
        heading: heading ? parseFloat(heading) : null,
        battery: battery ? parseInt(battery) : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: location,
      message: 'تم حفظ الموقع بنجاح',
    });
  } catch (error) {
    console.error('خطأ في حفظ الموقع:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء حفظ الموقع' },
      { status: 500 }
    );
  }
}
