import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function isoDateOffset(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(0, 0, 0, 0);
  return date;
}

async function main() {
  const superuser = await prisma.user.upsert({
    where: { email: "jon.apiscope.empresa@gmail.com" },
    update: {},
    create: {
      email: "jon.apiscope.empresa@gmail.com",
      passwordHash: await bcrypt.hash("wqrxOCAco1pP", 10),
      rol: "SUPERUSER",
    },
  });
  console.log("SUPERUSER:", superuser.email);

  const empresa = await prisma.user.upsert({
    where: { email: "empresa@demo.com" },
    update: {},
    create: {
      email: "empresa@demo.com",
      nombre: "Empresa Demo",
      passwordHash: await bcrypt.hash("DemoEmpresa123!", 10),
      rol: "EMPRESA",
    },
  });
  console.log("EMPRESA:", empresa.email);

  const cliente = await prisma.cliente.upsert({
    where: { email: "ana@torresdiseno.com" },
    update: {},
    create: {
      usuarioId: empresa.id,
      nombre: "Ana Torres",
      empresa: "Torres Diseño",
      contactId: "+54 11 5555-0101",
      email: "ana@torresdiseno.com",
    },
  });
  console.log("Cliente:", cliente.email);

  const suscripcionExistente = await prisma.suscripcion.findFirst({ where: { clienteId: cliente.id } });
  if (!suscripcionExistente) {
    await prisma.suscripcion.create({
      data: {
        clienteId: cliente.id,
        servicio: "Página web",
        monto: 100,
        ciclo: "mensual",
        proximoCobro: isoDateOffset(15),
      },
    });
    console.log("Suscripción de prueba creada.");
  }

  if (!cliente.userId) {
    const clienteConAcceso = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: "ana@torresdiseno.com",
          nombre: cliente.nombre,
          passwordHash: await bcrypt.hash("ZQWANFNiewM4", 10),
          rol: "CLIENTE",
        },
      });
      return tx.cliente.update({ where: { id: cliente.id }, data: { userId: user.id } });
    });
    console.log("CLIENTE (login):", clienteConAcceso.email);
  } else {
    console.log("El cliente ya tenía acceso creado, no se tocó.");
  }

  console.log("Seed mínimo de producción completo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
