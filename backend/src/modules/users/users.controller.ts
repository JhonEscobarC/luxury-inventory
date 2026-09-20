import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import * as usersService from "./users.service";

const createUserSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido"),
  email: z.string().trim().email("Correo invalido"),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres"),
  role: z.nativeEnum(Role),
});

const updateUserSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().email("Correo invalido").optional(),
  role: z.nativeEnum(Role).optional(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres"),
});

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await usersService.listUsers();
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createUserSchema.parse(req.body);
    const user = await usersService.createUser(input);
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateUserSchema.parse(req.body);
    const user = await usersService.updateUser(req.params.id, input, req.user!.sub);
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function deleteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await usersService.deleteUser(req.params.id, req.user!.sub);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function resetPasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { password } = resetPasswordSchema.parse(req.body);
    await usersService.resetPassword(req.params.id, password);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
