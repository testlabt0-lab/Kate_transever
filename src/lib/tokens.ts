import { createHmac, timingSafeEqual } from 'crypto';

const AUTH_SECRET = process.env.AUTH_SECRET;

if (!AUTH_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('AUTH_SECRET environment variable is required in production');
}

const EFFECTIVE_SECRET = AUTH_SECRET || 'dev-secret-khat-accounting-2024';

/**
 * Signs a user ID with a timestamp and HMAC signature.
 * Format: base64(userId:timestamp:signature)
 */
export function signToken(userId: string): string {
  const timestamp = Date.now();
  const data = `${userId}:${timestamp}`;
  const hmac = createHmac('sha256', EFFECTIVE_SECRET);
  hmac.update(data);
  const signature = hmac.digest('hex');
  return Buffer.from(`${data}:${signature}`).toString('base64');
}

/**
 * Verifies a token and returns the userId if valid.
 * Also checks if the token is older than 7 days.
 */
export function verifyToken(token: string): string | null {
  if (!token) return null;

  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const parts = decoded.split(':');

    if (parts.length !== 3) {
      return null;
    }

    const signature = parts.pop()!;
    const timestamp = parts.pop()!;
    const userId = parts.join(':');
    const data = `${userId}:${timestamp}`;

    const hmac = createHmac('sha256', EFFECTIVE_SECRET);
    hmac.update(data);
    const expectedSignature = hmac.digest('hex');

    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedSignatureBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedSignatureBuffer.length) {
      return null;
    }

    if (!timingSafeEqual(signatureBuffer, expectedSignatureBuffer)) {
      return null;
    }

    // Check expiration (7 days)
    const tokenTime = parseInt(timestamp, 10);
    const now = Date.now();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

    if (isNaN(tokenTime) || now - tokenTime > sevenDaysInMs) {
      return null;
    }

    return userId;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}
