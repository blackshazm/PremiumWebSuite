import { prisma } from '../index';
import { maskSensitiveData } from '../utils/encryption';

// Tipos de eventos de auditoria
export enum AuditEventType {
  // Autenticação
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  
  // Conta do usuário
  USER_REGISTERED = 'USER_REGISTERED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_REACTIVATED = 'USER_REACTIVATED',
  
  // Dados sensíveis
  BANK_DATA_ADDED = 'BANK_DATA_ADDED',
  BANK_DATA_UPDATED = 'BANK_DATA_UPDATED',
  BANK_DATA_VIEWED = 'BANK_DATA_VIEWED',
  
  // Transações financeiras
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_CANCELED = 'SUBSCRIPTION_CANCELED',
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  REFUND_PROCESSED = 'REFUND_PROCESSED',
  
  // Comissões
  COMMISSION_EARNED = 'COMMISSION_EARNED',
  COMMISSION_PAID = 'COMMISSION_PAID',
  WITHDRAWAL_REQUESTED = 'WITHDRAWAL_REQUESTED',
  WITHDRAWAL_APPROVED = 'WITHDRAWAL_APPROVED',
  WITHDRAWAL_REJECTED = 'WITHDRAWAL_REJECTED',
  WITHDRAWAL_PAID = 'WITHDRAWAL_PAID',
  
  // Pedidos
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  ORDER_CANCELED = 'ORDER_CANCELED',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  
  // Administração
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_ACTION = 'ADMIN_ACTION',
  USER_IMPERSONATED = 'USER_IMPERSONATED',
  DATA_EXPORTED = 'DATA_EXPORTED',
  
  // Segurança
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  DATA_BREACH_ATTEMPT = 'DATA_BREACH_ATTEMPT',
  
  // Sistema
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  BACKUP_CREATED = 'BACKUP_CREATED',
  BACKUP_RESTORED = 'BACKUP_RESTORED',
}

// Interface para dados de auditoria
export interface AuditData {
  userId?: string;
  adminId?: string;
  eventType: AuditEventType;
  entity?: string;
  entityId?: string;
  oldData?: any;
  newData?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

// Classe principal do serviço de auditoria
export class AuditService {
  /**
   * Registra um evento de auditoria
   */
  static async logEvent(data: AuditData): Promise<void> {
    try {
      // Mascarar dados sensíveis
      const maskedOldData = data.oldData ? maskSensitiveData(data.oldData) : null;
      const maskedNewData = data.newData ? maskSensitiveData(data.newData) : null;
      const maskedMetadata = data.metadata ? maskSensitiveData(data.metadata) : null;

      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          adminId: data.adminId,
          eventType: data.eventType,
          entity: data.entity,
          entityId: data.entityId,
          oldData: maskedOldData,
          newData: maskedNewData,
          metadata: maskedMetadata,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          success: data.success ?? true,
          errorMessage: data.errorMessage,
          timestamp: new Date(),
        },
      });

