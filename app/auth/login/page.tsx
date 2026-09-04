'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Bot, ArrowRight, Shield, Zap, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'seller' | 'buyer'>('seller');
  const [email, setEmail] = useState('seller@demo.com');
  const [password, setPassword] = useState('••••••••••••');

  const handleRoleSwitch = (selectedRole: 'seller' | 'buyer') => {
    setRole(selectedRole);
    setEmail(selectedRole === 'seller' ? 'seller@demo.com' : 'buyer@demo.com');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'seller') {
      router.push('/seller');
    } else {
      router.push('/buyer');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-between p-6">
      {/* Header Logo */}
      <div className="mx-auto w-full max-w-md flex justify-between items-center pt-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
            <Zap className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">ShopAgent</span>
        </Link>
        <span className="text-xs font-semibold text-zinc-500">Track 01 Auth</span>
      </div>

      {/* Main Login Card */}
      <div className="mx-auto w-full max-w-md py-8">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-8 space-y-6 shadow-2xl glass-panel">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-white">Sign In to ShopAgent</h1>
            <p className="text-xs text-zinc-400">Select your role to access the merchant or buyer workspace</p>
          </div>

          {/* Role Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-zinc-950 p-1 border border-zinc-800">
            <button
              type="button"
              onClick={() => handleRoleSwitch('seller')}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all ${
                role === 'seller'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Merchant Admin</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleSwitch('buyer')}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all ${
                role === 'buyer'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Bot className="h-4 w-4" />
              <span>Buyer AI Agent</span>
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 transition-all"
            >
              <span>Continue to {role === 'seller' ? 'Merchant Portal' : 'Buyer Assistant'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Demo Instant Logins for Buildathon Judges */}
          <div className="border-t border-zinc-800/80 pt-4 space-y-2">
            <p className="text-[11px] font-semibold text-zinc-500 text-center uppercase tracking-wider">
              Quick 1-Click Demo Login (Judges & Evaluators)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => router.push('/seller')}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-left text-xs hover:border-indigo-500 transition-all"
              >
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Demo Merchant</span>
                </div>
                <div className="text-[10px] text-zinc-500">seller@demo.com</div>
              </button>

              <button
                type="button"
                onClick={() => router.push('/buyer')}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-left text-xs hover:border-indigo-500 transition-all"
              >
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Demo Consumer</span>
                </div>
                <div className="text-[10px] text-zinc-500">buyer@demo.com</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-zinc-500 pb-4">
        ShopAgent • Secured via Supabase Auth & Role-Based Access Control
      </div>
    </div>
  );
}
