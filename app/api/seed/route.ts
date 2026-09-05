import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { INITIAL_PRODUCTS } from '@/lib/seed';

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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === 'clear_all' || action === 'reset_catalog' || action === 'reset') {
      await db.clearDatabase();
      // Re-seed initial clean products so store is ready for fresh testing from scratch
      for (const prod of INITIAL_PRODUCTS) {
        await db.addProduct(prod);
      }

      return NextResponse.json({
        success: true,
        message: 'Successfully cleared all database orders, payments, audit actions, and reset to fresh scratch state!',
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
