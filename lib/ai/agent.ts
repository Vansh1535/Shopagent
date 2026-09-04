import { Product, ChatMessage, AgentAction } from '../types';
import { db } from '../db';
import { validateTransactionPolicy } from '../policy/engine';
import { GoogleGenAI } from '@google/genai';
import { isGroqConfigured, generateGroqCompletion } from './groq';

const apiKey = process.env.AI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface AgentChatResponse {
  message: ChatMessage;
  actionLogged?: AgentAction;
  recommendedProducts?: Product[];
  pendingCheckout?: boolean;
}

export async function processBuyerMessage(
  userQuery: string,
  currentHistory: ChatMessage[],
  simulatedFailure?: 'OUT_OF_STOCK' | 'PRICE_CHANGED' | 'PAYMENT_FAILED'
): Promise<AgentChatResponse> {
  const queryLower = userQuery.toLowerCase();

  // 1. Log User Intent in Audit Trail
  await db.logAgentAction({
    action_type: 'USER_INTENT',
    input: { query: userQuery, simulatedFailure },
    status: 'SUCCESS',
    reason: 'Parsed buyer query in English/Hindi/Hinglish/Devanagari',
  });

  const allProducts = await db.getProducts();

  // 2. Perform Intelligent Multilingual Catalog Search (Groq / Gemini / Fallback)
  let searchResults: Product[] = [];
  try {
    searchResults = await searchCatalogWithAi(userQuery, allProducts);
  } catch (e) {
    console.warn('AI catalog search fallback:', e);
    searchResults = searchProductsCatalogFallback(userQuery, allProducts);
  }

  // Log Search Action
  await db.logAgentAction({
    action_type: 'SEARCH_PRODUCTS',
    input: { query: userQuery },
    output: { matches_count: searchResults.length, matches: searchResults.map((p) => p.name) },
    status: 'SUCCESS',
    reason: `Found ${searchResults.length} matching products from authoritative catalog`,
  });

  // 3. Detect Buy / Add to Cart Intent
  const isBuyIntent =
    queryLower.includes('buy') ||
    queryLower.includes('le lo') ||
    queryLower.includes('lelo') ||
    queryLower.includes('kharid') ||
    queryLower.includes('add to cart') ||
    queryLower.includes('order') ||
    queryLower.includes('खरीद') ||
    queryLower.includes('ले लो');

  if (isBuyIntent && searchResults.length > 0) {
    const targetProduct = searchResults[0];

    // Handle Simulated Failure 1: Out of Stock
    if (simulatedFailure === 'OUT_OF_STOCK' || targetProduct.stock === 0) {
      const alternatives = allProducts.filter(
        (p) => p.id !== targetProduct.id && p.stock > 0 && p.category === targetProduct.category
      );

      await db.logAgentAction({
        action_type: 'INVENTORY_CHECK',
        input: { product_id: targetProduct.id, name: targetProduct.name },
        output: { stock: 0 },
        status: 'FAILED',
        reason: 'Product out of stock. Initiating failure recovery protocol.',
      });

      await db.logAgentAction({
        action_type: 'FAILURE_RECOVERY',
        input: { failed_product: targetProduct.name },
        output: { recommended_alternatives: alternatives.map((a) => a.name) },
        status: 'RECOVERED',
        reason: 'Recommended available in-budget alternative product',
      });

      const altMessage = alternatives.length > 0
        ? `Sorry, **${targetProduct.name}** is currently out of stock. However, I found a great in-stock alternative for you: **${alternatives[0].name}** for ₹${alternatives[0].price.toLocaleString('en-IN')}. Would you like to see it?`
        : `Sorry, **${targetProduct.name}** is currently out of stock. Please check back soon or try another search.`;

      const msg = await db.addMessage({
        role: 'assistant',
        content: altMessage,
        metadata: {
          recommended_products: alternatives.slice(0, 2),
          failure_type: 'OUT_OF_STOCK',
        },
      });

      return { message: msg, recommendedProducts: alternatives.slice(0, 2) };
    }

    // Handle Simulated Failure 2: Price Changed
    if (simulatedFailure === 'PRICE_CHANGED') {
      const oldPrice = targetProduct.price;
      const updatedPrice = oldPrice + 300;

      await db.logAgentAction({
        action_type: 'PRICE_VALIDATION',
        input: { product_id: targetProduct.id, displayed_price: oldPrice },
        output: { current_database_price: updatedPrice },
        status: 'FAILED',
        reason: 'Price mismatch detected before order creation',
      });

      await db.logAgentAction({
        action_type: 'FAILURE_RECOVERY',
        input: { product: targetProduct.name, oldPrice, updatedPrice },
        status: 'RECOVERED',
        reason: 'Re-requesting buyer explicit confirmation for updated price',
      });

      const msg = await db.addMessage({
        role: 'assistant',
        content: `⚠️ **Price Update Alert**: The price for **${targetProduct.name}** has updated from ₹${oldPrice} to ₹${updatedPrice} in the seller database. Would you still like to proceed with the purchase?`,
        metadata: {
          recommended_products: [targetProduct],
          failure_type: 'PRICE_CHANGED',
          amount: updatedPrice,
        },
      });

      return { message: msg, recommendedProducts: [targetProduct] };
    }

    // Validate Commerce Policy & Inventory deterministically
    const policyResult = await validateTransactionPolicy(
      targetProduct.seller_id,
      targetProduct,
      1,
      targetProduct.price,
      true
    );

    if (!policyResult.allowed) {
      await db.logAgentAction({
        action_type: 'POLICY_CHECK',
        input: { product_id: targetProduct.id, price: targetProduct.price },
        status: 'POLICY_REJECTED',
        reason: policyResult.reason,
      });

      const msg = await db.addMessage({
        role: 'assistant',
        content: `🛑 Policy Gate Rejection: ${policyResult.reason}`,
        metadata: { action_type: 'POLICY_CHECK' },
      });
      return { message: msg };
    }

    await db.logAgentAction({
      action_type: 'POLICY_CHECK',
      input: { product: targetProduct.name, price: targetProduct.price, stock: targetProduct.stock },
      status: 'SUCCESS',
      reason: 'Passed stock check, max quantity policy, and price validation',
    });

    await db.updateCartItems(targetProduct.seller_id, [{ product: targetProduct, quantity: 1 }]);

    await db.logAgentAction({
      action_type: 'CART_UPDATE',
      input: { product_id: targetProduct.id, price: targetProduct.price, quantity: 1 },
      output: { cart_total: targetProduct.price },
      status: 'SUCCESS',
      reason: 'Item validated and added to buyer cart',
    });

    const confirmationText = `Great! I've added **${targetProduct.name}** to your cart.\n\n` +
      `• **Item Total**: ₹${targetProduct.price.toLocaleString('en-IN')}\n` +
      `• **Stock Status**: ${targetProduct.stock} units available\n` +
      `• **Delivery**: ${targetProduct.delivery_info?.est_days || 2} days free delivery\n\n` +
      `Shall I proceed to launch **Razorpay Checkout** for ₹${targetProduct.price.toLocaleString('en-IN')}?`;

    const msg = await db.addMessage({
      role: 'assistant',
      content: confirmationText,
      metadata: {
        recommended_products: [targetProduct],
        requires_confirmation: true,
        pending_checkout: true,
        amount: targetProduct.price,
      },
    });

    return {
      message: msg,
      recommendedProducts: [targetProduct],
      pendingCheckout: true,
    };
  }

  // 4. Generate Natural Recommendation Response
  let aiContent = '';

  if (searchResults.length > 0) {
    const topRec = searchResults[0];

    await db.logAgentAction({
      action_type: 'RECOMMENDATION',
      input: { top_recommendation: topRec.name, price: topRec.price },
      output: { total_recommendations: searchResults.length },
      status: 'SUCCESS',
      reason: 'Generated factual recommendation based on catalog data',
    });

    const isHindiDevanagariOrHinglish =
      /[\u0900-\u097F]/.test(userQuery) ||
      queryLower.includes('mujhe') ||
      queryLower.includes('chahiye') ||
      queryLower.includes('aur') ||
      queryLower.includes('hai');

    if (isHindiDevanagariOrHinglish) {
      aiContent = `Bilkul! Aapke request ke mutabiq mujhe **${searchResults.length} options** mile hain:\n\n` +
        `Main **${topRec.name}** recommend karunga (Price: ₹${topRec.price.toLocaleString('en-IN')}).\n` +
        `Key features: **${topRec.features.slice(0, 2).join(' aur ')}** (${topRec.stock} units in stock).\n\n` +
        `Kya aap isse cart me add karna chahte hain?`;
    } else {
      aiContent = `I found **${searchResults.length} match(es)** in our catalog based on your request:\n\n` +
        `I highly recommend **${topRec.name}** for **₹${topRec.price.toLocaleString('en-IN')}**.\n` +
        `Key features: ${topRec.features.join(', ')}.\n` +
        `Stock: ${topRec.stock} units available in inventory.\n\n` +
        `Would you like to add this to your cart or proceed to checkout?`;
    }
  } else {
    aiContent = `I couldn't find an exact match for "${userQuery}". Here are popular categories in our catalog: Wireless Headphones, Gaming Mice, Mechanical Keyboards, and Smartwatches under ₹5,000!`;
  }

  const msg = await db.addMessage({
    role: 'assistant',
    content: aiContent,
    metadata: {
      recommended_products: searchResults.slice(0, 4),
    },
  });

  return { message: msg, recommendedProducts: searchResults.slice(0, 4) };
}

