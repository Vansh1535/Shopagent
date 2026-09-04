'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Package,
  ShieldCheck,
  FileText,
  Plus,
  Zap,
  Building2,
  Bot,
  RefreshCw,
  TrendingUp,
  CreditCard,
  DollarSign,
  ArrowRight,
  Upload,
  Download,
  Copy,
  Check,
  FileSpreadsheet,
  Sparkles,
  Eye
} from 'lucide-react';
import { Product, AgentProduct, CommercePolicy, AgentAction, Order } from '@/lib/types';
import { DEMO_COMMERCE_POLICY, INITIAL_AGENT_PRODUCTS } from '@/lib/seed';

export default function SellerAdminDashboard() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'policy' | 'audit'>('catalog');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeOrdersCount: 0,
    paidOrdersCount: 0,
    avgOrderValue: 0,
  });

  const [policy, setPolicy] = useState<CommercePolicy>(DEMO_COMMERCE_POLICY);
  const [normalizingId, setNormalizingId] = useState<string | null>(null);
  const [isBatchNormalizing, setIsBatchNormalizing] = useState(false);
  const [selectedAgentProd, setSelectedAgentProd] = useState<AgentProduct | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [copiedState, setCopiedState] = useState(false);
  const [csvNotice, setCsvNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audit trail state
  const [auditActions, setAuditActions] = useState<AgentAction[]>([]);

  // New Product Form
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('headphones');
  const [newProdPrice, setNewProdPrice] = useState(2999);
  const [newProdStock, setNewProdStock] = useState(15);
  const [newProdDesc, setNewProdDesc] = useState('');

  // Fetch all dynamic data from server APIs
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Products
      const prodRes = await fetch('/api/products');
      const prodData = await prodRes.json();
      if (prodData.success && prodData.products) {
        setProducts(prodData.products);
      }

      // 2. Orders & Dynamic Analytics
      const orderRes = await fetch('/api/orders');
      const orderData = await orderRes.json();
      if (orderData.success) {
        setOrders(orderData.orders || []);
        if (orderData.stats) {
          setStats(orderData.stats);
        }
      }

      // 3. Audit Logs
      const auditRes = await fetch('/api/audit');
      const auditData = await auditRes.json();
      if (auditData.success && auditData.actions) {
        setAuditActions(auditData.actions);
      }
    } catch (e) {
      console.error('Error fetching dynamic admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleMakeAiReady = async (prod: Product) => {
    setNormalizingId(prod.id);
    try {
      const res = await fetch('/api/catalog/normalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: prod }),
      });
      const data = await res.json();
      if (data.success && data.agentProduct) {
        setProducts((prev) =>
          prev.map((p) => (p.id === prod.id ? { ...p, is_ai_ready: true } : p))
        );
        setSelectedAgentProd(data.agentProduct);
      }
    } catch (e) {
      console.error('Normalization error:', e);
    } finally {
      setNormalizingId(null);
    }
  };

  const handleViewSchema = async (prod: Product) => {
    try {
      const res = await fetch('/api/catalog/normalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: prod }),
      });
      const data = await res.json();
      if (data.success && data.agentProduct) {
        setSelectedAgentProd(data.agentProduct);
      }
    } catch (e) {
      console.error('Error fetching AI schema:', e);
    }
  };

  const handleBatchMakeAiReady = async () => {
    const unready = products.filter((p) => !p.is_ai_ready);
    if (unready.length === 0) {
      alert('All products in your catalog are already AI-Ready!');
      return;
    }

    setIsBatchNormalizing(true);
    for (const prod of unready) {
      await handleMakeAiReady(prod);
    }
    setIsBatchNormalizing(false);
    setCsvNotice(`Successfully normalized ${unready.length} products into agent-ready catalog!`);
    setTimeout(() => setCsvNotice(null), 4000);
  };

  const handleCsvFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvText = event.target?.result as string;
      if (!csvText) return;

      const lines = csvText.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        alert('CSV file must contain a header row and at least 1 data row.');
        return;
      }

      let count = 0;

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map((cell) => cell.replace(/^["']|["']$/g, '').trim());
        if (row.length < 3) continue;

        const name = row[0] || `CSV Item #${i}`;
        const category = row[1]?.toLowerCase() || 'electronics';
        const price = parseFloat(row[2]) || 1999;
        const stock = parseInt(row[3], 10) || 10;
        const description = row[4] || `${name} - High quality product uploaded via CSV.`;

        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            category,
            price,
            stock,
            description,
          }),
        });
        count++;
      }

      setShowCsvModal(false);
      await fetchAllData();
      setCsvNotice(`Successfully imported ${count} products from CSV into database! Click "Batch Make AI Ready" to normalize.`);
      setTimeout(() => setCsvNotice(null), 5000);
    };

    reader.readAsText(file);
  };

  const handleDownloadSampleCsv = () => {
    const csvContent =
      'Name,Category,Price,Stock,Description\n' +
      'Sony WH-1000XM5 Wireless Headphones,headphones,26990,12,Industry leading noise cancelling headphones with 30h battery.\n' +
      'Razer DeathAdder V3 Pro Gaming Mouse,gaming,12999,8,Ultra lightweight 63g ergonomic wireless esports gaming mouse.\n' +
      'Keychron Q1 Custom Mechanical Keyboard,keyboards,14999,5,75 percent QMK custom aluminum mechanical keyboard with tactile switches.\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_merchant_catalog.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyJson = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  const handleDownloadJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportFullAgentCatalog = () => {
    handleDownloadJson(INITIAL_AGENT_PRODUCTS, 'full_merchant_agent_catalog.json');
  };

  const handleGenerateSyntheticCatalog = async () => {
    try {
      const res = await fetch('/api/synthetic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_products', count: 5 }),
      });
      const data = await res.json();
      if (data.success) {
        setCsvNotice(`Generated 5 dynamic synthetic products! Click "Batch Make AI Ready" to normalize.`);
        await fetchAllData();
        setTimeout(() => setCsvNotice(null), 5000);
      }
    } catch (e) {
      console.error('Synthetic generation error:', e);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName) return;

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProdName,
          category: newProdCategory,
          price: Number(newProdPrice),
          stock: Number(newProdStock),
          description: newProdDesc || `${newProdName} - High performance electronics product.`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNewProdName('');
        setNewProdDesc('');
        await fetchAllData();
      }
    } catch (err) {
      console.error('Error adding product:', err);
    }
  };

  const totalProducts = products.length;
  const aiReadyProducts = products.filter((p) => p.is_ai_ready).length;

  return (
    <div className="flex h-screen bg-pitch-black text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar Admin Navigation */}
      <aside className="w-64 border-r border-zinc-800/60 bg-[#07070a] flex flex-col justify-between p-5 shrink-0">
        <div className="space-y-8">
          <Link href="/" className="flex items-center gap-2.5 px-1">
            <span className="h-2.5 w-2.5 rounded-full bg-[#e5c178] shadow-[0_0_10px_#e5c178]" />
            <div>
              <div className="text-sm font-bold text-white tracking-tight">ApexTech Merchant</div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Studio Admin</div>
            </div>
          </Link>

          <nav className="space-y-1.5">
            <button
              onClick={() => {
                setActiveTab('catalog');
                fetchAllData();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'catalog'
                  ? 'bg-zinc-900 text-[#e5c178] border border-[#e5c178]/30 shadow-md'
                  : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Catalog & Overview</span>
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
              <span>Commerce Governance</span>
            </button>

            <Link
              href="/admin"
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200 transition-all"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-[#e5c178]" />
                <span>Money Audit Trail</span>
              </div>
              <span className="font-mono text-[9px] text-[#e5c178] border border-[#e5c178]/30 px-1.5 py-0.5 rounded">ADMIN</span>
            </Link>
          </nav>
        </div>

        <div className="border-t border-zinc-800/80 pt-4 space-y-3">
          <Link
            href="/buyer"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0e0e14] px-3.5 py-2.5 text-xs font-semibold text-zinc-300 border border-zinc-800 hover:border-[#e5c178] hover:text-white transition-all"
          >
            <Bot className="h-4 w-4 text-[#e5c178]" />
            <span>Buyer AI Workspace</span>
          </Link>
          <div className="text-[10px] text-center font-mono text-zinc-600 uppercase tracking-wider">
            RAZORPAY TEST API • SUPABASE
          </div>
        </div>
      </aside>

      {/* Main Admin Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Header */}
        <header className="sticky top-0 z-10 border-b border-zinc-800/60 bg-[#050507]/90 backdrop-blur-md px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {activeTab === 'overview' && <span>Overview Analytics & <span className="serif-gold text-2xl font-normal">Revenue</span></span>}
              {activeTab === 'catalog' && <span>Product Catalog & <span className="serif-gold text-2xl font-normal">AI Readiness</span></span>}
              {activeTab === 'policy' && <span>Commerce Governance & <span className="serif-gold text-2xl font-normal">Policy Engine</span></span>}
              {activeTab === 'audit' && <span>Money Action <span className="serif-gold text-2xl font-normal">Audit Logs</span></span>}
            </h1>
            <p className="text-xs text-zinc-400">
              Manage your merchant catalog, policy boundaries, and explainable AI money logs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateSyntheticCatalog}
              className="rounded-full border border-[#e5c178]/40 bg-zinc-950 px-4 py-2 text-xs font-semibold text-[#e5c178] hover:bg-[#e5c178] hover:text-black inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Sparkles className="h-4 w-4" />
              <span>✨ Generate Synthetic Catalog</span>
            </button>

            <button
              onClick={() => setShowCsvModal(true)}
              className="rounded-full border border-zinc-800 bg-[#09090d] px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:border-[#e5c178] inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-[#e5c178]" />
              <span>Import CSV Catalog</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="btn-ivory rounded-full px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </button>
          </div>
        </header>

        {/* Notice Banner */}
        {csvNotice && (
          <div className="mx-8 mt-4 rounded-xl border border-[#e5c178]/40 bg-[#0e0c08] p-4 text-xs font-semibold text-[#e5c178] flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>{csvNotice}</span>
            </div>
            <button onClick={() => setCsvNotice(null)} className="text-zinc-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Tab Content Area */}
        <div className="p-8 space-y-8">
          {/* TAB 1: CATALOG & OVERVIEW (FIXED MAIN DASHBOARD) */}
          {activeTab === 'catalog' && (
            <div className="space-y-6">
              {/* Dynamic Metric Cards (Computed 100% from DB APIs) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-zinc-800/80 bg-[#09090d] p-5 space-y-2">
                  <div className="flex items-center justify-between text-zinc-500 font-mono text-[10px] uppercase tracking-wider">
                    <span>Total Revenue (Paid)</span>
                    <TrendingUp className="h-4 w-4 text-[#e5c178]" />
                  </div>
                  <div className="text-3xl font-extrabold text-white">₹{stats.totalRevenue.toLocaleString('en-IN')}</div>
                  <div className="text-[11px] text-[#e5c178] font-medium">Computed dynamically from paid orders</div>
                </div>

                <div className="rounded-2xl border border-zinc-800/80 bg-[#09090d] p-5 space-y-2">
                  <div className="flex items-center justify-between text-zinc-500 font-mono text-[10px] uppercase tracking-wider">
                    <span>Total Orders</span>
                    <CreditCard className="h-4 w-4 text-[#e5c178]" />
                  </div>
                  <div className="text-3xl font-extrabold text-white">{stats.activeOrdersCount}</div>
                  <div className="text-[11px] text-zinc-400 font-medium">100% processed via Razorpay API</div>
                </div>

                <div className="rounded-2xl border border-[#e5c178]/30 bg-[#0e0c08] p-5 space-y-2">
                  <div className="flex items-center justify-between text-[#e5c178] font-mono text-[10px] uppercase tracking-wider">
                    <span>AI Ready Catalog</span>
                    <Zap className="h-4 w-4 text-[#e5c178]" />
                  </div>
                  <div className="text-3xl font-extrabold text-[#e5c178]">{aiReadyProducts} / {totalProducts}</div>
                  <div className="text-[11px] text-[#e5c178]/80 font-medium">Normalized for AI buyers</div>
                </div>

                <div className="rounded-2xl border border-zinc-800/80 bg-[#09090d] p-5 space-y-2">
                  <div className="flex items-center justify-between text-zinc-500 font-mono text-[10px] uppercase tracking-wider">
                    <span>Avg Order Value</span>
                    <DollarSign className="h-4 w-4 text-[#e5c178]" />
                  </div>
                  <div className="text-3xl font-extrabold text-white">₹{stats.avgOrderValue.toLocaleString('en-IN')}</div>
                  <div className="text-[11px] text-zinc-400 font-medium">Bounded by merchant policy</div>
                </div>
              </div>

              {/* Dynamic Recent Orders List */}
              <div className="rounded-2xl border border-zinc-800/80 bg-[#09090d] p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Recent Merchant Transactions</h3>
                  <button onClick={fetchAllData} className="text-xs text-[#e5c178] hover:underline inline-flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    <span>Refresh</span>
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className="text-center py-8 text-xs text-zinc-500 font-mono">
                    No orders placed yet. Launch the Buyer AI Workspace to place test orders via Razorpay!
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/60">
                    {orders.slice(0, 5).map((ord) => (
                      <div key={ord.id} className="py-3 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <div className="font-bold text-white font-mono">{ord.razorpay_order_id || ord.id}</div>
                          <div className="text-[11px] text-zinc-500">Buyer: {ord.buyer_id}</div>
                        </div>
                        <div className="text-right space-y-0.5">
                          <div className="font-bold text-[#e5c178]">₹{ord.total_amount.toLocaleString('en-IN')}</div>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            ord.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {ord.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic Product Catalog & AI Schema Table */}
              <div className="rounded-2xl border border-zinc-800/80 bg-[#09090d] overflow-hidden shadow-2xl">
                <div className="border-b border-zinc-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono">Merchant Products Catalog</h2>
                    <p className="text-xs text-zinc-400">{products.length} products listed ({aiReadyProducts} marked AI-Ready)</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleExportFullAgentCatalog}
                      className="rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:border-[#e5c178] inline-flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-[#e5c178]" />
                      <span>Export Full Agent Catalog (JSON)</span>
                    </button>

                    <button
                      onClick={handleBatchMakeAiReady}
                      disabled={isBatchNormalizing || aiReadyProducts === totalProducts}
                      className="rounded-xl bg-zinc-900 border border-[#e5c178]/40 px-3.5 py-1.5 text-xs font-semibold text-[#e5c178] hover:bg-[#e5c178] hover:text-black transition-all disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      <span>{isBatchNormalizing ? 'Batch Normalizing...' : 'Batch Make AI Ready'}</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-[#050507] text-zinc-400 uppercase font-mono text-[10px] tracking-wider border-b border-zinc-800">
                      <tr>
                        <th className="px-6 py-3.5">Product Name</th>
                        <th className="px-6 py-3.5">Category</th>
                        <th className="px-6 py-3.5">Price</th>
                        <th className="px-6 py-3.5">Stock</th>
                        <th className="px-6 py-3.5">AI Readiness</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {products.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12">
                            <div className="space-y-3 font-mono text-xs text-zinc-400">
                              <div>No products in merchant catalog.</div>
                              <div className="flex items-center justify-center gap-3 pt-1">
                                <button
                                  onClick={handleGenerateSyntheticCatalog}
                                  className="rounded-xl border border-[#e5c178]/40 bg-zinc-950 px-4 py-2 text-xs font-semibold text-[#e5c178] hover:bg-[#e5c178] hover:text-black transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-md"
                                >
                                  <Sparkles className="h-4 w-4" />
                                  <span>✨ Generate Synthetic Catalog</span>
                                </button>
                                <button
                                  onClick={() => setShowCsvModal(true)}
                                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-all inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <FileSpreadsheet className="h-4 w-4 text-[#e5c178]" />
                                  <span>Import CSV Catalog</span>
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        products.map((prod) => (
                          <tr key={prod.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="px-6 py-4 font-medium text-white max-w-xs truncate">{prod.name}</td>
                            <td className="px-6 py-4 capitalize text-zinc-400">{prod.category}</td>
                            <td className="px-6 py-4 font-bold text-[#e5c178]">₹{prod.price.toLocaleString('en-IN')}</td>
                            <td className="px-6 py-4">
                              {prod.stock > 0 ? (
                                <span className="rounded-md bg-zinc-900 px-2.5 py-1 text-[11px] font-mono text-zinc-300 border border-zinc-800">
                                  {prod.stock} units
                                </span>
                              ) : (
                                <span className="rounded-md bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-400 border border-red-500/20">
                                  Out of Stock
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {prod.is_ai_ready ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#e5c178]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#e5c178] border border-[#e5c178]/30">
                                  <span>✓ AI Ready</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400 border border-amber-500/30">
                                  <span>⚠️ Raw Catalog</span>
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              {prod.is_ai_ready ? (
                                <button
                                  onClick={() => handleViewSchema(prod)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-200 border border-zinc-700 hover:border-[#e5c178] hover:text-white transition-all cursor-pointer shadow-sm"
                                >
                                  <Eye className="h-3.5 w-3.5 text-[#e5c178]" />
                                  <span>View AI Schema</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleMakeAiReady(prod)}
                                  disabled={normalizingId === prod.id}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-[#e5c178] border border-[#e5c178]/40 hover:bg-[#e5c178] hover:text-black transition-all disabled:opacity-50 cursor-pointer"
                                >
                                  <Zap className="h-3.5 w-3.5" />
                                  <span>{normalizingId === prod.id ? 'Normalizing...' : 'Make AI Ready'}</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COMMERCE GOVERNANCE POLICIES */}
          {activeTab === 'policy' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-zinc-800/80 bg-[#09090d] p-8 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-[#e5c178]" />
                    <span>Merchant Governance & Financial Boundary Engine</span>
                  </h2>
                  <p className="text-xs text-zinc-400">
                    These deterministic rules validate every transaction server-side before Razorpay Checkout order creation.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Max Discount Allowed</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={policy.max_discount}
                        onChange={(e) => setPolicy({ ...policy, max_discount: Number(e.target.value) })}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e5c178]"
                      />
                      <span className="text-sm font-bold text-zinc-400">%</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Max Quantity Per Order</label>
                    <input
                      type="number"
                      value={policy.max_quantity_per_order}
                      onChange={(e) => setPolicy({ ...policy, max_quantity_per_order: Number(e.target.value) })}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e5c178]"
                    />
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Auto Order Value Ceiling</label>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-zinc-400">₹</span>
                      <input
                        type="number"
                        value={policy.max_auto_order_value}
                        onChange={(e) => setPolicy({ ...policy, max_auto_order_value: Number(e.target.value) })}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e5c178]"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Buyer Explicit Confirm</label>
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        checked={policy.require_confirmation}
                        onChange={(e) => setPolicy({ ...policy, require_confirmation: e.target.checked })}
                        className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-[#e5c178] focus:ring-[#e5c178]"
                      />
                      <span className="text-xs text-zinc-300">Require before Razorpay</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MONEY AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#e5c178]" />
                    <span>Merchant Money Audit Trail Logs</span>
                  </h2>
                  <p className="text-xs text-zinc-400">Live immutable stream of all AI buyer actions, policy gates, and payment events.</p>
                </div>
                <button
                  onClick={fetchAuditLogs}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-[#e5c178]" />
                  <span>Refresh Logs</span>
                </button>
              </div>

              <div className="rounded-2xl border border-zinc-800/80 bg-[#09090d] p-6 space-y-4">
                {auditActions.length === 0 ? (
                  <div className="text-center py-12 text-xs text-zinc-400 font-mono">
                    No money actions logged yet. Perform a query in the Buyer AI Workspace!
                  </div>
                ) : (
                  <div className="relative border-l-2 border-zinc-800 ml-4 pl-6 space-y-6">
                    {auditActions.map((action) => (
                      <div key={action.id} className="relative group">
                        <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-zinc-950 bg-[#e5c178] ring-4 ring-zinc-900" />
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-[#e5c178]">{action.action_type}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {new Date(action.created_at).toLocaleTimeString('en-IN')}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300">{action.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal 1: Agent Representation JSON Inspector */}
      {selectedAgentProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#e5c178]" />
                <span>Agent-Readable Catalog Schema Representation</span>
              </h3>
              <button onClick={() => setSelectedAgentProd(null)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <pre className="max-h-96 overflow-y-auto rounded-xl bg-zinc-950 p-4 text-xs font-mono text-[#e5c178] border border-zinc-800 leading-relaxed">
              {JSON.stringify(selectedAgentProd, null, 2)}
            </pre>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyJson(selectedAgentProd)}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:border-[#e5c178] inline-flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedState ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-[#e5c178]" />}
                  <span>{copiedState ? '✓ Copied!' : 'Copy JSON Schema'}</span>
                </button>

                <button
                  onClick={() => handleDownloadJson(selectedAgentProd, `agent_product_${selectedAgentProd.product_id}.json`)}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:border-[#e5c178] inline-flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-[#e5c178]" />
                  <span>Download JSON</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedAgentProd(null)}
                className="btn-ivory rounded-xl px-4 py-2 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: CSV Import Catalog Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-[#e5c178]" />
                <span>Import Merchant Catalog (CSV)</span>
              </h3>
              <button onClick={() => setShowCsvModal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Upload a CSV file containing your product inventory. Headers should be: <code className="text-[#e5c178] font-mono">Name, Category, Price, Stock, Description</code>.
            </p>

            <div className="space-y-3 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCsvFileUpload}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-950 p-6 text-center hover:border-[#e5c178] transition-all group cursor-pointer"
              >
                <Upload className="mx-auto h-8 w-8 text-zinc-500 group-hover:text-[#e5c178] transition-colors" />
                <div className="mt-2 font-bold text-xs text-white">Click to Select CSV File</div>
                <div className="text-[10px] text-zinc-500 font-mono">Supports .csv catalog files up to 5MB</div>
              </button>

              <button
                type="button"
                onClick={handleDownloadSampleCsv}
                className="w-full text-center text-xs font-semibold text-[#e5c178] hover:underline inline-flex items-center justify-center gap-1 pt-1"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Sample CSV Template</span>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-800">
              <button
                onClick={() => setShowCsvModal(false)}
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Add Single Product */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white">Add New Product</h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300">Product Name</label>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="e.g. Sony WH-1000XM5 Headphones"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e5c178]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300">Category</label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e5c178]"
                  >
                    <option value="headphones">Headphones</option>
                    <option value="gaming">Gaming</option>
                    <option value="keyboards">Keyboards</option>
                    <option value="audio">Audio</option>
                    <option value="accessories">Accessories</option>
                    <option value="wearables">Wearables</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300">Price (INR ₹)</label>
                  <input
                    type="number"
                    required
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e5c178]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300">Stock Units</label>
                <input
                  type="number"
                  required
                  value={newProdStock}
                  onChange={(e) => setNewProdStock(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e5c178]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300">Description</label>
                <textarea
                  rows={2}
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  placeholder="Enter raw product description..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e5c178]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-ivory rounded-xl px-5 py-2 text-xs font-semibold"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
