import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - جلب جميع قوالب الإشعارات
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    // إذا كان هناك معرف محدد، جلب قالب واحد
    if (id) {
      const template = await db.notificationTemplate.findUnique({
        where: { id }
      });

      if (!template) {
        return NextResponse.json({ error: 'القالب غير موجود' }, { status: 404 });
      }

      return NextResponse.json({ template });
    }

    const where: any = {};

    if (type) {
      where.type = type;
    }

    const templates = await db.notificationTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // تجميع حسب النوع
    const byType = await db.notificationTemplate.groupBy({
      by: ['type'],
      _count: true
    });

    const typeStats = byType.reduce((acc, item) => {
      acc[item.type] = item._count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      templates,
      stats: {
        total: templates.length,
        byType: typeStats
      }
    });
  } catch (error) {
    console.error('Error fetching notification templates:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب قوالب الإشعارات' }, { status: 500 });
  }
}

// POST - إنشاء قالب إشعار جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, title, body: templateBody, type } = body;

    if (!name || !title || !templateBody || !type) {
      return NextResponse.json({ error: 'جميع الحقول مطلوبة: الاسم، العنوان، المحتوى، النوع' }, { status: 400 });
    }

    const validTypes = ['sms', 'whatsapp', 'email', 'push'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'نوع الإشعار غير صالح. الأنواع المتاحة: sms, whatsapp, email, push' }, { status: 400 });
    }

    // التحقق من عدم وجود قالب بنفس الاسم
    const existingTemplate = await db.notificationTemplate.findUnique({
      where: { name }
    });

    if (existingTemplate) {
      return NextResponse.json({ error: 'يوجد قالب بنفس الاسم بالفعل' }, { status: 400 });
    }

    const template = await db.notificationTemplate.create({
      data: {
        name,
        title,
        body: templateBody,
        type
      }
    });

    return NextResponse.json({
      success: true,
      template,
      message: 'تم إنشاء القالب بنجاح'
    });
  } catch (error) {
    console.error('Error creating notification template:', error);
    return NextResponse.json({ error: 'حدث خطأ في إنشاء قالب الإشعار' }, { status: 500 });
  }
}

// PUT - تحديث قالب إشعار
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, title, body: templateBody, type } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف القالب مطلوب' }, { status: 400 });
    }

    // التحقق من وجود القالب
    const existingTemplate = await db.notificationTemplate.findUnique({
      where: { id }
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: 'القالب غير موجود' }, { status: 404 });
    }

    // التحقق من عدم تكرار الاسم مع قالب آخر
    if (name && name !== existingTemplate.name) {
      const duplicateName = await db.notificationTemplate.findUnique({
        where: { name }
      });
      if (duplicateName) {
        return NextResponse.json({ error: 'يوجد قالب آخر بنفس الاسم' }, { status: 400 });
      }
    }

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (title !== undefined) updateData.title = title;
    if (templateBody !== undefined) updateData.body = templateBody;
    if (type !== undefined) {
      const validTypes = ['sms', 'whatsapp', 'email', 'push'];
      if (!validTypes.includes(type)) {
        return NextResponse.json({ error: 'نوع الإشعار غير صالح' }, { status: 400 });
      }
      updateData.type = type;
    }

    const template = await db.notificationTemplate.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      template,
      message: 'تم تحديث القالب بنجاح'
    });
  } catch (error) {
    console.error('Error updating notification template:', error);
    return NextResponse.json({ error: 'حدث خطأ في تحديث قالب الإشعار' }, { status: 500 });
  }
}

// DELETE - حذف قالب إشعار
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف القالب مطلوب' }, { status: 400 });
    }

    // التحقق من وجود القالب
    const existingTemplate = await db.notificationTemplate.findUnique({
      where: { id }
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: 'القالب غير موجود' }, { status: 404 });
    }

    await db.notificationTemplate.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'تم حذف القالب بنجاح'
    });
  } catch (error) {
    console.error('Error deleting notification template:', error);
    return NextResponse.json({ error: 'حدث خطأ في حذف قالب الإشعار' }, { status: 500 });
  }
}
