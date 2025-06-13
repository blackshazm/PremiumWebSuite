import crypto from 'crypto';

// Configurações de criptografia
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

// Chave de criptografia derivada da variável de ambiente
const getEncryptionKey = (): Buffer => {
  const secret = process.env.ENCRYPTION_SECRET || 'default-secret-key-change-in-production';
  return crypto.scryptSync(secret, 'salt', KEY_LENGTH);
};

// Interface para dados criptografados
export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

/**
 * Criptografa uma string usando AES-256-GCM
 */
export const encrypt = (text: string): EncryptedData => {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipher(ALGORITHM, key);
    cipher.setAAD(Buffer.from('bioclub-plus', 'utf8'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  } catch (error) {
    throw new Error('Erro ao criptografar dados');
  }
};

/**
 * Descriptografa dados usando AES-256-GCM
 */
export const decrypt = (encryptedData: EncryptedData): string => {
  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');
    
    const decipher = crypto.createDecipher(ALGORITHM, key);
    decipher.setAAD(Buffer.from('bioclub-plus', 'utf8'));
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Erro ao descriptografar dados');
  }
};

/**
 * Criptografa dados bancários
 */
export const encryptBankData = (bankData: {
  bankCode: string;
  agency: string;
  account: string;
  holderCpf: string;
  pixKey?: string;
}): any => {
  return {
    bankCode: encrypt(bankData.bankCode),
    agency: encrypt(bankData.agency),
    account: encrypt(bankData.account),
    holderCpf: encrypt(bankData.holderCpf),
    pixKey: bankData.pixKey ? encrypt(bankData.pixKey) : null,
  };
};

/**
 * Descriptografa dados bancários
 */
export const decryptBankData = (encryptedBankData: any): any => {
  return {
    bankCode: decrypt(encryptedBankData.bankCode),
    agency: decrypt(encryptedBankData.agency),
    account: decrypt(encryptedBankData.account),
    holderCpf: decrypt(encryptedBankData.holderCpf),
    pixKey: encryptedBankData.pixKey ? decrypt(encryptedBankData.pixKey) : null,
  };
};

/**
 * Hash seguro para senhas com salt
 */
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  const bcrypt = require('bcryptjs');
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Verifica senha com hash
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(password, hash);
};

/**
 * Gera token seguro para verificações
 */
export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Gera hash para tokens de verificação
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Criptografia para dados de cartão de crédito (tokenização)
 */
export const tokenizeCreditCard = (cardNumber: string): string => {
  // Em produção, usar serviço de tokenização de terceiros (Stripe, PagSeguro, etc.)
  const lastFour = cardNumber.slice(-4);
  const token = generateSecureToken(16);
  return `tok_${token}_${lastFour}`;
};

/**
 * Mascarar dados sensíveis para logs
 */
export const maskSensitiveData = (data: any): any => {
  const sensitiveFields = [
    'password',
    'cpf',
    'cardNumber',
    'cvv',
    'account',
    'agency',
    'pixKey',
  ];

  const maskValue = (value: string): string => {
    if (value.length <= 4) return '*'.repeat(value.length);
    return value.slice(0, 2) + '*'.repeat(value.length - 4) + value.slice(-2);
  };

  const maskObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;

    const masked = { ...obj };

    for (const key in masked) {
      if (sensitiveFields.includes(key.toLowerCase())) {
        if (typeof masked[key] === 'string') {
          masked[key] = maskValue(masked[key]);
        }
      } else if (typeof masked[key] === 'object') {
        masked[key] = maskObject(masked[key]);
      }
    }

    return masked;
  };

  return maskObject(data);
};

/**
 * Validar força da senha
 */
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;

  // Comprimento mínimo
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Senha deve ter pelo menos 8 caracteres');
  }

  // Letra minúscula
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Senha deve conter pelo menos uma letra minúscula');
  }

  // Letra maiúscula
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Senha deve conter pelo menos uma letra maiúscula');
  }

  // Número
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Senha deve conter pelo menos um número');
  }

  // Caractere especial
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Senha deve conter pelo menos um caractere especial');
  }

  // Verificar padrões comuns
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /abc123/i,
    /admin/i,
  ];

  const hasCommonPattern = commonPatterns.some(pattern => pattern.test(password));
  if (hasCommonPattern) {
    score -= 2;
    feedback.push('Senha contém padrões muito comuns');
  }

  return {
    isValid: score >= 4 && feedback.length === 0,
    score: Math.max(0, score),
    feedback,
  };
};

/**
 * Gerar chave de API segura
 */
export const generateApiKey = (): string => {
  const prefix = 'bcp_'; // BioClub Plus
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(16).toString('hex');
  return `${prefix}${timestamp}_${random}`;
};

/**
 * Criptografia para dados de sessão
 */
export const encryptSessionData = (data: any): string => {
  const jsonString = JSON.stringify(data);
  const encrypted = encrypt(jsonString);
  return Buffer.from(JSON.stringify(encrypted)).toString('base64');
};

/**
 * Descriptografia para dados de sessão
 */
export const decryptSessionData = (encryptedData: string): any => {
  try {
    const jsonString = Buffer.from(encryptedData, 'base64').toString('utf8');
    const encrypted = JSON.parse(jsonString);
    const decrypted = decrypt(encrypted);
    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error('Dados de sessão inválidos');
  }
};

/**
 * Verificar integridade de dados
 */
export const createDataHash = (data: any): string => {
  const jsonString = JSON.stringify(data);
  return crypto.createHash('sha256').update(jsonString).digest('hex');
};

/**
 * Verificar integridade de dados
 */
export const verifyDataIntegrity = (data: any, hash: string): boolean => {
  const currentHash = createDataHash(data);
  return currentHash === hash;
};
