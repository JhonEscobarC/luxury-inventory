import {
  Prisma,
  EtapaStatus,
  HistorialTipo,
  type ContratistaAsignacion,
  type ContratistaEtapa,
  type Obra,
  type Contratista,
} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";
import { recordEvento } from "../historial/historial.service";

export interface EtapaInput {
  name: string;
  percentage: number;
  obraEtapaId?: string | null;
}

export interface CreateAsignacionInput {
  obraId: string;
  contratistaId: string;
  totalAmount: number;
  notes?: string | null;
  etapas: EtapaInput[];
}

export type UpdateAsignacionInput = Partial<Pick<CreateAsignacionInput, "totalAmount" | "notes" | "etapas">>;

const PERCENTAGE_TOLERANCE = 0.01;

const ALLOWED_ETAPA_TRANSITIONS: Record<EtapaStatus, EtapaStatus[]> = {
  PENDIENTE: [EtapaStatus.COMPLETADA],
  COMPLETADA: [EtapaStatus.PAGADA],
  PAGADA: [],
};

type AsignacionWithRelations = ContratistaAsignacion & {
  obra: Obra;
  contratista: Contratista;
  etapas: (ContratistaEtapa & { obraEtapa: { name: string } | null })[];
};

function serializeAsignacion(asignacion: AsignacionWithRelations) {
  const totalAmount = Number(asignacion.totalAmount);

  const etapas = asignacion.etapas
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((etapa) => {
      const percentage = Number(etapa.percentage);
      return {
        id: etapa.id,
        name: etapa.name,
        percentage,
        amount: Math.round((totalAmount * percentage) / 100),
        status: etapa.status,
        completedAt: etapa.completedAt,
        paidAt: etapa.paidAt,
        obraEtapaId: etapa.obraEtapaId,
        obraEtapaName: etapa.obraEtapa?.name ?? null,
      };
    });

  const paidAmount = etapas.filter((e) => e.status === EtapaStatus.PAGADA).reduce((sum, e) => sum + e.amount, 0);

  return {
    id: asignacion.id,
    obraId: asignacion.obraId,
    obraName: asignacion.obra.name,
    contratistaId: asignacion.contratistaId,
    contratistaName: asignacion.contratista.name,
    contratistaOficio: asignacion.contratista.oficio,
    totalAmount,
    notes: asignacion.notes,
    createdAt: asignacion.createdAt,
    updatedAt: asignacion.updatedAt,
    etapas,
    totalPercentage: etapas.reduce((sum, e) => sum + e.percentage, 0),
    paidAmount,
    pendingAmount: totalAmount - paidAmount,
  };
}

const asignacionInclude = {
  obra: true,
  contratista: true,
  etapas: { include: { obraEtapa: { select: { name: true } } } },
} satisfies Prisma.ContratistaAsignacionInclude;

function validateEtapas(etapas: EtapaInput[]) {
  if (etapas.length === 0) {
    throw new HttpError(400, "Debes agregar al menos una etapa");
  }
  for (const etapa of etapas) {
    if (etapa.percentage <= 0) {
      throw new HttpError(400, `El porcentaje debe ser mayor a cero (${etapa.name})`);
    }
  }
  const sum = etapas.reduce((total, etapa) => total + etapa.percentage, 0);
  if (Math.abs(sum - 100) > PERCENTAGE_TOLERANCE) {
    throw new HttpError(400, `Las etapas deben sumar 100% (actualmente suman ${sum.toFixed(2)}%)`);
  }
}

// obraEtapaId es opcional, pero si se envia debe pertenecer a la obra de la asignacion.
async function validateObraEtapas(obraId: string, etapas: EtapaInput[]) {
  const ids = [...new Set(etapas.map((e) => e.obraEtapaId).filter((id): id is string => !!id))];
  if (ids.length === 0) return;
  const count = await prisma.obraEtapa.count({ where: { obraId, id: { in: ids } } });
  if (count !== ids.length) {
    throw new HttpError(400, "Alguna etapa de obra seleccionada no pertenece a esta obra");
  }
}

export interface ListAsignacionesFilters {
  obraId?: string;
  contratistaId?: string;
}

export async function listAsignaciones(filters: ListAsignacionesFilters) {
  const where: Prisma.ContratistaAsignacionWhereInput = {};
  if (filters.obraId) where.obraId = filters.obraId;
  if (filters.contratistaId) where.contratistaId = filters.contratistaId;

  const asignaciones = await prisma.contratistaAsignacion.findMany({
    where,
    include: asignacionInclude,
    orderBy: { createdAt: "desc" },
  });
  return asignaciones.map(serializeAsignacion);
}

export async function getAsignacionById(id: string) {
  const asignacion = await prisma.contratistaAsignacion.findUnique({ where: { id }, include: asignacionInclude });
  if (!asignacion) {
    throw new HttpError(404, "Asignacion no encontrada");
  }
  return serializeAsignacion(asignacion);
}

