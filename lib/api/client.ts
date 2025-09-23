import { SurveySession, SurveyResponse, StageProgress, SurveyResultsSummary } from '@/lib/db/models';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || '';

// Session API calls
export async function createSession(session: SurveySession): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  const response = await fetch(`${BASE_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  });

  return response.json();
}

export async function getSession(sessionId: string): Promise<{ success: boolean; session?: SurveySession; error?: string }> {
  const response = await fetch(`${BASE_URL}/api/session?sessionId=${sessionId}`);
  return response.json();
}

export async function findSessionByEmail(email: string): Promise<{ success: boolean; session?: SurveySession; error?: string }> {
  const response = await fetch(`${BASE_URL}/api/session?email=${encodeURIComponent(email)}`);
  return response.json();
}

export async function findSessionByCompany(company: string): Promise<{ success: boolean; session?: SurveySession; error?: string }> {
  const response = await fetch(`${BASE_URL}/api/session?company=${encodeURIComponent(company)}`);
  return response.json();
}

export async function findAllSessionsByCompany(company: string): Promise<{ success: boolean; sessions?: SurveySession[]; error?: string }> {
  const response = await fetch(`${BASE_URL}/api/session?company=${encodeURIComponent(company)}&all=true`);
  return response.json();
}

// Response API calls
export async function saveResponse(surveyResponse: SurveyResponse): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${BASE_URL}/api/response`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(surveyResponse),
  });

  return response.json();
}

export async function getSessionResponses(sessionId: string): Promise<{ success: boolean; responses?: SurveyResponse[]; error?: string }> {
  const response = await fetch(`${BASE_URL}/api/response?sessionId=${sessionId}`);
  return response.json();
}

// Progress API calls
export async function updateStageProgress(progress: StageProgress): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${BASE_URL}/api/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(progress),
  });

  return response.json();
}

export async function getSessionProgress(sessionId: string): Promise<{ success: boolean; progress?: StageProgress[]; error?: string }> {
  const response = await fetch(`${BASE_URL}/api/progress?sessionId=${sessionId}`);
  return response.json();
}

// Results API calls
export async function calculateAndSaveResults(sessionId: string): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${BASE_URL}/api/results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });

  return response.json();
}

export async function getSessionResults(sessionId: string): Promise<{ success: boolean; results?: SurveyResultsSummary[]; error?: string }> {
  const response = await fetch(`${BASE_URL}/api/results?sessionId=${sessionId}`);
  return response.json();
}