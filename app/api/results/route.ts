import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db/connection';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    await db.calculateAndSaveResults(sessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to calculate results:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate results' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const results = await db.getSessionResults(sessionId);
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Failed to get results:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get results' },
      { status: 500 }
    );
  }
}