import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - جلب جميع المصاريف
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: {
      category?: 'SUPPLIES' | 'SALARY' | 'OTHER';
      date?: { gte?: Date; lte?: Date };
    } = {};

    if (category && ['SUPPLIES', 'SALARY', 'OTHER'].includes(category)) {
      where.category = category as 'SUPPLIES' | 'SALARY' | 'OTHER';
    }

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const expenses = await db.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    // حساب الإجماليات
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    const byCategory = {
      SUPPLIES: expenses.filter(e => e.category === 'SUPPLIES').reduce((sum, e) => sum + e.amount, 0),
      SALARY: expenses.filter(e => e.category === 'SALARY').reduce((sum, e) => sum + e.amount, 0),
      OTHER: expenses.filter(e => e.category === 'OTHER').reduce((sum, e) => sum + e.amount, 0),
    };

    return NextResponse.json({
      expenses,
      totalAmount,
      byCategory,
      count: expenses.length,
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: 'فشل في تحميل المصاريف' },
      { status: 500 }
    );
  }
}

// POST - إضافة مصروف جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, amount, category, date } = body;

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: 'وصف المصروف مطلوب' },
        { status: 400 }
      );
    }

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'المبلغ يجب أن يكون أكبر من صفر' },
        { status: 400 }
      );
    }

    const expense = await db.expense.create({
      data: {
        description: description.trim(),
        amount: parseFloat(amount),
        category: (category as 'SUPPLIES' | 'SALARY' | 'OTHER') || 'OTHER',
        date: date ? new Date(date) : new Date(),
      },
    });

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'فشل في إضافة المصروف' },
      { status: 500 }
    );
  }
}

// PUT - تعديل مصروف
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, description, amount, category, date } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'معرف المصروف مطلوب' },
        { status: 400 }
      );
    }

    const updateData: {
      description?: string;
      amount?: number;
      category?: 'SUPPLIES' | 'SALARY' | 'OTHER';
      date?: Date;
    } = {};

    if (description !== undefined) updateData.description = description.trim();
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (category !== undefined) updateData.category = category as 'SUPPLIES' | 'SALARY' | 'OTHER';
    if (date !== undefined) updateData.date = new Date(date);

    const expense = await db.expense.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json(
      { error: 'فشل في تعديل المصروف' },
      { status: 500 }
    );
  }
}

// DELETE - حذف مصروف
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'معرف المصروف مطلوب' },
        { status: 400 }
      );
    }

    await db.expense.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { error: 'فشل في حذف المصروف' },
      { status: 500 }
    );
  }
}
