import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AttendanceStatus } from '@prisma/client';

// GET - جلب سجلات الحضور
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status') as AttendanceStatus | null;

    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (date) {
      const dateObj = new Date(date);
      const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0));
      const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999));
      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (status) {
      where.status = status;
    }

    const attendance = await db.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    console.error('خطأ في جلب سجلات الحضور:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ أثناء جلب سجلات الحضور',
      },
      { status: 500 }
    );
  }
}

// POST - تسجيل حضور جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, date, checkIn, checkOut, status, notes, checkInLocation, checkOutLocation } = body;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'معرف المستخدم مطلوب',
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

    // تحديد التاريخ
    const attendanceDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(attendanceDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(attendanceDate);
    endOfDay.setHours(23, 59, 59, 999);

    // التحقق من عدم وجود سجل حضور لنفس اليوم
    const existingAttendance = await db.attendance.findFirst({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (existingAttendance) {
      return NextResponse.json(
        {
          success: false,
          error: 'يوجد سجل حضور لهذا المستخدم في هذا اليوم بالفعل',
          data: existingAttendance,
        },
        { status: 400 }
      );
    }

    const attendance = await db.attendance.create({
      data: {
        userId,
        date: attendanceDate,
        checkIn: checkIn ? new Date(checkIn) : new Date(),
        checkOut: checkOut ? new Date(checkOut) : null,
        status: status || AttendanceStatus.PRESENT,
        notes,
        checkInLocation,
        checkOutLocation,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: attendance,
      message: 'تم تسجيل الحضور بنجاح',
    });
  } catch (error) {
    console.error('خطأ في تسجيل الحضور:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ أثناء تسجيل الحضور',
      },
      { status: 500 }
    );
  }
}

// PUT - تحديث سجل الحضور
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, checkIn, checkOut, status, notes, checkInLocation, checkOutLocation } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'معرف سجل الحضور مطلوب',
        },
        { status: 400 }
      );
    }

    // التحقق من وجود السجل
    const existingAttendance = await db.attendance.findUnique({
      where: { id },
    });

    if (!existingAttendance) {
      return NextResponse.json(
        {
          success: false,
          error: 'سجل الحضور غير موجود',
        },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (checkIn !== undefined) {
      updateData.checkIn = checkIn ? new Date(checkIn) : null;
    }

    if (checkOut !== undefined) {
      updateData.checkOut = checkOut ? new Date(checkOut) : null;
    }

    if (status !== undefined) {
      updateData.status = status;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (checkInLocation !== undefined) {
      updateData.checkInLocation = checkInLocation;
    }

    if (checkOutLocation !== undefined) {
      updateData.checkOutLocation = checkOutLocation;
    }

    const attendance = await db.attendance.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: attendance,
      message: 'تم تحديث سجل الحضور بنجاح',
    });
  } catch (error) {
    console.error('خطأ في تحديث سجل الحضور:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ أثناء تحديث سجل الحضور',
      },
      { status: 500 }
    );
  }
}
