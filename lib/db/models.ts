// Database models matching the existing SingleStore schema

export interface SurveySession {
  session_id: string;
  user_identifier: string;
  company_name?: string;
  respondent_name?: string;
  respondent_email?: string;
  user_ip_address?: string;
  user_agent?: string;
  created_at?: Date;
  updated_at?: Date;
  last_activity?: Date;
  is_completed: boolean;
  completion_date?: Date;
  total_questions: number;
  answered_questions: number;
  completion_percentage: number;
}

export interface SurveyResponse {
  response_id: string;
  session_id: string;
  stage_name: string;
  capability: string;
  question: string;
  rating: number;
  rating_explanation?: string;
  selected_option_text?: string;
  answered_at?: Date;
  updated_at?: Date;
}

export interface StageProgress {
  progress_id: string;
  session_id: string;
  stage_name: string;
  stage_order: number;
  total_questions: number;
  answered_questions: number;
  completion_percentage: number;
  is_completed: boolean;
  started_at?: Date;
  completed_at?: Date;
  last_updated?: Date;
}

export interface UserSession {
  user_session_id: string;
  user_identifier: string;
  browser_fingerprint?: string;
  session_token?: string;
  created_at?: Date;
  expires_at?: Date;
  last_seen?: Date;
  is_active: boolean;
}

export interface SurveyResultsSummary {
  summary_id: string;
  session_id: string;
  stage_name: string;
  stage_average?: number;
  stage_scaled_score?: number;
  question_count?: number;
  answered_count?: number;
  calculated_at?: Date;
}

export interface BenchmarkData {
  stage: string;
  peer_average: number;
  best_in_class: number;
  self_assessment?: number;
}

export interface SessionOverview {
  session_id: string;
  user_identifier: string;
  company_name?: string;
  respondent_name?: string;
  respondent_email?: string;
  created_at: Date;
  last_activity: Date;
  is_completed: boolean;
  completion_date?: Date;
  completion_percentage: number;
  total_responses: number;
  stages_with_responses: number;
  overall_average_rating?: number;
}

export interface CompleteSurveyResult {
  session_id: string;
  user_identifier: string;
  company_name?: string;
  respondent_name?: string;
  completion_date?: Date;
  stage_name: string;
  stage_average: number;
  scaled_score: number;
  answered_questions: number;
  total_questions: number;
}

export enum OperationType {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE'
}

export interface AuditLogEntry {
  log_id: string;
  session_id?: string;
  table_name: string;
  operation_type: OperationType;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  user_identifier?: string;
  ip_address?: string;
  user_agent?: string;
  created_at?: Date;
}