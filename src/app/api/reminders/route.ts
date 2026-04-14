import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - جلب جميع المنبهات
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const upcoming = searchParams.get('upcoming');
    const today = searchParams.get('today');

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (upcoming === 'true') {
      where.status = 'PENDING';
      where.reminderDateTime = { gte: new Date() };
    }

    if (today === 'true') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      where.reminderDateTime = {
        gte: startOfDay,
        lte: endOfDay
      };
    }

    const reminders = await db.reminder.findMany({
      where,
      orderBy: { reminderDateTime: 'asc' }
    });

    // حساب حالة كل منبه
    const now = new Date();
    const remindersWithStatus = reminders.map(reminder => {
      const reminderTime = new Date(reminder.reminderDateTime);
      const diff = reminderTime.getTime() - now.getTime();

      let timeStatus = {
        isOverdue: diff < 0,
        isDueSoon: diff > 0 && diff < 30 * 60 * 1000, // أقل من 30 دقيقة
        isToday: false,
        minutesUntil: Math.floor(diff / (1000 * 60))
      };

      // التحقق إذا كان اليوم
      const today = new Date();
      const reminderDay = new Date(reminderTime);
      timeStatus.isToday =
        today.getFullYear() === reminderDay.getFullYear() &&
        today.getMonth() === reminderDay.getMonth() &&
        today.getDate() === reminderDay.getDate();

      return {
        ...reminder,
        timeStatus
      };
    });

    // إحصائيات
    const stats = {
      total: reminders.length,
      pending: reminders.filter(r => r.status === 'PENDING').length,
      completed: reminders.filter(r => r.status === 'COMPLETED').length,
      overdue: remindersWithStatus.filter(r => r.timeStatus.isOverdue && r.status === 'PENDING').length,
      today: remindersWithStatus.filter(r => r.timeStatus.isToday && r.status === 'PENDING').length,
      dueSoon: remindersWithStatus.filter(r => r.timeStatus.isDueSoon && r.status === 'PENDING').length
    };

    // تجميع حسب النوع
    const byType = {
      PURCHASE: reminders.filter(r => r.type === 'PURCHASE').length,
      PAYMENT: reminders.filter(r => r.type === 'PAYMENT').length,
      DELIVERY: reminders.filter(r => r.type === 'DELIVERY').length,
      MEETING: reminders.filter(r => r.type === 'MEETING').length,
      CALL: reminders.filter(r => r.type === 'CALL').length,
      GENERAL: reminders.filter(r => r.type === 'GENERAL').length,
      MAINTENANCE: reminders.filter(r => r.type === 'MAINTENANCE').length,
      SUPPLIES: reminders.filter(r => r.type === 'SUPPLIES').length
    };

    return NextResponse.json({
      reminders: remindersWithStatus,
      stats,
      byType
    });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب المنبهات' }, { status: 500 });
  }
}

// POST - إنشاء منبه جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      type,
      priority,
      reminderDateTime,
      repeatType,
      repeatInterval
    } = body;

    if (!title || !reminderDateTime || !type) {
      return NextResponse.json({ error: 'العنوان والنوع والوقت مطلوبون' }, { status: 400 });
    }

    const reminder = await db.reminder.create({
      data: {
        title,
        description: description || null,
        type,
        priority: priority || 'NORMAL',
        reminderDateTime: new Date(reminderDateTime),
        repeatType: repeatType || 'NONE',
        repeatInterval: repeatInterval || null,
        nextReminderAt: repeatType && repeatType !== 'NONE' ? calculateNextReminder(reminderDateTime, repeatType, repeatInterval) : null,
        status: 'PENDING'
      }
    });

    return NextResponse.json({ success: true, reminder });
  } catch (error) {
    console.error('Error creating reminder:', error);
    return NextResponse.json({ error: 'حدث خطأ في إنشاء المنبه' }, { status: 500 });
  }
}

// PUT - تحديث منبه
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      title,
      description,
      type,
      priority,
      reminderDateTime,
      repeatType,
      repeatInterval,
      status,
      snoozedUntil
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف المنبه مطلوب' }, { status: 400 });
    }

    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (priority !== undefined) updateData.priority = priority;
    if (reminderDateTime !== undefined) updateData.reminderDateTime = new Date(reminderDateTime);
    if (repeatType !== undefined) updateData.repeatType = repeatType;
    if (repeatInterval !== undefined) updateData.repeatInterval = repeatInterval;
    if (status !== undefined) updateData.status = status;
    if (snoozedUntil !== undefined) updateData.snoozedUntil = snoozedUntil ? new Date(snoozedUntil) : null;

    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();

      // إذا كان متكرر، إنشاء المنبه القادم
      const existingReminder = await db.reminder.findUnique({ where: { id } });
      if (existingReminder && existingReminder.repeatType !== 'NONE') {
        const nextTime = calculateNextReminder(
          existingReminder.reminderDateTime.toISOString(),
          existingReminder.repeatType,
          existingReminder.repeatInterval
        );
        if (nextTime) {
          updateData.nextReminderAt = nextTime;
          updateData.status = 'PENDING';
          updateData.completedAt = null;
          updateData.reminderDateTime = nextTime;
        }
      }
    }

    const reminder = await db.reminder.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, reminder });
  } catch (error) {
    console.error('Error updating reminder:', error);
    return NextResponse.json({ error: 'حدث خطأ في تحديث المنبه' }, { status: 500 });
  }
}

// DELETE - حذف منبه
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف المنبه مطلوب' }, { status: 400 });
    }

    await db.reminder.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return NextResponse.json({ error: 'حدث خطأ في حذف المنبه' }, { status: 500 });
  }
}

// دالة حساب المنبه القادم
function calculateNextReminder(dateTime: string, repeatType: string, interval?: number | null): Date | null {
  const date = new Date(dateTime);

  switch (repeatType) {
    case 'DAILY':
      date.setDate(date.getDate() + 1);
      return date;
    case 'WEEKLY':
      date.setDate(date.getDate() + 7);
      return date;
    case 'MONTHLY':
      date.setMonth(date.getMonth() + 1);
      return date;
    case 'YEARLY':
      date.setFullYear(date.getFullYear() + 1);
      return date;
    case 'CUSTOM':
      if (interval) {
        date.setDate(date.getDate() + interval);
        return date;
      }
      return null;
    default:
      return null;
  }
}
