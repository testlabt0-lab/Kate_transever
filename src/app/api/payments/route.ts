import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PaymentDirection } from '@prisma/client';

// GET - جلب جميع التسديدات
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    const where: { agentId?: string } = {};
    if (agentId) where.agentId = agentId;

    const payments = await db.payment.findMany({
      where,
      include: {
        agent: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'فشل في تحميل التسديدات' }, { status: 500 });
  }
}

// POST - إضافة تسديد جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, amount, direction, description } = body;

    if (!agentId) {
      return NextResponse.json({ success: false, error: 'الوكيل مطلوب' }, { status: 400 });
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'المبلغ مطلوب ويجب أن يكون أكبر من صفر' }, { status: 400 });
    }

    // حساب تأثير التسديد على الرصيد
    // FROM_AGENT: الوكيل سدد = ينقص رصيده (كان عليه أجرة)
    // TO_AGENT: رجعنا للوكيل = يزيد رصيده
    const balanceChange = direction === 'FROM_AGENT' ? -amount : amount;

    await db.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          agentId,
          amount,
          direction: direction as PaymentDirection,
          description: description || null,
        },
      });

      await tx.agent.update({
        where: { id: agentId },
        data: { balance: { increment: balanceChange } },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ أثناء حفظ التسديد' }, { status: 500 });
  }
}

// DELETE - حذف تسديد
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف التسديد مطلوب' }, { status: 400 });
    }

    const payment = await db.payment.findUnique({ where: { id } });

    if (!payment) {
      return NextResponse.json({ success: false, error: 'التسديد غير موجود' }, { status: 404 });
    }

    // عكس تأثير التسديد
    const balanceChange = payment.direction === 'FROM_AGENT' ? payment.amount : -payment.amount;

    await db.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id } });

      await tx.agent.update({
        where: { id: payment.agentId },
        data: { balance: { increment: balanceChange } },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting payment:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ أثناء حذف التسديد' }, { status: 500 });
  }
}
