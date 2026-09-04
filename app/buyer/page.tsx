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
  Trash2
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat sessions from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
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
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        const finalMsgList = [...newMsgList, data.message];
        updateSessionMessages(finalMsgList);

        if (data.recommendedProducts && data.recommendedProducts.length > 0) {
          const rec = data.recommendedProducts[0];
          setCartItems([{ product: rec, quantity: 1 }]);
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
      <div className="min-h-screen bg-pitch-black text-zinc-100 flex flex-col font-sans">
        <Navbar />
        <div className="flex flex-1 h-[calc(100vh-61px)] overflow-hidden">
          {/* Sidebar */}
          <aside className="w-72 border-r border-zinc-800/60 bg-[#07070a] flex flex-col justify-between p-4 shrink-0 hidden md:flex">
            <div className="space-y-4">
              {/* New Chat Button */}
              <button
                onClick={handleNewChat}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#e5c178] hover:bg-[#d4b067] text-zinc-950 font-bold px-4 py-2.5 text-xs transition-all shadow-md active:scale-95"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                <span>New Chat</span>
              </button>

              {/* Chat History Section */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <History className="h-3 w-3 text-[#e5c178]" />
                    Chat History
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">({sessions.length})</span>
                </div>

                <div className="space-y-1.5 max-h-[calc(100vh-250px)] overflow-y-auto pr-1 custom-scrollbar">
                  {sessions.map((session) => {
                    const isActive = session.id === activeSessionId;
                    return (
                      <div
                        key={session.id}
                        onClick={() => handleSelectSession(session.id)}
                        className={`group relative flex items-center justify-between rounded-xl p-3 text-xs cursor-pointer border transition-all ${
                          isActive
                            ? 'border-[#e5c178]/50 bg-[#e5c178]/10 text-white font-medium shadow-sm'
                            : 'border-zinc-800/60 bg-[#09090d] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden pr-6">
                          <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-[#e5c178]' : 'text-zinc-500'}`} />
                          <span className="truncate text-xs">{session.title || 'Shopping Chat'}</span>
                        </div>

                        <button
                          onClick={(e) => handleDeleteSession(e, session.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-zinc-500 transition-opacity absolute right-2"
                          title="Delete Chat"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-800/80 pt-4">
              <div className="text-[10px] text-center font-mono text-zinc-500 uppercase tracking-wider">
                RAZORPAY TEST API • VOICE STT
              </div>
            </div>
          </aside>

          {/* Main Workspace */}
          <main className="flex-1 flex flex-col justify-between overflow-hidden">
            {/* Top Header */}
            <header className="border-b border-zinc-800/60 bg-[#050507]/90 backdrop-blur-md px-8 py-4 flex items-center justify-between shrink-0">
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

              <div className="flex items-center gap-4">
                {cartItems.length > 0 && (
                  <button
                    onClick={() => setShowCartDrawer(true)}
                    className="btn-ivory rounded-xl px-4 py-2 text-xs font-semibold inline-flex items-center gap-2 shadow-lg"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>Cart ({cartItems.length})</span>
                  </button>
                )}
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

                          <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-800/80">
                            <span className="text-zinc-400 text-[11px] font-mono">Stock: <strong className="text-zinc-200">{product.stock}</strong></span>
                            <button
                              onClick={() => handleInitiateRazorpay(product)}
                              className="btn-ivory rounded-xl px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 shadow-md"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              <span>Buy via Razorpay</span>
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

      {/* Cart Drawer */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#050507] border-l border-zinc-800 p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-[#e5c178]" />
                  <span>Buyer Shopping Cart</span>
                </h3>
                <button onClick={() => setShowCartDrawer(false)} className="text-zinc-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {cartItems.map((item) => (
                <div key={item.product.id} className="rounded-xl border border-zinc-800 bg-[#09090d] p-4 space-y-3">
                  <div className="flex gap-3">
                    <img src={item.product.image_url} alt={item.product.name} className="h-14 w-14 rounded-lg object-cover" />
                    <div>
                      <h4 className="text-xs font-bold text-white">{item.product.name}</h4>
                      <p className="text-xs font-extrabold text-[#e5c178] pt-1">₹{item.product.price.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-800 pt-4 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-mono">Total Payable:</span>
                <span className="text-lg font-extrabold text-[#e5c178]">
                  ₹{cartItems.reduce((acc, curr) => acc + curr.product.price * curr.quantity, 0).toLocaleString('en-IN')}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowCartDrawer(false);
                  if (cartItems.length > 0) handleInitiateRazorpay(cartItems[0].product);
                }}
                className="btn-ivory w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold shadow-lg"
              >
                <CreditCard className="h-4 w-4" />
                <span>Checkout via Razorpay API</span>
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>

      <CustomAlertModal alert={customAlert} onClose={() => setCustomAlert(null)} />
    </AuthGuard>
  );
}
