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
  simulatedFailure?: 'OUT_OF_STOCK' | 'PRICE_CHANGED' | 'PAYMENT_FAILED',
  buyerAgentBudget: number = 5000
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

  // Extract last recommended products from chat history for multi-turn conversational context
  let lastRecs: Product[] = [];
  for (let i = currentHistory.length - 1; i >= 0; i--) {
    const recs = currentHistory[i].metadata?.recommended_products;
    if (recs && recs.length > 0) {
      lastRecs = recs;
      break;
    }
  }

  // Detect Contextual Follow-Up Queries ("sasta wala konsa he", "kala kaun sa hai", "cheapest of these", "black color one")
  const isCheapestFollowUp =
    queryLower.includes('sasta') ||
    queryLower.includes('cheapest') ||
    queryLower.includes('cheaper') ||
    queryLower.includes('low price') ||
    queryLower.includes('kam daam');

  const isColorFollowUp =
    queryLower.includes('kala') ||
    queryLower.includes('black') ||
    queryLower.includes('white') ||
    queryLower.includes('safed') ||
    queryLower.includes('color') ||
    queryLower.includes('rang');

  // Handle Contextual Cheapest Follow-Up on Previous Results
  if (isCheapestFollowUp && lastRecs.length > 0) {
    const sortedByPrice = [...lastRecs].sort((a, b) => a.price - b.price);
    const cheapestProduct = sortedByPrice[0];

    await db.logAgentAction({
      action_type: 'RECOMMENDATION',
      input: { context_query: userQuery, cheapest: cheapestProduct.name },
      status: 'SUCCESS',
      reason: 'Resolved contextual cheapest query from previous recommended items',
    });

    const isHinglish =
      /[\u0900-\u097F]/.test(userQuery) ||
      queryLower.includes('sasta') ||
      queryLower.includes('konsa') ||
      queryLower.includes('kaun sa') ||
      queryLower.includes('hai');

    const content = isHinglish
      ? `Aapke pichhle dikhaye gaye options me se **${cheapestProduct.name}** sabse sasta hai for **₹${cheapestProduct.price.toLocaleString('en-IN')}**!\n\n` +
        `• **Price**: ₹${cheapestProduct.price.toLocaleString('en-IN')}\n` +
        `• **Key Specs**: ${cheapestProduct.features.slice(0, 3).join(' • ')}\n` +
        `• **Stock Status**: ${cheapestProduct.stock} units available\n\n` +
        `Kya aap isse buy karna chahte hain ya Razorpay checkout launch karein?`
      : `Out of the previously shown options, **${cheapestProduct.name}** is the most affordable at **₹${cheapestProduct.price.toLocaleString('en-IN')}**!\n\n` +
        `• **Price**: ₹${cheapestProduct.price.toLocaleString('en-IN')}\n` +
        `• **Key Specs**: ${cheapestProduct.features.slice(0, 3).join(' • ')}\n` +
        `• **Stock**: ${cheapestProduct.stock} units available\n\n` +
        `Would you like to proceed with purchasing this item?`;

    const msg = await db.addMessage({
      role: 'assistant',
      content,
      metadata: {
        recommended_products: sortedByPrice,
        action_type: 'RECOMMENDATION',
      },
    });

    return { message: msg, recommendedProducts: sortedByPrice };
  }

  // Handle Contextual Color / Spec Follow-Up on Previous Results
  if (isColorFollowUp && lastRecs.length > 0) {
    const colorTerm = (queryLower.includes('kala') || queryLower.includes('black')) ? 'black' : 'white';
    const matchedColor = lastRecs.filter((p) => {
      const text = (p.name + ' ' + p.description + ' ' + p.features.join(' ')).toLowerCase();
      return text.includes(colorTerm);
    });

    if (matchedColor.length > 0) {
      const topColorProduct = matchedColor[0];

      await db.logAgentAction({
        action_type: 'RECOMMENDATION',
        input: { context_query: userQuery, color_match: topColorProduct.name },
        status: 'SUCCESS',
        reason: 'Resolved contextual color query from previous recommended items',
      });

      const content = `Pichhle options me se **${topColorProduct.name}** (${colorTerm.toUpperCase()} color) me available hai for **₹${topColorProduct.price.toLocaleString('en-IN')}**!\n\n` +
        `• **Price**: ₹${topColorProduct.price.toLocaleString('en-IN')}\n` +
        `• **Features**: ${topColorProduct.features.join(' • ')}\n` +
        `• **Stock**: ${topColorProduct.stock} units in inventory\n\n` +
        `Kya aap isse cart me add karke buy karna chahte hain?`;

      const msg = await db.addMessage({
        role: 'assistant',
        content,
        metadata: {
          recommended_products: matchedColor,
          action_type: 'RECOMMENDATION',
        },
      });

      return { message: msg, recommendedProducts: matchedColor };
    }
  }

  // 2. Perform Intelligent Multilingual Catalog Search (Groq / Gemini / Fallback)
  let searchResults: Product[] = [];
  try {
    searchResults = await searchCatalogWithAi(userQuery, allProducts);
  } catch (e) {
    console.warn('AI catalog search fallback:', e);
    searchResults = searchProductsCatalogFallback(userQuery, allProducts);
  }

  // Handle Contextual Pronouns / Ordinals in Multi-turn History ("first one", "pehla wala", "second one", "this one", "ye wala")
  if (searchResults.length === 0 || queryLower.includes('first') || queryLower.includes('pehla') || queryLower.includes('second') || queryLower.includes('dusra') || queryLower.includes('this one')) {
    if (lastRecs.length > 0) {
      if (queryLower.includes('second') || queryLower.includes('dusra')) {
        if (lastRecs[1]) searchResults = [lastRecs[1], ...lastRecs];
      } else if (queryLower.includes('first') || queryLower.includes('pehla') || queryLower.includes('this one') || queryLower.includes('ye wala')) {
        searchResults = [lastRecs[0], ...lastRecs];
      }
    }
  }

  // Log Search Action
  await db.logAgentAction({
    action_type: 'SEARCH_PRODUCTS',
    input: { query: userQuery },
    output: { matches_count: searchResults.length, matches: searchResults.map((p) => p.name) },
    status: 'SUCCESS',
    reason: `Found ${searchResults.length} matching products from authoritative catalog`,
  });

  // 3. Detect Comparison Intent ("compare", "vs", "fark", "difference", "dono me", "better")
  const isCompareIntent =
    queryLower.includes('compare') ||
    queryLower.includes('versus') ||
    queryLower.includes(' vs ') ||
    queryLower.includes(' vs') ||
    queryLower.includes('fark') ||
    queryLower.includes('difference') ||
    queryLower.includes('dono me') ||
    queryLower.includes('kaun sa achha') ||
    queryLower.includes('which is better') ||
    queryLower.includes('अन्तर') ||
    queryLower.includes('तुलना');

  if (isCompareIntent) {
    let compareProducts: Product[] = searchResults;

    if (compareProducts.length < 2 && currentHistory.length > 0) {
      for (let i = currentHistory.length - 1; i >= 0; i--) {
        const histRecs = currentHistory[i].metadata?.recommended_products;
        if (histRecs && histRecs.length >= 2) {
          compareProducts = histRecs.slice(0, 3);
          break;
        }
      }
    }

    if (compareProducts.length >= 2) {
      const p1 = compareProducts[0];
      const p2 = compareProducts[1];

      await db.logAgentAction({
        action_type: 'RECOMMENDATION',
        input: { comparison: [p1.name, p2.name] },
        status: 'SUCCESS',
        reason: 'Generated side-by-side product comparison matrix',
      });

      const compareContent = `Here is a side-by-side comparison between **${p1.name}** and **${p2.name}**:\n\n` +
        `• **Price Comparison**: ₹${p1.price.toLocaleString('en-IN')} vs ₹${p2.price.toLocaleString('en-IN')}\n` +
        `• **Key Advantage (${p1.name.split(' ')[0]})**: ${p1.features[0] || 'High performance'}\n` +
        `• **Key Advantage (${p2.name.split(' ')[0]})**: ${p2.features[0] || 'Great value'}\n` +
        `• **Stock Status**: ${p1.stock > 0 ? `${p1.stock} units available` : 'Out of stock'} vs ${p2.stock > 0 ? `${p2.stock} units available` : 'Out of stock'}\n\n` +
        `💡 **Recommendation**: If budget is your main priority, **${p1.price <= p2.price ? p1.name : p2.name}** offers maximum savings!`;

      const msg = await db.addMessage({
        role: 'assistant',
        content: compareContent,
        metadata: {
          recommended_products: compareProducts.slice(0, 3),
          is_comparison: true,
          action_type: 'RECOMMENDATION',
        },
      });

      return { message: msg, recommendedProducts: compareProducts.slice(0, 3) };
    }
  }

  // 4. Detect Conversational Buy / Add to Cart Intent
  const isBuyIntent =
    queryLower.includes('buy') ||
    queryLower.includes('le lo') ||
    queryLower.includes('lelo') ||
    queryLower.includes('kharid') ||
    queryLower.includes('add to cart') ||
    queryLower.includes('order') ||
    queryLower.includes('checkout') ||
    queryLower.includes('purchase') ||
    queryLower.includes('place order') ||
    queryLower.includes('pay now') ||
    queryLower.includes('खरीद') ||
    queryLower.includes('ले लो');

  if (isBuyIntent && (searchResults.length > 0 || lastRecs.length > 0)) {
    let targetProduct = searchResults[0];

    // Resolve target product from multi-turn context (e.g. "cosmic byte wala le lo", "han yah wala le lo", "buy first one")
    if (lastRecs.length > 0) {
      const brandMatch = lastRecs.find((p) => {
        const pName = p.name.toLowerCase();
        const words = pName.split(/\s+/);
        return words.some((w) => w.length >= 3 && queryLower.includes(w));
      });

      if (brandMatch) {
        targetProduct = brandMatch;
      } else if (
        queryLower.includes('pehla') ||
        queryLower.includes('first') ||
        queryLower.includes('le lo') ||
        queryLower.includes('lelo') ||
        queryLower.includes('ye wala') ||
        queryLower.includes('yah wala') ||
        queryLower.includes('this one') ||
        queryLower.includes('buy this') ||
        queryLower.includes('han') ||
        queryLower.includes('yes')
      ) {
        targetProduct = lastRecs[0];
      } else if (queryLower.includes('dusra') || queryLower.includes('second')) {
        if (lastRecs[1]) targetProduct = lastRecs[1];
      }
    }

    if (!targetProduct) {
      targetProduct = searchResults[0] || lastRecs[0];
    }

    // ENFORCE BUYER AGENT BUDGET CEILING
    if (targetProduct && targetProduct.price > buyerAgentBudget) {
      await db.logAgentAction({
        action_type: 'AGENT_BUDGET_EXCEEDED',
        input: {
          product: targetProduct.name,
          product_price: targetProduct.price,
          buyer_budget: buyerAgentBudget,
        },
        status: 'POLICY_REJECTED',
        reason: `Product price ₹${targetProduct.price} exceeds buyer agent auto-purchase budget limit of ₹${buyerAgentBudget}`,
      });

      const isHinglish =
        /[\u0900-\u097F]/.test(userQuery) ||
        queryLower.includes('le lo') ||
        queryLower.includes('yah wala') ||
        queryLower.includes('hai');

      const budgetContent = isHinglish
        ? `⚠️ **Agent Budget Exceeded Alert**: **${targetProduct.name}** ki price **₹${targetProduct.price.toLocaleString('en-IN')}** hai, jo aapke Agent Budget limit (**₹${buyerAgentBudget.toLocaleString('en-IN')}**) se zyada hai.\n\n` +
          `Aap kya karna chahenge?\n` +
          `1. **Increase Agent Budget**: Profile Settings me budget update karein.\n` +
          `2. **Lower Price Products**: ₹${buyerAgentBudget.toLocaleString('en-IN')} ke andar alternatives search karein.`
        : `⚠️ **Agent Budget Exceeded Alert**: **${targetProduct.name}** costs **₹${targetProduct.price.toLocaleString('en-IN')}**, which exceeds your AI Agent Budget limit of **₹${buyerAgentBudget.toLocaleString('en-IN')}**.\n\n` +
          `Would you like to:\n` +
          `1. **Increase your agent budget** in Profile settings.\n` +
          `2. **Seek lower-priced products** within your ₹${buyerAgentBudget.toLocaleString('en-IN')} budget.`;

      const msg = await db.addMessage({
        role: 'assistant',
        content: budgetContent,
        metadata: {
          recommended_products: [targetProduct],
          over_budget: true,
          buyer_budget: buyerAgentBudget,
          required_budget: targetProduct.price,
          target_product: targetProduct,
        },
      });

      return { message: msg, recommendedProducts: [targetProduct] };
    }

    // Handle Natural Scenario 1: Out of Stock
    if (targetProduct.stock === 0 || simulatedFailure === 'OUT_OF_STOCK') {
      const alternatives = allProducts.filter(
        (p) => p.id !== targetProduct.id && p.stock > 0 && (p.category === targetProduct.category || p.price <= targetProduct.price + 2000)
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

    // Check if buyer has already been presented with & confirmed the price update in previous turn
    const lastAssistantMsg = currentHistory.filter((m) => m.role === 'assistant').pop();
    const wasPriceAlertConfirmed =
      lastAssistantMsg?.metadata?.failure_type === 'PRICE_CHANGED' &&
      (queryLower.includes('theek') ||
        queryLower.includes('ok') ||
        queryLower.includes('yes') ||
        queryLower.includes('han') ||
        queryLower.includes('ha') ||
        queryLower.includes('le lo') ||
        queryLower.includes('lelo') ||
        queryLower.includes('confirm') ||
        queryLower.includes('buy') ||
        queryLower.includes('proceed'));

    // Handle Natural Scenario 2: Price Changed Alert (Triggered ONCE until buyer confirms)
    const hasPriceChanged =
      !wasPriceAlertConfirmed &&
      (simulatedFailure === 'PRICE_CHANGED' ||
        (targetProduct.original_price && targetProduct.original_price !== targetProduct.price));

    if (hasPriceChanged) {
      const oldPrice = targetProduct.original_price || (targetProduct.price - 300);
      const updatedPrice = targetProduct.price;

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
        content: `⚠️ **Price Update Alert**: The price for **${targetProduct.name}** has updated from ₹${oldPrice.toLocaleString('en-IN')} to ₹${updatedPrice.toLocaleString('en-IN')} in the seller database. Would you still like to proceed with the purchase?`,
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

    const confirmationText = `Great choice! I've added **${targetProduct.name}** to your cart.\n\n` +
      `• **Item Total**: ₹${targetProduct.price.toLocaleString('en-IN')}\n` +
      `• **Stock Status**: ${targetProduct.stock} units available\n` +
      `• **Delivery**: ${targetProduct.delivery_info?.est_days || 2} days free delivery\n\n` +
      `Click **Buy Now via Razorpay** below to launch checkout!`;

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

  // 5. Generate Natural AI-Powered Recommendation Response
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

    aiContent = await generateDynamicRecommendationMessage(userQuery, searchResults);
  } else {
    const isHinglish =
      /[\u0900-\u097F]/.test(userQuery) ||
      queryLower.includes('mujhe') ||
      queryLower.includes('chahiye') ||
      queryLower.includes('hai') ||
      queryLower.includes('koi');

    if (isHinglish) {
      aiContent = `Sorry! Humare catalog me abhi yeh item available nahi hai.\n\n` +
        `Humare paas yeh popular tech categories in-stock hain:\n` +
        `• **Wireless Headphones & Headsets** (JBL 770NC, Cosmic Byte GS430, Boat Rockerz)\n` +
        `• **Gaming Mice & Keyboards** (Logitech G304, Keychron K2 V2)\n` +
        `• **Smartwatches & Accessories** (Noise ColorFit, Anker PowerBank, Portronics Stand)\n\n` +
        `Kya aap inme se koi item dekhna chahenge?`;
    } else {
      aiContent = `Sorry, we currently do not carry this item in our merchant catalog.\n\n` +
        `Here are popular categories available in our store:\n` +
        `• **Wireless ANC Headphones & Gaming Headsets**\n` +
        `• **LIGHTSPEED Gaming Mice & Mechanical Keyboards**\n` +
        `• **AMOLED Smartwatches & Ergonomic Accessories**\n\n` +
        `Would you like to explore any of these instead?`;
    }
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
4. CRITICAL: If the user query asks for a product category NOT carried in our catalog (e.g., gaming chair, laptop, smartphone, TV, clothes, shoes, desk, table, monitor), return empty array "matching_product_ids": []. Do NOT select headsets, mice, or keyboards for a gaming chair request.

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

  const unsupportedWords = [
    'chair', 'chairs', 'laptop', 'laptops', 'phone', 'phones', 'mobile', 'mobiles',
    'tv', 'television', 'monitor', 'monitors', 'desk', 'desks', 'table', 'tables',
    'shoe', 'shoes', 'shirt', 'shirts', 'pant', 'pants', 'clothes', 'clothing',
    'camera', 'cameras', 'tablet', 'tablets', 'macbook', 'iphone'
  ];

  const hasUnsupportedNoun = qTokens.some((token) => unsupportedWords.includes(token));
  if (hasUnsupportedNoun) {
    return [];
  }

  const matchedProducts = products.filter((p) => {
    const matchesPrice = p.price <= maxPrice;
    const textToSearch = (p.name + ' ' + p.description + ' ' + p.category + ' ' + p.features.join(' ')).toLowerCase();

    const matchesKeywords = qTokens.length === 0 || qTokens.every((token) => textToSearch.includes(token)) || qTokens.some((token) => textToSearch.includes(token));
    return matchesPrice && matchesKeywords;
  });

  let results = matchedProducts;

  // Apply Non-Keyword Spec & Budget Sorting
  const qLower = query.toLowerCase();
  if (qLower.includes('cheapest') || qLower.includes('sabse sasta') || qLower.includes('lowest price') || qLower.includes('sasta')) {
    results.sort((a, b) => a.price - b.price);
  } else if (qLower.includes('expensive') || qLower.includes('premium') || qLower.includes('highest price') || qLower.includes('mehenga')) {
    results.sort((a, b) => b.price - a.price);
  } else if (qLower.includes('battery') || qLower.includes('playback') || qLower.includes('backup')) {
    results.sort((a, b) => {
      const getBattery = (p: Product) => {
        const feat = p.features.find((f) => f.toLowerCase().includes('hour') || f.toLowerCase().includes('h'));
        if (!feat) return 0;
        const match = feat.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      };
      return getBattery(b) - getBattery(a);
    });
  }

  return results.slice(0, 4);
}

async function generateDynamicRecommendationMessage(userQuery: string, matchedProducts: Product[]): Promise<string> {
  const topRec = matchedProducts[0];
  const otherCount = matchedProducts.length - 1;

  const prompt = `You are a helpful, enthusiastic AI Shopping Assistant for an e-commerce platform.
Generate a friendly, concise, natural response for a customer asking for product recommendations.

Customer Query: "${userQuery}"
Top Recommended Product: ${topRec.name} (Price: ₹${topRec.price}, Stock: ${topRec.stock}, Features: ${topRec.features.join(', ')})
Total Matching Products Found: ${matchedProducts.length}

Guidelines:
1. If user asked in Hindi or Hinglish (e.g. "mujhe", "chahiye"), reply in warm, natural Hinglish. Otherwise reply in natural English.
2. Highlight why ${topRec.name} is a great match for their specific request (price, specs, features).
3. Mention key features naturally (not like a rigid template).
4. End with a natural call to action (e.g., asking if they want to add it to cart or buy now).
5. Keep it concise (under 4-5 lines). Do not include JSON formatting. Return plain markdown text.`;

  // 1. Try Groq LLaMA 3.3 70B
  if (isGroqConfigured()) {
    try {
      const response = await generateGroqCompletion(
        prompt,
        'You are an expert e-commerce conversational assistant.'
      );
      if (response && response.trim().length > 10) {
        return response.trim();
      }
    } catch (e) {
      console.warn('Groq dynamic message fallback:', e);
    }
  }

  // 2. Try Gemini
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      if (response.text && response.text.trim().length > 10) {
        return response.text.trim();
      }
    } catch (e) {
      console.warn('Gemini dynamic message fallback:', e);
    }
  }

  // 3. Fallback to rich dynamic variation engine if AI model is unreachable
  const isHinglish =
    /[\u0900-\u097F]/.test(userQuery) ||
    userQuery.toLowerCase().includes('mujhe') ||
    userQuery.toLowerCase().includes('chahiye') ||
    userQuery.toLowerCase().includes('aur') ||
    userQuery.toLowerCase().includes('hai');

  const randomIdx = Math.floor(Math.random() * 3);

  if (isHinglish) {
    const hinglishTemplates = [
      `Sahi choice! Aapke request ke liye **${matchedProducts.length} options** mile hain.\n\n` +
        `Main **${topRec.name}** recommend karunga (Price: ₹${topRec.price.toLocaleString('en-IN')}).\n` +
        `Isme aapko milega: **${topRec.features.slice(0, 3).join(', ')}** (${topRec.stock} units left).\n\n` +
        `Kya main isse aapke cart me add karke checkout launch karoon?`,

      `Aapke request ke mutabiq **${topRec.name}** sabse perfect match hai!\n\n` +
        `• **Price**: ₹${topRec.price.toLocaleString('en-IN')}\n` +
        `• **Highlights**: ${topRec.features.join(' • ')}\n` +
        `• **Available Options**: ${matchedProducts.length} total matches in catalog\n\n` +
        `Aap isse buy karna chahte hain ya baki options dekhne hain?`,

      `Bilkul! **${topRec.name}** aapke budget aur requirements ke sath bilkul fit baithta hai (₹${topRec.price.toLocaleString('en-IN')}).\n\n` +
        `Key Specs: **${topRec.features.slice(0, 2).join(' aur ')}**.\n\n` +
        `Kya hum Razorpay API ke through iska order confirm karein?`,
    ];
    return hinglishTemplates[randomIdx];
  }

  const englishTemplates = [
    `Great news! I found **${matchedProducts.length} matching item(s)** in our catalog:\n\n` +
      `My top recommendation is **${topRec.name}** for **₹${topRec.price.toLocaleString('en-IN')}**.\n` +
      `Key Highlights: ${topRec.features.join(' • ')}.\n` +
      `Stock Status: ${topRec.stock} units available.\n\n` +
      `Would you like me to add this to your cart or proceed to checkout?`,

    `Based on your request, **${topRec.name}** is an ideal choice for **₹${topRec.price.toLocaleString('en-IN')}**.\n\n` +
      `• **Standout Specs**: ${topRec.features.slice(0, 3).join(', ')}\n` +
      `• **Availability**: ${topRec.stock} units in inventory\n` +
      `• **Other Matches**: ${otherCount > 0 ? `${otherCount} additional options available below` : 'Top single match'}\n\n` +
      `Shall we initiate Razorpay checkout for this item?`,

    `Here are the best options for your search! **${topRec.name}** stands out as the best pick at **₹${topRec.price.toLocaleString('en-IN')}**.\n\n` +
      `Features: ${topRec.features.join(', ')}.\n\n` +
      `Would you like to buy this now or compare with other items?`,
  ];

  return englishTemplates[randomIdx];
}
