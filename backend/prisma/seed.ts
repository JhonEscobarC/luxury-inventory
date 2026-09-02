import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_USERS: Array<{ name: string; email: string; password: string; role: Role }> = [
  { name: "Administrador", email: "admin@luxury.com", password: "Admin123!", role: Role.ADMIN },
  { name: "Bodega", email: "bodega@luxury.com", password: "Bodega123!", role: Role.BODEGA },
  { name: "Ventas", email: "ventas@luxury.com", password: "Ventas123!", role: Role.VENTAS },
];

async function main() {
  for (const seedUser of SEED_USERS) {
    const passwordHash = await bcrypt.hash(seedUser.password, 10);
    await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {},
      create: {
        name: seedUser.name,
        email: seedUser.email,
        passwordHash,
        role: seedUser.role,
      },
    });
  }

  console.log("Usuarios de prueba creados:");
  for (const seedUser of SEED_USERS) {
    console.log(`  - ${seedUser.role.padEnd(7)} ${seedUser.email} / ${seedUser.password}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
