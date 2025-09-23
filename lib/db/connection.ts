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