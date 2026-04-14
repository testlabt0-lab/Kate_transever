import { db } from './db';
import { Action } from '@prisma/client';

interface LogActivityParams {
  action: Action;
  entityType: string;
  entityId: string;
  description: string;
  oldData?: object | null;
  newData?: object | null;
  userId: string;
}

/**
 * تسجيل نشاط في سجل النشاطات
 * Logs an activity to the activity log
 */
export async function logActivity({
  action,
  entityType,
  entityId,
  description,
  oldData,
  newData,
  userId,
}: LogActivityParams): Promise<void> {
  try {
    await db.activityLog.create({
      data: {
        action,
        entityType,
        entityId,
        description,
        oldData: oldData ? JSON.stringify(oldData) : null,
        newData: newData ? JSON.stringify(newData) : null,
        userId,
      },
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    // لا نريد إيقاف العملية إذا فشل تسجيل النشاط
    // We don't want to stop the process if logging fails
  }
}

/**
 * الحصول على وصف الإجراء بالعربية
 */
export function getActionLabel(action: Action): string {
  const labels: Record<Action, string> = {
    CREATE: 'إنشاء',
    UPDATE: 'تعديل',
    DELETE: 'حذف',
    CONFIRM: 'تأكيد',
  };
  return labels[action];
}

/**
 * الحصول على وصف نوع الكيان بالعربية
 */
export function getEntityTypeLabel(entityType: string): string {
  const labels: Record<string, string> = {
    farmer: 'مزارع',
    agent: 'وكيل',
    shipment: 'شحنة',
    transporter: 'ناقل',
    khat_type: 'نوع قات',
    user: 'مستخدم',
    expense: 'مصروف',
    payment: 'دفعة',
    transaction: 'معاملة',
  };
  return labels[entityType] || entityType;
}

/**
 * الحصول على لون الإجراء
 */
export function getActionColor(action: Action): string {
  const colors: Record<Action, string> = {
    CREATE: 'emerald',
    UPDATE: 'amber',
    DELETE: 'red',
    CONFIRM: 'blue',
  };
  return colors[action];
}
