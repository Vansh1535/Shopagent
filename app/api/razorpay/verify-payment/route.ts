import { NextRequest, NextResponse } from 'next/server';
import { verifyRazorpaySignature } from '@/lib/razorpay/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      simulatedFailure,
    } = body;

    if (!razorpay_order_id) {
      return NextResponse.json(
        { success: false, error: 'razorpay_order_id is required' },
        { status: 400 }
      );
    }

    // Handle Simulated Failure 3: Payment Failure
    if (simulatedFailure === 'PAYMENT_FAILED') {
      await db.logAgentAction({
        action_type: 'PAYMENT_FAILED',
        input: { razorpay_order_id, razorpay_payment_id: razorpay_payment_id || 'pay_failed_sim' },
        output: { error_code: 'BAD_REQUEST_ERROR', description: 'Payment authorization failed by bank' },
        status: 'FAILED',
        reason: 'Payment transaction failed at gateway',
      });

      await db.logAgentAction({
        action_type: 'FAILURE_RECOVERY',
        input: { razorpay_order_id },
        output: { retry_offered: true, duplicate_order_prevented: true },
        status: 'RECOVERED',
        reason: 'Payment failure detected. Order kept in pending state, retry offered without duplicate order creation.',
      });

      await db.addMessage({
        role: 'assistant',
        content: `❌ **Payment Failure**: The payment for order \`${razorpay_order_id}\` didn't go through.\n\n` +
          `• **Status**: Not Paid (No funds deducted)\n` +
          `• **Safety Guarantee**: No duplicate order was created.\n` +
          `• **Action**: You can safely click **Retry Payment** below.`,
        metadata: {
          failure_type: 'PAYMENT_FAILED',
          razorpay_order_id,
        },
      });

      return NextResponse.json({
        success: false,
        verified: false,
        error: 'Payment failed at gateway',
        retryAllowed: true,
      });
    }

    // Perform Server HMAC SHA256 Signature Verification
    const isValidSignature = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValidSignature) {
      await db.logAgentAction({
        action_type: 'PAYMENT_FAILED',
        input: { razorpay_order_id, razorpay_payment_id, razorpay_signature },
        status: 'FAILED',
        reason: 'Invalid HMAC SHA256 Razorpay signature. Possible tamper attack.',
      });

      return NextResponse.json(
        { success: false, verified: false, error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // 1. Record Payment Record
    await db.recordPayment({
      id: `pay-${Date.now()}`,
      order_id: razorpay_order_id,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      status: 'captured',
      amount: 0,
      created_at: new Date().toISOString(),
    });

    // 2. Update Order Status to 'paid' & Reduce Stock
    const updatedOrder = await db.updateOrderStatus(razorpay_order_id, 'paid', razorpay_order_id);

    // 3. Clear Buyer Cart
    await db.clearCart('buyer-demo-001');

    // 4. Log PAYMENT_SUCCESS and ORDER_CONFIRMED
    await db.logAgentAction({
      action_type: 'PAYMENT_SUCCESS',
      input: { razorpay_order_id, razorpay_payment_id },
      status: 'SUCCESS',
      reason: 'Razorpay HMAC signature verified server-side',
    });

    await db.logAgentAction({
      action_type: 'ORDER_CONFIRMED',
      input: { razorpay_order_id, order_id: updatedOrder?.id },
      output: { status: 'paid', inventory_reduced: true },
      status: 'SUCCESS',
      reason: 'Order confirmed and inventory decremented',
    });

    // 5. Send Assistant Confirmation in Chat
    await db.addMessage({
      role: 'assistant',
      content: `🎉 **Payment Successful & Order Confirmed!**\n\n` +
        `• **Razorpay Payment ID**: \`${razorpay_payment_id}\`\n` +
        `• **Order ID**: \`${razorpay_order_id}\`\n` +
        `• **Status**: Paid & Verified\n\n` +
        `Your items are being prepared for dispatch. You can track this transaction in the **Audit Trail**!`,
      metadata: {
        action_type: 'ORDER_CONFIRMED',
      },
    });

    return NextResponse.json({
      success: true,
      verified: true,
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
