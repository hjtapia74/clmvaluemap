import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth/admin';
import { deleteResponseByKey } from '@/lib/db/connection';

export async function DELETE(request: NextRequest) {
  try {
    // Verify admin session
    const sessionId = request.cookies.get('admin_session')?.value;
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const session = await verifyAdminSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    const { sessionId: surveySessionId, stageName, capability } = await request.json();

    if (!surveySessionId || !stageName || !capability) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: sessionId, stageName, capability' },
        { status: 400 }
      );
    }

    const deleted = await deleteResponseByKey(surveySessionId, stageName, capability);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Response not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete response:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete response' },
      { status: 500 }
    );
  }
}
