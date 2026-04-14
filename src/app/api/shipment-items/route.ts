import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - إضافة عنصر جديد للشحنة (حفظ تلقائي)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shipmentId, farmerId, agentId, farmerAlias, khatDetails, numberOfBags, notes } = body;

    if (!shipmentId) {
      return NextResponse.json({ success: false, error: 'معرف الشحنة مطلوب' }, { status: 400 });
    }

    // التحقق من الشحنة
    const shipment = await db.shipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) {
      return NextResponse.json({ success: false, error: 'الشحنة غير موجودة' }, { status: 404 });
    }

    if (!farmerId || !agentId || !khatDetails || khatDetails.length === 0) {
      return NextResponse.json({ success: false, error: 'جميع الحقول مطلوبة' }, { status: 400 });
    }

    // جلب أنواع القات
    const khatTypeIds = khatDetails.map((d: { khatTypeId: string }) => d.khatTypeId);
    const khatTypes = await db.khatType.findMany({ where: { id: { in: khatTypeIds } } });
    const khatTypeMap = new Map(khatTypes.map((k) => [k.id, k]));

    // حساب الأجرة
    let itemTotalPieces = 0;
    let itemTotalFee = 0;
    const khatDetailsData = [];

    for (const detail of khatDetails) {
      const khatType = khatTypeMap.get(detail.khatTypeId);
      if (!khatType) continue;

      const pieces = parseInt(detail.pieces) || 0;
      const totalFee = pieces * khatType.feePerPiece;

      khatDetailsData.push({
        khatTypeId: detail.khatTypeId,
        pieces,
        feePerPiece: khatType.feePerPiece,
        totalFee,
      });

      itemTotalPieces += pieces;
      itemTotalFee += totalFee;
    }

    // إنشاء العنصر
    const item = await db.shipmentItem.create({
      data: {
        shipmentId,
        farmerId,
        agentId,
        farmerAlias: farmerAlias || null,
        notes: notes || null,
        totalPieces: itemTotalPieces,
        totalFee: itemTotalFee,
        numberOfBags: parseInt(numberOfBags) || 1,
        khatDetails: { create: khatDetailsData },
      },
      include: {
        farmer: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true } },
        khatDetails: {
          include: {
            khatType: { select: { id: true, name: true, feePerPiece: true } }
          }
        },
      },
    });

    // تحديث رصيد الوكيل
    await db.agent.update({
      where: { id: agentId },
      data: { balance: { increment: itemTotalFee } },
    });

    return NextResponse.json({
      success: true,
      item,
      message: 'تم إضافة العنصر بنجاح'
    });
  } catch (error) {
    console.error('Error adding shipment item:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ أثناء إضافة العنصر' }, { status: 500 });
  }
}

// PUT - تحديث عنصر موجود
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, farmerId, agentId, farmerAlias, khatDetails, numberOfBags, notes } = body;

    if (!itemId) {
      return NextResponse.json({ success: false, error: 'معرف العنصر مطلوب' }, { status: 400 });
    }

    // جلب العنصر الحالي
    const existingItem = await db.shipmentItem.findUnique({
      where: { id: itemId },
      include: { khatDetails: true },
    });

    if (!existingItem) {
      return NextResponse.json({ success: false, error: 'العنصر غير موجود' }, { status: 404 });
    }

    // عكس رصيد الوكيل القديم
    await db.agent.update({
      where: { id: existingItem.agentId },
      data: { balance: { decrement: existingItem.totalFee } },
    });

    // حذف تفاصيل القات القديمة
    await db.khatDetail.deleteMany({ where: { shipmentItemId: itemId } });

    // جلب أنواع القات
    const khatTypeIds = khatDetails.map((d: { khatTypeId: string }) => d.khatTypeId);
    const khatTypes = await db.khatType.findMany({ where: { id: { in: khatTypeIds } } });
    const khatTypeMap = new Map(khatTypes.map((k) => [k.id, k]));

    // حساب الأجرة الجديدة
    let itemTotalPieces = 0;
    let itemTotalFee = 0;
    const khatDetailsData = [];

    for (const detail of khatDetails) {
      const khatType = khatTypeMap.get(detail.khatTypeId);
      if (!khatType) continue;

      const pieces = parseInt(detail.pieces) || 0;
      const totalFee = pieces * khatType.feePerPiece;

      khatDetailsData.push({
        khatTypeId: detail.khatTypeId,
        pieces,
        feePerPiece: khatType.feePerPiece,
        totalFee,
      });

      itemTotalPieces += pieces;
      itemTotalFee += totalFee;
    }

    // تحديث العنصر
    const item = await db.shipmentItem.update({
      where: { id: itemId },
      data: {
        farmerId: farmerId || existingItem.farmerId,
        agentId: agentId || existingItem.agentId,
        farmerAlias: farmerAlias || null,
        notes: notes || null,
        totalPieces: itemTotalPieces,
        totalFee: itemTotalFee,
        numberOfBags: parseInt(numberOfBags) || 1,
        khatDetails: { create: khatDetailsData },
      },
      include: {
        farmer: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true } },
        khatDetails: {
          include: {
            khatType: { select: { id: true, name: true, feePerPiece: true } }
          }
        },
      },
    });

    // تحديث رصيد الوكيل الجديد
    await db.agent.update({
      where: { id: item.agentId },
      data: { balance: { increment: itemTotalFee } },
    });

    return NextResponse.json({
      success: true,
      item,
      message: 'تم تحديث العنصر بنجاح'
    });
  } catch (error) {
    console.error('Error updating shipment item:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ أثناء تحديث العنصر' }, { status: 500 });
  }
}

// DELETE - حذف عنصر
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json({ success: false, error: 'معرف العنصر مطلوب' }, { status: 400 });
    }

    // جلب العنصر
    const item = await db.shipmentItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return NextResponse.json({ success: false, error: 'العنصر غير موجود' }, { status: 404 });
    }

    // عكس رصيد الوكيل
    await db.agent.update({
      where: { id: item.agentId },
      data: { balance: { decrement: item.totalFee } },
    });

    // حذف العنصر (سيحذف تفاصيل القات تلقائياً بسبب onDelete: Cascade)
    await db.shipmentItem.delete({ where: { id: itemId } });

    return NextResponse.json({
      success: true,
      message: 'تم حذف العنصر بنجاح'
    });
  } catch (error) {
    console.error('Error deleting shipment item:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ أثناء حذف العنصر' }, { status: 500 });
  }
}
