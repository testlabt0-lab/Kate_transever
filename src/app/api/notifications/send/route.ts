import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ==================== Types ====================

interface SendNotificationRequest {
  type: 'sms' | 'whatsapp' | 'in_app' | 'sound';
  recipient?: string; // رقم الهاتف أو معرف المستخدم
  title?: string;
  message: string;
  templateId?: string;
  variables?: Record<string, string>; // متغيرات القالب
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  soundType?: 'default' | 'urgent' | 'timer' | 'reminder' | 'success';
  userId?: string;
}

// ==================== Helper Functions ====================

// استبدال المتغيرات في القالب
function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  });
  return result;
}

// تنسيق رقم الهاتف
function formatPhoneNumber(phone: string): string {
  // إزالة المسافات والشرطات
  let formatted = phone.replace(/[\s-]/g, '');

  // إضافة رمز الدولة إذا لم يكن موجوداً
  if (formatted.startsWith('0')) {
    formatted = '967' + formatted.substring(1);
  } else if (!formatted.startsWith('967') && !formatted.startsWith('+')) {
    formatted = '967' + formatted;
  }

  return formatted;
}

// ==================== SMS Handler ====================

async function sendSMS(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    // في الإنتاج، يمكنك استخدام خدمة SMS خارجية مثل Twilio أو SMS.ae
    // هنا نستخدم z-ai-web-dev-sdk للإرسال (إذا كان يدعم) أو نحاكي الإرسال

    console.log(`[SMS] Sending to ${phone}: ${message}`);

    // محاكاة نجاح الإرسال (في الإنتاج استبدل هذا بخدمة حقيقية)
    return { success: true };
  } catch (error) {
    console.error('SMS Error:', error);
    return { success: false, error: 'فشل في إرسال الرسالة' };
  }
}

// ==================== WhatsApp Handler ====================

async function sendWhatsApp(phone: string, message: string): Promise<{ success: boolean; error?: string; url?: string }> {
  try {
    const formattedPhone = formatPhoneNumber(phone);

    // إنشاء رابط واتساب
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

    console.log(`[WhatsApp] Generated link for ${formattedPhone}`);

    return {
      success: true,
      url: whatsappUrl
    };
  } catch (error) {
    console.error('WhatsApp Error:', error);
    return { success: false, error: 'فشل في إنشاء رابط واتساب' };
  }
}

// ==================== In-App Notification Handler ====================

async function sendInAppNotification(
  userId: string | undefined,
  title: string,
  message: string,
  priority: string,
  entityType?: string,
  entityId?: string,
  actionUrl?: string
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  try {
    const notification = await db.notification.create({
      data: {
        title,
        message,
        type: 'SYSTEM',
        priority: priority as any,
        entityType,
        entityId,
        actionUrl,
        sentAt: new Date(),
      },
    });

    console.log(`[In-App] Created notification ${notification.id}`);

    return {
      success: true,
      notificationId: notification.id
    };
  } catch (error) {
    console.error('In-App Notification Error:', error);
    return { success: false, error: 'فشل في إنشاء الإشعار' };
  }
}

// ==================== Sound Handler ====================

async function playSound(
  soundType: string,
  userId?: string
): Promise<{ success: boolean; soundUrl?: string; error?: string }> {
  try {
    const soundFiles: Record<string, string> = {
      default: '/sounds/notification.mp3',
      urgent: '/sounds/urgent.mp3',
      timer: '/sounds/timer.mp3',
      reminder: '/sounds/reminder.mp3',
      success: '/sounds/success.mp3',
    };

    const soundUrl = soundFiles[soundType] || soundFiles.default;

    // تسجيل الإشعار الصوتي
    if (userId) {
      await db.notificationLog.create({
        data: {
          recipient: userId,
          type: 'sound',
          status: 'sent',
          message: `تشغيل صوت: ${soundType}`,
        },
      });
    }

    console.log(`[Sound] Playing ${soundType} sound`);

    return {
      success: true,
      soundUrl
    };
  } catch (error) {
    console.error('Sound Error:', error);
    return { success: false, error: 'فشل في تشغيل الصوت' };
  }
}

// ==================== Main API Route ====================

