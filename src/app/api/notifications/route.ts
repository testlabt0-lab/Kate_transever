import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - جلب الإشعارات
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type');

    const where: any = {
      isDismissed: false,
    };

    if (unreadOnly) {
      where.isRead = false;
    }

    if (type) {
      where.type = type;
    }

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // إحصائيات
    const stats = {
      total: await db.notification.count({ where: { isDismissed: false } }),
      unread: await db.notification.count({ where: { isRead: false, isDismissed: false } }),
      byType: {},
    };

    // عدد الإشعارات حسب النوع
    const typeCounts = await db.notification.groupBy({
      by: ['type'],
      where: { isDismissed: false },
      _count: true,
    });

    typeCounts.forEach((tc) => {
      stats.byType[tc.type] = tc._count;
    });

    return NextResponse.json({ notifications, stats });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'فشل في تحميل الإشعارات' }, { status: 500 });
  }
}

// POST - إنشاء إشعار جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, message, type, priority, entityType, entityId, actionUrl, scheduledFor } = body;

    if (!title || !message || !type) {
      return NextResponse.json({ error: 'العنوان والرسالة والنوع مطلوبة' }, { status: 400 });
    }

    const notification = await db.notification.create({
      data: {
        title,
        message,
        type,
        priority: priority || 'NORMAL',
        entityType,
        entityId,
        actionUrl,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        sentAt: !scheduledFor ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'فشل في إنشاء الإشعار' }, { status: 500 });
  }
}

// PUT - تحديث إشعار (قراءة / إخفاء)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف الإشعار مطلوب' }, { status: 400 });
    }

    let data: any = {};

    switch (action) {
      case 'read':
        data = { isRead: true, readAt: new Date() };
        break;
      case 'unread':
        data = { isRead: false, readAt: null };
        break;
      case 'dismiss':
        data = { isDismissed: true, dismissedAt: new Date() };
        break;
      default:
        return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
    }

    const notification = await db.notification.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: 'فشل في تحديث الإشعار' }, { status: 500 });
  }
}

// DELETE - حذف إشعار
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action');

    if (action === 'clearAll') {
      // حذف جميع الإشعارات المخفية
      await db.notification.deleteMany({
        where: { isDismissed: true },
      });
      return NextResponse.json({ success: true, message: 'تم حذف جميع الإشعارات المخفية' });
    }

    if (action === 'clearRead') {
      // حذف جميع الإشعارات المقروءة
      await db.notification.deleteMany({
        where: { isRead: true },
      });
      return NextResponse.json({ success: true, message: 'تم حذف جميع الإشعارات المقروءة' });
    }

    if (!id) {
      return NextResponse.json({ error: 'معرف الإشعار مطلوب' }, { status: 400 });
    }

    await db.notification.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'فشل في حذف الإشعار' }, { status: 500 });
  }
}