export async function createAsignacion(input: CreateAsignacionInput, userId?: string) {
  if (input.totalAmount <= 0) {
    throw new HttpError(400, "El monto total debe ser mayor a cero");
  }
  validateEtapas(input.etapas);
  await validateObraEtapas(input.obraId, input.etapas);

  const asignacion = await prisma.contratistaAsignacion.create({
    data: {
      obraId: input.obraId,
      contratistaId: input.contratistaId,
      totalAmount: input.totalAmount,
      notes: input.notes || null,
      etapas: {
        create: input.etapas.map((etapa) => ({
          name: etapa.name,
          percentage: etapa.percentage,
          obraEtapaId: etapa.obraEtapaId || null,
        })),
      },
    },
    include: asignacionInclude,
  });

  const serialized = serializeAsignacion(asignacion);
  await recordEvento({
    tipo: HistorialTipo.ASIGNACION_CREADA,
    descripcion: `Contratista "${serialized.contratistaName}" asignado a "${serialized.obraName}"`,
    monto: serialized.totalAmount,
    userId,
    obraId: serialized.obraId,
    contratistaId: serialized.contratistaId,
    asignacionId: serialized.id,
  });

  return serialized;
}

export async function updateAsignacion(id: string, input: UpdateAsignacionInput) {
  const existing = await prisma.contratistaAsignacion.findUnique({ where: { id }, include: { etapas: true } });
  if (!existing) {
    throw new HttpError(404, "Asignacion no encontrada");
  }

  const hasProgress = existing.etapas.some((etapa) => etapa.status !== EtapaStatus.PENDIENTE);
  if (input.etapas && hasProgress) {
    throw new HttpError(
      400,
      "No se pueden modificar las etapas: ya hay al menos una completada o pagada. Solo se puede editar el monto o las notas.",
    );
  }

  if (input.etapas) {
    validateEtapas(input.etapas);
    await validateObraEtapas(existing.obraId, input.etapas);
  }
  if (input.totalAmount !== undefined && input.totalAmount <= 0) {
    throw new HttpError(400, "El monto total debe ser mayor a cero");
  }

  const asignacion = await prisma.$transaction(async (tx) => {
    if (input.etapas) {
      await tx.contratistaEtapa.deleteMany({ where: { asignacionId: id } });
    }
    return tx.contratistaAsignacion.update({
      where: { id },
      data: {
        ...(input.totalAmount !== undefined && { totalAmount: input.totalAmount }),
        ...(input.notes !== undefined && { notes: input.notes || null }),
        ...(input.etapas && {
          etapas: {
            create: input.etapas.map((etapa) => ({
              name: etapa.name,
              percentage: etapa.percentage,
              obraEtapaId: etapa.obraEtapaId || null,
            })),
          },
        }),
      },
      include: asignacionInclude,
    });
  });

  return serializeAsignacion(asignacion);
}

export async function updateEtapaStatus(
  asignacionId: string,
  etapaId: string,
  nextStatus: EtapaStatus,
  userId?: string,
) {
  const etapa = await prisma.contratistaEtapa.findUnique({ where: { id: etapaId } });
  if (!etapa || etapa.asignacionId !== asignacionId) {
    throw new HttpError(404, "Etapa no encontrada");
  }

  const allowed = ALLOWED_ETAPA_TRANSITIONS[etapa.status];
  if (!allowed.includes(nextStatus)) {
    throw new HttpError(400, `No se puede cambiar la etapa de "${etapa.status}" a "${nextStatus}"`);
  }

  await prisma.contratistaEtapa.update({
    where: { id: etapaId },
    data: {
      status: nextStatus,
      ...(nextStatus === EtapaStatus.COMPLETADA && { completedAt: new Date() }),
      ...(nextStatus === EtapaStatus.PAGADA && { paidAt: new Date() }),
    },
  });

  const asignacion = await getAsignacionById(asignacionId);

  if (nextStatus === EtapaStatus.COMPLETADA || nextStatus === EtapaStatus.PAGADA) {
    const etapaSerialized = asignacion.etapas.find((e) => e.id === etapaId);
    await recordEvento({
      tipo: nextStatus === EtapaStatus.PAGADA ? HistorialTipo.ETAPA_PAGADA : HistorialTipo.ETAPA_COMPLETADA,
      descripcion:
        nextStatus === EtapaStatus.PAGADA
          ? `Pago de etapa "${etapa.name}" a "${asignacion.contratistaName}" en "${asignacion.obraName}"`
          : `Etapa "${etapa.name}" completada por "${asignacion.contratistaName}" en "${asignacion.obraName}"`,
      monto: etapaSerialized?.amount ?? null,
      userId,
      obraId: asignacion.obraId,
      contratistaId: asignacion.contratistaId,
      asignacionId: asignacion.id,
    });
  }

  return asignacion;
}
