import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const orders = await db.getOrders();
    const paidOrders = orders.filter((o) => o.status === 'paid');

    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const activeOrdersCount = orders.length;
    const avgOrderValue = paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0;

    return NextResponse.json({
      success: true,
      orders,
      stats: {
        totalRevenue,
        activeOrdersCount,
        paidOrdersCount: paidOrders.length,
        avgOrderValue,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
