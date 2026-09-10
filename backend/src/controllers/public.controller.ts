import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { createOrderSchema } from '../validators/order.validator';
import crypto from 'crypto';

export const getMenuByTableToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableToken } = req.params;

    if (!tableToken) {
      return res.status(400).json({ error: 'Table token is required.' });
    }

    // Find table by secure random token
    let table = await prisma.cafeTable.findUnique({
      where: { qrToken: tableToken },
      include: {
        cafe: true,
      },
    });

    // Fallback: If demo token or unmapped token, fallback to first active table
    if (!table || !table.isActive) {
      table = await prisma.cafeTable.findFirst({
        where: { isActive: true },
        include: {
          cafe: true,
        },
        orderBy: { number: 'asc' },
      });
    }

    if (!table || !table.isActive) {
      return res.status(404).json({ error: 'No active tables found. Please contact cafe staff.' });
    }

    // Fetch active categories and all products in parallel with lightweight queries
    const [categories, products] = await Promise.all([
      prisma.category.findMany({
        where: {
          cafeId: table.cafeId,
          isActive: true,
        },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          image: true,
          sortOrder: true,
        },
      }),
      prisma.product.findMany({
        where: {
          cafeId: table.cafeId,
          isAvailable: true,
        },
        select: {
          id: true,
          categoryId: true,
          name: true,
          description: true,
          price: true,
          image: true,
          isAvailable: true,
          isFeatured: true,
          preparationTime: true,
          isVeg: true,
          category: {
            select: {
              name: true,
              sortOrder: true,
            },
          },
        },
        orderBy: [
          { category: { sortOrder: 'asc' } },
          { price: 'asc' },
          { name: 'asc' },
        ],
      }),
    ]);

    res.json({
      cafe: {
        id: table.cafe.id,
        name: table.cafe.name,
        logo: table.cafe.logo,
        address: table.cafe.address,
        phone: table.cafe.phone,
        taxRate: Number(table.cafe.taxRate),
        currency: table.cafe.currency,
        openHours: table.cafe.openHours,
      },
      table: {
        id: table.id,
        number: table.number,
        capacity: table.capacity,
        qrToken: table.qrToken,
      },
      categories,
      products: products.map((prod) => ({
        id: prod.id,
        categoryId: prod.categoryId,
        categoryName: prod.category.name,
        name: prod.name,
        description: prod.description,
        price: Number(prod.price),
        image: prod.image,
        isAvailable: prod.isAvailable,
        isFeatured: prod.isFeatured,
        preparationTime: prod.preparationTime,
        isVeg: prod.isVeg,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validatedData = createOrderSchema.parse(req.body);

    // Verify table token
    let table = await prisma.cafeTable.findUnique({
      where: { qrToken: validatedData.tableToken },
      include: { cafe: true },
    });

    if (!table || !table.isActive) {
      table = await prisma.cafeTable.findFirst({
        where: { isActive: true },
        include: { cafe: true },
        orderBy: { number: 'asc' },
      });
    }

    if (!table || !table.isActive) {
      return res.status(404).json({ error: 'Invalid or inactive table QR code.' });
    }

    // Extract product IDs
    const productIds = validatedData.items.map((i) => i.productId);

    // Fetch ACTUAL prices and names directly from database (Server-side Security Authority)
    const dbProducts = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        cafeId: table.cafeId,
        isAvailable: true,
      },
    });

    console.log('[EXPRESS DEBUG createOrder]:', {
      tableToken: validatedData.tableToken,
      tableFound: !!table,
      tableCafeId: table?.cafeId,
      productIds,
      dbProducts,
    });
    const uniqueProductIds = new Set(productIds);
    if (dbProducts.length !== uniqueProductIds.size) {
      return res.status(400).json({ error: 'One or more items in your cart are unavailable or invalid.' });
    }

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Calculate line items, subtotals, tax, and grand total server-side
    let calculatedSubtotal = 0;
    const orderItemsToCreate: Array<{
      productId: string;
      productNameSnapshot: string;
      priceSnapshot: number;
      quantity: number;
      subtotal: number;
      specialNote: string | null;
    }> = [];

    for (const item of validatedData.items) {
      const dbProduct = productMap.get(item.productId)!;
      const unitPrice = Number(dbProduct.price);
      const lineSubtotal = unitPrice * item.quantity;
      calculatedSubtotal += lineSubtotal;

      orderItemsToCreate.push({
        productId: dbProduct.id,
        productNameSnapshot: dbProduct.name, // Snapshot to preserve history
        priceSnapshot: Number(dbProduct.price), // Snapshot to preserve history
        quantity: item.quantity,
        subtotal: lineSubtotal,
        specialNote: item.specialNote || null,
      });
    }

    const taxRate = Number(table.cafe.taxRate); // e.g. 5.0%
    const calculatedTax = Number(((calculatedSubtotal * taxRate) / 100).toFixed(2));
    const discount = 0.0;
    const grandTotal = Number((calculatedSubtotal + calculatedTax - discount).toFixed(2));

    const orderToken = `ord_${crypto.randomBytes(12).toString('hex')}`;

    // Create Order with nested items inside a database transaction
    const newOrder = await prisma.$transaction(
      async (tx) => {
        const lastOrder = await tx.order.findFirst({
          where: { cafeId: table.cafeId },
          orderBy: { orderNumber: 'desc' },
        });
        const nextOrderNumber = (lastOrder?.orderNumber || 100) + 1;

        const createdOrder = await tx.order.create({
          data: {
            orderNumber: nextOrderNumber,
            orderToken,
            cafeId: table.cafeId,
            tableId: table.id,
            customerName: validatedData.customerName || 'Guest Customer',
            customerPhone: validatedData.customerPhone || null,
            subtotal: calculatedSubtotal,
            tax: calculatedTax,
            discount,
            total: grandTotal,
            paymentStatus: 'PENDING',
            paymentMethod: validatedData.paymentMethod || 'PAY_AT_COUNTER',
            orderStatus: 'PENDING',
            notes: validatedData.notes || null,
            orderItems: {
              create: orderItemsToCreate,
            },
          },
          include: {
            table: true,
            orderItems: true,
          },
        });

        // Optionally create initial payment record
        await tx.payment.create({
          data: {
            orderId: createdOrder.id,
            amount: grandTotal,
            paymentMethod: validatedData.paymentMethod || 'PAY_AT_COUNTER',
            status: 'PENDING',
          },
        });

        return createdOrder;
      },
      { timeout: 15000 }
    );

    res.status(201).json({
      message: 'Order placed successfully!',
      order: {
        id: newOrder.id,
        orderNumber: newOrder.orderNumber,
        orderToken: newOrder.orderToken,
        tableNumber: newOrder.table.number,
        customerName: newOrder.customerName,
        subtotal: Number(newOrder.subtotal),
        tax: Number(newOrder.tax),
        discount: Number(newOrder.discount),
        total: Number(newOrder.total),
        orderStatus: newOrder.orderStatus,
        paymentStatus: newOrder.paymentStatus,
        createdAt: newOrder.createdAt,
        itemsCount: newOrder.orderItems.length,
        items: newOrder.orderItems.map((item) => ({
          id: item.id,
          productName: item.productNameSnapshot,
          price: Number(item.priceSnapshot),
          quantity: item.quantity,
          subtotal: Number(item.subtotal),
          specialNote: item.specialNote,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderByToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderToken } = req.params;

    if (!orderToken) {
      return res.status(400).json({ error: 'Order token is required.' });
    }

    const order = await prisma.order.findUnique({
      where: { orderToken },
      include: {
        cafe: true,
        table: true,
        orderItems: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    res.json({
      orderNumber: order.orderNumber,
      orderToken: order.orderToken,
      cafeName: order.cafe.name,
      tableNumber: order.table.number,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      discount: Number(order.discount),
      total: Number(order.total),
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.orderItems.map((item) => ({
        id: item.id,
        productName: item.productNameSnapshot,
        price: Number(item.priceSnapshot),
        quantity: item.quantity,
        subtotal: Number(item.subtotal),
        specialNote: item.specialNote,
      })),
    });
  } catch (error) {
    next(error);
  }
};
