import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth/admin';
import { getAnalyticsData } from '@/lib/db/connection';

export async function GET(request: NextRequest) {
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

    const analytics = await getAnalyticsData();

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error('Failed to get analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get analytics' },
      { status: 500 }
    );
  }
}
