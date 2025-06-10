import Joi from 'joi';

// Validação de CPF
export const validateCPF = (cpf: string): boolean => {
  // Remove caracteres não numéricos
  cpf = cpf.replace(/[^\d]/g, '');
  
  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(10))) return false;
  
  return true;
};

// Validação de CEP
export const validateCEP = (cep: string): boolean => {
  const cepRegex = /^[0-9]{5}-?[0-9]{3}$/;
  return cepRegex.test(cep);
};

// Validação de telefone brasileiro
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^(?:\+55\s?)?(?:\(?[1-9]{2}\)?\s?)?(?:9\s?)?[0-9]{4}-?[0-9]{4}$/;
  return phoneRegex.test(phone);
};

// Schema de validação para registro de usuário
export const registerSchema = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 50 caracteres',
      'any.required': 'Nome é obrigatório',
    }),
  
  lastName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Sobrenome deve ter pelo menos 2 caracteres',
      'string.max': 'Sobrenome deve ter no máximo 50 caracteres',
      'any.required': 'Sobrenome é obrigatório',
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Email deve ter um formato válido',
      'any.required': 'Email é obrigatório',
    }),
  
  cpf: Joi.string()
    .custom((value, helpers) => {
      if (!validateCPF(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .required()
    .messages({
      'any.invalid': 'CPF inválido',
      'any.required': 'CPF é obrigatório',
    }),
  
  phone: Joi.string()
    .custom((value, helpers) => {
      if (!validatePhone(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .optional()
    .messages({
      'any.invalid': 'Telefone inválido',
    }),
  
  birthDate: Joi.date()
    .max('now')
    .required()
    .messages({
      'date.max': 'Data de nascimento não pode ser no futuro',
      'any.required': 'Data de nascimento é obrigatória',
    }),
  
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
    .required()
    .messages({
      'string.min': 'Senha deve ter pelo menos 8 caracteres',
      'string.pattern.base': 'Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial',
      'any.required': 'Senha é obrigatória',
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Confirmação de senha deve ser igual à senha',
      'any.required': 'Confirmação de senha é obrigatória',
    }),
  
  referralCode: Joi.string()
    .optional()
    .allow(''),
});

// Schema de validação para login
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Email deve ter um formato válido',
      'any.required': 'Email é obrigatório',
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Senha é obrigatória',
    }),
});

// Schema de validação para endereço
export const addressSchema = Joi.object({
  street: Joi.string()
    .min(5)
    .max(100)
    .required()
    .messages({
      'string.min': 'Rua deve ter pelo menos 5 caracteres',
      'string.max': 'Rua deve ter no máximo 100 caracteres',
      'any.required': 'Rua é obrigatória',
    }),
  
  number: Joi.string()
    .max(10)
    .required()
    .messages({
      'string.max': 'Número deve ter no máximo 10 caracteres',
      'any.required': 'Número é obrigatório',
    }),
  
  complement: Joi.string()
    .max(50)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Complemento deve ter no máximo 50 caracteres',
    }),
  
  neighborhood: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Bairro deve ter pelo menos 2 caracteres',
      'string.max': 'Bairro deve ter no máximo 50 caracteres',
      'any.required': 'Bairro é obrigatório',
    }),
  
  city: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Cidade deve ter pelo menos 2 caracteres',
      'string.max': 'Cidade deve ter no máximo 50 caracteres',
      'any.required': 'Cidade é obrigatória',
    }),
  
  state: Joi.string()
    .length(2)
    .required()
    .messages({
      'string.length': 'Estado deve ter 2 caracteres (UF)',
      'any.required': 'Estado é obrigatório',
    }),
  
  zipCode: Joi.string()
    .custom((value, helpers) => {
      if (!validateCEP(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .required()
    .messages({
      'any.invalid': 'CEP inválido',
      'any.required': 'CEP é obrigatório',
    }),
  
  country: Joi.string()
    .default('Brasil')
    .optional(),
});

// Schema de validação para dados bancários
export const bankDataSchema = Joi.object({
  bankCode: Joi.string()
    .length(3)
    .required()
    .messages({
      'string.length': 'Código do banco deve ter 3 dígitos',
      'any.required': 'Código do banco é obrigatório',
    }),
  
  bankName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Nome do banco deve ter pelo menos 2 caracteres',
      'string.max': 'Nome do banco deve ter no máximo 50 caracteres',
      'any.required': 'Nome do banco é obrigatório',
    }),
  
  agency: Joi.string()
    .min(4)
    .max(6)
    .required()
    .messages({
      'string.min': 'Agência deve ter pelo menos 4 dígitos',
      'string.max': 'Agência deve ter no máximo 6 dígitos',
      'any.required': 'Agência é obrigatória',
    }),
  
  account: Joi.string()
    .min(5)
    .max(15)
    .required()
    .messages({
      'string.min': 'Conta deve ter pelo menos 5 caracteres',
      'string.max': 'Conta deve ter no máximo 15 caracteres',
      'any.required': 'Conta é obrigatória',
    }),
  
  accountType: Joi.string()
    .valid('corrente', 'poupanca')
    .required()
    .messages({
      'any.only': 'Tipo de conta deve ser "corrente" ou "poupanca"',
      'any.required': 'Tipo de conta é obrigatório',
    }),
  
  holderName: Joi.string()
    .min(5)
    .max(100)
    .required()
    .messages({
      'string.min': 'Nome do titular deve ter pelo menos 5 caracteres',
      'string.max': 'Nome do titular deve ter no máximo 100 caracteres',
      'any.required': 'Nome do titular é obrigatório',
    }),
  
  holderCpf: Joi.string()
    .custom((value, helpers) => {
      if (!validateCPF(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .required()
    .messages({
      'any.invalid': 'CPF do titular inválido',
      'any.required': 'CPF do titular é obrigatório',
    }),
  
  pixKey: Joi.string()
    .optional()
    .allow(''),
  
  pixKeyType: Joi.string()
    .valid('cpf', 'email', 'phone', 'random')
    .optional()
    .when('pixKey', {
      is: Joi.exist().not(''),
      then: Joi.required(),
    })
    .messages({
      'any.only': 'Tipo de chave PIX deve ser "cpf", "email", "phone" ou "random"',
    }),
});

// Função para validar dados
export const validate = (schema: Joi.ObjectSchema, data: any) => {
  const { error, value } = schema.validate(data, { abortEarly: false });
  
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));
    
    throw {
      name: 'ValidationError',
      message: 'Dados de entrada inválidos',
      errors,
    };
  }
  
  return value;
};
