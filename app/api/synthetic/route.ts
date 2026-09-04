import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'generate_products';
    const count = Number(body.count) || 5;

    if (action === 'generate_products') {
      const newProducts = await db.seedSyntheticProducts(count);
      return NextResponse.json({
        success: true,
        message: `Successfully generated ${newProducts.length} dynamic synthetic catalog items!`,
        products: newProducts,
      });
    }

    if (action === 'generate_orders') {
      const newOrders = await db.seedSyntheticOrders(count);
      return NextResponse.json({
        success: true,
        message: `Successfully generated ${newOrders.length} dynamic synthetic orders & audit trail events!`,
        orders: newOrders,
      });
    }

    if (action === 'clear_database') {
      await db.clearDatabase();
      return NextResponse.json({
        success: true,
        message: 'Database reset to clean state (0 products, 0 orders).',
      });
    }

    if (action === 'reset_default') {
      await db.clearDatabase();
      const newProducts = await db.seedSyntheticProducts(6);
      await db.seedSyntheticOrders(2);
      return NextResponse.json({
        success: true,
        message: 'Database reset & seeded with fresh dynamic synthetic catalog & audit trails!',
        products: newProducts,
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown synthetic action' }, { status: 400 });
  } catch (error: any) {
    console.error('Synthetic API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
