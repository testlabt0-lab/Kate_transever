import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const farmers = await db.farmer.findMany({
      select: {
        id: true,
        name: true,
        fullName: true,
        phone: true,
        balance: true,
        createdAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // حساب إجمالي الأرصدة
    const totalBalance = farmers.reduce((sum, farmer) => sum + farmer.balance, 0);

    return NextResponse.json({
      farmers,
      totalBalance
    })
  } catch (error) {
    console.error('Error fetching farmer accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch farmer accounts', farmers: [] },
      { status: 500 }
    );
  }
}
