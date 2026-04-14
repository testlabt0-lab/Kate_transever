import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - جلب صلاحيات المستخدمين
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const permission = searchParams.get('permission');
    const granted = searchParams.get('granted');

    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (permission) {
      where.permission = {
        contains: permission,
      };
    }

    if (granted !== null) {
      where.granted = granted === 'true';
    }

    const permissions = await db.userPermission.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    console.error('خطأ في جلب الصلاحيات:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ أثناء جلب الصلاحيات',
      },
      { status: 500 }
    );
  }
}

// POST - إضافة أو تحديث صلاحية
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, permission, granted } = body;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'معرف المستخدم مطلوب',
        },
        { status: 400 }
      );
    }

    if (!permission) {
      return NextResponse.json(
        {
          success: false,
          error: 'اسم الصلاحية مطلوب',
        },
        { status: 400 }
      );
    }

    // التحقق من وجود المستخدم
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'المستخدم غير موجود',
        },
        { status: 404 }
      );
    }

    // التحقق من وجود الصلاحية مسبقاً
    const existingPermission = await db.userPermission.findUnique({
      where: {
        userId_permission: {
          userId,
          permission,
        },
      },
    });

    let userPermission;

    if (existingPermission) {
      // تحديث الصلاحية الموجودة
      userPermission = await db.userPermission.update({
        where: {
          id: existingPermission.id,
        },
        data: {
          granted: granted !== undefined ? granted : true,
        },
      });
    } else {
      // إنشاء صلاحية جديدة
      userPermission = await db.userPermission.create({
        data: {
          userId,
          permission,
          granted: granted !== undefined ? granted : true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: userPermission,
      message: existingPermission ? 'تم تحديث الصلاحية بنجاح' : 'تم إضافة الصلاحية بنجاح',
    });
  } catch (error) {
    console.error('خطأ في إضافة/تحديث الصلاحية:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ أثناء إضافة/تحديث الصلاحية',
      },
      { status: 500 }
    );
  }
}

// PUT - تحديث صلاحية
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, granted } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'معرف الصلاحية مطلوب',
        },
        { status: 400 }
      );
    }

    // التحقق من وجود الصلاحية
    const existingPermission = await db.userPermission.findUnique({
      where: { id },
    });

    if (!existingPermission) {
      return NextResponse.json(
        {
          success: false,
          error: 'الصلاحية غير موجودة',
        },
        { status: 404 }
      );
    }

    const userPermission = await db.userPermission.update({
      where: { id },
      data: {
        granted: granted !== undefined ? granted : existingPermission.granted,
      },
    });

    return NextResponse.json({
      success: true,
      data: userPermission,
      message: 'تم تحديث الصلاحية بنجاح',
    });
  } catch (error) {
    console.error('خطأ في تحديث الصلاحية:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ أثناء تحديث الصلاحية',
      },
      { status: 500 }
    );
  }
}

// DELETE - حذف صلاحية
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'معرف الصلاحية مطلوب',
        },
        { status: 400 }
      );
    }

    // التحقق من وجود الصلاحية
    const existingPermission = await db.userPermission.findUnique({
      where: { id },
    });

    if (!existingPermission) {
      return NextResponse.json(
        {
          success: false,
          error: 'الصلاحية غير موجودة',
        },
        { status: 404 }
      );
    }

    await db.userPermission.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'تم حذف الصلاحية بنجاح',
    });
  } catch (error) {
    console.error('خطأ في حذف الصلاحية:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ أثناء حذف الصلاحية',
      },
      { status: 500 }
    );
  }
}
