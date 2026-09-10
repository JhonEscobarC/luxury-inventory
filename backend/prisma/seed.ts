import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_USERS: Array<{ name: string; email: string; password: string; role: Role }> = [
  { name: "Administrador", email: "admin@luxury.com", password: "Admin123!", role: Role.ADMIN },
  { name: "Contabilidad", email: "contabilidad@luxury.com", password: "Contabilidad123!", role: Role.CONTABILIDAD },
  { name: "Residente Obra Norte", email: "obra1@luxury.com", password: "Obra123!", role: Role.OBRA },
  { name: "Residente Obra Sur", email: "obra2@luxury.com", password: "Obra123!", role: Role.OBRA },
];

const SEED_OBRAS = [
  { name: "Torre Norte", address: "Cra 45 #12-30, Medellin", client: "Constructora Andina" },
  { name: "Conjunto Sur", address: "Cl 10 #50-20, Medellin", client: "Inversiones Sur" },
];

const SEED_PROVEEDORES = [
  { name: "Cementos Andinos", category: "Estructural", phone: "3001234567", contactName: "Laura Gomez" },
  { name: "Aceros del Valle", category: "Estructural", phone: "3009876543", contactName: "Carlos Ruiz" },
];

async function main() {
  const usersByEmail = new Map<string, { id: string; role: Role }>();

  for (const seedUser of SEED_USERS) {
    const passwordHash = await bcrypt.hash(seedUser.password, 10);
    const user = await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {},
      create: {
        name: seedUser.name,
        email: seedUser.email,
        passwordHash,
        role: seedUser.role,
      },
    });
    usersByEmail.set(seedUser.email, { id: user.id, role: user.role });
  }

  const createdObras = [];
  for (const seedObra of SEED_OBRAS) {
    const existing = await prisma.obra.findFirst({ where: { name: seedObra.name } });
    const obra = existing ?? (await prisma.obra.create({ data: seedObra }));
    createdObras.push(obra);
  }

  for (const seedProveedor of SEED_PROVEEDORES) {
    const existing = await prisma.proveedor.findFirst({ where: { name: seedProveedor.name } });
    if (!existing) {
      await prisma.proveedor.create({ data: seedProveedor });
    }
  }

  const obra1User = usersByEmail.get("obra1@luxury.com");
  const obra2User = usersByEmail.get("obra2@luxury.com");
  if (obra1User && createdObras[0]) {
    await prisma.user.update({
      where: { id: obra1User.id },
      data: { obras: { connect: [{ id: createdObras[0].id }] } },
    });
  }
  if (obra2User && createdObras[1]) {
    await prisma.user.update({
      where: { id: obra2User.id },
      data: { obras: { connect: [{ id: createdObras[1].id }] } },
    });
  }

  console.log("Usuarios de prueba creados:");
  for (const seedUser of SEED_USERS) {
    console.log(`  - ${seedUser.role.padEnd(13)} ${seedUser.email} / ${seedUser.password}`);
  }
  console.log("Obras de prueba creadas:", SEED_OBRAS.map((o) => o.name).join(", "));
  console.log("Proveedores de prueba creados:", SEED_PROVEEDORES.map((p) => p.name).join(", "));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
