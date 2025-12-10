import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth/admin';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('admin_session')?.value;

    if (!sessionId) {
      return NextResponse.json({
        success: true,
        authenticated: false,
      });
    }

    const session = await verifyAdminSession(sessionId);

    if (!session) {
      // Clear invalid cookie
      const response = NextResponse.json({
        success: true,
        authenticated: false,
      });

      response.cookies.set('admin_session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 0,
      });

      return response;
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      session: {
        created_at: session.created_at,
        expires_at: session.expires_at,
        last_activity: session.last_activity,
      },
    });
  } catch (error) {
    console.error('Session verification failed:', error);
    return NextResponse.json(
      { success: false, error: 'Session verification failed' },
      { status: 500 }
    );
  }
}
