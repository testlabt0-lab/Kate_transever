import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DebtStatus, Prisma } from '@prisma/client';

// أنواع البيانات
interface DebtPaymentInput {
  amount: number;
  date?: string;
  method?: string;
  notes?: string;
}

interface CreateDebtBody {
  debtorType: string;
  debtorId: string;
  debtorName: string;
  amount: number;
  dueDate?: string;
  status?: DebtStatus;
  description?: string;
}

interface UpdateDebtBody {
  debtorName?: string;
  amount?: number;
  remainingAmount?: number;
  dueDate?: string | null;
  status?: DebtStatus;
  description?: string;
}

interface AddPaymentBody {
  payment: DebtPaymentInput;
}

interface GetDebtsQuery {
  status?: DebtStatus;
  debtorType?: string;
  debtorId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  overdue?: string;
}

// GET - جلب جميع الديون
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const query: GetDebtsQuery = {
      status: searchParams.get('status') as DebtStatus || undefined,
      debtorType: searchParams.get('debtorType') || undefined,
      debtorId: searchParams.get('debtorId') || undefined,
      fromDate: searchParams.get('fromDate') || undefined,
      toDate: searchParams.get('toDate') || undefined,
      search: searchParams.get('search') || undefined,
      overdue: searchParams.get('overdue') || undefined,
    };

    const where: Prisma.DebtWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.debtorType) {
      where.debtorType = query.debtorType;
    }

    if (query.debtorId) {
      where.debtorId = query.debtorId;
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

    if (query.overdue === 'true') {
      where.status = DebtStatus.OVERDUE;
      where.dueDate = { lt: new Date() };
    }

    if (query.search) {
      where.OR = [
        { debtorName: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }

    const debts = await db.debt.findMany({
      where,
      include: {
        payments: {
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // حساب الإحصائيات
    const stats = {
      totalDebts: debts.length,
      totalAmount: debts.reduce((sum, debt) => sum + debt.amount, 0),
      totalRemaining: debts.reduce((sum, debt) => sum + debt.remainingAmount, 0),
      totalPaid: debts.reduce((sum, debt) => sum + (debt.amount - debt.remainingAmount), 0),
      byStatus: {
        pending: debts.filter(d => d.status === DebtStatus.PENDING).length,
        partial: debts.filter(d => d.status === DebtStatus.PARTIAL).length,
        paid: debts.filter(d => d.status === DebtStatus.PAID).length,
        overdue: debts.filter(d => d.status === DebtStatus.OVERDUE).length,
        cancelled: debts.filter(d => d.status === DebtStatus.CANCELLED).length,
      },
    };

    return NextResponse.json({
      success: true,
      data: debts,
      stats,
    });
  } catch (error) {
    console.error('خطأ في جلب الديون:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء جلب الديون' },
      { status: 500 }
    );
  }
}

// POST - إنشاء دين جديد أو إضافة دفعة
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // التحقق مما إذا كان الطلب لإضافة دفعة لدين موجود
    if (body.debtId && body.payment) {
      return await addPaymentToDebt(body.debtId, body.payment);
    }

    // إنشاء دين جديد
    const debtData: CreateDebtBody = body;

    // التحقق من البيانات المطلوبة
    if (!debtData.debtorType || debtData.debtorType.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'نوع المديون مطلوب' },
        { status: 400 }
      );
    }

    if (!debtData.debtorId || debtData.debtorId.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'معرف المديون مطلوب' },
        { status: 400 }
      );
    }

    if (!debtData.debtorName || debtData.debtorName.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'اسم المديون مطلوب' },
        { status: 400 }
      );
    }

    if (!debtData.amount || debtData.amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'المبلغ يجب أن يكون أكبر من صفر' },
        { status: 400 }
      );
    }

    // تحديد حالة الدين
    let status = debtData.status || DebtStatus.PENDING;

    // التحقق من تاريخ الاستحقاق
    if (debtData.dueDate) {
      const dueDate = new Date(debtData.dueDate);
      if (dueDate < new Date()) {
        status = DebtStatus.OVERDUE;
      }
    }

    const debt = await db.debt.create({
      data: {
        debtorType: debtData.debtorType,
        debtorId: debtData.debtorId,
        debtorName: debtData.debtorName,
        amount: debtData.amount,
        remainingAmount: debtData.amount,
        dueDate: debtData.dueDate ? new Date(debtData.dueDate) : null,
        status,
        description: debtData.description,
      },
      include: {
        payments: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: debt,
      message: 'تم إنشاء الدين بنجاح',
    });
  } catch (error) {
    console.error('خطأ في إنشاء الدين:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء إنشاء الدين' },
      { status: 500 }
    );
  }
}

