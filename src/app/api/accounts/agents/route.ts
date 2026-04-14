import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const agents = await db.agent.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        balance: true,
        createdAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // حساب إجمالي الأرصدة
    const totalBalance = agents.reduce((sum, agent) => sum + agent.balance, 0);

    return NextResponse.json({
      agents,
      totalBalance
    })
  } catch (error) {
    console.error('Error fetching agent accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agent accounts', agents: [] },
      { status: 500 }
    );
  }
}
