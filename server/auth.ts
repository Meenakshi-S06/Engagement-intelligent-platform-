// server/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, ROLE_PERMISSIONS, RoleName } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'hope-platform-secure-jwt-secret-2026-key-32chars';
const ACCESS_EXPIRY = '1d';

export interface JwtPayload {
  sub: string;
  roleId: string;
  role: RoleName;
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      heldPermissions?: Set<string>;
      resolvedScope?: string;
    }
  }
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRY });
}

export function authenticateJwt(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required.' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch (err: any) {
    if (err?.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, error: 'Access token expired.' });
      return;
    }
    res.status(401).json({ success: false, error: 'Invalid access token.' });
  }
}

export function requirePermission(...requiredCodes: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }

    const role = req.user.role;
    const permissions = ROLE_PERMISSIONS[role] || [];
    const heldCodes = new Set<string>(permissions);

    const hasPermission = requiredCodes.some((code) => heldCodes.has(code));
    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: `Insufficient permissions. Required: ${requiredCodes.join(' or ')}`,
      });
      return;
    }

    req.heldPermissions = heldCodes;
    next();
  };
}

export function sendSuccess(res: Response, data: unknown, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

export function sendError(res: Response, message: string, statusCode = 400) {
  return res.status(statusCode).json({ success: false, error: message });
}
