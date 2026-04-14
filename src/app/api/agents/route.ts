import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';

// GET - جلب جميع الوكلاء
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const where = search
      ? { name: { contains: search } }
      : {};

    const agents = await db.agent.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json({ error: 'فشل في تحميل الوكلاء' }, { status: 500 });
  }
}

// POST - إضافة وكيل جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, userId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'اسم الوكيل مطلوب' }, { status: 400 });
    }

    const existing = await db.agent.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json({ error: 'يوجد وكيل بهذا الاسم مسبقاً' }, { status: 400 });
    }

    const agent = await db.agent.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        balance: 0,
      },
    });

    // تسجيل النشاط
    if (userId) {
      await logActivity({
        action: 'CREATE',
        entityType: 'agent',
        entityId: agent.id,
        description: `إضافة وكيل جديد: ${agent.name}`,
        newData: agent,
        userId,
      });
    }

    return NextResponse.json({ success: true, agent });
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json({ error: 'فشل في إضافة الوكيل' }, { status: 500 });
  }
}

// PUT - تعديل وكيل
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, phone, userId } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف الوكيل مطلوب' }, { status: 400 });
    }

    // جلب البيانات القديمة
    const oldAgent = await db.agent.findUnique({ where: { id } });
    if (!oldAgent) {
      return NextResponse.json({ error: 'الوكيل غير موجود' }, { status: 404 });
    }

    if (name !== undefined) {
      const existing = await db.agent.findFirst({
        where: { name: name.trim(), NOT: { id } },
      });

      if (existing) {
        return NextResponse.json({ error: 'يوجد وكيل آخر بهذا الاسم مسبقاً' }, { status: 400 });
      }
    }

    const agent = await db.agent.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
      },
    });

    // تسجيل النشاط
    if (userId) {
      await logActivity({
        action: 'UPDATE',
        entityType: 'agent',
        entityId: agent.id,
        description: `تعديل الوكيل: ${agent.name}`,
        oldData: oldAgent,
        newData: agent,
        userId,
      });
    }

    return NextResponse.json({ success: true, agent });
  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json({ error: 'فشل في تعديل الوكيل' }, { status: 500 });
  }
}

// DELETE - حذف وكيل
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id) {
      return NextResponse.json({ error: 'معرف الوكيل مطلوب' }, { status: 400 });
    }

    // جلب البيانات قبل الحذف
    const agent = await db.agent.findUnique({ where: { id } });
    if (!agent) {
      return NextResponse.json({ error: 'الوكيل غير موجود' }, { status: 404 });
    }

    const shipmentsCount = await db.shipmentItem.count({
      where: { agentId: id },
    });

    if (shipmentsCount > 0) {
      return NextResponse.json({ error: 'لا يمكن حذف الوكيل لأن لديه شحنات مسجلة' }, { status: 400 });
    }

    await db.agent.delete({ where: { id } });

    // تسجيل النشاط
    if (userId) {
      await logActivity({
        action: 'DELETE',
        entityType: 'agent',
        entityId: id,
        description: `حذف الوكيل: ${agent.name}`,
        oldData: agent,
        userId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json({ error: 'فشل في حذف الوكيل' }, { status: 500 });
  }
}
