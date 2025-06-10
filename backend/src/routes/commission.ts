import express from 'express';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Obter resumo de comissões
router.get('/summary', asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const [
    totalEarned,
    availableBalance,
    pendingBalance,
    totalReferrals,
    activeReferrals
  ] = await Promise.all([
    // Total ganho
    prisma.commission.aggregate({
      where: { earnerId: userId },
      _sum: { amount: true }
    }),

    // Saldo disponível para saque
    prisma.commission.aggregate({
      where: { 
        earnerId: userId,
        status: 'AVAILABLE'
      },
      _sum: { amount: true }
    }),

    // Saldo pendente
    prisma.commission.aggregate({
      where: { 
        earnerId: userId,
        status: 'PENDING'
      },
      _sum: { amount: true }
    }),

    // Total de indicações
    prisma.user.count({
      where: { referredById: userId }
    }),

    // Indicações ativas (com assinatura ativa)
    prisma.user.count({
      where: { 
        referredById: userId,
        subscription: {
          status: 'ACTIVE'
        }
      }
    })
  ]);

  const summary = {
    totalEarned: totalEarned._sum.amount || 0,
    availableBalance: availableBalance._sum.amount || 0,
    pendingBalance: pendingBalance._sum.amount || 0,
    totalReferrals,
    activeReferrals,
  };

  res.json({
    success: true,
    data: { summary }
  });
}));

// Listar comissões
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, type } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {
    earnerId: req.user!.id,
  };

  if (status) {
    where.status = status;
  }

  if (type) {
    where.type = type;
  }

  const [commissions, total] = await Promise.all([
    prisma.commission.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        source: {
          select: {
            firstName: true,
            lastName: true,
          }
        }
      }
    }),
    prisma.commission.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      commissions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
}));

// Listar indicações
router.get('/referrals', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {
    referredById: req.user!.id,
  };

  if (status === 'active') {
    where.subscription = {
      status: 'ACTIVE'
    };
  } else if (status === 'inactive') {
    where.OR = [
      { subscription: null },
      { subscription: { status: { not: 'ACTIVE' } } }
    ];
  }

  const [referrals, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        subscription: {
          select: {
            status: true,
            startDate: true,
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
    prisma.user.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      referrals,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
}));

// Solicitar saque
router.post('/withdraw', asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const userId = req.user!.id;

  if (!amount || amount <= 0) {
    throw createError('Valor inválido para saque', 400);
  }

  const minWithdrawal = Number(process.env.MIN_WITHDRAWAL_AMOUNT || 50);
  if (amount < minWithdrawal) {
    throw createError(`Valor mínimo para saque é R$ ${minWithdrawal}`, 400);
  }

  // Verificar saldo disponível
  const availableBalance = await prisma.commission.aggregate({
    where: { 
      earnerId: userId,
      status: 'AVAILABLE'
    },
    _sum: { amount: true }
  });

  const balance = availableBalance._sum.amount || 0;

  if (amount > balance) {
    throw createError('Saldo insuficiente', 400);
  }

  // Verificar se usuário tem dados bancários
  const bankData = await prisma.bankData.findUnique({
    where: { userId }
  });

  if (!bankData) {
    throw createError('Dados bancários não cadastrados', 400);
  }

  // Verificar se há solicitação pendente
  const pendingWithdrawal = await prisma.withdrawalRequest.findFirst({
    where: {
      userId,
      status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] }
    }
  });

  if (pendingWithdrawal) {
    throw createError('Você já possui uma solicitação de saque pendente', 400);
  }

  // Criar solicitação de saque
  const withdrawalRequest = await prisma.withdrawalRequest.create({
    data: {
      userId,
      amount,
      status: 'PENDING',
      bankData: {
        bankCode: bankData.bankCode,
        bankName: bankData.bankName,
        agency: bankData.agency,
        account: bankData.account,
        accountType: bankData.accountType,
        holderName: bankData.holderName,
        holderCpf: bankData.holderCpf,
        pixKey: bankData.pixKey,
        pixKeyType: bankData.pixKeyType,
      }
    }
  });

  res.status(201).json({
    success: true,
    message: 'Solicitação de saque criada com sucesso',
    data: { withdrawalRequest }
  });
}));

// Listar solicitações de saque
router.get('/withdrawals', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [withdrawals, total] = await Promise.all([
    prisma.withdrawalRequest.findMany({
      where: { userId: req.user!.id },
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' }
    }),
    prisma.withdrawalRequest.count({
      where: { userId: req.user!.id }
    })
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

// Obter link de indicação
router.get('/referral-link', asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { referralCode: true }
  });

  if (!user) {
    throw createError('Usuário não encontrado', 404);
  }

  const referralLink = `${process.env.FRONTEND_URL}/register?ref=${user.referralCode}`;

  res.json({
    success: true,
    data: { 
      referralCode: user.referralCode,
      referralLink 
    }
  });
}));

export default router;
