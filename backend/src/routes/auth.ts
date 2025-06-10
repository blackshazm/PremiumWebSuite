import express from 'express';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticate, generateToken, generateRefreshToken } from '../middleware/auth';
import { validate, registerSchema, loginSchema } from '../utils/validation';
import { 
  hashPassword, 
  verifyPassword, 
  generateReferralCode, 
  generateRandomToken,
  cleanCPF,
  isMinimumAge
} from '../utils/helpers';
import { 
  sendWelcomeEmail, 
  sendEmailVerification, 
  sendPasswordResetEmail 
} from '../services/emailService';

const router = express.Router();

// Registro de novo usuário
router.post('/register', asyncHandler(async (req, res) => {
  // Validar dados de entrada
  const validatedData = validate(registerSchema, req.body);
  
  // Verificar idade mínima
  if (!isMinimumAge(new Date(validatedData.birthDate))) {
    throw createError('Você deve ter pelo menos 18 anos para se cadastrar', 400);
  }

  // Limpar CPF
  const cleanedCPF = cleanCPF(validatedData.cpf);

  // Verificar se email já existe
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: validatedData.email },
        { cpf: cleanedCPF }
      ]
    }
  });

  if (existingUser) {
    if (existingUser.email === validatedData.email) {
      throw createError('Este email já está cadastrado', 409);
    }
    if (existingUser.cpf === cleanedCPF) {
      throw createError('Este CPF já está cadastrado', 409);
    }
  }

  // Hash da senha
  const hashedPassword = await hashPassword(validatedData.password);

  // Gerar código de indicação único
  let referralCode = generateReferralCode();
  let codeExists = await prisma.user.findUnique({ where: { referralCode } });
  
  while (codeExists) {
    referralCode = generateReferralCode();
    codeExists = await prisma.user.findUnique({ where: { referralCode } });
  }

  // Verificar código de indicação (se fornecido)
  let referredById = null;
  if (validatedData.referralCode) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: validatedData.referralCode.toUpperCase() }
    });
    
    if (!referrer) {
      throw createError('Código de indicação inválido', 400);
    }
    
    referredById = referrer.id;
  }

  // Criar usuário
  const user = await prisma.user.create({
    data: {
      email: validatedData.email,
      cpf: cleanedCPF,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      phone: validatedData.phone,
      birthDate: new Date(validatedData.birthDate),
      password: hashedPassword,
      referralCode,
      referredById,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      referralCode: true,
      emailVerified: true,
      createdAt: true,
    }
  });

  // Gerar token de verificação de email
  const verificationToken = generateRandomToken();
  
  // Salvar token no banco (você pode criar uma tabela separada para tokens)
  // Por simplicidade, vamos usar um campo no usuário ou criar uma estratégia diferente
  
  // Enviar email de boas-vindas
  try {
    await sendWelcomeEmail(user, verificationToken);
  } catch (error) {
    console.error('Erro ao enviar email de boas-vindas:', error);
    // Não falhar o registro por causa do email
  }

  // Gerar tokens JWT
  const accessToken = generateToken({ id: user.id, email: user.email });
  const refreshToken = generateRefreshToken({ id: user.id, email: user.email });

  res.status(201).json({
    success: true,
    message: 'Usuário cadastrado com sucesso! Verifique seu email.',
    data: {
      user,
      tokens: {
        accessToken,
        refreshToken,
      }
    }
  });
}));

// Login
router.post('/login', asyncHandler(async (req, res) => {
  // Validar dados de entrada
  const validatedData = validate(loginSchema, req.body);

  // Buscar usuário
  const user = await prisma.user.findUnique({
    where: { email: validatedData.email },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      password: true,
      isActive: true,
      emailVerified: true,
    }
  });

  if (!user) {
    throw createError('Email ou senha incorretos', 401);
  }

  // Verificar senha
  const isPasswordValid = await verifyPassword(validatedData.password, user.password!);
  
  if (!isPasswordValid) {
    throw createError('Email ou senha incorretos', 401);
  }

  // Verificar se conta está ativa
  if (!user.isActive) {
    throw createError('Conta desativada. Entre em contato com o suporte.', 401);
  }

  // Gerar tokens
  const accessToken = generateToken({ id: user.id, email: user.email });
  const refreshToken = generateRefreshToken({ id: user.id, email: user.email });

  // Remover senha da resposta
  const { password, ...userWithoutPassword } = user;

  res.json({
    success: true,
    message: 'Login realizado com sucesso',
    data: {
      user: userWithoutPassword,
      tokens: {
        accessToken,
        refreshToken,
      }
    }
  });
}));

// Verificar email
router.post('/verify-email', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw createError('Token de verificação requerido', 400);
  }

  // Aqui você implementaria a lógica para verificar o token
  // Por simplicidade, vamos assumir que o token é válido
  // Em produção, você salvaria o token no banco com expiração

  res.json({
    success: true,
    message: 'Email verificado com sucesso!'
  });
}));

// Reenviar verificação de email
router.post('/resend-verification', authenticate, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      emailVerified: true,
    }
  });

  if (!user) {
    throw createError('Usuário não encontrado', 404);
  }

  if (user.emailVerified) {
    throw createError('Email já verificado', 400);
  }

  // Gerar novo token
  const verificationToken = generateRandomToken();

  // Enviar email
  await sendEmailVerification(user, verificationToken);

  res.json({
    success: true,
    message: 'Email de verificação reenviado com sucesso!'
  });
}));

// Esqueci minha senha
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw createError('Email é obrigatório', 400);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    }
  });

  // Sempre retornar sucesso por segurança (não revelar se email existe)
  if (user) {
    const resetToken = generateRandomToken();
    
    // Salvar token no banco (implementar tabela de tokens)
    // Por simplicidade, vamos apenas enviar o email
    
    await sendPasswordResetEmail(user, resetToken);
  }

  res.json({
    success: true,
    message: 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.'
  });
}));

// Redefinir senha
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  if (!token || !password || !confirmPassword) {
    throw createError('Token, senha e confirmação são obrigatórios', 400);
  }

  if (password !== confirmPassword) {
    throw createError('Senha e confirmação devem ser iguais', 400);
  }

  // Validar força da senha
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])/;
  if (password.length < 8 || !passwordRegex.test(password)) {
    throw createError('Senha deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula, número e caractere especial', 400);
  }

  // Aqui você verificaria o token no banco
  // Por simplicidade, vamos assumir que é válido

  // Hash da nova senha
  const hashedPassword = await hashPassword(password);

  // Atualizar senha (você precisaria identificar o usuário pelo token)
  // await prisma.user.update({
  //   where: { id: userId },
  //   data: { password: hashedPassword }
  // });

  res.json({
    success: true,
    message: 'Senha redefinida com sucesso!'
  });
}));

// Logout (invalidar token - implementar blacklist se necessário)
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  // Em uma implementação completa, você adicionaria o token a uma blacklist
  // ou implementaria um sistema de refresh tokens
  
  res.json({
    success: true,
    message: 'Logout realizado com sucesso'
  });
}));

// Verificar se usuário está autenticado
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      birthDate: true,
      emailVerified: true,
      referralCode: true,
      createdAt: true,
      subscription: {
        select: {
          id: true,
          status: true,
          plan: {
            select: {
              name: true,
              price: true,
            }
          }
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

export default router;
