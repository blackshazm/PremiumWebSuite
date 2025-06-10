import express from 'express';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Obter planos de assinatura disponíveis
router.get('/plans', asyncHandler(async (req, res) => {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { price: 'asc' }
  });

  res.json({
    success: true,
    data: { plans }
  });
}));

// Obter assinatura atual do usuário
router.get('/current', asyncHandler(async (req, res) => {
  const subscription = await prisma.subscription.findUnique({
    where: { userId: req.user!.id },
    include: {
      plan: true,
      billingHistory: {
        take: 10,
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  res.json({
    success: true,
    data: { subscription }
  });
}));

// Criar nova assinatura
router.post('/subscribe', asyncHandler(async (req, res) => {
  const { planId } = req.body;

  if (!planId) {
    throw createError('ID do plano é obrigatório', 400);
  }

  // Verificar se plano existe e está ativo
  const plan = await prisma.subscriptionPlan.findFirst({
    where: { id: planId, isActive: true }
  });

  if (!plan) {
    throw createError('Plano não encontrado ou inativo', 404);
  }

  // Verificar se usuário já tem assinatura ativa
  const existingSubscription = await prisma.subscription.findUnique({
    where: { userId: req.user!.id }
  });

  if (existingSubscription && existingSubscription.status === 'ACTIVE') {
    throw createError('Usuário já possui assinatura ativa', 400);
  }

  // Criar assinatura
  const subscription = await prisma.subscription.create({
    data: {
      userId: req.user!.id,
      planId,
      status: 'PENDING',
      // nextBillingDate será definido após confirmação do pagamento
    },
    include: {
      plan: true
    }
  });

  res.status(201).json({
    success: true,
    message: 'Assinatura criada com sucesso',
    data: { subscription }
  });
}));

// Cancelar assinatura
router.post('/cancel', asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const subscription = await prisma.subscription.findUnique({
    where: { userId: req.user!.id }
  });

  if (!subscription) {
    throw createError('Assinatura não encontrada', 404);
  }

  if (subscription.status === 'CANCELED') {
    throw createError('Assinatura já cancelada', 400);
  }

  // Atualizar status da assinatura
  const updatedSubscription = await prisma.subscription.update({
    where: { id: subscription.id },
    data: { 
      status: 'CANCELED',
      endDate: new Date()
    },
    include: {
      plan: true
    }
  });

  // Log da atividade
  await prisma.activityLog.create({
    data: {
      userId: req.user!.id,
      action: 'SUBSCRIPTION_CANCELED',
      entity: 'subscription',
      entityId: subscription.id,
      data: { reason }
    }
  });

  res.json({
    success: true,
    message: 'Assinatura cancelada com sucesso',
    data: { subscription: updatedSubscription }
  });
}));

export default router;
