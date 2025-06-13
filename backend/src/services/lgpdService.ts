import { prisma } from '../index';
import { AuditService, AuditEventType } from './auditService';
import { BackupService } from './backupService';
import { maskSensitiveData } from '../utils/encryption';

export enum DataProcessingPurpose {
  CONTRACT_EXECUTION = 'CONTRACT_EXECUTION',
  LEGITIMATE_INTEREST = 'LEGITIMATE_INTEREST',
  CONSENT = 'CONSENT',
  LEGAL_OBLIGATION = 'LEGAL_OBLIGATION',
  VITAL_INTERESTS = 'VITAL_INTERESTS',
  PUBLIC_TASK = 'PUBLIC_TASK',
}

export enum ConsentType {
  MARKETING = 'MARKETING',
  ANALYTICS = 'ANALYTICS',
  PERSONALIZATION = 'PERSONALIZATION',
  THIRD_PARTY_SHARING = 'THIRD_PARTY_SHARING',
}

export interface DataSubjectRequest {
  type: 'ACCESS' | 'RECTIFICATION' | 'ERASURE' | 'PORTABILITY' | 'RESTRICTION' | 'OBJECTION';
  userId: string;
  requestedAt: Date;
  processedAt?: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  reason?: string;
  adminNotes?: string;
}

