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
  ArrowRight
} from 'lucide-react';
import { ChatMessage, Product } from '@/lib/types';

declare global {
  interface Window {
    Razorpay: any;
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export default function BuyerAIWorkspace() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content:
        '👋 Namaste! I am your AI Shopping Assistant.\n\n' +
        'Ask me anything in **English, Hindi, or Hinglish**!\n\n' +
        'For example: *"Mujhe ₹3,000 ke andar wireless headphones chahiye"* or *"अन्य हेडफोंस इन योर कैटलॉग"*.',
      created_at: new Date().toISOString(),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [simulatedFailure, setSimulatedFailure] = useState<'OUT_OF_STOCK' | 'PRICE_CHANGED' | 'PAYMENT_FAILED' | undefined>(undefined);
  const [cartItems, setCartItems] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const [speechLang, setSpeechLang] = useState<'en-IN' | 'hi-IN'>('en-IN');

  const handleVoiceInput = () => {
    if (isListening) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please type your request.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = speechLang;
      recognition.continuous = false;
      recognition.interimResults = true;

      let recordedText = '';

      recognition.onstart = () => setIsListening(true);

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            recordedText += text;
          } else {
            currentText += text;
          }
        }
        const fullText = recordedText || currentText;
        if (fullText) {
          setInputQuery(fullText);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        const finalQuery = recordedText.trim() || inputQuery.trim();
        if (finalQuery) {
          handleSendMessage(finalQuery);
        }
      };

      recognition.onerror = () => setIsListening(false);
      recognition.start();
    } catch (e) {
      console.error('Speech recognition error:', e);
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
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: textToSend,
          simulatedFailure,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        setMessages((prev) => [...prev, data.message]);

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
        alert(`Policy Gate Error: ${orderData.error}`);
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

    if (simulatedFailure === 'PAYMENT_FAILED') {
      await verifyPaymentServer(razorpayOrderId, paymentId, mockSig, 'PAYMENT_FAILED');
    } else {
      await verifyPaymentServer(razorpayOrderId, paymentId, mockSig);
    }
  };

  const verifyPaymentServer = async (
    rzpOrderId: string,
    rzpPaymentId: string,
    rzpSignature: string,
    overrideFailure?: 'PAYMENT_FAILED'
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
          simulatedFailure: overrideFailure || simulatedFailure,
        }),
      });

      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
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
    <div className="flex h-screen bg-pitch-black text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-72 border-r border-zinc-800/60 bg-[#07070a] flex flex-col justify-between p-5 shrink-0 hidden md:flex">
        <div className="space-y-8">
          <div className="flex items-center justify-between px-1">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#e5c178] shadow-[0_0_10px_#e5c178]" />
              <span className="text-base font-bold text-white tracking-tight">ShopAgent <span className="text-zinc-500 font-normal">Buyer</span></span>
            </Link>
          </div>

          <div className="space-y-3">
            <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest px-1">
              SUGGESTED PROMPTS
            </div>
            <div className="space-y-2">
              <button
                onClick={() => handleSendMessage('Mujhe ₹3000 ke andar wireless headphones chahiye')}
                className="w-full text-left rounded-xl border border-zinc-800/80 bg-[#09090d] p-3 text-xs text-zinc-300 hover:border-[#e5c178] hover:text-[#e5c178] transition-all"
              >
                💬 &quot;Mujhe ₹3,000 ke andar wireless headphones chahiye&quot;
              </button>
              <button
                onClick={() => handleSendMessage('अन्य हेडफोंस इन योर कैटलॉग')}
                className="w-full text-left rounded-xl border border-zinc-800/80 bg-[#09090d] p-3 text-xs text-zinc-300 hover:border-[#e5c178] hover:text-[#e5c178] transition-all"
              >
                💬 &quot;अन्य हेडफोंस इन योर कैटलॉग&quot;
              </button>
              <button
                onClick={() => handleSendMessage('Ye wala le lo')}
                className="w-full text-left rounded-xl border border-zinc-800/80 bg-[#09090d] p-3 text-xs text-zinc-300 hover:border-[#e5c178] hover:text-[#e5c178] transition-all"
              >
                💬 &quot;Ye wala le lo&quot; (Confirm Buy)
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800/80 pt-4">
          <Link
            href="/seller"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#0e0e14] px-3.5 py-2.5 text-xs font-semibold text-zinc-300 border border-zinc-800 hover:border-[#e5c178] hover:text-white transition-all"
          >
            <Building2 className="h-4 w-4 text-[#e5c178]" />
            <span>Merchant Admin Portal</span>
          </Link>
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
            <select
              value={simulatedFailure || ''}
              onChange={(e) => setSimulatedFailure((e.target.value as any) || undefined)}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-1.5 text-xs font-mono text-zinc-300 focus:outline-none focus:border-[#e5c178] cursor-pointer"
            >
              <option value="">🧪 Normal Flow (No Failures)</option>
              <option value="OUT_OF_STOCK">❌ Test: Out of Stock Recovery</option>
              <option value="PRICE_CHANGED">⚠️ Test: Price Spike Alert</option>
              <option value="PAYMENT_FAILED">💳 Test: Payment Failure Retry</option>
            </select>

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
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {/* Product Cards */}
                  {msg.metadata?.recommended_products && msg.metadata.recommended_products.length > 0 && (
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
  );
}
