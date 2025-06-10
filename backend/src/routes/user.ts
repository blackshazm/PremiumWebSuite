import express from 'express';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { validate, addressSchema, bankDataSchema } from '../utils/validation';
import { hashPassword, verifyPassword, cleanCPF } from '../utils/helpers';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Obter perfil completo do usuário
router.get('/profile', asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      cpf: true,
      firstName: true,
      lastName: true,
      phone: true,
      birthDate: true,
      emailVerified: true,
      referralCode: true,
      createdAt: true,
      address: true,
      bankData: {
        select: {
          id: true,
          bankCode: true,
          bankName: true,
          agency: true,
          account: true,
          accountType: true,
          holderName: true,
          holderCpf: true,
          pixKey: true,
          pixKeyType: true,
        }
      },
      subscription: {
        select: {
          id: true,
          status: true,
          startDate: true,
          nextBillingDate: true,
          plan: {
            select: {
              name: true,
              price: true,
              billingCycle: true,
            }
          }
        }
      },
      preferences: true,
    }
  });

  if (!user) {
    throw createError('Usuário não encontrado', 404);
  }

  res.json({
    success: true,
    data: { user }
  });
}));

// Atualizar dados pessoais
router.put('/profile', asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, birthDate } = req.body;

  // Validações básicas
  if (firstName && (firstName.length < 2 || firstName.length > 50)) {
    throw createError('Nome deve ter entre 2 e 50 caracteres', 400);
  }

  if (lastName && (lastName.length < 2 || lastName.length > 50)) {
    throw createError('Sobrenome deve ter entre 2 e 50 caracteres', 400);
  }

  const updateData: any = {};
  
  if (firstName) updateData.firstName = firstName;
  if (lastName) updateData.lastName = lastName;
  if (phone) updateData.phone = phone;
  if (birthDate) updateData.birthDate = new Date(birthDate);

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: updateData,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      birthDate: true,
      updatedAt: true,
    }
  });

  res.json({
    success: true,
    message: 'Perfil atualizado com sucesso',
    data: { user }
  });
}));

// Alterar senha
router.put('/password', asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    throw createError('Senha atual, nova senha e confirmação são obrigatórias', 400);
  }

  if (newPassword !== confirmPassword) {
    throw createError('Nova senha e confirmação devem ser iguais', 400);
  }

  // Validar força da nova senha
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])/;
  if (newPassword.length < 8 || !passwordRegex.test(newPassword)) {
    throw createError('Nova senha deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula, número e caractere especial', 400);
  }

  // Buscar usuário com senha
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { password: true }
  });

  if (!user || !user.password) {
    throw createError('Usuário não encontrado', 404);
  }

  // Verificar senha atual
  const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password);
  
  if (!isCurrentPasswordValid) {
    throw createError('Senha atual incorreta', 400);
  }

  // Hash da nova senha
  const hashedNewPassword = await hashPassword(newPassword);

  // Atualizar senha
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { password: hashedNewPassword }
  });

  res.json({
    success: true,
    message: 'Senha alterada com sucesso'
  });
}));

// Obter/Atualizar endereço
router.get('/address', asyncHandler(async (req, res) => {
  const address = await prisma.address.findUnique({
    where: { userId: req.user!.id }
  });

  res.json({
    success: true,
    data: { address }
  });
}));

router.put('/address', asyncHandler(async (req, res) => {
  const validatedData = validate(addressSchema, req.body);

  const address = await prisma.address.upsert({
    where: { userId: req.user!.id },
    update: validatedData,
    create: {
      ...validatedData,
      userId: req.user!.id,
    }
  });

  res.json({
    success: true,
    message: 'Endereço atualizado com sucesso',
    data: { address }
  });
}));

