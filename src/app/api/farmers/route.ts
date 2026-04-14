import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';

// GET - جلب المزارعين
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const where = search
      ? { name: { contains: search } }
      : {};

    const farmers = await db.farmer.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ farmers });
  } catch (error) {
    console.error('Error fetching farmers:', error);
    return NextResponse.json({ error: 'فشل في تحميل المزارعين' }, { status: 500 });
  }
}

// POST - إضافة مزارع جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, fullName, phone, userId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'اسم المزارع مطلوب' }, { status: 400 });
    }

    const existing = await db.farmer.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json({ error: 'يوجد مزارع بهذا الاسم مسبقاً' }, { status: 400 });
    }

    const farmer = await db.farmer.create({
      data: {
        name: name.trim(),
        fullName: fullName?.trim() || null,
        phone: phone?.trim() || null,
      },
    });

    // تسجيل النشاط
    if (userId) {
      await logActivity({
        action: 'CREATE',
        entityType: 'farmer',
        entityId: farmer.id,
        description: `إضافة مزارع جديد: ${farmer.name}`,
        newData: farmer,
        userId,
      });
    }

    return NextResponse.json({ success: true, farmer });
  } catch (error) {
    console.error('Error creating farmer:', error);
    return NextResponse.json({ error: 'فشل في إضافة المزارع' }, { status: 500 });
  }
}

// PUT - تعديل مزارع
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, fullName, phone, userId } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف المزارع مطلوب' }, { status: 400 });
    }

    // جلب البيانات القديمة
    const oldFarmer = await db.farmer.findUnique({ where: { id } });
    if (!oldFarmer) {
      return NextResponse.json({ error: 'المزارع غير موجود' }, { status: 404 });
    }

    if (name !== undefined) {
      const existing = await db.farmer.findFirst({
        where: { name: name.trim(), NOT: { id } },
      });

      if (existing) {
        return NextResponse.json({ error: 'يوجد مزارع آخر بهذا الاسم مسبقاً' }, { status: 400 });
      }
    }

    const farmer = await db.farmer.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(fullName !== undefined && { fullName: fullName?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
      },
    });

    // تسجيل النشاط
    if (userId) {
      await logActivity({
        action: 'UPDATE',
        entityType: 'farmer',
        entityId: farmer.id,
        description: `تعديل المزارع: ${farmer.name}`,
        oldData: oldFarmer,
        newData: farmer,
        userId,
      });
    }

    return NextResponse.json({ success: true, farmer });
  } catch (error) {
    console.error('Error updating farmer:', error);
    return NextResponse.json({ error: 'فشل في تعديل المزارع' }, { status: 500 });
  }
}

// DELETE - حذف مزارع
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id) {
      return NextResponse.json({ error: 'معرف المزارع مطلوب' }, { status: 400 });
    }

    // جلب البيانات قبل الحذف
    const farmer = await db.farmer.findUnique({ where: { id } });
    if (!farmer) {
      return NextResponse.json({ error: 'المزارع غير موجود' }, { status: 404 });
    }

    const itemsCount = await db.shipmentItem.count({
      where: { farmerId: id },
    });

    if (itemsCount > 0) {
      return NextResponse.json({ error: 'لا يمكن حذف المزارع لأن لديه شحنات مسجلة' }, { status: 400 });
    }

    await db.farmer.delete({ where: { id } });

    // تسجيل النشاط
    if (userId) {
      await logActivity({
        action: 'DELETE',
        entityType: 'farmer',
        entityId: id,
        description: `حذف المزارع: ${farmer.name}`,
        oldData: farmer,
        userId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting farmer:', error);
    return NextResponse.json({ error: 'فشل في حذف المزارع' }, { status: 500 });
  }
}
