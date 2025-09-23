import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export function generateSessionId(): string {
  return uuidv4();
}

export function generateUserIdentifier(email: string, company: string): string {
  const data = `${email.toLowerCase()}_${company.toLowerCase()}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

export function generateBrowserFingerprint(userAgent: string, ip?: string): string {
  const data = `${userAgent}_${ip || ''}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function parseStageNumber(stageName: string): number {
  const match = stageName.match(/^(\d+):/);
  return match ? parseInt(match[1]) : 0;
}

export function formatStageName(stageName: string): string {
  // Remove the number prefix if it exists
  return stageName.replace(/^\d+:\s*/, '');
}

export function getStageRadarName(stageName: string): string {
  // Map stage names to radar chart labels
  const stageMap: Record<string, string> = {
    '1: e-Document': 'e-Document',
    '2: e-Signature': 'e-Signature',
    '3: Contract Workflow Automation': 'Contract Workflow Automation',
    '4: Contract Authoring Automation': 'Contract Authoring Automation',
    '5: Contract Intelligence': 'Contract Intelligence',
    '6: Contract Execution': 'Contract Execution'
  };

  return stageMap[stageName] || stageName;
}