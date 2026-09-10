import { neon } from '@neondatabase/serverless';

export function databaseUrl(){
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL || '';
}
export function databaseConfigured(){return Boolean(databaseUrl())}
export function getSql(){
  const url=databaseUrl();
  if(!url) throw new Error('gateway_database_not_configured');
  return neon(url);
}
