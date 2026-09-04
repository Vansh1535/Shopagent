import { Product, AgentProduct, Order, AgentAction, CommercePolicy } from './types';
import { DEMO_SELLER, DEMO_BUYER } from './seed';

// Unsplash high quality product image curated pool
const CATEGORY_IMAGES: Record<string, string[]> = {
  headphones: [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500&q=80',
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500&q=80',
    'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500&q=80',
  ],
  gaming: [
    'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&q=80',
    'https://images.unsplash.com/photo-1599669454699-24889d6df33b?w=500&q=80',
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&q=80',
    'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=500&q=80',
  ],
  keyboards: [
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&q=80',
    'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=500&q=80',
    'https://images.unsplash.com/photo-1595225476474-87563907a212?w=500&q=80',
  ],
  audio: [
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80',
    'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=500&q=80',
    'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&q=80',
  ],
  wearables: [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80',
    'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500&q=80',
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=500&q=80',
  ],
  accessories: [
    'https://images.unsplash.com/photo-1609592424109-dd9892f1b177?w=500&q=80',
    'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&q=80',
    'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&q=80',
  ],
};

const SYNTHETIC_TEMPLATES = [
  {
    name: 'Sony WH-CH720N Noise Cancelling Wireless Headphones',
    category: 'headphones',
    basePrice: 9990,
    features: ['Integrated Processor V1', '35 Hours Playback', 'Multipoint Bluetooth 5.2', 'Dual Noise Sensor'],
    desc: 'Lightweight over-ear wireless headphones with active noise cancellation and crystal clear hands-free calls.',
  },
  {
    name: 'Sennheiser Accentum Wireless ANC Headphones',
    category: 'headphones',
    basePrice: 11990,
    features: ['50-Hour Battery Life', 'Sennheiser Sound engine', 'Hybrid ANC', 'Customizable Sound Modes'],
    desc: 'High fidelity audio headphones with ergonomic design and fast charging capability.',
  },
  {
    name: 'HyperX Cloud III Wireless Gaming Headset',
    category: 'gaming',
    basePrice: 12490,
    features: ['Up to 120 Hours Battery', 'DTS Headphone:X Spatial Audio', '53mm Angled Drivers', 'Ultra-Soft Memory Foam'],
    desc: 'Esports grade gaming headset designed for competitive gaming sessions with crystal clear mic.',
  },
  {
    name: 'Razer BlackWidow V4 X Mechanical Gaming Keyboard',
    category: 'keyboards',
    basePrice: 11499,
    features: ['Razer Yellow Linear Switches', 'Chroma RGB Per-Key Lighting', '6 Dedicated Macro Keys', 'Doubleshot ABS Keycaps'],
    desc: 'Full-sized mechanical keyboard built for tactile accuracy and custom macro mapping.',
  },
  {
    name: 'Marshall Major IV Wireless Bluetooth Headphones',
    category: 'headphones',
    basePrice: 12999,
    features: ['80+ Hours Wireless Playtime', 'Wireless Charging', 'Iconic Marshall Ergonomics', 'Multi-directional Control Knob'],
    desc: 'Classic vintage styling with deep bass, smooth mids and custom tuned dynamic drivers.',
  },
  {
    name: 'Samsung Galaxy Fit3 Smart Fitness Tracker',
    category: 'wearables',
    basePrice: 4999,
    features: ['1.6" AMOLED Display', '13 Day Battery Life', '100+ Exercise Modes', 'Fall Detection & Sleep Tracking'],
    desc: 'Sleek aluminum body fitness tracker with automatic workout detection and daily health metrics.',
  },
  {
    name: 'OnePlus Buds Pro 2 TWS Earbuds',
    category: 'audio',
    basePrice: 8999,
    features: ['MelodyBoost Dual Drivers', '48dB Smart Adaptive ANC', 'Spatial Audio with Head Tracking', '39H Total Playtime'],
    desc: 'Co-created with Dynaudio, delivering audiophile grade sound with active noise suppression.',
  },
  {
    name: 'Spigen ArcField 15W Fast Wireless Charger Pad',
    category: 'accessories',
    basePrice: 1799,
    features: ['15W Max Fast Charging', 'AirBoost Technology', 'Overheat & Short Circuit Protection', 'Non-Slip Rubber Coating'],
    desc: 'Compact desktop wireless charging pad compatible with Qi-enabled smartphones and earbuds.',
  },
  {
    name: 'Elgato Stream Deck MK.2 Studio Controller',
    category: 'gaming',
    basePrice: 14999,
    features: ['15 Customizable LCD Keys', 'One-Touch Tactile Actions', 'Direct Integration with OBS & Twitch', 'Interchangeable Faceplates'],
    desc: 'Ultimate studio control deck for live streamers, content creators, and workflow automation.',
  },
  {
    name: 'Audio-Technica ATH-M50x BT2 Wireless Headphones',
    category: 'headphones',
    basePrice: 18990,
    features: ['45mm Large-aperture Drivers', '50 Hours Battery', 'Dual Mics with Beamforming', 'Low Latency Mode'],
    desc: 'Critically acclaimed studio monitor audio performance now with Bluetooth wireless freedom.',
  },
];

/**
 * Generate synthetic products dynamically
 */
