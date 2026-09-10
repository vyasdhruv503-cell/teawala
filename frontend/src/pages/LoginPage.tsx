import React, { useState } from 'react';
import { api } from '../services/api';
import type { AuthUser } from '../types';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Lock, User, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

const MOCK_ADMIN_USER: AuthUser = {
  id: 'user_admin_1',
  name: 'TeaWala Admin Manager',
  email: 'admin@cafeqr.com',
  role: 'ADMIN',
  cafeId: 'cafe_1',
  cafeName: 'TeaWala',
  currency: '₹',
};

const MOCK_KITCHEN_USER: AuthUser = {
  id: 'user_kitchen_1',
  name: 'Head Chef',
  email: 'kitchen@cafeqr.com',
  role: 'KITCHEN',
  cafeId: 'cafe_1',
  cafeName: 'TeaWala',
  currency: '₹',
};

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const data = await api.login({ email, password });
      onLoginSuccess(data.user);
    } catch (err: any) {
      // Fallback demo login if database server is offline or unseeded
      if ((email === 'kitchen@cafeqr.com' || email === 'kitchen') && password === 'kitchen123') {
        localStorage.setItem('cafeqr_token', 'demo_kitchen_jwt_token');
        localStorage.setItem('cafeqr_user', JSON.stringify(MOCK_KITCHEN_USER));
        onLoginSuccess(MOCK_KITCHEN_USER);
      } else if ((email === 'admin@cafeqr.com' || email === 'admin') && password === 'admin123') {
        localStorage.setItem('cafeqr_token', 'demo_admin_jwt_token');
        localStorage.setItem('cafeqr_user', JSON.stringify(MOCK_ADMIN_USER));
        onLoginSuccess(MOCK_ADMIN_USER);
      } else {
        setError(err.message || 'Invalid ID or password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] p-4 font-sans">
      <div className="max-w-md w-full bg-white border border-[#E2DCD5] rounded-3xl p-8 shadow-xl space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="h-16 px-4 bg-[#251713] border border-[#4A3228] rounded-2xl inline-flex items-center justify-center mx-auto mb-3 shadow-md">
            <img src="/logo.png" alt="TeaWala Logo" className="h-12 w-auto object-contain mx-auto" />
          </div>
          <h1 className="text-2xl font-black text-[#1C130E] tracking-wide">TeaWala Portal</h1>
          <p className="text-xs text-stone-500 font-medium mt-1">
            Sign in to access Admin Dashboard or Kitchen View
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Staff ID / Email"
            type="text"
            placeholder="Enter your User ID or Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<User className="w-4 h-4 text-[#10B981]" />}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4 text-[#10B981]" />}
            required
          />

          <Button variant="primary" className="w-full py-3.5 text-sm shadow-md font-extrabold" isLoading={isLoading}>
            Sign In to Portal
          </Button>
        </form>
      </div>
    </div>
  );
};
