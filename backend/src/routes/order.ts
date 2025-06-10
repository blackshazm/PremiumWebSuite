import express from 'express';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { generateOrderNumber } from '../utils/helpers';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Listar pedidos do usuário
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {
    userId: req.user!.id,
  };

  if (status) {
    where.status = status;
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: {
                  take: 1,
                  orderBy: { sortOrder: 'asc' }
                }
              }
            }
          }
        }
      }
    }),
    prisma.order.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
}));

// Obter pedido específico
router.get('/:id', asyncHandler(async (req, res) => {
  const order = await prisma.order.findFirst({
    where: {
      id: req.params.id,
      userId: req.user!.id,
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: {
                take: 1,
                orderBy: { sortOrder: 'asc' }
              }
            }
          }
        }
      }
    }
  });

  if (!order) {
    throw createError('Pedido não encontrado', 404);
  }

  res.json({
    success: true,
    data: { order }
  });
}));

// Criar novo pedido
router.post('/', asyncHandler(async (req, res) => {
  const { 
    items, 
    shippingAddress, 
    paymentMethod, 
    couponCode 
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw createError('Itens do pedido são obrigatórios', 400);
  }

  if (!shippingAddress) {
    throw createError('Endereço de entrega é obrigatório', 400);
  }

  if (!paymentMethod) {
    throw createError('Método de pagamento é obrigatório', 400);
  }

  // Validar produtos e calcular valores
  let subtotal = 0;
  const validatedItems = [];

  for (const item of items) {
    const product = await prisma.product.findFirst({
      where: {
        id: item.productId,
        isActive: true,
      }
    });

    if (!product) {
      throw createError(`Produto ${item.productId} não encontrado`, 404);
    }

    if (product.trackStock && product.stock < item.quantity) {
      throw createError(`Estoque insuficiente para ${product.name}`, 400);
    }

    const itemTotal = Number(product.price) * item.quantity;
    subtotal += itemTotal;

    validatedItems.push({
      productId: product.id,
      quantity: item.quantity,
      price: product.price,
    });
  }

  // Aplicar cupom se fornecido
  let discount = 0;
  if (couponCode) {
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: couponCode,
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      }
    });

    if (!coupon) {
      throw createError('Cupom inválido ou expirado', 400);
    }

    // Verificar se usuário pode usar o cupom
    const userCouponUsage = await prisma.userCoupon.findUnique({
      where: {
        userId_couponId: {
          userId: req.user!.id,
          couponId: coupon.id,
        }
      }
    });

    if (userCouponUsage && userCouponUsage.usageCount >= (coupon.usageLimitPerUser || 1)) {
      throw createError('Limite de uso do cupom excedido', 400);
    }

    // Calcular desconto
    if (coupon.type === 'PERCENTAGE') {
      discount = (subtotal * Number(coupon.value)) / 100;
      if (coupon.maximumDiscount && discount > Number(coupon.maximumDiscount)) {
        discount = Number(coupon.maximumDiscount);
      }
    } else {
      discount = Number(coupon.value);
    }

    // Verificar valor mínimo
    if (coupon.minimumAmount && subtotal < Number(coupon.minimumAmount)) {
      throw createError(`Valor mínimo para usar o cupom é ${coupon.minimumAmount}`, 400);
    }
  }

  // Calcular frete (implementar lógica de frete)
  const shippingCost = 0; // Por enquanto grátis

  const total = subtotal + shippingCost - discount;

  // Gerar número do pedido
  const orderNumber = generateOrderNumber();

  // Criar pedido
  const order = await prisma.order.create({
    data: {
      userId: req.user!.id,
      orderNumber,
      subtotal,
      shippingCost,
      discount,
      total,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod,
      shippingAddress,
      couponCode,
      items: {
        create: validatedItems
      }
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            }
          }
        }
      }
    }
  });

  // Atualizar uso do cupom se aplicável
  if (couponCode) {
    await prisma.userCoupon.upsert({
      where: {
        userId_couponId: {
          userId: req.user!.id,
          couponId: (await prisma.coupon.findUnique({ where: { code: couponCode } }))!.id,
        }
      },
      update: {
        usageCount: { increment: 1 }
      },
      create: {
        userId: req.user!.id,
        couponId: (await prisma.coupon.findUnique({ where: { code: couponCode } }))!.id,
        usageCount: 1,
      }
    });
  }

  res.status(201).json({
    success: true,
    message: 'Pedido criado com sucesso',
    data: { order }
  });
}));

export default router;
