import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - جلب تحليلات الصور
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const minConfidence = searchParams.get('minConfidence');

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (minConfidence) {
      where.confidence = {
        gte: parseFloat(minConfidence),
      };
    }

    const analyses = await db.imageAnalysis.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // تحويل النتائج إلى JSON
    const parsedAnalyses = analyses.map((analysis) => ({
      ...analysis,
      result: JSON.parse(analysis.result),
    }));

    return NextResponse.json({
      success: true,
      data: parsedAnalyses,
      count: analyses.length,
    });
  } catch (error) {
    console.error('خطأ في جلب تحليلات الصور:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء جلب تحليلات الصور' },
      { status: 500 }
    );
  }
}

// POST - تحليل صورة جديدة
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, type, result, confidence } = body;

    // التحقق من البيانات المطلوبة
    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'رابط الصورة مطلوب' },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'نوع التحليل مطلوب' },
        { status: 400 }
      );
    }

    const validTypes = ['invoice', 'receipt', 'document'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `نوع التحليل يجب أن يكون أحد القيم: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'نتيجة التحليل مطلوبة' },
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

    const analysis = await db.imageAnalysis.create({
      data: {
        imageUrl,
        type,
        result: typeof result === 'string' ? result : JSON.stringify(result),
        confidence: confidence ? parseFloat(confidence) : 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...analysis,
        result: typeof result === 'string' ? JSON.parse(result) : result,
      },
      message: 'تم حفظ التحليل بنجاح',
    });
  } catch (error) {
    console.error('خطأ في تحليل الصورة:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء تحليل الصورة' },
      { status: 500 }
    );
  }
}

// DELETE - حذف تحليل صورة
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف التحليل مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من وجود التحليل
    const existingAnalysis = await db.imageAnalysis.findUnique({
      where: { id },
    });

    if (!existingAnalysis) {
      return NextResponse.json(
        { success: false, error: 'التحليل غير موجود' },
        { status: 404 }
      );
    }

    await db.imageAnalysis.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'تم حذف التحليل بنجاح',
    });
  } catch (error) {
    console.error('خطأ في حذف التحليل:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء حذف التحليل' },
      { status: 500 }
    );
  }
}