// Search catalog using Groq API (LLaMA 3.3 70B) or Gemini 2.5 Flash for natural language & multilingual intent parsing
async function searchCatalogWithAi(userQuery: string, products: Product[]): Promise<Product[]> {
  const productCatalogSummary = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    description: p.description,
    features: p.features,
    stock: p.stock,
  }));

  const prompt = `You are an AI Product Search Matcher for an e-commerce catalog.
Given the user query (which may be in English, Hindi Devanagari script, Hinglish, or shorthand):
1. Understand the user's intended category, specs (wireless, ANC, gaming, etc.), and max price.
2. Select up to 4 matching product IDs from the catalog array provided below.
3. If the query asks for "other headphones", "more options", or general category items, return all relevant items in that category.

User Query: "${userQuery}"

Product Catalog:
${JSON.stringify(productCatalogSummary, null, 2)}

Return strictly valid JSON with format:
{
  "matching_product_ids": ["prod-001", "prod-003"]
}`;

  // 1. Prioritize Groq API (LLaMA 3.3 70B) if configured
  if (isGroqConfigured()) {
    try {
      const groqResponse = await generateGroqCompletion(
        prompt,
        'You are an expert e-commerce catalog matching AI.'
      );
      const cleanJsonText = groqResponse.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJsonText);
      if (parsed.matching_product_ids && Array.isArray(parsed.matching_product_ids)) {
        const matched = products.filter((p) => parsed.matching_product_ids.includes(p.id));
        if (matched.length > 0) return matched;
      }
    } catch (err) {
      console.warn('Groq catalog search fallback:', err);
    }
  }

  // 2. Fallback to Gemini 2.5 Flash if configured
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const responseText = response.text || '';
      const cleanJsonText = responseText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJsonText);

      if (parsed.matching_product_ids && Array.isArray(parsed.matching_product_ids)) {
        const matched = products.filter((p) => parsed.matching_product_ids.includes(p.id));
        if (matched.length > 0) return matched;
      }
    } catch (err) {
      console.warn('Gemini catalog search fallback:', err);
    }
  }

  return searchProductsCatalogFallback(userQuery, products);
}

