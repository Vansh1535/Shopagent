import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Product,
  AgentProduct,
  CommercePolicy,
  Cart,
  Order,
  Payment,
  AgentAction,
  ChatMessage,
} from './types';
import {
  INITIAL_PRODUCTS,
  INITIAL_AGENT_PRODUCTS,
  DEMO_COMMERCE_POLICY,
  DEMO_SELLER,
  DEMO_BUYER,
} from './seed';

// Supabase client instance (if configured)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured =
  supabaseUrl.startsWith('https://') && supabaseKey.length > 20;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// In-Memory Reactive Store (Fallback & Instant Zero-Config Execution)
class LocalDatabaseStore {
  private products: Product[] = [...INITIAL_PRODUCTS];
  private agentProducts: AgentProduct[] = [...INITIAL_AGENT_PRODUCTS];
  private commercePolicy: CommercePolicy = { ...DEMO_COMMERCE_POLICY };
  private cart: Cart = {
    id: 'cart-demo-001',
    buyer_id: DEMO_BUYER.id,
    status: 'active',
    items: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  private orders: Order[] = [];
  private payments: Payment[] = [];
  private actions: AgentAction[] = [];
  private messages: ChatMessage[] = [];

  // Products
  async getProducts(): Promise<Product[]> {
    return [...this.products];
  }

  async getProductById(id: string): Promise<Product | null> {
    return this.products.find((p) => p.id === id) || null;
  }

  async addProduct(product: Product): Promise<Product> {
    this.products.unshift(product);
    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    const idx = this.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.products[idx] = { ...this.products[idx], ...updates, updated_at: new Date().toISOString() };
    return this.products[idx];
  }

  // Agent Products
  async getAgentProducts(): Promise<AgentProduct[]> {
    return [...this.agentProducts];
  }

  async saveAgentProduct(agentProd: AgentProduct): Promise<AgentProduct> {
    const idx = this.agentProducts.findIndex((ap) => ap.product_id === agentProd.product_id);
    if (idx >= 0) {
      this.agentProducts[idx] = agentProd;
    } else {
      this.agentProducts.push(agentProd);
    }
    // Mark parent product as AI ready
    await this.updateProduct(agentProd.product_id, { is_ai_ready: true });
    return agentProd;
  }

  // Commerce Policy
  async getCommercePolicy(sellerId: string): Promise<CommercePolicy> {
    return this.commercePolicy;
  }

  async updateCommercePolicy(policy: Partial<CommercePolicy>): Promise<CommercePolicy> {
    this.commercePolicy = {
      ...this.commercePolicy,
      ...policy,
      updated_at: new Date().toISOString(),
    };
    return this.commercePolicy;
  }

  // Cart
  async getCart(buyerId: string): Promise<Cart> {
    return this.cart;
  }

  async updateCartItems(
    buyerId: string,
    items: Array<{ product: Product; quantity: number }>
  ): Promise<Cart> {
    this.cart.items = items.map((item, idx) => ({
      id: `cart-item-${idx}-${Date.now()}`,
      cart_id: this.cart.id,
      product_id: item.product.id,
      quantity: item.quantity,
      price_at_addition: item.product.price,
      product: item.product,
    }));
    this.cart.updated_at = new Date().toISOString();
    return this.cart;
  }

  async clearCart(buyerId: string): Promise<void> {
    this.cart.items = [];
    this.cart.updated_at = new Date().toISOString();
  }

  // Orders & Payments
  async getOrders(): Promise<Order[]> {
    return [...this.orders];
  }

  async createOrder(order: Order): Promise<Order> {
    this.orders.unshift(order);
    return order;
  }

  async updateOrderStatus(
    orderId: string,
    status: Order['status'],
    razorpayOrderId?: string
  ): Promise<Order | null> {
    const order = this.orders.find(
      (o) => o.id === orderId || (razorpayOrderId && o.razorpay_order_id === razorpayOrderId)
    );
    if (!order) return null;
    order.status = status;
    order.updated_at = new Date().toISOString();

    // If paid, reduce inventory stock deterministically
    if (status === 'paid') {
      for (const item of order.items) {
        const prod = this.products.find((p) => p.id === item.product_id);
        if (prod && prod.stock >= item.quantity) {
          prod.stock -= item.quantity;
        }
      }
    }
    return order;
  }

  async recordPayment(payment: Payment): Promise<Payment> {
    this.payments.unshift(payment);
    return payment;
  }

  // Agent Actions Audit Trail
  async getAgentActions(): Promise<AgentAction[]> {
    return [...this.actions];
  }

  async logAgentAction(action: Omit<AgentAction, 'id' | 'created_at'>): Promise<AgentAction> {
    const newAction: AgentAction = {
      ...action,
      id: `action-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    this.actions.unshift(newAction);
    return newAction;
  }

  // Messages
  async getMessages(): Promise<ChatMessage[]> {
    return [...this.messages];
  }

  async addMessage(msg: Omit<ChatMessage, 'id' | 'created_at'>): Promise<ChatMessage> {
    const newMsg: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    this.messages.push(newMsg);
    return newMsg;
  }

  async clearMessages(): Promise<void> {
    this.messages = [];
  }

  // Synthetic Data Engine (Zero Hardcoded Flow)
  async seedSyntheticProducts(count: number = 5): Promise<Product[]> {
    const { generateSyntheticProducts, createAgentProductFromProduct } = await import('./synthetic');
    const newProds = generateSyntheticProducts(count);
    for (const prod of newProds) {
      this.products.unshift(prod);
      const agentProd = createAgentProductFromProduct(prod);
      this.agentProducts.unshift(agentProd);
    }
    return newProds;
  }

  async seedSyntheticOrders(count: number = 3): Promise<Order[]> {
    const { generateSyntheticOrders, generateSyntheticAuditActions } = await import('./synthetic');
    const newOrders = generateSyntheticOrders(this.products, count);
    for (const ord of newOrders) {
      this.orders.unshift(ord);
    }
    const newActions = generateSyntheticAuditActions(count * 2);
    for (const act of newActions) {
      this.actions.unshift(act);
    }
    return newOrders;
  }

  async clearDatabase(): Promise<void> {
    this.products = [];
    this.agentProducts = [];
    this.orders = [];
    this.payments = [];
    this.actions = [];
    this.messages = [];
  }
}

// Global Singleton Instance
export const db = new LocalDatabaseStore();