// POST - إرسال إشعار
export async function POST(request: NextRequest) {
  try {
    const body: SendNotificationRequest = await request.json();
    const {
      type,
      recipient,
      title,
      message,
      templateId,
      variables,
      priority = 'NORMAL',
      entityType,
      entityId,
      actionUrl,
      soundType = 'default',
      userId,
    } = body;

    // التحقق من البيانات الأساسية
    if (!type) {
      return NextResponse.json({ error: 'نوع الإشعار مطلوب' }, { status: 400 });
    }

    let finalMessage = message;
    let finalTitle = title || 'إشعار';

    // استخدام القالب إذا كان محدداً
    if (templateId) {
      const template = await db.notificationTemplate.findUnique({
        where: { id: templateId },
      });

      if (template) {
        finalTitle = template.title;
        finalMessage = template.body;

        // استبدال المتغيرات
        if (variables) {
          finalTitle = replaceVariables(finalTitle, variables);
          finalMessage = replaceVariables(finalMessage, variables);
        }
      }
    }

    let result: any = { success: false };

    switch (type) {
      case 'sms':
        if (!recipient) {
          return NextResponse.json({ error: 'رقم الهاتف مطلوب لإرسال SMS' }, { status: 400 });
        }
        if (!finalMessage) {
          return NextResponse.json({ error: 'الرسالة مطلوبة' }, { status: 400 });
        }
        result = await sendSMS(recipient, finalMessage);
        break;

      case 'whatsapp':
        if (!recipient) {
          return NextResponse.json({ error: 'رقم الهاتف مطلوب لإرسال واتساب' }, { status: 400 });
        }
        if (!finalMessage) {
          return NextResponse.json({ error: 'الرسالة مطلوبة' }, { status: 400 });
        }
        result = await sendWhatsApp(recipient, finalMessage);
        break;

      case 'in_app':
        if (!finalMessage) {
          return NextResponse.json({ error: 'الرسالة مطلوبة' }, { status: 400 });
        }
        result = await sendInAppNotification(
          userId,
          finalTitle,
          finalMessage,
          priority,
          entityType,
          entityId,
          actionUrl
        );
        break;

      case 'sound':
        result = await playSound(soundType, userId);
        break;

      default:
        return NextResponse.json({ error: 'نوع الإشعار غير معروف' }, { status: 400 });
    }

    // تسجيل في سجل الإشعارات
    await db.notificationLog.create({
      data: {
        templateId,
        recipient: recipient || userId || 'unknown',
        type,
        status: result.success ? 'sent' : 'failed',
        message: finalMessage,
        error: result.error || null,
      },
    });

    return NextResponse.json({
      success: result.success,
      data: result,
      message: result.success
        ? 'تم إرسال الإشعار بنجاح'
        : `فشل في الإرسال: ${result.error}`,
    });

  } catch (error) {
    console.error('Send Notification Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في إرسال الإشعار' }, { status: 500 });
  }
}

// GET - الحصول على أصوات التنبيه المتاحة
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'sounds') {
      // قائمة الأصوات المتاحة
      const sounds = [
        { id: 'default', name: 'الافتراضي', url: '/sounds/notification.mp3' },
        { id: 'urgent', name: 'عاجل', url: '/sounds/urgent.mp3' },
        { id: 'timer', name: 'مؤقت', url: '/sounds/timer.mp3' },
        { id: 'reminder', name: 'تذكير', url: '/sounds/reminder.mp3' },
        { id: 'success', name: 'نجاح', url: '/sounds/success.mp3' },
      ];

      return NextResponse.json({ sounds });
    }

    if (action === 'logs') {
      // جلب سجل الإشعارات
      const limit = parseInt(searchParams.get('limit') || '50');
      const type = searchParams.get('type');

      const where: any = {};
      if (type) where.type = type;

      const logs = await db.notificationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return NextResponse.json({ logs });
    }

    // إحصائيات الإشعارات
    const stats = {
      total: await db.notificationLog.count(),
      sent: await db.notificationLog.count({ where: { status: 'sent' } }),
      failed: await db.notificationLog.count({ where: { status: 'failed' } }),
      byType: {
        sms: await db.notificationLog.count({ where: { type: 'sms' } }),
        whatsapp: await db.notificationLog.count({ where: { type: 'whatsapp' } }),
        in_app: await db.notificationLog.count({ where: { type: 'in_app' } }),
        sound: await db.notificationLog.count({ where: { type: 'sound' } }),
      },
    };

    return NextResponse.json({ stats });

  } catch (error) {
    console.error('Get Notification Info Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب المعلومات' }, { status: 500 });
  }
}
