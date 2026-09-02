import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import type { Role } from "@prisma/client";

export interface AuthTokenPayload {
  sub: string;
  role: Role;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as SignOptions);
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
}
