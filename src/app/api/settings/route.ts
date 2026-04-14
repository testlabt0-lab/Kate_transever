import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - جلب الإعدادات
export async function GET() {
  try {
    // جلب الإعدادات أو إنشاء إعدادات افتراضية
    let settings = await db.settings.findFirst();

    if (!settings) {
      settings = await db.settings.create({
        data: {
          currency: 'ريال',
          timezone: 'Asia/Aden',
          language: 'ar',
          theme: 'light',
          primaryColor: 'emerald',
          fontSize: 'medium',
          compactMode: false,
          notificationsEnabled: true,
          soundEnabled: true,
          reminderSoundEnabled: true,
          isolatedItemsAlerts: true,
          deliveryReminders: true,
          printAuto: false,
          printShowLogo: true,
          autoSaveShipments: true,
          requireDeliveryConfirm: false,
          autoCalculateFee: true,
          feeRounding: 'none',
          autoBackup: false,
          backupInterval: 7,
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'فشل في تحميل الإعدادات' }, { status: 500 });
  }
}

// PUT - تحديث الإعدادات
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // جلب الإعدادات الحالية
    let settings = await db.settings.findFirst();

    if (!settings) {
      // إنشاء إعدادات جديدة
      settings = await db.settings.create({
        data: {
          ...body,
          id: undefined,
          createdAt: undefined,
          updatedAt: undefined,
        },
      });
    } else {
      // تحديث الإعدادات
      settings = await db.settings.update({
        where: { id: settings.id },
        data: {
          ...body,
          id: undefined,
          createdAt: undefined,
          updatedAt: undefined,
        },
      });
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'فشل في تحديث الإعدادات' }, { status: 500 });
  }
}

// POST - إعادة تعيين الإعدادات
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'reset') {
      // حذف الإعدادات القديمة وإنشاء جديدة
      const existingSettings = await db.settings.findFirst();
      if (existingSettings) {
        await db.settings.delete({ where: { id: existingSettings.id } });
      }

      const settings = await db.settings.create({
        data: {
          currency: 'ريال',
          timezone: 'Asia/Aden',
          language: 'ar',
          theme: 'light',
          primaryColor: 'emerald',
          fontSize: 'medium',
          compactMode: false,
          notificationsEnabled: true,
          soundEnabled: true,
          reminderSoundEnabled: true,
          isolatedItemsAlerts: true,
          deliveryReminders: true,
          printAuto: false,
          printShowLogo: true,
          autoSaveShipments: true,
          requireDeliveryConfirm: false,
          autoCalculateFee: true,
          feeRounding: 'none',
          autoBackup: false,
          backupInterval: 7,
        },
      });

      return NextResponse.json({ success: true, settings, message: 'تم إعادة تعيين الإعدادات' });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error) {
    console.error('Error resetting settings:', error);
    return NextResponse.json({ error: 'فشل في إعادة تعيين الإعدادات' }, { status: 500 });
  }
}
