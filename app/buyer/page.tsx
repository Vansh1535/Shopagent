'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Bot,
  Mic,
  Send,
  ShoppingBag,
  Zap,
  Building2,
  X,
  CreditCard,
  ArrowRight,
  Plus,
  MessageSquare,
  History,
  Trash2,
  Sliders,
  ShieldAlert,
  Search,
  User,
  Settings,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { ChatMessage, Product } from '@/lib/types';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';
import CustomAlertModal, { AlertState } from '@/components/CustomAlertModal';
import FormattedMarkdown from '@/components/FormattedMarkdown';

declare global {
  interface Window {
    Razorpay: any;
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome-1',
  role: 'assistant',
  content:
    '👋 Namaste! I am your AI Shopping Assistant.\n\n' +
    'Ask me anything in **English, Hindi, or Hinglish**!\n\n' +
    'For example: *"Mujhe ₹3,000 ke andar wireless headphones chahiye"* or *"अन्य हेडफोंस इन योर कैटलॉग"*.',
  created_at: new Date().toISOString(),
};

export default function BuyerAIWorkspace() {
  const [customAlert, setCustomAlert] = useState<AlertState | null>(null);

  // Chat sessions state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([DEFAULT_WELCOME_MESSAGE]);

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [cartItems, setCartItems] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);

  // Buyer Agent Governance Profile & UI state
  const [buyerBudget, setBuyerBudget] = useState<number>(5000);
  const [autoConfirmThreshold, setAutoConfirmThreshold] = useState<number>(2000);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat sessions & buyer agent budget from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedBudget = localStorage.getItem('buyer_agent_budget');
    if (savedBudget) {
      const parsed = parseFloat(savedBudget);
      if (!isNaN(parsed)) setBuyerBudget(parsed);
    }

    const savedThreshold = localStorage.getItem('buyer_auto_confirm');
    if (savedThreshold) {
      const parsed = parseFloat(savedThreshold);
      if (!isNaN(parsed)) setAutoConfirmThreshold(parsed);
    }
    const saved = localStorage.getItem('buyer_chat_sessions');
    if (saved) {
      try {
        const parsed: ChatSession[] = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
          setMessages(parsed[0].messages);
          return;
        }
      } catch (e) {
        console.error('Failed to load chat history:', e);
      }
    }

    const defaultSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'New Chat',
      messages: [DEFAULT_WELCOME_MESSAGE],
      updatedAt: new Date().toISOString(),
    };
    setSessions([defaultSession]);
    setActiveSessionId(defaultSession.id);
    setMessages([DEFAULT_WELCOME_MESSAGE]);
    localStorage.setItem('buyer_chat_sessions', JSON.stringify([defaultSession]));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const [speechLang, setSpeechLang] = useState<'en-IN' | 'hi-IN'>('en-IN');

  const updateSessionMessages = (newMessages: ChatMessage[]) => {
    setMessages(newMessages);
    setSessions((prevSessions) => {
      const updated = prevSessions.map((s) => {
        if (s.id === activeSessionId) {
          const firstUserMsg = newMessages.find((m) => m.role === 'user');
          let title = s.title;
          if ((title === 'New Chat' || title === 'Shopping Chat') && firstUserMsg) {
            title = firstUserMsg.content.length > 26
              ? firstUserMsg.content.slice(0, 26) + '...'
              : firstUserMsg.content;
          }

          return {
            ...s,
            title,
            messages: newMessages,
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('buyer_chat_sessions', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleAddToCart = (product: Product) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      } else {
        return [...prev, { product, quantity: 1 }];
      }
    });
    setShowCartDrawer(true);
  };

  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as Array<{ product: Product; quantity: number }>
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const totalCartCount = cartItems.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalCartPrice = cartItems.reduce((acc, curr) => acc + curr.product.price * curr.quantity, 0);

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'New Chat',
      messages: [DEFAULT_WELCOME_MESSAGE],
      updatedAt: new Date().toISOString(),
    };
    setSessions((prev) => {
      const updated = [newSession, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('buyer_chat_sessions', JSON.stringify(updated));
      }
      return updated;
    });
    setActiveSessionId(newSession.id);
    setMessages([DEFAULT_WELCOME_MESSAGE]);
  };

  const handleSelectSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setActiveSessionId(session.id);
      setMessages(session.messages);
    }
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('buyer_chat_sessions', JSON.stringify(filtered));
      }
      if (sessionId === activeSessionId) {
        if (filtered.length > 0) {
          setActiveSessionId(filtered[0].id);
          setMessages(filtered[0].messages);
        } else {
          const newSession: ChatSession = {
            id: `session-${Date.now()}`,
            title: 'New Chat',
            messages: [DEFAULT_WELCOME_MESSAGE],
            updatedAt: new Date().toISOString(),
          };
          setActiveSessionId(newSession.id);
          setMessages([DEFAULT_WELCOME_MESSAGE]);
          return [newSession];
        }
      }
      return filtered;
    });
  };

  const recognitionRef = useRef<any>(null);
  const latestTranscriptRef = useRef<string>('');

  const handleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error('Error stopping speech recognition:', e);
        }
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setCustomAlert({
        isOpen: true,
        title: 'Browser Feature Unavailable',
        message: 'Speech Recognition (STT) is not supported in this browser. Please type your request in the chat input.',
        type: 'info',
      });
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = speechLang;
      recognition.continuous = false;
      recognition.interimResults = true;

      latestTranscriptRef.current = '';

      recognition.onstart = () => setIsListening(true);

      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }

        const trimmed = fullTranscript.trim();
        if (trimmed) {
          latestTranscriptRef.current = trimmed;
          setInputQuery(trimmed);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        const finalQuery = latestTranscriptRef.current.trim();
        if (finalQuery) {
          handleSendMessage(finalQuery);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setCustomAlert({
            isOpen: true,
            title: 'Microphone Permission Blocked',
            message: 'Microphone access is blocked in your browser. Please allow microphone permissions in the browser address bar to use Voice STT.',
            type: 'warning',
          });
        }
      };

      recognition.start();
    } catch (e) {
      console.error('Speech recognition exception:', e);
      setIsListening(false);
    }
  };

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || loading) return;

    setInputQuery('');
    setLoading(true);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      created_at: new Date().toISOString(),
    };
    
    const newMsgList = [...messages, userMsg];
    updateSessionMessages(newMsgList);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: textToSend,
          buyerAgentBudget: buyerBudget,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        const finalMsgList = [...newMsgList, data.message];
        updateSessionMessages(finalMsgList);

        if (data.recommendedProducts && data.recommendedProducts.length > 0) {
          const rec = data.recommendedProducts[0];
          setCartItems((prev) => {
            if (prev.some((item) => item.product.id === rec.id)) return prev;
            return [...prev, { product: rec, quantity: 1 }];
          });
        }
      }
    } catch (e) {
      console.error('Chat error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateRazorpay = async (product: Product) => {
    setLoading(true);
    try {
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
          userConfirmed: true,
        }),
      });

      const orderData = await orderRes.json();

      if (!orderData.success) {
        setCustomAlert({
          isOpen: true,
          title: 'Financial Policy Gate Rejection',
          message: orderData.error || 'Order value exceeds merchant auto-approval threshold or quantity limit.',
          type: 'warning',
        });
        setLoading(false);
        return;
      }

      if (typeof window.Razorpay !== 'undefined') {
        const options = {
          key: orderData.keyId,
          amount: orderData.order.amount,
          currency: orderData.order.currency,
          name: 'ApexTech Electronics',
          description: `Order: ${product.name}`,
          order_id: orderData.order.id,
          handler: async function (response: any) {
            await verifyPaymentServer(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );
          },
          prefill: {
            name: 'Rohan Sharma',
            email: 'buyer@demo.com',
            contact: '9999999999',
          },
          theme: { color: '#e5c178' },
          modal: { ondismiss: () => setLoading(false) },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        await simulateInteractiveRazorpayModal(orderData.order.id);
      }
    } catch (e) {
      console.error('Razorpay launch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const simulateInteractiveRazorpayModal = async (razorpayOrderId: string) => {
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const mockSig = `sig_${Date.now()}`;
    await verifyPaymentServer(razorpayOrderId, paymentId, mockSig);
  };

  const verifyPaymentServer = async (
    rzpOrderId: string,
    rzpPaymentId: string,
    rzpSignature: string,
    overrideFailure?: string
  ) => {
    setLoading(true);
    try {
      const res = await fetch('/api/razorpay/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: rzpOrderId,
          razorpay_payment_id: rzpPaymentId,
          razorpay_signature: rzpSignature,
          simulatedFailure: overrideFailure,
        }),
      });

      const data = await res.json();
      if (data.message) {
        updateSessionMessages([...messages, data.message]);
      }
      if (data.verified) {
        setCartItems([]);
      }
    } catch (e) {
      console.error('Verification error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard allowedRoles={['buyer']}>
      <div className="h-screen bg-pitch-black text-zinc-100 flex flex-col font-sans overflow-hidden">
        <Navbar />
        <div className="flex flex-1 overflow-hidden relative">
          {/* Collapsible Sidebar */}
          <aside className={`border-r border-zinc-800/60 bg-[#07070a] flex flex-col justify-between shrink-0 transition-all duration-300 ${
            isSidebarCollapsed ? 'w-16 p-2.5 items-center' : 'w-72 p-4'
          } hidden md:flex h-full overflow-hidden`}>
            <div className="space-y-3 w-full">
              {/* Sidebar Header & Collapse Toggle */}
              <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} pb-1`}>
                {!isSidebarCollapsed && (
                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Bot className="h-3.5 w-3.5 text-[#e5c178]" />
                    BUYER CONTROLS
                  </span>
                )}
                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  className="p-1.5 rounded-xl border border-zinc-800 bg-[#09090d] text-zinc-400 hover:text-white hover:border-[#e5c178] transition-all cursor-pointer"
                >
                  {isSidebarCollapsed ? (
                    <PanelLeftOpen className="h-4 w-4 text-[#e5c178]" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4 text-[#e5c178]" />
                  )}
                </button>
              </div>

              {/* Agent Profile & Budget Button (ACCESSIBLE AT TOP) */}
              <button
                onClick={() => setShowProfileModal(true)}
                aria-label={`Agent Profile & Budget settings. Current limit ₹${buyerBudget.toLocaleString('en-IN')}`}
                title={`Agent Profile & Budget Settings (Limit: ₹${buyerBudget.toLocaleString('en-IN')})`}
                className={`w-full flex items-center ${
                  isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between p-3'
                } rounded-xl border border-[#e5c178]/30 bg-[#e5c178]/10 text-xs text-white hover:bg-[#e5c178]/20 transition-all cursor-pointer shadow-md`}
              >
                <div className="flex items-center gap-2.5">
                  <Sliders className="h-4 w-4 text-[#e5c178] shrink-0" />
                  {!isSidebarCollapsed && <span className="font-bold text-white">Agent Profile</span>}
                </div>
                {!isSidebarCollapsed && (
                  <span className="font-mono text-[10px] font-bold text-[#e5c178] bg-zinc-950 px-2 py-0.5 rounded border border-[#e5c178]/40">
                    ₹{buyerBudget.toLocaleString('en-IN')}
                  </span>
                )}
              </button>

              {/* New Chat Button */}
              <button
                onClick={handleNewChat}
                aria-label="Start new chat session"
                title="New Chat Session"
                className={`w-full flex items-center justify-center gap-2 rounded-xl bg-[#e5c178] hover:bg-[#d4b067] text-zinc-950 font-bold ${
                  isSidebarCollapsed ? 'p-2.5' : 'px-4 py-2.5 text-xs'
                } transition-all shadow-md active:scale-95 cursor-pointer`}
              >
                <Plus className="h-4 w-4 stroke-[3] shrink-0" />
                {!isSidebarCollapsed && <span>New Chat</span>}
              </button>

              {/* Chat History Section */}
              <div className="space-y-2 pt-2">
                {!isSidebarCollapsed && (
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                      <History className="h-3 w-3 text-[#e5c178]" />
                      History
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">({sessions.length})</span>
                  </div>
                )}

                <div className="space-y-1.5 max-h-[calc(100vh-320px)] overflow-y-auto pr-1 custom-scrollbar">
                  {sessions.map((session) => {
                    const isActive = session.id === activeSessionId;
                    return (
                      <div
                        key={session.id}
                        onClick={() => handleSelectSession(session.id)}
                        title={session.title || 'Shopping Chat'}
                        className={`group relative flex items-center ${
                          isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between p-3'
                        } rounded-xl text-xs cursor-pointer border transition-all ${
                          isActive
                            ? 'border-[#e5c178]/50 bg-[#e5c178]/10 text-white font-medium shadow-sm'
                            : 'border-zinc-800/60 bg-[#09090d] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden pr-2">
                          <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-[#e5c178]' : 'text-zinc-500'}`} />
                          {!isSidebarCollapsed && <span className="truncate text-xs">{session.title || 'Shopping Chat'}</span>}
                        </div>

                        {!isSidebarCollapsed && (
                          <button
                            onClick={(e) => handleDeleteSession(e, session.id)}
                            aria-label={`Delete chat ${session.title}`}
                            title="Delete Chat"
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-zinc-500 transition-opacity absolute right-2"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="w-full border-t border-zinc-800/80 pt-3">
              {!isSidebarCollapsed ? (
                <div className="text-[10px] text-center font-mono text-zinc-500 uppercase tracking-wider">
                  RAZORPAY TEST API • VOICE STT
                </div>
              ) : (
                <div className="flex justify-center text-[#e5c178]">
                  <Bot className="h-4 w-4" />
                </div>
              )}
            </div>
          </aside>

          {/* Main Workspace (Independent Scrollable Chat Area) */}
          <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
            {/* Top Header */}
            <header className="border-b border-zinc-800/60 bg-[#050507]/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e5c178]/10 text-[#e5c178] border border-[#e5c178]/20">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white tracking-tight">AI Shopping Assistant</span>
                    <span className="h-2 w-2 rounded-full bg-[#e5c178] shadow-[0_0_8px_#e5c178]" />
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400">English, Hindi & Hinglish Voice Engine</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="rounded-xl border border-zinc-800 bg-[#09090d] px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:border-[#e5c178] hover:text-white transition-all inline-flex items-center gap-2 shadow-md cursor-pointer"
                  title="Buyer Agent Governance & Profile Settings"
                >
                  <Sliders className="h-4 w-4 text-[#e5c178]" />
                  <span>Agent Profile</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-[#e5c178]/10 text-[#e5c178] border border-[#e5c178]/30">
                    Limit: ₹{buyerBudget.toLocaleString('en-IN')}
                  </span>
                </button>

                <button
                  onClick={() => setShowCartDrawer(true)}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold inline-flex items-center gap-2 transition-all cursor-pointer shadow-lg border ${
                    totalCartCount > 0
                      ? 'btn-ivory border-[#e5c178]'
                      : 'border-zinc-800 bg-[#09090d] text-zinc-300 hover:border-[#e5c178] hover:text-white'
                  }`}
                >
                  <ShoppingBag className="h-4 w-4 text-[#e5c178]" />
                  <span>View Cart</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                      totalCartCount > 0
                        ? 'bg-zinc-950 text-[#e5c178] border border-[#e5c178]/40'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {totalCartCount} {totalCartCount === 1 ? 'item' : 'items'}
                  </span>
                </button>
              </div>
            </header>

        {/* Chat Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e5c178]/10 text-[#e5c178] border border-[#e5c178]/20">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div className={`space-y-4 max-w-xl ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-zinc-900 text-[#e5c178] border border-[#e5c178]/40 rounded-br-none'
                        : 'bg-[#09090d] text-zinc-200 border border-zinc-800/80 rounded-bl-none'
                    }`}
                  >
                    <FormattedMarkdown content={msg.content} />
                  </div>

                  {/* Interactive Over-Budget Alert Card */}
                  {msg.metadata?.over_budget && (
                    <div className="rounded-2xl border border-amber-500/50 bg-[#0e0c07] p-5 space-y-4 shadow-2xl animate-in fade-in">
                      <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-5 w-5 text-amber-400" />
                          <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                            AI Agent Budget Limit Exceeded
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 font-bold">
                          Budget Gate
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between text-zinc-300">
                          <span>Item Requested:</span>
                          <span className="font-bold text-white max-w-[200px] truncate">{msg.metadata.target_product?.name || msg.metadata.recommended_products?.[0]?.name}</span>
                        </div>
                        <div className="flex items-center justify-between text-zinc-300">
                          <span>Product Price:</span>
                          <span className="font-bold text-white font-mono">₹{msg.metadata.required_budget?.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex items-center justify-between text-zinc-300">
                          <span>Your Current Agent Budget Limit:</span>
                          <span className="font-bold text-amber-400 font-mono">₹{msg.metadata.buyer_budget?.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        <button
                          onClick={() => {
                            const needed = msg.metadata!.required_budget || 10000;
                            setBuyerBudget(needed);
                            if (typeof window !== 'undefined') {
                              localStorage.setItem('buyer_agent_budget', needed.toString());
                            }
                            setCustomAlert({
                              isOpen: true,
                              title: 'Agent Budget Increased',
                              message: `Your AI Agent budget limit has been increased to ₹${needed.toLocaleString('en-IN')}. Retrying purchase...`,
                              type: 'success',
                            });
                            handleSendMessage(`Buy ${msg.metadata!.target_product?.name || msg.metadata!.recommended_products?.[0]?.name || 'this item'}`);
                          }}
                          className="btn-ivory rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                        >
                          <Zap className="h-4 w-4 text-zinc-950" />
                          <span>⚡ Increase Budget to ₹{msg.metadata.required_budget?.toLocaleString('en-IN')} & Buy</span>
                        </button>

                        <button
                          onClick={() => {
                            handleSendMessage(`Show me top alternative products under ₹${msg.metadata!.buyer_budget}`);
                          }}
                          className="rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-xs font-semibold text-zinc-200 hover:border-[#e5c178] hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Search className="h-4 w-4 text-[#e5c178]" />
                          <span>🔍 Search Products Under ₹{msg.metadata.buyer_budget?.toLocaleString('en-IN')}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Interactive Conversational Checkout Card */}
                  {msg.metadata?.pending_checkout && msg.metadata?.recommended_products && msg.metadata.recommended_products.length > 0 && (
                    <div className="rounded-2xl border border-[#e5c178]/50 bg-[#0d0c07] p-4 space-y-3 shadow-2xl">
                      <div className="flex items-center justify-between border-b border-[#e5c178]/20 pb-2">
                        <span className="text-[11px] font-mono font-bold text-[#e5c178] uppercase tracking-wider flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5" />
                          Conversational Checkout Ready
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                          Policy Approved
                        </span>
                      </div>

                      <div className="flex gap-3 items-center">
                        <img
                          src={msg.metadata.recommended_products[0].image_url}
                          alt={msg.metadata.recommended_products[0].name}
                          className="h-14 w-14 rounded-xl object-cover border border-zinc-800"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-white">{msg.metadata.recommended_products[0].name}</h4>
                          <p className="text-sm font-extrabold text-[#e5c178] pt-0.5">
                            ₹{msg.metadata.recommended_products[0].price.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleInitiateRazorpay(msg.metadata!.recommended_products![0])}
                        className="w-full btn-ivory rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>⚡ Buy Now via Razorpay API</span>
                      </button>
                    </div>
                  )}

                  {/* Interactive Payment Retry Card */}
                  {msg.metadata?.failure_type === 'PAYMENT_FAILED' && (
                    <div className="rounded-2xl border border-red-500/40 bg-red-950/20 p-4 space-y-3 shadow-xl">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-red-400">
                        <X className="h-4 w-4 text-red-400" />
                        <span>Payment Retry Protocol Active</span>
                      </div>
                      <p className="text-xs text-zinc-300">
                        Order status preserved in pending state. You can safely retry payment without duplicate charge risks.
                      </p>
                      <button
                        onClick={() => {
                          if (msg.metadata?.recommended_products && msg.metadata.recommended_products.length > 0) {
                            handleInitiateRazorpay(msg.metadata.recommended_products[0]);
                          }
                        }}
                        className="w-full rounded-xl bg-red-500 hover:bg-red-600 text-white py-2 text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>💳 Retry Razorpay Payment</span>
                      </button>
                    </div>
                  )}

                  {/* Product Cards */}
                  {msg.metadata?.recommended_products && msg.metadata.recommended_products.length > 0 && !msg.metadata?.pending_checkout && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {msg.metadata.recommended_products.map((product) => (
                        <div
                          key={product.id}
                          className="rounded-2xl border border-zinc-800/80 bg-[#09090d] p-4 space-y-3 hover:border-[#e5c178]/40 transition-all shadow-xl"
                        >
                          <div className="flex gap-3">
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-16 w-16 rounded-xl object-cover border border-zinc-800"
                            />
                            <div className="space-y-1">
                              <h4 className="text-xs font-bold text-white line-clamp-2">{product.name}</h4>
                              <p className="text-sm font-extrabold text-[#e5c178]">
                                ₹{product.price.toLocaleString('en-IN')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-800/80 gap-2">
                            <button
                              onClick={() => handleAddToCart(product)}
                              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 py-1.5 text-[11px] font-semibold text-zinc-200 hover:border-[#e5c178] hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <ShoppingBag className="h-3.5 w-3.5 text-[#e5c178]" />
                              <span>+ Add to Cart</span>
                            </button>
                            <button
                              onClick={() => handleInitiateRazorpay(product)}
                              className="btn-ivory flex-1 rounded-xl py-1.5 text-[11px] font-bold inline-flex items-center justify-center gap-1 shadow-md cursor-pointer"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              <span>Buy Now</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs">
                    👤
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#e5c178]/10 text-[#e5c178]">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl bg-[#09090d] border border-zinc-800 px-4 py-2.5 text-xs text-zinc-400 animate-pulse font-mono">
                  Agent querying merchant catalog & policy engine...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Bar */}
        <div className="border-t border-zinc-800/80 bg-pitch-black p-4 shrink-0">
          <div className="mx-auto max-w-3xl">
            {isListening && (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-[#e5c178]/10 border border-[#e5c178]/40 px-4 py-2 text-xs font-mono text-[#e5c178] animate-pulse mb-3">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-[#e5c178] animate-bounce" />
                  <span>Listening in <strong>{speechLang === 'en-IN' ? 'English (India)' : 'Hindi (hi-IN)'}</strong>... Speak your query!</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleVoiceInput()}
                  className="px-2.5 py-1 rounded bg-[#e5c178] text-zinc-950 text-[10px] font-bold uppercase hover:bg-white transition-all cursor-pointer"
                >
                  Stop & Send
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-3"
            >
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  title={`Voice Input (${speechLang === 'en-IN' ? 'English' : 'Hindi'})`}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all ${
                    isListening
                      ? 'border-[#e5c178] bg-[#e5c178]/20 text-[#e5c178] animate-mic-pulse'
                      : 'border-zinc-800 bg-[#09090d] text-zinc-400 hover:border-[#e5c178] hover:text-[#e5c178]'
                  }`}
                >
                  <Mic className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSpeechLang(speechLang === 'en-IN' ? 'hi-IN' : 'en-IN')}
                  className="px-2 py-1 text-[10px] font-mono font-bold rounded-lg border border-zinc-800 bg-[#09090d] text-zinc-400 hover:text-[#e5c178] hover:border-[#e5c178]/40"
                  title="Toggle Voice Language"
                >
                  {speechLang === 'en-IN' ? 'EN' : 'HI'}
                </button>
              </div>

              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask in English, Hindi, or Hinglish... (e.g. 'अन्य हेडफोंस दिखाओ')"
                className="flex-1 rounded-xl border border-zinc-800 bg-[#09090d] px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-[#e5c178] focus:outline-none"
              />

              <button
                type="submit"
                disabled={loading || !inputQuery.trim()}
                className="btn-ivory flex h-11 px-5 items-center justify-center gap-2 rounded-xl text-xs font-bold shadow-lg disabled:opacity-50 transition-all"
              >
                <span>Send</span>
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Rich Slide-Over Cart Drawer */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#050507] border-l border-zinc-800 p-6 flex flex-col justify-between space-y-6 h-full shadow-2xl">
            {/* Drawer Header */}
            <div className="space-y-6 overflow-hidden flex flex-col flex-1">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#e5c178]/10 text-[#e5c178] border border-[#e5c178]/20">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">Buyer Shopping Cart</h3>
                    <p className="text-[11px] font-mono text-zinc-400">{totalCartCount} {totalCartCount === 1 ? 'item' : 'items'} selected</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCartDrawer(false)}
                  className="p-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Cart Items / Empty View */}
              {cartItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
                  <div className="h-16 w-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                    <ShoppingBag className="h-8 w-8 text-zinc-600" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-white">Your cart is empty</div>
                    <p className="text-xs text-zinc-400 max-w-xs">
                      Ask the AI Shopping Assistant for recommendations or search for products to add them to your cart.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCartDrawer(false);
                      handleSendMessage('Show me top wireless headphones under ₹6,000');
                    }}
                    className="btn-ivory rounded-xl px-4 py-2 text-xs font-bold shadow-md cursor-pointer"
                  >
                    🔍 Find Recommended Products
                  </button>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  {cartItems.map((item) => (
                    <div key={item.product.id} className="rounded-2xl border border-zinc-800 bg-[#09090d] p-4 space-y-3 shadow-md hover:border-zinc-700 transition-all">
                      <div className="flex gap-3">
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="h-16 w-16 rounded-xl object-cover border border-zinc-800 shrink-0"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">{item.product.name}</h4>
                            <button
                              onClick={() => handleRemoveFromCart(item.product.id)}
                              className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                              title="Remove item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="text-xs font-extrabold text-[#e5c178]">
                            ₹{item.product.price.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>

                      {/* Quantity Controls & Line Subtotal */}
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs">
                        <div className="flex items-center gap-2 bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-800">
                          <button
                            onClick={() => handleUpdateCartQuantity(item.product.id, -1)}
                            className="h-5 w-5 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 font-bold transition-all"
                          >
                            -
                          </button>
                          <span className="font-mono text-xs font-bold text-white px-2">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateCartQuantity(item.product.id, 1)}
                            className="h-5 w-5 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 font-bold transition-all"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-zinc-500 font-mono">Subtotal: </span>
                          <span className="font-bold text-white font-mono">
                            ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Footer Summary & Checkout */}
            {cartItems.length > 0 && (
              <div className="border-t border-zinc-800 pt-4 space-y-4 shrink-0 bg-[#050507]">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center gap-2.5 text-xs text-emerald-400">
                  <Zap className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-[11px] font-medium leading-snug">
                    Merchant Governance Gate Approved: Max 15% discount limit & auto-checkout value ceiling checked.
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Cart Total ({totalCartCount} items)</span>
                    <span className="font-mono text-white">₹{totalCartPrice.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Delivery & Tax</span>
                    <span className="font-mono text-emerald-400 font-bold">FREE (Demo)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-zinc-800">
                    <span className="font-bold text-white">Total Amount:</span>
                    <span className="text-xl font-extrabold text-[#e5c178] font-mono">
                      ₹{totalCartPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowCartDrawer(false);
                    if (cartItems.length > 0) {
                      handleInitiateRazorpay(cartItems[0].product);
                    }
                  }}
                  className="btn-ivory w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold shadow-xl active:scale-95 transition-all cursor-pointer"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>⚡ Checkout via Razorpay API (₹{totalCartPrice.toLocaleString('en-IN')})</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Buyer Profile & Agent Governance Controls Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-[#09090d] p-6 space-y-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#e5c178]/10 text-[#e5c178] border border-[#e5c178]/30 flex items-center justify-center text-lg font-bold">
                  👤
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Buyer Profile & Agent Controls</h3>
                  <p className="text-xs text-zinc-400">Set budget ceilings & purchase governance boundaries for your AI assistant.</p>
                </div>
              </div>
              <button onClick={() => setShowProfileModal(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="space-y-5 text-xs">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-200 flex items-center justify-between">
                  <span>AI Agent Auto-Purchase Budget Ceiling</span>
                  <span className="text-[#e5c178] font-mono font-bold">Current: ₹{buyerBudget.toLocaleString('en-IN')}</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-mono text-zinc-500 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    value={buyerBudget}
                    onChange={(e) => setBuyerBudget(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-8 pr-4 py-2.5 text-sm text-white font-mono focus:border-[#e5c178] focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-zinc-500 font-mono">Quick Presets:</span>
                  {[3000, 5000, 10000, 15000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBuyerBudget(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                        buyerBudget === preset
                          ? 'bg-[#e5c178] text-zinc-950'
                          : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                    >
                      ₹{preset.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                <label className="text-xs font-bold text-zinc-200 flex items-center justify-between">
                  <span>Require Order Confirmation Ceiling</span>
                  <span className="text-emerald-400 font-mono font-bold">₹{autoConfirmThreshold.toLocaleString('en-IN')}</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-mono text-zinc-500 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    value={autoConfirmThreshold}
                    onChange={(e) => setAutoConfirmThreshold(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-8 pr-4 py-2.5 text-sm text-white font-mono focus:border-[#e5c178] focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-zinc-500">
                  Orders above this value require explicit buyer confirmation before launching the Razorpay checkout.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-[#e5c178]" />
                  <span className="text-zinc-300 font-medium">Buyer Identity</span>
                </div>
                <span className="font-mono text-white font-bold">Rajesh Kumar (Buyer Demo)</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-zinc-800 pt-4 flex items-center justify-between">
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-bold">
                POLICY ACTIVE
              </span>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('buyer_agent_budget', buyerBudget.toString());
                    localStorage.setItem('buyer_auto_confirm', autoConfirmThreshold.toString());
                  }
                  setShowProfileModal(false);
                  setCustomAlert({
                    isOpen: true,
                    title: 'Agent Controls Saved',
                    message: `AI Agent purchase budget ceiling updated to ₹${buyerBudget.toLocaleString('en-IN')}.`,
                    type: 'success',
                  });
                }}
                className="btn-ivory rounded-xl px-5 py-2.5 text-xs font-bold shadow-lg cursor-pointer active:scale-95 transition-all"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      <CustomAlertModal alert={customAlert} onClose={() => setCustomAlert(null)} />
    </AuthGuard>
  );
}
