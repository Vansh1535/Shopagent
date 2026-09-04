'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  Building2,
  Bot,
  ShieldCheck,
  LogOut,
  ArrowRight,
  ChevronDown,
  ExternalLink
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, setIsAuthModalOpen } = useAuth();
  const pathname = usePathname();
  const [timeGmt, setTimeGmt] = useState<string>('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeGmt(now.toISOString().substring(11, 19) + ' GMT');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/40 bg-[#050507]/90 backdrop-blur-xl px-4 sm:px-8 lg:px-12 py-3.5">
      <div className="w-full flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="h-2.5 w-2.5 rounded-full bg-[#e5c178] shadow-[0_0_10px_#e5c178] group-hover:scale-125 transition-transform" />
            <span className="text-base font-bold tracking-tight text-white">
              ShopAgent <span className="text-zinc-500 font-normal">Studio</span>
            </span>
          </Link>
        </div>

        {/* Right Section: Auth User Controls & Clock */}
        <div className="flex items-center gap-4">
          {user ? (
            /* Logged In User Pill with Menu */
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 rounded-full border border-zinc-800 bg-zinc-950 px-3.5 py-1.5 text-xs text-zinc-200 hover:border-[#e5c178]/40 transition-all cursor-pointer"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-white max-w-[120px] sm:max-w-[180px] truncate">
                  {user.name}
                </span>
                <span className="rounded-full bg-[#e5c178]/10 border border-[#e5c178]/30 px-2 py-0.5 text-[10px] font-mono font-bold text-[#e5c178] uppercase">
                  {user.role}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
              </button>

              {/* User Menu Dropdown */}
              {userMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-2xl border border-zinc-800 bg-[#09090d] p-3 shadow-2xl z-50 space-y-2 animate-in fade-in duration-150"
                  onMouseLeave={() => setUserMenuOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-zinc-800/80">
                    <p className="text-xs font-bold text-white">{user.name}</p>
                    <p className="text-[10px] font-mono text-zinc-500 truncate">{user.email}</p>
                    <div className="mt-1.5 inline-block rounded-md bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[9px] font-mono text-zinc-400">
                      Session Active • {user.role.toUpperCase()}
                    </div>
                  </div>

                  {/* Link to Current User's Authorized Workspace */}
                  <div className="space-y-1">
                    <p className="px-3 text-[9px] font-mono font-bold text-zinc-500 uppercase">
                      My Workspace
                    </p>
                    <Link
                      href={`/${user.role}`}
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-[#e5c178] bg-zinc-900/60 border border-[#e5c178]/20 hover:bg-zinc-900 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        {user.role === 'seller' && <Building2 className="h-3.5 w-3.5" />}
                        {user.role === 'buyer' && <Bot className="h-3.5 w-3.5" />}
                        {user.role === 'admin' && <ShieldCheck className="h-3.5 w-3.5" />}
                        <span>
                          {user.role === 'seller' ? 'Merchant Portal' : user.role === 'buyer' ? 'Buyer Assistant' : 'Admin Console'}
                        </span>
                      </span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>

                  {/* Log Out Action */}
                  <div className="border-t border-zinc-800/80 pt-1">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Logged Out: Sign In / Sign Up Button */
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="btn-ivory rounded-full px-5 py-2 text-xs font-semibold flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <span>Sign in / Sign up</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Clock */}
          <span className="hidden sm:inline font-mono text-[11px] text-zinc-500">
            {timeGmt || '12:48:13 GMT'}
          </span>
        </div>
      </div>
    </header>
  );
}
