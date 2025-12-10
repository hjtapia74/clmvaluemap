import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth/admin';
import { exportAllSurveyData, getSessionWithDetails } from '@/lib/db/connection';

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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'surveys';
    const surveyId = searchParams.get('sessionId');

    let csvContent = '';
    let filename = '';

    if (surveyId) {
      // Export single survey
      const details = await getSessionWithDetails(surveyId);
      if (!details) {
        return NextResponse.json(
          { success: false, error: 'Survey not found' },
          { status: 404 }
        );
      }

      if (type === 'responses') {
        // Export responses for single survey
        const headers = ['Stage', 'Capability', 'Rating', 'Rating Explanation', 'Answered At'];
        const rows = details.responses.map(r => [
          r.stage_name,
          r.capability,
          r.rating?.toString() || '',
          r.rating_explanation || '',
          r.answered_at?.toString() || '',
        ]);
        csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))].join('\n');
        filename = `survey-responses-${surveyId}.csv`;
      } else {
        // Export survey session info
        const s = details.session;
        const headers = ['Session ID', 'Company', 'Name', 'Email', 'Completed', 'Completion %', 'Created At', 'Last Activity'];
        const row = [
          s.session_id,
          s.company_name || '',
          s.respondent_name || '',
          s.respondent_email || '',
          s.is_completed ? 'Yes' : 'No',
          s.completion_percentage?.toString() || '0',
          s.created_at?.toString() || '',
          s.last_activity?.toString() || '',
        ];
        csvContent = [headers.join(','), row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')].join('\n');
        filename = `survey-${surveyId}.csv`;
      }
    } else {
      // Export all data
      const data = await exportAllSurveyData();

      if (type === 'responses') {
        // Export all responses
        const headers = ['Session ID', 'Stage', 'Capability', 'Rating', 'Rating Explanation', 'Answered At'];
        const rows = data.responses.map(r => [
          r.session_id,
          r.stage_name,
          r.capability,
          r.rating?.toString() || '',
          r.rating_explanation || '',
          r.answered_at?.toString() || '',
        ]);
        csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))].join('\n');
        filename = `all-responses-${new Date().toISOString().split('T')[0]}.csv`;
      } else {
        // Export all surveys
        const headers = ['Session ID', 'Company', 'Name', 'Email', 'Completed', 'Completion %', 'Total Questions', 'Answered Questions', 'Created At', 'Last Activity'];
        const rows = data.sessions.map(s => [
          s.session_id,
          s.company_name || '',
          s.respondent_name || '',
          s.respondent_email || '',
          s.is_completed ? 'Yes' : 'No',
          s.completion_percentage?.toString() || '0',
          s.total_questions?.toString() || '0',
          s.answered_questions?.toString() || '0',
          s.created_at?.toString() || '',
          s.last_activity?.toString() || '',
        ]);
        csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))].join('\n');
        filename = `all-surveys-${new Date().toISOString().split('T')[0]}.csv`;
      }
    }

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Failed to export data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
