import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - جلب جميع بيانات الرواكب
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    // جلب المخزون
    if (action === 'inventory') {
      const inventory = await db.rawakibInventory.findMany({
        orderBy: { size: 'asc' }
      });

      // التأكد من وجود سجلات لجميع الأحجام
      const sizes = ['LARGE', 'MEDIUM', 'SMALL'];
      for (const size of sizes) {
        const exists = inventory.find(i => i.size === size);
        if (!exists) {
          await db.rawakibInventory.create({
            data: {
              size: size as any,
              totalPurchased: 0,
              totalDistributed: 0,
              remaining: 0
            }
          });
        }
      }

      const updatedInventory = await db.rawakibInventory.findMany({
        orderBy: { size: 'asc' }
      });

      return NextResponse.json({ inventory: updatedInventory });
    }

    // جلب المشتريات
    if (action === 'purchases') {
      const purchases = await db.rawakibPurchase.findMany({
        include: {
          items: true
        },
        orderBy: { date: 'desc' }
      });

      const totalStats = {
        totalPurchases: purchases.length,
        totalQuantity: purchases.reduce((sum, p) => sum + p.totalQuantity, 0),
        totalCost: purchases.reduce((sum, p) => sum + p.totalCost, 0)
      };

      return NextResponse.json({ purchases, stats: totalStats });
    }

    // جلب التوزيعات
    if (action === 'distributions') {
      const distributions = await db.rawakibDistribution.findMany({
        include: {
          farmer: {
            select: { id: true, name: true, phone: true }
          },
          items: true
        },
        orderBy: { date: 'desc' }
      });

      const totalStats = {
        totalDistributions: distributions.length,
        totalQuantity: distributions.reduce((sum, d) => sum + d.totalQuantity, 0),
        totalCost: distributions.reduce((sum, d) => sum + d.totalCost, 0),
        totalCredit: distributions.filter(d => d.paymentType === 'CREDIT' && !d.isPaid)
          .reduce((sum, d) => sum + d.totalCost, 0)
      };

      return NextResponse.json({ distributions, stats: totalStats });
    }

    // جلب ديون المزارعين من الرواكب
    if (action === 'farmer-debts') {
      const farmerId = searchParams.get('farmerId');

      const where: any = {
        paymentType: 'CREDIT',
        isPaid: false
      };

      if (farmerId) {
        where.farmerId = farmerId;
      }

      const debts = await db.rawakibDistribution.findMany({
        where,
        include: {
          farmer: {
            select: { id: true, name: true, phone: true }
          },
          items: true
        },
        orderBy: { date: 'desc' }
      });

      // تجميع الديون حسب المزارع
      const farmerDebts = debts.reduce((acc, d) => {
        const farmerId = d.farmer.id;
        if (!acc[farmerId]) {
          acc[farmerId] = {
            farmer: d.farmer,
            totalDebt: 0,
            distributions: []
          };
        }
        acc[farmerId].totalDebt += d.totalCost;
        acc[farmerId].distributions.push(d);
        return acc;
      }, {} as any);

      return NextResponse.json({
        farmerDebts: Object.values(farmerDebts),
        totalDebt: debts.reduce((sum, d) => sum + d.totalCost, 0)
      });
    }

    // الإحصائيات العامة
    const inventory = await db.rawakibInventory.findMany();
    const purchasesCount = await db.rawakibPurchase.count();
    const distributionsCount = await db.rawakibDistribution.count();

    const purchasesSum = await db.rawakibPurchase.aggregate({
      _sum: { totalQuantity: true, totalCost: true }
    });

    const distributionsSum = await db.rawakibDistribution.aggregate({
      _sum: { totalQuantity: true, totalCost: true }
    });

    const creditDebts = await db.rawakibDistribution.aggregate({
      where: { paymentType: 'CREDIT', isPaid: false },
      _sum: { totalCost: true }
    });

    return NextResponse.json({
      inventory,
      stats: {
        purchasesCount,
        distributionsCount,
        totalPurchased: purchasesSum._sum.totalQuantity || 0,
        totalPurchasedCost: purchasesSum._sum.totalCost || 0,
        totalDistributed: distributionsSum._sum.totalQuantity || 0,
        totalDistributedCost: distributionsSum._sum.totalCost || 0,
        totalCreditDebt: creditDebts._sum.totalCost || 0
      }
    });

  } catch (error) {
    console.error('Error fetching rawakib data:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب البيانات' }, { status: 500 });
  }
}

