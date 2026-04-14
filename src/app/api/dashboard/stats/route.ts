import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // التحقق من الـ token
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    // جلب الإحصائيات
    const [
      farmersCount,
      agentsCount,
      transportersCount,
      shipmentsCount,
      totalExpenses,
      pendingShipments,
    ] = await Promise.all([
      db.farmer.count(),
      db.agent.count(),
      db.transporter.count(),
      db.shipment.count(),
      db.expense.aggregate({
        _sum: { amount: true },
      }),
      db.shipment.count({
        where: { status: 'PENDING' },
      }),
    ]);

    return NextResponse.json({
      farmersCount,
      agentsCount,
      transportersCount,
      shipmentsCount,
      totalExpenses: totalExpenses._sum.amount ?? 0,
      pendingShipments,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ' },
      { status: 500 }
    );
  }
}
