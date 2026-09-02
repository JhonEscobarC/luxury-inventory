import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { verifyAuthToken, type AuthTokenPayload } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No autorizado: falta el token" });
  }

  const token = header.slice("Bearer ".length);

  try {
    req.user = verifyAuthToken(token);
    return next();
  } catch {
    return res.status(401).json({ message: "Token invalido o expirado" });
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "No autorizado" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "No tienes permisos para esta accion" });
    }
    return next();
  };
}
