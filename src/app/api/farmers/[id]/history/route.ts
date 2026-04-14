import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// الحصول على سجل مزارع معين
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // بناء شرط التاريخ
    let dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      // إضافة يوم واحد لتضمين يوم النهاية
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    // الحصول على جميع عناصر الشحنات للمزارع
    const shipmentItems = await db.shipmentItem.findMany({
      where: {
        farmerId: id,
        ...(Object.keys(dateFilter).length > 0 && {
          createdAt: dateFilter
        })
      },
      include: {
        shipment: {
          include: {
            user: {
              select: { id: true, username: true }
            }
          }
        },
        agent: {
          select: { id: true, name: true, phone: true }
        },
        farmer: {
          select: { id: true, name: true, fullName: true, phone: true }
        },
        khatDetails: {
          include: {
            khatType: {
              select: { id: true, name: true, feePerPiece: true }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // تجميع البيانات حسب التاريخ
    const groupedByDate = shipmentItems.reduce((acc, item) => {
      const date = new Date(item.createdAt).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const dateKey = new Date(item.createdAt).toISOString().split('T')[0];

      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: date,
          dateISO: dateKey,
          items: [],
          totalPieces: 0,
          totalBags: 0,
          totalFee: 0,
          shipmentIds: new Set()
        };
      }

      acc[dateKey].items.push(item);
      acc[dateKey].totalPieces += item.totalPieces;
      acc[dateKey].totalBags += item.numberOfBags || 1;
      acc[dateKey].totalFee += item.totalFee;
      acc[dateKey].shipmentIds.add(item.shipmentId);

      return acc;
    }, {} as Record<string, {
      date: string;
      dateISO: string;
      items: typeof shipmentItems;
      totalPieces: number;
      totalBags: number;
      totalFee: number;
      shipmentIds: Set<string>;
    }>);

    // تحويل إلى مصفوفة
    const history = Object.values(groupedByDate).map(group => ({
      date: group.date,
      dateISO: group.dateISO,
      totalPieces: group.totalPieces,
      totalBags: group.totalBags,
      totalFee: group.totalFee,
      shipmentsCount: group.shipmentIds.size,
      items: group.items.map(item => ({
        id: item.id,
        shipmentId: item.shipmentId,
        shipmentStatus: item.shipment.status,
        shipmentNotes: item.shipment.notes,
        agent: item.agent,
        farmerAlias: item.farmerAlias,
        totalPieces: item.totalPieces,
        numberOfBags: item.numberOfBags || 1,
        totalFee: item.totalFee,
        notes: item.notes,
        receivedBy: item.receivedBy,
        receivedAt: item.receivedAt,
        deliveryStatus: item.deliveryStatus,
        createdBy: item.shipment.user,
        createdAt: item.createdAt,
        khatDetails: item.khatDetails.map(detail => ({
          khatType: detail.khatType,
          pieces: detail.pieces,
          feePerPiece: detail.feePerPiece,
          totalFee: detail.totalFee
        }))
      }))
    }));

    // إحصائيات عامة
    const stats = {
      totalDays: history.length,
      totalPieces: shipmentItems.reduce((sum, item) => sum + item.totalPieces, 0),
      totalBags: shipmentItems.reduce((sum, item) => sum + (item.numberOfBags || 1), 0),
      totalFee: shipmentItems.reduce((sum, item) => sum + item.totalFee, 0),
      totalShipments: new Set(shipmentItems.map(i => i.shipmentId)).size,
      agents: [...new Set(shipmentItems.map(i => i.agent.name))],
      deliveryStats: {
        pending: shipmentItems.filter(i => i.deliveryStatus === 'PENDING').length,
        received: shipmentItems.filter(i => i.deliveryStatus === 'RECEIVED').length,
        inTransit: shipmentItems.filter(i => i.deliveryStatus === 'IN_TRANSIT').length,
        delivered: shipmentItems.filter(i => i.deliveryStatus === 'DELIVERED').length,
      }
    };

    return NextResponse.json({
      success: true,
      history,
      stats,
      farmer: shipmentItems[0]?.farmer || null
    });

  } catch (error) {
    console.error('Error fetching farmer history:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب سجل المزارع' },
      { status: 500 }
    );
  }
}
