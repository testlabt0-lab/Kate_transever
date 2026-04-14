import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - جلب جميع التذكيرات النشطة
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const where = activeOnly ? { isActive: true } : {};

    const reminders = await db.isolatedItemReminder.findMany({
      where,
      include: {
        shipmentItem: {
          include: {
            shipment: {
              select: {
                id: true,
                date: true,
                weekDay: true,
              }
            },
            farmer: { select: { id: true, name: true } },
            agent: { select: { id: true, name: true } },
          }
        }
      },
      orderBy: { remindAt: 'asc' },
    });

    // تحديث التذكيرات التي حان وقتها
    const now = new Date();
    const dueReminders = reminders.filter(r =>
      r.isActive &&
      r.remindAt <= now &&
      (!r.lastRemindedAt || new Date(r.lastRemindedAt.getTime() + r.intervalHours * 60 * 60 * 1000) <= now)
    );

    // تحديث وقت آخر تذكير
    for (const reminder of dueReminders) {
      await db.isolatedItemReminder.update({
        where: { id: reminder.id },
        data: {
          lastRemindedAt: now,
          reminderCount: { increment: 1 },
          remindAt: new Date(now.getTime() + reminder.intervalHours * 60 * 60 * 1000),
        },
      });
    }

    return NextResponse.json({
      reminders,
      dueCount: dueReminders.length,
    });
  } catch (error) {
    console.error('Error fetching isolated reminders:', error);
    return NextResponse.json({ error: 'فشل في تحميل التذكيرات' }, { status: 500 });
  }
}

// PUT - تحديث تذكير
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isActive, intervalHours, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف التذكير مطلوب' }, { status: 400 });
    }

    const reminder = await db.isolatedItemReminder.update({
      where: { id },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(intervalHours && { intervalHours }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json({ success: true, reminder });
  } catch (error) {
    console.error('Error updating isolated reminder:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 });
  }
}

// DELETE - حذف تذكير
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف التذكير مطلوب' }, { status: 400 });
    }

    await db.isolatedItemReminder.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting isolated reminder:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 });
  }
}
