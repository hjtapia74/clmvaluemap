import { NextRequest, NextResponse } from 'next/server';
import { SurveySession } from '@/lib/db/models';
import * as db from '@/lib/db/connection';

export async function POST(request: NextRequest) {
  try {
    const session: SurveySession = await request.json();

    await db.createSession(session);
    return NextResponse.json({ success: true, sessionId: session.session_id });
  } catch (error) {
    console.error('Failed to create session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const email = searchParams.get('email');
    const company = searchParams.get('company');
    const all = searchParams.get('all') === 'true';

    let session: SurveySession | null = null;
    let sessions: SurveySession[] = [];

    if (sessionId) {
      session = await db.getSession(sessionId);
    } else if (email) {
      session = await db.findSessionByEmail(email);
    } else if (company) {
      if (all) {
        sessions = await db.findAllSessionsByCompany(company);
      } else {
        session = await db.findSessionByCompany(company);
      }
    }

    // Handle multiple sessions response
    if (all && company && sessions.length > 0) {
      return NextResponse.json({ success: true, sessions });
    }

    if (session) {
      // Update activity when session is accessed
      await db.updateSessionActivity(session.session_id);
      return NextResponse.json({ success: true, session });
    } else {
      return NextResponse.json(
        { success: false, error: all ? 'No sessions found' : 'Session not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Failed to get session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get session' },
      { status: 500 }
    );
  }
}