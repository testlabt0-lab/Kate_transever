import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - جلب جميع أنواع القات
export async function GET() {
  try {
    const khatTypes = await db.khatType.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ khatTypes });
  } catch (error) {
    console.error('Error fetching khat types:', error);
    return NextResponse.json({ error: 'فشل في تحميل أنواع القات' }, { status: 500 });
  }
}

// POST - إضافة نوع قات جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, feePerPiece } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'اسم نوع القات مطلوب' }, { status: 400 });
    }

    const existing = await db.khatType.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json({ error: 'يوجد نوع قات بهذا الاسم بالفعل' }, { status: 400 });
    }

    const khatType = await db.khatType.create({
      data: {
        name: name.trim(),
        feePerPiece: parseFloat(feePerPiece) || 0,
      },
    });

    return NextResponse.json({ success: true, khatType });
  } catch (error) {
    console.error('Error creating khat type:', error);
    return NextResponse.json({ error: 'فشل في إضافة نوع القات' }, { status: 500 });
  }
}

// PUT - تعديل نوع قات
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, feePerPiece } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف نوع القات مطلوب' }, { status: 400 });
    }

    if (name !== undefined) {
      const existing = await db.khatType.findFirst({
        where: { name: name.trim(), NOT: { id } },
      });

      if (existing) {
        return NextResponse.json({ error: 'يوجد نوع قات آخر بهذا الاسم بالفعل' }, { status: 400 });
      }
    }

    const khatType = await db.khatType.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(feePerPiece !== undefined && { feePerPiece: parseFloat(feePerPiece) || 0 }),
      },
    });

    return NextResponse.json({ success: true, khatType });
  } catch (error) {
    console.error('Error updating khat type:', error);
    return NextResponse.json({ error: 'فشل في تعديل نوع القات' }, { status: 500 });
  }
}

// DELETE - حذف نوع قات
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف نوع القات مطلوب' }, { status: 400 });
    }

    await db.khatType.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting khat type:', error);
    return NextResponse.json({ error: 'فشل في حذف نوع القات' }, { status: 500 });
  }
}
