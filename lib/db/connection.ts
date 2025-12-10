import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import {
  SurveySession,
  SurveyResponse,
  StageProgress,
  UserSession,
  SurveyResultsSummary,
  AuditLogEntry,
  OperationType
} from './models';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'survey.db');
    console.log('Opening SQLite database at:', dbPath);

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Initialize schema if needed
    initializeSchema();
  }

  return db;
}

function initializeSchema() {
  const db = getDatabase();

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS survey_sessions (
      session_id VARCHAR(36) PRIMARY KEY,
      user_identifier VARCHAR(255),
      company_name VARCHAR(255),
      respondent_name VARCHAR(255),
      respondent_email VARCHAR(255),
      user_ip_address VARCHAR(45),
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_completed BOOLEAN DEFAULT 0,
      total_questions INTEGER DEFAULT 0,
      answered_questions INTEGER DEFAULT 0,
      completion_percentage DECIMAL(5,2) DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS survey_responses (
      response_id VARCHAR(36),
      session_id VARCHAR(36) NOT NULL,
      stage_name VARCHAR(255),
      capability TEXT,
      question TEXT,
      rating INTEGER,
      rating_explanation TEXT,
      selected_option_text TEXT,
      answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (session_id, stage_name, capability),
      FOREIGN KEY (session_id) REFERENCES survey_sessions(session_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stage_progress (
      progress_id VARCHAR(255),
      session_id VARCHAR(36) NOT NULL,
      stage_name VARCHAR(255) NOT NULL,
      stage_order INTEGER DEFAULT 0,
      total_questions INTEGER DEFAULT 0,
      answered_questions INTEGER DEFAULT 0,
      completion_percentage DECIMAL(5,2) DEFAULT 0,
      is_completed BOOLEAN DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (session_id, stage_name),
      FOREIGN KEY (session_id) REFERENCES survey_sessions(session_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS survey_results_summary (
      summary_id VARCHAR(36) PRIMARY KEY,
      session_id VARCHAR(36) NOT NULL,
      stage_name VARCHAR(255),
      stage_average DECIMAL(3,2),
      stage_scaled_score DECIMAL(5,2),
      question_count INTEGER,
      answered_count INTEGER,
      calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES survey_sessions(session_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      user_session_id VARCHAR(36) PRIMARY KEY,
      user_identifier VARCHAR(255),
      browser_fingerprint TEXT,
      session_token VARCHAR(255) UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      log_id VARCHAR(36) PRIMARY KEY,
      table_name VARCHAR(255),
      operation_type VARCHAR(50),
      old_values TEXT,
      new_values TEXT,
      user_identifier VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      session_id VARCHAR(64) PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address VARCHAR(45),
      user_agent TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_email ON survey_sessions(respondent_email);
    CREATE INDEX IF NOT EXISTS idx_sessions_company ON survey_sessions(company_name);
    CREATE INDEX IF NOT EXISTS idx_responses_session ON survey_responses(session_id);
    CREATE INDEX IF NOT EXISTS idx_progress_session ON stage_progress(session_id);
    CREATE INDEX IF NOT EXISTS idx_results_session ON survey_results_summary(session_id);
  `);

  console.log('SQLite database schema initialized');
}

// Session Management Functions
export async function createSession(session: SurveySession): Promise<void> {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO survey_sessions
    (session_id, user_identifier, company_name, respondent_name,
     respondent_email, user_ip_address, user_agent, created_at,
     updated_at, last_activity, is_completed, total_questions,
     answered_questions, completion_percentage)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'), ?, ?, ?, ?)
  `);

  stmt.run(
    session.session_id,
    session.user_identifier,
    session.company_name,
    session.respondent_name,
    session.respondent_email,
    session.user_ip_address,
    session.user_agent,
    session.is_completed ? 1 : 0,
    session.total_questions,
    session.answered_questions,
    session.completion_percentage
  );

  // Log the operation
  await logOperation('survey_sessions', OperationType.INSERT, null, session, session.user_identifier);
}

export async function getSession(sessionId: string): Promise<SurveySession | null> {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM survey_sessions WHERE session_id = ?
  `);

  const result = stmt.get(sessionId) as SurveySession | undefined;
  return result || null;
}

export async function findSessionByEmail(email: string): Promise<SurveySession | null> {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM survey_sessions
    WHERE respondent_email = ?
    ORDER BY created_at DESC
    LIMIT 1
  `);

  const result = stmt.get(email) as SurveySession | undefined;
  return result || null;
}

export async function findSessionByCompany(company: string): Promise<SurveySession | null> {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM survey_sessions
    WHERE company_name = ?
    ORDER BY created_at DESC
    LIMIT 1
  `);

  const result = stmt.get(company) as SurveySession | undefined;
  return result || null;
}

export async function findAllSessionsByCompany(company: string): Promise<SurveySession[]> {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM survey_sessions
    WHERE company_name = ?
    ORDER BY created_at DESC
  `);

  return stmt.all(company) as SurveySession[];
}

export async function updateSessionActivity(sessionId: string): Promise<void> {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE survey_sessions
    SET last_activity = datetime('now'), updated_at = datetime('now')
    WHERE session_id = ?
  `);

  stmt.run(sessionId);
}

// Response Management Functions
export async function saveResponse(response: SurveyResponse): Promise<void> {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO survey_responses
    (response_id, session_id, stage_name, capability, question,
     rating, rating_explanation, selected_option_text, answered_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(session_id, stage_name, capability) DO UPDATE SET
      rating = excluded.rating,
      selected_option_text = excluded.selected_option_text,
      updated_at = datetime('now')
  `);

  stmt.run(
    response.response_id,
    response.session_id,
    response.stage_name,
    response.capability,
    response.question,
    response.rating,
    response.rating_explanation,
    response.selected_option_text
  );

  // Update session activity
  await updateSessionActivity(response.session_id);
}

export async function getSessionResponses(sessionId: string): Promise<SurveyResponse[]> {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM survey_responses
    WHERE session_id = ?
    ORDER BY stage_name, capability
  `);

  return stmt.all(sessionId) as SurveyResponse[];
}

// Progress Tracking Functions
export async function updateStageProgress(progress: StageProgress): Promise<void> {
  console.log('Updating stage progress:', {
    session_id: progress.session_id,
    stage_name: progress.stage_name,
    stage_order: progress.stage_order,
    completion_percentage: progress.completion_percentage
  });

  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO stage_progress
    (session_id, stage_name, stage_order, total_questions,
     answered_questions, completion_percentage, is_completed)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id, stage_name) DO UPDATE SET
      answered_questions = excluded.answered_questions,
      completion_percentage = excluded.completion_percentage,
      is_completed = excluded.is_completed,
      last_updated = datetime('now')
  `);

  stmt.run(
    progress.session_id,
    progress.stage_name,
    progress.stage_order || 0,
    progress.total_questions,
    progress.answered_questions,
    progress.completion_percentage,
    progress.is_completed ? 1 : 0
  );
}

export async function getSessionProgress(sessionId: string): Promise<StageProgress[]> {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM stage_progress
    WHERE session_id = ?
    ORDER BY stage_name
  `);

  return stmt.all(sessionId) as StageProgress[];
}

// Results Calculation Functions
export async function calculateAndSaveResults(sessionId: string): Promise<void> {
  const db = getDatabase();

  // First, delete existing results for this session to avoid duplicates
  const deleteStmt = db.prepare(`DELETE FROM survey_results_summary WHERE session_id = ?`);
  deleteStmt.run(sessionId);

  // Calculate results for each stage
  const insertStmt = db.prepare(`
    INSERT INTO survey_results_summary (summary_id, session_id, stage_name,
      stage_average, stage_scaled_score, question_count, answered_count, calculated_at)
    SELECT
      lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
             substr(hex(randomblob(2)),2) || '-' ||
             substr('89ab',abs(random()) % 4 + 1, 1) ||
             substr(hex(randomblob(2)),2) || '-' ||
             hex(randomblob(6))) as summary_id,
      session_id,
      stage_name,
      AVG(rating) as stage_average,
      (AVG(rating) - 1) * 25 as stage_scaled_score,
      COUNT(*) as question_count,
      COUNT(rating) as answered_count,
      datetime('now') as calculated_at
    FROM survey_responses
    WHERE session_id = ?
    GROUP BY session_id, stage_name
  `);

  insertStmt.run(sessionId);
}

export async function getSessionResults(sessionId: string): Promise<SurveyResultsSummary[]> {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM survey_results_summary
    WHERE session_id = ?
    ORDER BY stage_name
  `);

  return stmt.all(sessionId) as SurveyResultsSummary[];
}

