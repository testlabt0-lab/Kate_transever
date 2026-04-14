import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - جلب الأدوار المخصصة
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const name = searchParams.get('name');
    const isDefault = searchParams.get('isDefault');

    const where: any = {};

    if (id) {
      where.id = id;
    }

    if (name) {
      where.name = {
        contains: name,
      };
    }

    if (isDefault !== null) {
      where.isDefault = isDefault === 'true';
    }

    const roles = await db.customRole.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // تحويل صلاحيات JSON إلى كائن
    const rolesWithParsedPermissions = roles.map((role) => ({
      ...role,
      permissions: JSON.parse(role.permissions),
    }));

    return NextResponse.json({
      success: true,
      data: rolesWithParsedPermissions,
    });
  } catch (error) {
    console.error('خطأ في جلب الأدوار:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ أثناء جلب الأدوار',
      },
      { status: 500 }
    );
  }
}

// POST - إنشاء دور جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, permissions, isDefault } = body;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: 'اسم الدور مطلوب',
        },
        { status: 400 }
      );
    }

    if (!permissions) {
      return NextResponse.json(
        {
          success: false,
          error: 'الصلاحيات مطلوبة',
        },
        { status: 400 }
      );
    }

    // التحقق من عدم وجود دور بنفس الاسم
    const existingRole = await db.customRole.findUnique({
      where: { name },
    });

    if (existingRole) {
      return NextResponse.json(
        {
          success: false,
          error: 'يوجد دور بهذا الاسم بالفعل',
        },
        { status: 400 }
      );
    }

    // إذا كان الدور افتراضي، إزالة الافتراضية من الأدوار الأخرى
    if (isDefault) {
      await db.customRole.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const role = await db.customRole.create({
      data: {
        name,
        description,
        permissions: JSON.stringify(permissions),
        isDefault: isDefault || false,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...role,
        permissions: JSON.parse(role.permissions),
      },
      message: 'تم إنشاء الدور بنجاح',
    });
  } catch (error) {
    console.error('خطأ في إنشاء الدور:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ أثناء إنشاء الدور',
      },
      { status: 500 }
    );
  }
}

// PUT - تحديث دور
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, permissions, isDefault } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'معرف الدور مطلوب',
        },
        { status: 400 }
      );
    }

    // التحقق من وجود الدور
    const existingRole = await db.customRole.findUnique({
      where: { id },
    });

    if (!existingRole) {
      return NextResponse.json(
        {
          success: false,
          error: 'الدور غير موجود',
        },
        { status: 404 }
      );
    }

    // التحقق من عدم وجود دور آخر بنفس الاسم
    if (name && name !== existingRole.name) {
      const roleWithSameName = await db.customRole.findUnique({
        where: { name },
      });

      if (roleWithSameName) {
        return NextResponse.json(
          {
            success: false,
            error: 'يوجد دور آخر بهذا الاسم بالفعل',
          },
          { status: 400 }
        );
      }
    }

    // إذا كان الدور سيصبح افتراضي، إزالة الافتراضية من الأدوار الأخرى
    if (isDefault) {
      await db.customRole.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updateData: any = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (permissions !== undefined) {
      updateData.permissions = JSON.stringify(permissions);
    }

    if (isDefault !== undefined) {
      updateData.isDefault = isDefault;
    }

    const role = await db.customRole.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...role,
        permissions: JSON.parse(role.permissions),
      },
      message: 'تم تحديث الدور بنجاح',
    });
  } catch (error) {
    console.error('خطأ في تحديث الدور:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ أثناء تحديث الدور',
      },
      { status: 500 }
    );
  }
}

// DELETE - حذف دور
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'معرف الدور مطلوب',
        },
        { status: 400 }
      );
    }

    // التحقق من وجود الدور
    const existingRole = await db.customRole.findUnique({
      where: { id },
    });

    if (!existingRole) {
      return NextResponse.json(
        {
          success: false,
          error: 'الدور غير موجود',
        },
        { status: 404 }
      );
    }

    // منع حذف الدور الافتراضي
    if (existingRole.isDefault) {
      return NextResponse.json(
        {
          success: false,
          error: 'لا يمكن حذف الدور الافتراضي',
        },
        { status: 400 }
      );
    }

    await db.customRole.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'تم حذف الدور بنجاح',
    });
  } catch (error) {
    console.error('خطأ في حذف الدور:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ أثناء حذف الدور',
      },
      { status: 500 }
    );
  }
}
