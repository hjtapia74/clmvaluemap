/**
 * Script to generate a bcrypt hash for admin password
 * Usage: npx tsx scripts/generateAdminHash.ts <password>
 */

import bcrypt from 'bcrypt';

async function main() {
  const password = process.argv[2];

  if (!password) {
    console.log('Usage: npx tsx scripts/generateAdminHash.ts <password>');
    console.log('\nExample: npx tsx scripts/generateAdminHash.ts mySecurePassword123');
    process.exit(1);
  }

  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);

  console.log('\nGenerated bcrypt hash for your password:');
  console.log('----------------------------------------');
  console.log(hash);
  console.log('----------------------------------------');
  console.log('\nAdd this to your .env.local file:');
  console.log(`ADMIN_USERNAME=admin`);
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log(`ADMIN_SESSION_SECRET=${require('crypto').randomBytes(32).toString('hex')}`);
}

main().catch(console.error);
