import { NextRequest, NextResponse } from 'next/server';
import { StageProgress } from '@/lib/db/models';
import * as db from '@/lib/db/connection';

export async function POST(request: NextRequest) {
  try {
    const progress: StageProgress = await request.json();
    await db.updateStageProgress(progress);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update progress' },
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

    const progress = await db.getSessionProgress(sessionId);
    return NextResponse.json({ success: true, progress });
  } catch (error) {
    console.error('Failed to get progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get progress' },
      { status: 500 }
    );
  }
}