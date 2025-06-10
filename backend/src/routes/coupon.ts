import express from 'express';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Listar cupons do usuário
router.get('/', asyncHandler(async (req, res) => {
  const userCoupons = await prisma.userCoupon.findMany({
    where: { 
      userId: req.user!.id,
      coupon: {
        isActive: true,
        endDate: { gte: new Date() }
      }
    },
    include: {
      coupon: {
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          type: true,
          value: true,
          minimumAmount: true,
          maximumDiscount: true,
          startDate: true,
          endDate: true,
          usageLimitPerUser: true,
        }
      }
    }
  });

  const coupons = userCoupons.map(uc => ({
    ...uc.coupon,
    usageCount: uc.usageCount,
    remainingUses: (uc.coupon.usageLimitPerUser || 1) - uc.usageCount,
  }));

  res.json({
    success: true,
    data: { coupons }
  });
}));

// Validar cupom
router.post('/validate', asyncHandler(async (req, res) => {
  const { code, cartTotal } = req.body;

  if (!code) {
    throw createError('Código do cupom é obrigatório', 400);
  }

  // Buscar cupom
  const coupon = await prisma.coupon.findFirst({
    where: {
      code: code.toUpperCase(),
      isActive: true,
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
    }
  });

  if (!coupon) {
    throw createError('Cupom inválido ou expirado', 400);
  }

  // Verificar se usuário pode usar o cupom
  const userCoupon = await prisma.userCoupon.findUnique({
    where: {
      userId_couponId: {
        userId: req.user!.id,
        couponId: coupon.id,
      }
    }
  });

  const usageCount = userCoupon?.usageCount || 0;
  const usageLimit = coupon.usageLimitPerUser || 1;

  if (usageCount >= usageLimit) {
    throw createError('Limite de uso do cupom excedido', 400);
  }

  // Verificar valor mínimo
  if (coupon.minimumAmount && cartTotal < Number(coupon.minimumAmount)) {
    throw createError(`Valor mínimo para usar o cupom é R$ ${coupon.minimumAmount}`, 400);
  }

  // Calcular desconto
  let discount = 0;
  if (coupon.type === 'PERCENTAGE') {
    discount = (cartTotal * Number(coupon.value)) / 100;
    if (coupon.maximumDiscount && discount > Number(coupon.maximumDiscount)) {
      discount = Number(coupon.maximumDiscount);
    }
  } else {
    discount = Number(coupon.value);
  }

  // Não permitir desconto maior que o total
  if (discount > cartTotal) {
    discount = cartTotal;
  }

  res.json({
    success: true,
    data: {
      coupon: {
        code: coupon.code,
        name: coupon.name,
        type: coupon.type,
        value: coupon.value,
        discount,
      }
    }
  });
}));

export default router;