export class LGPDService {
  /**
   * Registra consentimento do usuário
   */
  static async recordConsent(
    userId: string,
    consentType: ConsentType,
    granted: boolean,
    purpose: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await prisma.userConsent.upsert({
        where: {
          userId_consentType: {
            userId,
            consentType,
          },
        },
        update: {
          granted,
          purpose,
          grantedAt: granted ? new Date() : null,
          revokedAt: !granted ? new Date() : null,
          ipAddress,
          userAgent,
        },
        create: {
          userId,
          consentType,
          granted,
          purpose,
          grantedAt: granted ? new Date() : null,
          revokedAt: !granted ? new Date() : null,
          ipAddress,
          userAgent,
        },
      });

      // Registrar no log de auditoria
      await AuditService.logEvent({
        userId,
        eventType: granted ? AuditEventType.USER_UPDATED : AuditEventType.USER_UPDATED,
        entity: 'consent',
        ipAddress,
        userAgent,
        metadata: {
          consentType,
          granted,
          purpose,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Erro ao registrar consentimento:', error);
      throw error;
    }
  }

  /**
   * Verifica se usuário deu consentimento para um tipo específico
   */
  static async hasConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    try {
      const consent = await prisma.userConsent.findUnique({
        where: {
          userId_consentType: {
            userId,
            consentType,
          },
        },
      });

      return consent?.granted || false;
    } catch (error) {
      console.error('Erro ao verificar consentimento:', error);
      return false;
    }
  }

  /**
   * Processa solicitação de acesso aos dados (Art. 15 LGPD)
   */
  static async processAccessRequest(userId: string, adminId?: string): Promise<any> {
    try {
      // Registrar solicitação
      const request = await this.createDataSubjectRequest(userId, 'ACCESS');

      // Coletar todos os dados do usuário
      const userData = await this.collectUserData(userId);

      // Mascarar dados sensíveis para o relatório
      const maskedData = maskSensitiveData(userData);

      // Atualizar status da solicitação
      await this.updateRequestStatus(request.id, 'COMPLETED', adminId);

      // Registrar no log de auditoria
      await AuditService.logEvent({
        userId,
        adminId,
        eventType: AuditEventType.DATA_EXPORTED,
        entity: 'user_data',
        entityId: userId,
        metadata: {
          requestType: 'ACCESS',
          dataTypes: Object.keys(userData),
          timestamp: new Date().toISOString(),
        },
      });

      return maskedData;
    } catch (error) {
      console.error('Erro ao processar solicitação de acesso:', error);
      throw error;
    }
  }

  /**
   * Processa solicitação de portabilidade de dados (Art. 18 LGPD)
   */
  static async processPortabilityRequest(userId: string, adminId?: string): Promise<string> {
    try {
      // Registrar solicitação
      const request = await this.createDataSubjectRequest(userId, 'PORTABILITY');

      // Exportar dados do usuário
      const exportPath = await BackupService.exportUserData(userId);

      // Atualizar status da solicitação
      await this.updateRequestStatus(request.id, 'COMPLETED', adminId);

      // Registrar no log de auditoria
      await AuditService.logEvent({
        userId,
        adminId,
        eventType: AuditEventType.DATA_EXPORTED,
        entity: 'user_data',
        entityId: userId,
        metadata: {
          requestType: 'PORTABILITY',
          exportPath,
          timestamp: new Date().toISOString(),
        },
      });

      return exportPath;
    } catch (error) {
      console.error('Erro ao processar solicitação de portabilidade:', error);
      throw error;
    }
  }

  /**
   * Processa solicitação de exclusão de dados (Art. 16 LGPD)
   */
  static async processErasureRequest(
    userId: string,
    adminId: string,
    reason?: string
  ): Promise<void> {
    try {
      // Registrar solicitação
      const request = await this.createDataSubjectRequest(userId, 'ERASURE');

      // Verificar se há impedimentos legais para exclusão
      const canErase = await this.canEraseUserData(userId);
      
      if (!canErase.allowed) {
        await this.updateRequestStatus(request.id, 'REJECTED', adminId, canErase.reason);
        throw new Error(canErase.reason);
      }

      // Criar backup antes da exclusão
      const backupPath = await BackupService.exportUserData(userId);

      // Anonimizar dados em vez de excluir (para manter integridade referencial)
      await this.anonymizeUserData(userId);

      // Atualizar status da solicitação
      await this.updateRequestStatus(request.id, 'COMPLETED', adminId, reason);

      // Registrar no log de auditoria
      await AuditService.logEvent({
        userId,
        adminId,
        eventType: AuditEventType.USER_DEACTIVATED,
        entity: 'user',
        entityId: userId,
        metadata: {
          requestType: 'ERASURE',
          reason,
          backupPath,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Erro ao processar solicitação de exclusão:', error);
      throw error;
    }
  }

  /**
   * Processa solicitação de retificação de dados (Art. 16 LGPD)
   */
  static async processRectificationRequest(
    userId: string,
    updates: any,
    adminId?: string
  ): Promise<void> {
    try {
      // Registrar solicitação
      const request = await this.createDataSubjectRequest(userId, 'RECTIFICATION');

      // Obter dados atuais
      const currentData = await this.collectUserData(userId);

      // Aplicar atualizações
      await prisma.user.update({
        where: { id: userId },
        data: updates,
      });

      // Atualizar status da solicitação
      await this.updateRequestStatus(request.id, 'COMPLETED', adminId);

      // Registrar no log de auditoria
      await AuditService.logEvent({
        userId,
        adminId,
        eventType: AuditEventType.USER_UPDATED,
        entity: 'user',
        entityId: userId,
        oldData: currentData.user,
        newData: updates,
        metadata: {
          requestType: 'RECTIFICATION',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Erro ao processar solicitação de retificação:', error);
      throw error;
    }
  }

  /**
   * Cria uma solicitação de titular de dados
   */
  private static async createDataSubjectRequest(
    userId: string,
    type: DataSubjectRequest['type']
  ): Promise<any> {
    return await prisma.dataSubjectRequest.create({
      data: {
        userId,
        type,
        status: 'PENDING',
        requestedAt: new Date(),
      },
    });
  }

  /**
   * Atualiza status de uma solicitação
   */
  private static async updateRequestStatus(
    requestId: string,
    status: DataSubjectRequest['status'],
    adminId?: string,
    notes?: string
  ): Promise<void> {
    await prisma.dataSubjectRequest.update({
      where: { id: requestId },
      data: {
        status,
        processedAt: status === 'COMPLETED' ? new Date() : undefined,
        adminId,
        adminNotes: notes,
      },
    });
  }

  /**
   * Coleta todos os dados de um usuário
   */
  private static async collectUserData(userId: string): Promise<any> {
    const [
      user,
      address,
      bankData,
      subscription,
      orders,
      commissions,
      withdrawals,
      consents,
      auditLogs,
    ] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.address.findUnique({ where: { userId } }),
      prisma.bankData.findUnique({ where: { userId } }),
      prisma.subscription.findUnique({ where: { userId } }),
      prisma.order.findMany({ where: { userId } }),
      prisma.commission.findMany({ where: { earnerId: userId } }),
      prisma.withdrawalRequest.findMany({ where: { userId } }),
      prisma.userConsent.findMany({ where: { userId } }),
      prisma.auditLog.findMany({ 
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 100, // Limitar logs para evitar arquivos muito grandes
      }),
    ]);

    return {
      user,
      address,
      bankData,
      subscription,
      orders,
      commissions,
      withdrawals,
      consents,
      auditLogs,
      collectedAt: new Date().toISOString(),
    };
  }

  /**
   * Verifica se os dados do usuário podem ser excluídos
   */
  private static async canEraseUserData(userId: string): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    // Verificar obrigações legais que impedem exclusão
    const [
      activeSubscription,
      recentOrders,
      pendingWithdrawals,
      taxObligations,
    ] = await Promise.all([
      prisma.subscription.findFirst({
        where: { userId, status: 'ACTIVE' }
      }),
      prisma.order.findMany({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000) } // 5 anos
        }
      }),
      prisma.withdrawalRequest.findMany({
        where: { userId, status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] } }
      }),
      // Verificar se há obrigações fiscais (últimos 5 anos)
      prisma.billingHistory.findMany({
        where: {
          subscription: { userId },
          createdAt: { gte: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000) }
        }
      }),
    ]);

    if (activeSubscription) {
      return {
        allowed: false,
        reason: 'Usuário possui assinatura ativa. Cancele a assinatura antes de solicitar exclusão.',
      };
    }

    if (pendingWithdrawals.length > 0) {
      return {
        allowed: false,
        reason: 'Usuário possui solicitações de saque pendentes.',
      };
    }

    if (taxObligations.length > 0) {
      return {
        allowed: false,
        reason: 'Dados devem ser mantidos por 5 anos para fins fiscais conforme legislação brasileira.',
      };
    }

    return { allowed: true };
  }

  /**
   * Anonimiza dados do usuário
   */
  private static async anonymizeUserData(userId: string): Promise<void> {
    const anonymizedData = {
      firstName: 'ANONIMIZADO',
      lastName: 'ANONIMIZADO',
      email: `anonimizado_${userId}@example.com`,
      cpf: '00000000000',
      phone: null,
      birthDate: null,
      isActive: false,
      emailVerified: false,
    };

    await prisma.$transaction([
      // Anonimizar dados do usuário
      prisma.user.update({
        where: { id: userId },
        data: anonymizedData,
      }),

      // Remover endereço
      prisma.address.deleteMany({
        where: { userId },
      }),

      // Remover dados bancários
      prisma.bankData.deleteMany({
        where: { userId },
      }),

      // Remover consentimentos
      prisma.userConsent.deleteMany({
        where: { userId },
      }),
    ]);
  }

  /**
   * Gera relatório de conformidade LGPD
   */
  static async generateComplianceReport(startDate: Date, endDate: Date): Promise<any> {
    const [
      totalUsers,
      dataSubjectRequests,
      consentStats,
      breachIncidents,
    ] = await Promise.all([
      prisma.user.count(),
      
      prisma.dataSubjectRequest.findMany({
        where: {
          requestedAt: { gte: startDate, lte: endDate }
        },
        include: {
          user: {
            select: { firstName: true, lastName: true }
          }
        }
      }),

      prisma.userConsent.groupBy({
        by: ['consentType', 'granted'],
        _count: true,
      }),

      // Buscar incidentes de segurança
      prisma.auditLog.findMany({
        where: {
          eventType: {
            in: [
              AuditEventType.SUSPICIOUS_ACTIVITY,
              AuditEventType.DATA_BREACH_ATTEMPT,
              AuditEventType.UNAUTHORIZED_ACCESS,
            ]
          },
          timestamp: { gte: startDate, lte: endDate }
        }
      }),
    ]);

    // Agrupar solicitações por tipo e status
    const requestsByType = dataSubjectRequests.reduce((acc, req) => {
      if (!acc[req.type]) acc[req.type] = {};
      if (!acc[req.type][req.status]) acc[req.type][req.status] = 0;
      acc[req.type][req.status]++;
      return acc;
    }, {} as any);

    return {
      period: { startDate, endDate },
      summary: {
        totalUsers,
        totalRequests: dataSubjectRequests.length,
        breachIncidents: breachIncidents.length,
      },
      dataSubjectRequests: {
        byType: requestsByType,
        details: dataSubjectRequests.map(req => ({
          id: req.id,
          type: req.type,
          status: req.status,
          requestedAt: req.requestedAt,
          processedAt: req.processedAt,
          user: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'Usuário removido',
        })),
      },
      consentManagement: {
        stats: consentStats,
        totalConsents: consentStats.reduce((sum, stat) => sum + stat._count, 0),
      },
      securityIncidents: breachIncidents.map(incident => ({
        id: incident.id,
        type: incident.eventType,
        timestamp: incident.timestamp,
        ipAddress: incident.ipAddress,
        description: incident.errorMessage,
      })),
      generatedAt: new Date().toISOString(),
    };
  }
}
