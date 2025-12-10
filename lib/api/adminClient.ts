import { SurveySession, SurveyResponse, StageProgress, SurveyResultsSummary } from '@/lib/db/models';
import { AdminDashboardStats, AnalyticsData } from '@/lib/db/connection';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || '';

// ============================================
// Authentication
// ============================================

export async function login(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return response.json();
}

export async function logout(): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${BASE_URL}/api/admin/logout`, {
    method: 'POST',
  });
  return response.json();
}

export async function verifySession(): Promise<{
  success: boolean;
  authenticated: boolean;
  error?: string;
}> {
  const response = await fetch(`${BASE_URL}/api/admin/verify`);
  return response.json();
}

// ============================================
// Dashboard Stats
// ============================================

export async function getDashboardStats(): Promise<{
  success: boolean;
  stats?: AdminDashboardStats;
  recentSessions?: SurveySession[];
  error?: string;
}> {
  const response = await fetch(`${BASE_URL}/api/admin/stats`);
  return response.json();
}

// ============================================
// Survey Management
// ============================================

export interface SurveyListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'completed' | 'in_progress' | 'all';
  sortBy?: 'created_at' | 'last_activity' | 'completion_percentage' | 'company_name';
  sortOrder?: 'asc' | 'desc';
}

export interface SurveyListResponse {
  success: boolean;
  sessions?: SurveySession[];
  total?: number;
  page?: number;
  totalPages?: number;
  error?: string;
}

export async function getSurveys(params: SurveyListParams = {}): Promise<SurveyListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const response = await fetch(`${BASE_URL}/api/admin/surveys?${searchParams.toString()}`);
  return response.json();
}

export interface SurveyDetailsResponse {
  success: boolean;
  session?: SurveySession;
  responses?: SurveyResponse[];
  progress?: StageProgress[];
  results?: SurveyResultsSummary[];
  error?: string;
}

export async function getSurveyDetails(id: string): Promise<SurveyDetailsResponse> {
  const response = await fetch(`${BASE_URL}/api/admin/surveys/${id}`);
  return response.json();
}

export async function deleteSurvey(id: string): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${BASE_URL}/api/admin/surveys/${id}`, {
    method: 'DELETE',
  });
  return response.json();
}

export async function updateSurvey(
  id: string,
  updates: Partial<Pick<SurveySession, 'company_name' | 'respondent_name' | 'respondent_email'>>
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${BASE_URL}/api/admin/surveys/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return response.json();
}

// ============================================
// Response Management
// ============================================

export async function deleteResponse(
  sessionId: string,
  stageName: string,
  capability: string
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${BASE_URL}/api/admin/responses`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, stageName, capability }),
  });
  return response.json();
}

// ============================================
// Analytics
// ============================================

export async function getAnalytics(): Promise<{
  success: boolean;
  analytics?: AnalyticsData;
  error?: string;
}> {
  const response = await fetch(`${BASE_URL}/api/admin/analytics`);
  return response.json();
}

// ============================================
// Export
// ============================================

export async function exportData(
  type: 'surveys' | 'responses',
  sessionId?: string
): Promise<Blob> {
  const params = new URLSearchParams();
  params.set('type', type);
  if (sessionId) params.set('sessionId', sessionId);

  const response = await fetch(`${BASE_URL}/api/admin/export?${params.toString()}`);
  return response.blob();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
