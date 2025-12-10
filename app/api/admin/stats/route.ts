import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth/admin';
import { getDashboardStats, getRecentSessions } from '@/lib/db/connection';

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

    // Get dashboard stats
    const stats = await getDashboardStats();
    const recentSessions = await getRecentSessions(10);

    return NextResponse.json({
      success: true,
      stats,
      recentSessions,
    });
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get dashboard stats' },
      { status: 500 }
    );
  }
}
