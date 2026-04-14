import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ==================== Types ====================

interface ScheduledNotification {
  id: string;
  type: 'timer' | 'reminder' | 'template';
  entityId: string;
  scheduledFor: Date;
  data: any;
  status: 'pending' | 'sent' | 'failed';
}

// ==================== Helper Functions ====================

// حساب الوقت التالي للتكرار
function calculateNextOccurrence(
  currentDate: Date,
  repeatType: string,
  interval?: number | null
): Date | null {
  const next = new Date(currentDate);

  switch (repeatType) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      return next;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      return next;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      return next;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1);
      return next;
    case 'CUSTOM':
      if (interval) {
        next.setDate(next.getDate() + interval);
        return next;
      }
      return null;
    default:
      return null;
  }
}

// إرسال إشعار للمنبه
async function processReminderNotification(reminder: any): Promise<{ success: boolean; error?: string }> {
  try {
    // إنشاء إشعار في التطبيق
    await db.notification.create({
      data: {
        title: reminder.title,
        message: reminder.description || 'لديك تذكير',
        type: 'REMINDER',
        priority: reminder.priority,
        entityType: 'reminder',
        entityId: reminder.id,
        sentAt: new Date(),
      },
    });

    // تسجيل الإشعار
    await db.notificationLog.create({
      data: {
        recipient: 'system',
        type: 'in_app',
        status: 'sent',
        message: `تذكير: ${reminder.title}`,
      },
    });

    // تحديث حالة المنبه
    await db.reminder.update({
      where: { id: reminder.id },
      data: {
        notified: true,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // إذا كان متكرر، إنشاء المنبه التالي
    if (reminder.repeatType !== 'NONE') {
      const nextTime = calculateNextOccurrence(
        reminder.reminderDateTime,
        reminder.repeatType,
        reminder.repeatInterval
      );

      if (nextTime) {
        await db.reminder.update({
          where: { id: reminder.id },
          data: {
            status: 'PENDING',
            notified: false,
            completedAt: null,
            reminderDateTime: nextTime,
            nextReminderAt: calculateNextOccurrence(nextTime, reminder.repeatType, reminder.repeatInterval),
          },
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Reminder Processing Error:', error);
    return { success: false, error: 'فشل في معالجة التذكير' };
  }
}

// إرسال إشعار للمؤقت
async function processTimerNotification(timer: any): Promise<{ success: boolean; error?: string }> {
  try {
    // إنشاء إشعار في التطبيق
    await db.notification.create({
      data: {
        title: 'انتهى المؤقت!',
        message: timer.title,
        type: 'TIMER',
        priority: 'HIGH',
        entityType: 'timer',
        entityId: timer.id,
        sentAt: new Date(),
      },
    });

    // تسجيل الإشعار
    await db.notificationLog.create({
      data: {
        recipient: 'system',
        type: 'sound',
        status: 'sent',
        message: `مؤقت: ${timer.title}`,
      },
    });

    // تحديث حالة المؤقت
    await db.deliveryTimer.update({
      where: { id: timer.id },
      data: {
        notified: true,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Timer Processing Error:', error);
    return { success: false, error: 'فشل في معالجة المؤقت' };
  }
}

// معالجة العناصر المحايدة
async function processIsolatedItemNotifications(): Promise<{ processed: number; errors: string[] }> {
  try {
    const now = new Date();

    // جلب العناصر المحايدة مع التذكيرات النشطة
    const isolatedReminders = await db.isolatedItemReminder.findMany({
      where: {
        isActive: true,
        remindAt: { lte: now },
      },
      include: {
        shipmentItem: {
          include: {
            shipment: true,
            farmer: true,
            agent: true,
          },
        },
      },
    });

    const errors: string[] = [];
    let processed = 0;

    for (const reminder of isolatedReminders) {
      try {
        // إنشاء إشعار
        await db.notification.create({
          data: {
            title: 'عنصر محايد يحتاج اهتمام!',
            message: `العنصر من ${reminder.shipmentItem.farmer?.name || 'غير معروف'} إلى ${reminder.shipmentItem.agent?.name || 'غير معروف'}`,
            type: 'ISOLATED_ITEM',
            priority: 'HIGH',
            entityType: 'shipmentItem',
            entityId: reminder.shipmentItemId,
            sentAt: new Date(),
          },
        });

        // تحديث التذكير التالي
        const nextRemindAt = new Date(now);
        nextRemindAt.setHours(nextRemindAt.getHours() + reminder.intervalHours);

        await db.isolatedItemReminder.update({
          where: { id: reminder.id },
          data: {
            remindAt: nextRemindAt,
            reminderCount: { increment: 1 },
            lastRemindedAt: now,
          },
        });

        processed++;
      } catch (error) {
        errors.push(`فشل في معالجة التذكير ${reminder.id}`);
      }
    }

    return { processed, errors };
  } catch (error) {
    console.error('Isolated Items Processing Error:', error);
    return { processed: 0, errors: ['فشل في معالجة العناصر المحايدة'] };
  }
}

// ==================== API Routes ====================

// GET - جلب التنبيهات المجدولة
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const check = searchParams.get('check'); // للتحقق من التنبيهات المستحقة

    // التحقق من التنبيهات المستحقة (يُستدعى من cron job أو polling)
    if (check === 'due') {
      const now = new Date();
      const results = {
        reminders: { total: 0, processed: 0, errors: [] as string[] },
        timers: { total: 0, processed: 0, errors: [] as string[] },
        isolatedItems: { total: 0, processed: 0, errors: [] as string[] },
      };

      // جلب التذكيرات المستحقة
      const dueReminders = await db.reminder.findMany({
        where: {
          status: 'PENDING',
          notified: false,
          reminderDateTime: { lte: now },
        },
      });

      results.reminders.total = dueReminders.length;

      for (const reminder of dueReminders) {
        const result = await processReminderNotification(reminder);
        if (result.success) {
          results.reminders.processed++;
        } else if (result.error) {
          results.reminders.errors.push(result.error);
        }
      }

      // جلب المؤقتات المنتهية
      const expiredTimers = await db.deliveryTimer.findMany({
        where: {
          status: 'ACTIVE',
          notified: false,
          targetDateTime: { lte: now },
        },
      });

      results.timers.total = expiredTimers.length;

      for (const timer of expiredTimers) {
        const result = await processTimerNotification(timer);
        if (result.success) {
          results.timers.processed++;
        } else if (result.error) {
          results.timers.errors.push(result.error);
        }
      }

      // معالجة العناصر المحايدة
      const isolatedResult = await processIsolatedItemNotifications();
      results.isolatedItems.total = isolatedResult.processed;
      results.isolatedItems.processed = isolatedResult.processed;
      results.isolatedItems.errors = isolatedResult.errors;

      return NextResponse.json({
        success: true,
        timestamp: now.toISOString(),
        results,
      });
    }

    // جلب الإشعارات المجدولة
    if (action === 'list') {
      const scheduledNotifications = await db.notification.findMany({
        where: {
          scheduledFor: { gte: new Date() },
          sentAt: null,
        },
        orderBy: { scheduledFor: 'asc' },
        take: 50,
      });

      return NextResponse.json({
        scheduled: scheduledNotifications,
        total: scheduledNotifications.length,
      });
    }

    // جلب التذكيرات القادمة
    if (action === 'upcoming') {
      const hours = parseInt(searchParams.get('hours') || '24');
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() + hours);

      const upcomingReminders = await db.reminder.findMany({
        where: {
          status: 'PENDING',
          reminderDateTime: {
            gte: new Date(),
            lte: cutoff,
          },
        },
        orderBy: { reminderDateTime: 'asc' },
      });

      const upcomingTimers = await db.deliveryTimer.findMany({
        where: {
          status: 'ACTIVE',
          targetDateTime: {
            gte: new Date(),
            lte: cutoff,
          },
        },
        include: {
          agent: { select: { name: true } },
        },
        orderBy: { targetDateTime: 'asc' },
      });

      return NextResponse.json({
        reminders: upcomingReminders,
        timers: upcomingTimers,
        timeRange: `${hours} ساعة`,
      });
    }

    // إحصائيات
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const stats = {
      pendingReminders: await db.reminder.count({
        where: { status: 'PENDING' },
      }),
      activeTimers: await db.deliveryTimer.count({
        where: { status: 'ACTIVE' },
      }),
      todayReminders: await db.reminder.count({
        where: {
          status: 'PENDING',
          reminderDateTime: { gte: todayStart, lte: todayEnd },
        },
      }),
      overdueReminders: await db.reminder.count({
        where: {
          status: 'PENDING',
          reminderDateTime: { lt: now },
        },
      }),
      isolatedItems: await db.isolatedItemReminder.count({
        where: { isActive: true },
      }),
      scheduledNotifications: await db.notification.count({
        where: {
          scheduledFor: { gte: now },
          sentAt: null,
        },
      }),
    };

    return NextResponse.json({ stats });

  } catch (error) {
    console.error('Scheduled Notifications Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب التنبيهات المجدولة' }, { status: 500 });
  }
}

// POST - إنشاء إشعار مجدول جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      message,
      type,
      priority,
      scheduledFor,
      entityType,
      entityId,
      actionUrl,
    } = body;

    if (!title || !message || !scheduledFor) {
      return NextResponse.json({ error: 'العنوان والرسالة ووقت الجدولة مطلوبة' }, { status: 400 });
    }

    const notification = await db.notification.create({
      data: {
        title,
        message,
        type: type || 'SYSTEM',
        priority: priority || 'NORMAL',
        scheduledFor: new Date(scheduledFor),
        entityType,
        entityId,
        actionUrl,
      },
    });

    return NextResponse.json({
      success: true,
      notification,
      message: 'تم جدولة الإشعار بنجاح',
    });

  } catch (error) {
    console.error('Create Scheduled Notification Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في إنشاء الإشعار المجدول' }, { status: 500 });
  }
}

// PUT - تحديث إشعار مجدول
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, scheduledFor, title, message, priority, cancelled } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف الإشعار مطلوب' }, { status: 400 });
    }

    const existingNotification = await db.notification.findUnique({
      where: { id },
    });

    if (!existingNotification) {
      return NextResponse.json({ error: 'الإشعار غير موجود' }, { status: 404 });
    }

    if (existingNotification.sentAt) {
      return NextResponse.json({ error: 'لا يمكن تعديل إشعار تم إرساله' }, { status: 400 });
    }

    const updateData: any = {};

    if (scheduledFor) updateData.scheduledFor = new Date(scheduledFor);
    if (title) updateData.title = title;
    if (message) updateData.message = message;
    if (priority) updateData.priority = priority;

    // إلغاء الإشعار
    if (cancelled) {
      updateData.isDismissed = true;
      updateData.dismissedAt = new Date();
    }

    const notification = await db.notification.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      notification,
      message: cancelled ? 'تم إلغاء الإشعار' : 'تم تحديث الإشعار',
    });

  } catch (error) {
    console.error('Update Scheduled Notification Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في تحديث الإشعار المجدول' }, { status: 500 });
  }
}

// DELETE - حذف إشعار مجدول
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف الإشعار مطلوب' }, { status: 400 });
    }

    const existingNotification = await db.notification.findUnique({
      where: { id },
    });

    if (!existingNotification) {
      return NextResponse.json({ error: 'الإشعار غير موجود' }, { status: 404 });
    }

    if (existingNotification.sentAt) {
      return NextResponse.json({ error: 'لا يمكن حذف إشعار تم إرساله' }, { status: 400 });
    }

    await db.notification.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'تم حذف الإشعار المجدول',
    });

  } catch (error) {
    console.error('Delete Scheduled Notification Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في حذف الإشعار المجدول' }, { status: 500 });
  }
}
