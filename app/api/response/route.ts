import { NextRequest, NextResponse } from 'next/server';
import { SurveyResponse } from '@/lib/db/models';
import * as db from '@/lib/db/connection';

export async function POST(request: NextRequest) {
  try {
    const response: SurveyResponse = await request.json();
    await db.saveResponse(response);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save response:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save response' },
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

    const responses = await db.getSessionResponses(sessionId);
    return NextResponse.json({ success: true, responses });
  } catch (error) {
    console.error('Failed to get responses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get responses' },
      { status: 500 }
    );
  }
}