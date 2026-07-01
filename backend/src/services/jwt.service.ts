import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from './logger';

const logger = new Logger({ stage: 'jwt-service' });

export interface UserTokenPayload extends jwt.JwtPayload {
  id: string;
  email: string;
  tokenVersion: number;
}

export interface RefreshTokenPayload extends jwt.JwtPayload {
  id: string;
  email: string;
  tokenVersion: number;
  type: 'refresh';
}

export interface AdminTokenPayload extends jwt.JwtPayload {
  id: string;
  email: string;
  verifiedAdmin: boolean;
}

export class JwtService {
  private static getSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is missing from the environment');
    }
    if (secret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }
    return secret;
  }

  private static getAlgorithm(): jwt.Algorithm {
    return (process.env.JWT_ALGORITHM || 'HS256') as jwt.Algorithm;
  }

  // ─── Access Token (Short-lived: 15 minutes) ───

  public static signUserToken(userId: string, email: string, tokenVersion: number): string {
    const secret = this.getSecret();
    const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    const algorithm = this.getAlgorithm();

    const payload = {
      id: userId,
      email: email,
      tokenVersion: tokenVersion
    };

    const options: jwt.SignOptions = {
      algorithm,
      expiresIn: expiresIn as any,
      issuer: 'nyc-compliance-engine',
      audience: 'nyc-compliance-client',
      subject: userId,
      jwtid: uuidv4()
    };

    return jwt.sign(payload, secret, options);
  }

  public static verifyUserToken(token: string): UserTokenPayload {
    const secret = this.getSecret();
    const algorithm = this.getAlgorithm();

    const options: jwt.VerifyOptions = {
      algorithms: [algorithm],
      issuer: 'nyc-compliance-engine',
      audience: 'nyc-compliance-client'
    };

    const decoded = jwt.verify(token, secret, options) as UserTokenPayload;

    if (!decoded.iss || decoded.iss !== 'nyc-compliance-engine') {
      throw new jwt.JsonWebTokenError('jwt issuer invalid');
    }
    if (!decoded.aud || decoded.aud !== 'nyc-compliance-client') {
      throw new jwt.JsonWebTokenError('jwt audience invalid');
    }
    if (!decoded.sub || !decoded.id || decoded.sub !== decoded.id) {
      throw new jwt.JsonWebTokenError('jwt subject mismatch');
    }
    if (!decoded.jti) {
      throw new jwt.JsonWebTokenError('jwt id missing');
    }
    if (decoded.tokenVersion === undefined || decoded.tokenVersion === null) {
      throw new jwt.JsonWebTokenError('jwt tokenVersion missing');
    }

    return decoded;
  }

  // ─── Refresh Token (Longer-lived: 7 days) ───

  public static signRefreshToken(userId: string, email: string, tokenVersion: number): string {
    const secret = this.getSecret();
    const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    const algorithm = this.getAlgorithm();

    const payload = {
      id: userId,
      email: email,
      tokenVersion: tokenVersion,
      type: 'refresh'
    };

    const options: jwt.SignOptions = {
      algorithm,
      expiresIn: expiresIn as any,
      issuer: 'nyc-compliance-engine',
      audience: 'nyc-compliance-refresh',
      subject: userId,
      jwtid: uuidv4()
    };

    return jwt.sign(payload, secret, options);
  }

  public static verifyRefreshToken(token: string): RefreshTokenPayload {
    const secret = this.getSecret();
    const algorithm = this.getAlgorithm();

    const options: jwt.VerifyOptions = {
      algorithms: [algorithm],
      issuer: 'nyc-compliance-engine',
      audience: 'nyc-compliance-refresh'
    };

    const decoded = jwt.verify(token, secret, options) as RefreshTokenPayload;

    if (decoded.type !== 'refresh') {
      throw new jwt.JsonWebTokenError('not a refresh token');
    }
    if (!decoded.sub || !decoded.id || decoded.sub !== decoded.id) {
      throw new jwt.JsonWebTokenError('jwt subject mismatch');
    }
    if (!decoded.jti) {
      throw new jwt.JsonWebTokenError('jwt id missing');
    }
    if (decoded.tokenVersion === undefined || decoded.tokenVersion === null) {
      throw new jwt.JsonWebTokenError('jwt tokenVersion missing');
    }

    return decoded;
  }

  // ─── Admin Token (Short-lived: 2 hours) ───

  public static signAdminToken(userId: string, email: string): string {
    const secret = this.getSecret();
    const algorithm = this.getAlgorithm();

    const payload = {
      id: userId,
      email: email,
      verifiedAdmin: true
    };

    const options: jwt.SignOptions = {
      algorithm,
      expiresIn: '2h',
      issuer: 'nyc-compliance-engine',
      audience: 'nyc-compliance-admin',
      subject: userId,
      jwtid: uuidv4()
    };

    return jwt.sign(payload, secret, options);
  }

  public static verifyAdminToken(token: string): AdminTokenPayload {
    const secret = this.getSecret();
    const algorithm = this.getAlgorithm();

    const options: jwt.VerifyOptions = {
      algorithms: [algorithm],
      issuer: 'nyc-compliance-engine',
      audience: 'nyc-compliance-admin'
    };

    const decoded = jwt.verify(token, secret, options) as AdminTokenPayload;

    if (!decoded.iss || decoded.iss !== 'nyc-compliance-engine') {
      throw new jwt.JsonWebTokenError('jwt issuer invalid');
    }
    if (!decoded.aud || decoded.aud !== 'nyc-compliance-admin') {
      throw new jwt.JsonWebTokenError('jwt audience invalid');
    }
    if (!decoded.sub || !decoded.id || decoded.sub !== decoded.id) {
      throw new jwt.JsonWebTokenError('jwt subject mismatch');
    }
    if (!decoded.jti) {
      throw new jwt.JsonWebTokenError('jwt id missing');
    }
    if (!decoded.verifiedAdmin) {
      throw new jwt.JsonWebTokenError('jwt verifiedAdmin claim missing');
    }

    return decoded;
  }
}