// Obter/Atualizar dados bancários
router.get('/bank-data', asyncHandler(async (req, res) => {
  const bankData = await prisma.bankData.findUnique({
    where: { userId: req.user!.id },
    select: {
      id: true,
      bankCode: true,
      bankName: true,
      agency: true,
      account: true,
      accountType: true,
      holderName: true,
      holderCpf: true,
      pixKey: true,
      pixKeyType: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  res.json({
    success: true,
    data: { bankData }
  });
}));

router.put('/bank-data', asyncHandler(async (req, res) => {
  const validatedData = validate(bankDataSchema, req.body);

  // Limpar CPF do titular
  validatedData.holderCpf = cleanCPF(validatedData.holderCpf);

  const bankData = await prisma.bankData.upsert({
    where: { userId: req.user!.id },
    update: validatedData,
    create: {
      ...validatedData,
      userId: req.user!.id,
    },
    select: {
      id: true,
      bankCode: true,
      bankName: true,
      agency: true,
      account: true,
      accountType: true,
      holderName: true,
      holderCpf: true,
      pixKey: true,
      pixKeyType: true,
      updatedAt: true,
    }
  });

  res.json({
    success: true,
    message: 'Dados bancários atualizados com sucesso',
    data: { bankData }
  });
}));

// Obter/Atualizar preferências
router.get('/preferences', asyncHandler(async (req, res) => {
  const preferences = await prisma.userPreferences.findUnique({
    where: { userId: req.user!.id }
  });

  res.json({
    success: true,
    data: { preferences }
  });
}));

router.put('/preferences', asyncHandler(async (req, res) => {
  const { 
    emailNotifications, 
    pushNotifications, 
    marketingEmails, 
    preferredCategories 
  } = req.body;

  const updateData: any = {};
  
  if (typeof emailNotifications === 'boolean') updateData.emailNotifications = emailNotifications;
  if (typeof pushNotifications === 'boolean') updateData.pushNotifications = pushNotifications;
  if (typeof marketingEmails === 'boolean') updateData.marketingEmails = marketingEmails;
  if (Array.isArray(preferredCategories)) updateData.preferredCategories = preferredCategories;

  const preferences = await prisma.userPreferences.upsert({
    where: { userId: req.user!.id },
    update: updateData,
    create: {
      ...updateData,
      userId: req.user!.id,
    }
  });

  res.json({
    success: true,
    message: 'Preferências atualizadas com sucesso',
    data: { preferences }
  });
}));

// Dashboard - resumo das informações do usuário
router.get('/dashboard', asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  // Buscar dados em paralelo
  const [
    user,
    commissionStats,
    referralStats,
    recentOrders,
    availableCoupons
  ] = await Promise.all([
    // Dados do usuário
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        referralCode: true,
        subscription: {
          select: {
            status: true,
            nextBillingDate: true,
            plan: {
              select: {
                name: true,
                price: true,
              }
            }
          }
        }
      }
    }),

    // Estatísticas de comissão
    prisma.commission.aggregate({
      where: { earnerId: userId },
      _sum: {
        amount: true,
      },
      _count: true,
    }),

    // Estatísticas de indicações
    prisma.user.count({
      where: { referredById: userId }
    }),

    // Pedidos recentes
    prisma.order.findMany({
      where: { userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        status: true,
        createdAt: true,
      }
    }),

    // Cupons disponíveis
    prisma.userCoupon.findMany({
      where: { 
        userId,
        coupon: {
          isActive: true,
          endDate: { gte: new Date() }
        }
      },
      include: {
        coupon: {
          select: {
            code: true,
            name: true,
            type: true,
            value: true,
            endDate: true,
          }
        }
      }
    })
  ]);

  const dashboardData = {
    user,
    stats: {
      totalCommissions: commissionStats._sum.amount || 0,
      totalReferrals: referralStats,
      totalOrders: recentOrders.length,
    },
    recentOrders,
    availableCoupons: availableCoupons.map(uc => uc.coupon),
  };

  res.json({
    success: true,
    data: dashboardData
  });
}));

export default router;
