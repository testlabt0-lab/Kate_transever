import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// تقرير مفصل وشامل - v2
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'general'; // general, farmer, agent, khatType, expense
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const period = searchParams.get('period') || 'all'; // day, week, month, year, all
    const entityId = searchParams.get('entityId'); // ID of farmer/agent/khatType

    // حساب نطاق التاريخ حسب الفترة
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

    // Override with custom dates if provided
    if (from) dateFrom = new Date(from);
    if (to) dateTo = new Date(to);

    // Build date filter
    const buildDateFilter = (field: string = 'date') => {
      const filter: any = {};
      if (dateFrom || dateTo) {
        filter[field] = {};
        if (dateFrom) filter[field].gte = dateFrom;
        if (dateTo) filter[field].lte = dateTo;
      }
      return Object.keys(filter).length > 0 ? filter : {};
    };

    // جلب أنواع القات للاستخدام لاحقاً
    const khatTypesList = await db.khatType.findMany();
    const khatTypesMap = new Map(khatTypesList.map(kt => [kt.id, kt]));

    // =============== التقرير العام ===============
    if (reportType === 'general') {
      // جلب الشحنات
      const shipments = await db.shipment.findMany({
        where: buildDateFilter('date'),
        include: {
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

      // جلب المصاريف
      const expenses = await db.expense.findMany({
        where: buildDateFilter('date'),
        orderBy: { date: 'desc' }
      });

      // جلب المعاملات
      const transactions = await db.transaction.findMany({
        where: buildDateFilter('date'),
        orderBy: { date: 'desc' }
      });

      // جلب المدفوعات
      const payments = await db.payment.findMany({
        where: buildDateFilter('date'),
        include: { agent: true },
        orderBy: { date: 'desc' }
      });

      // حساب الإحصائيات
      let totalPieces = 0;
      let totalFees = 0;
      const khatTypeStats: Record<string, { pieces: number; fees: number }> = {};
      const farmerStats: Record<string, { name: string; pieces: number; fees: number }> = {};
      const agentStats: Record<string, { name: string; pieces: number; fees: number; balance: number }> = {};
      const dailyStats: Record<string, { pieces: number; fees: number; shipments: number }> = {};

      shipments.forEach(shipment => {
        const dateKey = shipment.date.toISOString().split('T')[0];
        if (!dailyStats[dateKey]) {
          dailyStats[dateKey] = { pieces: 0, fees: 0, shipments: 0 };
        }
        dailyStats[dateKey].shipments += 1;

        shipment.items.forEach(item => {
          const itemPieces = item.khatDetails.reduce((sum, kd) => sum + kd.pieces, 0);
          const itemFees = item.khatDetails.reduce((sum, kd) => sum + kd.totalFee, 0);

          totalPieces += itemPieces;
          totalFees += itemFees;
          dailyStats[dateKey].pieces += itemPieces;
          dailyStats[dateKey].fees += itemFees;

          // إحصائيات المزارعين
          if (!farmerStats[item.farmerId]) {
            farmerStats[item.farmerId] = {
              name: item.farmer.name,
              pieces: 0,
              fees: 0
            };
          }
          farmerStats[item.farmerId].pieces += itemPieces;
          farmerStats[item.farmerId].fees += itemFees;

          // إحصائيات الوكلاء
          if (!agentStats[item.agentId]) {
            agentStats[item.agentId] = {
              name: item.agent.name,
              pieces: 0,
              fees: 0,
              balance: item.agent.balance
            };
          }
          agentStats[item.agentId].pieces += itemPieces;
          agentStats[item.agentId].fees += itemFees;

          // إحصائيات أنواع القات
          item.khatDetails.forEach(kd => {
            const khatType = khatTypesMap.get(kd.khatTypeId);
            const khatName = khatType?.name || 'غير معروف';
            if (!khatTypeStats[khatName]) {
              khatTypeStats[khatName] = { pieces: 0, fees: 0 };
            }
            khatTypeStats[khatName].pieces += kd.pieces;
            khatTypeStats[khatName].fees += kd.totalFee;
          });
        });
      });

      // حساب المصاريف
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const expensesByCategory: Record<string, number> = {};
      expenses.forEach(e => {
        const catName = e.category === 'SUPPLIES' ? 'مستلزمات' : e.category === 'SALARY' ? 'رواتب' : 'أخرى';
        expensesByCategory[catName] = (expensesByCategory[catName] || 0) + e.amount;
      });

      // حساب الديون
      const agents = await db.agent.findMany();
      const totalAgentDebts = agents.reduce((sum, a) => sum + Math.max(0, a.balance), 0);

      // الديون من المعاملات
      const farmerDebts = transactions
        .filter(t => t.actorType === 'FARMER' && t.type === 'DEBT')
        .reduce((sum, t) => sum + t.amount, 0);
      const farmerPayments = transactions
        .filter(t => t.actorType === 'FARMER' && t.type === 'PAYMENT')
        .reduce((sum, t) => sum + t.amount, 0);

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
          farmerDebts: farmerDebts - farmerPayments,
        },
        khatTypes: Object.entries(khatTypeStats).map(([name, stats]) => ({
          name,
          pieces: stats.pieces,
          fees: stats.fees,
          percentage: totalPieces > 0 ? ((stats.pieces / totalPieces) * 100).toFixed(1) : 0,
        })).sort((a, b) => b.pieces - a.pieces),
        farmers: Object.entries(farmerStats).map(([id, stats]) => ({
          id,
          name: stats.name,
          pieces: stats.pieces,
          fees: stats.fees,
        })).sort((a, b) => b.pieces - a.pieces),
        agents: Object.entries(agentStats).map(([id, stats]) => ({
          id,
          name: stats.name,
          pieces: stats.pieces,
          fees: stats.fees,
          balance: stats.balance,
        })).sort((a, b) => b.fees - a.fees),
        dailyStats: Object.entries(dailyStats).map(([date, stats]) => ({
          date,
          pieces: stats.pieces,
          fees: stats.fees,
          shipments: stats.shipments,
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
        payments: payments.map(p => ({
          id: p.id,
          agentId: p.agentId,
          agentName: p.agent.name,
          amount: p.amount,
          direction: p.direction,
          description: p.description,
          date: p.date.toISOString(),
        })),
        transactions: transactions.map(t => ({
          id: t.id,
          amount: t.amount,
          type: t.type,
          actorType: t.actorType,
          actorName: t.actorName,
          description: t.description,
          date: t.date.toISOString(),
        })),
      });
    }

    // =============== تقرير المزارع ===============
    if (reportType === 'farmer') {
      const farmerId = entityId;

      if (farmerId) {
        // تقرير مزارع محدد
        const farmer = await db.farmer.findUnique({
          where: { id: farmerId }
        });

        if (!farmer) {
          return NextResponse.json({ error: 'المزارع غير موجود' }, { status: 404 });
        }

        const items = await db.shipmentItem.findMany({
          where: {
            farmerId,
            shipment: buildDateFilter('date')
          },
          include: {
            shipment: true,
            agent: true,
            khatDetails: true
          },
          orderBy: { shipment: { date: 'desc' } }
        });

        const transactions = await db.transaction.findMany({
          where: {
            actorType: 'FARMER',
            actorId: farmerId,
            ...buildDateFilter('date')
          },
          orderBy: { date: 'desc' }
        });

        let totalPieces = 0;
        let totalFees = 0;
        const khatTypeStats: Record<string, { pieces: number; fees: number }> = {};
        const agentStats: Record<string, { name: string; pieces: number; fees: number }> = {};
        const dailyStats: Record<string, { pieces: number; fees: number }> = {};

        items.forEach(item => {
          const itemPieces = item.khatDetails.reduce((sum, kd) => sum + kd.pieces, 0);
          const itemFees = item.khatDetails.reduce((sum, kd) => sum + kd.totalFee, 0);
          const dateKey = item.shipment.date.toISOString().split('T')[0];

          totalPieces += itemPieces;
          totalFees += itemFees;

          if (!dailyStats[dateKey]) {
            dailyStats[dateKey] = { pieces: 0, fees: 0 };
          }
          dailyStats[dateKey].pieces += itemPieces;
          dailyStats[dateKey].fees += itemFees;

          // إحصائيات الوكلاء
          if (!agentStats[item.agentId]) {
            agentStats[item.agentId] = {
              name: item.agent.name,
              pieces: 0,
              fees: 0
            };
          }
          agentStats[item.agentId].pieces += itemPieces;
          agentStats[item.agentId].fees += itemFees;

          // إحصائيات أنواع القات
          item.khatDetails.forEach(kd => {
            const khatType = khatTypesMap.get(kd.khatTypeId);
            const khatName = khatType?.name || 'غير معروف';
            if (!khatTypeStats[khatName]) {
              khatTypeStats[khatName] = { pieces: 0, fees: 0 };
            }
            khatTypeStats[khatName].pieces += kd.pieces;
            khatTypeStats[khatName].fees += kd.totalFee;
          });
        });

        const debts = transactions.filter(t => t.type === 'DEBT').reduce((sum, t) => sum + t.amount, 0);
        const payments = transactions.filter(t => t.type === 'PAYMENT').reduce((sum, t) => sum + t.amount, 0);

        return NextResponse.json({
          success: true,
          reportType: 'farmer',
          period,
          dateRange: { from: dateFrom, to: dateTo },
          farmer: {
            id: farmer.id,
            name: farmer.name,
            fullName: farmer.fullName,
            phone: farmer.phone,
          },
          summary: {
            totalShipments: items.length,
            totalPieces,
            totalFees,
            debts: debts - payments,
          },
          khatTypes: Object.entries(khatTypeStats).map(([name, stats]) => ({
            name,
            pieces: stats.pieces,
            fees: stats.fees,
          })).sort((a, b) => b.pieces - a.pieces),
          agents: Object.entries(agentStats).map(([id, stats]) => ({
            id,
            name: stats.name,
            pieces: stats.pieces,
            fees: stats.fees,
          })).sort((a, b) => b.pieces - a.pieces),
          dailyStats: Object.entries(dailyStats).map(([date, stats]) => ({
            date,
            pieces: stats.pieces,
            fees: stats.fees,
          })).sort((a, b) => a.date.localeCompare(b.date)),
          shipments: items.map(item => ({
            id: item.id,
            date: item.shipment.date.toISOString(),
            agentName: item.agent.name,
            totalPieces: item.khatDetails.reduce((sum, kd) => sum + kd.pieces, 0),
            totalFee: item.khatDetails.reduce((sum, kd) => sum + kd.totalFee, 0),
            khatDetails: item.khatDetails.map(kd => {
              const kt = khatTypesMap.get(kd.khatTypeId);
              return {
                khatType: kt?.name || 'غير معروف',
                pieces: kd.pieces,
                feePerPiece: kd.feePerPiece,
                totalFee: kd.totalFee,
              };
            }),
          })),
          transactions: transactions.map(t => ({
            id: t.id,
            amount: t.amount,
            type: t.type,
            description: t.description,
            date: t.date.toISOString(),
          })),
        });
      } else {
        // تقرير جميع المزارعين
        const items = await db.shipmentItem.findMany({
          where: {
            shipment: buildDateFilter('date')
          },
          include: {
            farmer: true,
            khatDetails: true
          }
        });

        const farmerStats: Record<string, {
          id: string;
          name: string;
          pieces: number;
          fees: number;
          shipments: number;
          khatTypes: Record<string, { pieces: number; fees: number }>;
        }> = {};

        items.forEach(item => {
          if (!farmerStats[item.farmerId]) {
            farmerStats[item.farmerId] = {
              id: item.farmerId,
              name: item.farmer.name,
              pieces: 0,
              fees: 0,
              shipments: 0,
              khatTypes: {}
            };
          }

          const itemPieces = item.khatDetails.reduce((sum, kd) => sum + kd.pieces, 0);
          const itemFees = item.khatDetails.reduce((sum, kd) => sum + kd.totalFee, 0);

          farmerStats[item.farmerId].pieces += itemPieces;
          farmerStats[item.farmerId].fees += itemFees;
          farmerStats[item.farmerId].shipments += 1;

          item.khatDetails.forEach(kd => {
            const khatType = khatTypesMap.get(kd.khatTypeId);
            const khatName = khatType?.name || 'غير معروف';
            if (!farmerStats[item.farmerId].khatTypes[khatName]) {
              farmerStats[item.farmerId].khatTypes[khatName] = { pieces: 0, fees: 0 };
            }
            farmerStats[item.farmerId].khatTypes[khatName].pieces += kd.pieces;
            farmerStats[item.farmerId].khatTypes[khatName].fees += kd.totalFee;
          });
        });

        // جلب معاملات المزارعين
        const farmerTransactions = await db.transaction.findMany({
          where: {
            actorType: 'FARMER',
            ...buildDateFilter('date')
          }
        });

        const farmerDebts: Record<string, number> = {};
        farmerTransactions.forEach(t => {
          if (!farmerDebts[t.actorId]) farmerDebts[t.actorId] = 0;
          farmerDebts[t.actorId] += t.type === 'DEBT' ? t.amount : -t.amount;
        });

        return NextResponse.json({
          success: true,
          reportType: 'farmer',
          period,
          dateRange: { from: dateFrom, to: dateTo },
          farmers: Object.values(farmerStats).map(f => ({
            ...f,
            debt: farmerDebts[f.id] || 0,
            khatTypes: Object.entries(f.khatTypes).map(([name, stats]) => ({
              name,
              pieces: stats.pieces,
              fees: stats.fees,
            }))
          })).sort((a, b) => b.pieces - a.pieces),
          summary: {
            totalFarmers: Object.keys(farmerStats).length,
            totalPieces: Object.values(farmerStats).reduce((sum, f) => sum + f.pieces, 0),
            totalFees: Object.values(farmerStats).reduce((sum, f) => sum + f.fees, 0),
          }
        });
      }
    }

    // =============== تقرير الوكيل ===============
    if (reportType === 'agent') {
      const agentId = entityId;

      if (agentId) {
        // تقرير وكيل محدد
        const agent = await db.agent.findUnique({
          where: { id: agentId }
        });

        if (!agent) {
          return NextResponse.json({ error: 'الوكيل غير موجود' }, { status: 404 });
        }

        const items = await db.shipmentItem.findMany({
          where: {
            agentId,
            shipment: buildDateFilter('date')
          },
          include: {
            shipment: true,
            farmer: true,
            khatDetails: true
          },
          orderBy: { shipment: { date: 'desc' } }
        });

        const payments = await db.payment.findMany({
          where: {
            agentId,
            ...buildDateFilter('date')
          },
          orderBy: { date: 'desc' }
        });

        let totalPieces = 0;
        let totalFees = 0;
        const khatTypeStats: Record<string, { pieces: number; fees: number }> = {};
        const farmerStats: Record<string, { name: string; pieces: number; fees: number }> = {};
        const dailyStats: Record<string, { pieces: number; fees: number }> = {};

        items.forEach(item => {
          const itemPieces = item.khatDetails.reduce((sum, kd) => sum + kd.pieces, 0);
          const itemFees = item.khatDetails.reduce((sum, kd) => sum + kd.totalFee, 0);
          const dateKey = item.shipment.date.toISOString().split('T')[0];

          totalPieces += itemPieces;
          totalFees += itemFees;

          if (!dailyStats[dateKey]) {
            dailyStats[dateKey] = { pieces: 0, fees: 0 };
          }
          dailyStats[dateKey].pieces += itemPieces;
          dailyStats[dateKey].fees += itemFees;

          // إحصائيات المزارعين
          if (!farmerStats[item.farmerId]) {
            farmerStats[item.farmerId] = {
              name: item.farmer.name,
              pieces: 0,
              fees: 0
            };
          }
          farmerStats[item.farmerId].pieces += itemPieces;
          farmerStats[item.farmerId].fees += itemFees;

          // إحصائيات أنواع القات
          item.khatDetails.forEach(kd => {
            const khatType = khatTypesMap.get(kd.khatTypeId);
            const khatName = khatType?.name || 'غير معروف';
            if (!khatTypeStats[khatName]) {
              khatTypeStats[khatName] = { pieces: 0, fees: 0 };
            }
            khatTypeStats[khatName].pieces += kd.pieces;
            khatTypeStats[khatName].fees += kd.totalFee;
          });
        });

        const paidAmount = payments.filter(p => p.direction === 'FROM_AGENT').reduce((sum, p) => sum + p.amount, 0);
        const returnedAmount = payments.filter(p => p.direction === 'TO_AGENT').reduce((sum, p) => sum + p.amount, 0);

        return NextResponse.json({
          success: true,
          reportType: 'agent',
          period,
          dateRange: { from: dateFrom, to: dateTo },
          agent: {
            id: agent.id,
            name: agent.name,
            phone: agent.phone,
            balance: agent.balance,
          },
          summary: {
            totalShipments: items.length,
            totalPieces,
            totalFees,
            paidAmount,
            returnedAmount,
            currentBalance: agent.balance,
          },
          khatTypes: Object.entries(khatTypeStats).map(([name, stats]) => ({
            name,
            pieces: stats.pieces,
            fees: stats.fees,
          })).sort((a, b) => b.pieces - a.pieces),
          farmers: Object.entries(farmerStats).map(([id, stats]) => ({
            id,
            name: stats.name,
            pieces: stats.pieces,
            fees: stats.fees,
          })).sort((a, b) => b.pieces - a.pieces),
          dailyStats: Object.entries(dailyStats).map(([date, stats]) => ({
            date,
            pieces: stats.pieces,
            fees: stats.fees,
          })).sort((a, b) => a.date.localeCompare(b.date)),
          shipments: items.map(item => ({
            id: item.id,
            date: item.shipment.date.toISOString(),
            farmerName: item.farmer.name,
            farmerAlias: item.farmerAlias,
            totalPieces: item.khatDetails.reduce((sum, kd) => sum + kd.pieces, 0),
            totalFee: item.khatDetails.reduce((sum, kd) => sum + kd.totalFee, 0),
            khatDetails: item.khatDetails.map(kd => {
              const kt = khatTypesMap.get(kd.khatTypeId);
              return {
                khatType: kt?.name || 'غير معروف',
                pieces: kd.pieces,
                feePerPiece: kd.feePerPiece,
                totalFee: kd.totalFee,
              };
            }),
          })),
          payments: payments.map(p => ({
            id: p.id,
            amount: p.amount,
            direction: p.direction,
            description: p.description,
            date: p.date.toISOString(),
          })),
        });
      } else {
        // تقرير جميع الوكلاء
        const items = await db.shipmentItem.findMany({
          where: {
            shipment: buildDateFilter('date')
          },
          include: {
            agent: true,
            khatDetails: true
          }
        });

        const agents = await db.agent.findMany();

        const agentStats: Record<string, {
          id: string;
          name: string;
          pieces: number;
          fees: number;
          shipments: number;
          balance: number;
          khatTypes: Record<string, { pieces: number; fees: number }>;
        }> = {};

        items.forEach(item => {
          if (!agentStats[item.agentId]) {
            agentStats[item.agentId] = {
              id: item.agentId,
              name: item.agent.name,
              pieces: 0,
              fees: 0,
              shipments: 0,
              balance: item.agent.balance,
              khatTypes: {}
            };
          }

          const itemPieces = item.khatDetails.reduce((sum, kd) => sum + kd.pieces, 0);
          const itemFees = item.khatDetails.reduce((sum, kd) => sum + kd.totalFee, 0);

          agentStats[item.agentId].pieces += itemPieces;
          agentStats[item.agentId].fees += itemFees;
          agentStats[item.agentId].shipments += 1;

          item.khatDetails.forEach(kd => {
            const khatType = khatTypesMap.get(kd.khatTypeId);
            const khatName = khatType?.name || 'غير معروف';
            if (!agentStats[item.agentId].khatTypes[khatName]) {
              agentStats[item.agentId].khatTypes[khatName] = { pieces: 0, fees: 0 };
            }
            agentStats[item.agentId].khatTypes[khatName].pieces += kd.pieces;
            agentStats[item.agentId].khatTypes[khatName].fees += kd.totalFee;
          });
        });

        return NextResponse.json({
          success: true,
          reportType: 'agent',
          period,
          dateRange: { from: dateFrom, to: dateTo },
          agents: Object.values(agentStats).map(a => ({
            ...a,
            khatTypes: Object.entries(a.khatTypes).map(([name, stats]) => ({
              name,
              pieces: stats.pieces,
              fees: stats.fees,
            }))
          })).sort((a, b) => b.fees - a.fees),
          summary: {
            totalAgents: Object.keys(agentStats).length,
            totalPieces: Object.values(agentStats).reduce((sum, a) => sum + a.pieces, 0),
            totalFees: Object.values(agentStats).reduce((sum, a) => sum + a.fees, 0),
            totalDebts: agents.reduce((sum, a) => sum + Math.max(0, a.balance), 0),
          }
        });
      }
    }

    // =============== تقرير نوع القات ===============
    if (reportType === 'khatType') {
      const khatTypeId = entityId;

      if (khatTypeId) {
        // تقرير نوع قات محدد
        const khatType = khatTypesMap.get(khatTypeId);

        if (!khatType) {
          return NextResponse.json({ error: 'نوع القات غير موجود' }, { status: 404 });
        }

        const khatDetails = await db.khatDetail.findMany({
          where: {
            khatTypeId,
            shipmentItem: {
              shipment: buildDateFilter('date')
            }
          },
          include: {
            shipmentItem: {
              include: {
                shipment: true,
                farmer: true,
                agent: true
              }
            }
          },
          orderBy: { shipmentItem: { shipment: { date: 'desc' } } }
        });

        let totalPieces = 0;
        let totalFees = 0;
        const farmerStats: Record<string, { name: string; pieces: number; fees: number }> = {};
        const agentStats: Record<string, { name: string; pieces: number; fees: number }> = {};
        const dailyStats: Record<string, { pieces: number; fees: number }> = {};

        khatDetails.forEach(kd => {
          totalPieces += kd.pieces;
          totalFees += kd.totalFee;

          const dateKey = kd.shipmentItem.shipment.date.toISOString().split('T')[0];
          if (!dailyStats[dateKey]) {
            dailyStats[dateKey] = { pieces: 0, fees: 0 };
          }
          dailyStats[dateKey].pieces += kd.pieces;
          dailyStats[dateKey].fees += kd.totalFee;

          // إحصائيات المزارعين
          if (!farmerStats[kd.shipmentItem.farmerId]) {
            farmerStats[kd.shipmentItem.farmerId] = {
              name: kd.shipmentItem.farmer.name,
              pieces: 0,
              fees: 0
            };
          }
          farmerStats[kd.shipmentItem.farmerId].pieces += kd.pieces;
          farmerStats[kd.shipmentItem.farmerId].fees += kd.totalFee;

          // إحصائيات الوكلاء
          if (!agentStats[kd.shipmentItem.agentId]) {
            agentStats[kd.shipmentItem.agentId] = {
              name: kd.shipmentItem.agent.name,
              pieces: 0,
              fees: 0
            };
          }
          agentStats[kd.shipmentItem.agentId].pieces += kd.pieces;
          agentStats[kd.shipmentItem.agentId].fees += kd.totalFee;
        });

        return NextResponse.json({
          success: true,
          reportType: 'khatType',
          period,
          dateRange: { from: dateFrom, to: dateTo },
          khatType: {
            id: khatType.id,
            name: khatType.name,
            feePerPiece: khatType.feePerPiece,
          },
          summary: {
            totalPieces,
            totalFees,
            avgFeePerPiece: totalPieces > 0 ? totalFees / totalPieces : 0,
          },
          farmers: Object.entries(farmerStats).map(([id, stats]) => ({
            id,
            name: stats.name,
            pieces: stats.pieces,
            fees: stats.fees,
          })).sort((a, b) => b.pieces - a.pieces),
          agents: Object.entries(agentStats).map(([id, stats]) => ({
            id,
            name: stats.name,
            pieces: stats.pieces,
            fees: stats.fees,
          })).sort((a, b) => b.pieces - a.pieces),
          dailyStats: Object.entries(dailyStats).map(([date, stats]) => ({
            date,
            pieces: stats.pieces,
            fees: stats.fees,
          })).sort((a, b) => a.date.localeCompare(b.date)),
          details: khatDetails.map(kd => ({
            id: kd.id,
            date: kd.shipmentItem.shipment.date.toISOString(),
            farmerName: kd.shipmentItem.farmer.name,
            agentName: kd.shipmentItem.agent.name,
            pieces: kd.pieces,
            feePerPiece: kd.feePerPiece,
            totalFee: kd.totalFee,
          })),
        });
      } else {
        // تقرير جميع أنواع القات
        const khatDetails = await db.khatDetail.findMany({
          where: {
            shipmentItem: {
              shipment: buildDateFilter('date')
            }
          },
          include: {
            shipmentItem: {
              include: {
                farmer: true,
                agent: true
              }
            }
          }
        });

        const khatTypeStats: Record<string, {
          id: string;
          name: string;
          feePerPiece: number;
          pieces: number;
          fees: number;
          farmers: Record<string, { name: string; pieces: number }>;
          agents: Record<string, { name: string; pieces: number }>;
        }> = {};

        khatDetails.forEach(kd => {
          const khatType = khatTypesMap.get(kd.khatTypeId);
          const khatId = kd.khatTypeId;
          if (!khatTypeStats[khatId]) {
            khatTypeStats[khatId] = {
              id: khatId,
              name: khatType?.name || 'غير معروف',
              feePerPiece: kd.feePerPiece,
              pieces: 0,
              fees: 0,
              farmers: {},
              agents: {}
            };
          }

          khatTypeStats[khatId].pieces += kd.pieces;
          khatTypeStats[khatId].fees += kd.totalFee;

          // المزارعين
          const farmerId = kd.shipmentItem.farmerId;
          if (!khatTypeStats[khatId].farmers[farmerId]) {
            khatTypeStats[khatId].farmers[farmerId] = {
              name: kd.shipmentItem.farmer.name,
              pieces: 0
            };
          }
          khatTypeStats[khatId].farmers[farmerId].pieces += kd.pieces;

          // الوكلاء
          const agentId = kd.shipmentItem.agentId;
          if (!khatTypeStats[khatId].agents[agentId]) {
            khatTypeStats[khatId].agents[agentId] = {
              name: kd.shipmentItem.agent.name,
              pieces: 0
            };
          }
          khatTypeStats[khatId].agents[agentId].pieces += kd.pieces;
        });

        return NextResponse.json({
          success: true,
          reportType: 'khatType',
          period,
          dateRange: { from: dateFrom, to: dateTo },
          khatTypes: Object.values(khatTypeStats).map(kt => ({
            ...kt,
            farmers: Object.entries(kt.farmers).map(([id, data]) => ({
              id,
              name: data.name,
              pieces: data.pieces,
            })).sort((a, b) => b.pieces - a.pieces),
            agents: Object.entries(kt.agents).map(([id, data]) => ({
              id,
              name: data.name,
              pieces: data.pieces,
            })).sort((a, b) => b.pieces - a.pieces),
          })).sort((a, b) => b.pieces - a.pieces),
          summary: {
            totalKhatTypes: Object.keys(khatTypeStats).length,
            totalPieces: Object.values(khatTypeStats).reduce((sum, kt) => sum + kt.pieces, 0),
            totalFees: Object.values(khatTypeStats).reduce((sum, kt) => sum + kt.fees, 0),
          }
        });
      }
    }

    // =============== تقرير المصاريف ===============
    if (reportType === 'expense') {
      const expenses = await db.expense.findMany({
        where: buildDateFilter('date'),
        orderBy: { date: 'desc' }
      });

      const transactions = await db.transaction.findMany({
        where: {
          ...buildDateFilter('date'),
          type: 'PAYMENT'
        },
        orderBy: { date: 'desc' }
      });

      // تصنيف المصاريف
      const byCategory: Record<string, { total: number; items: any[] }> = {
        'مستلزمات': { total: 0, items: [] },
        'رواتب': { total: 0, items: [] },
        'أخرى': { total: 0, items: [] },
        'مزارعين': { total: 0, items: [] },
        'وكلاء': { total: 0, items: [] },
      };

      expenses.forEach(e => {
        const catName = e.category === 'SUPPLIES' ? 'مستلزمات' : e.category === 'SALARY' ? 'رواتب' : 'أخرى';
        byCategory[catName].total += e.amount;
        byCategory[catName].items.push({
          id: e.id,
          description: e.description,
          amount: e.amount,
          date: e.date.toISOString(),
        });
      });

      transactions.forEach(t => {
        if (t.actorType === 'FARMER') {
          byCategory['مزارعين'].total += t.amount;
          byCategory['مزارعين'].items.push({
            id: t.id,
            description: t.description || `دفعات للمزارع ${t.actorName}`,
            amount: t.amount,
            date: t.date.toISOString(),
          });
        } else if (t.actorType === 'AGENT') {
          byCategory['وكلاء'].total += t.amount;
          byCategory['وكلاء'].items.push({
            id: t.id,
            description: t.description || `دفعات للوكيل ${t.actorName}`,
            amount: t.amount,
            date: t.date.toISOString(),
          });
        }
      });

      const totalExpenses = Object.values(byCategory).reduce((sum, cat) => sum + cat.total, 0);

      // مصاريف يومية
      const dailyExpenses: Record<string, { total: number; items: any[] }> = {};
      expenses.forEach(e => {
        const dateKey = e.date.toISOString().split('T')[0];
        if (!dailyExpenses[dateKey]) {
          dailyExpenses[dateKey] = { total: 0, items: [] };
        }
        dailyExpenses[dateKey].total += e.amount;
        dailyExpenses[dateKey].items.push({
          description: e.description,
          amount: e.amount,
          category: e.category,
        });
      });

      return NextResponse.json({
        success: true,
        reportType: 'expense',
        period,
        dateRange: { from: dateFrom, to: dateTo },
        summary: {
          totalExpenses,
          workExpenses: byCategory['مستلزمات'].total + byCategory['رواتب'].total + byCategory['أخرى'].total,
          farmerPayments: byCategory['مزارعين'].total,
          agentPayments: byCategory['وكلاء'].total,
        },
        byCategory: Object.entries(byCategory)
          .filter(([_, data]) => data.total > 0)
          .map(([name, data]) => ({
            name,
            total: data.total,
            count: data.items.length,
          })),
        dailyExpenses: Object.entries(dailyExpenses)
          .map(([date, data]) => ({
            date,
            total: data.total,
            count: data.items.length,
          }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        expenses: expenses.map(e => ({
          id: e.id,
          description: e.description,
          amount: e.amount,
          category: e.category === 'SUPPLIES' ? 'مستلزمات' : e.category === 'SALARY' ? 'رواتب' : 'أخرى',
          date: e.date.toISOString(),
        })),
      });
    }

    return NextResponse.json({ error: 'نوع التقرير غير صالح' }, { status: 400 });

  } catch (error) {
    console.error('Error generating detailed report:', error);
    return NextResponse.json({ error: 'فشل في إنشاء التقرير' }, { status: 500 });
  }
}
