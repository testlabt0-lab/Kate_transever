import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - جلب جميع النسخ الاحتياطية
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = searchParams.get('limit');

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const backups = await db.backup.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : undefined
    });

    // إحصائيات
    const stats = {
      total: await db.backup.count(),
      completed: await db.backup.count({ where: { status: 'COMPLETED' } }),
      pending: await db.backup.count({ where: { status: 'PENDING' } }),
      running: await db.backup.count({ where: { status: 'RUNNING' } }),
      failed: await db.backup.count({ where: { status: 'FAILED' } }),
      totalSize: backups.reduce((sum, b) => sum + b.size, 0)
    };

    // تجميع حسب النوع
    const byType = {
      FULL: await db.backup.count({ where: { type: 'FULL' } }),
      PARTIAL: await db.backup.count({ where: { type: 'PARTIAL' } }),
      DATA_ONLY: await db.backup.count({ where: { type: 'DATA_ONLY' } })
    };

    return NextResponse.json({
      backups,
      stats,
      byType
    });
  } catch (error) {
    console.error('Error fetching backups:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب النسخ الاحتياطية' }, { status: 500 });
  }
}

// POST - إنشاء نسخة احتياطية جديدة
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, notes } = body;

    if (!type) {
      return NextResponse.json({ error: 'نوع النسخة الاحتياطية مطلوب' }, { status: 400 });
    }

    const validTypes = ['FULL', 'PARTIAL', 'DATA_ONLY'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'نوع النسخة الاحتياطية غير صالح' }, { status: 400 });
    }

    // إنشاء سجل النسخة الاحتياطية
    const backup = await db.backup.create({
      data: {
        type,
        status: 'PENDING',
        notes: notes || null
      }
    });

    // محاكاة عملية النسخ الاحتياطي
    // في بيئة حقيقية، سيتم تنفيذ عملية النسخ الاحتياطي هنا
    try {
      // تحديث الحالة إلى جاري
      await db.backup.update({
        where: { id: backup.id },
        data: { status: 'RUNNING' }
      });

      // محاكاة حجم الملف (في بيئة حقيقية سيكون الحجم الفعلي)
      const simulatedSize = Math.floor(Math.random() * 10000000) + 1000000; // بين 1-10 MB

      // تحديث الحالة إلى مكتمل
      const completedBackup = await db.backup.update({
        where: { id: backup.id },
        data: {
          status: 'COMPLETED',
          size: simulatedSize,
          path: `/backups/backup_${backup.id}_${Date.now()}.db`,
          completedAt: new Date()
        }
      });

      // تحديث تاريخ آخر نسخة احتياطية في الإعدادات
      await db.settings.updateMany({
        where: {},
        data: { lastBackupAt: new Date() }
      });

      return NextResponse.json({
        success: true,
        backup: completedBackup,
        message: 'تم إنشاء النسخة الاحتياطية بنجاح'
      });
    } catch (backupError) {
      // تسجيل الخطأ
      await db.backup.update({
        where: { id: backup.id },
        data: {
          status: 'FAILED',
          error: backupError instanceof Error ? backupError.message : 'خطأ غير معروف'
        }
      });

      return NextResponse.json({
        error: 'فشل في إنشاء النسخة الاحتياطية',
        details: backupError instanceof Error ? backupError.message : 'خطأ غير معروف'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating backup:', error);
    return NextResponse.json({ error: 'حدث خطأ في إنشاء النسخة الاحتياطية' }, { status: 500 });
  }
}
