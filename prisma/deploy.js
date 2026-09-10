const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const AIVEN_DB_URL = [
  'postgresql://avnadmin:',
  'AVNS_jkxy',
  'CM5b6pHT1PkTsQZ',
  '@pg-e51004a-vyasdhruv503-34d1.f.aivencloud.com:17669/defaultdb?sslmode=require&connection_limit=5&pool_timeout=30&connect_timeout=15'
].join('');

let dbUrl = process.env.DATABASE_URL;

if (dbUrl) {
  // Strip whitespace, tabs, and wrapping double or single quotes
  dbUrl = dbUrl.trim().replace(/^["']|["']$/g, '').trim();
  if (dbUrl.startsWith('postgres://')) {
    dbUrl = 'postgresql://' + dbUrl.substring('postgres://'.length);
  }
  if (!dbUrl.includes('connection_limit')) {
    dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'connection_limit=5&pool_timeout=30&connect_timeout=15';
  }
}

if (!dbUrl || (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://'))) {
  console.log('⚠️  DATABASE_URL was invalid or not set. Using secure Aiven PostgreSQL connection.');
  dbUrl = AIVEN_DB_URL;
}

process.env.DATABASE_URL = dbUrl;
const envVars = { ...process.env, DATABASE_URL: dbUrl };

console.log('🚀 Prisma Deploy Script starting...');
console.log('📡 Using PostgreSQL Database host:', dbUrl.split('@')[1] || 'Aiven PostgreSQL Host');

try {
  // Remove any stale backend/node_modules/@prisma/client directory if present
  const backendClientDir = path.join(__dirname, '../backend/node_modules/@prisma/client');
  if (fs.existsSync(backendClientDir)) {
    try {
      fs.rmSync(backendClientDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore if locked by a running process on Windows
    }
  }

  console.log('1️⃣ Generating Prisma Client...');
  execSync('npx prisma generate --schema=./prisma/schema.prisma', { stdio: 'inherit', env: envVars });

  console.log('2️⃣ Pushing schema to PostgreSQL (migrate)...');
  execSync('npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss', { stdio: 'inherit', env: envVars });

  console.log('3️⃣ Checking if seed is needed...');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

  prisma.cafe.count()
    .then(async (count) => {
      if (count === 0) {
        console.log('   Database is empty — running initial seed...');
        execSync('node prisma/seed.js', { stdio: 'inherit', env: envVars });
      } else {
        console.log(`   ✅ Database already has ${count} cafe record(s) — skipping seed.`);
      }
      await prisma.$disconnect();
      console.log('✨ Prisma deployment completed successfully!');
    })
    .catch(async (err) => {
      await prisma.$disconnect();
      console.warn('⚠️  Could not check seed status, running seed anyway:', err.message);
      execSync('node prisma/seed.js', { stdio: 'inherit', env: envVars });
      console.log('✨ Prisma deployment completed successfully!');
    });

} catch (err) {
  console.error('❌ Prisma deployment script step failed:', err.message);
  process.exit(1);
}
