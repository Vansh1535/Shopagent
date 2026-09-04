'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Bot, ArrowRight, X, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth, UserRole } from '@/lib/auth/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const router = useRouter();
  const { login } = useAuth();
  const [role, setRole] = useState<UserRole>('seller');
  const [email, setEmail] = useState('seller@demo.com');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleRoleSwitch = (selectedRole: UserRole) => {
    setRole(selectedRole);
    if (selectedRole === 'seller') setEmail('seller@demo.com');
    else if (selectedRole === 'buyer') setEmail('buyer@demo.com');
    else setEmail('admin@demo.com');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    onClose();

    const name =
      role === 'seller'
        ? 'Bharat Tech Store (Seller)'
        : role === 'buyer'
        ? 'Rahul Sharma (Consumer)'
        : 'Platform Administrator';

    login({
      id: `usr_${role}_${Date.now()}`,
      name,
      email,
      role,
    });

    if (role === 'seller') {
      router.push('/seller');
    } else if (role === 'buyer') {
      router.push('/buyer');
    } else {
      router.push('/admin');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0d0d12] p-6 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#e5c178] shadow-[0_0_10px_#e5c178]" />
            <h3 className="text-base font-bold text-white tracking-tight">Sign In to ShopAgent</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Role Switcher Tabs */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 block">Select Access Role</label>
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-zinc-950 p-1 border border-zinc-800">
            <button
              type="button"
              onClick={() => handleRoleSwitch('seller')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${
                role === 'seller'
                  ? 'bg-zinc-800 text-[#e5c178] border border-[#e5c178]/30 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Merchant</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSwitch('buyer')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${
                role === 'buyer'
                  ? 'bg-zinc-800 text-[#e5c178] border border-[#e5c178]/30 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              <span>Buyer AI</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSwitch('admin')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${
                role === 'admin'
                  ? 'bg-zinc-800 text-[#e5c178] border border-[#e5c178]/30 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-[#e5c178]" />
              <span>Admin</span>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#e5c178] transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#e5c178] transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-zinc-400" />
                ) : (
                  <Eye className="h-4 w-4 text-zinc-400" />
                )}
              </button>
            </div>
          </div>

          {/* Modal Action Buttons matching exact screenshot style */}
          <div className="flex items-center justify-end gap-3 border-t border-zinc-800/80 pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-zinc-900 border border-zinc-800 px-5 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-ivory rounded-xl px-5 py-2 text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer"
            >
              <span>Continue to {role === 'seller' ? 'Merchant' : role === 'buyer' ? 'Buyer' : 'Admin'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
