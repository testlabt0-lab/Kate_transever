import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - جلب جميع المؤقتات
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const active = searchParams.get('active');

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (active === 'true') {
      where.status = 'ACTIVE';
    }

    const timers = await db.deliveryTimer.findMany({
      where,
      include: {
        agent: {
          select: { id: true, name: true, phone: true }
        },
        shipment: {
          select: { id: true, date: true, status: true }
        }
      },
      orderBy: { targetDateTime: 'asc' }
    });

    // حساب الوقت المتبقي لكل مؤقت
    const now = new Date();
    const timersWithRemaining = timers.map(timer => {
      const targetTime = new Date(timer.targetDateTime);
      const diff = targetTime.getTime() - now.getTime();

      let remaining = {
        total: diff,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: diff <= 0,
        isUrgent: false
      };

      if (diff > 0) {
        remaining.days = Math.floor(diff / (1000 * 60 * 60 * 24));
        remaining.hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        remaining.minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        remaining.seconds = Math.floor((diff % (1000 * 60)) / 1000);

        // عاجل إذا أقل من ساعة
        remaining.isUrgent = diff < 60 * 60 * 1000;
      }

      return {
        ...timer,
        remaining
      };
    });

    // إحصائيات
    const stats = {
      total: timers.length,
      active: timers.filter(t => t.status === 'ACTIVE').length,
      completed: timers.filter(t => t.status === 'COMPLETED').length,
      expired: timersWithRemaining.filter(t => t.remaining.isExpired && t.status === 'ACTIVE').length,
      urgent: timersWithRemaining.filter(t => t.remaining.isUrgent && t.status === 'ACTIVE').length
    };

    return NextResponse.json({
      timers: timersWithRemaining,
      stats
    });
  } catch (error) {
    console.error('Error fetching timers:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب المؤقتات' }, { status: 500 });
  }
}

// POST - إنشاء مؤقت جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, targetDateTime, agentId, shipmentId } = body;

    if (!title || !targetDateTime) {
      return NextResponse.json({ error: 'العنوان وموعد التسليم مطلوبان' }, { status: 400 });
    }

    const timer = await db.deliveryTimer.create({
      data: {
        title,
        description: description || null,
        targetDateTime: new Date(targetDateTime),
        agentId: agentId || null,
        shipmentId: shipmentId || null,
        status: 'ACTIVE'
      },
      include: {
        agent: {
          select: { id: true, name: true, phone: true }
        },
        shipment: {
          select: { id: true, date: true, status: true }
        }
      }
    });

    return NextResponse.json({ success: true, timer });
  } catch (error) {
    console.error('Error creating timer:', error);
    return NextResponse.json({ error: 'حدث خطأ في إنشاء المؤقت' }, { status: 500 });
  }
}

// PUT - تحديث مؤقت
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, description, targetDateTime, status, agentId, shipmentId } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف المؤقت مطلوب' }, { status: 400 });
    }

    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (targetDateTime !== undefined) updateData.targetDateTime = new Date(targetDateTime);
    if (status !== undefined) updateData.status = status;
    if (agentId !== undefined) updateData.agentId = agentId || null;
    if (shipmentId !== undefined) updateData.shipmentId = shipmentId || null;

    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const timer = await db.deliveryTimer.update({
      where: { id },
      data: updateData,
      include: {
        agent: {
          select: { id: true, name: true, phone: true }
        },
        shipment: {
          select: { id: true, date: true, status: true }
        }
      }
    });

    return NextResponse.json({ success: true, timer });
  } catch (error) {
    console.error('Error updating timer:', error);
    return NextResponse.json({ error: 'حدث خطأ في تحديث المؤقت' }, { status: 500 });
  }
}

// DELETE - حذف مؤقت
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف المؤقت مطلوب' }, { status: 400 });
    }

    await db.deliveryTimer.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting timer:', error);
    return NextResponse.json({ error: 'حدث خطأ في حذف المؤقت' }, { status: 500 });
  }
}
