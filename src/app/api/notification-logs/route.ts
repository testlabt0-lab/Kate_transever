import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - جلب سجل الإشعارات
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const templateId = searchParams.get('templateId');
    const recipient = searchParams.get('recipient');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit');
    const page = searchParams.get('page') || '1';

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (templateId) {
      where.templateId = templateId;
    }

    if (recipient) {
      where.recipient = { contains: recipient };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const pageSize = limit ? parseInt(limit) : 50;
    const skip = (parseInt(page) - 1) * pageSize;

    const [logs, total] = await Promise.all([
      db.notificationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip
      }),
      db.notificationLog.count({ where })
    ]);

    // إحصائيات
    const stats = {
      total,
      sent: await db.notificationLog.count({ where: { status: 'sent' } }),
      failed: await db.notificationLog.count({ where: { status: 'failed' } }),
      pending: await db.notificationLog.count({ where: { status: 'pending' } })
    };

    // تجميع حسب النوع
    const byType = await db.notificationLog.groupBy({
      by: ['type'],
      _count: true
    });

    const typeStats = byType.reduce((acc, item) => {
      acc[item.type] = item._count;
      return acc;
    }, {} as Record<string, number>);

    // تجميع حسب الحالة
    const byStatus = await db.notificationLog.groupBy({
      by: ['status'],
      _count: true
    });

    const statusStats = byStatus.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      logs,
      pagination: {
        page: parseInt(page),
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      },
      stats: {
        ...stats,
        byType: typeStats,
        byStatus: statusStats
      }
    });
  } catch (error) {
    console.error('Error fetching notification logs:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب سجل الإشعارات' }, { status: 500 });
  }
}

// POST - إنشاء سجل إشعار جديد (إرسال إشعار)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, recipient, type, message, variables } = body;

    if (!recipient || !type || !message) {
      return NextResponse.json({ error: 'المستلم والنوع والرسالة مطلوبون' }, { status: 400 });
    }

    const validTypes = ['sms', 'whatsapp', 'email', 'push'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'نوع الإشعار غير صالح. الأنواع المتاحة: sms, whatsapp, email, push' }, { status: 400 });
    }

    // إذا كان هناك قالب، التحقق من وجوده
    let template = null;
    if (templateId) {
      template = await db.notificationTemplate.findUnique({
        where: { id: templateId }
      });

      if (!template) {
        return NextResponse.json({ error: 'القالب المحدد غير موجود' }, { status: 404 });
      }
    }

    // معالجة المتغيرات في الرسالة
    let processedMessage = message;
    if (variables && typeof variables === 'object') {
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        processedMessage = processedMessage.replace(regex, variables[key]);
      });
    }

    // إنشاء سجل الإشعار
    const log = await db.notificationLog.create({
      data: {
        templateId: templateId || null,
        recipient,
        type,
        status: 'pending',
        message: processedMessage
      }
    });

    // محاكاة إرسال الإشعار
    // في بيئة حقيقية، سيتم الاتصال بخدمة الإرسال المناسبة
    try {
      // محاكاة نجاح الإرسال
      const updatedLog = await db.notificationLog.update({
        where: { id: log.id },
        data: {
          status: 'sent'
        }
      });

      return NextResponse.json({
        success: true,
        log: updatedLog,
        message: 'تم إرسال الإشعار بنجاح'
      });
    } catch (sendError) {
      // تسجيل فشل الإرسال
      const failedLog = await db.notificationLog.update({
        where: { id: log.id },
        data: {
          status: 'failed',
          error: sendError instanceof Error ? sendError.message : 'خطأ في الإرسال'
        }
      });

      return NextResponse.json({
        error: 'فشل في إرسال الإشعار',
        log: failedLog
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating notification log:', error);
    return NextResponse.json({ error: 'حدث خطأ في إنشاء سجل الإشعار' }, { status: 500 });
  }
}