// POST - إنشاء عملية جديدة
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    // شراء رواكب
    if (type === 'purchase') {
      const { supplierName, notes, items } = data;

      if (!items || items.length === 0) {
        return NextResponse.json({ error: 'يجب إضافة عنصر واحد على الأقل' }, { status: 400 });
      }

      // حساب الإجماليات
      const totalQuantity = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
      const totalCost = items.reduce((sum: number, item: any) => sum + (item.quantity * item.pricePerPiece), 0);

      // إنشاء عملية الشراء
      const purchase = await db.rawakibPurchase.create({
        data: {
          supplierName: supplierName || null,
          notes: notes || null,
          totalQuantity,
          totalCost,
          items: {
            create: items.map((item: any) => ({
              size: item.size,
              quantity: item.quantity,
              pricePerPiece: item.pricePerPiece,
              totalCost: item.quantity * item.pricePerPiece,
              notes: item.notes || null
            }))
          }
        },
        include: { items: true }
      });

      // تحديث المخزون
      for (const item of items) {
        await db.rawakibInventory.upsert({
          where: { size: item.size },
          create: {
            size: item.size,
            totalPurchased: item.quantity,
            totalDistributed: 0,
            remaining: item.quantity
          },
          update: {
            totalPurchased: { increment: item.quantity },
            remaining: { increment: item.quantity }
          }
        });
      }

      return NextResponse.json({ success: true, purchase });
    }

    // توزيع رواكب
    if (type === 'distribution') {
      const { farmerId, paymentType, notes, items, isPaid } = data;

      if (!farmerId) {
        return NextResponse.json({ error: 'المزارع مطلوب' }, { status: 400 });
      }

      if (!items || items.length === 0) {
        return NextResponse.json({ error: 'يجب إضافة عنصر واحد على الأقل' }, { status: 400 });
      }

      // التحقق من المخزون
      for (const item of items) {
        const inventory = await db.rawakibInventory.findUnique({
          where: { size: item.size }
        });

        if (!inventory || inventory.remaining < item.quantity) {
          return NextResponse.json({
            error: `الكمية غير كافية للحجم ${item.size === 'LARGE' ? 'الكبير' : item.size === 'MEDIUM' ? 'المتوسط' : 'الصغير'}. المتبقي: ${inventory?.remaining || 0}`
          }, { status: 400 });
        }
      }

      // حساب الإجماليات
      const totalQuantity = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
      const totalCost = items.reduce((sum: number, item: any) => sum + (item.quantity * item.pricePerPiece), 0);

      // إنشاء التوزيع
      const distribution = await db.rawakibDistribution.create({
        data: {
          farmerId,
          paymentType: paymentType || 'CASH',
          notes: notes || null,
          totalQuantity,
          totalCost,
          isPaid: paymentType === 'CASH' ? true : (isPaid || false),
          paidAt: paymentType === 'CASH' ? new Date() : null,
          items: {
            create: items.map((item: any) => ({
              size: item.size,
              quantity: item.quantity,
              pricePerPiece: item.pricePerPiece,
              totalCost: item.quantity * item.pricePerPiece,
              notes: item.notes || null
            }))
          }
        },
        include: {
          farmer: true,
          items: true
        }
      });

      // تحديث المخزون
      for (const item of items) {
        await db.rawakibInventory.update({
          where: { size: item.size },
          data: {
            totalDistributed: { increment: item.quantity },
            remaining: { decrement: item.quantity }
          }
        });
      }

      return NextResponse.json({ success: true, distribution });
    }

    return NextResponse.json({ error: 'نوع العملية غير صالح' }, { status: 400 });

  } catch (error) {
    console.error('Error creating rawakib operation:', error);
    return NextResponse.json({ error: 'حدث خطأ في إنشاء العملية' }, { status: 500 });
  }
}

// PUT - تحديث عملية
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id, data } = body;

    // تسديد دين
    if (type === 'pay-debt') {
      const distribution = await db.rawakibDistribution.update({
        where: { id },
        data: {
          isPaid: true,
          paidAt: new Date()
        }
      });

      return NextResponse.json({ success: true, distribution });
    }

    return NextResponse.json({ error: 'نوع العملية غير صالح' }, { status: 400 });

  } catch (error) {
    console.error('Error updating rawakib:', error);
    return NextResponse.json({ error: 'حدث خطأ في التحديث' }, { status: 500 });
  }
}

// DELETE - حذف عملية
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });
    }

    // حذف عملية شراء
    if (type === 'purchase') {
      const purchase = await db.rawakibPurchase.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!purchase) {
        return NextResponse.json({ error: 'العملية غير موجودة' }, { status: 404 });
      }

      // إرجاع الكمية للمخزون
      for (const item of purchase.items) {
        await db.rawakibInventory.update({
          where: { size: item.size },
          data: {
            totalPurchased: { decrement: item.quantity },
            remaining: { decrement: item.quantity }
          }
        });
      }

      await db.rawakibPurchase.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    // حذف توزيع
    if (type === 'distribution') {
      const distribution = await db.rawakibDistribution.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!distribution) {
        return NextResponse.json({ error: 'العملية غير موجودة' }, { status: 404 });
      }

      // إرجاع الكمية للمخزون
      for (const item of distribution.items) {
        await db.rawakibInventory.update({
          where: { size: item.size },
          data: {
            totalDistributed: { decrement: item.quantity },
            remaining: { increment: item.quantity }
          }
        });
      }

      await db.rawakibDistribution.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'نوع العملية غير صالح' }, { status: 400 });

  } catch (error) {
    console.error('Error deleting rawakib:', error);
    return NextResponse.json({ error: 'حدث خطأ في الحذف' }, { status: 500 });
  }
}
