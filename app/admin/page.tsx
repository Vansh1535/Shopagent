'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  FileText,
  Zap,
  Building2,
  Bot,
  RefreshCw,
  TrendingUp,
  CreditCard,
  Trash2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Activity,
  Layers,
  CheckCircle2,
  XCircle,
  Database
} from 'lucide-react';
import { Product, CommercePolicy, AgentAction, Order } from '@/lib/types';
import { DEMO_COMMERCE_POLICY } from '@/lib/seed';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';
import CustomAlertModal, { AlertState } from '@/components/CustomAlertModal';

export default function PlatformAdminConsole() {
  const [activeTab, setActiveTab] = useState<'audit' | 'synthetic' | 'policy'>('audit');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [auditActions, setAuditActions] = useState<AgentAction[]>([]);
  const [policy, setPolicy] = useState<CommercePolicy>(DEMO_COMMERCE_POLICY);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeOrdersCount: 0,
    paidOrdersCount: 0,
    avgOrderValue: 0,
  });

  const [filterType, setFilterType] = useState<string>('all');
  const [syntheticNotice, setSyntheticNotice] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customAlert, setCustomAlert] = useState<AlertState | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch dynamic data from database APIs
  const fetchAllAdminData = async () => {
    setLoading(true);
    try {
      // 1. Audit logs
      const auditRes = await fetch('/api/audit');
      const auditData = await auditRes.json();
      if (auditData.success && auditData.actions) {
        setAuditActions(auditData.actions);
      }

      // 2. Products
      const prodRes = await fetch('/api/products');
      const prodData = await prodRes.json();
      if (prodData.success && prodData.products) {
        setProducts(prodData.products);
      }

      // 3. Orders & Stats
      const orderRes = await fetch('/api/orders');
      const orderData = await orderRes.json();
      if (orderData.success) {
        setOrders(orderData.orders || []);
        if (orderData.stats) {
          setStats(orderData.stats);
        }
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, []);

  // Synthetic engine actions
  const handleSyntheticAction = async (action: string, count: number = 5) => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/synthetic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, count }),
      });
      const data = await res.json();
      if (data.success) {
        setSyntheticNotice(data.message);
        await fetchAllAdminData();
        setTimeout(() => setSyntheticNotice(null), 5000);
      } else {
        setCustomAlert({
          isOpen: true,
          title: 'Synthetic Engine Error',
          message: data.error || 'Failed to execute synthetic data operation.',
          type: 'error',
        });
      }
    } catch (e: any) {
      setCustomAlert({
        isOpen: true,
        title: 'System Exception',
        message: `Synthetic engine failure: ${e.message}`,
        type: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredAuditActions = auditActions.filter((a) => {
    if (filterType === 'all') return true;
    if (filterType === 'allowed') return a.status === 'SUCCESS' || a.status === 'RECOVERED';
    if (filterType === 'blocked') return a.status === 'POLICY_REJECTED' || a.status === 'FAILED';
    return a.action_type === filterType;
  });

  const totalProducts = products.length;
  const aiReadyProducts = products.filter((p) => p.is_ai_ready).length;

  return (
    <AuthGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-pitch-black text-zinc-100 flex flex-col font-sans">
        <Navbar />
        <div className="flex flex-1 h-[calc(100vh-61px)] overflow-hidden">
          {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-zinc-800/60 bg-[#07070a] flex flex-col justify-between p-5 shrink-0">
        <div className="space-y-6">
          <nav className="space-y-1.5">
            <button
              onClick={() => {
                setActiveTab('audit');
                fetchAllAdminData();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'audit'
                  ? 'bg-zinc-900 text-[#e5c178] border border-[#e5c178]/30 shadow-md'
                  : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-[#e5c178]" />
                <span>Money Audit Trail</span>
              </div>
              <span className="font-mono text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">LIVE</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('synthetic');
                fetchAllAdminData();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'synthetic'
                  ? 'bg-zinc-900 text-[#e5c178] border border-[#e5c178]/30 shadow-md'
                  : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-[#e5c178]" />
                <span>Synthetic Data Engine</span>
              </div>
              <span className="font-mono text-[9px] text-[#e5c178] bg-[#e5c178]/10 px-1.5 py-0.5 rounded border border-[#e5c178]/30">AI</span>
            </button>

            <button
              onClick={() => setActiveTab('policy')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'policy'
                  ? 'bg-zinc-900 text-[#e5c178] border border-[#e5c178]/30 shadow-md'
                  : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Global Policy Gates</span>
            </button>
          </nav>
        </div>

        <div className="border-t border-zinc-800/80 pt-4">
          <div className="text-[10px] text-center font-mono text-zinc-600 uppercase tracking-wider pt-1">
            RAZORPAY BUILDATHON • TRACK 01
          </div>
        </div>
      </aside>

      {/* Main Admin Content */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Header */}
        <header className="sticky top-0 z-10 border-b border-zinc-800/60 bg-[#050507]/90 backdrop-blur-md px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {activeTab === 'audit' && <span>Immutable <span className="serif-gold text-2xl font-normal">Money & Policy Audit Trail</span></span>}
              {activeTab === 'synthetic' && <span>Dynamic <span className="serif-gold text-2xl font-normal">Synthetic Data Flow Engine</span></span>}
              {activeTab === 'policy' && <span>Global <span className="serif-gold text-2xl font-normal">Governance Policy Gates</span></span>}
            </h1>
            <p className="text-xs text-zinc-400">
              Platform administration, audit logging, policy oversight, and synthetic traffic generation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              AUDIT ACTIVE
            </span>
          </div>
        </header>

        {/* Notice Banner */}
        {syntheticNotice && (
          <div className="mx-8 mt-4 rounded-xl border border-[#e5c178]/40 bg-[#0e0c08] p-4 text-xs font-semibold text-[#e5c178] flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>{syntheticNotice}</span>
            </div>
            <button onClick={() => setSyntheticNotice(null)} className="text-zinc-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-8 space-y-8">
          {/* TAB 1: MONEY AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-400 uppercase font-mono tracking-wider">Filter Actions:</span>
                  <div className="flex gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                    {['all', 'allowed', 'blocked', 'QUERY_CATALOG', 'VERIFY_PAYMENT_SIGNATURE'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`px-3 py-1 text-[11px] font-semibold rounded-lg capitalize transition-all ${
                          filterType === type
                            ? 'bg-zinc-900 text-[#e5c178] border border-[#e5c178]/30 shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {type.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={fetchAllAdminData}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:border-[#e5c178] transition-all"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-[#e5c178]" />
                  <span>Refresh Audit Logs</span>
                </button>
              </div>

              <div className="rounded-2xl border border-zinc-800/80 bg-[#09090d] p-6 space-y-4">
                {filteredAuditActions.length === 0 ? (
                  <div className="text-center py-12 text-xs text-zinc-500 font-mono space-y-2">
                    <Database className="mx-auto h-8 w-8 text-zinc-600" />
                    <div>No audit actions match the current filter.</div>
                    <button
                      onClick={() => handleSyntheticAction('generate_orders', 3)}
                      className="text-[#e5c178] hover:underline font-bold"
                    >
                      Click to generate synthetic test transactions
                    </button>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-zinc-800 ml-4 pl-6 space-y-6">
                    {filteredAuditActions.map((action) => (
                      <div key={action.id} className="relative group">
                        <div className={`absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-zinc-950 ring-4 ring-zinc-900 ${
                          action.status === 'SUCCESS' || action.status === 'RECOVERED' ? 'bg-emerald-400' : 'bg-red-400'
                        }`} />

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2 shadow-md">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-[#e5c178]">{action.action_type}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                action.status === 'SUCCESS' || action.status === 'RECOVERED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {action.status}
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {new Date(action.created_at).toLocaleTimeString('en-IN')}
                            </span>
                          </div>

                          <p className="text-xs text-zinc-300 font-sans leading-relaxed">{action.reason}</p>

                          <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500 border-t border-zinc-900 pt-2">
                            <span>Agent: <code className="text-zinc-400">{(action as any).agent_id || 'shop-agent-v1'}</code></span>
                            <span>Buyer: <code className="text-zinc-400">{action.buyer_id || 'buyer-demo-001'}</code></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SYNTHETIC DATA ENGINE */}
          {activeTab === 'synthetic' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-zinc-800/80 bg-[#09090d] p-8 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#e5c178]" />
                    <span>Dynamic Synthetic Data Flow & Control Studio</span>
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Instantly populate real-looking catalog items, orders, and money audit logs without hardcoded data.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Card 1: Generate Catalog */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <Layers className="h-4 w-4 text-[#e5c178]" />
                        <span>Generate Synthetic Catalog</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Creates 5 new dynamic products with real Unsplash images, prices, stock, specs, and descriptions.
                      </p>
                    </div>

                    <button
                      onClick={() => handleSyntheticAction('generate_products', 5)}
                      disabled={isGenerating}
                      className="w-full btn-ivory py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                    >
                      <Zap className="h-4 w-4" />
                      <span>Generate 5 Dynamic Products</span>
                    </button>
                  </div>

                  {/* Card 2: Generate Buyer Transactions */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-[#e5c178]" />
                        <span>Generate Synthetic Orders</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Simulates 3 buyer shopping sessions, creating Razorpay test orders & policy audit events.
                      </p>
                    </div>

                    <button
                      onClick={() => handleSyntheticAction('generate_orders', 3)}
                      disabled={isGenerating || products.length === 0}
                      className="w-full rounded-xl bg-zinc-900 border border-[#e5c178]/40 py-2.5 text-xs font-semibold text-[#e5c178] hover:bg-[#e5c178] hover:text-black transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Simulate 3 Buyer Orders</span>
                    </button>
                  </div>

                  {/* Card 3: Reset & Seed */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-[#e5c178]" />
                        <span>Reset & Seed Fresh Flow</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Clears existing database state and seeds fresh dynamic catalog items and active order flow.
                      </p>
                    </div>

                    <button
                      onClick={() => handleSyntheticAction('reset_default')}
                      disabled={isGenerating}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-xs font-semibold text-zinc-300 hover:border-[#e5c178] hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4 text-[#e5c178]" />
                      <span>Reset & Seed Database</span>
                    </button>
                  </div>
                </div>

                {/* Database Wipe Danger Zone */}
                <div className="border-t border-zinc-800/80 pt-6 space-y-3">
                  <div className="text-xs font-bold text-red-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <Trash2 className="h-4 w-4" />
                    <span>Danger Zone: Clean Slate Reset</span>
                  </div>
                  <div className="flex items-center justify-between bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                    <div>
                      <div className="text-xs font-semibold text-zinc-200">Wipe All Products, Orders, and Logs</div>
                      <div className="text-[11px] text-zinc-500">Resets in-memory/Supabase database to zero state for clean testing.</div>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to clear all database products and orders?')) {
                          handleSyntheticAction('clear_database');
                        }
                      }}
                      className="rounded-xl bg-red-500/20 border border-red-500/40 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition-all"
                    >
                      Clear Database State
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GLOBAL POLICY GATES */}
          {activeTab === 'policy' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-zinc-800/80 bg-[#09090d] p-8 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-[#e5c178]" />
                    <span>Global Commerce Governance Policy Gatekeeper</span>
                  </h2>
                  <p className="text-xs text-zinc-400">
                    System-wide boundary rules enforced across all seller transactions and buyer AI agents.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Max Discount Limit</label>
                    <div className="text-2xl font-extrabold text-[#e5c178]">{policy.max_discount}%</div>
                    <div className="text-[10px] text-zinc-500">Blocks AI agents offering higher discounts</div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Max Quantity Per Order</label>
                    <div className="text-2xl font-extrabold text-white">{policy.max_quantity_per_order} units</div>
                    <div className="text-[10px] text-zinc-500">Prevents bulk inventory depletion</div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Auto Order Value Ceiling</label>
                    <div className="text-2xl font-extrabold text-white">₹{policy.max_auto_order_value.toLocaleString('en-IN')}</div>
                    <div className="text-[10px] text-zinc-500">Limits max single auto transaction</div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Buyer Confirmation</label>
                    <div className="text-2xl font-extrabold text-emerald-400">Required</div>
                    <div className="text-[10px] text-zinc-500">Mandatory check before Razorpay checkout</div>
                  </div>
                </div>
              </div>
            </div>
          )}


        </div>
      </main>
    </div>
  </div>

  <CustomAlertModal alert={customAlert} onClose={() => setCustomAlert(null)} />
</AuthGuard>
);
}
