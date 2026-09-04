import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Product } from '@/lib/types';
import { DEMO_SELLER } from '@/lib/seed';

export async function GET() {
  try {
    const products = await db.getProducts();
    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, category, price, stock, description, image_url, features } = body;

    if (!name || price === undefined) {
      return NextResponse.json(
        { success: false, error: 'Product name and price are required' },
        { status: 400 }
      );
    }

    const newProduct: Product = {
      id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      seller_id: DEMO_SELLER.id,
      name,
      description: description || `${name} - High quality product.`,
      category: category || 'electronics',
      price: Number(price),
      currency: 'INR',
      stock: Number(stock || 10),
      image_url: image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
      features: features || ['1 Year Warranty', 'Fast Delivery'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_ai_ready: false,
    };

    const saved = await db.addProduct(newProduct);

    return NextResponse.json({ success: true, product: saved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
