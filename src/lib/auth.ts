import crypto from 'crypto';

const AUTH_SECRET = process.env.AUTH_SECRET || 'kotbari-dawah-circle-secret-salt-2026';

export function hashPassword(password: string): string {
  return crypto.createHmac('sha256', AUTH_SECRET).update(password.trim()).digest('hex');
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const hash = hashPassword(password);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

export interface TokenPayload {
  userId: string;
  role: 'admin' | 'member';
  contactId?: string | null;
  username: string;
  exp: number;
}

export function generateToken(payload: Omit<TokenPayload, 'exp'>): string {
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const data: TokenPayload = { ...payload, exp };
  const str = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(str).digest('base64url');
  return `${str}.${sig}`;
}

export function parseToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [str, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(str).digest('base64url');
    if (sig !== expectedSig) return null;
    
    const payload: TokenPayload = JSON.parse(Buffer.from(str, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Date.now()) {
      return null; // Expired
    }
    return payload;
  } catch (err) {
    return null;
  }
}
