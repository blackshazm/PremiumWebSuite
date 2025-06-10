import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { createError } from './errorHandler';

// Estender interface Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role?: string;
      };
    }
  }
}

// Interface para o payload do JWT
interface JWTPayload {
  id: string;
  email: string;
  iat?: number;
  exp?: number;
}

// Middleware de autenticação
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('Token de acesso requerido', 401);
    }

    const token = authHeader.substring(7); // Remove "Bearer "
    
    if (!token) {
      throw createError('Token de acesso requerido', 401);
    }

    // Verificar e decodificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    // Buscar usuário no banco
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        isActive: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw createError('Usuário não encontrado', 401);
    }

    if (!user.isActive) {
      throw createError('Conta desativada', 401);
    }

    if (!user.emailVerified) {
      throw createError('Email não verificado', 401);
    }

    // Adicionar usuário ao request
    req.user = {
      id: user.id,
      email: user.email,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(createError('Token inválido', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(createError('Token expirado', 401));
    } else {
      next(error);
    }
  }
};

// Middleware para verificar se é admin
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Usuário não autenticado', 401);
    }

    // Verificar se o usuário é admin (você pode implementar um sistema de roles)
    // Por enquanto, vamos usar uma lista de emails admin ou um campo no banco
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    
    if (!adminEmails.includes(req.user.email)) {
      throw createError('Acesso negado. Privilégios de administrador requeridos.', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware opcional de autenticação (não falha se não houver token)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        isActive: true,
        emailVerified: true,
      },
    });

    if (user && user.isActive && user.emailVerified) {
      req.user = {
        id: user.id,
        email: user.email,
      };
    }

    next();
  } catch (error) {
    // Em caso de erro, apenas continue sem autenticar
    next();
  }
};

// Função para gerar JWT
export const generateToken = (payload: { id: string; email: string }): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// Função para gerar refresh token
export const generateRefreshToken = (payload: { id: string; email: string }): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  });
};
