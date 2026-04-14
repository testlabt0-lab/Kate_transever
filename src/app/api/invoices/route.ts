import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { InvoiceStatus, Prisma } from '@prisma/client';

// أنواع البيانات
interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  shipmentId?: string;
}

interface CreateInvoiceBody {
  invoiceNumber?: string;
  date?: string;
  dueDate?: string;
  status?: InvoiceStatus;
  customerId?: string;
  customerType?: string;
  customerName: string;
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  paidAmount?: number;
  notes?: string;
  items: InvoiceItemInput[];
}

interface GetInvoicesQuery {
  status?: InvoiceStatus;
  customerId?: string;
  customerType?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

// GET - جلب جميع الفواتير
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const query: GetInvoicesQuery = {
      status: searchParams.get('status') as InvoiceStatus || undefined,
      customerId: searchParams.get('customerId') || undefined,
      customerType: searchParams.get('customerType') || undefined,
      fromDate: searchParams.get('fromDate') || undefined,
      toDate: searchParams.get('toDate') || undefined,
      search: searchParams.get('search') || undefined,
    };

    const where: Prisma.InvoiceWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.customerType) {
      where.customerType = query.customerType;
    }

    if (query.fromDate || query.toDate) {
      where.date = {};
      if (query.fromDate) {
        where.date.gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        where.date.lte = new Date(query.toDate);
      }
    }

    if (query.search) {
      where.OR = [
        { invoiceNumber: { contains: query.search } },
        { customerName: { contains: query.search } },
        { notes: { contains: query.search } },
      ];
    }

    const invoices = await db.invoice.findMany({
      where,
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: invoices,
      count: invoices.length,
    });
  } catch (error) {
    console.error('خطأ في جلب الفواتير:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء جلب الفواتير' },
      { status: 500 }
    );
  }
}

// POST - إنشاء فاتورة جديدة
export async function POST(request: NextRequest) {
  try {
    const body: CreateInvoiceBody = await request.json();

    // التحقق من البيانات المطلوبة
    if (!body.customerName || body.customerName.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'اسم العميل مطلوب' },
        { status: 400 }
      );
    }

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'يجب إضافة عنصر واحد على الأقل للفاتورة' },
        { status: 400 }
      );
    }

    // توليد رقم الفاتورة تلقائياً إذا لم يتم توفيره
    let invoiceNumber = body.invoiceNumber;
    if (!invoiceNumber) {
      const lastInvoice = await db.invoice.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { invoiceNumber: true },
      });

      const lastNumber = lastInvoice ? parseInt(lastInvoice.invoiceNumber.replace('INV-', '')) : 0;
      invoiceNumber = `INV-${String(lastNumber + 1).padStart(6, '0')}`;
    }

    // التحقق من عدم وجود فاتورة بنفس الرقم
    const existingInvoice = await db.invoice.findUnique({
      where: { invoiceNumber },
    });

    if (existingInvoice) {
      return NextResponse.json(
        { success: false, error: 'رقم الفاتورة موجود مسبقاً' },
        { status: 400 }
      );
    }

    // حساب المبالغ
    const subtotal = body.subtotal || body.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const tax = body.tax || 0;
    const discount = body.discount || 0;
    const total = body.total || (subtotal + tax - discount);
    const paidAmount = body.paidAmount || 0;
    const remainingAmount = total - paidAmount;

    // تحديد حالة الفاتورة
    let status = body.status || InvoiceStatus.PENDING;
    if (!body.status) {
      if (paidAmount >= total) {
        status = InvoiceStatus.PAID;
      } else if (paidAmount > 0) {
        status = InvoiceStatus.PARTIAL;
      }
    }

    // إنشاء الفاتورة مع العناصر
    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        date: body.date ? new Date(body.date) : new Date(),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        status,
        customerId: body.customerId,
        customerType: body.customerType,
        customerName: body.customerName,
        subtotal,
        tax,
        discount,
        total,
        paidAmount,
        remainingAmount,
        notes: body.notes,
        items: {
          create: body.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
            shipmentId: item.shipmentId,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: invoice,
      message: 'تم إنشاء الفاتورة بنجاح',
    });
  } catch (error) {
    console.error('خطأ في إنشاء الفاتورة:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { success: false, error: 'رقم الفاتورة موجود مسبقاً' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء إنشاء الفاتورة' },
      { status: 500 }
    );
  }
}
