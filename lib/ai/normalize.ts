import { Product, AgentProduct } from '../types';
import { GoogleGenAI } from '@google/genai';
import { isGroqConfigured, generateGroqCompletion } from './groq';

const apiKey = process.env.AI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function normalizeProductToAgentCatalog(
  product: Product
): Promise<AgentProduct> {
  const defaultAgentProd: AgentProduct = {
    id: `agent-prod-${product.id}`,
    product_id: product.id,
    seller_id: product.seller_id,
    normalized_name: product.name,
    normalized_category: product.category.toLowerCase().trim(),
    attributes: {
      wireless:
        product.name.toLowerCase().includes('wireless') ||
        product.description.toLowerCase().includes('bluetooth'),
      anc:
        product.features.some(
          (f) =>
            f.toLowerCase().includes('anc') ||
            f.toLowerCase().includes('noise cancel')
        ) || product.description.toLowerCase().includes('noise cancel'),
      price: product.price,
      currency: product.currency,
      stock: product.stock,
    },
    use_cases: product.category === 'gaming' ? ['gaming', 'esports'] : ['daily_use', 'work'],
    search_terms: [
      product.name.toLowerCase(),
      product.category.toLowerCase(),
      ...product.features.map((f) => f.toLowerCase()),
    ],
    structured_description: `${product.name} - ${product.description}. Price: ₹${product.price}, Stock: ${product.stock} units.`,
    agent_metadata: {
      wireless: product.name.toLowerCase().includes('wireless'),
      anc: product.features.some((f) => f.toLowerCase().includes('anc')),
      price_source: 'seller_database',
      inventory_source: 'seller_database',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const prompt = `You are a strict Merchant Catalog AI Normalization Agent.
Convert the following seller product data into a structured agent-readable catalog representation.

RULES:
1. Do NOT hallucinate facts, features, or prices not in the original input.
2. Store missing values as null or omitted.
3. Preserve exact price: ${product.price} and stock: ${product.stock}.

Product Data:
Name: ${product.name}
Description: ${product.description}
Category: ${product.category}
Price: INR ${product.price}
Features: ${JSON.stringify(product.features)}

Return strictly valid JSON with this format:
{
  "normalized_name": "string",
  "normalized_category": "string",
  "attributes": { "wireless": boolean, "anc": boolean, "custom_key": "value" },
  "use_cases": ["string"],
  "search_terms": ["string"],
  "structured_description": "string"
}`;

  // 1. Try Groq API (LLaMA 3.3 70B) if configured
  if (isGroqConfigured()) {
    try {
      const groqResponse = await generateGroqCompletion(
        prompt,
        'You are a strict JSON catalog normalization AI.'
      );
      const cleanJsonText = groqResponse.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJsonText);

      return {
        ...defaultAgentProd,
        normalized_name: parsed.normalized_name || product.name,
        normalized_category: parsed.normalized_category || product.category,
        attributes: {
          ...parsed.attributes,
          price: product.price,
          stock: product.stock,
        },
        use_cases: parsed.use_cases || defaultAgentProd.use_cases,
        search_terms: parsed.search_terms || defaultAgentProd.search_terms,
        structured_description: parsed.structured_description || defaultAgentProd.structured_description,
      };
    } catch (err) {
      console.warn('Groq normalization fallback:', err);
    }
  }

  // 2. Try Gemini 2.5 Flash if configured
  if (!ai) {
    return defaultAgentProd;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const responseText = response.text || '';
    const cleanJsonText = responseText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJsonText);

    return {
      ...defaultAgentProd,
      normalized_name: parsed.normalized_name || product.name,
      normalized_category: parsed.normalized_category || product.category,
      attributes: {
        ...parsed.attributes,
        price: product.price,
        stock: product.stock,
      },
      use_cases: parsed.use_cases || defaultAgentProd.use_cases,
      search_terms: parsed.search_terms || defaultAgentProd.search_terms,
      structured_description: parsed.structured_description || defaultAgentProd.structured_description,
    };
  } catch (error) {
    console.warn('Gemini AI normalization fallback used:', error);
    return defaultAgentProd;
  }
}
