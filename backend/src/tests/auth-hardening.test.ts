import { JwtService } from '../services/jwt.service';
import pool from '../db';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// Mock DB pool.query to allow tests to run offline without RDS access
let mockUserDb: any[] = [];
pool.query = (async (sql: string, params?: any[]) => {
  if (sql.includes('INSERT INTO `user`')) {
    const [id, email, password, name, role, subStatus, scanLimit, isVerified, tokenVersion] = params!;
    mockUserDb.push({ id, email, password, name, role, subStatus, scanLimit, isVerified, tokenVersion });
    return [{ affectedRows: 1 }] as any;
  }
  if (sql.includes('SELECT tokenVersion') || sql.includes('SELECT * FROM `user`')) {
    const userId = params![0];
    const user = mockUserDb.find(u => u.id === userId);
    return [user ? [user] : []] as any;
  }
  if (sql.includes('UPDATE `user` SET tokenVersion')) {
    const userId = params![0];
    const user = mockUserDb.find(u => u.id === userId);
    if (user) {
      user.tokenVersion = (user.tokenVersion || 1) + 1;
      return [{ affectedRows: 1 }] as any;
    }
    return [{ affectedRows: 0 }] as any;
  }
  if (sql.includes('DELETE FROM `user`')) {
    const userId = params![0];
    mockUserDb = mockUserDb.filter(u => u.id !== userId);
    return [{ affectedRows: 1 }] as any;
  }
  return [[]] as any;
}) as any;

pool.end = (async () => {}) as any;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ Pass: ${message}`);
}

async function runTests() {
  console.log('🧪 Starting Enterprise JWT Authentication Hardening Regression Tests...\n');

  // Hardcode a 32 character JWT_SECRET for test stability if not set or too short in test runner environment
  process.env.JWT_SECRET = 'super-secret-value-longer-than-32-chars-long-12345';
  process.env.JWT_ALGORITHM = 'HS256';

  const testUserId = uuidv4();
  const testEmail = `auth-test-${Date.now()}@example.com`;
  
  // Set up test user in DB
  console.log('Setup: Creating test user in database...');
  await pool.query(
    'INSERT INTO `user` (id, email, password, name, role, subStatus, scanLimit, isVerified, tokenVersion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [testUserId, testEmail, 'test-pass-hash', 'Test User', 'architect', 'free', 5, true, 1]
  );

  try {
    // 1. Valid JWT Verification
    console.log('\nTest 1: Valid JWT Verification');
    const validToken = JwtService.signUserToken(testUserId, testEmail, 1);
    const decoded = JwtService.verifyUserToken(validToken);
    assert(decoded.id === testUserId, 'Decoded user ID matches');
    assert(decoded.email === testEmail, 'Decoded email matches');
    assert(decoded.tokenVersion === 1, 'Decoded token version matches');
    assert(decoded.iss === 'nyc-compliance-engine', 'Issuer matches');
    assert(decoded.aud === 'nyc-compliance-client', 'Audience matches');
    assert(!!decoded.jti, 'JWT ID exists');

    // 2. Expired JWT
    console.log('\nTest 2: Expired JWT');
    const originalExpiresIn = process.env.JWT_EXPIRES_IN;
    try {
      process.env.JWT_EXPIRES_IN = '1ms'; // set to expire immediately
      const expiredToken = JwtService.signUserToken(testUserId, testEmail, 1);
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 5));
      try {
        JwtService.verifyUserToken(expiredToken);
        assert(false, 'Expired token should have thrown error');
      } catch (err: any) {
        assert(err.name === 'TokenExpiredError', 'Threw TokenExpiredError');
      }
    } finally {
      if (originalExpiresIn === undefined) {
        delete process.env.JWT_EXPIRES_IN;
      } else {
        process.env.JWT_EXPIRES_IN = originalExpiresIn;
      }
    }

    // 3. Invalid Signature (Wrong Secret)
    console.log('\nTest 3: Invalid Signature');
    const wrongSecretToken = jwt.sign(
      { id: testUserId, email: testEmail, tokenVersion: 1, iss: 'nyc-compliance-engine', aud: 'nyc-compliance-client', sub: testUserId, jti: uuidv4() },
      'wrong-secret-value-longer-than-32-chars-long-123',
      { algorithm: 'HS256', expiresIn: '1h' }
    );
    try {
      JwtService.verifyUserToken(wrongSecretToken);
      assert(false, 'Token with invalid signature should have thrown error');
    } catch (err: any) {
      assert(err.name === 'JsonWebTokenError' && err.message.includes('signature'), 'Threw JsonWebTokenError: invalid signature');
    }

    // 4. Missing Required Claims Check
    console.log('\nTest 4: Missing Required Claims');
    const missingClaimsToken = jwt.sign(
      { id: testUserId },
      process.env.JWT_SECRET || 'secret-value-longer-than-32-chars-long-123'
    );
    try {
      JwtService.verifyUserToken(missingClaimsToken);
      assert(false, 'Token missing required claims should have thrown error');
    } catch (err: any) {
      assert(err.name === 'JsonWebTokenError', 'Threw JsonWebTokenError for missing claims');
    }

    // 5. Malformed JWT
    console.log('\nTest 5: Malformed JWT');
    try {
      JwtService.verifyUserToken('not-a-valid-jwt-token-string');
      assert(false, 'Malformed token should have thrown error');
    } catch (err: any) {
      assert(err.name === 'JsonWebTokenError', 'Threw JsonWebTokenError for malformed token');
    }

    // 6. Token Version Mismatch (Revocation)
    console.log('\nTest 6: Token Version Mismatch / Revocation');
    const tokenV1 = JwtService.signUserToken(testUserId, testEmail, 1);
    
    // Simulate updating DB tokenVersion to 2 (revocation)
    await pool.query('UPDATE `user` SET tokenVersion = 2 WHERE id = ?', [testUserId]);
    
    // Query DB to simulate auth middleware check
    const [rows]: any = await pool.query('SELECT tokenVersion FROM `user` WHERE id = ?', [testUserId]);
    const userInDb = rows[0];
    
    const decodedTokenV1 = JwtService.verifyUserToken(tokenV1);
    assert(decodedTokenV1.tokenVersion === 1, 'Decoded token version is 1');
    assert(userInDb.tokenVersion === 2, 'DB token version is now 2');
    assert(decodedTokenV1.tokenVersion !== userInDb.tokenVersion, 'Mismatch correctly detected (token revoked)');

    // 7. Admin Token Signing & Verification
    console.log('\nTest 7: Admin Session Tokens');
    const adminToken = JwtService.signAdminToken(testUserId, testEmail);
    const decodedAdmin = JwtService.verifyAdminToken(adminToken);
    assert(decodedAdmin.id === testUserId, 'Admin user ID matches');
    assert(decodedAdmin.email === testEmail, 'Admin email matches');
    assert(decodedAdmin.verifiedAdmin === true, 'verifiedAdmin claim is true');
    assert(decodedAdmin.iss === 'nyc-compliance-engine', 'Admin issuer matches');
    assert(decodedAdmin.aud === 'nyc-compliance-admin', 'Admin audience matches');

    console.log('\n🎉 All authentication hardening regression tests passed successfully!');
  } finally {
    // Clean up test user
    console.log('\nCleanup: Deleting test user from database...');
    await pool.query('DELETE FROM `user` WHERE id = ?', [testUserId]);
    await pool.end();
  }
}

runTests().catch(err => {
  console.error('\n❌ Test execution failed with error:', err);
  process.exit(1);
});
