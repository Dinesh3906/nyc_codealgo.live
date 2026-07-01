/**
 * Environment variable validation at startup.
 * Replaces the basic check in server.ts with comprehensive type-checked validation.
 * Fails fast with clear error messages before any service starts.
 */

import { Logger } from '../services/logger';

interface EnvRule {
  name: string;
  required: boolean;
  type?: 'string' | 'number' | 'url' | 'port';
  minLength?: number;
  default?: string;
  sensitive?: boolean; // Don't log the value
}

const ENV_RULES: EnvRule[] = [
  // Required secrets
  { name: 'GOOGLE_AI_STUDIO_KEY', required: true, type: 'string', minLength: 10, sensitive: true },
  { name: 'PINECONE_API_KEY', required: true, type: 'string', minLength: 10, sensitive: true },
  { name: 'JWT_SECRET', required: true, type: 'string', minLength: 32, sensitive: true },
  { name: 'GROQ_API_KEY', required: true, type: 'string', minLength: 10, sensitive: true },
  { name: 'OPENROUTER_API_KEY', required: true, type: 'string', minLength: 10, sensitive: true },
  { name: 'GOOGLE_CLIENT_ID', required: true, type: 'string', minLength: 10, sensitive: true },
  { name: 'GOOGLE_CLIENT_SECRET', required: true, type: 'string', minLength: 10, sensitive: true },
  { name: 'RAZORPAY_KEY_ID', required: true, type: 'string', minLength: 5, sensitive: true },
  { name: 'RAZORPAY_KEY_SECRET', required: true, type: 'string', minLength: 5, sensitive: true },

  // Database
  { name: 'DB_HOST', required: true, type: 'string' },
  { name: 'DB_USER', required: true, type: 'string' },
  { name: 'DB_PASS', required: true, type: 'string', sensitive: true },
  { name: 'DB_NAME', required: true, type: 'string' },

  // Optional but validated
  { name: 'PORT', required: false, type: 'port', default: '5000' },
  { name: 'NODE_ENV', required: false, type: 'string', default: 'development' },
  { name: 'GEMINI_CONCURRENCY', required: false, type: 'number', default: '5' },
  { name: 'WORKER_CONCURRENCY', required: false, type: 'number', default: '8' },
  { name: 'GEMINI_MAX_RETRIES', required: false, type: 'number', default: '5' },
  { name: 'GEMINI_TIMEOUT_MS', required: false, type: 'number', default: '120000' },
  { name: 'CACHE_TTL_MINUTES', required: false, type: 'number', default: '30' },
  { name: 'LOG_LEVEL', required: false, type: 'string', default: 'INFO' },

  // Pinecone
  { name: 'PINECONE_ENVIRONMENT', required: false, type: 'string', default: 'us-east-1' },
  { name: 'PINECONE_INDEX', required: false, type: 'string', default: 'permitiq' },

  // Email (optional)
  { name: 'SMTP_HOST', required: false, type: 'string' },
  { name: 'SMTP_PORT', required: false, type: 'port' },
  { name: 'SMTP_USER', required: false, type: 'string' },
  { name: 'SMTP_PASS', required: false, type: 'string', sensitive: true },
];

function validatePort(value: string): boolean {
  const num = parseInt(value, 10);
  return !isNaN(num) && num >= 1 && num <= 65535;
}

function validateNumber(value: string): boolean {
  const num = parseInt(value, 10);
  return !isNaN(num) && num > 0;
}

/**
 * Validates all environment variables at startup.
 * Returns a list of errors (empty if all valid).
 */
export function validateEnvironment(): string[] {
  const errors: string[] = [];
  const warnings: string[] = [];
  const logger = new Logger({ stage: 'env-validation' });

  for (const rule of ENV_RULES) {
    const value = process.env[rule.name];

    // Check required
    if (rule.required && (!value || value.trim() === '')) {
      errors.push(`Missing required environment variable: ${rule.name}`);
      continue;
    }

    // Skip optional vars that aren't set
    if (!value && !rule.required) {
      if (rule.default) {
        process.env[rule.name] = rule.default;
      }
      continue;
    }

    if (!value) continue;

    // Type validation
    switch (rule.type) {
      case 'port':
        if (!validatePort(value)) {
          errors.push(`${rule.name} must be a valid port (1-65535), got: ${value}`);
        }
        break;
      case 'number':
        if (!validateNumber(value)) {
          errors.push(`${rule.name} must be a positive number, got: ${value}`);
        }
        break;
      case 'url':
        try {
          new URL(value);
        } catch {
          errors.push(`${rule.name} must be a valid URL, got: ${value}`);
        }
        break;
    }

    // Min length
    if (rule.minLength && value.length < rule.minLength) {
      errors.push(`${rule.name} must be at least ${rule.minLength} characters`);
    }
  }

  // 1. Only one JWT secret is loaded
  const jwtRelatedKeys = Object.keys(process.env).filter(k => 
    k.toUpperCase().includes('JWT_') && k !== 'JWT_SECRET' && k !== 'JWT_EXPIRES_IN' && k !== 'JWT_ALGORITHM'
  );
  if (jwtRelatedKeys.length > 0) {
    warnings.push(`Warning: Multiple JWT-related keys detected in environment: ${jwtRelatedKeys.join(', ')}. Ensure they are not conflicting.`);
  }

  // 2. dotenv loaded before other imports (checks if DB modules or express were loaded prior to this)
  const cacheKeys = Object.keys(require.cache);
  const dbIndex = cacheKeys.findIndex(k => k.includes('/db.ts') || k.includes('\\db.ts') || k.includes('/db.js') || k.includes('\\db.js'));
  const dotenvIndex = cacheKeys.findIndex(k => k.includes('dotenv'));
  if (dbIndex !== -1 && dotenvIndex !== -1 && dbIndex < dotenvIndex) {
    errors.push('CRITICAL: dotenv was loaded after database modules! Configuration might be stale.');
  }

  // 3. PM2 / local environment validation against disk .env
  try {
    const fs = require('fs');
    const path = require('path');
    const dotenv = require('dotenv');
    const envPath = path.resolve(__dirname, '../../.env');
    if (fs.existsSync(envPath)) {
      const fileBuffer = fs.readFileSync(envPath);
      const parsedEnv = dotenv.parse(fileBuffer);
      if (parsedEnv.JWT_SECRET && process.env.JWT_SECRET !== parsedEnv.JWT_SECRET) {
        errors.push('CRITICAL: Runtime JWT_SECRET does not match the value in .env file! PM2 may be running with stale environment. Restart PM2 with --update-env.');
      }
    }
  } catch (err: any) {
    warnings.push(`Could not read .env file on disk for verification: ${err.message}`);
  }

  // Production-specific checks
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'secret' || process.env.JWT_SECRET === 'nyc_house_code_secret_v1_2024') {
      errors.push('CRITICAL: JWT_SECRET cannot be the default or a weak key in production!');
    }
  }

  // Log warnings
  for (const warn of warnings) {
    logger.warn(warn);
  }

  // Log results
  if (errors.length > 0) {
    logger.fatal(`Environment validation failed with ${errors.length} error(s)`, new Error(errors.join('; ')));
  } else {
    logger.info('Environment validation passed', {
      stage: 'env-validation'
    });
  }

  return errors;
}
