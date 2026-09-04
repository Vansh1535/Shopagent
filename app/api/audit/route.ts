import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const actions = await db.getAgentActions();
    return NextResponse.json({
      success: true,
      actions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch audit actions' },
      { status: 500 }
    );
  }
}
