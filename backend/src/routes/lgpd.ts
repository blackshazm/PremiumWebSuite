import express from 'express';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticate, requireAdmin } from '../middleware/auth';
import { LGPDService, ConsentType } from '../services/lgpdService';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Schemas de validação
const consentSchema = Joi.object({
  consentType: Joi.string().valid(...Object.values(ConsentType)).required(),
  granted: Joi.boolean().required(),
  purpose: Joi.string().required(),
});

const dataRequestSchema = Joi.object({
  type: Joi.string().valid('ACCESS', 'RECTIFICATION', 'ERASURE', 'PORTABILITY', 'RESTRICTION', 'OBJECTION').required(),
  reason: Joi.string().optional(),
});

const rectificationSchema = Joi.object({
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  phone: Joi.string().optional(),
  birthDate: Joi.date().optional(),
});

// Registrar/atualizar consentimento
router.post('/consent', validateRequest(consentSchema), asyncHandler(async (req, res) => {
  const { consentType, granted, purpose } = req.body;
  const userId = req.user!.id;
  const ipAddress = req.ip;
  const userAgent = req.get('User-Agent');

  await LGPDService.recordConsent(
    userId,
    consentType,
    granted,
    purpose,
    ipAddress,
    userAgent
  );

  res.json({
    success: true,
    message: 'Consentimento registrado com sucesso',
  });
}));

// Obter consentimentos do usuário
router.get('/consent', asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const consents = await prisma.userConsent.findMany({
    where: { userId },
    select: {
      consentType: true,
      granted: true,
      purpose: true,
      grantedAt: true,
      revokedAt: true,
    },
  });

  res.json({
    success: true,
    data: { consents },
  });
}));

// Solicitar acesso aos dados pessoais (Art. 15 LGPD)
router.post('/request/access', asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const userData = await LGPDService.processAccessRequest(userId);

  res.json({
    success: true,
    message: 'Dados pessoais coletados com sucesso',
    data: userData,
  });
}));

// Solicitar portabilidade de dados (Art. 18 LGPD)
router.post('/request/portability', asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const exportPath = await LGPDService.processPortabilityRequest(userId);

  res.json({
    success: true,
    message: 'Solicitação de portabilidade processada. Você receberá um email com o link para download.',
    data: { exportPath },
  });
}));

// Solicitar retificação de dados (Art. 16 LGPD)
router.post('/request/rectification', validateRequest(rectificationSchema), asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const updates = req.body;

  await LGPDService.processRectificationRequest(userId, updates);

  res.json({
    success: true,
    message: 'Dados atualizados com sucesso',
  });
}));

// Solicitar exclusão de dados (Art. 16 LGPD)
router.post('/request/erasure', validateRequest(dataRequestSchema), asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { reason } = req.body;

  // Criar solicitação pendente (requer aprovação administrativa)
  const request = await prisma.dataSubjectRequest.create({
    data: {
      userId,
      type: 'ERASURE',
      status: 'PENDING',
      reason,
      requestedAt: new Date(),
    },
  });

  res.json({
    success: true,
    message: 'Solicitação de exclusão enviada. Será analisada pela equipe em até 15 dias úteis.',
    data: { requestId: request.id },
  });
}));

// Listar solicitações do usuário
router.get('/requests', asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const requests = await prisma.dataSubjectRequest.findMany({
    where: { userId },
    orderBy: { requestedAt: 'desc' },
    select: {
      id: true,
      type: true,
      status: true,
      reason: true,
      requestedAt: true,
      processedAt: true,
      adminNotes: true,
    },
  });

  res.json({
    success: true,
    data: { requests },
  });
}));

// Revogar consentimento específico
router.delete('/consent/:consentType', asyncHandler(async (req, res) => {
  const { consentType } = req.params;
  const userId = req.user!.id;
  const ipAddress = req.ip;
  const userAgent = req.get('User-Agent');

  if (!Object.values(ConsentType).includes(consentType as ConsentType)) {
    throw createError('Tipo de consentimento inválido', 400);
  }

  await LGPDService.recordConsent(
    userId,
    consentType as ConsentType,
    false,
    'Revogação pelo usuário',
    ipAddress,
    userAgent
  );

  res.json({
    success: true,
    message: 'Consentimento revogado com sucesso',
  });
}));

// === ROTAS ADMINISTRATIVAS ===
router.use(requireAdmin);

// Listar todas as solicitações de dados
router.get('/admin/requests', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, type } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};
  if (status) where.status = status;
  if (type) where.type = type;

  const [requests, total] = await Promise.all([
    prisma.dataSubjectRequest.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { requestedAt: 'desc' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        admin: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.dataSubjectRequest.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    },
  });
}));

// Processar solicitação de exclusão
router.patch('/admin/requests/:id/process', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, reason } = req.body;
  const adminId = req.user!.id;

  const request = await prisma.dataSubjectRequest.findUnique({
    where: { id },
  });

  if (!request) {
    throw createError('Solicitação não encontrada', 404);
  }

  if (request.status !== 'PENDING') {
    throw createError('Solicitação já foi processada', 400);
  }

  if (action === 'approve' && request.type === 'ERASURE') {
    await LGPDService.processErasureRequest(request.userId, adminId, reason);
  } else if (action === 'reject') {
    await prisma.dataSubjectRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        processedAt: new Date(),
        adminId,
        adminNotes: reason,
      },
    });
  } else {
    throw createError('Ação inválida', 400);
  }

  res.json({
    success: true,
    message: `Solicitação ${action === 'approve' ? 'aprovada' : 'rejeitada'} com sucesso`,
  });
}));

// Gerar relatório de conformidade LGPD
router.get('/admin/compliance-report', asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    throw createError('Datas de início e fim são obrigatórias', 400);
  }

  const start = new Date(startDate as string);
  const end = new Date(endDate as string);

  const report = await LGPDService.generateComplianceReport(start, end);

  res.json({
    success: true,
    data: { report },
  });
}));

// Obter estatísticas de consentimento
router.get('/admin/consent-stats', asyncHandler(async (req, res) => {
  const stats = await prisma.userConsent.groupBy({
    by: ['consentType', 'granted'],
    _count: true,
  });

  const formattedStats = stats.reduce((acc, stat) => {
    if (!acc[stat.consentType]) {
      acc[stat.consentType] = { granted: 0, revoked: 0 };
    }
    
    if (stat.granted) {
      acc[stat.consentType].granted = stat._count;
    } else {
      acc[stat.consentType].revoked = stat._count;
    }
    
    return acc;
  }, {} as any);

  res.json({
    success: true,
    data: { stats: formattedStats },
  });
}));

// Exportar dados de usuário específico (para auditoria)
router.get('/admin/export-user/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const adminId = req.user!.id;

  const exportPath = await LGPDService.processPortabilityRequest(userId, adminId);

  res.json({
    success: true,
    message: 'Dados do usuário exportados com sucesso',
    data: { exportPath },
  });
}));

export default router;
