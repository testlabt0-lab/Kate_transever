import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';

// GET - جلب جميع الموصلين
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const includeStats = searchParams.get('includeStats') === 'true';

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : {};

    const deliveryPersons = await db.deliveryPerson.findMany({
      where,
      orderBy: { name: 'asc' },
      include: includeStats
        ? {
            _count: {
              select: { shipments: true },
            },
          }
        : false,
    });

    // حساب إحصائيات إضافية لكل موصل
    let result = deliveryPersons;
    if (includeStats) {
      const statsPromises = deliveryPersons.map(async (person) => {
        const shipments = await db.shipment.findMany({
          where: { deliveryPersonId: person.id },
          include: {
            items: {
              include: {
                khatDetails: true,
              },
            },
          },
        });

        const totalPieces = shipments.reduce(
          (sum, s) => sum + s.items.reduce((s, i) => s + i.totalPieces, 0),
          0
        );
        const totalBags = shipments.reduce(
          (sum, s) => sum + s.items.reduce((s, i) => s + (i.numberOfBags || 1), 0),
          0
        );
        const farmersSet = new Set<string>();
        shipments.forEach((s) =>
          s.items.forEach((i) => farmersSet.add(i.farmerId))
        );

        return {
          ...person,
          stats: {
            totalShipments: shipments.length,
            totalPieces,
            totalBags,
            totalFarmers: farmersSet.size,
          },
        };
      });
      result = await Promise.all(statsPromises);
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching delivery persons:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في جلب الموصلين' },
      { status: 500 }
    );
  }
}

// POST - إضافة موصل جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'اسم الموصل مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من عدم وجود موصل بنفس الاسم
    const existing = await db.deliveryPerson.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'يوجد موصل بهذا الاسم مسبقاً' },
        { status: 400 }
      );
    }

    const deliveryPerson = await db.deliveryPerson.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
      },
    });

    // تسجيل النشاط
    await logActivity({
      action: 'CREATE',
      entityType: 'delivery_person',
      entityId: deliveryPerson.id,
      description: `تم إضافة موصل جديد: ${deliveryPerson.name}`,
      newData: JSON.stringify(deliveryPerson),
      userId: 'system',
    });

    return NextResponse.json({
      success: true,
      data: deliveryPerson,
      message: 'تم إضافة الموصل بنجاح',
    });
  } catch (error) {
    console.error('Error creating delivery person:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في إضافة الموصل' },
      { status: 500 }
    );
  }
}

// PUT - تعديل موصل
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, phone } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف الموصل مطلوب' },
        { status: 400 }
      );
    }

    // جلب البيانات القديمة
    const oldData = await db.deliveryPerson.findUnique({
      where: { id },
    });

    if (!oldData) {
      return NextResponse.json(
        { success: false, error: 'الموصل غير موجود' },
        { status: 404 }
      );
    }

    // التحقق من عدم وجود موصل آخر بنفس الاسم
    if (name && name !== oldData.name) {
      const existing = await db.deliveryPerson.findUnique({
        where: { name: name.trim() },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'يوجد موصل آخر بهذا الاسم' },
          { status: 400 }
        );
      }
    }

    const deliveryPerson = await db.deliveryPerson.update({
      where: { id },
      data: {
        name: name?.trim() || oldData.name,
        phone: phone?.trim() || null,
      },
    });

    // تسجيل النشاط
    await logActivity({
      action: 'UPDATE',
      entityType: 'delivery_person',
      entityId: deliveryPerson.id,
      description: `تم تعديل الموصل: ${deliveryPerson.name}`,
      oldData: JSON.stringify(oldData),
      newData: JSON.stringify(deliveryPerson),
      userId: 'system',
    });

    return NextResponse.json({
      success: true,
      data: deliveryPerson,
      message: 'تم تعديل الموصل بنجاح',
    });
  } catch (error) {
    console.error('Error updating delivery person:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في تعديل الموصل' },
      { status: 500 }
    );
  }
}

// DELETE - حذف موصل
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف الموصل مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من عدم وجود شحنات مرتبطة
    const shipmentsCount = await db.shipment.count({
      where: { deliveryPersonId: id },
    });

    if (shipmentsCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `لا يمكن حذف الموصل - يوجد ${shipmentsCount} شحنة مرتبطة`,
        },
        { status: 400 }
      );
    }

    // جلب البيانات قبل الحذف
    const oldData = await db.deliveryPerson.findUnique({
      where: { id },
    });

    if (!oldData) {
      return NextResponse.json(
        { success: false, error: 'الموصل غير موجود' },
        { status: 404 }
      );
    }

    await db.deliveryPerson.delete({
      where: { id },
    });

    // تسجيل النشاط
    await logActivity({
      action: 'DELETE',
      entityType: 'delivery_person',
      entityId: id,
      description: `تم حذف الموصل: ${oldData.name}`,
      oldData: JSON.stringify(oldData),
      userId: 'system',
    });

    return NextResponse.json({
      success: true,
      message: 'تم حذف الموصل بنجاح',
    });
  } catch (error) {
    console.error('Error deleting delivery person:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في حذف الموصل' },
      { status: 500 }
    );
  }
}