      // Log crítico para eventos de segurança
      if (this.isCriticalEvent(data.eventType)) {
        console.error('CRITICAL SECURITY EVENT:', {
          eventType: data.eventType,
          userId: data.userId,
          ipAddress: data.ipAddress,
          timestamp: new Date().toISOString(),
          metadata: maskedMetadata,
        });
      }
    } catch (error) {
      console.error('Erro ao registrar evento de auditoria:', error);
      // Não falhar a operação principal por erro de auditoria
    }
  }

  /**
   * Verifica se é um evento crítico de segurança
   */
  private static isCriticalEvent(eventType: AuditEventType): boolean {
    const criticalEvents = [
      AuditEventType.SUSPICIOUS_ACTIVITY,
      AuditEventType.UNAUTHORIZED_ACCESS,
      AuditEventType.DATA_BREACH_ATTEMPT,
      AuditEventType.RATE_LIMIT_EXCEEDED,
      AuditEventType.LOGIN_FAILED,
    ];

    return criticalEvents.includes(eventType);
  }

  /**
   * Registra login bem-sucedido
   */
  static async logLoginSuccess(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      userId,
      eventType: AuditEventType.LOGIN_SUCCESS,
      ipAddress,
      userAgent,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Registra tentativa de login falhada
   */
  static async logLoginFailed(email: string, ipAddress?: string, userAgent?: string, reason?: string): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.LOGIN_FAILED,
      ipAddress,
      userAgent,
      success: false,
      errorMessage: reason,
      metadata: {
        email: maskSensitiveData({ email }).email,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Registra alteração de dados do usuário
   */
  static async logUserUpdate(
    userId: string,
    oldData: any,
    newData: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent({
      userId,
      eventType: AuditEventType.USER_UPDATED,
      entity: 'user',
      entityId: userId,
      oldData,
      newData,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Registra acesso a dados bancários
   */
  static async logBankDataAccess(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      userId,
      eventType: AuditEventType.BANK_DATA_VIEWED,
      entity: 'bankData',
      ipAddress,
      userAgent,
      metadata: {
        accessTime: new Date().toISOString(),
      },
    });
  }

  /**
   * Registra transação financeira
   */
  static async logPayment(
    userId: string,
    amount: number,
    method: string,
    success: boolean,
    transactionId?: string,
    errorMessage?: string
  ): Promise<void> {
    await this.logEvent({
      userId,
      eventType: success ? AuditEventType.PAYMENT_PROCESSED : AuditEventType.PAYMENT_FAILED,
      entity: 'payment',
      entityId: transactionId,
      success,
      errorMessage,
      metadata: {
        amount,
        method,
        transactionId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Registra atividade suspeita
   */
  static async logSuspiciousActivity(
    description: string,
    ipAddress?: string,
    userAgent?: string,
    userId?: string,
    metadata?: any
  ): Promise<void> {
    await this.logEvent({
      userId,
      eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
      ipAddress,
      userAgent,
      success: false,
      errorMessage: description,
      metadata: {
        description,
        detectedAt: new Date().toISOString(),
        ...metadata,
      },
    });
  }

  /**
   * Registra ação administrativa
   */
  static async logAdminAction(
    adminId: string,
    action: string,
    targetUserId?: string,
    entity?: string,
    entityId?: string,
    oldData?: any,
    newData?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent({
      adminId,
      userId: targetUserId,
      eventType: AuditEventType.ADMIN_ACTION,
      entity,
      entityId,
      oldData,
      newData,
      ipAddress,
      userAgent,
      metadata: {
        action,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Busca logs de auditoria com filtros
   */
  static async getLogs(filters: {
    userId?: string;
    eventType?: AuditEventType;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { userId, eventType, startDate, endDate, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (userId) where.userId = userId;
    if (eventType) where.eventType = eventType;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
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
              email: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Gera relatório de segurança
   */
  static async generateSecurityReport(startDate: Date, endDate: Date) {
    const securityEvents = [
      AuditEventType.LOGIN_FAILED,
      AuditEventType.SUSPICIOUS_ACTIVITY,
      AuditEventType.UNAUTHORIZED_ACCESS,
      AuditEventType.RATE_LIMIT_EXCEEDED,
      AuditEventType.DATA_BREACH_ATTEMPT,
    ];

    const events = await prisma.auditLog.findMany({
      where: {
        eventType: { in: securityEvents },
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Agrupar por tipo de evento
    const eventsByType = events.reduce((acc, event) => {
      if (!acc[event.eventType]) {
        acc[event.eventType] = [];
      }
      acc[event.eventType].push(event);
      return acc;
    }, {} as Record<string, any[]>);

    // Agrupar por IP
    const eventsByIP = events.reduce((acc, event) => {
      const ip = event.ipAddress || 'unknown';
      if (!acc[ip]) {
        acc[ip] = [];
      }
      acc[ip].push(event);
      return acc;
    }, {} as Record<string, any[]>);

    return {
      summary: {
        totalEvents: events.length,
        period: { startDate, endDate },
        eventTypes: Object.keys(eventsByType).length,
        uniqueIPs: Object.keys(eventsByIP).length,
      },
      eventsByType,
      topSuspiciousIPs: Object.entries(eventsByIP)
        .sort(([, a], [, b]) => b.length - a.length)
        .slice(0, 10)
        .map(([ip, events]) => ({ ip, count: events.length })),
      recentEvents: events.slice(0, 20),
    };
  }
}
