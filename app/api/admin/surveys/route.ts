import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth/admin';
import { getAllSessions, SurveyListOptions } from '@/lib/db/connection';

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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const options: SurveyListOptions = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      search: searchParams.get('search') || '',
      status: (searchParams.get('status') as 'completed' | 'in_progress' | 'all') || 'all',
      sortBy: (searchParams.get('sortBy') as SurveyListOptions['sortBy']) || 'created_at',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    };

    const result = await getAllSessions(options);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Failed to get surveys:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get surveys' },
      { status: 500 }
    );
  }
}
