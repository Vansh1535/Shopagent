import { NextRequest, NextResponse } from 'next/server';
import { normalizeProductToAgentCatalog } from '@/lib/ai/normalize';
import { db } from '@/lib/db';
import { Product } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const product: Product = body.product;

    if (!product || !product.id) {
      return NextResponse.json(
        { success: false, error: 'Product payload with valid ID is required.' },
        { status: 400 }
      );
    }

    // Call factual normalization engine
    const agentProduct = await normalizeProductToAgentCatalog(product);

    // Save into database / memory
    await db.saveAgentProduct(agentProduct);

    return NextResponse.json({
      success: true,
      agentProduct,
    });
  } catch (error: any) {
    console.error('Error normalizing product:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
