import { Role, type User } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";
import { hashPassword } from "../../utils/password";

function serializeUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

export async function listUsers() {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return users.map(serializeUser);
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new HttpError(409, "Ya existe un usuario con ese correo");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash, role: input.role },
  });
  return serializeUser(user);
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: Role;
}

export async function updateUser(id: string, input: UpdateUserInput, actingUserId: string) {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    throw new HttpError(404, "Usuario no encontrado");
  }

  if (id === actingUserId && input.role && input.role !== Role.ADMIN) {
    throw new HttpError(400, "No puedes quitarte a ti mismo el rol de administrador");
  }

  if (input.email && input.email !== target.email) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new HttpError(409, "Ya existe un usuario con ese correo");
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.role !== undefined && { role: input.role }),
    },
  });
  return serializeUser(user);
}

export async function deleteUser(id: string, actingUserId: string) {
  if (id === actingUserId) {
    throw new HttpError(400, "No puedes eliminar tu propia cuenta");
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    throw new HttpError(404, "Usuario no encontrado");
  }

  await prisma.user.delete({ where: { id } });
}

export async function resetPassword(id: string, newPassword: string) {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    throw new HttpError(404, "Usuario no encontrado");
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
}
