// Tipos de usuário
export interface User {
  id: string;
  email: string;
  cpf: string;
  firstName: string;
  lastName: string;
  phone?: string;
  birthDate?: string;
  emailVerified: boolean;
  referralCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tipos de endereço
export interface Address {
  id: string;
  userId: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  createdAt: string;
  updatedAt: string;
}

// Tipos de dados bancários
export interface BankData {
  id: string;
  userId: string;
  bankCode: string;
  bankName: string;
  agency: string;
  account: string;
  accountType: 'corrente' | 'poupanca';
  holderName: string;
  holderCpf: string;
  pixKey?: string;
  pixKeyType?: 'cpf' | 'email' | 'phone' | 'random';
  createdAt: string;
  updatedAt: string;
}

// Tipos de assinatura
export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  benefits: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  plan: SubscriptionPlan;
  status: 'PENDING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID';
  startDate?: string;
  endDate?: string;
  nextBillingDate?: string;
  paymentMethod: PaymentMethod;
  createdAt: string;
  updatedAt: string;
}

// Tipos de pagamento
export type PaymentMethod = 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX' | 'BOLETO' | 'COMMISSION_BALANCE';

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELED';

export interface BillingHistory {
  id: string;
  subscriptionId: string;
  amount: number;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  billingDate: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Tipos de produtos
export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  children?: ProductCategory[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  altText?: string;
  sortOrder: number;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  trackStock: boolean;
  categoryId: string;
  category: ProductCategory;
  images: ProductImage[];
  ingredients: string[];
  benefits: string[];
  usage?: string;
  warnings?: string;
  metaTitle?: string;
  metaDescription?: string;
  isActive: boolean;
  isFeatured: boolean;
  averageRating?: number;
  reviewCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  user: {
    firstName: string;
    lastName: string;
  };
  rating: number;
  title?: string;
  comment?: string;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tipos de carrinho e pedidos
export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  product: Product;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product: Product;
  quantity: number;
  price: number;
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  orderNumber: string;
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELED' | 'REFUNDED';
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  shippingAddress: any;
  couponCode?: string;
  items: OrderItem[];
  trackingCode?: string;
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Tipos de cupons
export interface Coupon {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number;
  minimumAmount?: number;
  maximumDiscount?: number;
  startDate: string;
  endDate: string;
  usageLimit?: number;
  usageCount: number;
  usageLimitPerUser?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserCoupon {
  id: string;
  userId: string;
  couponId: string;
  coupon: Coupon;
  usageCount: number;
  remainingUses: number;
  createdAt: string;
  updatedAt: string;
}

// Tipos de comissões
export interface Commission {
  id: string;
  earnerId: string;
  sourceId: string;
  source: {
    firstName: string;
    lastName: string;
  };
  amount: number;
  percentage: number;
  status: 'PENDING' | 'AVAILABLE' | 'REQUESTED' | 'PAID' | 'CANCELED';
  type: 'SUBSCRIPTION' | 'PURCHASE' | 'BONUS';
  generatedAt: string;
  availableAt?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'REJECTED' | 'CANCELED';
  bankData: any;
  requestedAt: string;
  processedAt?: string;
  paidAt?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// Tipos de notificações
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'REFERRAL' | 'COMMISSION' | 'ORDER' | 'SUBSCRIPTION';
  isRead: boolean;
  readAt?: string;
  data?: any;
  createdAt: string;
}

// Tipos de preferências
export interface UserPreferences {
  id: string;
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  preferredCategories: string[];
  createdAt: string;
  updatedAt: string;
}

// Tipos de API
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    message: string;
    statusCode: number;
    details?: any;
  };
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  data: {
    [key: string]: T[];
    pagination: PaginationData;
  };
}

// Tipos de formulários
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  cpf: string;
  phone?: string;
  birthDate: string;
  password: string;
  confirmPassword: string;
  referralCode?: string;
}

export interface AddressForm {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}

export interface BankDataForm {
  bankCode: string;
  bankName: string;
  agency: string;
  account: string;
  accountType: 'corrente' | 'poupanca';
  holderName: string;
  holderCpf: string;
  pixKey?: string;
  pixKeyType?: 'cpf' | 'email' | 'phone' | 'random';
}

// Tipos de dashboard
export interface DashboardStats {
  totalEarned: number;
  availableBalance: number;
  pendingBalance: number;
  totalReferrals: number;
  activeReferrals: number;
}

export interface DashboardData {
  user: User;
  stats: DashboardStats;
  recentOrders: Order[];
  availableCoupons: Coupon[];
}

// Tipos de filtros e busca
export interface ProductFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Tipos de contexto
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterForm) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

export interface CartContextType {
  items: CartItem[];
  itemCount: number;
  total: number;
  isLoading: boolean;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}
