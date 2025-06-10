import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// Layouts
import PublicLayout from '@/components/layouts/PublicLayout';
import DashboardLayout from '@/components/layouts/DashboardLayout';

// Páginas públicas
import HomePage from '@/pages/public/HomePage';
import ProductsPage from '@/pages/public/ProductsPage';
import ProductDetailPage from '@/pages/public/ProductDetailPage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage';

// Páginas do dashboard
import DashboardPage from '@/pages/dashboard/DashboardPage';
import ProfilePage from '@/pages/dashboard/ProfilePage';
import SubscriptionPage from '@/pages/dashboard/SubscriptionPage';
import OrdersPage from '@/pages/dashboard/OrdersPage';
import CommissionsPage from '@/pages/dashboard/CommissionsPage';
import ReferralsPage from '@/pages/dashboard/ReferralsPage';
import WithdrawalsPage from '@/pages/dashboard/WithdrawalsPage';
import CouponsPage from '@/pages/dashboard/CouponsPage';

// Páginas de erro
import NotFoundPage from '@/pages/errors/NotFoundPage';

// Componente de loading
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="spinner w-12 h-12 mx-auto mb-4"></div>
      <p className="text-gray-600">Carregando...</p>
    </div>
  </div>
);

// Componente para proteger rotas autenticadas
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Componente para redirecionar usuários autenticados
const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <div className="App">
      <Routes>
        {/* Rotas públicas */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="produtos" element={<ProductsPage />} />
          <Route path="produtos/:slug" element={<ProductDetailPage />} />
        </Route>

        {/* Rotas de autenticação (apenas para usuários não autenticados) */}
        <Route path="/login" element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        } />
        <Route path="/register" element={
          <GuestRoute>
            <RegisterPage />
          </GuestRoute>
        } />
        <Route path="/forgot-password" element={
          <GuestRoute>
            <ForgotPasswordPage />
          </GuestRoute>
        } />
        <Route path="/reset-password" element={
          <GuestRoute>
            <ResetPasswordPage />
          </GuestRoute>
        } />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* Rotas do dashboard (apenas para usuários autenticados) */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="perfil" element={<ProfilePage />} />
          <Route path="assinatura" element={<SubscriptionPage />} />
          <Route path="pedidos" element={<OrdersPage />} />
          <Route path="comissoes" element={<CommissionsPage />} />
          <Route path="indicacoes" element={<ReferralsPage />} />
          <Route path="saques" element={<WithdrawalsPage />} />
          <Route path="cupons" element={<CouponsPage />} />
        </Route>

        {/* Rota 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
};

export default App;
