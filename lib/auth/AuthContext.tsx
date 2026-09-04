'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export type UserRole = 'seller' | 'buyer' | 'admin';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  token: string;
  loggedInAt: string;
}

interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  login: (userData: Omit<UserSession, 'token' | 'loggedInAt'>) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

const STORAGE_KEY = 'shopagent_user_session';

const DEFAULT_USERS: Record<UserRole, Omit<UserSession, 'token' | 'loggedInAt'>> = {
  seller: {
    id: 'usr_seller_01',
    name: 'Bharat Tech Store (Seller)',
    email: 'seller@demo.com',
    role: 'seller',
  },
  buyer: {
    id: 'usr_buyer_01',
    name: 'Rahul Sharma (Consumer)',
    email: 'buyer@demo.com',
    role: 'buyer',
  },
  admin: {
    id: 'usr_admin_01',
    name: 'Platform Administrator',
    email: 'admin@demo.com',
    role: 'admin',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const router = useRouter();

  // Load persistent user state on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      }
    } catch (e) {
      console.error('Failed to parse persistent user session:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (userData: Omit<UserSession, 'token' | 'loggedInAt'>) => {
    const session: UserSession = {
      ...userData,
      token: `token_${Math.random().toString(36).substring(2)}_${Date.now()}`,
      loggedInAt: new Date().toISOString(),
    };
    setUser(session);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.error('Failed to save user session:', e);
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear user session:', e);
    }
    router.push('/');
  };

  const switchRole = (role: UserRole) => {
    const defaultData = DEFAULT_USERS[role];
    login(defaultData);
    if (role === 'seller') router.push('/seller');
    else if (role === 'buyer') router.push('/buyer');
    else if (role === 'admin') router.push('/admin');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthModalOpen,
        setIsAuthModalOpen,
        login,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