// Fallback search with Devanagari & Hindi keyword dictionary support
function searchProductsCatalogFallback(query: string, products: Product[]): Product[] {
  let maxPrice = 999999;
  const priceMatch = query.match(/(?:under|below|less than|ke andar|tak|around)\s*(?:rs|inr|₹)?\s*(\d+)/i) ||
                     query.match(/(\d+)\s*(?:ke andar|under|below|tak)/i) ||
                     query.match(/(?:rs|inr|₹)\s*(\d+)/i);
  if (priceMatch && priceMatch[1]) {
    maxPrice = parseInt(priceMatch[1], 10);
  }

  // Devanagari & Hindi Keyword Translation Mapping
  let normalizedQuery = query.toLowerCase();

  const devanagariMap: Record<string, string> = {
    'हेडफोन': 'headphones',
    'हेडफोंस': 'headphones',
    'इयरफोन': 'headphones audio',
    'ऑडियो': 'audio',
    'माउस': 'gaming mouse',
    'कीबोर्ड': 'keyboards',
    'घड़ी': 'wearables smartwatch',
    'स्मार्टवॉच': 'wearables smartwatch',
    'गेमिंग': 'gaming',
    'वायरलेस': 'wireless',
  };

  for (const [key, val] of Object.entries(devanagariMap)) {
    if (normalizedQuery.includes(key)) {
      normalizedQuery += ' ' + val;
    }
  }

  // Stop words & numbers to exclude from keyword substring matching
  const stopWords = new Set([
    'under', 'below', 'than', 'less', 'more', 'over', 'for', 'with', 'inr', 'rs', 'rupees',
    'chahiye', 'mujhe', 'tak', 'andar', 'dikhao', 'batao', 'good', 'best', 'some', 'any'
  ]);

  const qTokens = normalizedQuery
    .split(/\s+/)
    .filter((t) => t.length > 2 && !stopWords.has(t) && !/^\d+$/.test(t));

  const matchedProducts = products.filter((p) => {
    const matchesPrice = p.price <= maxPrice;
    const textToSearch = (p.name + ' ' + p.description + ' ' + p.category + ' ' + p.features.join(' ')).toLowerCase();

    const matchesKeywords = qTokens.length === 0 || qTokens.some((token) => textToSearch.includes(token));
    return matchesPrice && matchesKeywords;
  });

  // If specific match wasn't found, fallback to showing items under budget in category
  if (matchedProducts.length === 0) {
    const categoryMatches = products.filter((p) =>
      p.price <= maxPrice &&
      (normalizedQuery.includes('headphone') || normalizedQuery.includes('gaming') || normalizedQuery.includes('mouse') || normalizedQuery.includes('keyboard'))
    );
    if (categoryMatches.length > 0) return categoryMatches;
  }

  return matchedProducts.length > 0 ? matchedProducts : products.filter((p) => p.price <= maxPrice).slice(0, 4);
}
