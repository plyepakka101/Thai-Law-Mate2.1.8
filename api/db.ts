import { neon } from '@neondatabase/serverless';

export function getDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not configured');
  }
  return neon(dbUrl);
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
