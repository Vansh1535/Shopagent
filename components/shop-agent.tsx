'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Activity,
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock,
  Code2,
  Database,
  ExternalLink,
  Filter,
  Globe2,
  Headphones,
  History,
  IndianRupee,
  Info,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  Mic,
  MicOff,
  Moon,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  Sun,
  Trash2,
  TrendingUp,
  User,
  Users,
  Volume2,
  VolumeX,
  Wand2,
  X,
  Zap
} from 'lucide-react'

// --- Types ---
type Role = 'seller' | 'buyer'
type ViewMode = 'landing' | 'auth' | 'app'
type AuthMode = 'signin' | 'signup'
type SellerPage =
  | 'Dashboard'
  | 'Products'
  | 'Add product'
  | 'Agent-ready catalog'
  | 'Commerce policies'
  | 'Activity / Audit'

interface Product {
  id: string
  name: string
  sku: string
  category: string
  price: number
  stock: number
  readiness: number // percentage
  status: 'Live' | 'Out of stock' | 'Draft'
  description: string
  attributes: Record<string, string>
  imagePlaceholderColor: string
}

interface ChatMessage {
  id: string
  sender: 'user' | 'ai'
  text: string
  timestamp: string
  matchedProducts?: Product[]
  reasoning?: string
  language?: string
}

interface ChatSession {
  id: string
  title: string
  timestamp: string
  messages: ChatMessage[]
}

interface Order {
  id: string
  razorpayPaymentId: string
  productName: string
  amount: number
  quantity: number
  buyerName: string
  timestamp: string
  status: 'Completed' | 'Pending' | 'Refunded'
}

// --- Initial Mock Data ---
const initialProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Everyday Cotton Kurta',
    sku: 'KUR-2048',
    category: 'Apparel',
    price: 899,
    stock: 124,
    readiness: 96,
    status: 'Live',
    description: '100% breathable pure South Indian cotton. Ideal for daily office wear & summer climate.',
    attributes: { Material: '100% Pure Cotton', Fit: 'Regular / Comfort Fit', Sleeve: 'Full Sleeve', Occasion: 'Daily Workwear' },
    imagePlaceholderColor: 'bg-emerald-600'
  },
  {
    id: 'prod-2',
    name: 'Neem & Tulsi Organic Face Wash',
    sku: 'SKN-1084',
    category: 'Beauty',
    price: 349,
    stock: 58,
    readiness: 88,
    status: 'Live',
    description: 'Sulfate-free herbal face wash for oily and acne-prone skin.',
    attributes: { Ingredients: 'Organic Neem, Wild Tulsi, Aloe Vera', SkinType: 'Oily & Combination', NetVol: '150ml' },
    imagePlaceholderColor: 'bg-teal-600'
  },
  {
    id: 'prod-3',
    name: 'Handwoven Jute Tote Bag',
    sku: 'HOM-7832',
    category: 'Home',
    price: 599,
    stock: 0,
    readiness: 72,
    status: 'Out of stock',
    description: 'Eco-friendly biodegradable jute shoulder bag with cotton webbing handles.',
    attributes: { Material: 'Natural Jute', Capacity: '15 Liters', Closure: 'Zipper' },
    imagePlaceholderColor: 'bg-amber-600'
  },
  {
    id: 'prod-4',
    name: 'Masala Chai Artisan Blend · 250g',
    sku: 'FNB-4091',
    category: 'Grocery',
    price: 220,
    stock: 231,
    readiness: 98,
    status: 'Live',
    description: 'Assam CTC black tea blended with freshly crushed cardamom, ginger, and cinnamon.',
    attributes: { Ingredients: 'Assam CTC Tea, Cardamom, Ginger, Clove', Origin: 'Assam, India', ShelfLife: '12 Months' },
    imagePlaceholderColor: 'bg-orange-600'
  }
]

const initialChatSessions: ChatSession[] = [
  {
    id: 'chat-1',
    title: 'Comfortable cotton kurta under ₹1000',
    timestamp: 'Today, 2:15 PM',
    messages: [
      {
        id: 'msg-1',
        sender: 'user',
        text: 'office ke liye comfortable cotton kurta chahiye, under ₹1000',
        timestamp: '2:15 PM'
      },
      {
        id: 'msg-2',
        sender: 'ai',
        text: 'Maine aapke search ke hisab se 96% match wala Everyday Cotton Kurta dhoondha hai. Yeh 100% pure South Indian cotton se bana hai, regular fit hai aur price sirf ₹899 hai.',
        timestamp: '2:15 PM',
        matchedProducts: [initialProducts[0]],
        reasoning: 'Matches query attributes: Cotton material, office comfort fit, priced ₹899 (< ₹1000 budget), 124 units in stock.',
        language: 'Hinglish'
      }
    ]
  },
  {
    id: 'chat-2',
    title: 'Herbal skincare for oily skin',
    timestamp: 'Yesterday',
    messages: [
      {
        id: 'msg-3',
        sender: 'user',
        text: 'Best organic face wash for oily skin under ₹500',
        timestamp: 'Yesterday'
      },
      {
        id: 'msg-4',
        sender: 'ai',
        text: 'Here is the top recommendation: Neem & Tulsi Organic Face Wash (₹349). It is sulfate-free and formulated specifically for oily and acne-prone skin.',
        timestamp: 'Yesterday',
        matchedProducts: [initialProducts[1]],
        reasoning: 'Sulfate-free formulation with organic ingredients, priced under budget at ₹349.',
        language: 'English'
      }
    ]
  }
]

const initialAuditLogs = [
  { id: 'log-1', time: '10 mins ago', type: 'Agent Match', detail: 'Buyer queried "cotton kurta under ₹1000" -> Everyday Cotton Kurta matched (96%)', status: 'Success' },
  { id: 'log-2', time: '25 mins ago', type: 'Policy Check', detail: 'Return policy validated: 7-day hassle-free returns compliant with Razorpay terms', status: 'Passed' },
  { id: 'log-3', time: '1 hour ago', type: 'Razorpay Payment', detail: 'Order #ORD-9821 paid via Razorpay Test Mode (₹899) - Payment ID: pay_Px89234190', status: 'Verified' },
  { id: 'log-4', time: '3 hours ago', type: 'Catalog AI Scan', detail: 'Normalized product attributes for SKU FNB-4091 (Readiness score: 98%)', status: 'Success' }
]

// --- Helper UI Components ---
function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2.5 ${onClick ? 'cursor-pointer select-none' : ''}`}
    >
      <div className="flex size-9 items-center justify-center rounded-xl bg-[#f36a21] text-white shadow-md shadow-[#f36a21]/20">
        <Store size={18} />
      </div>
      <div className="flex flex-col">
        <span className="text-base font-bold tracking-tight">ShopAgent</span>
        <span className="text-[10px] font-medium leading-none text-muted-foreground">
          AI-Native Commerce
        </span>
      </div>
    </div>
  )
}

function Button({
  children,
  onClick,
  secondary = false,
  outline = false,
  className = '',
  disabled = false,
  type = 'button'
}: {
  children: React.ReactNode
  onClick?: () => void
  secondary?: boolean
  outline?: boolean
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}) {
  let baseStyle =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer'
  if (secondary) {
    baseStyle += ' bg-muted text-foreground hover:bg-muted/80'
  } else if (outline) {
    baseStyle += ' border border-border bg-card text-foreground hover:bg-muted'
  } else {
    baseStyle +=
      ' bg-[#f36a21] text-white shadow-sm hover:bg-[#d95b17] shadow-orange-500/10'
  }
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyle} ${className}`}
    >
      {children}
    </button>
  )
}

