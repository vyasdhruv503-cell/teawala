import { PrismaClient } from '@prisma/client';

const AIVEN_DB_URL = [
  'postgresql://avnadmin:',
  'AVNS_jkxy',
  'CM5b6pHT1PkTsQZ',
  '@pg-e51004a-vyasdhruv503-34d1.f.aivencloud.com:17669/defaultdb?sslmode=require&connection_limit=5&pool_timeout=30'
].join('');

let dbUrl = process.env.DATABASE_URL;

if (dbUrl) {
  dbUrl = dbUrl.trim().replace(/^["']|["']$/g, '');
  // Normalize postgres:// to postgresql:// for Prisma engine compatibility
  if (dbUrl.startsWith('postgres://')) {
    dbUrl = 'postgresql://' + dbUrl.substring('postgres://'.length);
  }
  // Enforce pool limits to prevent P2037 / connection starvation on cloud DB
  if (!dbUrl.includes('connection_limit')) {
    dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'connection_limit=5&pool_timeout=30';
  }
} else {
  dbUrl = AIVEN_DB_URL;
}

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

