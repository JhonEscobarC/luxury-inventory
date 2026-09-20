import { Prisma, type Proyecto } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";

function serializeProyecto(proyecto: Proyecto & { obras?: { id: string; name: string; isActive: boolean }[] }) {
  return {
    id: proyecto.id,
    name: proyecto.name,
    client: proyecto.client,
    notes: proyecto.notes,
    isActive: proyecto.isActive,
    createdAt: proyecto.createdAt,
    updatedAt: proyecto.updatedAt,
    obras: proyecto.obras ?? undefined,
  };
}

export interface ListProyectosFilters {
  search?: string;
  isActive?: boolean;
}

export async function listProyectos(filters: ListProyectosFilters) {
  const where: Prisma.ProyectoWhereInput = {};
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { client: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  const proyectos = await prisma.proyecto.findMany({
    where,
    orderBy: { name: "asc" },
    include: { obras: { select: { id: true, name: true, isActive: true } } },
  });
  return proyectos.map(serializeProyecto);
}

export async function getProyectoById(id: string) {
  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    include: { obras: { select: { id: true, name: true, isActive: true } } },
  });
  if (!proyecto) {
    throw new HttpError(404, "Proyecto no encontrado");
  }
  return serializeProyecto(proyecto);
}

export interface ProyectoInput {
  name: string;
  client?: string | null;
  notes?: string | null;
}

export async function createProyecto(input: ProyectoInput) {
  const proyecto = await prisma.proyecto.create({
    data: {
      name: input.name,
      client: input.client ?? null,
      notes: input.notes ?? null,
    },
  });
  return serializeProyecto(proyecto);
}

export async function updateProyecto(id: string, input: Partial<ProyectoInput>) {
  const existing = await prisma.proyecto.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "Proyecto no encontrado");
  }
  const proyecto = await prisma.proyecto.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.client !== undefined && { client: input.client }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
  return serializeProyecto(proyecto);
}

// Borrado literal: elimina el proyecto y todo lo que cuelga de sus obras (inventario,
// pedidos, asignaciones a contratistas, abonos de cliente). Solo se permite sobre un
// proyecto ya inactivo, como salvaguarda. El Historial no tiene relacion (FK) con estas
// entidades -- guarda nombres como texto plano -- asi que sus registros sobreviven intactos.
export async function deleteProyecto(id: string) {
  const existing = await prisma.proyecto.findUnique({
    where: { id },
    include: { obras: { select: { id: true } } },
  });
  if (!existing) {
    throw new HttpError(404, "Proyecto no encontrado");
  }

  const obraIds = existing.obras.map((o) => o.id);

  await prisma.$transaction(async (tx) => {
    if (obraIds.length > 0) {
      await tx.product.deleteMany({ where: { obraId: { in: obraIds } } });
      await tx.abonoCliente.deleteMany({ where: { obraId: { in: obraIds } } });
      await tx.contratistaAsignacion.deleteMany({ where: { obraId: { in: obraIds } } });
      await tx.order.deleteMany({ where: { obraId: { in: obraIds } } });
      await tx.obra.deleteMany({ where: { id: { in: obraIds } } });
    }
    await tx.proyecto.delete({ where: { id } });
  });
}