// --- Main Application Wrapper ---
export default function ShopAgent() {
  // Theme state: dark / light
  const [dark, setDark] = useState<boolean>(false)

  // Navigation & session states
  const [viewMode, setViewMode] = useState<ViewMode>('landing') // 'landing' | 'auth' | 'app'
  const [authMode, setAuthMode] = useState<AuthMode>('signup')
  const [role, setRole] = useState<Role>('seller')
  const [userEmail, setUserEmail] = useState<string>('')

  // Seller workspace state
  const [sellerPage, setSellerPage] = useState<SellerPage>('Dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false)
  const [productsList, setProductsList] = useState<Product[]>(initialProducts)
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs)

  // Add Product form state
  const [newProdName, setNewProdName] = useState('')
  const [newProdCat, setNewProdCat] = useState('')
  const [newProdPrice, setNewProdPrice] = useState('')
  const [newProdStock, setNewProdStock] = useState('')
  const [newProdDesc, setNewProdDesc] = useState('')
  const [aiGeneratingTags, setAiGeneratingTags] = useState(false)
  const [generatedTags, setGeneratedTags] = useState<Record<string, string> | null>(null)

  // Buyer state & chat history
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(initialChatSessions)
  const [activeChatId, setActiveChatId] = useState<string>('chat-1')
  const [buyerInput, setBuyerInput] = useState<string>('')
  const [isListening, setIsListening] = useState<boolean>(false)
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false)
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null)
  const [checkoutModalOpen, setCheckoutModalOpen] = useState<boolean>(false)
  const [paymentSuccessOrder, setPaymentSuccessOrder] = useState<Order | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [mobileBuyerSidebarOpen, setMobileBuyerSidebarOpen] = useState<boolean>(false)

  // Speech recognition ref
  const recognitionRef = useRef<any>(null)

  // Sync dark class to root document element
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [dark])

  // Initialize Speech Recognition API
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const rec = new SpeechRecognition()
        rec.continuous = false
        rec.interimResults = true
        rec.lang = 'hi-IN'

        rec.onresult = (event: any) => {
          let transcript = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript
          }
          setBuyerInput(transcript)
        }

        rec.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          setIsListening(false)
        }

        rec.onend = () => {
          setIsListening(false)
        }

        recognitionRef.current = rec
      }
    }
  }, [])

  // Toggle Microphone
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setBuyerInput('')
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start()
          setIsListening(true)
        } catch (e) {
          console.log('Mic start exception:', e)
          setIsListening(true)
          simulateMicRecording()
        }
      } else {
        setIsListening(true)
        simulateMicRecording()
      }
    }
  }

  // Fallback voice simulation if browser speech recognition is restricted/unsupported
  const simulateMicRecording = () => {
    const mockPhrases = [
      'office ke liye comfortable cotton kurta under ₹1000',
      'neem face wash for oily skin',
      'Assam masala chai blend 250g'
    ]
    const chosen = mockPhrases[Math.floor(Math.random() * mockPhrases.length)]
    let idx = 0
    const interval = setInterval(() => {
      if (idx <= chosen.length) {
        setBuyerInput(chosen.slice(0, idx))
        idx++
      } else {
        clearInterval(interval)
        setIsListening(false)
      }
    }, 60)
  }

  // Handle Text-to-Speech
  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel()
        setIsSpeaking(false)
        return
      }
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      setIsSpeaking(true)
      window.speechSynthesis.speak(utterance)
    }
  }

  // Submit Buyer AI Query
  const handleSendBuyerQuery = (customText?: string) => {
    const query = customText || buyerInput
    if (!query.trim()) return

    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: timeStr
    }

    // AI matching logic against catalog
    let matched: Product[] = []
    let reasoningText = ''
    let aiResponseText = ''

    const qLower = query.toLowerCase()
    if (qLower.includes('kurta') || qLower.includes('office') || qLower.includes('cloth') || qLower.includes('apparel')) {
      matched = [productsList[0]]
      reasoningText = 'Matches query intent: Pure South Indian cotton kurta, office fit, price ₹899 (< ₹1000 budget), 124 units in stock.'
      aiResponseText = 'Aapki request ke hisab se Everyday Cotton Kurta (₹899) best match hai. Yeh 100% pure cotton hai, daily office wear ke liye bohot comfortable hai. 7-day return policy available hai.'
    } else if (qLower.includes('face') || qLower.includes('skin') || qLower.includes('neem') || qLower.includes('beauty')) {
      matched = [productsList[1]]
      reasoningText = 'Organic neem and tulsi ingredients, sulfate-free formulation for oily/acne-prone skin, priced ₹349.'
      aiResponseText = 'Oily skin ke liye Neem & Tulsi Organic Face Wash (₹349) sabse acha option hai. Chemical-free organic ingredients se bana hai aur skin break-outs rokt hai.'
    } else if (qLower.includes('tea') || qLower.includes('chai') || qLower.includes('grocery') || qLower.includes('masala')) {
      matched = [productsList[3]]
      reasoningText = 'Fresh Assam CTC tea leaf with cardamom & ginger spices, 250g pack at ₹220.'
      aiResponseText = 'Fresh Masala Chai Artisan Blend 250g (₹220) available hai. Assam CTC chai leaf ke saath asli ilaychi aur adrak mix hai.'
    } else {
      matched = [productsList[0], productsList[3]]
      reasoningText = 'Broad query matched top catalog items sorted by readiness score and stock availability.'
      aiResponseText = `Aapke query "${query}" ke mutabiq hamare store se ye top recommendations hain. Dono products direct seller store se verified hain.`
    }

    const aiMsg: ChatMessage = {
      id: 'msg-' + (Date.now() + 1),
      sender: 'ai',
      text: aiResponseText,
      timestamp: timeStr,
      matchedProducts: matched,
      reasoning: reasoningText,
      language: 'Hinglish / English'
    }

    // Update active chat session or create new one
    setChatSessions((prevSessions) => {
      const existing = prevSessions.find((s) => s.id === activeChatId)
      if (existing) {
        return prevSessions.map((s) =>
          s.id === activeChatId
            ? { ...s, messages: [...s.messages, userMsg, aiMsg] }
            : s
        )
      } else {
        const newSession: ChatSession = {
          id: 'chat-' + Date.now(),
          title: query.slice(0, 30) + '...',
          timestamp: 'Just now',
          messages: [userMsg, aiMsg]
        }
        setActiveChatId(newSession.id)
        return [newSession, ...prevSessions]
      }
    })

    // Log event in audit trail
    setAuditLogs((prev) => [
      {
        id: 'log-' + Date.now(),
        time: 'Just now',
        type: 'Agent Match',
        detail: `Buyer query "${query.slice(0, 25)}..." -> Matched ${matched.map((m) => m.name).join(', ')}`,
        status: 'Success'
      },
      ...prev
    ])

    setBuyerInput('')
  }

  // Add Product logic
  const handleAddProduct = () => {
    if (!newProdName || !newProdPrice) return
    const priceNum = parseFloat(newProdPrice) || 0
    const stockNum = parseInt(newProdStock) || 10

    const createdProd: Product = {
      id: 'prod-' + Date.now(),
      name: newProdName,
      sku: 'SKU-' + Math.floor(1000 + Math.random() * 9000),
      category: newProdCat || 'General',
      price: priceNum,
      stock: stockNum,
      readiness: 94,
      status: 'Live',
      description: newProdDesc || 'AI-normalized product listing.',
      attributes: generatedTags || { Material: 'Standard', Origin: 'India' },
      imagePlaceholderColor: 'bg-indigo-600'
    }

    setProductsList([createdProd, ...productsList])
    setNewProdName('')
    setNewProdCat('')
    setNewProdPrice('')
    setNewProdStock('')
    setNewProdDesc('')
    setGeneratedTags(null)
    setSellerPage('Products')
  }

  // AI Tag Auto Generator simulation
  const handleGenerateAiTags = () => {
    setAiGeneratingTags(true)
    setTimeout(() => {
      setGeneratedTags({
        'AI Quality Grade': 'Premium A+',
        'Agent Discoverability': 'High Intent',
        'Normalized Attributes': 'Verified Material, Standard Dimensions, Express Delivery',
        'Compliance Check': 'Razorpay Policy Compliant'
      })
      setAiGeneratingTags(false)
    }, 800)
  }

  // Razorpay Payment Simulation
  const handleInitiateRazorpay = (product: Product) => {
    setCheckoutProduct(product)
    setCheckoutModalOpen(true)
  }

  const handleCompletePayment = () => {
    if (!checkoutProduct) return
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000)
    const paymentId = 'pay_' + Math.random().toString(36).substring(2, 12).toUpperCase()

    const newOrder: Order = {
      id: orderId,
      razorpayPaymentId: paymentId,
      productName: checkoutProduct.name,
      amount: checkoutProduct.price,
      quantity: 1,
      buyerName: 'Rahul Mehta',
      timestamp: 'Just now',
      status: 'Completed'
    }

    setOrders([newOrder, ...orders])
    setPaymentSuccessOrder(newOrder)

    // Add to audit trail
    setAuditLogs((prev) => [
      {
        id: 'log-' + Date.now(),
        time: 'Just now',
        type: 'Razorpay Payment',
        detail: `Order #${orderId} (₹${checkoutProduct.price}) verified via Razorpay Test Mode (${paymentId})`,
        status: 'Verified'
      },
      ...prev
    ])
  }

  // Current active chat session
  const activeChat = chatSessions.find((s) => s.id === activeChatId) || chatSessions[0]

  return (
    <div className={`min-h-screen bg-background text-foreground ${dark ? 'dark' : ''}`}>
      {/* ========================================================= */}
      {/* 1. LANDING PAGE VIEW                                      */}
      {/* ========================================================= */}
      {viewMode === 'landing' && (
        <div className="flex min-h-screen flex-col">
          {/* Header */}
          <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
              <Logo onClick={() => setViewMode('landing')} />
              <div className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
                <a href="#features" className="hover:text-foreground">
                  Features
                </a>
                <a href="#how" className="hover:text-foreground">
                  How it Works
                </a>
                <a href="#trust" className="hover:text-foreground">
                  Trust & Compliance
                </a>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDark(!dark)}
                  className="rounded-xl border p-2.5 text-muted-foreground transition hover:bg-muted hover:text-foreground cursor-pointer"
                  aria-label="Toggle theme"
                >
                  {dark ? <Sun size={17} /> : <Moon size={17} />}
                </button>
                <Button
                  outline
                  onClick={() => {
                    setAuthMode('signin')
                    setViewMode('auth')
                  }}
                >
                  Sign in
                </Button>
                <Button
                  onClick={() => {
                    setAuthMode('signup')
                    setViewMode('auth')
                  }}
                >
                  Get started <ArrowRight size={15} />
                </Button>
              </div>
            </div>
          </header>

          {/* Hero Section */}
          <section className="relative overflow-hidden border-b bg-gradient-to-b from-background via-muted/30 to-background py-16 lg:py-24">
            <div className="mx-auto max-w-7xl px-6">
              <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
                <div className="lg:col-span-7">
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 text-xs font-semibold text-[#f36a21] shadow-sm">
                    <Sparkles size={14} className="text-[#f36a21]" />
                    <span>Razorpay Buildathon — AI Growth & Agentic Commerce</span>
                  </div>
                  <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:leading-[1.1]">
                    Make your store sellable to <span className="text-[#f36a21]">AI buyers</span>.
                  </h1>
                  <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                    ShopAgent transforms traditional product catalogs into structured, agentic API surfaces. Sellers reach AI shoppers, and buyers enjoy natural voice & multi-turn conversational commerce with Razorpay instant checkout.
                  </p>
                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    <Button
                      onClick={() => {
                        setRole('seller')
                        setViewMode('app')
                      }}
                      className="px-6 py-3 text-base"
                    >
                      <Store size={18} /> Launch Seller Workspace
                    </Button>
                    <Button
                      secondary
                      onClick={() => {
                        setRole('buyer')
                        setViewMode('app')
                      }}
                      className="px-6 py-3 text-base"
                    >
                      <ShoppingBag size={18} /> Try Buyer AI Assistant
                    </Button>
                  </div>
                  {/* Quick Stats */}
                  <div className="mt-12 grid grid-cols-3 gap-6 border-t pt-6">
                    <div>
                      <b className="text-2xl font-extrabold text-foreground sm:text-3xl">91%</b>
                      <span className="mt-1 block text-xs text-muted-foreground">Catalog Readiness</span>
                    </div>
                    <div>
                      <b className="text-2xl font-extrabold text-foreground sm:text-3xl">100%</b>
                      <span className="mt-1 block text-xs text-muted-foreground">Razorpay Auditability</span>
                    </div>
                    <div>
                      <b className="text-2xl font-extrabold text-foreground sm:text-3xl">3+</b>
                      <span className="mt-1 block text-xs text-muted-foreground">Languages (Hi/En/Hinglish)</span>
                    </div>
                  </div>
                </div>

                {/* Hero Interactive Card Preview */}
                <div className="lg:col-span-5">
                  <div className="relative rounded-2xl border bg-card p-6 shadow-2xl shadow-orange-500/10">
                    <div className="mb-4 flex items-center justify-between border-b pb-4">
                      <div className="flex items-center gap-2">
                        <div className="size-3 rounded-full bg-red-400" />
                        <div className="size-3 rounded-full bg-yellow-400" />
                        <div className="size-3 rounded-full bg-green-400" />
                        <span className="ml-2 text-xs font-mono text-muted-foreground">
                          agent-stream.json
                        </span>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Live Agent Match
                      </span>
                    </div>

                    <div className="space-y-4 text-xs font-mono">
                      <div className="rounded-xl bg-muted/60 p-3">
                        <span className="text-muted-foreground">// Buyer Query (Voice STT):</span>
                        <p className="mt-1 font-sans text-sm font-semibold text-foreground">
                          &quot;office ke liye comfortable cotton kurta under ₹1000&quot;
                        </p>
                      </div>

                      <div className="rounded-xl border border-[#f36a21]/20 bg-[#f36a21]/10 p-3 text-foreground">
                        <div className="mb-1 flex items-center justify-between text-[11px]">
                          <span className="font-bold text-[#f36a21]">
                            AI Reasoning Match (96%)
                          </span>
                          <span className="text-muted-foreground">0.14s latency</span>
                        </div>
                        <p className="font-sans text-xs text-muted-foreground">
                          Attributes parsed: Material=Cotton, Fit=Office Comfort, Price=₹899 (Compliant with budget). Policy check: Passed.
                        </p>
                      </div>

                      <div className="rounded-xl border bg-card p-3 font-sans">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                            K
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-sm">Everyday Cotton Kurta</h4>
                            <p className="text-xs text-muted-foreground">₹899 · 124 in stock</p>
                          </div>
                          <button
                            onClick={() => {
                              setRole('buyer')
                              setViewMode('app')
                            }}
                            className="rounded-lg bg-[#f36a21] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                          >
                            Checkout
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section id="features" className="py-20">
            <div className="mx-auto max-w-7xl px-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Built for the two sides of agentic commerce.
                </h2>
                <p className="mt-3 text-base text-muted-foreground">
                  Empowering sellers to structure their catalog while providing buyers a natural voice-first shopping agent.
                </p>
              </div>

              <div className="mt-16 grid gap-8 md:grid-cols-2">
                {/* Seller Features */}
                <div className="rounded-2xl border bg-card p-8 shadow-sm">
                  <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-[#fff0e6] text-[#f36a21] dark:bg-orange-950/40">
                    <Store size={24} />
                  </div>
                  <h3 className="text-xl font-bold">For Sellers — Workspace & AI Cataloging</h3>
                  <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <Check size={18} className="mt-0.5 shrink-0 text-[#f36a21]" />
                      <span>
                        <strong className="text-foreground">AI Attribute Auto-Normalization:</strong> Automatically converts unstructured product descriptions into structured JSON-LD attributes for AI scrapers and agent discovery.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check size={18} className="mt-0.5 shrink-0 text-[#f36a21]" />
                      <span>
                        <strong className="text-foreground">Catalog Readiness Auditor:</strong> Gives every product a readiness score (0-100%) to maximize AI recommendation placement.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check size={18} className="mt-0.5 shrink-0 text-[#f36a21]" />
                      <span>
                        <strong className="text-foreground">Commerce Policy Engine:</strong> Define return windows, shipping terms, and payment rules that AI buyers validate before checkout.
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Buyer Features */}
                <div className="rounded-2xl border bg-card p-8 shadow-sm">
                  <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-[#fff0e6] text-[#f36a21] dark:bg-orange-950/40">
                    <ShoppingBag size={24} />
                  </div>
                  <h3 className="text-xl font-bold">For Buyers — Multilingual AI Assistant</h3>
                  <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <Check size={18} className="mt-0.5 shrink-0 text-[#f36a21]" />
                      <span>
                        <strong className="text-foreground">Voice Microphone & Speech-to-Text:</strong> Speak naturally in Hindi, Hinglish, or English using browser Web Speech API.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check size={18} className="mt-0.5 shrink-0 text-[#f36a21]" />
                      <span>
                        <strong className="text-foreground">Multi-Turn Chat History:</strong> Revisit past shopping conversations, compare options, and retain context across sessions.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check size={18} className="mt-0.5 shrink-0 text-[#f36a21]" />
                      <span>
                        <strong className="text-foreground">Razorpay One-Click Checkout:</strong> Complete purchases securely with bounded financial verification and instant receipt generation.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-auto border-t bg-card py-8">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
              <Logo />
              <p className="text-xs text-muted-foreground">
                Razorpay Buildathon MVP · AI Growth & Agentic Commerce Track
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <button onClick={() => setDark(!dark)} className="hover:text-foreground cursor-pointer">
                  {dark ? 'Light Mode' : 'Dark Mode'}
                </button>
                <span>·</span>
                <button
                  onClick={() => {
                    setRole('seller')
                    setViewMode('app')
                  }}
                  className="hover:text-foreground font-medium text-[#f36a21] cursor-pointer"
                >
                  Seller Demo
                </button>
                <span>·</span>
                <button
                  onClick={() => {
                    setRole('buyer')
                    setViewMode('app')
                  }}
                  className="hover:text-foreground font-medium text-[#f36a21] cursor-pointer"
                >
                  Buyer Demo
                </button>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. DUAL PROFILE AUTHENTICATION VIEW                        */}
      {/* ========================================================= */}
      {viewMode === 'auth' && (
        <div className="flex min-h-screen flex-col">
          <header className="flex items-center justify-between border-b px-6 py-4">
            <Logo onClick={() => setViewMode('landing')} />
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDark(!dark)}
                className="rounded-xl border p-2 text-muted-foreground hover:bg-muted cursor-pointer"
                aria-label="Toggle theme"
              >
                {dark ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              <button
                onClick={() => setViewMode('landing')}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Back to Home
              </button>
            </div>
          </header>

          <main className="flex flex-1 items-center justify-center p-6">
            <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-xl">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold">
                  {authMode === 'signup' ? 'Create your account' : 'Welcome back'}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Select your profile role to enter the ShopAgent workspace
                </p>
              </div>

              {/* Profile Selector */}
              <div className="mb-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('seller')}
                  className={`flex flex-col items-center rounded-xl border p-4 transition cursor-pointer ${
                    role === 'seller'
                      ? 'border-[#f36a21] bg-[#f36a21]/10 text-[#f36a21]'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  <Store size={22} className="mb-2" />
                  <b className="text-xs font-bold">Seller Profile</b>
                  <span className="text-[10px] text-muted-foreground">Grow AI catalog</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('buyer')}
                  className={`flex flex-col items-center rounded-xl border p-4 transition cursor-pointer ${
                    role === 'buyer'
                      ? 'border-[#f36a21] bg-[#f36a21]/10 text-[#f36a21]'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  <ShoppingBag size={22} className="mb-2" />
                  <b className="text-xs font-bold">Buyer Profile</b>
                  <span className="text-[10px] text-muted-foreground">AI Voice Shopping</span>
                </button>
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setViewMode('app')
                }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1 block text-xs font-medium">Email address</label>
                  <input
                    type="email"
                    required
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder={role === 'seller' ? 'seller@merchant.in' : 'buyer@gmail.com'}
                    className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-[#f36a21]/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Password</label>
                  <input
                    type="password"
                    required
                    defaultValue="demo1234"
                    className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-[#f36a21]/30"
                  />
                </div>

                <Button type="submit" className="w-full py-3">
                  {authMode === 'signup'
                    ? `Continue as ${role === 'seller' ? 'Seller' : 'Buyer'}`
                    : 'Sign in to account'}{' '}
                  <ArrowRight size={15} />
                </Button>
              </form>

              {/* Quick Demo Pre-fill */}
              <div className="mt-6 border-t pt-4 text-center">
                <p className="text-[11px] text-muted-foreground mb-2">Or quick launch demo profile:</p>
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUserEmail('ananya@merchant.in')
                      setRole('seller')
                      setViewMode('app')
                    }}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted cursor-pointer"
                  >
                    Demo Seller
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUserEmail('rahul@buyer.in')
                      setRole('buyer')
                      setViewMode('app')
                    }}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted cursor-pointer"
                  >
                    Demo Buyer
                  </button>
                </div>
              </div>

              {/* Mode Toggle */}
              <p className="mt-6 text-center text-xs text-muted-foreground">
                {authMode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  type="button"
                  className="font-semibold text-[#f36a21] hover:underline cursor-pointer"
                  onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
                >
                  {authMode === 'signup' ? 'Sign in' : 'Create account'}
                </button>
              </p>
            </div>
          </main>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MAIN APPLICATION WORKSPACE (SELLER / BUYER)            */}
      {/* ========================================================= */}
      {viewMode === 'app' && (
        <div className="flex h-screen overflow-hidden bg-background">
          {/* SELLER SIDEBAR */}
          {role === 'seller' && (
            <aside
              className={`fixed inset-y-0 left-0 z-40 flex h-full w-64 shrink-0 flex-col border-r bg-card p-5 transition-transform md:relative md:translate-x-0 ${
                mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
              <div className="mb-8 flex items-center justify-between">
                <Logo onClick={() => setViewMode('landing')} />
                <button
                  className="md:hidden text-muted-foreground cursor-pointer"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Seller Navigation
              </p>
              <nav className="flex flex-col gap-1">
                {[
                  ['Dashboard', LayoutDashboard],
                  ['Products', Package],
                  ['Add product', Plus],
                  ['Agent-ready catalog', Sparkles],
                  ['Commerce policies', ShieldCheck],
                  ['Activity / Audit', Activity]
                ].map(([label, Icon]: any) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setSellerPage(label as SellerPage)
                      setMobileMenuOpen(false)
                    }}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition cursor-pointer ${
                      sellerPage === label
                        ? 'bg-[#f36a21]/10 text-[#f36a21]'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                    {label === 'Agent-ready catalog' && (
                      <span className="ml-auto size-2 rounded-full bg-[#f36a21]" />
                    )}
                  </button>
                ))}
              </nav>

              {/* Agent Readiness Score Widget */}
              <div className="mt-auto rounded-xl border bg-background p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold">
                    <Zap size={14} className="text-[#f36a21]" /> Agent Score
                  </span>
                  <b className="text-xs font-extrabold text-[#f36a21]">91%</b>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-[91%] rounded-full bg-[#f36a21]" />
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground leading-tight">
                  High readiness. 4 products ready for AI discovery.
                </p>
              </div>
            </aside>
          )}

          {/* BUYER SIDEBAR (Chat History) */}
          {role === 'buyer' && (
            <aside
              className={`fixed inset-y-0 left-0 z-40 flex h-full w-72 shrink-0 flex-col border-r bg-card p-4 transition-transform md:relative md:translate-x-0 ${
                mobileBuyerSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
              <div className="mb-4 flex items-center justify-between border-b pb-3">
                <Logo onClick={() => setViewMode('landing')} />
                <button
                  className="md:hidden text-muted-foreground cursor-pointer"
                  onClick={() => setMobileBuyerSidebarOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* New Chat Button */}
              <Button
                onClick={() => {
                  const newId = 'chat-' + Date.now()
                  const newSess: ChatSession = {
                    id: newId,
                    title: 'New Shopping Session',
                    timestamp: 'Just now',
                    messages: []
                  }
                  setChatSessions([newSess, ...chatSessions])
                  setActiveChatId(newId)
                  setMobileBuyerSidebarOpen(false)
                }}
                className="w-full justify-start py-2.5 text-xs"
              >
                <Plus size={15} /> New AI Shopping Query
              </Button>

              {/* Past Chat Sessions */}
              <div className="mt-6 flex-1 overflow-y-auto">
                <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Chat History & Queries
                </p>
                <div className="space-y-1">
                  {chatSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => {
                        setActiveChatId(session.id)
                        setMobileBuyerSidebarOpen(false)
                      }}
                      className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium cursor-pointer transition ${
                        activeChatId === session.id
                          ? 'bg-[#f36a21]/10 text-[#f36a21]'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <History size={14} className="shrink-0" />
                        <span className="truncate">{session.title}</span>
                      </div>
                      {chatSessions.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setChatSessions(chatSessions.filter((s) => s.id !== session.id))
                          }}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition cursor-pointer"
                          aria-label="Delete chat"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Shopping Cart Bar */}
              <div className="mt-auto border-t pt-3">
                <button
                  type="button"
                  onClick={() => {
                    if (productsList.length > 0) handleInitiateRazorpay(productsList[0])
                  }}
                  className="flex w-full items-center justify-between rounded-xl border bg-background p-3 text-xs hover:bg-muted transition cursor-pointer"
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <ShoppingCart size={15} className="text-[#f36a21]" /> View Cart / Checkout
                  </span>
                  <span className="rounded-full bg-[#f36a21] px-2 py-0.5 text-[10px] font-bold text-white">
                    {orders.length > 0 ? orders.length + ' Orders' : 'Test Mode'}
                  </span>
                </button>
              </div>
            </aside>
          )}

          {/* MAIN CONTENT AREA */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Topbar Navigation Header */}
            <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 md:px-8">
              <div className="flex items-center gap-3">
                <button
                  className="md:hidden text-muted-foreground cursor-pointer"
                  onClick={() => {
                    if (role === 'seller') setMobileMenuOpen(true)
                    else setMobileBuyerSidebarOpen(true)
                  }}
                >
                  <Menu size={20} />
                </button>
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    {role === 'seller' ? 'Merchant Dashboard' : 'AI Shopping Assistant'}
                  </span>
                  <h2 className="text-sm font-bold tracking-tight">
                    {role === 'seller' ? `ShopAgent Workspace — ${sellerPage}` : activeChat.title}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* ROLE SWITCHER PILL */}
                <div className="flex items-center rounded-xl border bg-muted p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setRole('seller')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition cursor-pointer ${
                      role === 'seller'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Store size={13} /> Seller
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('buyer')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition cursor-pointer ${
                      role === 'buyer'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <ShoppingBag size={13} /> Buyer AI
                  </button>
                </div>

                {/* Theme Toggle Button */}
                <button
                  type="button"
                  onClick={() => setDark(!dark)}
                  className="rounded-xl border p-2 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                  aria-label="Toggle light and dark mode"
                >
                  {dark ? <Sun size={17} /> : <Moon size={17} />}
                </button>

                {/* Sign Out / Exit to Landing */}
                <button
                  type="button"
                  onClick={() => setViewMode('landing')}
                  className="flex size-9 items-center justify-center rounded-full bg-[#f36a21] text-xs font-bold text-white shadow-sm cursor-pointer"
                  title="Sign out / Exit"
                >
                  AS
                </button>
              </div>
            </header>

            {/* PAGE CONTENT CONTAINER */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
              {/* ================= SELLER PAGES ================= */}
              {role === 'seller' && (
                <div>
                  {/* DASHBOARD PAGE */}
                  {sellerPage === 'Dashboard' && (
                    <div className="space-y-6">
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Thursday, 3 September 2026</p>
                          <h1 className="text-2xl font-bold tracking-tight">Store performance & AI metrics</h1>
                        </div>
                        <Button onClick={() => setSellerPage('Add product')}>
                          <Plus size={16} /> Add new product
                        </Button>
                      </div>

                      {/* KPI Cards */}
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl border bg-card p-5 shadow-sm">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Gross Sales</span>
                            <IndianRupee size={16} />
                          </div>
                          <b className="mt-3 block text-3xl font-extrabold tracking-tight">₹2,84,920</b>
                          <p className="mt-1 text-xs text-emerald-600 font-semibold">↑ 18.4% vs last month</p>
                        </div>
                        <div className="rounded-2xl border bg-card p-5 shadow-sm">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Total Orders</span>
                            <Package size={16} />
                          </div>
                          <b className="mt-3 block text-3xl font-extrabold tracking-tight">342</b>
                          <p className="mt-1 text-xs text-emerald-600 font-semibold">↑ 12.8% vs last month</p>
                        </div>
                        <div className="rounded-2xl border bg-card p-5 shadow-sm">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Agent Referred Buyers</span>
                            <Users size={16} />
                          </div>
                          <b className="mt-3 block text-3xl font-extrabold tracking-tight">68</b>
                          <p className="mt-1 text-xs text-emerald-600 font-semibold">↑ 24.1% via AI discovery</p>
                        </div>
                        <div className="rounded-2xl border bg-card p-5 shadow-sm">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Catalog Readiness</span>
                            <Zap size={16} className="text-[#f36a21]" />
                          </div>
                          <b className="mt-3 block text-3xl font-extrabold tracking-tight text-[#f36a21]">91%</b>
                          <p className="mt-1 text-xs text-muted-foreground">4 products normalized</p>
                        </div>
                      </div>

                      {/* Sales Chart & Attention Box */}
                      <div className="grid gap-6 lg:grid-cols-12">
                        <div className="rounded-2xl border bg-card p-6 lg:col-span-8">
                          <div className="mb-6 flex items-center justify-between">
                            <div>
                              <h3 className="text-base font-bold">Sales & Agent Referrals Overview</h3>
                              <p className="text-xs text-muted-foreground">Gross revenue trend over past 30 days</p>
                            </div>
                            <span className="rounded-lg border bg-muted px-3 py-1 text-xs font-semibold">
                              Last 30 Days
                            </span>
                          </div>
                          {/* SVG Styled Bar Chart */}
                          <div className="flex h-48 items-end gap-2 border-b pb-2 pt-4 px-2">
                            {[35, 42, 50, 48, 65, 58, 72, 80, 75, 90, 85, 100, 92, 110, 98, 120].map((h, i) => (
                              <div
                                key={i}
                                className="group relative flex-1 rounded-t-md bg-[#f36a21]/20 hover:bg-[#f36a21] transition-all"
                                style={{ height: `${(h / 120) * 100}%` }}
                              >
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-foreground text-background px-2 py-1 text-[10px] rounded font-bold transition whitespace-nowrap z-10">
                                  ₹{h * 2500}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 flex justify-between text-[10px] text-muted-foreground font-semibold">
                            <span>Aug 5</span>
                            <span>Aug 19</span>
                            <span>Sep 3 (Today)</span>
                          </div>
                        </div>

                        {/* Action Box */}
                        <div className="rounded-2xl border bg-card p-6 lg:col-span-4 flex flex-col justify-between">
                          <div>
                            <h3 className="text-base font-bold">Needs Attention</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Recommendations to boost AI sales</p>
                            <div className="mt-4 space-y-3">
                              <div className="rounded-xl border border-[#f36a21]/20 bg-[#f36a21]/10 p-3 text-xs">
                                <b className="font-bold text-[#f36a21]">
                                  12 products missing attributes
                                </b>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  Add material & sizing tags for 15% higher agent matching.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setSellerPage('Agent-ready catalog')}
                                  className="mt-2 font-bold text-[#f36a21] hover:underline flex items-center gap-1 text-xs cursor-pointer"
                                >
                                  Fix catalog <ArrowRight size={12} />
                                </button>
                              </div>
                              <div className="rounded-xl border bg-muted/60 p-3 text-xs">
                                <b className="font-bold">1 product out of stock</b>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  Handwoven Jute Tote Bag (SKU: HOM-7832).
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="mt-6 border-t pt-4">
                            <span className="text-[11px] font-semibold text-muted-foreground block mb-2">
                              Razorpay Audit Status:
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              <ShieldCheck size={14} /> Razorpay Test Mode Active
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Recent Orders */}
                      <div className="rounded-2xl border bg-card p-6">
                        <h3 className="text-base font-bold mb-4">Recent Verified Orders</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="border-b bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              <tr>
                                <th className="px-4 py-3">Order ID</th>
                                <th className="px-4 py-3">Product</th>
                                <th className="px-4 py-3">Buyer</th>
                                <th className="px-4 py-3">Razorpay ID</th>
                                <th className="px-4 py-3">Amount</th>
                                <th className="px-4 py-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {orders.length > 0 ? (
                                orders.map((ord) => (
                                  <tr key={ord.id}>
                                    <td className="px-4 py-3 font-mono font-bold">{ord.id}</td>
                                    <td className="px-4 py-3 font-semibold">{ord.productName}</td>
                                    <td className="px-4 py-3">{ord.buyerName}</td>
                                    <td className="px-4 py-3 font-mono text-muted-foreground">
                                      {ord.razorpayPaymentId}
                                    </td>
                                    <td className="px-4 py-3 font-bold">₹{ord.amount}</td>
                                    <td className="px-4 py-3">
                                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-bold text-emerald-600 dark:text-emerald-400">
                                        {ord.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td className="px-4 py-3 font-mono font-bold">ORD-982140</td>
                                  <td className="px-4 py-3 font-semibold">Everyday Cotton Kurta</td>
                                  <td className="px-4 py-3">Rahul Mehta</td>
                                  <td className="px-4 py-3 font-mono text-muted-foreground">
                                    pay_Px89234190
                                  </td>
                                  <td className="px-4 py-3 font-bold">₹899</td>
                                  <td className="px-4 py-3">
                                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-bold text-emerald-600 dark:text-emerald-400">
                                      Completed
                                    </span>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PRODUCTS PAGE */}
                  {sellerPage === 'Products' && (
                    <div className="space-y-6">
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                          <h1 className="text-2xl font-bold tracking-tight">Products Catalog</h1>
                          <p className="text-xs text-muted-foreground">
                            Manage inventory and inspect AI agent discoverability readiness
                          </p>
                        </div>
                        <Button onClick={() => setSellerPage('Add product')}>
                          <Plus size={16} /> Add Product
                        </Button>
                      </div>

                      {/* Products Table */}
                      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <tr>
                              <th className="px-4 py-3.5">Product Name</th>
                              <th className="px-4 py-3.5">Category</th>
                              <th className="px-4 py-3.5">Price</th>
                              <th className="px-4 py-3.5">Stock</th>
                              <th className="px-4 py-3.5">Agent Readiness</th>
                              <th className="px-4 py-3.5">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {productsList.map((prod) => (
                              <tr key={prod.id} className="hover:bg-muted/40 transition">
                                <td className="px-4 py-4">
                                  <b className="block text-sm font-semibold">{prod.name}</b>
                                  <span className="text-[10px] font-mono text-muted-foreground">
                                    SKU: {prod.sku}
                                  </span>
                                </td>
                                <td className="px-4 py-4 font-medium">{prod.category}</td>
                                <td className="px-4 py-4 font-bold">₹{prod.price}</td>
                                <td className="px-4 py-4">{prod.stock} units</td>
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                                      <div
                                        className="h-full bg-[#f36a21]"
                                        style={{ width: `${prod.readiness}%` }}
                                      />
                                    </div>
                                    <span className="font-bold text-[#f36a21]">{prod.readiness}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                      prod.status === 'Live'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-amber-500/10 text-amber-600'
                                    }`}
                                  >
                                    {prod.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ADD PRODUCT PAGE */}
                  {sellerPage === 'Add product' && (
                    <div className="max-w-3xl space-y-6">
                      <div>
                        <h1 className="text-2xl font-bold tracking-tight">Add New Product</h1>
                        <p className="text-xs text-muted-foreground">
                          Create listing once — ShopAgent automatically structures it for AI buyers
                        </p>
                      </div>

                      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
                        <div>
                          <label className="mb-1 block text-xs font-semibold">Product Name</label>
                          <input
                            type="text"
                            value={newProdName}
                            onChange={(e) => setNewProdName(e.target.value)}
                            placeholder="e.g. Handmade Terracotta Diya Set"
                            className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-[#f36a21]/30"
                          />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-xs font-semibold">Category</label>
                            <input
                              type="text"
                              value={newProdCat}
                              onChange={(e) => setNewProdCat(e.target.value)}
                              placeholder="Apparel, Beauty, Home..."
                              className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-[#f36a21]/30"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold">Price (₹ INR)</label>
                            <input
                              type="number"
                              value={newProdPrice}
                              onChange={(e) => setNewProdPrice(e.target.value)}
                              placeholder="499"
                              className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-[#f36a21]/30"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold">Stock Quantity</label>
                            <input
                              type="number"
                              value={newProdStock}
                              onChange={(e) => setNewProdStock(e.target.value)}
                              placeholder="50"
                              className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-[#f36a21]/30"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold">Description</label>
                          <textarea
                            value={newProdDesc}
                            onChange={(e) => setNewProdDesc(e.target.value)}
                            placeholder="Specify materials, care instructions, fit, origin..."
                            className="min-h-24 w-full rounded-xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-[#f36a21]/30"
                          />
                        </div>

                        {/* AI Attribute Normalization Action */}
                        <div className="rounded-xl border border-dashed border-[#f36a21]/30 bg-[#f36a21]/10 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <b className="text-xs font-bold text-[#f36a21]">
                                AI Attribute Normalizer
                              </b>
                              <p className="text-[11px] text-muted-foreground">
                                Automatically extract schema attributes for AI agent discovery
                              </p>
                            </div>
                            <Button
                              outline
                              onClick={handleGenerateAiTags}
                              disabled={aiGeneratingTags}
                              className="text-xs py-1.5"
                            >
                              <Wand2 size={14} className="text-[#f36a21]" />
                              {aiGeneratingTags ? 'Scanning...' : 'Auto-Generate Tags'}
                            </Button>
                          </div>

                          {generatedTags && (
                            <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs font-mono border-t pt-3">
                              {Object.entries(generatedTags).map(([k, v]) => (
                                <div key={k} className="rounded-lg bg-card p-2 border">
                                  <span className="text-muted-foreground block text-[10px]">{k}</span>
                                  <b className="text-foreground">{v}</b>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                          <Button outline onClick={() => setSellerPage('Products')}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddProduct}>
                            <Check size={16} /> Save & Publish Product
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AGENT-READY CATALOG PAGE */}
                  {sellerPage === 'Agent-ready catalog' && (
                    <div className="space-y-6">
                      <div>
                        <h1 className="text-2xl font-bold tracking-tight">Agent-Ready Catalog Auditor</h1>
                        <p className="text-xs text-muted-foreground">
                          Inspect how search agents and LLM crawlers parse your product metadata
                        </p>
                      </div>

                      <div className="grid gap-6 lg:grid-cols-2">
                        {/* Audit Score Card */}
                        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
                          <h3 className="text-base font-bold">Store Readiness Breakdown</h3>
                          <div className="flex items-center justify-between rounded-xl bg-muted/60 p-4">
                            <div>
                              <span className="text-xs text-muted-foreground block">Overall Readiness Score</span>
                              <b className="text-3xl font-extrabold text-[#f36a21]">91%</b>
                            </div>
                            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              High AI Visibility
                            </span>
                          </div>

                          <div className="space-y-3 text-xs">
                            <div className="flex justify-between border-b pb-2">
                              <span>Schema JSON-LD Validation</span>
                              <b className="text-emerald-600">Passed (100%)</b>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                              <span>Razorpay Policy Terms Included</span>
                              <b className="text-emerald-600">Passed (100%)</b>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                              <span>Material & Fit Attributes</span>
                              <b className="text-amber-600">88% (2 missing)</b>
                            </div>
                          </div>
                        </div>

                        {/* Live JSON-LD Schema Inspector */}
                        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3 font-mono text-xs">
                          <div className="flex items-center justify-between border-b pb-3">
                            <span className="font-bold text-foreground">Agentic Schema Output</span>
                            <span className="text-[10px] text-muted-foreground">JSON-LD / Agent API</span>
                          </div>
                          <pre className="overflow-x-auto rounded-xl bg-muted p-4 text-[11px] text-muted-foreground leading-relaxed">
{`{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "Everyday Cotton Kurta",
  "sku": "KUR-2048",
  "offers": {
    "@type": "Offer",
    "priceCurrency": "INR",
    "price": "899",
    "availability": "InStock",
    "sellerPolicy": "7-day Hassle Free Returns",
    "paymentProvider": "Razorpay"
  }
}`}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* COMMERCE POLICIES PAGE */}
                  {sellerPage === 'Commerce policies' && (
                    <div className="max-w-3xl space-y-6">
                      <div>
                        <h1 className="text-2xl font-bold tracking-tight">Commerce Policies</h1>
                        <p className="text-xs text-muted-foreground">
                          Define return rules, shipping criteria, and Razorpay trust parameters
                        </p>
                      </div>

                      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
                        <div>
                          <h3 className="text-sm font-bold mb-3">Return & Exchange Rules</h3>
                          <div className="grid gap-3 sm:grid-cols-2 text-xs">
                            <div className="rounded-xl border p-4">
                              <b className="block font-bold">Return Window</b>
                              <span className="text-muted-foreground">7 Days after delivery</span>
                            </div>
                            <div className="rounded-xl border p-4">
                              <b className="block font-bold">Return Shipping</b>
                              <span className="text-muted-foreground">Free pickup on damaged items</span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <h3 className="text-sm font-bold mb-3">Razorpay Payment Integration</h3>
                          <div className="rounded-xl bg-emerald-500/10 p-4 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ShieldCheck size={18} />
                              <span>Razorpay Test Mode Active & Verified</span>
                            </div>
                            <span className="font-mono text-[10px] font-bold">rzp_test_98214</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ACTIVITY / AUDIT PAGE */}
                  {sellerPage === 'Activity / Audit' && (
                    <div className="space-y-6">
                      <div>
                        <h1 className="text-2xl font-bold tracking-tight">Activity & Audit Logs</h1>
                        <p className="text-xs text-muted-foreground">
                          Real-time audit trail of AI agent referrals, policy checks, and Razorpay transactions
                        </p>
                      </div>

                      <div className="rounded-2xl border bg-card p-6 shadow-sm">
                        <div className="space-y-3">
                          {auditLogs.map((log) => (
                            <div
                              key={log.id}
                              className="flex items-start justify-between rounded-xl border p-4 text-xs"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-foreground">{log.type}</span>
                                  <span className="text-[10px] text-muted-foreground">{log.time}</span>
                                </div>
                                <p className="mt-1 text-muted-foreground">{log.detail}</p>
                              </div>
                              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                {log.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ================= BUYER PAGE ================= */}
              {role === 'buyer' && (
                <div className="mx-auto flex h-full max-w-4xl flex-col">
                  {/* Chat Messages Timeline */}
                  <div className="flex-1 space-y-4 pb-24 overflow-y-auto">
                    {activeChat.messages.length === 0 && (
                      <div className="py-12 text-center space-y-4">
                        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#f36a21]/10 text-[#f36a21]">
                          <Sparkles size={28} />
                        </div>
                        <h2 className="text-2xl font-bold">What are you looking for today?</h2>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto">
                          Ask naturally in Hindi, Hinglish, or English. I&apos;ll inspect product details, check policies, and bring you direct seller recommendations.
                        </p>
                        {/* Sample Prompt Chips */}
                        <div className="flex flex-wrap justify-center gap-2 pt-2">
                          {[
                            'office ke liye comfortable cotton kurta under ₹1000',
                            'neem face wash for oily skin under ₹500',
                            'Assam masala chai blend 250g'
                          ].map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => handleSendBuyerQuery(chip)}
                              className="rounded-full border bg-card px-3.5 py-1.5 text-xs text-muted-foreground hover:border-[#f36a21] hover:text-[#f36a21] transition cursor-pointer"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeChat.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-2xl rounded-2xl p-4 text-sm ${
                            msg.sender === 'user'
                              ? 'bg-[#f36a21] text-white'
                              : 'border bg-card shadow-sm text-foreground'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <span className="text-[10px] opacity-75 font-semibold">
                              {msg.sender === 'user' ? 'You' : 'ShopAgent AI'}
                            </span>
                            {msg.sender === 'ai' && (
                              <button
                                type="button"
                                onClick={() => speakText(msg.text)}
                                className="text-muted-foreground hover:text-foreground cursor-pointer"
                                title="Listen to response"
                              >
                                {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                              </button>
                            )}
                          </div>
                          <p className="leading-relaxed">{msg.text}</p>

                          {/* AI Reasoning Pill */}
                          {msg.reasoning && (
                            <div className="mt-3 rounded-xl border bg-muted/50 p-2.5 text-xs text-muted-foreground">
                              <span className="font-bold text-[#f36a21] block text-[10px]">
                                AI Reasoning Match:
                              </span>
                              {msg.reasoning}
                            </div>
                          )}

                          {/* Matched Product Cards */}
                          {msg.matchedProducts && (
                            <div className="mt-4 space-y-3">
                              {msg.matchedProducts.map((prod) => (
                                <div
                                  key={prod.id}
                                  className="rounded-xl border bg-background p-3 text-foreground"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <b className="text-sm">{prod.name}</b>
                                      <p className="text-xs text-muted-foreground">
                                        ₹{prod.price} · {prod.stock} in stock · {prod.readiness}% match
                                      </p>
                                    </div>
                                    <Button onClick={() => handleInitiateRazorpay(prod)}>
                                      Buy via Razorpay
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="mt-1 text-[10px] text-muted-foreground px-1">
                          {msg.timestamp}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Fixed Floating Input Bar */}
                  <div className="sticky bottom-4 z-20 rounded-2xl border bg-card p-3 shadow-xl">
                    {/* Listening Status Banner */}
                    {isListening && (
                      <div className="mb-2 flex items-center justify-between rounded-xl bg-orange-500/10 px-3 py-1.5 text-xs text-[#f36a21]">
                        <span className="flex items-center gap-2 font-semibold animate-pulse">
                          <Mic size={14} /> Listening... Speak naturally in Hindi or English
                        </span>
                        <button type="button" onClick={toggleListening} className="text-xs font-bold underline cursor-pointer">
                          Stop
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <textarea
                        value={buyerInput}
                        onChange={(e) => setBuyerInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendBuyerQuery()
                          }
                        }}
                        placeholder="Ask naturally: office ke liye cotton kurta under ₹1000..."
                        className="min-h-11 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none"
                      />

                      {/* Microphone Voice Button */}
                      <button
                        type="button"
                        onClick={toggleListening}
                        className={`flex size-10 items-center justify-center rounded-xl transition cursor-pointer ${
                          isListening
                            ? 'bg-red-500 text-white animate-mic-pulse'
                            : 'border bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                        }`}
                        title="Voice search microphone"
                      >
                        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                      </button>

                      {/* Send Button */}
                      <button
                        type="button"
                        onClick={() => handleSendBuyerQuery()}
                        className="flex size-10 items-center justify-center rounded-xl bg-[#f36a21] text-white shadow-sm hover:bg-[#d95b17] cursor-pointer"
                        aria-label="Send message"
                      >
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. RAZORPAY CHECKOUT TEST MODE MODAL                     */}
      {/* ========================================================= */}
      {checkoutModalOpen && checkoutProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-[#f36a21]" />
                <span className="font-bold text-sm">Razorpay Checkout (Test Mode)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCheckoutModalOpen(false)
                  setPaymentSuccessOrder(null)
                }}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {!paymentSuccessOrder ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-muted p-4 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Item:</span>
                    <b className="font-semibold">{checkoutProduct.name}</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Merchant:</span>
                    <span>Ananya Crafts & Wear</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-sm font-bold">
                    <span>Total Amount:</span>
                    <span className="text-[#f36a21]">₹{checkoutProduct.price}</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <label className="block font-semibold">Delivery Address</label>
                  <input
                    type="text"
                    defaultValue="Flat 402, Green Park Apartments, Bengaluru"
                    className="h-10 w-full rounded-xl border bg-background px-3 text-xs outline-none"
                  />
                </div>

                <Button onClick={handleCompletePayment} className="w-full py-3">
                  Pay ₹{checkoutProduct.price} via Razorpay Test Mode
                </Button>
              </div>
            ) : (
              <div className="py-4 text-center space-y-3">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <Check size={24} />
                </div>
                <h3 className="text-lg font-bold text-emerald-600">Payment Successful!</h3>
                <p className="text-xs text-muted-foreground">
                  Order <strong className="text-foreground">{paymentSuccessOrder.id}</strong> confirmed.
                </p>
                <div className="rounded-xl border bg-muted p-3 text-[11px] font-mono text-left space-y-1">
                  <div>Payment ID: {paymentSuccessOrder.razorpayPaymentId}</div>
                  <div>Status: Verified via Razorpay API</div>
                </div>
                <Button
                  onClick={() => {
                    setCheckoutModalOpen(false)
                    setPaymentSuccessOrder(null)
                  }}
                  className="w-full"
                >
                  Done
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
