import { NextRequest, NextResponse } from 'next/server';
import { createRazorpayOrder } from '@/lib/razorpay/server';
import { validateTransactionPolicy } from '@/lib/policy/engine';
import { db } from '@/lib/db';
import { DEMO_BUYER } from '@/lib/seed';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, quantity = 1, userConfirmed = true } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'productId is required' },
        { status: 400 }
      );
    }

    // 1. Fetch authoritative product from database
    const product = await db.getProductById(productId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // 2. Validate Commerce Policy & Inventory
    const policyResult = await validateTransactionPolicy(
      product.seller_id,
      product,
      quantity,
      product.price,
      userConfirmed
    );

    if (!policyResult.allowed) {
      await db.logAgentAction({
        action_type: 'POLICY_CHECK',
        input: { productId, price: product.price, quantity },
        status: 'POLICY_REJECTED',
        reason: policyResult.reason,
      });

      return NextResponse.json(
        { success: false, error: policyResult.reason, code: policyResult.code },
        { status: 422 }
      );
    }

    const totalAmount = product.price * quantity;

    // 3. Create Razorpay Test Order via Server SDK
    const receiptId = `receipt_${Date.now()}`;
    const rzpOrder = await createRazorpayOrder(totalAmount, receiptId);

    // 4. Record order state in DB
    const newOrder = await db.createOrder({
      id: `ord-${Date.now()}`,
      buyer_id: DEMO_BUYER.id,
      seller_id: product.seller_id,
      razorpay_order_id: rzpOrder.id,
      status: 'created',
      total_amount: totalAmount,
      currency: 'INR',
      items: [
        {
          id: `item-${Date.now()}`,
          order_id: `ord-${Date.now()}`,
          product_id: product.id,
          quantity,
          unit_price: product.price,
          product_name: product.name,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 5. Log in Agent Audit Trail
    await db.logAgentAction({
      action_type: 'RAZORPAY_ORDER_CREATED',
      input: {
        product_id: product.id,
        product_name: product.name,
        unit_price: product.price,
        quantity,
        total_amount: totalAmount,
      },
      output: {
        razorpay_order_id: rzpOrder.id,
        receipt: receiptId,
        order_db_id: newOrder.id,
      },
      status: 'SUCCESS',
      reason: 'Server validated price & stock, created Razorpay Order ID',
    });

    return NextResponse.json({
      success: true,
      order: rzpOrder,
      dbOrderId: newOrder.id,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || 'rzp_test_demo123456',
      amount: totalAmount,
      product,
    });
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
