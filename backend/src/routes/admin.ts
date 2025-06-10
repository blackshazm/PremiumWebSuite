import express from 'express';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Todas as rotas requerem autenticação e privilégios de admin
router.use(authenticate);
router.use(requireAdmin);

// Dashboard administrativo
router.get('/dashboard', asyncHandler(async (req, res) => {
  const [
    totalUsers,
    activeSubscriptions,
    totalRevenue,
    pendingOrders,
    totalCommissions,
    pendingWithdrawals
  ] = await Promise.all([
    // Total de usuários
    prisma.user.count(),

    // Assinaturas ativas
    prisma.subscription.count({
      where: { status: 'ACTIVE' }
    }),

    // Receita total
    prisma.billingHistory.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true }
    }),

    // Pedidos pendentes
    prisma.order.count({
      where: { status: 'PENDING' }
    }),

    // Total de comissões pagas
    prisma.commission.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true }
    }),

    // Saques pendentes
    prisma.withdrawalRequest.count({
      where: { status: 'PENDING' }
    })
  ]);

  const stats = {
    totalUsers,
    activeSubscriptions,
    totalRevenue: totalRevenue._sum.amount || 0,
    pendingOrders,
    totalCommissions: totalCommissions._sum.amount || 0,
    pendingWithdrawals,
  };

  res.json({
    success: true,
    data: { stats }
  });
}));

// Listar usuários
router.get('/users', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, status } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};

  if (search) {
    where.OR = [
      { firstName: { contains: search as string, mode: 'insensitive' } },
      { lastName: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } },
      { cpf: { contains: search as string } },
    ];
  }

  if (status) {
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        cpf: true,
        phone: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        subscription: {
          select: {
            status: true,
            plan: {
              select: {
                name: true,
                price: true,
              }
            }
          }
        },
        _count: {
          select: {
            referrals: true,
            orders: true,
          }
        }
      }
    }),
    prisma.user.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
}));

// Obter detalhes de um usuário
router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      address: true,
      bankData: true,
      subscription: {
        include: {
          plan: true,
          billingHistory: {
            take: 10,
            orderBy: { createdAt: 'desc' }
          }
        }
      },
      referrals: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          createdAt: true,
          subscription: {
            select: {
              status: true,
            }
          }
        }
      },
      commissionsEarned: {
        take: 10,
        orderBy: { createdAt: 'desc' }
      },
      orders: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          total: true,
          status: true,
          createdAt: true,
        }
      }
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

// Listar solicitações de saque
router.get('/withdrawals', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};
  if (status) {
    where.status = status;
  }

  const [withdrawals, total] = await Promise.all([
    prisma.withdrawalRequest.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      }
    }),
    prisma.withdrawalRequest.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      withdrawals,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
}));

// Processar solicitação de saque
router.patch('/withdrawals/:id', asyncHandler(async (req, res) => {
  const { status, adminNotes } = req.body;
  const withdrawalId = req.params.id;

  if (!['APPROVED', 'REJECTED', 'PAID'].includes(status)) {
    throw createError('Status inválido', 400);
  }

  const withdrawal = await prisma.withdrawalRequest.findUnique({
    where: { id: withdrawalId }
  });

  if (!withdrawal) {
    throw createError('Solicitação de saque não encontrada', 404);
  }

  const updateData: any = { status };
  
  if (adminNotes) {
    updateData.adminNotes = adminNotes;
  }

  if (status === 'PAID') {
    updateData.paidAt = new Date();
  } else if (status === 'APPROVED') {
    updateData.processedAt = new Date();
  }

  const updatedWithdrawal = await prisma.withdrawalRequest.update({
    where: { id: withdrawalId },
    data: updateData,
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        }
      }
    }
  });

  res.json({
    success: true,
    message: 'Solicitação de saque atualizada com sucesso',
    data: { withdrawal: updatedWithdrawal }
  });
}));

// Listar pedidos
router.get('/orders', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};
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
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
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

export default router;
