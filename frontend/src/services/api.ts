import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import toast from 'react-hot-toast';

// Configuração base da API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Criar instância do axios
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas e erros
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    // Tratar erro de token expirado
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Mostrar mensagem de erro
    const message = error.response?.data?.error?.message || 'Erro interno do servidor';
    
    // Não mostrar toast para alguns endpoints específicos
    const silentEndpoints = ['/auth/me', '/user/dashboard'];
    const isSilentEndpoint = silentEndpoints.some(endpoint => 
      error.config?.url?.includes(endpoint)
    );

    if (!isSilentEndpoint) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

// Tipos para as respostas da API
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: {
    [key: string]: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

// Classe principal da API
class ApiService {
  // Métodos de autenticação
  auth = {
    login: async (email: string, password: string) => {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    },

    register: async (userData: any) => {
      const response = await api.post('/auth/register', userData);
      return response.data;
    },

    logout: async () => {
      const response = await api.post('/auth/logout');
      return response.data;
    },

    me: async () => {
      const response = await api.get('/auth/me');
      return response.data;
    },

    forgotPassword: async (email: string) => {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    },

    resetPassword: async (token: string, password: string, confirmPassword: string) => {
      const response = await api.post('/auth/reset-password', { 
        token, 
        password, 
        confirmPassword 
      });
      return response.data;
    },

    verifyEmail: async (token: string) => {
      const response = await api.post('/auth/verify-email', { token });
      return response.data;
    },

    resendVerification: async () => {
      const response = await api.post('/auth/resend-verification');
      return response.data;
    },
  };

  // Métodos de usuário
  user = {
    getProfile: async () => {
      const response = await api.get('/user/profile');
      return response.data;
    },

    updateProfile: async (userData: any) => {
      const response = await api.put('/user/profile', userData);
      return response.data;
    },

    changePassword: async (currentPassword: string, newPassword: string, confirmPassword: string) => {
      const response = await api.put('/user/password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      return response.data;
    },

    getAddress: async () => {
      const response = await api.get('/user/address');
      return response.data;
    },

    updateAddress: async (addressData: any) => {
      const response = await api.put('/user/address', addressData);
      return response.data;
    },

    getBankData: async () => {
      const response = await api.get('/user/bank-data');
      return response.data;
    },

    updateBankData: async (bankData: any) => {
      const response = await api.put('/user/bank-data', bankData);
      return response.data;
    },

    getPreferences: async () => {
      const response = await api.get('/user/preferences');
      return response.data;
    },

    updatePreferences: async (preferences: any) => {
      const response = await api.put('/user/preferences', preferences);
      return response.data;
    },

    getDashboard: async () => {
      const response = await api.get('/user/dashboard');
      return response.data;
    },
  };

  // Métodos de produtos
  products = {
    getAll: async (params?: any) => {
      const response = await api.get('/products', { params });
      return response.data;
    },

    getById: async (id: string) => {
      const response = await api.get(`/products/${id}`);
      return response.data;
    },

    getBySlug: async (slug: string) => {
      const response = await api.get(`/products/${slug}`);
      return response.data;
    },

    getCategories: async () => {
      const response = await api.get('/products/categories/list');
      return response.data;
    },

    search: async (query: string, limit?: number) => {
      const response = await api.get('/products/search/query', {
        params: { q: query, limit },
      });
      return response.data;
    },
  };

  // Métodos de assinatura
  subscriptions = {
    getPlans: async () => {
      const response = await api.get('/subscriptions/plans');
      return response.data;
    },

    getCurrent: async () => {
      const response = await api.get('/subscriptions/current');
      return response.data;
    },

    subscribe: async (planId: string) => {
      const response = await api.post('/subscriptions/subscribe', { planId });
      return response.data;
    },

    cancel: async (reason?: string) => {
      const response = await api.post('/subscriptions/cancel', { reason });
      return response.data;
    },
  };

  // Métodos de pedidos
  orders = {
    getAll: async (params?: any) => {
      const response = await api.get('/orders', { params });
      return response.data;
    },

    getById: async (id: string) => {
      const response = await api.get(`/orders/${id}`);
      return response.data;
    },

    create: async (orderData: any) => {
      const response = await api.post('/orders', orderData);
      return response.data;
    },
  };

  // Métodos de comissões
  commissions = {
    getSummary: async () => {
      const response = await api.get('/commissions/summary');
      return response.data;
    },

    getAll: async (params?: any) => {
      const response = await api.get('/commissions', { params });
      return response.data;
    },

    getReferrals: async (params?: any) => {
      const response = await api.get('/commissions/referrals', { params });
      return response.data;
    },

    requestWithdrawal: async (amount: number) => {
      const response = await api.post('/commissions/withdraw', { amount });
      return response.data;
    },

    getWithdrawals: async (params?: any) => {
      const response = await api.get('/commissions/withdrawals', { params });
      return response.data;
    },

    getReferralLink: async () => {
      const response = await api.get('/commissions/referral-link');
      return response.data;
    },
  };

  // Métodos de cupons
  coupons = {
    getAll: async () => {
      const response = await api.get('/coupons');
      return response.data;
    },

    validate: async (code: string, cartTotal: number) => {
      const response = await api.post('/coupons/validate', { code, cartTotal });
      return response.data;
    },
  };

  // Métodos administrativos
  admin = {
    getDashboard: async () => {
      const response = await api.get('/admin/dashboard');
      return response.data;
    },

    getUsers: async (params?: any) => {
      const response = await api.get('/admin/users', { params });
      return response.data;
    },

    getUserById: async (id: string) => {
      const response = await api.get(`/admin/users/${id}`);
      return response.data;
    },

    getWithdrawals: async (params?: any) => {
      const response = await api.get('/admin/withdrawals', { params });
      return response.data;
    },

    updateWithdrawal: async (id: string, data: any) => {
      const response = await api.patch(`/admin/withdrawals/${id}`, data);
      return response.data;
    },

    getOrders: async (params?: any) => {
      const response = await api.get('/admin/orders', { params });
      return response.data;
    },
  };

  // Métodos utilitários
  utils = {
    uploadFile: async (file: File, folder?: string) => {
      const formData = new FormData();
      formData.append('file', file);
      if (folder) {
        formData.append('folder', folder);
      }

      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },

    getCEP: async (cep: string) => {
      try {
        const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
        return response.data;
      } catch (error) {
        throw new Error('CEP não encontrado');
      }
    },
  };
}

// Exportar instância única da API
export const apiService = new ApiService();
export default api;
