-- ShopAgent Supabase Database Schema

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    role TEXT CHECK (role IN ('seller', 'buyer')) NOT NULL DEFAULT 'buyer',
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    price NUMERIC NOT NULL CHECK (price >= 0),
    currency TEXT DEFAULT 'INR',
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    variants JSONB DEFAULT '[]'::jsonb,
    delivery_info JSONB DEFAULT '{}'::jsonb,
    return_policy JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Agent Products Table (Normalized Agent-Readable Catalog)
CREATE TABLE IF NOT EXISTS public.agent_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE UNIQUE,
    seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    normalized_name TEXT NOT NULL,
    normalized_category TEXT NOT NULL,
    attributes JSONB DEFAULT '{}'::jsonb,
    use_cases JSONB DEFAULT '[]'::jsonb,
    search_terms JSONB DEFAULT '[]'::jsonb,
    structured_description TEXT,
    agent_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Commerce Policies Table (Merchant Governance & Financial Gates)
CREATE TABLE IF NOT EXISTS public.commerce_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    max_discount NUMERIC DEFAULT 15.0 CHECK (max_discount >= 0 AND max_discount <= 100),
    max_quantity_per_order INTEGER DEFAULT 5 CHECK (max_quantity_per_order > 0),
    require_confirmation BOOLEAN DEFAULT TRUE,
    max_auto_order_value NUMERIC DEFAULT 10000.0,
    allow_ai_recommendations BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Carts Table
CREATE TABLE IF NOT EXISTS public.carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'checkout', 'completed', 'abandoned')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Cart Items Table
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID REFERENCES public.carts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_addition NUMERIC NOT NULL CHECK (price_at_addition >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    razorpay_order_id TEXT UNIQUE,
    status TEXT DEFAULT 'created' CHECK (status IN ('created', 'attempted', 'paid', 'failed', 'cancelled')),
    total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
    currency TEXT DEFAULT 'INR',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_order_id TEXT NOT NULL,
    razorpay_signature TEXT,
    status TEXT NOT NULL CHECK (status IN ('initiated', 'captured', 'failed')),
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    error_code TEXT,
    error_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Agent Actions Table (Money Audit Trail & Explainability)
CREATE TABLE IF NOT EXISTS public.agent_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    input JSONB DEFAULT '{}'::jsonb,
    output JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'POLICY_REJECTED', 'FAILED', 'RECOVERED')),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commerce_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;

-- Drop restrictive policies if existing
DROP POLICY IF EXISTS "Public read products" ON public.products;
DROP POLICY IF EXISTS "Public read agent_products" ON public.agent_products;

-- Create Permissive RLS Policies for Anon & Service Role (E-Commerce Agent App Access)
CREATE POLICY "Allow all access on profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on agent_products" ON public.agent_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on commerce_policies" ON public.commerce_policies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on carts" ON public.carts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on cart_items" ON public.cart_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on conversations" ON public.conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on agent_actions" ON public.agent_actions FOR ALL USING (true) WITH CHECK (true);

-- 13. Initial Seed Data Insertion for Supabase Database
INSERT INTO public.profiles (id, role, name) VALUES
('11111111-1111-1111-1111-111111111111', 'seller', 'Bharat Tech Merchants'),
('22222222-2222-2222-2222-222222222222', 'buyer', 'Rajesh Kumar')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.commerce_policies (seller_id, max_discount, max_quantity_per_order, require_confirmation, max_auto_order_value, allow_ai_recommendations) VALUES
('11111111-1111-1111-1111-111111111111', 15.0, 10, true, 10000.0, true)
ON CONFLICT (seller_id) DO NOTHING;

INSERT INTO public.products (id, seller_id, name, description, category, price, stock, image_url, features) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-1111-1111-1111-111111111111', 'JBL Tune 770NC Wireless ANC Headphones', 'Adaptive Noise Cancelling with Smart Ambient, 70H battery life, Speed Charge, Multi-Point Connection', 'Headphones', 5999, 15, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=60', '["Adaptive Noise Cancelling", "70 Hours Battery", "Bluetooth 5.3", "Fast Charging"]'::jsonb),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', '11111111-1111-1111-1111-111111111111', 'Logitech G304 LIGHTSPEED Wireless Gaming Mouse', 'HERO Sensor 12,000 DPI, 250h battery life, 99g ultra-lightweight, 6 programmable buttons', 'Gaming', 2795, 25, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=60', '["12,000 DPI HERO Sensor", "250h Battery", "99g Lightweight", "6 Programmable Buttons"]'::jsonb),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', '11111111-1111-1111-1111-111111111111', 'Keychron K2 V2 Wireless Mechanical Keyboard', '75% Layout, Tactile Gateron Brown Switches, RGB Backlit, Mac & Windows compatible', 'Keyboards', 6999, 8, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=60', '["Wireless & Wired", "Gateron Brown Switches", "RGB Backlight", "4000mAh Battery"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

