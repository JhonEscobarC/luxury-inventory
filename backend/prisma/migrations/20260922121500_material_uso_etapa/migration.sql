-- AlterTable: material_usos gana un link obligatorio a la etapa de obra. Se agrega
-- nullable, se rellena con la primera etapa (orden 1) de la obra de cada uso existente,
-- y luego se vuelve NOT NULL.
ALTER TABLE "material_usos" ADD COLUMN "obraEtapaId" TEXT;

UPDATE "material_usos" mu
SET "obraEtapaId" = (
  SELECT oe.id FROM "obra_etapas" oe
  WHERE oe."obraId" = mu."obraId" AND oe."order" = 1
  LIMIT 1
);

ALTER TABLE "material_usos" ALTER COLUMN "obraEtapaId" SET NOT NULL;
ALTER TABLE "material_usos" ADD CONSTRAINT "material_usos_obraEtapaId_fkey" FOREIGN KEY ("obraEtapaId") REFERENCES "obra_etapas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "material_usos_obraEtapaId_idx" ON "material_usos"("obraEtapaId");
