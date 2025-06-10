import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Erro interno do servidor';
  let details: any = null;

  // Log do erro
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Erro customizado da aplicação
  if ('statusCode' in error && error.statusCode) {
    statusCode = error.statusCode;
    message = error.message;
  }
  // Erros do Prisma
  else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        statusCode = 409;
        message = 'Dados duplicados. Este registro já existe.';
        details = {
          field: error.meta?.target,
        };
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Registro não encontrado.';
        break;
      case 'P2003':
        statusCode = 400;
        message = 'Violação de chave estrangeira.';
        break;
      case 'P2014':
        statusCode = 400;
        message = 'Dados inválidos fornecidos.';
        break;
      default:
        statusCode = 400;
        message = 'Erro de banco de dados.';
    }
  }
  // Erro de validação do Prisma
  else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Dados de entrada inválidos.';
  }
  // Erro de conexão do Prisma
  else if (error instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 503;
    message = 'Erro de conexão com o banco de dados.';
  }
  // Erro de sintaxe JSON
  else if (error instanceof SyntaxError && 'body' in error) {
    statusCode = 400;
    message = 'JSON inválido fornecido.';
  }
  // Erro de validação (Joi, express-validator, etc.)
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Dados de entrada inválidos.';
    details = error.message;
  }
  // Erro JWT
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token inválido.';
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expirado.';
  }
  // Erro de multer (upload)
  else if (error.name === 'MulterError') {
    statusCode = 400;
    switch ((error as any).code) {
      case 'LIMIT_FILE_SIZE':
        message = 'Arquivo muito grande.';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Muitos arquivos enviados.';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Campo de arquivo inesperado.';
        break;
      default:
        message = 'Erro no upload do arquivo.';
    }
  }

  // Resposta de erro
  const errorResponse: any = {
    success: false,
    error: {
      message,
      statusCode,
    },
  };

  // Adicionar detalhes em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
    if (details) {
      errorResponse.error.details = details;
    }
  }

  res.status(statusCode).json(errorResponse);
};

// Função para criar erros customizados
export const createError = (message: string, statusCode: number = 500): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

// Wrapper para funções async
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