// PUT - تحديث دين موجود
export async function PUT(request: NextRequest) {
  try {
    const body: UpdateDebtBody & { id: string } = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'معرف الدين مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من وجود الدين
    const existingDebt = await db.debt.findUnique({
      where: { id: body.id },
    });

    if (!existingDebt) {
      return NextResponse.json(
        { success: false, error: 'الدين غير موجود' },
        { status: 404 }
      );
    }

    // إعداد بيانات التحديث
    const updateData: Prisma.DebtUpdateInput = {};

    if (body.debtorName) {
      updateData.debtorName = body.debtorName;
    }

    if (body.amount !== undefined) {
      updateData.amount = body.amount;
    }

    if (body.remainingAmount !== undefined) {
      updateData.remainingAmount = body.remainingAmount;
    }

    if (body.dueDate !== undefined) {
      updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }

    if (body.status) {
      updateData.status = body.status;
    }

    if (body.description !== undefined) {
      updateData.description = body.description;
    }

    // تحديث الدين
    const debt = await db.debt.update({
      where: { id: body.id },
      data: updateData,
      include: {
        payments: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: debt,
      message: 'تم تحديث الدين بنجاح',
    });
  } catch (error) {
    console.error('خطأ في تحديث الدين:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { success: false, error: 'الدين غير موجود' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء تحديث الدين' },
      { status: 500 }
    );
  }
}

// دالة مساعدة لإضافة دفعة لدين
async function addPaymentToDebt(debtId: string, paymentData: DebtPaymentInput) {
  // التحقق من البيانات
  if (!paymentData.amount || paymentData.amount <= 0) {
    return NextResponse.json(
      { success: false, error: 'مبلغ الدفعة يجب أن يكون أكبر من صفر' },
      { status: 400 }
    );
  }

  // جلب الدين
  const debt = await db.debt.findUnique({
    where: { id: debtId },
    include: { payments: true },
  });

  if (!debt) {
    return NextResponse.json(
      { success: false, error: 'الدين غير موجود' },
      { status: 404 }
    );
  }

  if (debt.status === DebtStatus.PAID || debt.status === DebtStatus.CANCELLED) {
    return NextResponse.json(
      { success: false, error: 'لا يمكن إضافة دفعة لدين مدفوع أو ملغي' },
      { status: 400 }
    );
  }

  // التحقق من أن المبلغ لا يتجاوز المتبقي
  if (paymentData.amount > debt.remainingAmount) {
    return NextResponse.json(
      { success: false, error: `مبلغ الدفعة يتجاوز المبلغ المتبقي (${debt.remainingAmount})` },
      { status: 400 }
    );
  }

  // إنشاء الدفعة
  const payment = await db.debtPayment.create({
    data: {
      debtId,
      amount: paymentData.amount,
      date: paymentData.date ? new Date(paymentData.date) : new Date(),
      method: paymentData.method,
      notes: paymentData.notes,
    },
  });

  // تحديث الدين
  const newRemainingAmount = debt.remainingAmount - paymentData.amount;
  let newStatus = debt.status;

  if (newRemainingAmount <= 0) {
    newStatus = DebtStatus.PAID;
  } else if (newRemainingAmount < debt.amount) {
    newStatus = DebtStatus.PARTIAL;
  }

  const updatedDebt = await db.debt.update({
    where: { id: debtId },
    data: {
      remainingAmount: newRemainingAmount,
      status: newStatus,
    },
    include: {
      payments: {
        orderBy: { date: 'desc' },
      },
    },
  });

  return NextResponse.json({
    success: true,
    data: updatedDebt,
    payment,
    message: 'تم إضافة الدفعة بنجاح',
  });
}
