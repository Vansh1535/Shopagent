'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth, UserRole } from '@/lib/auth/AuthContext';
import { ShieldAlert, Lock, ArrowRight, Building2, Bot, ShieldCheck, LogOut, Loader2 } from 'lucide-react';
import AuthModal from './AuthModal';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, isLoading, isAuthModalOpen, setIsAuthModalOpen, switchRole, logout } = useAuth();

  // 1. Loading state while checking localStorage
  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#050507] flex flex-col items-center justify-center space-y-4 text-white">
        <Loader2 className="h-8 w-8 text-[#e5c178] animate-spin" />
        <p className="font-mono text-xs text-zinc-400 uppercase tracking-widest">
          VERIFYING SHOPAGENT SESSION SECURITY...
        </p>
      </div>
    );
  }

  // 2. Unauthenticated State (User not logged in)
  if (!user) {
    return (
      <div className="min-h-screen w-full bg-[#050507] text-zinc-100 flex flex-col items-center justify-center p-6 selection:bg-[#e5c178] selection:text-black">
        <div className="w-full max-w-lg rounded-3xl border border-zinc-800/80 bg-[#09090d] p-8 sm:p-10 text-center space-y-6 shadow-2xl">
          {/* Lock Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-[#e5c178]">
            <Lock className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e5c178]/30 bg-[#e5c178]/10 px-3 py-1 text-[10px] font-mono font-bold text-[#e5c178] uppercase tracking-wider">
              PROTECTED WORKSPACE
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Authentication Required
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              You must be signed in as a <span className="text-[#e5c178] font-semibold">{allowedRoles.join(' or ')}</span> to access this workspace.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="btn-ivory w-full flex items-center justify-center gap-2 rounded-full py-3.5 text-xs font-bold shadow-xl cursor-pointer"
            >
              <span>Sign In / Select Role</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <Link
              href="/"
              className="w-full block py-2.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              Return to Landing Page
            </Link>
          </div>        </div>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </div>
    );
  }

  // 3. Role Restriction (Logged in, but role is not allowed)
  const isAuthorized = allowedRoles.includes(user.role);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen w-full bg-[#050507] text-zinc-100 flex flex-col items-center justify-center p-6 selection:bg-[#e5c178] selection:text-black">
        <div className="w-full max-w-lg rounded-3xl border border-red-900/50 bg-[#09090d] p-8 sm:p-10 text-center space-y-6 shadow-2xl">
          {/* Shield Alert Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-950/60 border border-red-800/80 text-red-400">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-red-800/60 bg-red-950/40 px-3 py-1 text-[10px] font-mono font-bold text-red-400 uppercase tracking-wider">
              ACCESS RESTRICTED
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Role Authorization Error
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Logged in as <span className="text-white font-semibold">{user.name}</span> ({user.email}) with role <span className="text-[#e5c178] font-bold uppercase">{user.role}</span>.
              <br />
              Seller and Buyer accounts are isolated. This workspace requires <span className="text-white font-semibold uppercase">{allowedRoles.join(' or ')}</span> access.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <Link
              href={`/${user.role}`}
              className="btn-ivory w-full flex items-center justify-center gap-2 rounded-full py-3.5 text-xs font-bold shadow-xl cursor-pointer"
            >
              <span>Return to My Authorized Workspace (/{user.role})</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors pt-2 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log Out of {user.email}</span>
            </button>
          </div>
        </div>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </div>
    );
  }

  // 4. Authorized - Render workspace
  return (
    <>
      {children}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
}
