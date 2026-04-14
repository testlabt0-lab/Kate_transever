import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// أنواع البيانات
interface FeeSplitInput {
  shipmentItemId: string;
  totalFee: number;
  driverFee: number;
  companyFee: number;
  agentFee: number;
  otherFee?: number;
  notes?: string;
}

interface UpdateFeeSplitBody {
  id: string;
  totalFee?: number;
  driverFee?: number;
  companyFee?: number;
  agentFee?: number;
  otherFee?: number;
  notes?: string;
}

interface GetFeeSplitsQuery {
  shipmentItemId?: string;
  fromDate?: string;
  toDate?: string;
}

// GET - جلب جميع تقسيمات الأجرة
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const query: GetFeeSplitsQuery = {
      shipmentItemId: searchParams.get('shipmentItemId') || undefined,
      fromDate: searchParams.get('fromDate') || undefined,
      toDate: searchParams.get('toDate') || undefined,
    };

    const where: Prisma.FeeSplitWhereInput = {};

    if (query.shipmentItemId) {
      where.shipmentItemId = query.shipmentItemId;
    }

    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) {
        where.createdAt.gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        where.createdAt.lte = new Date(query.toDate);
      }
    }

    const feeSplits = await db.feeSplit.findMany({
      where,
      include: {
        shipmentItem: {
          include: {
            shipment: {
              select: {
                id: true,
                date: true,
                weekDay: true,
              },
            },
            farmer: {
              select: {
                id: true,
                name: true,
              },
            },
            agent: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // حساب الإحصائيات
    const stats = {
      totalSplits: feeSplits.length,
      totalFee: feeSplits.reduce((sum, split) => sum + split.totalFee, 0),
      totalDriverFee: feeSplits.reduce((sum, split) => sum + split.driverFee, 0),
      totalCompanyFee: feeSplits.reduce((sum, split) => sum + split.companyFee, 0),
      totalAgentFee: feeSplits.reduce((sum, split) => sum + split.agentFee, 0),
      totalOtherFee: feeSplits.reduce((sum, split) => sum + split.otherFee, 0),
    };

    return NextResponse.json({
      success: true,
      data: feeSplits,
      stats,
    });
  } catch (error) {
    console.error('خطأ في جلب تقسيمات الأجرة:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء جلب تقسيمات الأجرة' },
      { status: 500 }
    );
  }
}

// POST - إنشاء تقسيم أجرة جديد
export async function POST(request: NextRequest) {
  try {
    const body: FeeSplitInput = await request.json();

    // التحقق من البيانات المطلوبة
    if (!body.shipmentItemId || body.shipmentItemId.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'معرف عنصر الشحنة مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من وجود عنصر الشحنة
    const shipmentItem = await db.shipmentItem.findUnique({
      where: { id: body.shipmentItemId },
    });

    if (!shipmentItem) {
      return NextResponse.json(
        { success: false, error: 'عنصر الشحنة غير موجود' },
        { status: 404 }
      );
    }

    // التحقق من عدم وجود تقسيم سابق لنفس العنصر
    const existingSplit = await db.feeSplit.findFirst({
      where: { shipmentItemId: body.shipmentItemId },
    });

    if (existingSplit) {
      return NextResponse.json(
        { success: false, error: 'يوجد تقسيم أجرة سابق لهذا العنصر' },
        { status: 400 }
      );
    }

    // التحقق من صحة التقسيم
    const totalSplit = (body.driverFee || 0) + (body.companyFee || 0) + (body.agentFee || 0) + (body.otherFee || 0);

    if (Math.abs(totalSplit - body.totalFee) > 0.01) {
      return NextResponse.json(
        { success: false, error: `مجموع التقسيمات (${totalSplit}) لا يساوي الأجرة الإجمالية (${body.totalFee})` },
        { status: 400 }
      );
    }

    // إنشاء التقسيم
    const feeSplit = await db.feeSplit.create({
      data: {
        shipmentItemId: body.shipmentItemId,
        totalFee: body.totalFee,
        driverFee: body.driverFee || 0,
        companyFee: body.companyFee || 0,
        agentFee: body.agentFee || 0,
        otherFee: body.otherFee || 0,
        notes: body.notes,
      },
      include: {
        shipmentItem: {
          include: {
            shipment: {
              select: {
                id: true,
                date: true,
                weekDay: true,
              },
            },
            farmer: {
              select: {
                id: true,
                name: true,
              },
            },
            agent: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: feeSplit,
      message: 'تم إنشاء تقسيم الأجرة بنجاح',
    });
  } catch (error) {
    console.error('خطأ في إنشاء تقسيم الأجرة:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return NextResponse.json(
          { success: false, error: 'عنصر الشحنة غير موجود' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء إنشاء تقسيم الأجرة' },
      { status: 500 }
    );
  }
}

// PUT - تحديث تقسيم أجرة موجود
export async function PUT(request: NextRequest) {
  try {
    const body: UpdateFeeSplitBody = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'معرف التقسيم مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من وجود التقسيم
    const existingSplit = await db.feeSplit.findUnique({
      where: { id: body.id },
    });

    if (!existingSplit) {
      return NextResponse.json(
        { success: false, error: 'تقسيم الأجرة غير موجود' },
        { status: 404 }
      );
    }

    // التحقق من صحة التقسيم الجديد
    const newTotal = body.totalFee ?? existingSplit.totalFee;
    const newDriver = body.driverFee ?? existingSplit.driverFee;
    const newCompany = body.companyFee ?? existingSplit.companyFee;
    const newAgent = body.agentFee ?? existingSplit.agentFee;
    const newOther = body.otherFee ?? existingSplit.otherFee;

    const totalSplit = newDriver + newCompany + newAgent + newOther;

    if (Math.abs(totalSplit - newTotal) > 0.01) {
      return NextResponse.json(
        { success: false, error: `مجموع التقسيمات (${totalSplit}) لا يساوي الأجرة الإجمالية (${newTotal})` },
        { status: 400 }
      );
    }

    // إعداد بيانات التحديث
    const updateData: Prisma.FeeSplitUpdateInput = {};

    if (body.totalFee !== undefined) {
      updateData.totalFee = body.totalFee;
    }

    if (body.driverFee !== undefined) {
      updateData.driverFee = body.driverFee;
    }

    if (body.companyFee !== undefined) {
      updateData.companyFee = body.companyFee;
    }

    if (body.agentFee !== undefined) {
      updateData.agentFee = body.agentFee;
    }

    if (body.otherFee !== undefined) {
      updateData.otherFee = body.otherFee;
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    // تحديث التقسيم
    const feeSplit = await db.feeSplit.update({
      where: { id: body.id },
      data: updateData,
      include: {
        shipmentItem: {
          include: {
            shipment: {
              select: {
                id: true,
                date: true,
                weekDay: true,
              },
            },
            farmer: {
              select: {
                id: true,
                name: true,
              },
            },
            agent: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: feeSplit,
      message: 'تم تحديث تقسيم الأجرة بنجاح',
    });
  } catch (error) {
    console.error('خطأ في تحديث تقسيم الأجرة:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { success: false, error: 'تقسيم الأجرة غير موجود' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء تحديث تقسيم الأجرة' },
      { status: 500 }
    );
  }
}

// DELETE - حذف تقسيم أجرة
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف التقسيم مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من وجود التقسيم
    const existingSplit = await db.feeSplit.findUnique({
      where: { id },
    });

    if (!existingSplit) {
      return NextResponse.json(
        { success: false, error: 'تقسيم الأجرة غير موجود' },
        { status: 404 }
      );
    }

    // حذف التقسيم
    await db.feeSplit.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'تم حذف تقسيم الأجرة بنجاح',
    });
  } catch (error) {
    console.error('خطأ في حذف تقسيم الأجرة:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { success: false, error: 'تقسيم الأجرة غير موجود' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء حذف تقسيم الأجرة' },
      { status: 500 }
    );
  }
}
