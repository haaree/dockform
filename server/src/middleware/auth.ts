import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dockform-factory-secret-change-me';

export interface AuthPayload {
  userId: string;
  roleKey: string;
  companyId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

const PUBLIC_PREFIXES = ['/api/auth', '/api/health', '/api/cron', '/api/email', '/api/files'];

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (PUBLIC_PREFIXES.some(p => req.path.startsWith(p) || req.originalUrl.startsWith(p))) {
    next();
    return;
  }
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET) as AuthPayload;
    req.auth = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
