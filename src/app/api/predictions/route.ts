import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - جلب التوقعات
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const entityId = searchParams.get('entityId');
    const entityType = searchParams.get('entityType');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (entityId) {
      where.entityId = entityId;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    const predictions = await db.prediction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // تحويل التوقعات إلى JSON
    const parsedPredictions = predictions.map((pred) => ({
      ...pred,
      prediction: JSON.parse(pred.prediction),
    }));

    return NextResponse.json({
      success: true,
      data: parsedPredictions,
      count: predictions.length,
    });
  } catch (error) {
    console.error('خطأ في جلب التوقعات:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء جلب التوقعات' },
      { status: 500 }
    );
  }
}

// POST - إنشاء توقع جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      entityId,
      entityType,
      prediction,
      confidence,
    } = body;

    // التحقق من البيانات المطلوبة
    if (!type) {
      return NextResponse.json(
        { success: false, error: 'نوع التوقع مطلوب' },
        { status: 400 }
      );
    }

    const validTypes = ['DEMAND', 'REVENUE', 'DELIVERY', 'RISK'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `نوع التوقع يجب أن يكون أحد القيم: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    if (!prediction) {
      return NextResponse.json(
        { success: false, error: 'بيانات التوقع مطلوبة' },
        { status: 400 }
      );
    }

    // التحقق من نسبة الثقة
    if (confidence !== undefined && (confidence < 0 || confidence > 1)) {
      return NextResponse.json(
        { success: false, error: 'نسبة الثقة يجب أن تكون بين 0 و 1' },
        { status: 400 }
      );
    }

    const newPrediction = await db.prediction.create({
      data: {
        type,
        entityId: entityId || null,
        entityType: entityType || null,
        prediction: typeof prediction === 'string' ? prediction : JSON.stringify(prediction),
        confidence: confidence ? parseFloat(confidence) : 0,
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...newPrediction,
        prediction: typeof prediction === 'string' ? JSON.parse(prediction) : prediction,
      },
      message: 'تم إنشاء التوقع بنجاح',
    });
  } catch (error) {
    console.error('خطأ في إنشاء التوقع:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء إنشاء التوقع' },
      { status: 500 }
    );
  }
}

// PUT - تحديث حالة التوقع
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, actualValue } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف التوقع مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من وجود التوقع
    const existingPrediction = await db.prediction.findUnique({
      where: { id },
    });

    if (!existingPrediction) {
      return NextResponse.json(
        { success: false, error: 'التوقع غير موجود' },
        { status: 404 }
      );
    }

    const validStatuses = ['PENDING', 'CONFIRMED', 'REJECTED', 'VERIFIED'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `حالة التوقع يجب أن تكون أحد القيم: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (actualValue !== undefined) updateData.actualValue = actualValue;

    const updatedPrediction = await db.prediction.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updatedPrediction,
        prediction: JSON.parse(updatedPrediction.prediction),
      },
      message: 'تم تحديث التوقع بنجاح',
    });
  } catch (error) {
    console.error('خطأ في تحديث التوقع:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء تحديث التوقع' },
      { status: 500 }
    );
  }
}
