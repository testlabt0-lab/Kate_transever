import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - جلب جميع الناقلين
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const where = search ? { name: { contains: search } } : {};

    const transporters = await db.transporter.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ transporters });
  } catch (error) {
    console.error('Error fetching transporters:', error);
    return NextResponse.json({ error: 'فشل في تحميل الناقلين' }, { status: 500 });
  }
}

// POST - إضافة ناقل جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'اسم الناقل مطلوب' }, { status: 400 });
    }

    const existing = await db.transporter.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json({ error: 'يوجد ناقل بهذا الاسم مسبقاً' }, { status: 400 });
    }

    const transporter = await db.transporter.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, transporter });
  } catch (error) {
    console.error('Error creating transporter:', error);
    return NextResponse.json({ error: 'فشل في إضافة الناقل' }, { status: 500 });
  }
}

// PUT - تعديل ناقل
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, phone } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف الناقل مطلوب' }, { status: 400 });
    }

    if (name !== undefined) {
      const existing = await db.transporter.findFirst({
        where: { name: name.trim(), NOT: { id } },
      });

      if (existing) {
        return NextResponse.json({ error: 'يوجد ناقل آخر بهذا الاسم مسبقاً' }, { status: 400 });
      }
    }

    const transporter = await db.transporter.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
      },
    });

    return NextResponse.json({ success: true, transporter });
  } catch (error) {
    console.error('Error updating transporter:', error);
    return NextResponse.json({ error: 'فشل في تعديل الناقل' }, { status: 500 });
  }
}

// DELETE - حذف ناقل
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف الناقل مطلوب' }, { status: 400 });
    }

    await db.transporter.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transporter:', error);
    return NextResponse.json({ error: 'فشل في حذف الناقل' }, { status: 500 });
  }
}
