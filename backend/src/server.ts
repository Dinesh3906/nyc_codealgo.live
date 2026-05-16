import 'dotenv/config';
import { httpServer } from './app';

const PORT = process.env.PORT || 5000;

// PRODUCTION HARDENING: Required Env Vars
const REQUIRED_ENV_VARS = [
  'GOOGLE_AI_STUDIO_KEY',
  'PINECONE_API_KEY',
  'DB_HOST',
  'DB_USER',
  'DB_PASS',
  'DB_NAME',
  'JWT_SECRET'
];

const missing = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

httpServer.listen(PORT, () => {
  console.log(`NYC House Code Server running on port ${PORT}`);
});
