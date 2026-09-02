import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as authService from "./auth.service";

const loginSchema = z.object({
  email: z.string().email("Correo invalido"),
  password: z.string().min(1, "La contrasena es requerida"),
});

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function meHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getUserById(req.user!.sub);
    res.json({ user });
  } catch (error) {
    next(error);
  }
}