// Audit Logging
async function logOperation(
  tableName: string,
  operation: OperationType,
  oldValues: any,
  newValues: any,
  userIdentifier?: string
): Promise<void> {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO audit_log
    (log_id, table_name, operation_type, old_values, new_values,
     user_identifier, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const logId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  stmt.run(
    logId,
    tableName,
    operation,
    oldValues ? JSON.stringify(oldValues) : null,
    newValues ? JSON.stringify(newValues) : null,
    userIdentifier
  );
}

// User Session Management
export async function createUserSession(userSession: UserSession): Promise<void> {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO user_sessions
    (user_session_id, user_identifier, browser_fingerprint,
     session_token, created_at, expires_at, last_seen, is_active)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now', '+30 days'), datetime('now'), ?)
  `);

  stmt.run(
    userSession.user_session_id,
    userSession.user_identifier,
    userSession.browser_fingerprint,
    userSession.session_token,
    userSession.is_active ? 1 : 0
  );
}

export async function getUserSession(sessionToken: string): Promise<UserSession | null> {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM user_sessions
    WHERE session_token = ? AND is_active = 1 AND expires_at > datetime('now')
  `);

  const result = stmt.get(sessionToken) as UserSession | undefined;
  return result || null;
}

// ============================================
// Admin Dashboard Functions
// ============================================

