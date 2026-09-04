import { NextRequest, NextResponse } from 'next/server';
import { processBuyerMessage } from '@/lib/ai/agent';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, simulatedFailure } = body;

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Record user message into chat history
    await db.addMessage({
      role: 'user',
      content: query,
    });

    const history = await db.getMessages();

    // Process message through agent NLU and tool execution engine
    const response = await processBuyerMessage(query, history, simulatedFailure);

    return NextResponse.json({
      success: true,
      message: response.message,
      recommendedProducts: response.recommendedProducts,
      pendingCheckout: response.pendingCheckout,
    });
  } catch (error: any) {
    console.error('Error in agent chat endpoint:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
