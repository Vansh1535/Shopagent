import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const products = await db.getProducts();
    const agentProducts = await db.getAgentProducts();
    const actions = await db.getAgentActions();

    return NextResponse.json({
      success: true,
      productsCount: products.length,
      agentProductsCount: agentProducts.length,
      actionsCount: actions.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