export interface AdminDashboardStats {
  totalSurveys: number;
  completedSurveys: number;
  inProgressSurveys: number;
  averageCompletion: number;
  totalResponses: number;
  surveysThisWeek: number;
  surveysThisMonth: number;
}

export interface SurveyListOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'completed' | 'in_progress' | 'all';
  sortBy?: 'created_at' | 'last_activity' | 'completion_percentage' | 'company_name';
  sortOrder?: 'asc' | 'desc';
}

export interface SurveyListResult {
  sessions: SurveySession[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SessionWithDetails {
  session: SurveySession;
  responses: SurveyResponse[];
  progress: StageProgress[];
  results: SurveyResultsSummary[];
}

export interface AnalyticsData {
  completionRates: { date: string; count: number; completed: number }[];
  stageScores: { stage: string; avgScore: number; count: number }[];
  responseDistribution: { rating: number; count: number }[];
  companySurveys: { company: string; count: number }[];
}

/**
 * Get dashboard statistics
 * Calculates completion from stage_progress table for accurate stats
 */
export async function getDashboardStats(): Promise<AdminDashboardStats> {
  const db = getDatabase();

  // Total surveys
  const totalStmt = db.prepare('SELECT COUNT(*) as count FROM survey_sessions');
  const totalResult = totalStmt.get() as { count: number };

  // Calculate completion stats from stage_progress
  const completionStmt = db.prepare(`
    SELECT
      COUNT(*) as total_sessions,
      SUM(CASE WHEN calc_is_completed = 1 THEN 1 ELSE 0 END) as completed_count,
      AVG(calc_completion) as avg_completion
    FROM (
      SELECT
        s.session_id,
        CASE
          WHEN COUNT(p.session_id) = 0 THEN 0
          ELSE (SUM(CASE WHEN p.is_completed = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(p.session_id))
        END as calc_completion,
        CASE
          WHEN COUNT(p.session_id) = 0 THEN 0
          WHEN SUM(CASE WHEN p.is_completed = 1 THEN 1 ELSE 0 END) = COUNT(p.session_id) THEN 1
          ELSE 0
        END as calc_is_completed
      FROM survey_sessions s
      LEFT JOIN stage_progress p ON s.session_id = p.session_id
      GROUP BY s.session_id
    )
  `);
  const completionResult = completionStmt.get() as {
    total_sessions: number;
    completed_count: number;
    avg_completion: number | null;
  };

  // Total responses
  const responsesStmt = db.prepare('SELECT COUNT(*) as count FROM survey_responses');
  const responsesResult = responsesStmt.get() as { count: number };

  // Surveys this week
  const weekStmt = db.prepare(`
    SELECT COUNT(*) as count FROM survey_sessions
    WHERE created_at >= datetime('now', '-7 days')
  `);
  const weekResult = weekStmt.get() as { count: number };

  // Surveys this month
  const monthStmt = db.prepare(`
    SELECT COUNT(*) as count FROM survey_sessions
    WHERE created_at >= datetime('now', '-30 days')
  `);
  const monthResult = monthStmt.get() as { count: number };

  return {
    totalSurveys: totalResult.count,
    completedSurveys: completionResult.completed_count || 0,
    inProgressSurveys: totalResult.count - (completionResult.completed_count || 0),
    averageCompletion: completionResult.avg_completion || 0,
    totalResponses: responsesResult.count,
    surveysThisWeek: weekResult.count,
    surveysThisMonth: monthResult.count,
  };
}

/**
 * Get all sessions with pagination and filters
 * Calculates completion from stage_progress table for accurate status
 */
export async function getAllSessions(options: SurveyListOptions = {}): Promise<SurveyListResult> {
  const db = getDatabase();
  const {
    page = 1,
    limit = 20,
    search = '',
    status = 'all',
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = options;

  const offset = (page - 1) * limit;

  // Build WHERE clause
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (search) {
    conditions.push(`(s.company_name LIKE ? OR s.respondent_email LIKE ? OR s.respondent_name LIKE ?)`);
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  // Status filter based on calculated completion
  if (status === 'completed') {
    conditions.push('COALESCE(p.calc_completion, 0) >= 100');
  } else if (status === 'in_progress') {
    conditions.push('COALESCE(p.calc_completion, 0) < 100');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Validate sortBy to prevent SQL injection
  const validSortColumns = ['created_at', 'last_activity', 'completion_percentage', 'company_name'];
  const safeSort = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  // Map completion_percentage to calculated field
  const sortColumn = safeSort === 'completion_percentage' ? 'calc_completion' : `s.${safeSort}`;
  const safeOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  // Subquery to calculate completion from stage_progress
  const progressSubquery = `
    SELECT
      session_id,
      CASE
        WHEN COUNT(*) = 0 THEN 0
        ELSE (SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*))
      END as calc_completion,
      CASE
        WHEN COUNT(*) = 0 THEN 0
        WHEN SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) = COUNT(*) THEN 1
        ELSE 0
      END as calc_is_completed
    FROM stage_progress
    GROUP BY session_id
  `;

  // Get total count
  const countStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM survey_sessions s
    LEFT JOIN (${progressSubquery}) p ON s.session_id = p.session_id
    ${whereClause}
  `);
  const countResult = countStmt.get(...params) as { count: number };
  const total = countResult.count;

  // Get paginated results with calculated completion
  const dataStmt = db.prepare(`
    SELECT
      s.*,
      COALESCE(p.calc_completion, 0) as completion_percentage,
      COALESCE(p.calc_is_completed, 0) as is_completed
    FROM survey_sessions s
    LEFT JOIN (${progressSubquery}) p ON s.session_id = p.session_id
    ${whereClause}
    ORDER BY ${sortColumn} ${safeOrder}
    LIMIT ? OFFSET ?
  `);
  const sessions = dataStmt.all(...params, limit, offset) as SurveySession[];

  return {
    sessions,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get session with all related data
 */
export async function getSessionWithDetails(sessionId: string): Promise<SessionWithDetails | null> {
  const session = await getSession(sessionId);
  if (!session) return null;

  const responses = await getSessionResponses(sessionId);
  const progress = await getSessionProgress(sessionId);
  const results = await getSessionResults(sessionId);

  return {
    session,
    responses,
    progress,
    results,
  };
}

/**
 * Delete a session and all related data (cascades via foreign keys)
 */
export async function deleteSessionById(sessionId: string): Promise<boolean> {
  const db = getDatabase();

  // Get session for audit log
  const session = await getSession(sessionId);
  if (!session) return false;

  const stmt = db.prepare('DELETE FROM survey_sessions WHERE session_id = ?');
  const result = stmt.run(sessionId);

  // Log the deletion
  await logOperation('survey_sessions', OperationType.DELETE, session, null, 'admin');

  return result.changes > 0;
}

/**
 * Delete a specific response
 */
export async function deleteResponseByKey(
  sessionId: string,
  stageName: string,
  capability: string
): Promise<boolean> {
  const db = getDatabase();

  // Get response for audit log
  const getStmt = db.prepare(`
    SELECT * FROM survey_responses
    WHERE session_id = ? AND stage_name = ? AND capability = ?
  `);
  const response = getStmt.get(sessionId, stageName, capability) as SurveyResponse | undefined;

  if (!response) return false;

  const deleteStmt = db.prepare(`
    DELETE FROM survey_responses
    WHERE session_id = ? AND stage_name = ? AND capability = ?
  `);
  const result = deleteStmt.run(sessionId, stageName, capability);

  // Log the deletion
  await logOperation('survey_responses', OperationType.DELETE, response, null, 'admin');

  return result.changes > 0;
}

/**
 * Update session metadata
 */
export async function updateSessionMetadata(
  sessionId: string,
  updates: Partial<Pick<SurveySession, 'company_name' | 'respondent_name' | 'respondent_email'>>
): Promise<boolean> {
  const db = getDatabase();

  // Get current session for audit log
  const oldSession = await getSession(sessionId);
  if (!oldSession) return false;

  const updateFields: string[] = [];
  const params: (string | number)[] = [];

  if (updates.company_name !== undefined) {
    updateFields.push('company_name = ?');
    params.push(updates.company_name);
  }
  if (updates.respondent_name !== undefined) {
    updateFields.push('respondent_name = ?');
    params.push(updates.respondent_name);
  }
  if (updates.respondent_email !== undefined) {
    updateFields.push('respondent_email = ?');
    params.push(updates.respondent_email);
  }

  if (updateFields.length === 0) return false;

  updateFields.push('updated_at = datetime(\'now\')');
  params.push(sessionId);

  const stmt = db.prepare(`
    UPDATE survey_sessions
    SET ${updateFields.join(', ')}
    WHERE session_id = ?
  `);
  const result = stmt.run(...params);

  // Log the update
  const newSession = await getSession(sessionId);
  await logOperation('survey_sessions', OperationType.UPDATE, oldSession, newSession, 'admin');

  return result.changes > 0;
}

/**
 * Get analytics data for charts
 */
export async function getAnalyticsData(): Promise<AnalyticsData> {
  const db = getDatabase();

  // Completion rates by day (last 30 days)
  const completionStmt = db.prepare(`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as count,
      SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed
    FROM survey_sessions
    WHERE created_at >= datetime('now', '-30 days')
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);
  const completionRates = completionStmt.all() as { date: string; count: number; completed: number }[];

  // Stage scores
  const stageStmt = db.prepare(`
    SELECT
      stage_name as stage,
      AVG(stage_average) as avgScore,
      COUNT(*) as count
    FROM survey_results_summary
    GROUP BY stage_name
    ORDER BY stage_name
  `);
  const stageScores = stageStmt.all() as { stage: string; avgScore: number; count: number }[];

  // Response distribution (rating counts)
  const ratingStmt = db.prepare(`
    SELECT
      rating,
      COUNT(*) as count
    FROM survey_responses
    WHERE rating IS NOT NULL
    GROUP BY rating
    ORDER BY rating
  `);
  const responseDistribution = ratingStmt.all() as { rating: number; count: number }[];

  // Surveys per company (top 10)
  const companyStmt = db.prepare(`
    SELECT
      company_name as company,
      COUNT(*) as count
    FROM survey_sessions
    WHERE company_name IS NOT NULL AND company_name != ''
    GROUP BY company_name
    ORDER BY count DESC
    LIMIT 10
  `);
  const companySurveys = companyStmt.all() as { company: string; count: number }[];

  return {
    completionRates,
    stageScores,
    responseDistribution,
    companySurveys,
  };
}

/**
 * Get recent sessions for dashboard
 * Calculates completion from stage_progress table for accurate status
 */
export async function getRecentSessions(limit: number = 10): Promise<SurveySession[]> {
  const db = getDatabase();

  // Subquery to calculate completion from stage_progress
  const progressSubquery = `
    SELECT
      session_id,
      CASE
        WHEN COUNT(*) = 0 THEN 0
        ELSE (SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*))
      END as calc_completion,
      CASE
        WHEN COUNT(*) = 0 THEN 0
        WHEN SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) = COUNT(*) THEN 1
        ELSE 0
      END as calc_is_completed
    FROM stage_progress
    GROUP BY session_id
  `;

  const stmt = db.prepare(`
    SELECT
      s.*,
      COALESCE(p.calc_completion, 0) as completion_percentage,
      COALESCE(p.calc_is_completed, 0) as is_completed
    FROM survey_sessions s
    LEFT JOIN (${progressSubquery}) p ON s.session_id = p.session_id
    ORDER BY s.last_activity DESC
    LIMIT ?
  `);
  return stmt.all(limit) as SurveySession[];
}

/**
 * Export all survey data as objects for CSV generation
 */
export async function exportAllSurveyData(): Promise<{
  sessions: SurveySession[];
  responses: SurveyResponse[];
}> {
  const db = getDatabase();

  const sessionsStmt = db.prepare('SELECT * FROM survey_sessions ORDER BY created_at DESC');
  const sessions = sessionsStmt.all() as SurveySession[];

  const responsesStmt = db.prepare('SELECT * FROM survey_responses ORDER BY session_id, stage_name');
  const responses = responsesStmt.all() as SurveyResponse[];

  return { sessions, responses };
}