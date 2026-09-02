import { prisma } from "../../lib/prisma";
import { comparePassword } from "../../utils/password";
import { signAuthToken } from "../../utils/jwt";
import { HttpError } from "../../middleware/errorHandler";

export interface LoginResult {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    throw new HttpError(401, "Credenciales invalidas");
  }

  const passwordMatches = await comparePassword(password, user.passwordHash);
  if (!passwordMatches) {
    throw new HttpError(401, "Credenciales invalidas");
  }

  const token = signAuthToken({ sub: user.id, role: user.role });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || !user.isActive) {
    throw new HttpError(401, "Usuario no encontrado o inactivo");
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
