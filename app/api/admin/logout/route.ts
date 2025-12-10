import { NextRequest, NextResponse } from 'next/server';
import { deleteAdminSession } from '@/lib/auth/admin';

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('admin_session')?.value;

    if (sessionId) {
      // Delete session from database
      await deleteAdminSession(sessionId);
    }

    // Clear the cookie
    const response = NextResponse.json({ success: true });

    response.cookies.set('admin_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0, // Expire immediately
    });

    return response;
  } catch (error) {
    console.error('Logout failed:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}
