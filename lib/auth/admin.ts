import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { getDatabase } from '../db/connection';

// Admin session interface
export interface AdminSession {
  session_id: string;
  created_at: Date;
  expires_at: Date;
  last_activity: Date;
  ip_address?: string;
  user_agent?: string;
}

// Session expiration time (24 hours in milliseconds)
const SESSION_EXPIRY_HOURS = 24;

/**
 * Generate a secure session token
 */
export function generateAdminSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify admin credentials against environment variables
 */
export async function verifyAdminCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminUsername || !adminPasswordHash) {
    console.error('Admin credentials not configured in environment variables');
    return false;
  }

  // Check username first
  if (username !== adminUsername) {
    return false;
  }

  // Verify password against stored hash
  try {
    const isValid = await bcrypt.compare(password, adminPasswordHash);
    return isValid;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

/**
 * Create a new admin session in the database
 */
export async function createAdminSession(
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const db = getDatabase();
  const sessionId = generateAdminSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

  const stmt = db.prepare(`
    INSERT INTO admin_sessions
    (session_id, created_at, expires_at, last_activity, ip_address, user_agent)
    VALUES (?, datetime('now'), ?, datetime('now'), ?, ?)
  `);

  stmt.run(
    sessionId,
    expiresAt.toISOString(),
    ipAddress || null,
    userAgent || null
  );

  return sessionId;
}

/**
 * Verify an admin session token
 */
export async function verifyAdminSession(
  sessionId: string
): Promise<AdminSession | null> {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM admin_sessions
    WHERE session_id = ?
    AND expires_at > datetime('now')
  `);

  const session = stmt.get(sessionId) as AdminSession | undefined;

  if (session) {
    // Update last activity
    const updateStmt = db.prepare(`
      UPDATE admin_sessions
      SET last_activity = datetime('now')
      WHERE session_id = ?
    `);
    updateStmt.run(sessionId);
  }

  return session || null;
}

/**
 * Delete an admin session (logout)
 */
export async function deleteAdminSession(sessionId: string): Promise<void> {
  const db = getDatabase();
  const stmt = db.prepare(`DELETE FROM admin_sessions WHERE session_id = ?`);
  stmt.run(sessionId);
}

/**
 * Clean up expired admin sessions
 */
export async function cleanupExpiredAdminSessions(): Promise<number> {
  const db = getDatabase();
  const stmt = db.prepare(`
    DELETE FROM admin_sessions
    WHERE expires_at <= datetime('now')
  `);
  const result = stmt.run();
  return result.changes;
}

/**
 * Generate a bcrypt hash for a password
 * Utility function for setting up admin credentials
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}
