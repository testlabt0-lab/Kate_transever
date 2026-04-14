import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const agentId = searchParams.get('agentId');
    const farmerId = searchParams.get('farmerId');

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    // Build shipment filter
    const shipmentWhere: {
      date?: { gte?: Date; lte?: Date };
    } = {};
    if (Object.keys(dateFilter).length > 0) {
      shipmentWhere.date = dateFilter;
    }

    // Get shipments with items
    const shipments = await db.shipment.findMany({
      where: shipmentWhere,
      include: {
        items: {
          include: {
            farmer: { select: { id: true, name: true } },
            agent: { select: { id: true, name: true } },
            khatDetails: {
              include: {
                khatType: { select: { id: true, name: true } }
              }
            }
          }
        }
      },
      orderBy: { date: 'desc' },
    });

    // Filter by agent or farmer if specified
    let filteredShipments = shipments;
    if (agentId) {
      filteredShipments = shipments.filter(s =>
        s.items.some(item => item.agentId === agentId)
      );
    }
    if (farmerId) {
      filteredShipments = shipments.filter(s =>
        s.items.some(item => item.farmerId === farmerId)
      );
    }

    // Get expenses
    const expenseWhere: { date?: { gte?: Date; lte?: Date } } = {};
    if (Object.keys(dateFilter).length > 0) {
      expenseWhere.date = dateFilter;
    }
    const expenses = await db.expense.findMany({
      where: expenseWhere,
      orderBy: { date: 'desc' },
    });

    // Get all agents and farmers
    const agents = await db.agent.findMany({
      select: { id: true, name: true, balance: true },
    });
    const farmers = await db.farmer.findMany({
      select: { id: true, name: true },
    });

    // Calculate totals from shipment items
    let totalRevenue = 0;
    let totalPieces = 0;

    const shipmentReports: any[] = [];
    const khatTypeStats: Record<string, { pieces: number; commission: number }> = {};
    const agentStats: Record<string, { name: string; shipments: number; commission: number; balance: number }> = {};
    const farmerStats: Record<string, { name: string; shipments: number }> = {};
    const salesByDate: Record<string, { total: number; count: number }> = {};

    filteredShipments.forEach(shipment => {
      const shipmentItems: any[] = [];
      let shipmentTotal = 0;
      let shipmentPieces = 0;
      const shipmentAgents = new Set<string>();
      const shipmentFarmers = new Set<string>();

      shipment.items.forEach(item => {
        // Calculate item total from khat details
        const itemTotal = item.khatDetails.reduce((sum, kd) => sum + kd.totalFee, 0);
        const itemPieces = item.khatDetails.reduce((sum, kd) => sum + kd.pieces, 0);

        shipmentTotal += itemTotal;
        shipmentPieces += itemPieces;
        totalRevenue += itemTotal;
        totalPieces += itemPieces;

        // Track khat types
        item.khatDetails.forEach(kd => {
          const khatName = kd.khatType?.name || 'غير معروف';
          if (!khatTypeStats[khatName]) {
            khatTypeStats[khatName] = { pieces: 0, commission: 0 };
          }
          khatTypeStats[khatName].pieces += kd.pieces;
          khatTypeStats[khatName].commission += kd.totalFee;

          shipmentItems.push({
            khatTypeName: khatName,
            pieces: kd.pieces,
            feePerPiece: kd.feePerPiece,
            totalFee: kd.totalFee,
          });
        });

        // Track agent stats
        const agentName = item.agent?.name || 'غير معروف';
        if (!agentStats[item.agentId]) {
          agentStats[item.agentId] = {
            name: agentName,
            shipments: 0,
            commission: 0,
            balance: agents.find(a => a.id === item.agentId)?.balance || 0
          };
        }
        agentStats[item.agentId].shipments += 1;
        agentStats[item.agentId].commission += itemTotal;

        // Track farmer stats
        const farmerName = item.farmer?.name || 'غير معروف';
        if (!farmerStats[item.farmerId]) {
          farmerStats[item.farmerId] = { name: farmerName, shipments: 0 };
        }
        farmerStats[item.farmerId].shipments += 1;

        shipmentAgents.add(agentName);
        shipmentFarmers.add(farmerName);
      });

      // Group sales by date
      const dateKey = shipment.date.toISOString().split('T')[0];
      if (!salesByDate[dateKey]) {
        salesByDate[dateKey] = { total: 0, count: 0 };
      }
      salesByDate[dateKey].total += shipmentTotal;
      salesByDate[dateKey].count += 1;

      // Create shipment report
      shipmentReports.push({
        id: shipment.id,
        date: shipment.date.toISOString(),
        farmerNames: Array.from(shipmentFarmers).join('، '),
        agentNames: Array.from(shipmentAgents).join('، '),
        totalPieces: shipmentPieces,
        totalFee: shipmentTotal,
        status: shipment.status,
        items: shipmentItems,
      });
    });

    // Calculate expense totals
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalProfit = totalRevenue - totalExpenses;

    // Calculate agent debts
    const totalAgentDebts = agents.reduce((sum, a) => sum + Math.abs(a.balance), 0);

    // Format sales data
    const salesData = Object.entries(salesByDate)
      .map(([date, data]) => ({
        date,
        total: data.total,
        count: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Group expenses by category
    const expensesByCategoryObj: Record<string, number> = {
      'مستلزمات': 0,
      'رواتب': 0,
      'أخرى': 0,
    };
    expenses.forEach((e) => {
      if (e.category === 'SUPPLIES') expensesByCategoryObj['مستلزمات'] += e.amount;
      else if (e.category === 'SALARY') expensesByCategoryObj['رواتب'] += e.amount;
      else expensesByCategoryObj['أخرى'] += e.amount;
    });

    const expensesByCategory = Object.entries(expensesByCategoryObj)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    // Format expense reports
    const expenseReports = expenses.map((e) => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      category: e.category,
      date: e.date.toISOString(),
    }));

    // Format khat type data
    const byKhatType = Object.entries(khatTypeStats)
      .map(([name, stats]) => ({
        name,
        quantity: stats.pieces,
        commission: stats.commission,
      }))
      .sort((a, b) => b.quantity - a.quantity);

    // Calculate profit data by date
    const profitByDate: Record<string, { revenue: number; expenses: number }> = {};

    // Add revenue by date
    filteredShipments.forEach((s) => {
      const dateKey = s.date.toISOString().split('T')[0];
      const shipmentRevenue = s.items.reduce((sum, item) =>
        sum + item.khatDetails.reduce((s, kd) => s + kd.totalFee, 0), 0
      );
      if (!profitByDate[dateKey]) {
        profitByDate[dateKey] = { revenue: 0, expenses: 0 };
      }
      profitByDate[dateKey].revenue += shipmentRevenue;
    });

    // Add expenses by date
    expenses.forEach((e) => {
      const dateKey = e.date.toISOString().split('T')[0];
      if (!profitByDate[dateKey]) {
        profitByDate[dateKey] = { revenue: 0, expenses: 0 };
      }
      profitByDate[dateKey].expenses += e.amount;
    });

    const profitData = Object.entries(profitByDate)
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        expenses: data.expenses,
        profit: data.revenue - data.expenses,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Format agent reports
    const agentReports = Object.entries(agentStats).map(([id, data]) => ({
      id,
      name: data.name,
      totalShipments: data.shipments,
      totalCommission: data.commission,
      balance: data.balance,
    })).sort((a, b) => b.totalCommission - a.totalCommission);

    // Format farmer reports
    const farmerReports = Object.entries(farmerStats).map(([id, data]) => ({
      id,
      name: data.name,
      totalShipments: data.shipments,
      balance: 0, // Farmers don't have balance in this system
    }));

    return NextResponse.json({
      shipments: shipmentReports,
      salesData,
      expenses: expenseReports,
      profitData,
      agents: agentReports,
      farmers: farmerReports,
      summary: {
        totalShipments: filteredShipments.length,
        totalRevenue,
        totalExpenses,
        totalProfit,
        totalAgentDebts,
        totalFarmerDebts: 0,
        totalPieces,
      },
      byKhatType,
      expensesByCategory,
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'فشل في تحميل التقارير' }, { status: 500 });
  }
}
