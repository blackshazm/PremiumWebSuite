import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { createError } from './errorHandler';

// Rate limiting para diferentes endpoints
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message || 'Muitas tentativas. Tente novamente mais tarde.',
      statusCode: 429,
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: {
          message: message || 'Muitas tentativas. Tente novamente mais tarde.',
          statusCode: 429,
        },
      });
    },
  });
};

// Rate limiting específico para login
export const loginRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutos
  5, // 5 tentativas
  'Muitas tentativas de login. Tente novamente em 15 minutos.'
);

// Rate limiting para registro
export const registerRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hora
  3, // 3 registros
  'Muitas tentativas de registro. Tente novamente em 1 hora.'
);

// Rate limiting para recuperação de senha
export const passwordResetRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hora
  3, // 3 tentativas
  'Muitas tentativas de recuperação de senha. Tente novamente em 1 hora.'
);

// Rate limiting para APIs sensíveis
export const sensitiveApiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutos
  10, // 10 tentativas
  'Muitas tentativas para esta operação. Tente novamente em 15 minutos.'
);

// Slow down para endpoints de busca
export const searchSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutos
  delayAfter: 50, // Permitir 50 requests sem delay
  delayMs: 100, // Adicionar 100ms de delay após o limite
  maxDelayMs: 2000, // Máximo de 2 segundos de delay
});

// Middleware para validar User-Agent
export const validateUserAgent = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.get('User-Agent');
  
  if (!userAgent) {
    return next(createError('User-Agent obrigatório', 400));
  }

  // Bloquear bots conhecidos maliciosos
  const maliciousBots = [
    'sqlmap',
    'nikto',
    'nmap',
    'masscan',
    'zap',
    'burp',
    'w3af',
  ];

  const lowerUserAgent = userAgent.toLowerCase();
  const isMalicious = maliciousBots.some(bot => lowerUserAgent.includes(bot));

  if (isMalicious) {
    return next(createError('Acesso negado', 403));
  }

  next();
};

// Middleware para validar Content-Type em requests POST/PUT
export const validateContentType = (req: Request, res: Response, next: NextFunction) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    
    if (!contentType) {
      return next(createError('Content-Type obrigatório', 400));
    }

    // Permitir apenas tipos de conteúdo seguros
    const allowedTypes = [
      'application/json',
      'multipart/form-data',
      'application/x-www-form-urlencoded',
    ];

    const isAllowed = allowedTypes.some(type => contentType.includes(type));

    if (!isAllowed) {
      return next(createError('Content-Type não permitido', 400));
    }
  }

  next();
};

// Middleware para detectar tentativas de SQL Injection
export const detectSQLInjection = (req: Request, res: Response, next: NextFunction) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(\'|\"|;|--|\*|\/\*|\*\/)/,
    /(\bOR\b|\bAND\b).*(\=|\<|\>)/i,
    /(1=1|1=0)/,
    /(\bUNION\b.*\bSELECT\b)/i,
  ];

  const checkForSQLInjection = (obj: any, path = ''): boolean => {
    if (typeof obj === 'string') {
      return sqlPatterns.some(pattern => pattern.test(obj));
    }

    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (checkForSQLInjection(obj[key], `${path}.${key}`)) {
          return true;
        }
      }
    }

    return false;
  };

  // Verificar query parameters
  if (checkForSQLInjection(req.query)) {
    return next(createError('Parâmetros inválidos detectados', 400));
  }

  // Verificar body
  if (checkForSQLInjection(req.body)) {
    return next(createError('Dados inválidos detectados', 400));
  }

  next();
};

// Middleware para detectar tentativas de XSS
export const detectXSS = (req: Request, res: Response, next: NextFunction) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]+src[^>]*>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  ];

  const checkForXSS = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return xssPatterns.some(pattern => pattern.test(obj));
    }

    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (checkForXSS(obj[key])) {
          return true;
        }
      }
    }

    return false;
  };

  // Verificar query parameters
  if (checkForXSS(req.query)) {
    return next(createError('Conteúdo potencialmente perigoso detectado', 400));
  }

  // Verificar body
  if (checkForXSS(req.body)) {
    return next(createError('Conteúdo potencialmente perigoso detectado', 400));
  }

  next();
};

// Middleware para validar tamanho do payload
export const validatePayloadSize = (maxSize: number = 10 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');

    if (contentLength > maxSize) {
      return next(createError('Payload muito grande', 413));
    }

    next();
  };
};

// Middleware para log de segurança
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const securityInfo = {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    method: req.method,
    url: req.originalUrl,
    timestamp: new Date().toISOString(),
    headers: {
      'x-forwarded-for': req.get('X-Forwarded-For'),
      'x-real-ip': req.get('X-Real-IP'),
      'referer': req.get('Referer'),
    },
  };

  // Log apenas para endpoints sensíveis
  const sensitiveEndpoints = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/admin',
    '/user/bank-data',
    '/commissions/withdraw',
  ];

  const isSensitive = sensitiveEndpoints.some(endpoint => 
    req.originalUrl.includes(endpoint)
  );

  if (isSensitive) {
    console.log('Security Log:', JSON.stringify(securityInfo, null, 2));
  }

  next();
};

// Middleware para detectar múltiplos IPs suspeitos
const suspiciousIPs = new Map<string, { count: number; lastSeen: Date }>();

export const detectSuspiciousActivity = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip;
  const now = new Date();
  const oneHour = 60 * 60 * 1000;

  // Limpar IPs antigos
  for (const [suspiciousIP, data] of suspiciousIPs.entries()) {
    if (now.getTime() - data.lastSeen.getTime() > oneHour) {
      suspiciousIPs.delete(suspiciousIP);
    }
  }

  // Verificar se IP está na lista de suspeitos
  const suspiciousData = suspiciousIPs.get(ip);
  if (suspiciousData) {
    suspiciousData.count++;
    suspiciousData.lastSeen = now;

    if (suspiciousData.count > 100) { // Mais de 100 requests em 1 hora
      return next(createError('Atividade suspeita detectada', 429));
    }
  } else {
    suspiciousIPs.set(ip, { count: 1, lastSeen: now });
  }

  next();
};

// Middleware para validar origem das requisições
export const validateOrigin = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('Origin') || req.get('Referer');
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'https://localhost:3000',
  ].filter(Boolean);

  // Permitir requisições sem origem (ex: Postman, mobile apps)
  if (!origin) {
    return next();
  }

  const isAllowed = allowedOrigins.some(allowedOrigin => 
    origin.startsWith(allowedOrigin!)
  );

  if (!isAllowed) {
    return next(createError('Origem não permitida', 403));
  }

  next();
};