export function generateSyntheticProducts(count: number = 5): Product[] {
  const result: Product[] = [];
  const timestamp = Date.now();

  for (let i = 0; i < count; i++) {
    const tmpl = SYNTHETIC_TEMPLATES[(i + Math.floor(Math.random() * 5)) % SYNTHETIC_TEMPLATES.length];
    const category = tmpl.category;
    const images = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['accessories'];
    const image_url = images[Math.floor(Math.random() * images.length)];
    
    // Add random variance to price and stock
    const priceVariance = (Math.floor(Math.random() * 9) - 4) * 100;
    const finalPrice = Math.max(799, tmpl.basePrice + priceVariance);
    const stock = Math.floor(Math.random() * 35) + 5;

    const prodId = `prod-synth-${timestamp}-${i}-${Math.random().toString(36).substring(2, 6)}`;

    const product: Product = {
      id: prodId,
      seller_id: DEMO_SELLER.id,
      name: `${tmpl.name} (Gen-${Math.floor(Math.random() * 89 + 10)})`,
      description: tmpl.desc,
      category: tmpl.category,
      price: finalPrice,
      currency: 'INR',
      stock: stock,
      image_url: image_url,
      features: tmpl.features,
      delivery_info: { est_days: Math.floor(Math.random() * 3) + 2, free_shipping: finalPrice > 1500 },
      return_policy: { returnable: true, days: 7 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_ai_ready: false,
    };

    result.push(product);
  }

  return result;
}

/**
 * Auto-normalize a product into AgentProduct schema format
 */
export function createAgentProductFromProduct(prod: Product): AgentProduct {
  const isWireless = prod.name.toLowerCase().includes('wireless') || prod.description.toLowerCase().includes('bluetooth');
  const hasAnc = prod.features.some((f) => f.toLowerCase().includes('anc') || f.toLowerCase().includes('noise cancel'));
  
  return {
    id: `agent-prod-${prod.id}`,
    product_id: prod.id,
    seller_id: prod.seller_id,
    normalized_name: prod.name,
    normalized_category: prod.category.toLowerCase(),
    attributes: {
      wireless: isWireless,
      anc: hasAnc,
      battery_hours: isWireless ? 40 : 0,
      price: prod.price,
      currency: prod.currency,
    },
    use_cases: prod.category === 'gaming' ? ['gaming', 'esports', 'pc'] : ['daily_use', 'travel', 'work'],
    search_terms: [prod.name.toLowerCase(), prod.category, ...prod.features.map((f) => f.toLowerCase())],
    structured_description: `${prod.name} (${prod.category}) priced at ₹${prod.price}. Key specs: ${prod.features.join(', ')}.`,
    agent_metadata: {
      wireless: isWireless,
      anc: hasAnc,
      gaming_oriented: prod.category === 'gaming',
      price_source: 'seller_database',
      inventory_source: 'seller_database',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Generate synthetic dynamic orders for testing admin/seller flows
 */
export function generateSyntheticOrders(products: Product[], count: number = 3): Order[] {
  if (products.length === 0) return [];
  const orders: Order[] = [];
  const statuses: Order['status'][] = ['paid', 'paid', 'created', 'paid'];

  for (let i = 0; i < count; i++) {
    const prod = products[Math.floor(Math.random() * products.length)];
    const qty = Math.floor(Math.random() * 2) + 1;
    const totalAmount = prod.price * qty;
    const status = statuses[i % statuses.length];
    const orderId = `ord-synth-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;

    orders.push({
      id: orderId,
      buyer_id: DEMO_BUYER.id,
      seller_id: prod.seller_id,
      status: status,
      total_amount: totalAmount,
      currency: 'INR',
      items: [
        {
          id: `item-${orderId}-0`,
          order_id: orderId,
          product_id: prod.id,
          quantity: qty,
          unit_price: prod.price,
          total_price: totalAmount,
          product: prod,
        },
      ],
      razorpay_order_id: `order_synth_rzp_${Math.random().toString(36).substring(2, 10)}`,
      created_at: new Date(Date.now() - (i * 3600000 + Math.random() * 1800000)).toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  return orders;
}

/**
 * Generate synthetic money audit trail actions
 */
export function generateSyntheticAuditActions(count: number = 4): AgentAction[] {
  const actionTypes = [
    'QUERY_CATALOG',
    'APPLY_POLICY_GATE',
    'CREATE_CHECKOUT',
    'VERIFY_PAYMENT_SIGNATURE',
  ];

  const actions: AgentAction[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const type = actionTypes[i % actionTypes.length];
    let reason = '';
    let status: 'allowed' | 'blocked' = 'allowed';

    if (type === 'QUERY_CATALOG') {
      reason = 'AI Agent searched NLU catalog for wireless ANC noise cancelling headphones under ₹10,000.';
    } else if (type === 'APPLY_POLICY_GATE') {
      reason = 'Merchant Policy Gate: Discount 0% <= Max 15%. Order Value ₹5,999 <= ₹15,000 ceiling. APPROVED.';
    } else if (type === 'CREATE_CHECKOUT') {
      reason = 'Razorpay Test Order order_synth_rzp_8923 created on server with HMAC SHA256 signature binding.';
    } else if (type === 'VERIFY_PAYMENT_SIGNATURE') {
      reason = 'Razorpay HMAC signature verified successfully. Payment captured & stock updated.';
    }

    actions.push({
      id: `action-synth-${now}-${i}`,
      agent_id: 'shop-agent-buyer-v1',
      buyer_id: DEMO_BUYER.id,
      seller_id: DEMO_SELLER.id,
      action_type: type,
      status: status,
      reason: reason,
      metadata: { synthetic: true, timestamp: new Date(now - i * 1200000).toISOString() },
      created_at: new Date(now - i * 1200000).toISOString(),
    });
  }

  return actions;
}
