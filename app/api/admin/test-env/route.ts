import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'NOT SET',
    ADMIN_PASSWORD_HASH_EXISTS: !!process.env.ADMIN_PASSWORD_HASH,
    ADMIN_PASSWORD_HASH_LENGTH: process.env.ADMIN_PASSWORD_HASH?.length || 0,
    ADMIN_PASSWORD_HASH_PREFIX: process.env.ADMIN_PASSWORD_HASH?.substring(0, 10) || 'NOT SET',
  });
}
