import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - جلب المعاملات
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const actorType = searchParams.get('actorType'); // FARMER or AGENT
    const actorId = searchParams.get('actorId');
    const type = searchParams.get('type'); // DEBT or PAYMENT
    const limit = parseInt(searchParams.get('limit') || '100');

    // Build where clause
    const where: {
      actorType?: 'FARMER' | 'AGENT';
      actorId?: string;
      type?: 'DEBT' | 'PAYMENT';
    } = {};

    if (actorType && ['FARMER', 'AGENT'].includes(actorType)) {
      where.actorType = actorType as 'FARMER' | 'AGENT';
    }
    if (actorId) {
      where.actorId = actorId;
    }
    if (type && ['DEBT', 'PAYMENT'].includes(type)) {
      where.type = type as 'DEBT' | 'PAYMENT';
    }

    // جلب جميع المعاملات
    const transactions = await db.transaction.findMany({
      where,
      orderBy: {
        date: 'desc',
      },
      take: limit,
    });

    // جلب أسماء الممثلين
    const farmerIds = [...new Set(transactions.filter(t => t.actorType === 'FARMER').map(t => t.actorId))];
    const agentIds = [...new Set(transactions.filter(t => t.actorType === 'AGENT').map(t => t.actorId))];

    const farmers = farmerIds.length > 0 ? await db.farmer.findMany({
      where: { id: { in: farmerIds } },
      select: { id: true, name: true },
    }) : [];

    const agents = agentIds.length > 0 ? await db.agent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true },
    }) : [];

    // Create lookup maps
    const farmerMap = new Map(farmers.map(f => [f.id, f.name]));
    const agentMap = new Map(agents.map(a => [a.id, a.name]));

    // Add actor names to transactions
    const transactionsWithNames = transactions.map(t => ({
      ...t,
      farmer: t.actorType === 'FARMER' ? { name: farmerMap.get(t.actorId) || t.actorName || 'غير معروف' } : null,
      agent: t.actorType === 'AGENT' ? { name: agentMap.get(t.actorId) || t.actorName || 'غير معروف' } : null,
    }));

    return NextResponse.json({ transactions: transactionsWithNames });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'فشل في تحميل المعاملات', transactions: [] },
      { status: 500 }
    );
  }
}

// POST - إنشاء معاملة جديدة (تسديد أو خصم)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { actorType, actorId, amount, type, description } = body;

    // التحقق من البيانات
    if (!actorType || !actorId || !amount || !type) {
      return NextResponse.json(
        { success: false, error: 'جميع الحقول مطلوبة' },
        { status: 400 }
      );
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'المبلغ غير صحيح' },
        { status: 400 }
      );
    }

    // التحقق من وجود الممثل وجلب اسمه
    let actor;
    let actorName: string;

    if (actorType === 'FARMER') {
      actor = await db.farmer.findUnique({
        where: { id: actorId },
        select: { balance: true, name: true },
      });
      actorName = actor?.name || 'غير معروف';
    } else if (actorType === 'AGENT') {
      actor = await db.agent.findUnique({
        where: { id: actorId },
        select: { balance: true, name: true },
      });
      actorName = actor?.name || 'غير معروف';
    }

    if (!actor) {
      return NextResponse.json(
        { success: false, error: 'الممثل غير موجود' },
        { status: 404 }
      );
    }

    // إنشاء المعاملة
    const transaction = await db.transaction.create({
      data: {
        actorType: actorType as 'FARMER' | 'AGENT',
        actorId,
        actorName,
        amount: amountNum,
        type: type as 'DEBT' | 'PAYMENT',
        description: description || (type === 'PAYMENT' ? 'تسديد مبلغ' : 'إضافة دين'),
      },
    });

    // تحديث الرصيد
    // DEBT = زيادة الرصيد (دين على الممثل)
    // PAYMENT = نقص الرصيد (دفع الممثل)
    const newBalance = type === 'DEBT'
      ? actor.balance + amountNum
      : actor.balance - amountNum;

    if (actorType === 'FARMER') {
      await db.farmer.update({
        where: { id: actorId },
        data: { balance: newBalance },
      });
    } else if (actorType === 'AGENT') {
      await db.agent.update({
        where: { id: actorId },
        data: { balance: newBalance },
      });
    }

    return NextResponse.json({
      success: true,
      transaction: {
        ...transaction,
        farmer: actorType === 'FARMER' ? { name: actorName } : null,
        agent: actorType === 'AGENT' ? { name: actorName } : null,
        newBalance,
      },
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء حفظ المعاملة' },
      { status: 500 }
    );
  }
}

// DELETE - حذف معاملة
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف المعاملة مطلوب' },
        { status: 400 }
      );
    }

    // جلب المعاملة قبل الحذف
    const transaction = await db.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'المعاملة غير موجودة' },
        { status: 404 }
      );
    }

    // عكس تأثير المعاملة على الرصيد
    if (transaction.actorType === 'FARMER') {
      const farmer = await db.farmer.findUnique({
        where: { id: transaction.actorId },
        select: { balance: true },
      });

      if (farmer) {
        const newBalance = transaction.type === 'DEBT'
          ? farmer.balance - transaction.amount
          : farmer.balance + transaction.amount;

        await db.farmer.update({
          where: { id: transaction.actorId },
          data: { balance: newBalance },
        });
      }
    } else if (transaction.actorType === 'AGENT') {
      const agent = await db.agent.findUnique({
        where: { id: transaction.actorId },
        select: { balance: true },
      });

      if (agent) {
        const newBalance = transaction.type === 'DEBT'
          ? agent.balance - transaction.amount
          : agent.balance + transaction.amount;

        await db.agent.update({
          where: { id: transaction.actorId },
          data: { balance: newBalance },
        });
      }
    }

    // حذف المعاملة
    await db.transaction.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء حذف المعاملة' },
      { status: 500 }
    );
  }
}
