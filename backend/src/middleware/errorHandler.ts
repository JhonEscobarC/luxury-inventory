import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Datos invalidos",
      errors: err.errors.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const fields = (err.meta?.target as string[] | undefined)?.join(", ") ?? "el registro";
    return res.status(409).json({ message: `Ya existe un registro con ese valor: ${fields}` });
  }

  console.error(err);
  return res.status(500).json({ message: "Error interno del servidor" });
}
