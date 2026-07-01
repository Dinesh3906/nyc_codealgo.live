import mysql from 'mysql2/promise';

const sslConfig = process.env.NODE_ENV === 'production' 
  ? { rejectUnauthorized: true } 
  : undefined;

const poolConfig: mysql.PoolOptions = process.env.DATABASE_URL
  ? {
      uri: process.env.DATABASE_URL,
      ssl: sslConfig,
    }
  : {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60000,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      ssl: sslConfig,
    };

const pool = mysql.createPool(poolConfig);

export default pool;
