import type { ObraEtapa } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";

// Lista fija de etapas de construccion con las que arranca toda obra nueva. El orden aqui
// es el orden inicial (1..N); desde ahi cada obra puede reordenar y agregar etapas propias.
export const DEFAULT_ETAPAS = [
  "Trabajos preliminares",
  "Movimiento de tierras y cimentacion",
  "Estructura",
  "Mamposteria y paredes",
  "Cubierta y techo",
  "Instalaciones electricas",
  "Instalaciones hidraulicas y sanitarias",
  "Pisos y revestimientos",
  "Carpinteria y puertas",
  "Pintura y acabados",
];

function serializeEtapa(etapa: ObraEtapa) {
  return {
    id: etapa.id,
    name: etapa.name,
    order: etapa.order,
    isCustom: etapa.isCustom,
    obraId: etapa.obraId,
  };
}

export async function seedDefaultEtapas(obraId: string) {
  await prisma.obraEtapa.createMany({
    data: DEFAULT_ETAPAS.map((name, index) => ({ name, order: index + 1, isCustom: false, obraId })),
  });
}

export async function listEtapasByObra(obraId: string) {
  const etapas = await prisma.obraEtapa.findMany({ where: { obraId }, orderBy: { order: "asc" } });
  return etapas.map(serializeEtapa);
}

export interface CreateEtapaInput {
  obraId: string;
  name: string;
}

export async function createCustomEtapa(input: CreateEtapaInput) {
  const obra = await prisma.obra.findUnique({ where: { id: input.obraId } });
  if (!obra) {
    throw new HttpError(404, "Obra no encontrada");
  }
  const last = await prisma.obraEtapa.findFirst({ where: { obraId: input.obraId }, orderBy: { order: "desc" } });
  const etapa = await prisma.obraEtapa.create({
    data: { name: input.name, order: (last?.order ?? 0) + 1, isCustom: true, obraId: input.obraId },
  });
  return serializeEtapa(etapa);
}

export async function reorderEtapas(obraId: string, orderedIds: string[]) {
  const etapas = await prisma.obraEtapa.findMany({ where: { obraId } });
  if (etapas.length !== orderedIds.length || !etapas.every((e) => orderedIds.includes(e.id))) {
    throw new HttpError(400, "La lista de etapas no coincide con las etapas de la obra");
  }
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.obraEtapa.update({ where: { id }, data: { order: index + 1 } })),
  );
  return listEtapasByObra(obraId);
}

export async function deleteCustomEtapa(id: string) {
  const etapa = await prisma.obraEtapa.findUnique({
    where: { id },
    include: { _count: { select: { orderItems: true, contratistaEtapas: true } } },
  });
  if (!etapa) {
    throw new HttpError(404, "Etapa no encontrada");
  }
  if (!etapa.isCustom) {
    throw new HttpError(400, "Las etapas predeterminadas no se pueden eliminar");
  }
  if (etapa._count.orderItems > 0 || etapa._count.contratistaEtapas > 0) {
    throw new HttpError(400, "No se puede eliminar una etapa que ya tiene pedidos o pagos asociados");
  }
  await prisma.obraEtapa.delete({ where: { id } });
}
