import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { productSchema } from '../validators/product.validator';
import { categorySchema } from '../validators/category.validator';
import { updateOrderStatusSchema } from '../validators/order.validator';
import crypto from 'crypto';
import qrcode from 'qrcode';
import bcrypt from 'bcryptjs';

// --- Dashboard ---
export const getDashboardMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cafeId = req.user!.cafeId;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Step 1: Run core counts and aggregates safely within connection pool limits
    const [
      todaySalesAgg,
      todayOrdersCount,
      statusGroups,
      totalProductsCount,
    ] = await Promise.all([
      prisma.order.aggregate({
        _sum: { total: true },
        where: {
          cafeId,
          createdAt: { gte: startOfToday },
          orderStatus: { not: 'CANCELLED' },
        },
      }),
      prisma.order.count({ where: { cafeId, createdAt: { gte: startOfToday } } }),
      prisma.order.groupBy({
        by: ['orderStatus'],
        where: { cafeId },
        _count: { id: true },
      }),
      prisma.product.count({ where: { cafeId } }),
    ]);

    // Aggregate counts without extra database queries
    let totalOrdersCount = 0;
    let pendingCount = 0;
    let preparingCount = 0;
    let completedCount = 0;

    for (const group of statusGroups) {
      const count = group._count.id;
      totalOrdersCount += count;
      if (group.orderStatus === 'PENDING') pendingCount = count;
      else if (group.orderStatus === 'ACCEPTED' || group.orderStatus === 'PREPARING') preparingCount += count;
      else if (group.orderStatus === 'COMPLETED') completedCount = count;
    }

    // Step 2: Run secondary queries for charts and tables
    const [totalTablesCount, recentOrders, topItems] = await Promise.all([
      prisma.cafeTable.count({ where: { cafeId, isActive: true } }),
      prisma.order.findMany({
        where: {
          cafeId,
          createdAt: { gte: sevenDaysAgo },
          orderStatus: { not: 'CANCELLED' },
        },
        select: {
          total: true,
          createdAt: true,
        },
      }),
      prisma.orderItem.groupBy({
        by: ['productNameSnapshot'],
        _sum: { quantity: true, subtotal: true },
        where: {
          order: { cafeId, orderStatus: { not: 'CANCELLED' } },
        },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    const salesMap = new Map<string, { date: string; sales: number; orders: number }>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      salesMap.set(dateStr, { date: dateStr, sales: 0, orders: 0 });
    }

    for (const ord of recentOrders) {
      const dateStr = ord.createdAt.toISOString().split('T')[0];
      if (salesMap.has(dateStr)) {
        const item = salesMap.get(dateStr)!;
        item.sales += Number(ord.total);
        item.orders += 1;
      }
    }

    const salesTrend = Array.from(salesMap.values());

    res.json({
      metrics: {
        todaySales: Number(todaySalesAgg._sum.total || 0),
        todayOrders: todayOrdersCount,
        totalOrders: totalOrdersCount,
        pendingOrders: pendingCount,
        preparingOrders: preparingCount,
        completedOrders: completedCount,
        totalProducts: totalProductsCount,
        totalTables: totalTablesCount,
      },
      salesTrend,
      popularProducts: topItems.map((item) => ({
        name: item.productNameSnapshot,
        quantity: item._sum.quantity || 0,
        revenue: Number(item._sum.subtotal || 0),
      })),
    });
  } catch (error) {
    next(error);
  }
};

// --- Product CRUD ---
export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cafeId = req.user!.cafeId;
    const products = await prisma.product.findMany({
      where: { cafeId },
      include: { category: true },
      orderBy: [
        { category: { sortOrder: 'asc' } },
        { price: 'asc' },
        { name: 'asc' },
      ],
    });

    res.json(
      products.map((p) => ({
        id: p.id,
        categoryId: p.categoryId,
        categoryName: p.category.name,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        image: p.image,
        isAvailable: p.isAvailable,
        isFeatured: p.isFeatured,
        preparationTime: p.preparationTime,
        isVeg: p.isVeg,
        createdAt: p.createdAt,
      }))
    );
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cafeId = req.user!.cafeId;
    const validated = productSchema.parse(req.body);

    const product = await prisma.product.create({
      data: {
        cafeId,
        categoryId: validated.categoryId,
        name: validated.name,
        description: validated.description || null,
        price: validated.price,
        image: validated.image || null,
        isAvailable: validated.isAvailable,
        isFeatured: validated.isFeatured,
        preparationTime: validated.preparationTime,
        isVeg: validated.isVeg,
      },
      include: { category: true },
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cafeId = req.user!.cafeId;
    const { id } = req.params;
    const validated = productSchema.partial().parse(req.body);

    const existing = await prisma.product.findFirst({ where: { id, cafeId } });
    if (!existing) return res.status(404).json({ error: 'Product not found.' });

    const updated = await prisma.product.update({
      where: { id },
      data: validated,
      include: { category: true },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const toggleProductAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cafeId = req.user!.cafeId;
    const { id } = req.params;

    const existing = await prisma.product.findFirst({ where: { id, cafeId } });
    if (!existing) return res.status(404).json({ error: 'Product not found.' });

    const updated = await prisma.product.update({
      where: { id },
      data: { isAvailable: !existing.isAvailable },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cafeId = req.user!.cafeId;
    const { id } = req.params;

    const existing = await prisma.product.findFirst({ where: { id, cafeId } });
    if (!existing) return res.status(404).json({ error: 'Product not found.' });

    // Check if product is referenced in historical orders
    const orderItemsCount = await prisma.orderItem.count({ where: { productId: id } });
    if (orderItemsCount > 0) {
      await prisma.product.update({
        where: { id },
        data: { isAvailable: false },
      });
      return res.json({
        message: 'Product has order history and has been archived (set to unavailable) to preserve records.',
        archived: true,
      });
    }

    await prisma.product.delete({ where: { id } });
    res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// --- Category CRUD ---
export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cafeId = req.user!.cafeId;
    const categories = await prisma.category.findMany({
      where: { cafeId },
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    res.json(
      categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        image: c.image,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
        productCount: c._count.products,
      }))
    );
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cafeId = req.user!.cafeId;
    const validated = categorySchema.parse(req.body);

    const category = await prisma.category.create({
      data: {
        cafeId,
        name: validated.name,
        description: validated.description || null,
        image: validated.image || null,
        sortOrder: validated.sortOrder,
        isActive: validated.isActive,
      },
    });

    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cafeId = req.user!.cafeId;
    const { id } = req.params;
    const validated = categorySchema.partial().parse(req.body);

    const existing = await prisma.category.findFirst({ where: { id, cafeId } });
    if (!existing) return res.status(404).json({ error: 'Category not found.' });

    const updated = await prisma.category.update({
      where: { id },
      data: validated,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cafeId = req.user!.cafeId;
    const { id } = req.params;

    const existing = await prisma.category.findFirst({
      where: { id, cafeId },
      include: { _count: { select: { products: true } } },
    });

    if (!existing) return res.status(404).json({ error: 'Category not found.' });

    if (existing._count.products > 0) {
      return res.status(400).json({
        error: `Cannot delete category because it contains ${existing._count.products} products. Reassign or delete products first.`,
      });
    }

    await prisma.category.delete({ where: { id } });
    res.json({ message: 'Category deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// --- Table & QR Code Management ---
export const getTables = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cafeId = req.user!.cafeId;
    const tables = await prisma.cafeTable.findMany({
      where: { cafeId },
      orderBy: { number: 'asc' },
    });

    res.json(tables);
  } catch (error) {
    next(error);
  }
};

export const createTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cafeId = req.user!.cafeId;
    const { number, capacity } = req.body;

    if (!number) return res.status(400).json({ error: 'Table number is required.' });

    const qrToken = `tok_${crypto.randomBytes(12).toString('hex')}`;

    const table = await prisma.cafeTable.create({
      data: {
        cafeId,
        number,
        capacity: capacity ? Number(capacity) : 4,
        qrToken,
        isActive: true,
      },
    });

    res.status(201).json(table);
  } catch (error) {
    next(error);
  }
};

export const updateTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cafeId = req.user!.cafeId;
    const { id } = req.params;
    const { number, capacity, isActive } = req.body;

    const existing = await prisma.cafeTable.findFirst({ where: { id, cafeId } });
    if (!existing) return res.status(404).json({ error: 'Table not found.' });

    const updated = await prisma.cafeTable.update({
      where: { id },
      data: {
        ...(number && { number }),
        ...(capacity !== undefined && { capacity: Number(capacity) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const regenerateTableQR = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cafeId = req.user!.cafeId;
    const { id } = req.params;

    const existing = await prisma.cafeTable.findFirst({ where: { id, cafeId } });
    if (!existing) return res.status(404).json({ error: 'Table not found.' });

    const newQrToken = `tok_${crypto.randomBytes(12).toString('hex')}`;

    const updated = await prisma.cafeTable.update({
      where: { id },
      data: { qrToken: newQrToken },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const generateQRCodeDataUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { qrToken } = req.params;
    const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
    const menuUrl = `${frontendUrl}/?table=${qrToken}`;

    // Generate Data URL for QR code
    const qrDataUrl = await qrcode.toDataURL(menuUrl, { width: 400, margin: 2 });

    res.json({ menuUrl, qrDataUrl });
  } catch (error) {
    next(error);
  }
};

// --- Orders Management ---
export const getAdminOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cafeId = req.user!.cafeId;
    const { status, search, date, startDate, endDate, range } = req.query;

    const whereClause: any = { cafeId };

    if (status && status !== 'ALL') {
      whereClause.orderStatus = status;
    }

    if (date) {
      const startOfDay = new Date(String(date));
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(String(date));
      endOfDay.setHours(23, 59, 59, 999);

      whereClause.createdAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        const start = new Date(String(startDate));
        start.setHours(0, 0, 0, 0);
        whereClause.createdAt.gte = start;
      }
      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = end;
      }
    } else if (range === '30days' || range === '1month') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      whereClause.createdAt = {
        gte: thirtyDaysAgo,
      };
    } else if (range === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      whereClause.createdAt = {
        gte: sevenDaysAgo,
      };
    }

    if (search) {
      const searchStr = String(search).trim();
      whereClause.OR = [
        { customerName: { contains: searchStr, mode: 'insensitive' } },
        { customerPhone: { contains: searchStr, mode: 'insensitive' } },
        { table: { number: { contains: searchStr, mode: 'insensitive' } } },
      ];
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        table: true,
        orderItems: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        orderToken: o.orderToken,
        tableNumber: o.table.number,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        orderStatus: o.orderStatus,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        subtotal: Number(o.subtotal),
        tax: Number(o.tax),
        discount: Number(o.discount),
        total: Number(o.total),
        notes: o.notes,
        createdAt: o.createdAt,
        items: o.orderItems.map((i) => ({
          id: i.id,
          productName: i.productNameSnapshot,
          price: Number(i.priceSnapshot),
          quantity: i.quantity,
          subtotal: Number(i.subtotal),
          specialNote: i.specialNote,
        })),
      }))
    );
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cafeId = req.user!.cafeId;
    const { id } = req.params;
    const validated = updateOrderStatusSchema.parse(req.body);

    const existing = await prisma.order.findFirst({
      where: {
        cafeId,
        OR: [{ id }, { orderToken: id }],
      },
    });
    if (!existing) return res.status(404).json({ error: 'Order not found.' });

    const updated = await prisma.order.update({
      where: { id: existing.id },
      data: {
        orderStatus: validated.orderStatus,
        ...(validated.paymentStatus && { paymentStatus: validated.paymentStatus }),
      },
      include: { table: true, orderItems: true },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cafeId = req.user!.cafeId;
    const { id } = req.params;

    const existing = await prisma.order.findFirst({
      where: {
        cafeId,
        OR: [{ id }, { orderToken: id }],
      },
    });
    if (!existing) return res.status(404).json({ error: 'Order not found.' });

    // Cleanly cascade delete child relations
    await prisma.payment.deleteMany({ where: { orderId: existing.id } });
    await prisma.orderItem.deleteMany({ where: { orderId: existing.id } });
    await prisma.order.delete({ where: { id: existing.id } });

    res.json({ message: 'Order deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// --- Staff Management ---
export const getStaffList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cafeId = req.user!.cafeId;
    const staff = await prisma.user.findMany({
      where: { cafeId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const staffWithIds = staff.map((s, index) => ({
      ...s,
      staffId: `STF-${(101 + index).toString().padStart(3, '0')}`,
    }));

    res.json(staffWithIds);
  } catch (error) {
    next(error);
  }
};

export const createStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cafeId = req.user!.cafeId;
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'A staff account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        cafeId,
        name,
        email,
        password: hashedPassword,
        role: role === 'KITCHEN' ? 'KITCHEN' : 'ADMIN',
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    const userCount = await prisma.user.count({ where: { cafeId } });
    const userWithStaffId = {
      ...user,
      staffId: `STF-${(100 + userCount).toString().padStart(3, '0')}`,
    };

    res.status(201).json(userWithStaffId);
  } catch (error) {
    next(error);
  }
};

export const deleteStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cafeId = req.user!.cafeId;
    const { id } = req.params;

    if (req.user!.id === id) {
      return res.status(400).json({ error: 'You cannot delete your own logged-in admin account.' });
    }

    const existing = await prisma.user.findFirst({ where: { id, cafeId } });
    if (!existing) return res.status(404).json({ error: 'Staff account not found.' });

    await prisma.user.delete({ where: { id } });
    res.json({ message: 'Staff account deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// --- Settings ---
export const getCafeSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cafeId = req.user!.cafeId;
    const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
    if (!cafe) return res.status(404).json({ error: 'Cafe not found.' });

    res.json({
      id: cafe.id,
      name: cafe.name,
      logo: cafe.logo,
      address: cafe.address,
      phone: cafe.phone,
      email: cafe.email,
      taxRate: Number(cafe.taxRate),
      currency: cafe.currency,
      openHours: cafe.openHours,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCafeSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cafeId = req.user!.cafeId;
    const { name, logo, address, phone, email, taxRate, currency, openHours } = req.body;

    const updated = await prisma.cafe.update({
      where: { id: cafeId },
      data: {
        ...(name && { name }),
        ...(logo !== undefined && { logo }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(taxRate !== undefined && { taxRate: Number(taxRate) }),
        ...(currency && { currency }),
        ...(openHours !== undefined && { openHours }),
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};
