import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// تقرير عام شامل ومفصل
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const period = searchParams.get('period') || 'all';

    // حساب نطاق التاريخ
    const now = new Date();
    let dateFrom: Date | undefined;
    let dateTo: Date | undefined = now;

    if (period === 'day') {
      dateFrom = new Date(now.setHours(0, 0, 0, 0));
    } else if (period === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      dateFrom = weekStart;
    } else if (period === 'month') {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'year') {
      dateFrom = new Date(now.getFullYear(), 0, 1);
    }

    if (from) dateFrom = new Date(from);
    if (to) dateTo = new Date(to);

    const dateFilter: any = {};
    if (dateFrom || dateTo) {
      if (dateFrom) dateFilter.gte = dateFrom;
      if (dateTo) dateFilter.lte = dateTo;
    }

    // جلب جميع البيانات
    const shipments = await db.shipment.findMany({
      where: Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {},
      include: {
        user: { select: { id: true, username: true } },
        items: {
          include: {
            farmer: { select: { id: true, name: true } },
            agent: { select: { id: true, name: true, balance: true } },
            khatDetails: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    const khatTypesList = await db.khatType.findMany();
    const khatTypesMap = new Map(khatTypesList.map(kt => [kt.id, kt]));

    const expenses = await db.expense.findMany({
      where: Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {},
      orderBy: { date: 'desc' }
    });

    const agents = await db.agent.findMany();
    const transactions = await db.transaction.findMany({
      where: Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}
    });

    // =============== حساب إحصائيات المزارعين ===============
    const farmerStats: Record<string, {
      id: string;
      name: string;
      pieces: number;
      fees: number;
      shipments: Set<string>;
      agents: Record<string, { name: string; pieces: number; fees: number }>;
      khatTypes: Record<string, { name: string; pieces: number; fees: number }>;
    }> = {};

    shipments.forEach(shipment => {
      shipment.items.forEach(item => {
        if (!farmerStats[item.farmerId]) {
          farmerStats[item.farmerId] = {
            id: item.farmerId,
            name: item.farmer.name,
            pieces: 0,
            fees: 0,
            shipments: new Set(),
            agents: {},
            khatTypes: {}
          };
        }

        const itemPieces = item.khatDetails.reduce((sum, kd) => sum + kd.pieces, 0);
        const itemFees = item.khatDetails.reduce((sum, kd) => sum + kd.totalFee, 0);

        farmerStats[item.farmerId].pieces += itemPieces;
        farmerStats[item.farmerId].fees += itemFees;
        farmerStats[item.farmerId].shipments.add(shipment.id);

        // الوكلاء
        if (!farmerStats[item.farmerId].agents[item.agentId]) {
          farmerStats[item.farmerId].agents[item.agentId] = {
            name: item.agent.name,
            pieces: 0,
            fees: 0
          };
        }
        farmerStats[item.farmerId].agents[item.agentId].pieces += itemPieces;
        farmerStats[item.farmerId].agents[item.agentId].fees += itemFees;

        // أنواع القات
        item.khatDetails.forEach(kd => {
          const khatType = khatTypesMap.get(kd.khatTypeId);
          const khatName = khatType?.name || 'غير معروف';
          if (!farmerStats[item.farmerId].khatTypes[khatName]) {
            farmerStats[item.farmerId].khatTypes[khatName] = {
              name: khatName,
              pieces: 0,
              fees: 0
            };
          }
          farmerStats[item.farmerId].khatTypes[khatName].pieces += kd.pieces;
          farmerStats[item.farmerId].khatTypes[khatName].fees += kd.totalFee;
        });
      });
    });

    // حساب ديون المزارعين
    const farmerDebts: Record<string, number> = {};
    transactions.filter(t => t.actorType === 'FARMER').forEach(t => {
      if (!farmerDebts[t.actorId]) farmerDebts[t.actorId] = 0;
      farmerDebts[t.actorId] += t.type === 'DEBT' ? t.amount : -t.amount;
    });

    // =============== حساب إحصائيات الوكلاء ===============
    const agentStats: Record<string, {
      id: string;
      name: string;
      pieces: number;
      fees: number;
      balance: number;
      shipments: Set<string>;
      farmers: Record<string, { name: string; pieces: number; fees: number }>;
      khatTypes: Record<string, { name: string; pieces: number; fees: number }>;
    }> = {};

    shipments.forEach(shipment => {
      shipment.items.forEach(item => {
        if (!agentStats[item.agentId]) {
          agentStats[item.agentId] = {
            id: item.agentId,
            name: item.agent.name,
            pieces: 0,
            fees: 0,
            balance: item.agent.balance,
            shipments: new Set(),
            farmers: {},
            khatTypes: {}
          };
        }

        const itemPieces = item.khatDetails.reduce((sum, kd) => sum + kd.pieces, 0);
        const itemFees = item.khatDetails.reduce((sum, kd) => sum + kd.totalFee, 0);

        agentStats[item.agentId].pieces += itemPieces;
        agentStats[item.agentId].fees += itemFees;
        agentStats[item.agentId].shipments.add(shipment.id);

        // المزارعين
        if (!agentStats[item.agentId].farmers[item.farmerId]) {
          agentStats[item.agentId].farmers[item.farmerId] = {
            name: item.farmer.name,
            pieces: 0,
            fees: 0
          };
        }
        agentStats[item.agentId].farmers[item.farmerId].pieces += itemPieces;
        agentStats[item.agentId].farmers[item.farmerId].fees += itemFees;

        // أنواع القات
        item.khatDetails.forEach(kd => {
          const khatType = khatTypesMap.get(kd.khatTypeId);
          const khatName = khatType?.name || 'غير معروف';
          if (!agentStats[item.agentId].khatTypes[khatName]) {
            agentStats[item.agentId].khatTypes[khatName] = {
              name: khatName,
              pieces: 0,
              fees: 0
            };
          }
          agentStats[item.agentId].khatTypes[khatName].pieces += kd.pieces;
          agentStats[item.agentId].khatTypes[khatName].fees += kd.totalFee;
        });
      });
    });

    // =============== حساب إحصائيات أنواع القات ===============
    const khatTypeStats: Record<string, {
      name: string;
      pieces: number;
      fees: number;
      farmers: Record<string, { name: string; pieces: number; fees: number }>;
      agents: Record<string, { name: string; pieces: number; fees: number }>;
    }> = {};

    shipments.forEach(shipment => {
      shipment.items.forEach(item => {
        item.khatDetails.forEach(kd => {
          const khatType = khatTypesMap.get(kd.khatTypeId);
          const khatName = khatType?.name || 'غير معروف';

          if (!khatTypeStats[khatName]) {
            khatTypeStats[khatName] = {
              name: khatName,
              pieces: 0,
              fees: 0,
              farmers: {},
              agents: {}
            };
          }

          khatTypeStats[khatName].pieces += kd.pieces;
          khatTypeStats[khatName].fees += kd.totalFee;

          // المزارعين
          if (!khatTypeStats[khatName].farmers[item.farmerId]) {
            khatTypeStats[khatName].farmers[item.farmerId] = {
              name: item.farmer.name,
              pieces: 0,
              fees: 0
            };
          }
          khatTypeStats[khatName].farmers[item.farmerId].pieces += kd.pieces;
          khatTypeStats[khatName].farmers[item.farmerId].fees += kd.totalFee;

          // الوكلاء
          if (!khatTypeStats[khatName].agents[item.agentId]) {
            khatTypeStats[khatName].agents[item.agentId] = {
              name: item.agent.name,
              pieces: 0,
              fees: 0
            };
          }
          khatTypeStats[khatName].agents[item.agentId].pieces += kd.pieces;
          khatTypeStats[khatName].agents[item.agentId].fees += kd.totalFee;
        });
      });
    });

    // =============== تفاصيل الشحنات ===============
    const shipmentDetails = shipments.map(shipment => {
      const items = shipment.items.map(item => ({
        farmerName: item.farmer.name,
        farmerAlias: item.farmerAlias || item.farmer.name,
        agentName: item.agent.name,
        khatDetails: item.khatDetails.map(kd => {
          const kt = khatTypesMap.get(kd.khatTypeId);
          return {
            khatType: kt?.name || 'غير معروف',
            pieces: kd.pieces,
            feePerPiece: kd.feePerPiece,
            totalFee: kd.totalFee
          };
        }),
        totalPieces: item.khatDetails.reduce((sum, kd) => sum + kd.pieces, 0),
        totalFee: item.khatDetails.reduce((sum, kd) => sum + kd.totalFee, 0)
      }));

      return {
        id: shipment.id,
        date: shipment.date.toISOString(),
        status: shipment.status,
        userName: shipment.user.username,
        items,
        totalPieces: items.reduce((sum, i) => sum + i.totalPieces, 0),
        totalFee: items.reduce((sum, i) => sum + i.totalFee, 0)
      };
    });

    // =============== الإحصائيات اليومية ===============
    const dailyStats: Record<string, { pieces: number; fees: number; shipments: Set<string> }> = {};
    shipments.forEach(shipment => {
      const dateKey = shipment.date.toISOString().split('T')[0];
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { pieces: 0, fees: 0, shipments: new Set() };
      }
      dailyStats[dateKey].shipments.add(shipment.id);
      shipment.items.forEach(item => {
        dailyStats[dateKey].pieces += item.khatDetails.reduce((sum, kd) => sum + kd.pieces, 0);
        dailyStats[dateKey].fees += item.khatDetails.reduce((sum, kd) => sum + kd.totalFee, 0);
      });
    });

    // =============== حساب المجاميع ===============
    const totalPieces = Object.values(farmerStats).reduce((sum, f) => sum + f.pieces, 0);
    const totalFees = Object.values(farmerStats).reduce((sum, f) => sum + f.fees, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalAgentDebts = agents.reduce((sum, a) => sum + Math.max(0, a.balance), 0);
    const totalFarmerDebts = Object.values(farmerDebts).reduce((sum, d) => sum + Math.max(0, d), 0);

    // =============== العناصر المحايدة/المفقودة ===============
    const isolatedItems = shipments.flatMap(shipment =>
      shipment.items
        .filter(item => item.isIsolated)
        .map(item => ({
          id: item.id,
          shipmentId: shipment.id,
          shipmentDate: shipment.date.toISOString(),
          weekDay: shipment.weekDay,
          farmerName: item.farmer.name,
          farmerAlias: item.farmerAlias || item.farmer.name,
          agentName: item.agent.name,
          totalPieces: item.totalPieces,
          totalFee: item.totalFee,
          isolatedAt: item.isolatedAt?.toISOString(),
          isolationReason: item.isolationReason,
          resolvedAt: item.resolvedAt?.toISOString(),
          resolutionNotes: item.resolutionNotes,
          isResolved: !!item.resolvedAt,
        }))
    );

    // =============== المصاريف حسب الفئة ===============
    const expensesByCategory: Record<string, number> = {};
    expenses.forEach(e => {
      const catName = e.category === 'SUPPLIES' ? 'مستلزمات' : e.category === 'SALARY' ? 'رواتب' : 'أخرى';
      expensesByCategory[catName] = (expensesByCategory[catName] || 0) + e.amount;
    });

    // =============== إعداد النتيجة ===============
    return NextResponse.json({
      success: true,
      reportType: 'general',
      period,
      dateRange: { from: dateFrom, to: dateTo },
      summary: {
        totalShipments: shipments.length,
        totalPieces,
        totalFees,
        totalExpenses,
        netProfit: totalFees - totalExpenses,
        totalAgentDebts,
        farmerDebts: totalFarmerDebts,
      },
      shipments: shipmentDetails,
      farmers: Object.values(farmerStats).map(f => ({
        id: f.id,
        name: f.name,
        pieces: f.pieces,
        fees: f.fees,
        debt: farmerDebts[f.id] || 0,
        shipments: f.shipments.size,
        agents: Object.values(f.agents),
        khatTypes: Object.values(f.khatTypes),
      })).sort((a, b) => b.pieces - a.pieces),
      agents: Object.values(agentStats).map(a => ({
        id: a.id,
        name: a.name,
        pieces: a.pieces,
        fees: a.fees,
        balance: a.balance,
        shipments: a.shipments.size,
        farmers: Object.values(a.farmers),
        khatTypes: Object.values(a.khatTypes),
      })).sort((a, b) => b.fees - a.fees),
      khatTypes: Object.values(khatTypeStats).map(kt => ({
        name: kt.name,
        pieces: kt.pieces,
        fees: kt.fees,
        percentage: totalPieces > 0 ? (kt.pieces / totalPieces) * 100 : 0,
        avgFeePerPiece: kt.pieces > 0 ? kt.fees / kt.pieces : 0,
        farmers: Object.values(kt.farmers),
        agents: Object.values(kt.agents),
      })).sort((a, b) => b.pieces - a.pieces),
      dailyStats: Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        pieces: stats.pieces,
        fees: stats.fees,
        shipments: stats.shipments.size,
      })).sort((a, b) => a.date.localeCompare(b.date)),
      expenses: {
        total: totalExpenses,
        byCategory: Object.entries(expensesByCategory).map(([name, value]) => ({ name, value })),
        list: expenses.map(e => ({
          id: e.id,
          description: e.description,
          amount: e.amount,
          category: e.category === 'SUPPLIES' ? 'مستلزمات' : e.category === 'SALARY' ? 'رواتب' : 'أخرى',
          date: e.date.toISOString(),
        })),
      },
      isolatedItems,
      isolatedStats: {
        total: isolatedItems.length,
        resolved: isolatedItems.filter(i => i.isResolved).length,
        pending: isolatedItems.filter(i => !i.isResolved).length,
        totalPiecesLost: isolatedItems.filter(i => !i.isResolved).reduce((sum, i) => sum + i.totalPieces, 0),
        totalFeesLost: isolatedItems.filter(i => !i.isResolved).reduce((sum, i) => sum + i.totalFee, 0),
      },
    });

  } catch (error) {
    console.error('Error generating full report:', error);
    return NextResponse.json({ error: 'فشل في إنشاء التقرير' }, { status: 500 });
  }
}
