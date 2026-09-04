export interface Profile {
  id: string;
  role: 'seller' | 'buyer';
  name: string;
  created_at: string;
}

export interface Product {
  id: string;
  seller_id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  stock: number;
  image_url: string;
  features: string[];
  variants?: Array<{ name: string; options: string[] }>;
  delivery_info?: { est_days: number; free_shipping: boolean };
  return_policy?: { returnable: boolean; days: number };
  created_at: string;
  updated_at: string;
  is_ai_ready?: boolean;
}

export interface AgentProduct {
  id: string;
  product_id: string;
  seller_id: string;
  normalized_name: string;
  normalized_category: string;
  attributes: Record<string, any>;
  use_cases: string[];
  search_terms: string[];
  structured_description: string;
  agent_metadata: {
    wireless?: boolean;
    anc?: boolean;
    battery_hours?: number;
    gaming_oriented?: boolean;
    warranty_months?: number;
    price_source: 'seller_database';
    inventory_source: 'seller_database';
  };
  created_at: string;
  updated_at: string;
}

export interface CommercePolicy {
  id: string;
  seller_id: string;
  max_discount: number; // percentage, e.g. 15 = 15%
  max_quantity_per_order: number;
  require_confirmation: boolean;
  max_auto_order_value: number;
  allow_ai_recommendations: boolean;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  price_at_addition: number;
  product?: Product;
}

export interface Cart {
  id: string;
  buyer_id: string;
  status: 'active' | 'checkout' | 'completed' | 'abandoned';
  items: CartItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product_name?: string;
}

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  razorpay_order_id: string;
  status: 'created' | 'attempted' | 'paid' | 'failed' | 'cancelled';
  total_amount: number;
  currency: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature?: string;
  status: 'initiated' | 'captured' | 'failed';
  amount: number;
  error_code?: string;
  error_description?: string;
  created_at: string;
}

export interface AgentAction {
  id: string;
  conversation_id?: string;
  buyer_id?: string;
  action_type:
    | 'USER_INTENT'
    | 'SEARCH_PRODUCTS'
    | 'RECOMMENDATION'
    | 'INVENTORY_CHECK'
    | 'PRICE_VALIDATION'
    | 'CART_UPDATE'
    | 'USER_CONFIRMATION'
    | 'POLICY_CHECK'
    | 'RAZORPAY_ORDER_CREATED'
    | 'PAYMENT_INITIATED'
    | 'PAYMENT_FAILED'
    | 'FAILURE_RECOVERY'
    | 'PAYMENT_RETRY'
    | 'PAYMENT_SUCCESS'
    | 'ORDER_CONFIRMED';
  input?: any;
  output?: any;
  status: 'SUCCESS' | 'POLICY_REJECTED' | 'FAILED' | 'RECOVERED';
  reason?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    intent?: any;
    recommended_products?: Product[];
    action_type?: string;
    requires_confirmation?: boolean;
    pending_checkout?: boolean;
    failure_type?: 'OUT_OF_STOCK' | 'PRICE_CHANGED' | 'PAYMENT_FAILED';
    razorpay_order_id?: string;
    amount?: number;
  };
  created_at: string;
}
