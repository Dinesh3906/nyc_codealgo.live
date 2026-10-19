import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

const MIN_DB_CONNECTION_LIMIT = 10;
const DEFAULT_QUERY_TIMEOUT_MS = 15000;
const MAX_QUERY_TIMEOUT_MS = 30000;
const DEFAULT_CONNECT_TIMEOUT_MS = 30000;
const MAX_CONNECT_TIMEOUT_MS = 60000;

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

const dbConnectionLimit = Math.max(
  readPositiveInt(process.env.DB_CONNECTION_LIMIT, MIN_DB_CONNECTION_LIMIT),
  MIN_DB_CONNECTION_LIMIT
);
const dbQueryTimeoutMs = Math.min(
  readPositiveInt(process.env.DB_QUERY_TIMEOUT_MS, DEFAULT_QUERY_TIMEOUT_MS),
  MAX_QUERY_TIMEOUT_MS
);
const dbConnectTimeoutMs = Math.min(
  readPositiveInt(process.env.DB_CONNECT_TIMEOUT_MS, DEFAULT_CONNECT_TIMEOUT_MS),
  MAX_CONNECT_TIMEOUT_MS
);

function boundedQueryTimeout(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return dbQueryTimeoutMs;
  }
  return Math.min(Math.floor(parsed), dbQueryTimeoutMs);
}

function getSslConfig(): mysql.SslOptions | undefined {
  if (process.env.DB_SSL === 'false') {
    return undefined;
  }
  if (process.env.DB_SSL_CA_PATH) {
    const caPath = path.resolve(__dirname, process.env.DB_SSL_CA_PATH);
    if (fs.existsSync(caPath)) {
      return { ca: fs.readFileSync(caPath), rejectUnauthorized: true };
    }
  }
  const isRemote = process.env.NODE_ENV === 'production' || 
                   process.env.DB_SSL === 'true' || 
                   (process.env.DB_HOST && !process.env.DB_HOST.includes('localhost') && !process.env.DB_HOST.includes('127.0.0.1')) ||
                   (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1'));
  
  if (isRemote) {
    return { minVersion: 'TLSv1.2', rejectUnauthorized: true };
  }
  return undefined;
}

const sslConfig = getSslConfig();

const commonPoolConfig: mysql.PoolOptions = {
  waitForConnections: true,
  connectionLimit: dbConnectionLimit,
  maxIdle: dbConnectionLimit,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: dbConnectTimeoutMs,
  ssl: sslConfig,
};

const poolConfig: mysql.PoolOptions = process.env.DATABASE_URL
  ? {
      uri: process.env.DATABASE_URL,
      ...commonPoolConfig,
    }
  : {
      host: process.env.DB_HOST,
      port: readPositiveInt(process.env.DB_PORT, 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      ...commonPoolConfig,
    };

const pool = mysql.createPool(poolConfig);
const rawQuery = pool.query.bind(pool) as any;

(pool as any).query = (sql: any, values?: any) => {
  if (typeof sql === 'string') {
    return rawQuery({ sql, timeout: dbQueryTimeoutMs }, values);
  }

  if (sql && typeof sql === 'object' && !Array.isArray(sql)) {
    return rawQuery({ ...sql, timeout: boundedQueryTimeout(sql.timeout) }, values);
  }

  return rawQuery(sql, values);
};

export default pool;
