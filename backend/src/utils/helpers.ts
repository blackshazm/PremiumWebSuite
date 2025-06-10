import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Função para hash de senha
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Função para verificar senha
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

// Função para gerar código de indicação único
export const generateReferralCode = (): string => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// Função para gerar número de pedido único
export const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `BC${timestamp.slice(-6)}${random}`;
};

// Função para formatar CPF
export const formatCPF = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

// Função para limpar CPF (remover formatação)
export const cleanCPF = (cpf: string): string => {
  return cpf.replace(/\D/g, '');
};

// Função para formatar CEP
export const formatCEP = (cep: string): string => {
  const cleaned = cep.replace(/\D/g, '');
  return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
};

// Função para limpar CEP
export const cleanCEP = (cep: string): string => {
  return cep.replace(/\D/g, '');
};

// Função para formatar telefone
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
};

// Função para limpar telefone
export const cleanPhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

// Função para formatar moeda brasileira
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Função para gerar slug a partir de string
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-') // Remove hífens duplicados
    .trim();
};

// Função para calcular idade
export const calculateAge = (birthDate: Date): number => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

// Função para validar idade mínima
export const isMinimumAge = (birthDate: Date, minimumAge: number = 18): boolean => {
  return calculateAge(birthDate) >= minimumAge;
};

// Função para gerar token aleatório
export const generateRandomToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

// Função para mascarar email
export const maskEmail = (email: string): string => {
  const [localPart, domain] = email.split('@');
  const maskedLocal = localPart.charAt(0) + '*'.repeat(localPart.length - 2) + localPart.charAt(localPart.length - 1);
  return `${maskedLocal}@${domain}`;
};

// Função para mascarar CPF
export const maskCPF = (cpf: string): string => {
  const cleaned = cleanCPF(cpf);
  return cleaned.replace(/(\d{3})\d{3}(\d{3})(\d{2})/, '$1.***.$2-$3');
};

// Função para mascarar telefone
export const maskPhone = (phone: string): string => {
  const cleaned = cleanPhone(phone);
  
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})\d{5}(\d{4})/, '($1) *****-$2');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})\d{4}(\d{4})/, '($1) ****-$2');
  }
  
  return phone;
};

// Função para calcular comissão
export const calculateCommission = (amount: number, percentage: number): number => {
  return Math.round((amount * percentage) * 100) / 100;
};

// Função para adicionar dias a uma data
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Função para verificar se uma data está no passado
export const isPastDate = (date: Date): boolean => {
  return date < new Date();
};

// Função para verificar se uma data está no futuro
export const isFutureDate = (date: Date): boolean => {
  return date > new Date();
};

// Função para formatar data brasileira
export const formatDateBR = (date: Date): string => {
  return new Intl.DateTimeFormat('pt-BR').format(date);
};

// Função para formatar data e hora brasileira
export const formatDateTimeBR = (date: Date): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};

// Função para sanitizar string (remover HTML)
export const sanitizeString = (str: string): string => {
  return str.replace(/<[^>]*>/g, '').trim();
};

// Função para truncar texto
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

// Função para gerar código de verificação numérico
export const generateVerificationCode = (length: number = 6): string => {
  const digits = '0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  
  return result;
};

// Função para validar se string é JSON válido
export const isValidJSON = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

// Função para remover propriedades undefined/null de objeto
export const cleanObject = (obj: any): any => {
  const cleaned: any = {};
  
  for (const key in obj) {
    if (obj[key] !== undefined && obj[key] !== null) {
      cleaned[key] = obj[key];
    }
  }
  
  return cleaned;
};

// Função para delay (útil para testes e rate limiting)
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
