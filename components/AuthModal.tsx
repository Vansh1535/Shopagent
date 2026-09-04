'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Bot, ArrowRight, X, ShieldCheck } from 'lucide-react';
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

  const handleQuickDemo = (selectedRole: UserRole) => {
    onClose();
    const name =
      selectedRole === 'seller'
        ? 'Bharat Tech Store (Seller)'
        : selectedRole === 'buyer'
        ? 'Rahul Sharma (Consumer)'
        : 'Platform Administrator';
    const demoEmail =
      selectedRole === 'seller'
        ? 'seller@demo.com'
        : selectedRole === 'buyer'
        ? 'buyer@demo.com'
        : 'admin@demo.com';

    login({
      id: `usr_${selectedRole}_demo`,
      name,
      email: demoEmail,
      role: selectedRole,
    });

    if (selectedRole === 'seller') {
      router.push('/seller');
    } else if (selectedRole === 'buyer') {
      router.push('/buyer');
    } else {
      router.push('/admin');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-zinc-800/80 bg-[#09090d] p-8 space-y-6 shadow-2xl shadow-black">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-500 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Brand Badge */}
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#e5c178] shadow-[0_0_10px_#e5c178]" />
          <span className="text-xs font-bold text-white tracking-tight">ShopAgent <span className="text-zinc-500 font-normal">Studio</span></span>
        </div>

        {/* Title */}
        <div className="space-y-1.5 text-center">
          <h2 className="text-2xl font-bold text-white tracking-tight">Sign In to ShopAgent</h2>
          <p className="text-xs text-zinc-400">Select your role to access Merchant, Buyer, or Admin workspace</p>
        </div>

        {/* Role Switcher Tabs (Gold DayNight Styling - 3 Roles) */}
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-zinc-950 p-1 border border-zinc-800/80">
          <button
            type="button"
            onClick={() => handleRoleSwitch('seller')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-semibold transition-all ${
              role === 'seller'
                ? 'bg-zinc-900 text-[#e5c178] border border-[#e5c178]/30 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Merchant</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleSwitch('buyer')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-semibold transition-all ${
              role === 'buyer'
                ? 'bg-zinc-900 text-[#e5c178] border border-[#e5c178]/30 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            <span>Buyer AI</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleSwitch('admin')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-semibold transition-all ${
              role === 'admin'
                ? 'bg-zinc-900 text-[#e5c178] border border-[#e5c178]/30 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-[#e5c178]" />
            <span>Admin</span>
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-zinc-300 font-mono uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-[#050507] px-4 py-2.5 text-sm text-white focus:border-[#e5c178] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-300 font-mono uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-[#050507] px-4 py-2.5 text-sm text-white focus:border-[#e5c178] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="btn-ivory w-full flex items-center justify-center gap-2 rounded-full py-3 text-xs font-bold shadow-xl cursor-pointer"
          >
            <span>Continue to {role === 'seller' ? 'Merchant Portal' : role === 'buyer' ? 'Buyer Assistant' : 'Admin Console'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Quick 1-Click Demo Login (For Judges & Evaluators) */}
        <div className="border-t border-zinc-800/80 pt-4 space-y-2.5">
          <p className="text-[10px] font-mono font-bold text-zinc-500 text-center uppercase tracking-widest">
            QUICK 1-CLICK DEMO LOGIN (JUDGES & EVALUATORS)
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickDemo('seller')}
              className="rounded-xl border border-zinc-800 bg-[#050507] p-2.5 text-left hover:border-[#e5c178]/50 transition-all group"
            >
              <div className="font-bold text-[11px] text-white group-hover:text-[#e5c178] flex items-center gap-1">
                <Building2 className="h-3 w-3 text-[#e5c178]" />
                <span>Merchant</span>
              </div>
              <div className="text-[9px] font-mono text-zinc-500 truncate">seller@demo</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('buyer')}
              className="rounded-xl border border-zinc-800 bg-[#050507] p-2.5 text-left hover:border-[#e5c178]/50 transition-all group"
            >
              <div className="font-bold text-[11px] text-white group-hover:text-[#e5c178] flex items-center gap-1">
                <Bot className="h-3 w-3 text-[#e5c178]" />
                <span>Consumer</span>
              </div>
              <div className="text-[9px] font-mono text-zinc-500 truncate">buyer@demo</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('admin')}
              className="rounded-xl border border-zinc-800 bg-[#050507] p-2.5 text-left hover:border-[#e5c178]/50 transition-all group"
            >
              <div className="font-bold text-[11px] text-white group-hover:text-[#e5c178] flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-[#e5c178]" />
                <span>Admin</span>
              </div>
              <div className="text-[9px] font-mono text-zinc-500 truncate">admin@demo</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

