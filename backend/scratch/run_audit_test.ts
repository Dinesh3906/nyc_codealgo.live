import pool from '../src/db';

// Mocking pool.query as 'any' to bypass the complex mysql2 overload type checks.
// This resolves: Type '(sql: string, params?: any[]) => Promise<any>' is not assignable to type...
pool.query = (async (sql: string, params?: any[]) => {
  console.log(`[Mock DB] Executing: ${sql}`, params);
  return [[] as any, [] as any];
}) as any;

async function runAuditTest() {
  console.log("🧪 Running Audit Test...");
  // TODO: Add your audit test logic here
}

runAuditTest().catch(console.error);
