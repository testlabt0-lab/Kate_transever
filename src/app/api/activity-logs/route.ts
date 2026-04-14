import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Action } from '@prisma/client';

// GET - جلب سجلات النشاطات مع الفلترة والتقسيم
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // معاملات التقسيم
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // معاملات الفلترة
    const action = searchParams.get('action') as Action | null;
    const entityType = searchParams.get('entityType');
    const userId = searchParams.get('userId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');

    // بناء شروط الفلترة
    const where: {
      action?: Action;
      entityType?: string;
      userId?: string;
      createdAt?: { gte?: Date; lte?: Date };
      OR?: Array<{ description: { contains: string } } | { entityType: { contains: string } }>;
    } = {};

    if (action && ['CREATE', 'UPDATE', 'DELETE', 'CONFIRM'].includes(action)) {
      where.action = action;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (userId) {
      where.userId = userId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom + 'T00:00:00.000Z');
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
      }
    }

    if (search) {
      where.OR = [
        { description: { contains: search } },
        { entityType: { contains: search } },
      ];
    }

    // جلب البيانات
    const [logs, total] = await Promise.all([
      db.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.activityLog.count({ where }),
    ]);

    // جلب معلومات المستخدمين
    const userIds = [...new Set(logs.map((log) => log.userId))];
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, role: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // دمج البيانات
    const logsWithUsers = logs.map((log) => ({
      ...log,
      user: userMap.get(log.userId) || null,
    }));

    // حساب إحصائيات الأنواع
    const statsByAction = await db.activityLog.groupBy({
      by: ['action'],
      where: dateFrom || dateTo ? { createdAt: where.createdAt } : {},
      _count: true,
    });

    const statsByEntityType = await db.activityLog.groupBy({
      by: ['entityType'],
      where: dateFrom || dateTo ? { createdAt: where.createdAt } : {},
      _count: true,
    });

    return NextResponse.json({
      logs: logsWithUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        byAction: statsByAction,
        byEntityType: statsByEntityType,
      },
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json({ error: 'فشل في تحميل سجلات النشاطات' }, { status: 500 });
  }
}
